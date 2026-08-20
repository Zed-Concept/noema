// Static verification of the Unit C v1 migrations: parses every file under
// supabase/migrations/ with libpg_query (the real PostgreSQL 17 parser,
// pinned via capture.sh) and asserts the dispatch's entity scope, RLS
// matrix, provisioning surface, and storage policies against the AST —
// stronger than text grep, still fully static (no database).
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
const typeOf = (cd) =>
  cd.typeName.names
    .map((s) => s.String.sval)
    .filter((s) => s !== 'pg_catalog')
    .join('.');
const cons = (cd, type) =>
  (cd.constraints ?? []).map((c) => c.Constraint).filter((c) => c.contype === type);
const rel = (r) => `${r.schemaname ?? ''}.${r.relname}`;
const defaultFunc = (cd) => {
  const d = cons(cd, 'CONSTR_DEFAULT')[0];
  return d?.raw_expr?.FuncCall?.funcname?.map((f) => f.String.sval).join('.');
};
const defaultString = (cd) => cons(cd, 'CONSTR_DEFAULT')[0]?.raw_expr?.A_Const?.sval?.sval;
const notNull = (cd) => cons(cd, 'CONSTR_NOTNULL').length === 1;

function isAuthUidCall(node) {
  const fc = node?.FuncCall;
  if (!fc || fc.args) return false;
  const names = (fc.funcname ?? []).map((f) => f.String.sval);
  return names.length === 2 && names[0] === 'auth' && names[1] === 'uid';
}
// (select auth.uid()) — or, with cast: (select auth.uid()::text)
function isSelectAuthUid(node, cast) {
  const sl = node?.SubLink;
  if (!sl || sl.subLinkType !== 'EXPR_SUBLINK') return false;
  const sel = sl.subselect?.SelectStmt;
  if (!sel || sel.fromClause || (sel.targetList ?? []).length !== 1) return false;
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
    !!fk &&
      rel(fk.pktable) === 'auth.users' &&
      (fk.pk_attrs ?? []).map(sval).join(',') === 'id' &&
      fk.fk_del_action === 'c',
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
  const values =
    inList?.kind === 'AEXPR_IN' && isColRef(inList.lexpr, 'locale')
      ? (inList.rexpr?.List?.items ?? []).map((i) => i.A_Const?.sval?.sval)
      : [];
  assert(
    "profiles.locale text NOT NULL DEFAULT 'en'",
    !!c && typeOf(c) === 'text' && notNull(c) && defaultString(c) === 'en',
  );
  assert("profiles.locale CHECK (locale IN ('en','ar'))", values.join(',') === 'en,ar');
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
      !!fk &&
      rel(fk.pktable) === 'auth.users' &&
      fk.fk_del_action === 'c',
  );
}
{
  const c = col('public.captures', 'status');
  const check = c ? cons(c, 'CONSTR_CHECK')[0] : undefined;
  const inList = check?.raw_expr?.A_Expr;
  const values =
    inList?.kind === 'AEXPR_IN' && isColRef(inList.lexpr, 'status')
      ? (inList.rexpr?.List?.items ?? []).map((i) => i.A_Const?.sval?.sval)
      : [];
  assert(
    "captures.status text NOT NULL DEFAULT 'recorded'",
    !!c && typeOf(c) === 'text' && notNull(c) && defaultString(c) === 'recorded',
  );
  assert(
    "captures.status CHECK (status IN ('recorded','transcribing','ready','failed'))",
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
    !!c && typeOf(c) === 'int4' && !notNull(c) && geZero,
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
    !!uq && (uq.keys ?? []).map(sval).join(',') === 'id,user_id',
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
      !!fk &&
      rel(fk.pktable) === 'auth.users' &&
      fk.fk_del_action === 'c',
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
    !!fk &&
      rel(fk.pktable) === 'public.captures' &&
      (fk.fk_attrs ?? []).map(sval).join(',') === 'capture_id,user_id' &&
      (fk.pk_attrs ?? []).map(sval).join(',') === 'id,user_id' &&
      fk.fk_del_action === 'c',
  );
}

console.log('-- indexes and updated_at triggers --');
{
  const idx = byType('IndexStmt').map((n) => ({
    table: rel(n.relation),
    cols: (n.indexParams ?? []).map((p) => p.IndexElem?.name).join(','),
  }));
  assert(
    'FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id)',
    idx.length === 3 &&
      idx.some((i) => i.table === 'public.captures' && i.cols === 'user_id') &&
      idx.some((i) => i.table === 'public.transcripts' && i.cols === 'capture_id,user_id') &&
      idx.some((i) => i.table === 'public.transcripts' && i.cols === 'user_id'),
  );
}
{
  const fn = byType('CreateFunctionStmt').find(
    (n) => n.funcname.map((f) => f.String.sval).join('.') === 'public.set_updated_at',
  );
  const opts = Object.fromEntries((fn?.options ?? []).map((o) => [o.DefElem.defname, o.DefElem.arg]));
  const sp = opts.set?.VariableSetStmt;
  const body = (opts.as?.List?.items?.map(sval).join('') ?? '').replace(/\s+/g, ' ').trim();
  assert(
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''",
    !!fn &&
      fn.returnType.names.map((s) => s.String.sval).includes('trigger') &&
      opts.language?.String?.sval === 'plpgsql' &&
      opts.security === undefined &&
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
    'BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at)',
    triggers.length === 2 &&
      triggers.every((t) => t.timing === 2 && t.events === 16 && t.row === true) &&
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
    'each of the three tables is granted exactly select,insert,update,delete',
    grants.length === 3 &&
      tablesGranted === 'public.captures,public.profiles,public.transcripts' &&
      grants.every(
        (g) =>
          g.is_grant === true &&
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
  const sp = opts.set?.VariableSetStmt;
  const body = (opts.as?.List?.items?.map(sval).join('') ?? '').replace(/\s+/g, ' ').trim();
  assert(
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''",
    !!fn &&
      fn.returnType.names.map((s) => s.String.sval).includes('trigger') &&
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
      trg.funcname.map((f) => f.String.sval).join('.') === 'public.handle_new_user',
  );
}

console.log('-- storage: private bucket + owner-only object policies --');
{
  const ins = byType('InsertStmt')[0];
  const colsNamed = (ins?.cols ?? []).map((c) => c.ResTarget.name).join(',');
  const vals = ins?.selectStmt?.SelectStmt?.valuesLists?.[0]?.List?.items ?? [];
  const isFalse = (v) => !!v?.A_Const?.boolval && v.A_Const.boolval.boolval !== true;
  assert(
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false)",
    !!ins &&
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
