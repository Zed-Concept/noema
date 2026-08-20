// Static verification of the Unit C v1 migrations: parses every file under
// supabase/migrations/ with libpg_query (the real PostgreSQL 17 parser,
// pinned via capture.sh) and asserts the dispatch's entity scope, RLS
// matrix, provisioning surface, and storage policies against the AST —
// stronger than text grep, still fully static (no database).
//
// WHAT THIS IS (REVIEW-013 finding 2 — read before quoting any result).
// This is an ENUMERATED-ASSERTION oracle, not a proof of exhaustive schema
// equivalence. Each assertion below pins one enumerated property of the
// AST. A parse-valid neighbor of the migration set is rejected exactly when
// it changes a property some assertion names, and is accepted when it does
// not. A green run therefore means "every enumerated property holds", not
// "no other schema could produce this output". Further parse-valid
// neighbors outside the enumerated classes may pass. The enumerated classes
// and the known limits are listed in README.md under "What the oracle
// proves"; the permanent battery that proves each enumerated class actually
// discriminates is assertions-negative-control.txt.
//
// Absence is pinned as well as presence within those classes (REVIEW-012
// finding 2, extended by REVIEW-013 finding 2): every column's
// constraint-type multiset is compared exactly (a DEFAULT added to a column
// declared default-free cannot hide), CHECK IN-lists pin the operator as
// well as the values (NOT IN is rejected), zero-argument function defaults
// reject argument/star forms, every FK pins its referenced attribute list,
// match type, and both actions, types reject typmod/array neighbors, the
// initplan `(select auth.uid())` subquery is pinned to a bare one-target
// SELECT (an added WHERE/LIMIT/GROUP BY is rejected), grants pin per-column
// privilege lists absent, the bucket INSERT pins its VALUES row count, and
// triggers/functions/indexes pin their optional clauses absent (WHEN,
// UPDATE OF, args, STRICT, volatility, extra SET, WITH GRANT OPTION,
// UNIQUE/WHERE/INCLUDE, ON CONFLICT/RETURNING).
//
// Environment (set by capture.sh):
//   SQLPARSE_NODE_MODULES — directory whose node_modules holds the pinned
//                           libpg-query install (scratch, never committed)
//   MIGRATIONS_DIR        — migrations directory to verify (defaults to
//                           supabase/migrations; the negative control points
//                           it at tampered scratch copies)
//
// Output is deterministic at a fixed migration set. Exit: 0 all assertions
// pass, 1 any FAIL, 2 setup error.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const modulesDir = process.env.SQLPARSE_NODE_MODULES;
if (!modulesDir) {
  console.error('SQLPARSE_NODE_MODULES not set');
  process.exit(2);
}
const require = createRequire(path.join(modulesDir, 'resolve-anchor.js'));
const { parse } = require('libpg-query');
const parserVersion = require('libpg-query/package.json').version;

const migrationsDir = process.env.MIGRATIONS_DIR ?? 'supabase/migrations';
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

// --- tiny AST helpers -------------------------------------------------------
const sval = (x) => x?.String?.sval;
// Exact type: a typmod (timestamptz(3)) or array bounds (text[]) neighbor
// yields a marked string that equals no expected plain name.
const typeOf = (cd) =>
  cd.typeName.names
    .map((s) => s.String.sval)
    .filter((s) => s !== 'pg_catalog')
    .join('.') +
  (cd.typeName.typmods ? '(typmod)' : '') +
  (cd.typeName.arrayBounds ? '[]' : '');
const cons = (cd, type) =>
  (cd.constraints ?? []).map((c) => c.Constraint).filter((c) => c.contype === type);
const rel = (r) => `${r.schemaname ?? ''}.${r.relname}`;
// The exact, sorted constraint-type multiset on a column — absence pinning:
// a constraint added to (or removed from) any column changes this string.
const consTypes = (cd) =>
  (cd.constraints ?? [])
    .map((c) => c.Constraint.contype)
    .sort()
    .join(',');
// A zero-argument function-call default, exactly: any argument, star,
// DISTINCT, ORDER BY, FILTER, or OVER form yields undefined (REVIEW-012
// finding 2 — the name alone accepted argument neighbors).
const defaultFunc = (cd) => {
  const d = cons(cd, 'CONSTR_DEFAULT')[0];
  const fc = d?.raw_expr?.FuncCall;
  if (!fc || fc.args || fc.agg_star || fc.agg_distinct || fc.agg_order || fc.agg_filter || fc.over)
    return undefined;
  return (fc.funcname ?? []).map((f) => f.String.sval).join('.');
};
const defaultString = (cd) => cons(cd, 'CONSTR_DEFAULT')[0]?.raw_expr?.A_Const?.sval?.sval;
const notNull = (cd) => cons(cd, 'CONSTR_NOTNULL').length === 1;
// Exact FK shape: referenced table AND attribute list, MATCH SIMPLE, ON
// UPDATE NO ACTION, ON DELETE CASCADE, expected constraint name (REVIEW-012
// finding 2 — the attribute list and non-DELETE attributes were unpinned).
const fkExact = (fk, name, pkTable, pkAttrs) =>
  !!fk &&
  fk.conname === name &&
  rel(fk.pktable) === pkTable &&
  (fk.pk_attrs ?? []).map(sval).join(',') === pkAttrs &&
  fk.fk_matchtype === 's' &&
  fk.fk_upd_action === 'a' &&
  fk.fk_del_action === 'c';

function isAuthUidCall(node) {
  const fc = node?.FuncCall;
  if (!fc || fc.args) return false;
  const names = (fc.funcname ?? []).map((f) => f.String.sval);
  return names.length === 2 && names[0] === 'auth' && names[1] === 'uid';
}
// (select auth.uid()) — or, with cast: (select auth.uid()::text)
// The subselect is pinned to a bare one-target SELECT: libpg_query emits only
// `targetList` plus the two always-present scalar defaults for that shape, so
// any added clause — WHERE, FROM, GROUP BY, HAVING, ORDER BY, LIMIT/OFFSET,
// DISTINCT, WITH, locking, set operation — shows up as an extra key or a
// non-default scalar and is rejected. `(select auth.uid() where false)` is a
// valid neighbor that inverts the predicate's meaning while keeping the same
// function call, and was accepted before this pin (REVIEW-013 finding 2).
const BARE_SELECT_KEYS = ['targetList', 'limitOption', 'op'];
function isBareSelect(sel) {
  return (
    !!sel &&
    Object.keys(sel).every((k) => BARE_SELECT_KEYS.includes(k)) &&
    sel.op === 'SETOP_NONE' &&
    sel.limitOption === 'LIMIT_OPTION_DEFAULT'
  );
}
function isSelectAuthUid(node, cast) {
  const sl = node?.SubLink;
  if (!sl || sl.subLinkType !== 'EXPR_SUBLINK') return false;
  const sel = sl.subselect?.SelectStmt;
  if (!isBareSelect(sel) || (sel.targetList ?? []).length !== 1) return false;
  const val = sel.targetList[0].ResTarget.val;
  if (cast === 'text') {
    const tc = val?.TypeCast;
    if (!tc) return false;
    const t = tc.typeName.names
      .map((s) => s.String.sval)
      .filter((s) => s !== 'pg_catalog')
      .join('.');
    return t === 'text' && isAuthUidCall(tc.arg);
  }
  return isAuthUidCall(val);
}
function isColRef(node, name) {
  const f = node?.ColumnRef?.fields;
  return !!f && f.length === 1 && f[0].String?.sval === name;
}
// (select auth.uid()) = <col>, either operand order
function isOwnPredicate(expr, col) {
  const ae = expr?.A_Expr;
  if (!ae || ae.kind !== 'AEXPR_OP' || ae.name.map(sval).join('') !== '=') return false;
  return (
    (isSelectAuthUid(ae.lexpr) && isColRef(ae.rexpr, col)) ||
    (isSelectAuthUid(ae.rexpr) && isColRef(ae.lexpr, col))
  );
}
function isBucketEq(expr) {
  const ae = expr?.A_Expr;
  if (!ae || ae.name.map(sval).join('') !== '=') return false;
  return isColRef(ae.lexpr, 'bucket_id') && ae.rexpr?.A_Const?.sval?.sval === 'captures-audio';
}
// (storage.foldername(name))[1] = (select auth.uid()::text)
function isFolderEq(expr) {
  const ae = expr?.A_Expr;
  if (!ae || ae.name.map(sval).join('') !== '=') return false;
  const ind = ae.lexpr?.A_Indirection;
  const fc = ind?.arg?.FuncCall;
  const fnames = (fc?.funcname ?? []).map((f) => f.String.sval).join('.');
  const folderOk = fnames === 'storage.foldername' && fc.args?.length === 1 && isColRef(fc.args[0], 'name');
  const idxOk = ind?.indirection?.[0]?.A_Indices?.uidx?.A_Const?.ival?.ival === 1;
  return folderOk && idxOk && isSelectAuthUid(ae.rexpr, 'text');
}
function isStoragePredicate(expr) {
  const be = expr?.BoolExpr;
  if (!be || be.boolop !== 'AND_EXPR' || (be.args ?? []).length !== 2) return false;
  return isBucketEq(be.args[0]) && isFolderEq(be.args[1]);
}
const roleNames = (p) => (p.roles ?? []).map((r) => r.RoleSpec?.rolename ?? r.RoleSpec?.roletype);

// --- parse ------------------------------------------------------------------
const stmts = [];
console.log('= Unit C Phase A — static verification of supabase/migrations =');
console.log(`parser: libpg-query@${parserVersion} (libpg_query, PostgreSQL 17 grammar)`);
console.log('');
console.log('-- parse validity --');
let parseFailures = 0;
for (const f of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
  try {
    const tree = await parse(sql);
    console.log(`OK   ${f}  statements=${tree.stmts.length}`);
    for (const s of tree.stmts) stmts.push({ file: f, type: Object.keys(s.stmt)[0], node: s.stmt[Object.keys(s.stmt)[0]] });
  } catch (e) {
    parseFailures++;
    console.log(`FAIL ${f}  ${String(e.message).split('\n')[0]}`);
  }
}
console.log('');

// --- assertions -------------------------------------------------------------
let total = 0;
let failures = parseFailures;
function assert(desc, cond) {
  total++;
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${desc}`);
}
const byType = (t) => stmts.filter((s) => s.type === t).map((s) => s.node);
const tables = Object.fromEntries(byType('CreateStmt').map((n) => [rel(n.relation), n]));
const columns = (t) =>
  (tables[t]?.tableElts ?? []).filter((e) => e.ColumnDef).map((e) => e.ColumnDef);
const col = (t, c) => columns(t).find((cd) => cd.colname === c);
const tableCons = (t) =>
  (tables[t]?.tableElts ?? []).filter((e) => e.Constraint).map((e) => e.Constraint);
const policies = byType('CreatePolicyStmt');
const polFor = (t, op) => policies.filter((p) => rel(p.table) === t && p.cmd_name === op);

console.log('-- statement inventory --');
assert(
  'migration files are exactly the four v1 files, in apply order',
  files.length === 4 &&
    files[0].endsWith('_v1_core_schema.sql') &&
    files[1].endsWith('_v1_rls_policies.sql') &&
    files[2].endsWith('_v1_profile_provisioning.sql') &&
    files[3].endsWith('_v1_storage_captures_audio.sql'),
);
assert(
  'statement counts per file are exactly 9, 21, 3, 5 (38 total — appended statements cannot hide)',
  files.length === 4 &&
    [9, 21, 3, 5].every((n, i) => stmts.filter((s) => s.file === files[i]).length === n),
);
assert(
  'every statement type is on the expected whitelist',
  stmts.every((s) =>
    [
      'CreateStmt',
      'CreateFunctionStmt',
      'CreateTrigStmt',
      'IndexStmt',
      'GrantStmt',
      'AlterTableStmt',
      'CreatePolicyStmt',
      'InsertStmt',
    ].includes(s.type),
  ),
);
assert(
  'exactly three tables are created: public.profiles, public.captures, public.transcripts',
  byType('CreateStmt').length === 3 &&
    Object.keys(tables).sort().join(',') === 'public.captures,public.profiles,public.transcripts',
);
assert(
  'exactly three triggers are created in the whole set (two set_updated_at, one provisioning)',
  byType('CreateTrigStmt').length === 3,
);
assert(
  'the only INSERT targets storage.buckets',
  byType('InsertStmt').every((n) => rel(n.relation) === 'storage.buckets') &&
    byType('InsertStmt').length === 1,
);
assert(
  'exactly two functions are created: public.set_updated_at, public.handle_new_user',
  byType('CreateFunctionStmt')
    .map((n) => n.funcname.map((f) => f.String.sval).join('.'))
    .sort()
    .join(',') === 'public.handle_new_user,public.set_updated_at',
);

console.log('-- public.profiles --');
assert(
  'profiles columns are exactly (id, display_name, locale, created_at, updated_at)',
  columns('public.profiles')
    .map((c) => c.colname)
    .join(',') === 'id,display_name,locale,created_at,updated_at',
);
{
  const c = col('public.profiles', 'id');
  const fk = c ? cons(c, 'CONSTR_FOREIGN')[0] : undefined;
  assert(
    'profiles.id uuid PRIMARY KEY',
    !!c && typeOf(c) === 'uuid' && cons(c, 'CONSTR_PRIMARY').length === 1,
  );
  assert(
    'profiles.id FK -> auth.users(id) ON DELETE CASCADE',
    fkExact(fk, 'profiles_id_fkey', 'auth.users', 'id'),
  );
}
{
  const c = col('public.profiles', 'display_name');
  assert('profiles.display_name text, nullable', !!c && typeOf(c) === 'text' && !notNull(c));
}
{
  const c = col('public.profiles', 'locale');
  const check = c ? cons(c, 'CONSTR_CHECK')[0] : undefined;
  const inList = check?.raw_expr?.A_Expr;
  // libpg_query encodes IN and NOT IN alike as AEXPR_IN and distinguishes
  // them only by the operator name ('=' vs '<>'), so the operator is pinned
  // alongside the value list — a NOT IN neighbor inverts the constraint while
  // keeping every value, and was accepted before (REVIEW-013 finding 2).
  const values =
    inList?.kind === 'AEXPR_IN' &&
    inList.name.map(sval).join('') === '=' &&
    isColRef(inList.lexpr, 'locale')
      ? (inList.rexpr?.List?.items ?? []).map((i) => i.A_Const?.sval?.sval)
      : [];
  assert(
    "profiles.locale text NOT NULL DEFAULT 'en'",
    !!c && typeOf(c) === 'text' && notNull(c) && defaultString(c) === 'en',
  );
  assert(
    "profiles.locale CHECK (locale IN ('en','ar'))",
    check?.conname === 'profiles_locale_check' && values.join(',') === 'en,ar',
  );
}
for (const name of ['created_at', 'updated_at']) {
  const c = col('public.profiles', name);
  assert(
    `profiles.${name} timestamptz NOT NULL DEFAULT now()`,
    !!c && typeOf(c) === 'timestamptz' && notNull(c) && defaultFunc(c) === 'now',
  );
}

console.log('-- public.captures --');
assert(
  'captures columns are exactly (id, user_id, status, audio_path, duration_ms, captured_at, created_at, updated_at)',
  columns('public.captures')
    .map((c) => c.colname)
    .join(',') === 'id,user_id,status,audio_path,duration_ms,captured_at,created_at,updated_at',
);
{
  const c = col('public.captures', 'id');
  assert(
    'captures.id uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    !!c &&
      typeOf(c) === 'uuid' &&
      cons(c, 'CONSTR_PRIMARY').length === 1 &&
      defaultFunc(c) === 'gen_random_uuid',
  );
}
{
  const c = col('public.captures', 'user_id');
  const fk = c ? cons(c, 'CONSTR_FOREIGN')[0] : undefined;
  assert(
    'captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE',
    !!c &&
      typeOf(c) === 'uuid' &&
      notNull(c) &&
      fkExact(fk, 'captures_user_id_fkey', 'auth.users', 'id'),
  );
}
{
  const c = col('public.captures', 'status');
  const check = c ? cons(c, 'CONSTR_CHECK')[0] : undefined;
  const inList = check?.raw_expr?.A_Expr;
  // IN pinned as the operator, not just the value list — see profiles.locale.
  const values =
    inList?.kind === 'AEXPR_IN' &&
    inList.name.map(sval).join('') === '=' &&
    isColRef(inList.lexpr, 'status')
      ? (inList.rexpr?.List?.items ?? []).map((i) => i.A_Const?.sval?.sval)
      : [];
  assert(
    "captures.status text NOT NULL DEFAULT 'recorded'",
    !!c && typeOf(c) === 'text' && notNull(c) && defaultString(c) === 'recorded',
  );
  assert(
    "captures.status CHECK (status IN ('recorded','transcribing','ready','failed'))",
    check?.conname === 'captures_status_check' &&
      values.join(',') === 'recorded,transcribing,ready,failed',
  );
}
{
  const c = col('public.captures', 'audio_path');
  assert('captures.audio_path text, nullable', !!c && typeOf(c) === 'text' && !notNull(c));
}
{
  const c = col('public.captures', 'duration_ms');
  const check = c ? cons(c, 'CONSTR_CHECK')[0] : undefined;
  const ae = check?.raw_expr?.A_Expr;
  // Exact-value comparison (REVIEW-011 finding 2). libpg_query emits integer
  // constants protobuf-style — the inner value field is omitted when it is 0
  // (`{ival: {}}`), while -1/1/… carry `{ival: {ival: n}}` (the grammar folds
  // unary minus into the constant) and a float 0.0 carries fval, not ival. So
  // "literally 0" is: an ival node present, whose value resolves to 0.
  const rhs = ae?.rexpr?.A_Const;
  const geZero =
    !!ae &&
    ae.name.map(sval).join('') === '>=' &&
    isColRef(ae.lexpr, 'duration_ms') &&
    !!rhs &&
    'ival' in rhs &&
    (rhs.ival.ival ?? 0) === 0;
  assert(
    'captures.duration_ms integer, nullable, CHECK (duration_ms >= 0)',
    !!c &&
      typeOf(c) === 'int4' &&
      !notNull(c) &&
      check?.conname === 'captures_duration_ms_check' &&
      geZero,
  );
}
for (const name of ['captured_at', 'created_at', 'updated_at']) {
  const c = col('public.captures', name);
  assert(
    `captures.${name} timestamptz NOT NULL DEFAULT now()`,
    !!c && typeOf(c) === 'timestamptz' && notNull(c) && defaultFunc(c) === 'now',
  );
}
{
  const uq = tableCons('public.captures').find((c) => c.contype === 'CONSTR_UNIQUE');
  assert(
    'captures UNIQUE (id, user_id) — the referenced key for the composite FK',
    !!uq &&
      uq.conname === 'captures_id_user_id_key' &&
      !uq.nulls_not_distinct &&
      (uq.keys ?? []).map(sval).join(',') === 'id,user_id',
  );
}

console.log('-- public.transcripts --');
assert(
  'transcripts columns are exactly (id, capture_id, user_id, text, language, provider, created_at)',
  columns('public.transcripts')
    .map((c) => c.colname)
    .join(',') === 'id,capture_id,user_id,text,language,provider,created_at',
);
{
  const c = col('public.transcripts', 'id');
  assert(
    'transcripts.id uuid PRIMARY KEY DEFAULT gen_random_uuid()',
    !!c &&
      typeOf(c) === 'uuid' &&
      cons(c, 'CONSTR_PRIMARY').length === 1 &&
      defaultFunc(c) === 'gen_random_uuid',
  );
}
assert(
  'transcripts.capture_id uuid NOT NULL',
  (() => {
    const c = col('public.transcripts', 'capture_id');
    return !!c && typeOf(c) === 'uuid' && notNull(c);
  })(),
);
{
  const c = col('public.transcripts', 'user_id');
  const fk = c ? cons(c, 'CONSTR_FOREIGN')[0] : undefined;
  assert(
    'transcripts.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE',
    !!c &&
      typeOf(c) === 'uuid' &&
      notNull(c) &&
      fkExact(fk, 'transcripts_user_id_fkey', 'auth.users', 'id'),
  );
}
assert(
  'transcripts.text text NOT NULL',
  (() => {
    const c = col('public.transcripts', 'text');
    return !!c && typeOf(c) === 'text' && notNull(c);
  })(),
);
for (const name of ['language', 'provider']) {
  const c = col('public.transcripts', name);
  assert(`transcripts.${name} text, nullable (provider-agnostic)`, !!c && typeOf(c) === 'text' && !notNull(c));
}
{
  const c = col('public.transcripts', 'created_at');
  assert(
    'transcripts.created_at timestamptz NOT NULL DEFAULT now(); no updated_at column',
    !!c &&
      typeOf(c) === 'timestamptz' &&
      notNull(c) &&
      defaultFunc(c) === 'now' &&
      !col('public.transcripts', 'updated_at'),
  );
}
{
  const fk = tableCons('public.transcripts').find((c) => c.contype === 'CONSTR_FOREIGN');
  assert(
    'user_id-consistency guarantee: composite FK (capture_id, user_id) -> public.captures (id, user_id) ON DELETE CASCADE',
    fkExact(fk, 'transcripts_capture_id_user_id_fkey', 'public.captures', 'id,user_id') &&
      (fk.fk_attrs ?? []).map(sval).join(',') === 'capture_id,user_id',
  );
}

console.log('-- exact constraint sets per column and per table (absence pinning) --');
// REVIEW-012 finding 2: presence checks alone accepted valid neighbors (a
// DEFAULT added to a column declared default-free). Each column's exact
// constraint-type multiset is pinned here, so any constraint added to or
// removed from any column — a default, an extra CHECK, a UNIQUE, anything —
// changes the compared string. Table-level constraints and table options
// (INHERITS, PARTITION BY, OF type, tablespace, IF NOT EXISTS) are pinned
// the same way.
{
  const EXPECTED_COLUMN_CONS = {
    'public.profiles': {
      id: 'CONSTR_FOREIGN,CONSTR_PRIMARY',
      display_name: '',
      locale: 'CONSTR_CHECK,CONSTR_DEFAULT,CONSTR_NOTNULL',
      created_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
      updated_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
    },
    'public.captures': {
      id: 'CONSTR_DEFAULT,CONSTR_PRIMARY',
      user_id: 'CONSTR_FOREIGN,CONSTR_NOTNULL',
      status: 'CONSTR_CHECK,CONSTR_DEFAULT,CONSTR_NOTNULL',
      audio_path: '',
      duration_ms: 'CONSTR_CHECK',
      captured_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
      created_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
      updated_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
    },
    'public.transcripts': {
      id: 'CONSTR_DEFAULT,CONSTR_PRIMARY',
      capture_id: 'CONSTR_NOTNULL',
      user_id: 'CONSTR_FOREIGN,CONSTR_NOTNULL',
      text: 'CONSTR_NOTNULL',
      language: '',
      provider: '',
      created_at: 'CONSTR_DEFAULT,CONSTR_NOTNULL',
    },
  };
  const EXPECTED_TABLE_CONS = {
    'public.profiles': '',
    'public.captures': 'CONSTR_UNIQUE',
    'public.transcripts': 'CONSTR_FOREIGN',
  };
  for (const [t, want] of Object.entries(EXPECTED_COLUMN_CONS)) {
    assert(
      `${t}: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column`,
      columns(t).length === Object.keys(want).length &&
        columns(t).every((cd) => consTypes(cd) === want[cd.colname]),
    );
  }
  for (const [t, want] of Object.entries(EXPECTED_TABLE_CONS)) {
    const n = tables[t];
    assert(
      `${t}: table-level constraints are exactly [${want || 'none'}] and no INHERITS/PARTITION BY/OF type/tablespace/IF NOT EXISTS clause exists`,
      !!n &&
        tableCons(t)
          .map((c) => c.contype)
          .sort()
          .join(',') === want &&
        !n.inhRelations &&
        !n.partspec &&
        !n.ofTypename &&
        !n.tablespacename &&
        !n.if_not_exists,
    );
  }
}

console.log('-- indexes and updated_at triggers --');
{
  const idx = byType('IndexStmt').map((n) => ({
    name: n.idxname,
    table: rel(n.relation),
    cols: (n.indexParams ?? []).map((p) => p.IndexElem?.name).join(','),
    // `indexIncludingParams` is the INCLUDE list: an added INCLUDE(id)
    // changes the stored index without touching its key columns, and was
    // accepted before this pin (REVIEW-013 finding 2).
    plain:
      n.accessMethod === 'btree' && !n.unique && !n.whereClause && !n.indexIncludingParams,
  }));
  assert(
    'FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name',
    idx.length === 3 &&
      idx.every((i) => i.plain) &&
      idx.some(
        (i) =>
          i.table === 'public.captures' && i.cols === 'user_id' && i.name === 'captures_user_id_idx',
      ) &&
      idx.some(
        (i) =>
          i.table === 'public.transcripts' &&
          i.cols === 'capture_id,user_id' &&
          i.name === 'transcripts_capture_id_user_id_idx',
      ) &&
      idx.some(
        (i) =>
          i.table === 'public.transcripts' &&
          i.cols === 'user_id' &&
          i.name === 'transcripts_user_id_idx',
      ),
  );
}
{
  const fn = byType('CreateFunctionStmt').find(
    (n) => n.funcname.map((f) => f.String.sval).join('.') === 'public.set_updated_at',
  );
  const opts = Object.fromEntries((fn?.options ?? []).map((o) => [o.DefElem.defname, o.DefElem.arg]));
  const defnames = (fn?.options ?? []).map((o) => o.DefElem.defname).join(',');
  const sp = opts.set?.VariableSetStmt;
  const body = (opts.as?.List?.items?.map(sval).join('') ?? '').replace(/\s+/g, ' ').trim();
  assert(
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''",
    !!fn &&
      !fn.parameters &&
      fn.returnType.names.map((s) => s.String.sval).join('.') === 'trigger' &&
      !fn.returnType.setof &&
      defnames === 'language,set,as' &&
      opts.language?.String?.sval === 'plpgsql' &&
      sp?.name === 'search_path' &&
      sp?.args?.[0]?.A_Const?.sval?.sval === '',
  );
  assert(
    'set_updated_at body is exactly the updated_at reassignment plus return new — nothing else',
    body === 'begin new.updated_at := now(); return new; end;',
  );
  // BEFORE UPDATE FOR EACH ROW: timing 2 (BEFORE), events 16 (UPDATE), row true
  const triggers = byType('CreateTrigStmt').filter(
    (t) => t.funcname.map((f) => f.String.sval).join('.') === 'public.set_updated_at',
  );
  assert(
    'BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at) — unconditional: no WHEN clause and no UPDATE OF column list',
    triggers.length === 2 &&
      triggers.every(
        (t) =>
          t.timing === 2 &&
          t.events === 16 &&
          t.row === true &&
          !t.whenClause &&
          // `columns` is the UPDATE OF list: BEFORE UPDATE OF display_name
          // narrows the trigger to one column, leaving updated_at stale on
          // every other update, and was accepted before (REVIEW-013 finding 2).
          !t.columns &&
          !t.args &&
          !t.isconstraint,
      ) &&
      triggers
        .map((t) => rel(t.relation))
        .sort()
        .join(',') === 'public.captures,public.profiles',
  );
}

console.log('-- grants (staging post-dates the auto-expose default change) --');
{
  const grants = byType('GrantStmt');
  const tablesGranted = grants
    .flatMap((g) => (g.objects ?? []).map((o) => rel(o.RangeVar)))
    .sort()
    .join(',');
  assert(
    'each of the three tables is granted exactly select,insert,update,delete — table-object grants, no per-column privilege list, no WITH GRANT OPTION',
    grants.length === 3 &&
      tablesGranted === 'public.captures,public.profiles,public.transcripts' &&
      grants.every(
        (g) =>
          g.is_grant === true &&
          g.objtype === 'OBJECT_TABLE' &&
          !g.grant_option &&
          // `AccessPriv.cols` is the column list: GRANT SELECT(id) narrows a
          // table-object privilege to one column while keeping the privilege
          // name, and was accepted before (REVIEW-013 finding 2).
          (g.privileges ?? []).every((p) => !p.AccessPriv.cols) &&
          (g.privileges ?? []).map((p) => p.AccessPriv.priv_name).join(',') ===
            'select,insert,update,delete',
      ),
  );
  assert(
    'grants go to authenticated only — never anon, service_role, or PUBLIC',
    grants.every(
      (g) =>
        (g.grantees ?? []).length === 1 && g.grantees[0].RoleSpec?.rolename === 'authenticated',
    ),
  );
}

console.log('-- RLS: enable + force --');
assert(
  'ALTER TABLE statements are exactly the six RLS enable/force commands — no DISABLE, NO FORCE, or any other subtype anywhere',
  byType('AlterTableStmt').length === 6 &&
    byType('AlterTableStmt')
      .flatMap((n) => n.cmds.map((c) => c.AlterTableCmd.subtype))
      .every((s) => s === 'AT_EnableRowSecurity' || s === 'AT_ForceRowSecurity'),
);
for (const t of ['public.profiles', 'public.captures', 'public.transcripts']) {
  const subs = byType('AlterTableStmt')
    .filter((n) => rel(n.relation) === t)
    .flatMap((n) => n.cmds.map((c) => c.AlterTableCmd.subtype));
  assert(
    `${t}: ENABLE ROW LEVEL SECURITY`,
    subs.filter((s) => s === 'AT_EnableRowSecurity').length === 1 &&
      !subs.includes('AT_DisableRowSecurity'),
  );
  assert(
    `${t}: FORCE ROW LEVEL SECURITY`,
    subs.filter((s) => s === 'AT_ForceRowSecurity').length === 1 &&
      !subs.includes('AT_NoForceRowSecurity'),
  );
}

console.log('-- RLS: owner-only policy matrix --');
assert(
  'every policy names its schema explicitly (public or storage) and the total is exactly 17 — an unqualified or extra policy cannot hide',
  policies.length === 17 &&
    policies.every((p) => p.table.schemaname === 'public' || p.table.schemaname === 'storage'),
);
for (const [t, keyCol] of [
  ['public.profiles', 'id'],
  ['public.captures', 'user_id'],
  ['public.transcripts', 'user_id'],
]) {
  for (const op of ['select', 'insert', 'update', 'delete']) {
    const own = polFor(t, op).filter((p) => roleNames(p).join(',') === 'authenticated');
    const p = own[0];
    let ok = own.length === 1 && p.permissive === true;
    if (ok) {
      if (op === 'select' || op === 'delete')
        ok = isOwnPredicate(p.qual, keyCol) && !p.with_check;
      if (op === 'insert') ok = isOwnPredicate(p.with_check, keyCol) && !p.qual;
      if (op === 'update')
        ok = isOwnPredicate(p.qual, keyCol) && isOwnPredicate(p.with_check, keyCol);
    }
    assert(
      `${t} ${op}: one permissive policy TO authenticated, (select auth.uid()) = ${keyCol}${
        op === 'update' ? ' on USING and WITH CHECK' : op === 'insert' ? ' on WITH CHECK' : ''
      }`,
      ok,
    );
  }
}
{
  const publicPolicies = policies.filter((p) => p.table.schemaname === 'public');
  const prov = publicPolicies.find((p) => roleNames(p).join(',') === 'postgres');
  assert(
    'the 13th public policy is the provisioning path: INSERT TO postgres WITH CHECK (true) on profiles only',
    publicPolicies.length === 13 &&
      !!prov &&
      rel(prov.table) === 'public.profiles' &&
      prov.cmd_name === 'insert' &&
      !prov.qual &&
      prov.with_check?.A_Const?.boolval?.boolval === true,
  );
  assert(
    'no policy anywhere names anon or PUBLIC',
    policies.every((p) =>
      roleNames(p).every((r) => r !== 'anon' && r !== 'ROLESPEC_PUBLIC' && r !== 'public'),
    ),
  );
}

console.log('-- profiles provisioning --');
{
  const fn = byType('CreateFunctionStmt').find(
    (n) => n.funcname.map((f) => f.String.sval).join('.') === 'public.handle_new_user',
  );
  const opts = Object.fromEntries((fn?.options ?? []).map((o) => [o.DefElem.defname, o.DefElem.arg]));
  const defnames = (fn?.options ?? []).map((o) => o.DefElem.defname).join(',');
  const sp = opts.set?.VariableSetStmt;
  const body = (opts.as?.List?.items?.map(sval).join('') ?? '').replace(/\s+/g, ' ').trim();
  assert(
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''",
    !!fn &&
      !fn.parameters &&
      fn.returnType.names.map((s) => s.String.sval).join('.') === 'trigger' &&
      !fn.returnType.setof &&
      defnames === 'language,security,set,as' &&
      opts.language?.String?.sval === 'plpgsql' &&
      opts.security?.Boolean?.boolval === true &&
      sp?.name === 'search_path' &&
      sp?.args?.[0]?.A_Const?.sval?.sval === '',
  );
  assert(
    'handle_new_user body is exactly the single schema-qualified profiles insert plus return new — nothing else runs as definer',
    body === 'begin insert into public.profiles (id) values (new.id); return new; end;',
  );
  const trg = byType('CreateTrigStmt').find((t) => t.trigname === 'on_auth_user_created');
  assert(
    'trigger on_auth_user_created: AFTER INSERT FOR EACH ROW on auth.users -> public.handle_new_user',
    !!trg &&
      rel(trg.relation) === 'auth.users' &&
      trg.row === true &&
      (trg.timing ?? 0) === 0 &&
      trg.events === 4 &&
      !trg.whenClause &&
      !trg.args &&
      !trg.isconstraint &&
      trg.funcname.map((f) => f.String.sval).join('.') === 'public.handle_new_user',
  );
}

console.log('-- storage: private bucket + owner-only object policies --');
{
  const ins = byType('InsertStmt')[0];
  const colsNamed = (ins?.cols ?? []).map((c) => c.ResTarget.name).join(',');
  // Only valuesLists[0] was inspected before, so a second appended row —
  // ('neighbor-public', …, true) — created an out-of-scope public bucket while
  // the expected private row still matched (REVIEW-013 finding 2). Row
  // cardinality is now pinned.
  const valuesLists = ins?.selectStmt?.SelectStmt?.valuesLists ?? [];
  const vals = valuesLists[0]?.List?.items ?? [];
  const isFalse = (v) => !!v?.A_Const?.boolval && v.A_Const.boolval.boolval !== true;
  assert(
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — exactly one VALUES row, plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING",
    !!ins &&
      !ins.onConflictClause &&
      !ins.returningList &&
      valuesLists.length === 1 &&
      colsNamed === 'id,name,public' &&
      vals[0]?.A_Const?.sval?.sval === 'captures-audio' &&
      vals[1]?.A_Const?.sval?.sval === 'captures-audio' &&
      isFalse(vals[2]),
  );
  for (const op of ['select', 'insert', 'update', 'delete']) {
    const pol = polFor('storage.objects', op);
    const p = pol[0];
    let ok =
      pol.length === 1 && p.permissive === true && roleNames(p).join(',') === 'authenticated';
    if (ok) {
      if (op === 'select' || op === 'delete') ok = isStoragePredicate(p.qual) && !p.with_check;
      if (op === 'insert') ok = isStoragePredicate(p.with_check) && !p.qual;
      if (op === 'update') ok = isStoragePredicate(p.qual) && isStoragePredicate(p.with_check);
    }
    assert(
      `storage.objects ${op}: one policy TO authenticated, bucket-pinned and {user_id}/-scoped${
        op === 'update' ? ' on USING and WITH CHECK' : op === 'insert' ? ' on WITH CHECK' : ''
      }`,
      ok,
    );
  }
  assert(
    'storage.objects has exactly those four policies and no table-level ALTER (platform-managed table)',
    policies.filter((p) => p.table.schemaname === 'storage').length === 4 &&
      byType('AlterTableStmt').every((n) => n.relation.schemaname === 'public'),
  );
}

console.log('');
console.log(`RESULT: ${total} assertions, ${total - (failures - parseFailures)} PASS, ${failures - parseFailures} FAIL, parse failures ${parseFailures}`);
process.exit(failures === 0 ? 0 : 1);
