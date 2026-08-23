# REVIEW-011: Unit C — Schema and RLS v1 full-unit review

**Date:** 2026-08-20
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Target:** `feat/schema-rls-v1` at
`5ec404cb2d382b9cd2eda24de24abfac90d19730`, delta from
`64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed the complete four-commit Unit C range
`64c1ce603491fb2cb6e8b7b948a369731a436c7f...5ec404cb2d382b9cd2eda24de24abfac90d19730`
against the controller dispatch, the owner-authorized RED-lane schema/RLS
scope, AGENTS.md, the LOCK, ADR-001, and the committed claim ledgers. I ran
`git fetch origin` before reading repository content. The supplied objects are
commits; freshly fetched `origin/main` was the exact base and
`origin/feat/schema-rls-v1` was the exact target; the base is an ancestor of
the target; and the checked-out branch was clean at that target. The linear
sequence is exactly `7ebeb8b`, `17721ac`, `de5e992`, `5ec404c`, with the
supplied parents. The range is 37 files, +3977/-11, and `git diff --check`
returned 0 without diagnostics.

I audited all four migrations and their parsed AST evidence; the generated
types; the static and live evidence producers, controls, transcripts, and
claim tables; the one OPERATIONS sentence; the four-commit/state sequence;
and every changed path. In a disposable exact-target clone I reran the six
004a gated artifacts twice and the four 004b gated artifacts twice. All twenty
comparisons reproduced their committed bytes, with both stability scripts
returning 0. I also ran two reviewer-controlled false-green controls, restored
both mutations, and confirmed the disposable tracked tree was clean afterward.

No staging or production database was queried. The configured public staging
URL/key and their derived host/project ref were handled only by a nonprinting
local exact-value residue comparison against the target tree; they were not
emitted or sent in a request. I did not create another test user, invoke
`db push`, regenerate types, alter auth configuration, edit an applied
migration, open a PR, push, merge, or deploy. Fresh GitHub queries found zero
PRs and zero workflow runs for the branch. This review writes only this
immutable record and one new top-of-file HANDOFF block.

Review methods: fixed-range Standards/Spec review, Noema governance review,
and Supabase/PostgreSQL authorization and evidence-boundary verification.
Subagent fan-out: three read-only lanes — repository standards, dispatch/spec
compliance, and PostgreSQL/RLS plus evidence controls. No subagent edited the
repository.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
|---|---|---|---|---|
| 1 | medium | FAIL introduced by this work | yes | The unit's privileged-role/FORCE-RLS premise conflicts with the fetched upstream `postgres` role definition and is not measured on the exact staging project. |
| 2 | medium | FAIL introduced by this work | yes | The static schema oracle has a demonstrated false green for the exact `duration_ms >= 0` invariant it claims to prove. |
| 3 | medium | FAIL introduced by this work | yes | The live-probe redaction gate does not cover the complete child output that is committed, so its “totality” PASS is false as a producer guarantee. |
| 4 | medium | FAIL introduced by this work | yes | The Phase B README and HANDOFF misstate the post-run email-confirmation posture after the owner re-enabled it. |
| 5 | low | FAIL introduced by this work | no | The live cross-user claim says all three tables have write-path coverage, but the transcript exercises only a representative subset. |

### 1. Privileged-role and FORCE-RLS claims are contradicted or unproved

The Phase A [`README.md`](../05-quality/evidence/004a-schema-rls/README.md)
lines 42-56 and 71-78, the applied migration comments in
[`20260820100100_v1_rls_policies.sql`](../../supabase/migrations/20260820100100_v1_rls_policies.sql)
lines 1-12 and
[`20260820100200_v1_profile_provisioning.sql`](../../supabase/migrations/20260820100200_v1_profile_provisioning.sql)
lines 23-28, Phase B claim 6, the builder HANDOFF, and
[`OPERATIONS.md`](../02-roles/OPERATIONS.md) lines 42-46 all depend on this
premise: hosted `postgres` lacks `BYPASSRLS`, so FORCE policy-checks it; the
`TO postgres` INSERT policy is what makes provisioning work; and postgres-role
Table Editor, SQL editor, and data-only dumps consequently see zero rows.

That premise conflicts with the fetched upstream `supabase/postgres` `develop`
snapshot, pinned for this review at
`e8cb105c09433c977749d72b87930d3031acf5c7`; its
[`10000000000000_demote-postgres.sql`](https://github.com/supabase/postgres/blob/e8cb105c09433c977749d72b87930d3031acf5c7/migrations/db/migrations/10000000000000_demote-postgres.sql)
sets `postgres ... BYPASSRLS`. PostgreSQL documents that roles with
`BYPASSRLS` always bypass row security; FORCE removes the table-owner
exemption but does not override `BYPASSRLS`.
([PostgreSQL 17 row-security documentation](https://www.postgresql.org/docs/17/ddl-rowsecurity.html),
[Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)).

No target artifact reads `pg_roles.rolbypassrls`, measures the execution role,
or exercises Table Editor, SQL editor, or a data-only dump. The successful
signup transcript proves the trigger insert succeeded, but it cannot
distinguish a policy-authorized insert from a `BYPASSRLS` definer. If staging
matches the vendor baseline, the policy is redundant and the zero-row tooling
sentence is false; if staging differs, the repository contains no artifact
proving that exception. The exact staging role/tool behavior is therefore NOT
RUN, not PASS.

The same evidence boundary affects the absolute claim that `service_role`
“receives nothing.” [`verify-migrations.mjs`](../05-quality/evidence/004a-schema-rls/verify-migrations.mjs)
lines 449-473 proves only that the three authored `GRANT` statements name
`authenticated`. It does not inspect effective or inherited table/column
privileges, PUBLIC, ownership, role attributes, or default ACLs. The anon live
transcript does prove effective anon denial for the exercised REST operations;
no service-role or privileged-role measurement exists. The authored GRANT
shape passes, while the broader effective-privilege claim is NOT RUN.

No authenticated end-user policy bypass was found: the twelve authenticated
owner policies and every predicate position, including both sides of all three
UPDATE policies, are structurally correct. The committed anon/auth transcripts
support the operations they actually run. This finding concerns privileged-role
semantics and unsupported operational claims, not a demonstrated cross-user
data leak.

### 2. The exact schema oracle accepts the wrong check value

Phase A claim 2 says the schema is proven column-by-column, including exact
CHECK values, by 72/72 AST assertions. For `captures.duration_ms`, however,
[`verify-migrations.mjs`](../05-quality/evidence/004a-schema-rls/verify-migrations.mjs)
lines 301-312 checks only that the right-hand AST node is an integer; it never
compares that integer with zero.

In a disposable exact-target clone I changed only
`captures_duration_ms_check` from `duration_ms >= 0` to `duration_ms >= -1`
and ran the exact pinned `libpg-query@17.7.4` verifier. It returned process 0,
printed `PASS captures.duration_ms ... CHECK (duration_ms >= 0)`, and ended
`RESULT: 72 assertions, 72 PASS`. I reversed the mutation and confirmed no
tracked diff remained. The committed migration's predicate is correct, but
the artifact does not prove the exact invariant its label and claims table say
it proves. The seven committed negative controls do not cover this value
mutation.

### 3. The redaction totality gate scans only its private buffer

The Phase B [`README.md`](../05-quality/evidence/004b-schema-rls-live/README.md)
lines 28-38 and claim 14 say every line is swept and a transcript can exist
only after a total zero-residual gate. In
[`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs)
lines 91-120, however, the gate scans only strings routed through `out()` into
`lines`. Direct stdout/stderr is outside that buffer, while
[`live-probes.sh`](../05-quality/evidence/004b-schema-rls-live/live-probes.sh)
lines 45-54 redirects the child's entire stdout/stderr into the transcript.

In a disposable exact-target control, after the synthetic publishable-key
value had been registered, I inserted `console.log(KEY); finish(0)` at the
start of anon mode and used only synthetic URL/key values. The raw synthetic
key survived in stdout, the gate printed `0 residual occurrences`, and the
process returned 0. I reversed the mutation and confirmed the tracked file was
restored. This proves the producer's totality assertion can be falsely green.

Independent exact-target scans found no declared credential shape and no exact
configured staging URL, host, project ref, or publishable key; no present
secret leak was found. The run-only generated passwords and opaque tokens were
not available for independent exact-value comparison, so their exact-value
totality is NOT RUN. The finding is that the claimed fail-closed guarantee does
not cover the stream that is actually committed.

### 4. The current email-confirmation state is stale

The review dispatch records that the owner disabled staging email confirmation
for the authenticated probe run and re-enabled it afterward. The committed
transcripts correctly record only their run-time state,
`mailer_autoconfirm=true`. But the Phase B
[`README.md`](../05-quality/evidence/004b-schema-rls-live/README.md) lines
64-71 says re-enabling remains a future decision, and the builder
[`HANDOFF.md`](../01-state/HANDOFF.md) lines 53-60 and 126-129 says staging
“now has email confirmation disabled.” Those current-state statements conflict
with the later owner action supplied in the review dispatch. The reviewer did
not query the auth settings; the exact external state is dispatch-recorded,
not independently measured here. The conflict itself is proven and leaves the
repository handoff unsafe for a future auth unit to consume as current truth.

### 5. The live cross-user matrix is narrower than its PASS claim

Phase B claim 8 and the HANDOFF describe cross-user denial across all three
tables as invisible reads, no-op UPDATE/DELETE writes, and WITH CHECK failures.
The producer at
[`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs)
lines 529-618 does SELECT all three tables, but UPDATE only `captures`, DELETE
only `transcripts`, and RLS-rejected INSERT only `profiles` and `captures`.
The transcript INSERT uses user 2's own `user_id`, passes the transcript RLS
WITH CHECK, and is rejected by the composite FK; that is strong consistency
evidence but not a cross-owner transcript WITH CHECK probe. No cross-user
UPDATE of `profiles`/`transcripts`, DELETE of `profiles`/`captures`, or
user-ownership relocation UPDATE is run.

The static AST evidence verifies the complete policy matrix and no policy
defect was found. This is therefore a low, non-verdict-driving live-evidence
overclaim: narrow the prose to the representative operations actually run or
add the missing probes in a fix cycle.

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact refs, ancestry, and four-commit sequence | PASS | Fresh fetch; both supplied objects are commits; remote refs equal the supplied SHAs; base is an ancestor; exact linear sequence `7ebeb8b` / `17721ac` / `de5e992` / `5ec404c`. |
| Range size and authorized composition | PASS | 37 files, +3977/-11. Phase A is migrations plus 004a/static state; Phase B is the owner-regenerated type blob, 004b live evidence, one OPERATIONS sentence, and state. No unrelated product, dependency, CI, payment, or decision/review file changed. |
| Four migrations parse and statement inventory | PASS | Fresh 004a reruns reproduced [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt) and [`stability.txt`](../05-quality/evidence/004a-schema-rls/stability.txt): four files, 9/21/3/5 statements, zero parse failures. Finding 2 limits the exact-value oracle. |
| V1 schema and composite-FK mechanism | PASS, except finding 2's oracle | Direct migration audit plus [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt): three scoped tables; `(capture_id,user_id)` references `captures(id,user_id)` backed by the matching UNIQUE; FK indexes cover both deletion paths; committed `duration_ms >= 0` is correct. |
| Authenticated owner-policy SQL matrix | PASS | [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt) records ENABLE + FORCE on all three tables and twelve per-operation `authenticated` policies; direct AST/source audit confirms UPDATE has both USING and WITH CHECK and every predicate uses the correct key. |
| Provisioning function and trigger shape | PASS static / privileged-role cause FAIL | Empty pinned search path, schema-qualified one-insert body, SECURITY DEFINER, and AFTER INSERT trigger are proven in [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt). The `TO postgres` causal claim fails under finding 1. |
| Authored table GRANT statements | PASS static / effective privileged ACL NOT RUN | The three SQL statements grant CRUD only to `authenticated`, proven by [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt). Effective `service_role`/PUBLIC/inherited/default ACL posture was not measured; finding 1. |
| Storage bucket and policy SQL | PASS | [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt) and direct audit prove a private bucket plus SELECT/INSERT/UPDATE/DELETE policies, each bucket-pinned, authenticated-only, and first-folder-segment owner-scoped. |
| Owner-regenerated types | PASS by direct source inspection plus indirect compile/live Row checks / generation NOT RUN | Commit `17721ac` changes only `src/lib/database.types.ts`; its blob remains `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc` at target. [`gates.txt`](../05-quality/evidence/004b-schema-rls-live/gates.txt), [`types-shape.txt`](../05-quality/evidence/004b-schema-rls-live/types-shape.txt), and live row-key probes corroborate compilation and Row column names. Insert, Update, and Relationships match the migrations on direct source inspection; those shapes are not measured by `types-shape.mjs`. Generation was owner-executed and not rerun. |
| Anon live behavior | PASS from committed artifact; fresh live NOT RUN | [`anon-probes.txt`](../05-quality/evidence/004b-schema-rls-live/anon-probes.txt) records 11/11, including SELECT+INSERT denial on all three tables. The reviewer did not query staging. |
| Authenticated owner/live consistency behavior | PASS from committed artifact; fresh live NOT RUN | [`auth-probes.txt`](../05-quality/evidence/004b-schema-rls-live/auth-probes.txt) records 40/40 for signup, owner CRUD, triggers, representative cross-user denial, composite-FK rejection, and storage scoping. Fresh execution would exceed the authorized two-user boundary and require owner cleanup, so it was not run. Finding 5 limits the cross-user matrix wording. |
| Exact staging `postgres`/effective ACL/tooling posture | NOT RUN / FAIL claimed PASS | No `pg_roles`, `has_table_privilege`, role-inheritance/default-ACL, dashboard, or dump artifact exists; finding 1. No database query was authorized or made by the reviewer. |
| Static evidence stability | PASS | Exact target 004a `stability.sh`: six gated artifacts × two runs, all twelve comparisons identical, differing count 0, encoded and process exit 0, reproducing [`stability.txt`](../05-quality/evidence/004a-schema-rls/stability.txt). |
| Live-evidence offline stability | PASS | Exact target 004b `stability.sh`: four gated artifacts × two runs, all eight comparisons identical, differing count 0, encoded and process exit 0, reproducing [`stability.txt`](../05-quality/evidence/004b-schema-rls-live/stability.txt). |
| Static exactness negative control | FAIL introduced | The committed seven scenarios pass, but the fresh `>= -1` control stays green; finding 2. |
| Transcript redaction totality | FAIL introduced; declared shapes/current configured values clean; run-only exact values NOT RUN | Fresh synthetic bypass proves the in-process gate is incomplete; finding 3. Both committed [`secret-scan.txt`](../05-quality/evidence/004b-schema-rls-live/secret-scan.txt) and independent target scans found no declared credential shape or exact configured staging URL/host/ref/key. Ephemeral passwords/tokens were unavailable for exact-value comparison. |
| Four non-install repository gates | PASS from committed artifact | [`004a/gates.txt`](../05-quality/evidence/004a-schema-rls/gates.txt) and [`004b/gates.txt`](../05-quality/evidence/004b-schema-rls-live/gates.txt) record typecheck, lint, Jest, and format check exit 0. Fresh capture/stability reproduced their bytes. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta. The committed gates classify install separately, and the accepted editor/ENOTEMPTY history remains outside this unit. |
| Owner `db push` and authenticated type generation | NOT RUN by reviewer | Owner-executed under ruling 10; controller-held provenance only. Live transcripts corroborate applied shape indirectly, not the execution transcript. |
| Email-confirmation current state | FAIL introduced / fresh query NOT RUN | Committed run-state transcript is valid; current-state prose conflicts with the owner re-enable event in the review dispatch; finding 4. |
| OPERATIONS touch scope | PASS scope / FAIL semantics | Exact diff is +5/-1 from wrapping one added grammatical sentence, the sole authorized OPERATIONS change. Its postgres-role zero-row assertion fails finding 1. |
| State, HANDOFF, and immutable boundaries | PASS | Unit C Active-work update only; LOCK remains REVIEW; target HANDOFF is a +328/-0 top prepend with the prior suffix byte-identical; no prior review or ADR changed. Finding 4 applies to the new block's current-state content. |
| Delta whitespace | PASS | Exact base-to-target `git diff --check` returned 0 without diagnostics. |
| Branch CI | NOT RUN | Fresh GitHub queries returned zero PRs and zero workflow runs for `feat/schema-rls-v1`. |
| Local database lint/stack | NOT RUN | Requires Docker/database execution and was not part of the reviewer evidence boundary. |
| Advisory review outcome | NOT RUN in this record | DeepSeek V4 Pro is registered in the LOCK, but no advisory verdict artifact was supplied to this reviewer. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deployment, or other outward-facing action occurred. |

## Standards

Findings 2 and 3 violate the repository's proof standard: the recorded PASS
labels are stronger than the controls that produce them, and both gaps have
fresh discriminating false-green reproductions. Finding 4 violates the
append-only handoff's purpose as current operational truth. Finding 5 is a
smaller claim-to-measurement mismatch. The changed SQL and evidence surfaces
are otherwise cohesive; no speculative abstraction, shotgun surgery, or
unrelated cleanup was found.

## Spec

The authorized schema, composite consistency mechanism, authenticated policy
matrix, storage policy shape, generated-type shape, one-sentence OPERATIONS
touch, phase sequence, and controller-only REVIEW state are present. Finding 1
prevents acceptance of the unit's privileged-role design explanation and
operational posture. Findings 2 and 3 also fail AGENTS.md's unit-level
verification bar, and finding 4 leaves the dispatched owner action recorded
incorrectly. No reviewed migration or evidence file is edited by this review;
remediation belongs to a controller-dispatched fix cycle.

Standards: 4 findings, worst severity medium. Spec: 4 verdict-driving defects,
worst severity medium.

## Carried and adjacent items

The already reported PostgREST denial hints and Prettier interaction with the
owner's untracked `supabase/.temp` remain parked and are not re-litigated. The
004a capture script's process-status coarseness is confirmed but was already
accepted/backlogged in PROJECT-STATE and REVIEW-010, so it is not a new or
verdict-driving finding here. The owner-side test-user cleanup, controller-held
apply/type-generation transcripts, and separate advisory route remain outside
this review's authority.

The LOCK remains `Status: REVIEW`; only the controller may record MERGED.
