# Evidence — 004a Schema and RLS v1, Phase A (Unit C, CTRL-004)

Branch `feat/schema-rls-v1`, cut from `main` at
`64c1ce603491fb2cb6e8b7b948a369731a436c7f` (the tip the dispatch named).
Phase A is **static by dispatch**: it proves what is provable from the
migration text and the committed scaffolding without any database. Nothing
here connected to staging, production, or a local database; no credentials
were handed or used this session. Application to staging is owner-executed
(ruling 10) and is Phase B's subject, along with the post-apply RLS-denial
evidence and type regeneration.

## What the migrations are

Four files under `supabase/migrations/`, applied in filename order,
authored 2026-08-20 (their timestamps record the authoring date):

1. `20260820100000_v1_core_schema.sql` — the three owner-ruled entities
   (`public.profiles`, `public.captures`, `public.transcripts`), their
   constraints, FK-supporting indexes, and `updated_at` triggers.
2. `20260820100100_v1_rls_policies.sql` — explicit grants to
   `authenticated`, ENABLE + FORCE row level security on all three tables,
   and the per-operation owner-only policy matrix.
3. `20260820100200_v1_profile_provisioning.sql` — `handle_new_user`
   (SECURITY DEFINER, empty pinned `search_path`), its AFTER INSERT trigger
   on `auth.users`, and the provisioning-path insert policy.
4. `20260820100300_v1_storage_captures_audio.sql` — the private
   `captures-audio` bucket and four owner-only `storage.objects` policies
   scoped to a `{user_id}/` leading path segment.

## Documented design choices (authorized as builder's choice, dispatch 3b)

- **`user_id` consistency on transcripts — composite FK.** `transcripts`
  carries `FOREIGN KEY (capture_id, user_id) REFERENCES captures (id,
  user_id) ON DELETE CASCADE`, backed by `UNIQUE (id, user_id)` on
  `captures`. A transcript whose `user_id` differs from its parent
  capture's is unrepresentable — enforced by the database at all times,
  with no trigger logic to bypass. The direct FK to `auth.users` is kept as
  dispatched; both cascade.
- **Constraint naming** follows Postgres's default shapes
  (`<table>_<col>_fkey`, `<table>_<col>_check`, `<table>_<cols>_key`),
  written explicitly so the names are stable inputs to Phase B evidence.
- **Explicit grants, `authenticated` only.** `noema-staging` (created
  2026-08-18) post-dates Supabase's auto-expose default change: new
  public-schema entities carry no Data API privileges until granted, so the
  grants in the RLS migration are load-bearing. This migration set authors
  **no grant to `anon` or `service_role`** — the first server-side unit
  that needs one adds it deliberately. What the authored text proves is the
  absence of an authored grant; the *effective* posture is a separate,
  measured question, and the fix-cycle-1 grid
  (`../004b-schema-rls-live/roles-acl.txt`) records it as **zero
  table-level CRUD** for both roles, alongside platform-default non-CRUD
  ACL entries (`TRUNCATE`, `TRIGGER`, `MAINTAIN`, `REFERENCES`) that this
  set did not author. Column-level privileges were not measured, so no
  statement here covers them. The grants are harmless if the project ever
  runs under legacy auto-expose behavior; RLS still gates every row.
- **The provisioning insert policy (`TO postgres`).** Authored under the
  Phase A premise that hosted `postgres` lacks BYPASSRLS. The fix-cycle-1
  measurement (`../004b-schema-rls-live/roles-acl.txt`, REVIEW-011
  finding 1) shows staging `postgres` carries `rolbypassrls=t`, which would
  bypass row security for anything executing as that role. Whether the
  applied SECURITY DEFINER insert *does* execute as `postgres` is
  **unmeasured** — a SECURITY DEFINER function runs with its owner's
  privileges, and no artifact reads the applied function's owner
  (`../004b-schema-rls-live/README.md` claim 20). So this policy's present
  effect is genuinely undetermined: either it admits the provisioning
  insert, or a `BYPASSRLS` definer makes it redundant. It is retained as
  defense-in-depth regardless — INSERT-only, on `profiles` only, and
  `postgres` is not a Data API role, so nothing client-reachable widens
  either way.
- **`auth.uid()` is initplan-wrapped** (`(select auth.uid())`) in every
  policy predicate so it evaluates once per statement, not per row; every
  keyed column is indexed (PK or the FK-supporting indexes).
- **Bucket insert is deliberately not idempotent.** If a `captures-audio`
  bucket already existed, `ON CONFLICT DO NOTHING` would silently keep its
  existing (possibly public) configuration. A loud failure at apply is the
  correct outcome; no bucket exists on staging today.
- **`supabase/config.toml` is unmodified pinned-CLI output** (`supabase
  init` from `supabase@2.115.0`, the pin Unit B established), proven
  byte-identical in `config-provenance.txt`. Its `project_id = "noema"` is
  an internal identifier (ruling 8 exempt, repo-name class). Its
  `[db] major_version = 17` is the generated default; the owner confirms it
  matches staging at link time (`supabase link` warns on mismatch).

**Operational caveat (premise corrected by measurement — REVIEW-011
finding 1; narrowed to the measured boundary per REVIEW-012 finding 1):**
Phase A assumed hosted `postgres` lacks BYPASSRLS, so FORCE would blind
postgres-role tooling. The owner-run staging measurement
(`../004b-schema-rls-live/roles-acl.txt`) refutes the premise: `postgres`
carries `rolbypassrls=t`, and the dashboard SQL editor measurably executes
with `current_user=postgres`, while `relrowsecurity=t` and
`relforcerowsecurity=t` hold on all three tables. From those measured
facts it **follows by inference — not by transcript —** that a surface
running as `postgres` sees all rows despite FORCE; the SQL editor is the
only execution identity on the record, and **no Table Editor session or
data-only dump was run or transcribed** (`../004b-schema-rls-live/README.md`
claim 19). FORCE still policy-checks every non-BYPASSRLS role, and FK
cascades from `auth.users` deletions are exempt from row security by
design. Signup provisioning demonstrably works (proven live in 004b), though
which mechanism admits its definer insert is not isolated — see the
`TO postgres` bullet above. The applied migration comments that carry the
original premise are APPLIED-and-immutable; the correction lives here, in
OPERATIONS.md, and in the fix-cycle HANDOFF — never in an edit to an
applied migration.

## What the oracle proves — and what it does not

`verify-migrations.mjs` is an **enumerated-assertion oracle**, not a proof of
exhaustive schema equivalence. It parses the four migrations with the real
PostgreSQL 17 grammar and evaluates 91 named assertions, each pinning one
enumerated property of the AST. A parse-valid neighbor of the migration set
is rejected **exactly when it changes a property some assertion names**, and
is accepted when it does not. A green run means *every enumerated property
holds* — not *no other schema text could pass*.

This wording is deliberate and replaces the earlier "the schema is exactly
the v1 scope, nothing extra can hide" framing, which claimed more than the
mechanism delivers (REVIEW-011 finding 2, REVIEW-012 finding 2, REVIEW-013
finding 2 each demonstrated parse-valid neighbors that the oracle passed
green at the time).

**How this list is constructed (REVIEW-015 finding 1).** Naming a class is
not pinning it. The previous revision listed properties the assertions did
not actually compare — most sharply, "RLS — exact USING/WITH CHECK predicate
shape", while a storage folder-owner equality could be reversed to
`IS DISTINCT FROM` and still print its `{user_id}/-scoped` PASS. So the
direction of the claim is now inverted: **a class may appear below only
because at least one permanent scenario in
`assertions-negative-control.txt` demonstrates the oracle rejects a neighbor
that changes it.** Every scenario carries a class tag; `capture.sh` derives
the set of demonstrated classes from those tags, parses this list back out
of this file, and **exits 1 unless the two sets are identical** — in either
direction, and unless this list is free of duplicate class names, so the two
sets cannot be made to match by two entries collapsing under `sort -u`
(REVIEW-016 finding 1 demonstrated that boundary on a disposable
countercontrol). A class that cannot be demonstrated is removed from this list
rather than defended in prose, and a control cannot silently drop out of the
claim. The cross-check, with both lists printed, is at the end of
`assertions-negative-control.txt`.

Five structural rules in `verify-migrations.mjs` produce the discrimination
this list asserts, and all of them replace field-by-field enumeration:

- **Operator comparisons pin the AST kind, not just the operator name.**
  libpg_query names `IS DISTINCT FROM`, `IS NOT DISTINCT FROM`, `= ANY (…)`
  and `= ALL (…)` **all** `=`; the first is the exact negation of the
  intended predicate. One `opExpr()` helper now serves every operator site,
  closing the asymmetry where `isOwnPredicate()` checked the kind and the
  duplicated storage helpers did not.
- **Node forms are pinned against a list of permitted keys.** A class that reads only
  the field carrying its property accepts every other clause the same node
  can hold — a `LIKE` table element that never reaches the column list,
  `COLLATE`/`STORAGE`/`COMPRESSION` beside a type name, `DESC`/opclass
  inside an index key, `CONCURRENTLY`/`TABLESPACE` beside an index,
  `REFERENCING`/`OR REPLACE` on a trigger, `GRANTED BY` on a grant, `ONLY`
  on an `ALTER TABLE`, `OVERRIDING` on an `INSERT`. Each such node is
  compared against the list of keys the committed migrations produce under
  the pinned parser (`noUnlistedKeys`), so an unaccounted-for clause rejects
  instead of riding along unread. The test is "nothing unlisted rides
  along", not set equality: libpg_query emits protobuf, which omits a scalar
  field at its default value, so an *absent* key is not a signal while an
  *unlisted* one is. Meaningful default values are pinned by value
  alongside, and meaningful list lengths by length — neither follows from
  the key list.

The next three rules come from **REVIEW-016 finding 1**, which showed the
first two were necessary and not sufficient. The finding was one neighbor —
`(storage.foldername(name))[1]` widened to `[1][2]`, which PostgreSQL
evaluates to NULL rather than rejecting, so the folder equality is UNKNOWN
for every row and owners are denied, while the oracle still printed its
`{user_id}/-scoped` PASS. `isFolderEq()` read `indirection[0]` and never
required the subscript list to hold exactly one entry. Auditing **every**
class above for that same defect shape — a class claiming exactness while
the assertion reads only part of a node's structure — found **25** accepted
in-class neighbors across four classes (RLS, Storage bucket row, Functions,
Foreign keys), all now permanent scenarios in group 8 of
`assertions-negative-control.txt`:

- **Lists are read whole, never by position.** Every subscript list goes
  through `intSubscripts()`, which requires the exact number of subscripts,
  each a plain integer index and not a slice — `[1][2]` and `[1:1]` both
  matched a position-only read. The list lengths a single assertion owns
  (the bucket `VALUES` row's item count, the `INSERT` target-column list)
  are pinned at those assertion sites.
- **One function-call shape test, applied everywhere a call is pinned.**
  `defaultFunc()` already rejected `VARIADIC`, `DISTINCT`, `ORDER BY`,
  `FILTER`, `OVER`, and a star argument for column defaults; the RLS
  predicate call sites read only the name and argument list, so
  `auth.uid(*)`, `auth.uid() OVER ()`, `storage.foldername(VARIADIC name)`
  and their siblings rode along inside the expressly pinned predicate. The
  guard existed in the file and was simply not shared; `plainCall()` now
  serves every site.
- **Named things are compared through the helper that marks their
  neighbors, at every site.** `typeName()` marks typmod and array bounds, so
  `::text[]` and `returns trigger[]` cannot compare equal to `text` and
  `trigger` — the storage cast and both `returns trigger` checks re-joined
  the name themselves and dropped the markers. `bareTarget()` rejects an
  output alias on a pinned `SELECT` target. `isPlainRel()` now covers the
  foreign key's referenced table too — the one relation reference that
  skipped it, so a catalog qualifier the compared name never prints rode
  along.

**Enumerated classes — what is pinned.** Every class below has at least one
permanent scenario in `assertions-negative-control.txt` proving it actually
discriminates, and the correspondence is machine-enforced as described
above:

1. **Set shape** — the four **whole filenames** (timestamp prefix included:
   the prefix is the apply order and the migration identity Postgres
   records), the directory listing itself so a non-`.sql` sibling cannot
   hide behind the parser's filter, the per-file statement counts
   (9 + 21 + 3 + 5), and a statement-type whitelist. Appended or
   countermanding statements cannot hide.
2. **Entity inventory** — exactly three tables, two functions, three
   triggers **by name**, one INSERT, the exact column list and order per
   table, and every table element pinned to a `ColumnDef` or a `Constraint`
   so a `LIKE` source table cannot contribute columns that never reach the
   compared list.
3. **Column types** — exact type name, with typmod and array neighbors
   rejected, and the column definition's exact node shape, so `COLLATE`,
   `STORAGE`, `COMPRESSION`, `IDENTITY`, and `GENERATED` cannot ride beside
   an unchanged type name.
4. **Constraint presence and absence** — each column's exact
   constraint-type multiset and each table's exact table-level constraint
   set, with `INHERITS`/`PARTITION BY`/`OF`/tablespace/`IF NOT EXISTS`/
   `WITH` options/access method pinned absent, every table pinned permanent
   and non-inheriting (so `UNLOGGED` and `TEMP` reject), and every
   constraint's own node shape pinned so `NO INHERIT`, `DEFERRABLE`,
   `INITIALLY DEFERRED`, and `NOT VALID` reject. Any constraint added to or
   removed from any column or table changes the compared string.
5. **Constraint values and operators** — CHECK `IN` value lists *and* the
   `IN`/`NOT IN` operator; the `duration_ms >= 0` bound against the literal
   zero, with the comparison's AST **kind** pinned so `>= ANY (…)` and
   `>= ALL (…)` reject; DEFAULT string literals; DEFAULT function calls
   pinned zero-argument (argument, star, DISTINCT, ORDER BY, FILTER, OVER
   rejected); both boolean constants.
6. **Foreign keys** — constraint name, referencing and referenced attribute
   lists, referenced table — pinned to a plain, non-inheriting, permanent
   relation like every other relation reference, so a catalog qualifier the
   compared name never prints rejects — match type, `ON UPDATE`, and
   `ON DELETE`.
7. **Indexes** — name, table, key-column list, access method, uniqueness,
   predicate, and `INCLUDE` list, plus the exact node shape of the index and
   of every key element, so `CONCURRENTLY`, `IF NOT EXISTS`, `TABLESPACE`,
   `WITH` options, `DESC`, `NULLS FIRST/LAST`, an operator class, a
   collation, or an expression key all reject.
8. **Triggers** — timing, event mask, `FOR EACH ROW`, target relation,
   function, the three trigger names, and the optional clauses pinned
   absent: `WHEN`, `UPDATE OF` column list, args, `CONSTRAINT`,
   `REFERENCING` transition tables, and `OR REPLACE`.
9. **Functions** — name, absence of parameters, return type **with typmod
   and array neighbors marked** (so `returns trigger[]` rejects; a
   `pg_catalog.` qualifier is normalized away, exactly as it is for column
   types, because it names the same type), language,
   `SECURITY` flag, the exact option-name sequence (so an extra `SET` or
   `STRICT` is rejected), `OR REPLACE` pinned absent, full body-text
   equality, and the pinned empty `search_path` compared as a **complete**
   one-argument `SET` — so `search_path = '', public`, which puts `public`
   back on the resolution path inside the SECURITY DEFINER body, rejects.
10. **Grants** — object type, object list, exact privilege list, per-column
    privilege lists pinned absent, grantee list, `WITH GRANT OPTION` pinned
    absent, and the grant's exact node shape, so a `GRANTED BY` grantor
    rejects.
11. **RLS** — the exact `ALTER TABLE` subtype set (enable/force present, no
    disable/no-force anywhere) with `ONLY`, `IF EXISTS`, and a non-table
    objtype rejected; the policy total; schema qualification on every
    policy; and per policy: command, roles, **permissiveness on all 17 —
    including the provisioning policy, the one whose permissiveness was
    never compared** — and the USING/WITH CHECK predicate shape. Every
    equality in those predicates pins the AST **kind** as well as the
    operator name, so `IS DISTINCT FROM`, `IS NOT DISTINCT FROM`,
    `= ANY (…)` and `= ALL (…)` — all of which libpg_query names `=` —
    reject; the first inverts the predicate outright. The initplan
    `(select auth.uid())` subquery stays pinned to a bare one-target SELECT,
    so an added `WHERE`/`LIMIT`/`GROUP BY` is rejected, and that single
    target is pinned to a bare value so an output alias rejects. The storage
    folder lookup pins the **whole subscript list** — exactly one plain
    integer index, value 1 — so `[1][2]` and the slice `[1:1]` reject; every
    function call in these predicates pins the same call shape column
    defaults already did, so `VARIADIC`, `DISTINCT`, `ORDER BY`, `FILTER`,
    `OVER`, and a star argument reject; and the owner cast pins `text` with
    array and typmod neighbors marked, so `::text[]` rejects.
12. **Storage bucket row** — target relation, column list as bare names (so
    subscript indirection such as `public[1]`, which prints the same name,
    rejects), `VALUES` row count **and that row's item count**, each literal
    value, `ON CONFLICT`, `RETURNING`, and the statement's own node shape,
    so `OVERRIDING` and a `WITH` clause reject.

**What it does not prove.**

- **It is not a proof of exhaustive schema equivalence.** Parse-valid
  neighbors outside the enumerated classes above may pass. The honest
  statement of a green run is "every enumerated property holds", and any
  claim quoting this artifact is bounded to that.
- Properties no assertion names are unpinned. Comments, whitespace, and
  formatting are unpinned by design; so is statement order within a file
  beyond the per-file counts.
- **Spellings that parse to the same node are accepted, deliberately.**
  `CAST(x AS text)` and `x::text`, `f(ALL x)` and `f(x)`, and
  `pg_catalog.trigger` and `trigger` are the same AST (modulo source
  offsets) or the same type. The oracle pins the predicate, not its
  spelling, so these are not neighbors, and they cannot appear in the
  battery, which requires a red run.
- It is **static**: it reads migration text, never a database. What the
  applied schema actually is, what privileges are effectively held, and what
  the platform grants by default are separate measured questions, and belong
  to `../004b-schema-rls-live/`.
- A future migration adding a fifth file would fail assertion 1 rather than
  be analysed; the oracle is pinned to this four-file set.

## Artifacts and classification

Three classes, following `../002b-fix-loop/README.md` precedent: **gated**
(regenerates byte-for-byte from its committed script at this committed
head — proven per artifact by `stability.txt`), **run-varying** (varying
fields named), and **not gated** (the gate itself).

Every producer runs under pinned `LC_ALL=C LANG=C` (learning 7 discipline;
recorded in `environment.txt`). Two pinned tools are fetched from the npm
registry at capture time and never committed: `libpg-query@17.7.4` (the
real PostgreSQL 17 parser — libpg_query — installed into a scratch
directory) and `supabase@2.115.0` via npx. Reproduction therefore needs
registry access; both pins are exact, so the transcript bytes do not move.

| Artifact | Producer | Class | Notes / normalization |
| --- | --- | --- | --- |
| `sql-assertions.txt` | `capture.sh` → `verify-migrations.mjs` | gated | parse validity (real PG17 parser) + 91 AST-level assertions over the twelve enumerated classes in *What the oracle proves*: entity list, column-by-column types/nullability/defaults/CHECKs, FKs and cascades, the composite-FK consistency guarantee, indexes, triggers, grants, ENABLE+FORCE, the 13-policy matrix with exact predicates, provisioning surface, bucket privacy, and storage policy scoping — **pinning absence as well as presence within those classes** (REVIEW-012 finding 2, REVIEW-013 finding 2; see claim 2 and the coverage statement). Deterministic by construction: pinned parser, repo-relative paths, stable ordering. Exit status is the gate |
| `assertions-negative-control.txt` | `capture.sh` | gated | **the complete permanent neighbor battery** — 80 tampered scratch copies in eight labelled groups (removals/narrowings; append-class; the REVIEW-011 exact-value neighbor; the REVIEW-012 absence classes; the remaining fix-cycle-2 absence classes made permanent; the six REVIEW-013 finding 2 classes; the twenty-three REVIEW-015 finding 1 classes; the twenty-five REVIEW-016 finding 1 classes), each exiting 1 with its named assertion failing. Every neighbor class any claim in this directory names is enumerated and run here — no claim rests on a scratch-only run (REVIEW-013 finding 3). The stated total is computed from the run counter and cross-checked by `capture.sh` against the artifact's own `scenario:` lines, so the count cannot drift from the enumeration. Every scenario additionally carries the enumerated class it demonstrates, and the closing cross-check compares the set of demonstrated classes against the list parsed out of this README — `capture.sh` exits 1 on any difference in either direction, and on a duplicate name in the claimed list, which is what entitles that list to name a class at all (REVIEW-015 finding 1; the duplicate guard closes the `sort -u` boundary REVIEW-016 finding 1 demonstrated). Mutations never touch the repo |
| `config-provenance.txt` | `capture.sh` | gated | committed `supabase/config.toml` and `supabase/.gitignore` byte-identical to a fresh `supabase@2.115.0 init` in a scratch git repo named `noema`; `supabase/.temp` untracked and ignored. npx stderr (install noise) dropped; scratch paths never printed |
| `inventory.txt` | `capture.sh` | gated | the six tracked `supabase/` files with index blob SHAs — the exact bytes every claim here is about. Reads the index (fixed-point discipline, like 003a) |
| `gates.txt` | `capture.sh` | gated | the four non-install CI steps at this head plus the no-dependency-delta probe (pinned to the dispatch base SHA, package files only). jest `Time:` masked, per-suite duration suffixes stripped, `env:` lines dropped (machine state). The format check runs the pinned local prettier against a clean `git checkout-index` of the staged tree — the normalization `../004b-schema-rls-live/capture.sh` already used, adopted here in fix cycle 4 because regenerating this artifact surfaced the difference: prettier walks untracked working-copy files and does not read nested ignore rules, so the owner's machine-local `supabase/.temp` residue (untracked, ignored by `supabase/.gitignore`) reddened this step over machine state while 004b, measuring the staged tree at the same head, was green. CI checks out only the tracked tree, and this now measures exactly that. `npm ci` deliberately NOT run — see claim 11 |
| `secret-scan.txt` | `capture.sh` | gated | the four 003a patterns plus a connection-string-with-credentials shape (the leak class native to migration files); defanged patterns, runtime-assembled positive controls, fail-closed |
| `environment.txt` | `capture.sh` | run-varying | node, npm, OS of the machine; the locale line is pinned by construction |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself (002d precedent); exit status is its contract — 0 all-match, 1 otherwise |

`capture.sh` **fails closed**: exit 1 after writing the transcript that
shows why, on any assertion failure, a non-discriminating negative control,
scaffolding provenance drift, a wrong inventory, a secret-scan match, or a
broken positive control. A green artifact set from a red run cannot exist.

## Claims

| # | Claim | Class | Artifact |
| --- | --- | --- | --- |
| 1 | All four migrations parse under the real PostgreSQL 17 grammar (libpg_query, pinned `libpg-query@17.7.4`): 9 + 21 + 3 + 5 = 38 statements, zero failures | PASS | `sql-assertions.txt`, parse section |
| 2 | Every property in the twelve enumerated classes of *What the oracle proves* holds on this migration set: three tables, column-by-column (names, order, types, nullability, defaults, CHECK values **and operators**), the enumerated set-shape bounds (statement-type whitelist, exact per-file statement counts, no extra tables/functions/inserts), and per-class absence pinning. **This is an enumerated-assertion result, explicitly not a proof of exhaustive schema equivalence — parse-valid neighbors outside the enumerated classes may pass** (REVIEW-013 finding 2; the bounded coverage statement and the known limits are in *What the oracle proves*) | PASS, bounded to the enumerated classes | `sql-assertions.txt` (91/91 AST assertions, including the append-class bounds: exact per-file statement counts, exactly six RLS ALTERs with no countermanding subtype, exactly 17 schema-qualified policies, exactly three triggers, and full-body equality for both functions). **Exact-value discipline** — the `duration_ms >= 0` assertion compares the literal against zero (REVIEW-011 finding 2), and the storage folder lookup's **whole subscript list** — exactly one plain integer index, value 1, so `[1][2]` and `[1:1]` turn it red (REVIEW-016 finding 1) — both boolean constants (`WITH CHECK (true)`, bucket `public = false`), every string literal, trigger timing/event codes, and FK actions are exact-value comparisons. **Absence-pinning discipline** (REVIEW-012 finding 2, extended by REVIEW-013 finding 2): each column's exact constraint-type multiset is compared, so a DEFAULT — or any other constraint — added to a column declared default-free turns it red; each table's exact table-level constraint set is compared, with `INHERITS`/`PARTITION BY`/`OF`/tablespace/`IF NOT EXISTS` pinned absent; CHECK `IN` lists pin the operator, so a `NOT IN` neighbor with the same values turns it red; that same call-shape guard now applies at **every** pinned call site, not only column defaults, so argument, star, `VARIADIC`, `DISTINCT`, `ORDER BY`, `FILTER`, and `OVER` neighbors of `auth.uid()` and `storage.foldername(name)` reject too (REVIEW-016 finding 1); every FK pins constraint name, referenced table — as a plain, non-inheriting, permanent relation, so a catalog qualifier rejects — **and attribute list**, match type, and both actions; every type-name comparison rejects typmod and array neighbors, function return types included, so `returns trigger[]` and `::text[]` turn it red; the initplan `(select auth.uid())` subquery is pinned to a bare one-target SELECT, so an added `WHERE`/`LIMIT`/`GROUP BY` turns it red, and its single target is pinned to a bare value so an output alias turns it red; grants pin per-column privilege lists absent; the bucket insert pins its `VALUES` row count, that row's item count, and bare-name target columns; and the remaining optional clauses that could widen behavior are pinned absent — trigger `WHEN`/`UPDATE OF`/args/`CONSTRAINT`, function `STRICT`/volatility/extra `SET`/parameters/`SETOF`, `WITH GRANT OPTION`, index `UNIQUE`/predicate/access method/`INCLUDE`, and `ON CONFLICT`/`RETURNING` on the bucket insert |
| 3 | `transcripts.user_id` is provably consistent with the parent capture's `user_id` (composite FK + backing UNIQUE; technique documented above and in the migration comments) | PASS | `sql-assertions.txt` |
| 4 | FK-supporting indexes exist for every FK; `updated_at` triggers exist exactly where the column exists (profiles, captures — not transcripts) | PASS | `sql-assertions.txt` |
| 5 | RLS is ENABLEd and FORCEd on all three tables; the policy matrix is per-operation owner-only TO `authenticated` with initplan-wrapped `(select auth.uid()) = id/user_id` predicates (INSERT via WITH CHECK, UPDATE via both); no policy names `anon` or PUBLIC; the sole exception is the documented INSERT-only provisioning policy TO `postgres` | PASS | `sql-assertions.txt` |
| 6 | The **authored** grants are explicit and minimal: select/insert/update/delete on the three tables, to `authenticated` only, as table-object grants without WITH GRANT OPTION — this set authors no grant naming `anon`, `service_role`, or PUBLIC. (What is *effectively* held is a separate measured question — `../004b-schema-rls-live/README.md` claims 18/21) | PASS | `sql-assertions.txt` |
| 7 | Provisioning is a SECURITY DEFINER function with `search_path` pinned to `''`, body schema-qualified, wired AFTER INSERT FOR EACH ROW on `auth.users` | PASS | `sql-assertions.txt` |
| 8 | Storage: `captures-audio` is created private, and exactly four `storage.objects` policies (one per operation, TO `authenticated`) are bucket-pinned and `{user_id}/`-scoped via `(storage.foldername(name))[1] = (select auth.uid()::text)`; keys with no folder fail closed (the segment is null) | PASS | `sql-assertions.txt` |
| 9 | The oracle is not vacuous, and **the enumerated-class list in *What the oracle proves* is derived from this battery rather than asserted beside it**: 80 security/spec-relevant tamperings in eight labelled groups — five removals/narrowings; two append-class mutations (a countermanding DISABLE, an unqualified extra policy); the exact-value neighbor (`duration_ms >= -1`, REVIEW-011 finding 2); the four REVIEW-012 finding 2 absence classes (added DEFAULT, function-argument neighbor, FK referenced-attribute neighbor, appended ON CONFLICT); the fourteen further absence classes that fix cycle 2 ran in scratch only (FK `ON UPDATE`, FK `MATCH FULL`, FK rename, `WITH GRANT OPTION`, unique index, partial index, trigger `WHEN`, extra `SET`, `STRICT`, typmod, second column CHECK, column UNIQUE, table-level CHECK, `NULLS NOT DISTINCT`); the six REVIEW-013 finding 2 classes (CHECK `NOT IN`, policy subquery `WHERE false`, column-only `SELECT(id)`, a second public bucket row, `UPDATE OF display_name`, index `INCLUDE(id)`); and the **twenty-three REVIEW-015 finding 1 classes** — neighbors that changed a property a named class SAYS it pins and passed green anyway: the storage folder-owner equality reversed to `IS DISTINCT FROM` (decisive: the confidentiality predicate inverted while the oracle printed its `{user_id}/-scoped` PASS), the storage bucket equality likewise, a storage `IS NOT DISTINCT FROM` that stops failing closed on a null folder, the provisioning policy made `AS RESTRICTIVE`, `ALTER TABLE ONLY`, a renamed migration filename, a fifth non-`.sql` file, a `LIKE` table element, a renamed trigger, `COLLATE`, `STORAGE EXTERNAL`, `UNLOGGED`, CHECK `NO INHERIT`, `>= ANY`, index `DESC`, index `CONCURRENTLY`, trigger `REFERENCING`, `CREATE OR REPLACE` on a trigger and on a function, `search_path = '', public` on both functions, `GRANTED BY`, and `OVERRIDING USER VALUE`; and the **twenty-five REVIEW-016 finding 1 classes** — the result of auditing *every* named class for the defect shape REVIEW-016 found in one of them, a class claiming exactness while the assertion reads only part of a node's structure: the storage folder lookup given a second subscript `[1][2]` on each of the four policies (decisive: apply-valid, evaluates to NULL, denies owners, and the oracle printed its `{user_id}/-scoped` PASS), the slice `[1:1]`, five aggregate/window clauses on `storage.foldername(name)` (`VARIADIC`, `DISTINCT`, `ORDER BY`, `FILTER`, `OVER`), four on `auth.uid()` across the storage and `profiles` initplans (star argument twice, `OVER`, `FILTER`), the owner cast widened to `::text[]` and `::pg_catalog.text[]`, an output alias on both pinned initplan targets, a fourth expression in the bucket `VALUES` row, subscript indirection on a bucket target column, `returns trigger[]` on both functions, and a catalog qualifier on the `auth.users` and composite foreign keys — each turning it red with its named FAIL and exit 1. **No claim in this directory rests on a scratch-only neighbor run** (REVIEW-013 finding 3). Four fail-closed cross-checks bind the artifact to its own claims: the stated count is derived from the run counter and compared to the artifact's `scenario:` lines; every scenario must carry a class tag; the claimed class list must be duplicate-free; and the set of classes demonstrated here must equal the set *What the oracle proves* enumerates, or `capture.sh` exits 1. Each absence-class assertion compares one exact string covering every column or site in its class, so the discrimination is not scenario-local. This is discrimination over the enumerated classes; it is not evidence of exhaustive coverage — see *What the oracle proves* | PASS | `assertions-negative-control.txt` |
| 10 | The committed `supabase/` scaffolding is byte-identical to pinned-CLI init output; machine-local init output (`supabase/.temp`) is untracked and ignored | PASS | `config-provenance.txt` |
| 11 | The four non-install CI steps pass at this head (typecheck, lint, test, format:check — all exit 0). The install step is NOT RUN here: this unit's delta provably contains no dependency change (probe in the transcript), and 002d/003a document the destructive npm-ci ENOTEMPTY transient under a live editor; CI runs the real install when the PR opens | PASS / install NOT RUN with reason | `gates.txt` |
| 12 | CI itself on this branch | NOT RUN | no `pull_request` event yet; the workflow file is untouched by this unit |
| 13 | No credential shape exists anywhere in the index (five patterns, each with a matching positive control) | PASS | `secret-scan.txt` |
| 14 | The six gated artifacts regenerate byte-for-byte (two fresh capture runs, locale pinned) | PASS | `stability.txt` |
| 15 | The migrations apply cleanly to `noema-staging` | NOT RUN — owner-executed by ruling 10; requested in the Phase A HANDOFF | — |
| 16 | Live RLS behavior: anon denied, cross-user denied, owner allowed, storage path scoping enforced, signup provisioning creates the profiles row | NOT RUN — needs the applied schema and a live database; this is Phase B's evidence, against staging, after the owner applies | — |
| 17 | Regenerated database types against the applied schema | NOT RUN — owner-executed (`npm run types:gen`, ruling 10); Phase B commits the output | — |
| 18 | `supabase db lint` / local-stack validation of the migration set | NOT RUN — requires Docker and a running local database; Phase A is static by dispatch | — |
| 19 | Hosted-apply privileges for the two platform-managed surfaces (CREATE TRIGGER on `auth.users`; CREATE POLICY on `storage.objects` as `postgres`) | NOT RUN — provable only at apply time; both are documented Supabase-supported migration patterns, and a failure surfaces loudly in the owner's `db push` transcript | — |

## Re-running

From the repo root, at a committed (or fully staged — fixed-point
discipline) head, with npm registry access and dependencies already
materialized per the committed lockfile (`npm ci` has run; capture does not
install — in a fresh clone the four CI steps would otherwise fall back to
registry fetches and the gates.txt bytes would not reproduce):

- `bash docs/05-quality/evidence/004a-schema-rls/capture.sh` — regenerates
  the six gated artifacts and `environment.txt` (a couple of minutes; runs
  the four CI steps and two pinned-tool fetches). Exit 1 = fail closed.
- `bash docs/05-quality/evidence/004a-schema-rls/stability.sh` — the
  byte-stability proof: two fresh captures into scratch, compared against
  the committed copies. Exit 0/1 is the contract.
- `SQLPARSE_NODE_MODULES=<dir with node_modules containing libpg-query@17.7.4> \
  node docs/05-quality/evidence/004a-schema-rls/verify-migrations.mjs` —
  the assertion engine alone, against `supabase/migrations/` (or
  `MIGRATIONS_DIR=<dir>` for any other copy).
