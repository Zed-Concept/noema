# REVIEW-012: Unit C — Schema and RLS v1 fix-cycle-1 re-review

**Date:** 2026-08-20
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`fbf81b07be8ab6007b5cff786aa1223d4e942fb2`
**Prior record:** REVIEW-011 (`ee7d11588d89b5cc71730c856937aaa6b350dc56`)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed the complete Unit C range
`64c1ce603491fb2cb6e8b7b948a369731a436c7f...fbf81b07be8ab6007b5cff786aa1223d4e942fb2`
against the fix-cycle dispatch, all five REVIEW-011 findings, the
owner-authorized RED-lane schema/RLS scope, AGENTS.md, the LOCK, and the
committed claim ledgers. I ran `git fetch origin` before reading repository
content. Both supplied objects resolve to commits; freshly fetched
`origin/main` and `origin/feat/schema-rls-v1` resolved to the supplied base and
target; the base is an ancestor of the target; and the checked-out branch was
clean at the exact target.

The full range is eight linear commits: the four original Unit C commits,
REVIEW-011 `ee7d115`, and fix-cycle commits `ce59385`, `cfabce9`, and
`fbf81b0`. It is 43 files, +5282/-11. The fix-cycle delta
`ee7d115...fbf81b0` is the dispatched 21 files, +1128/-178. It does not touch
the four applied migrations, `src/lib/database.types.ts`, any ADR, or the
immutable REVIEW-011. Full-range and fix-cycle `git diff --check` both
returned 0 without diagnostics.

I audited the changed producers, transcripts, role/ACL probe and prose,
OPERATIONS statement, current-state correction, state boundaries, and the
full cross-user grid. In a disposable plain-path clone pinned to the actual
target, I reran 004a's six gated artifacts twice and 004b's five gated
artifacts twice; every comparison reproduced the committed bytes and both
stability processes returned 0. The first sandboxed 004a attempt could not
fetch its pinned parser and is classified NOT RUN for that attempt; the
network-enabled exact-target rerun completed successfully. Reviewer-controlled
counterfactuals ran only against disposable copies and left the shared tree
untouched.

No staging or production Supabase project was queried. I did not inspect or
change live auth configuration, create or delete users, run `db push`,
regenerate types, edit an applied migration, open a PR, push, merge, or deploy.
The toggle and deletion outcomes are owner-recorded facts from the dispatch
and fix-cycle HANDOFF, not fresh reviewer measurements. Fresh GitHub queries
found zero PRs and zero workflow runs for this branch. This review writes only
this immutable record and one new top-of-file HANDOFF block.

**Disclosure (ruling 6):** workflows run: 0. Review methods: fixed-range
Standards/Spec review, Noema governance review, and Supabase/PostgreSQL
authorization plus evidence-boundary verification. Subagent fan-out: five
read-only lanes — role/ACL and current-state claims; schema-oracle and
redaction controls; live-grid arithmetic and response oracles; Standards;
and Spec. No subagent edited the repository.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
|---|---|---|---|---|
| 1 | medium | FAIL introduced by this work | yes | The role grid proves a bounded table-level posture, but the repository still converts it into unmeasured tool behavior, an unmeasured applied-function owner, and absolute ACL claims. |
| 2 | medium | FAIL introduced by this work | yes | The repaired `duration_ms` literal check discriminates, but the claimed exact-schema/sibling audit still accepts valid neighboring defaults and other unasserted schema details. |
| 3 | low | FAIL introduced by fix cycle 1 | no | The prior direct-stdout bypass is closed, but the new blanket promise that every red gate deletes its transcript is broader than the implementation. |
| 4 | low | FAIL introduced by fix cycle 1 | no | F4's current toggle/deletion record is repaired, but the same HANDOFF makes an unsupported global claim that no more than two disposable users ever existed. |
| 5 | low | FAIL introduced by fix cycle 1 | no | The committed F5 responses are correct, but the producer can label a neighboring `401/42501` as the required `403/42501`, and the HANDOFF calls 11 total anon probes 11 denials. |

### 1. The privileged-role conclusions still exceed the measurement

The owner-run [`roles-acl.sql`](../05-quality/evidence/004b-schema-rls-live/roles-acl.sql)
measures useful facts: role attributes, effective relation-level
SELECT/INSERT/UPDATE/DELETE via `has_table_privilege`, current raw table ACL
entries, SQL-editor `current_user`, and ENABLE/FORCE flags. Its committed
[`roles-acl.txt`](../05-quality/evidence/004b-schema-rls-live/roles-acl.txt)
records `postgres` as `rolsuper=f rolbypassrls=t`, the SQL editor as
`postgres`, table-level CRUD `ffff` for anon and service_role, `tttt` for
authenticated and postgres, and live FORCE on all three tables. Those bounded
facts pass.

The prose crosses that boundary in four ways:

1. [`OPERATIONS.md`](../02-roles/OPERATIONS.md) lines 42-49, the 004a
   [`README.md`](../05-quality/evidence/004a-schema-rls/README.md) lines
   74-86, and the 004b
   [`README.md`](../05-quality/evidence/004b-schema-rls-live/README.md) lines
   118-126 say Table Editor and data-only dumps see all rows. Only the SQL
   editor's identity was measured; no Table Editor or dump execution identity,
   query, or result was captured. Claim 19 in that same 004b README correctly
   classifies those end-to-end tool sessions NOT RUN, directly limiting the
   stronger statements.
2. The 004a README lines 50-59 and 004b claim 6 say the applied SECURITY
   DEFINER function executes as `postgres`, making the `TO postgres` policy
   inert. The probe does not read `pg_proc.proowner`; the SQL-editor session's
   `current_user` does not establish the applied function's owner. PostgreSQL
   executes a SECURITY DEFINER function with its owner's privileges, so that
   owner is a required link in the causal claim
   ([PostgreSQL 17 `CREATE FUNCTION`](https://www.postgresql.org/docs/17/sql-createfunction.html)).
3. The probe never inspects column ACLs (`pg_attribute.attacl`,
   `has_any_column_privilege`, or `column_privileges`). PostgreSQL exposes
   column privileges separately from table privileges
   ([PostgreSQL 17 column privileges](https://www.postgresql.org/docs/17/infoschema-column-privileges.html)).
   Therefore broad phrases such as service_role “cannot read or write” and
   absolute “PUBLIC: nothing” exceed the measured current table-level scope.
4. The 004a README lines 42-49 still says service_role “receives nothing in
   v1,” while the same committed grid records its non-CRUD
   TRUNCATE/TRIGGER/MAINTAIN/REFERENCES entries on all three tables. Also, the
   probe's `role_table_grants` PUBLIC branch is non-probative because
   PostgreSQL documents that this view omits access made available through
   PUBLIC
   ([PostgreSQL 17 `role_table_grants`](https://www.postgresql.org/docs/17/infoschema-role-table-grants.html)).
   The raw `relacl` expansion independently supports the narrower statement
   “no current table-level PUBLIC ACL entry”; no artifact supports the
   unqualified version.

This is a measurement-to-claim failure, not a demonstrated authenticated-user
RLS leak. FORCE and `rolbypassrls` are measured live; no defect was found in
the authenticated owner-policy matrix.

### 2. The exact-schema oracle still has false greens

The focused repair at
[`verify-migrations.mjs`](../05-quality/evidence/004a-schema-rls/verify-migrations.mjs)
lines 301-320 works. Baseline returned 72/72, and exact-target mutations
`duration_ms >= -1`, `>= 1`, and `>= 0.0` each returned process 1 with the
named duration assertion failing. Permanent negative-control scenario 8 in
[`assertions-negative-control.txt`](../05-quality/evidence/004a-schema-rls/assertions-negative-control.txt)
also records the required red result.

The broader claim does not hold. In isolated exact-target copies, each of the
following valid schema neighbors returned process 0 and `72 assertions, 72
PASS`:

- add `DEFAULT 'neighbor'` to nullable `profiles.display_name`;
- add `DEFAULT 'neighbor'` to nullable `captures.audio_path`;
- add `DEFAULT 0` to nullable `captures.duration_ms`;
- add `DEFAULT 'en'` to nullable `transcripts.language`;
- add `DEFAULT gen_random_uuid()` to `captures.user_id`.

The affected assertions check type and nullability but never assert that a
default is absent (for example, lines 223-225, 296-320, and 381-384). The
helper at lines 45-48 also recognizes a default function by name without
checking its arguments, and the captures/transcripts `user_id` FK assertions
at lines 267-277 and 361-372 omit the referenced attribute list. These are
additional accepts-neighbor surfaces under 004a claim 2's explicit
“column-by-column ... defaults” and exact-FK promise. The migrations themselves
remain correct; the artifact still does not prove the exact schema it labels
PASS. REVIEW-011 F2 is therefore not cleared despite the narrow literal fix.

### 3. The direct-stdout redaction bypass is fixed; deletion prose is not exact

The original F3 defect is cleared. The new
[`redaction-gate.mjs`](../05-quality/evidence/004b-schema-rls-live/redaction-gate.mjs)
scans the complete written transcript bytes, and
[`redaction-gate.txt`](../05-quality/evidence/004b-schema-rls-live/redaction-gate.txt)
binds the committed anon/auth files to 3155 bytes / SHA-256
`f9560c1f...afae06` and 12154 bytes / SHA-256 `473f2ad6...65215`.
Independent hashes matched. A fresh run of the committed planted direct-stdout
control returned 0 and reproduced
[`redaction-control.txt`](../05-quality/evidence/004b-schema-rls-live/redaction-control.txt)
byte-for-byte. A separate leaky-file control made the gate return 1 and delete
the file; a clean-file control returned 0. The REVIEW-011 bypass is closed.

The new 004b README lines 58-66 and 175-181 nevertheless promise that a red
gate deletes the transcript and that a transcript can exist only after its
bytes scan clean. `redaction-gate.mjs` lines 32-57 exits 1 without unlinking
when the ledger is missing, unreadable, or implausibly small; unlinking occurs
only on the residual-match path at lines 70-76. A fresh unset-ledger control
returned 1 while the transcript remained. The wrapper still returns nonzero,
so the process-status contract is fail-closed and the original bypass is not
reopened; only the blanket deletion/existence guarantee is false.

### 4. F4 is repaired, but one user-count assertion is unsupported

The top fix-cycle HANDOFF records the full toggle sequence and says email
confirmation is ON as of handoff. It also records owner-confirmed deletion of
both first-run and final `ctrl004c-*` pairs. The 004b README now correctly
states that its transcripts prove run-time state only and defers present state
to HANDOFF. F4 is cleared as a repository/current-state-recording defect; a
fresh external toggle/user query was NOT RUN.

The disposable-user paragraph in the fix-cycle-1 HANDOFF block says, globally,
“At no moment did more than two disposable users exist,” then says the older
`ctrl004b-*` pair remains in its prior owner-cleanup class. No owner-confirmed
deletion of that older pair is recorded. The absolute maximum is therefore
unsupported and internally ambiguous. A claim limited to the fix-cycle
`ctrl004c-*` namespace would match the evidence.

### 5. The F5 transcript is complete; two exactness claims are broader

The committed live behavior clears REVIEW-011 F5. In
[`auth-probes.txt`](../05-quality/evidence/004b-schema-rls-live/auth-probes.txt)
lines 59-94, the cross-user section has exactly 16 PASS probes: SELECT, UPDATE,
and DELETE on each table; INSERT impersonation on each table; the separate FK
case; and three victim re-reads. The FK-valid victim pair returns
`403/42501` with an RLS-policy message, distinct from the invalid pair's
`409/23503` naming `transcripts_capture_id_user_id_fkey`. The full transcript
has 46 PASS and zero FAIL.

The producer's `privilegeDenied()` helper at
[`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs)
lines 195-197 accepts either HTTP 401 or 403 with code `42501`; the three
WITH CHECK sites use that helper. A neighboring `401/42501` could therefore
receive the PASS label that claims the required authenticated RLS
`403/42501`, and the helper does not assert the RLS-policy message. The
committed response bytes prove this run's exact result, so this is a low
producer-oracle defect rather than a failed live behavior claim.

Separately, [`anon-probes.txt`](../05-quality/evidence/004b-schema-rls-live/anon-probes.txt)
contains 11 total PASS lines: two service/config context probes, six REST
denials, and three storage denial/invisibility probes. The HANDOFF table calls
that “Anon denial ... 11/11”; the exact denial/invisibility surface is 9/9.

## REVIEW-011 remediation disposition

| Prior finding | Re-review status | Evidence boundary |
|---|---|---|
| F1 — privileged-role/FORCE premise | **not cleared** | Role attributes, table CRUD, raw table ACL, SQL-editor identity, and live FORCE pass; tool behavior, applied function owner, column ACLs, and absolute ACL prose do not. Finding 1. |
| F2 — `duration_ms` exact-value oracle | **not cleared** | The exact `>= 0` fix and permanent scenario 8 pass, but fresh valid default neighbors leave the broader exact-schema/sibling claim green. Finding 2. |
| F3 — redaction gate bypass | **cleared** | Exact file bytes, SHA binding, planted stdout control, independent red/green controls, and both stability reruns pass. Finding 3 is a new low prose/cleanup-path issue only. |
| F4 — stale email-confirmation state | **cleared** | Current HANDOFF says ON and records both `ctrl004c` deletion events; live confirmation was not independently queried. Finding 4 is a separate low absolute-count issue. |
| F5 — incomplete live grid | **cleared** | 11 total anon PASS, 46 authenticated PASS, exact 16-probe matrix, and distinct `403/42501` versus `409/23503` responses are present. Finding 5 is a low producer/label exactness issue. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact refs, ancestry, and eight-commit sequence | PASS | Fresh fetch; both supplied objects are commits; local/remote target equals `fbf81b0`; base is an ancestor; exact linear sequence includes original Unit C, REVIEW-011, and the three dispatched fix commits. |
| Full/fix-cycle size and scope | PASS | Full: 43 files, +5282/-11. Fix cycle: 21 files, +1128/-178. No applied migration, generated type, ADR, or prior review changed in the fix cycle. |
| Role attributes, current table CRUD/ACL, SQL-editor identity, and FORCE flags | PASS at the measured boundary / broader claims FAIL introduced | Owner transcript records the stated bounded values. Finding 1 identifies the unmeasured extensions. |
| 004a baseline and permanent eight-scenario control | PASS | Fresh exact-target stability reproduced 72/72 and all eight named red controls, including `>= -1`; six gated artifacts × two, zero differences, process 0. Initial sandbox parser-fetch attempt: NOT RUN due network denial; approved rerun passed. |
| Exact-schema/sibling-oracle claim | FAIL introduced | Multiple valid added-default neighbors returned process 0 and 72/72; finding 2. Disposable copies only; shared tree unchanged. |
| 004b offline stability | PASS | Five gated artifacts × two exact-target captures, all ten comparisons byte-identical, differing count 0, process 0. |
| Prior direct-stdout redaction bypass | PASS | Fresh planted control byte-identical; independent leaky-file gate returned 1 and deleted; clean-file gate returned 0; committed transcript hashes equal gate bindings. |
| Historical run-only exact secret values | NOT RUN with reason | The ephemeral passwords/tokens and original ledger values no longer exist. Exact committed hashes bind the historical gate result to the present files; no reviewer can independently reconstruct the original values. |
| Red-gate delete-any-failure prose | FAIL introduced, low | Missing-ledger control returned 1 but left the transcript; finding 3. Process remains fail-closed. |
| F4 repository current-state correction | PASS from owner record / fresh external verification NOT RUN | HANDOFF records confirmation ON and both `ctrl004c` deletion rounds. No live auth/user query was authorized or made. |
| F4 global two-user maximum | FAIL introduced, low | No recorded deletion closes the older `ctrl004b` pair before the absolute assertion; finding 4. |
| Anon committed behavior | PASS from artifact / fresh live NOT RUN | 11 total PASS, zero FAIL: two context, six REST denials, three storage denial/invisibility probes. Reviewer did not query staging. |
| Authenticated full-grid behavior | PASS from artifact / fresh live NOT RUN | 46 total PASS, zero FAIL; exact 16-probe cross-user section; `403/42501` RLS case distinct from `409/23503` FK case. Reviewer did not create users or query staging. |
| F5 exact response oracle/label | FAIL introduced, low | `privilegeDenied()` accepts 401 or 403, while the claim requires 403; anon 11/11 is total probes, not denial count. Finding 5. |
| Four non-install repository gates | PASS from committed artifacts and fresh stability | Both gated captures reproduce typecheck, lint, Jest, and format-check exit 0 bytes. |
| Secret-shape scan | PASS from committed artifacts and fresh stability | Both 004a/004b positive-controlled index scans reproduced byte-for-byte. No credential value was printed or queried. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta. The accepted editor/ENOTEMPTY history remains outside this unit. |
| Owner `db push`, type generation, ACL probe, toggle, and deletions | NOT RUN by reviewer | Owner-executed/owner-attested under the supplied rulings. The ACL output and current-state record were reviewed; actions were not repeated. |
| Delta whitespace | PASS | Full-range and fix-cycle `git diff --check` returned 0 without diagnostics. |
| Branch CI | NOT RUN | Fresh GitHub queries found zero PRs and zero workflow runs for the branch. |
| Local database lint/stack | NOT RUN | Requires database/Docker execution and was outside the reviewer evidence boundary. |
| Advisory outcome | NOT RUN in this record | DeepSeek V4 Pro remains the advisory reviewer in the LOCK; no advisory verdict artifact was supplied to this session. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deployment, or outward-facing action occurred. |

## Standards

Standards: **3 hard mismatches; worst severity medium.**

1. Medium — relation-level role/ACL measurements are used for broader
   effective-ACL claims without any column-ACL measurement; the stale 004a
   “receives nothing” phrase also conflicts with the committed non-CRUD ACL
   entries.
2. Medium — Table Editor and dump behavior is explicitly NOT RUN in claim 19
   but asserted as current fact in OPERATIONS and both evidence READMEs.
3. Low — the delete-on-red prose covers every red outcome, while the producer
   unlinks only the residual-match path.

Judgement-call smell, non-driving: the hand-written 16-probe F5 block uses
opaque local names such as `xs1`, `xup`, `xi4`, and `rc3`, but its explicit
probe labels keep the committed transcript understandable. Governance
otherwise conforms: top-only HANDOFF insertion, LOCK remains REVIEW, applied
migrations and REVIEW-011 are untouched, and both whitespace checks pass.

## Spec

Spec: **2 findings; worst severity medium.**

1. Medium — F1 remains partial because the required “no more, no less”
   measurement boundary does not cover Table Editor or data-only-dump
   execution, while the repository asserts both and simultaneously classifies
   them NOT RUN.
2. Low — F1's 004a `service_role` statement still says “receives nothing”
   rather than the dispatched and measured “zero CRUD,” despite the measured
   non-CRUD grants.

No missing F2-F5 implementation or unrelated scope creep was found on the
Spec axis: the exact-value control, exact-byte redaction control, top HANDOFF
current-state record, full live grid, 16 probes, and distinct `403/42501`
versus `409/23503` evidence are present. The independent semantic audit in
finding 2 is what shows that the implemented oracle remains incomplete.

## Carried and adjacent items

The controller-classified TRUNCATE/TRIGGER/MAINTAIN/REFERENCES observation is
accepted here as the measured current raw-ACL posture, documented and
unacted-on; no default-ACL or grant remediation is authorized by this review.
The disposable-clone precedent for the owner's machine-local
`supabase/.temp` residue is accepted and not re-litigated. The applied
migration comments remain immutable and are explicitly superseded by later
evidence/prose; no migration edit is requested. No active authenticated-user
RLS bypass, credential leak, or live-grid response defect was found.

The two medium findings prevent PASS. The LOCK remains
`Status: REVIEW — fix cycle 1 complete, awaiting re-review`; MERGED is
controller-only.
