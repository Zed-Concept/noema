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
  grants in the RLS migration are load-bearing. `anon` receives nothing
  (dispatch: no anon access — it is also denied by having no policies), and
  `service_role` receives nothing in v1 — the first server-side unit that
  needs it adds it deliberately. The grants are harmless if the project
  ever runs under legacy auto-expose behavior; RLS still gates every row.
- **The provisioning insert policy (`TO postgres`).** FORCE RLS
  policy-checks even the table owner, and on hosted Supabase `postgres` has
  no BYPASSRLS — without this policy the SECURITY DEFINER provisioning
  insert (which executes as `postgres`, and at signup time under a null
  `auth.uid()`) would be denied and signup would fail. It is INSERT-only,
  on `profiles` only, and `postgres` is not a Data API role, so nothing
  client-reachable widens.
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

**Operational caveat (workflow-surfaced, disclosed, no code change):**
FORCE RLS plus hosted `postgres` lacking BYPASSRLS means postgres-role
tooling is policy-checked too — the dashboard Table Editor and SQL editor
sessions see zero rows in these three tables, and `supabase db dump
--data-only` does not export them. Signup provisioning is unaffected (the
insert-only policy above), platform backups/PITR run privileged and are
unaffected, and FK cascades from `auth.users` deletions are exempt from row
security by design. Inspect these tables through an authenticated client
(or dashboard user impersonation); FORCE is the dispatch-mandated posture.

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
| `sql-assertions.txt` | `capture.sh` → `verify-migrations.mjs` | gated | parse validity (real PG17 parser) + 72 AST-level assertions covering the full dispatch scope: entity list, column-by-column types/nullability/defaults/CHECKs, FKs and cascades, the composite-FK consistency guarantee, indexes, triggers, grants, ENABLE+FORCE, the 13-policy matrix with exact predicates, provisioning surface, bucket privacy, and storage policy scoping. Deterministic by construction: pinned parser, repo-relative paths, stable ordering. Exit status is the gate |
| `assertions-negative-control.txt` | `capture.sh` | gated | the gate discriminates: seven tampered scratch copies (FORCE removed; a DELETE policy removed; a storage policy widened to anon; the composite FK narrowed; SECURITY DEFINER demoted; a countermanding DISABLE ROW LEVEL SECURITY appended; a schema-unqualified USING (true) policy appended) each exit 1 with the named assertion failing. Mutations never touch the repo |
| `config-provenance.txt` | `capture.sh` | gated | committed `supabase/config.toml` and `supabase/.gitignore` byte-identical to a fresh `supabase@2.115.0 init` in a scratch git repo named `noema`; `supabase/.temp` untracked and ignored. npx stderr (install noise) dropped; scratch paths never printed |
| `inventory.txt` | `capture.sh` | gated | the six tracked `supabase/` files with index blob SHAs — the exact bytes every claim here is about. Reads the index (fixed-point discipline, like 003a) |
| `gates.txt` | `capture.sh` | gated | the four non-install CI steps at this head plus the no-dependency-delta probe (pinned to the dispatch base SHA, package files only). jest `Time:` masked, per-suite duration suffixes stripped, `env:` lines dropped (machine state). `npm ci` deliberately NOT run — see claim 11 |
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
| 2 | The schema is exactly the owner-ruled v1 entity scope — three tables, column-by-column (names, order, types, nullability, defaults, CHECK values), nothing extra anywhere in the set (statement-type whitelist, no extra tables/functions/inserts) | PASS | `sql-assertions.txt` (72/72 AST assertions, including the append-class bounds: exact per-file statement counts, exactly six RLS ALTERs with no countermanding subtype, exactly 17 schema-qualified policies, exactly three triggers, and full-body equality for both functions) |
| 3 | `transcripts.user_id` is provably consistent with the parent capture's `user_id` (composite FK + backing UNIQUE; technique documented above and in the migration comments) | PASS | `sql-assertions.txt` |
| 4 | FK-supporting indexes exist for every FK; `updated_at` triggers exist exactly where the column exists (profiles, captures — not transcripts) | PASS | `sql-assertions.txt` |
| 5 | RLS is ENABLEd and FORCEd on all three tables; the policy matrix is per-operation owner-only TO `authenticated` with initplan-wrapped `(select auth.uid()) = id/user_id` predicates (INSERT via WITH CHECK, UPDATE via both); no policy names `anon` or PUBLIC; the sole exception is the documented INSERT-only provisioning policy TO `postgres` | PASS | `sql-assertions.txt` |
| 6 | Grants are explicit and minimal: select/insert/update/delete on the three tables to `authenticated` only — never `anon`, `service_role`, or PUBLIC | PASS | `sql-assertions.txt` |
| 7 | Provisioning is a SECURITY DEFINER function with `search_path` pinned to `''`, body schema-qualified, wired AFTER INSERT FOR EACH ROW on `auth.users` | PASS | `sql-assertions.txt` |
| 8 | Storage: `captures-audio` is created private, and exactly four `storage.objects` policies (one per operation, TO `authenticated`) are bucket-pinned and `{user_id}/`-scoped via `(storage.foldername(name))[1] = (select auth.uid()::text)`; keys with no folder fail closed (the segment is null) | PASS | `sql-assertions.txt` |
| 9 | The assertion gate is not vacuous: seven security/spec-relevant tamperings — five removals/narrowings and two append-class mutations (a countermanding DISABLE, an unqualified extra policy) — each turn it red with the named FAIL and exit 1 | PASS | `assertions-negative-control.txt` |
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
