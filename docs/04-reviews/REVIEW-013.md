# REVIEW-013: Unit C — Schema and RLS v1 fix-cycle-2 re-review

**Date:** 2026-08-20
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`45396fc2527220d81a541897baa34c4521eab502`
**Prior record:** REVIEW-012 (`4b01eb17b3297887c3bde0015bed1e99be44f99e`)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Per AGENTS.md, the repository governance preflight (AGENTS, current state,
LOCK, and HANDOFF mechanics) preceded the fetch. Before inspecting target
code, migrations, evidence producers, transcripts, or either prior REVIEW
record, I ran `git fetch origin` and pinned both dispatch-supplied objects.
Each resolves to a commit; freshly fetched `origin/main` equals the supplied
base; `origin/feat/schema-rls-v1`, local HEAD, and the clean checked-out branch
equal the supplied target; and the base is the target's merge-base and an
ancestor. All substantive checks below were then repeated against the exact
target, including in a detached plain-path disposable clone.

The complete Unit C range is ten linear commits, 44 files, +6247/-12. The
REVIEW-012-to-target delta is exactly one commit with parent `4b01eb17`, 16
files, +792/-241, matching the dispatch. Both full-range and fix-delta
`git diff --check` returned 0. The fix delta does not touch any applied
migration, `src/lib/database.types.ts`, ADR, prior REVIEW record, or either
`roles-acl.*` file. HANDOFF is insertion-only and the LOCK remains REVIEW.

No Supabase project was queried. I did not inspect live auth configuration,
create/delete a user, rerun the role/ACL SQL, apply or edit a migration,
regenerate types, open a PR, push, merge, deploy, or use a credential. The
email-toggle and user-deletion outcomes are controller-restated owner facts;
fresh external verification is NOT RUN. The disclosed Fable 5 to Opus 5
transition is recorded in the LOCK and HANDOFF under the owner ruling. Per the
dispatch, the harness-fixed Fable 5 commit trailer is accepted and is not a
finding.

**Disclosure (ruling 6):** one review workflow ran:
`standards-spec-review`, with two read-only subagents (Standards and Spec).
One additional read-only subagent audited the schema oracle adversarially.
Supabase/PostgreSQL and governance/evidence-boundary checks ran in the main
review lane. No subagent edited the repository.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
| --- | --- | --- | --- | --- |
| 1 | medium | FAIL introduced by Unit C and retained in fix cycle 2 | yes | F1 is still partial: current producer/evidence text says anon holds no grants, while the settled grid records four non-CRUD table ACL entries and leaves column ACLs NOT RUN. |
| 2 | medium | FAIL introduced by Unit C and retained after fix cycle 2 | yes | F2 is not cleared: the 78-assertion oracle still returns green for material valid neighbors that invert CHECK/policy behavior, narrow a grant, add a public bucket row, narrow a trigger, or extend an index. |
| 3 | medium | FAIL introduced by fix cycle 2 | yes | The claimed 18-neighbor audit is not backed by a committed full-battery artifact and is internally miscounted. |
| 4 | low | FAIL pre-existing (historical LOCK prose), not verdict-driving | no | The authoritative Phase B LOCK note still labels all 11 anon probes as denials, although two are service-context probes. |

### 1. One current anon-grant claim still outruns the measured boundary

Most of F1 is repaired. The measurement-boundary paragraph in the 004b
[`README.md`](../05-quality/evidence/004b-schema-rls-live/README.md) correctly
limits the grid to role attributes, effective table-level CRUD, raw table ACL
entries, RLS flags, and SQL-editor identity. Tool behavior is explicitly an
inference; function ownership and column ACLs are NOT RUN; service-role and
PUBLIC statements are current/table-level; and provisioning claim 6 no longer
chooses an unmeasured admitting mechanism.

One contradiction remains. Claim 4 in that README says anon “holds no
grants”; the `deniedExact` preamble in
[`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs)
says the same, and the freshly regenerated
[`anon-probes.txt`](../05-quality/evidence/004b-schema-rls-live/anon-probes.txt)
says anon holds “no table grants.” The unchanged measured
[`roles-acl.txt`](../05-quality/evidence/004b-schema-rls-live/roles-acl.txt)
instead records `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` for anon
on every v1 table. Claim 21 separately classifies column ACLs NOT RUN.

The exact `401/42501` SELECT/INSERT results pass. The supported causal
statement is zero current table-level SELECT/INSERT (or zero table-level CRUD),
not zero grants. This is an evidence-boundary failure, not a demonstrated
Data API or authenticated-user leak.

### 2. The exact-schema oracle still has material false greens

The exact-target baseline passes: process 0, 78 assertions, 78 PASS, zero
parse failures. The committed twelve-scenario negative control also passes;
fresh reconstruction produced 12/12 process-1 runs with each required named
FAIL. Those bounded results do not establish the broader 004a claim that the
schema is exact and “nothing extra” can hide.

Using the same pinned real PostgreSQL-17 parser (`libpg-query@17.7.4`), each
of these one-change disposable copies parsed successfully and returned
process 0 with `78 assertions, 78 PASS, 0 FAIL`:

| Surface | Valid neighbor accepted green | Missed AST boundary |
| --- | --- | --- |
| CHECK | `status IN (...)` → `status NOT IN (...)` | values are checked; the IN/NOT-IN operator is not |
| RLS policy | `(select auth.uid())` → `(select auth.uid() where false)` | `isSelectAuthUid()` ignores the subquery `whereClause` |
| GRANT | profiles `SELECT` → column-only `SELECT(id)` | `AccessPriv.cols` is ignored while the claim says table-object CRUD |
| Bucket insert | add a second row `('neighbor-public', ..., true)` | only `valuesLists[0]` is inspected; row cardinality is not |
| Trigger | `BEFORE UPDATE` → `BEFORE UPDATE OF display_name` | trigger `columns` is ignored |
| Index | add `INCLUDE(id)` to `captures_user_id_idx` | included columns are ignored |

The first two break normal provisioning/read behavior; the fourth adds an
out-of-scope public bucket while retaining the expected private row. These
are separate, previously untested classes, not alternate spellings of the
five REVIEW-012 default examples. The committed migrations remain correct;
the failure is the proof artifact's claimed exactness.

### 3. The “18-neighbor” PASS has neither a full artifact nor coherent count

The new top HANDOFF says it ran “the five neighbors REVIEW-012 demonstrated
plus thirteen more,” then enumerates seventeen purportedly additional items:
function argument; four FK variations; ON CONFLICT; WITH GRANT OPTION; two
index variations; trigger WHEN; extra SET; STRICT; typmod; second CHECK;
column UNIQUE; table CHECK; and NULLS NOT DISTINCT. Five plus that list is
twenty-two, not eighteen.

The HANDOFF verification table nevertheless labels “18 neighbor mutations”
PASS and links only
[`assertions-negative-control.txt`](../05-quality/evidence/004a-schema-rls/assertions-negative-control.txt)
scenarios 9–12, saying the rest existed only in disposable scratch copies.
The committed artifact proves exactly twelve permanent scenarios total, four
from the new absence classes; it does not contain the claimed full battery.
`PROJECT-STATE.md` repeats the unsupported eighteen count. This independently
fails AGENTS.md's rule that every PASS be linked to an artifact under
`docs/05-quality/evidence/`. Finding 2 also demonstrates that the broader
claim is substantively false, not merely under-documented.

### 4. One historical LOCK sentence retains the old 11-denial label

The current producer, transcripts, README, PROJECT-STATE row, and newest
HANDOFF correctly report **9 denial/invisibility + 2 service-context = 11**.
`deniedExact()` pins one status/code pair at every denial site. However, the
Phase B closing note in
[`BRANCH-NOTES.md`](../01-state/BRANCH-NOTES.md) still says “anon denial
across REST and storage (11/11).” It is historical prose, but BRANCH-NOTES is
the authoritative lock record and no later LOCK note explicitly supersedes
that label. This is low and does not reopen the producer-oracle defect; a
future correction must be additive, not a rewrite of historical evidence.

## REVIEW-012 remediation disposition

| Prior finding | Re-review status | Evidence boundary |
| --- | --- | --- |
| F1 — privileged-role claims | **not cleared** | Tooling inference, definer owner, PUBLIC, service-role CRUD, and column-ACL boundaries are repaired; the anon “no grants” residue is finding 1. |
| F2 — exact-schema oracle | **not cleared** | Baseline 78/78 and permanent 12/12 control pass, but six fresh material neighbor classes remain green and the claimed 18-run battery is unsupported/miscounted. Findings 2–3. |
| F3 — delete-on-red prose | **cleared** | Producer and prose agree: every red path exits 1; only a residual match unlinks. Fresh missing-ledger control returned 1 and left the file; the planted residual control deletes it. |
| F4 — global disposable-user maximum | **cleared at the recorded boundary** | The absolute claim is explicitly withdrawn; claims are per namespace. `ctrl004d-*` has exactly two recorded users, both owner-recorded deleted. Live external verification is NOT RUN. |
| F5 — exact live response oracle and anon label | **producer/README cleared; low LOCK residue** | One exact status/code per denial, 11/46 PASS counts, 16 cross-user probes, and 9+2 labeling pass. Finding 4 is historical prose only. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
| --- | --- | --- |
| Exact refs, ancestry, and sequence | PASS | Fresh fetch; both objects are commits; remote/local refs equal the supplied SHAs; base is merge-base/ancestor; ten commits, no merges. |
| Full range and fix-cycle-2 scope | PASS | Full: 44 files, +6247/-12. Fix cycle 2: one commit, 16 files, +792/-241. Protected migrations/types/ADRs/reviews/roles-ACL paths are untouched. |
| State and immutable boundaries | PASS | HANDOFF is a top-only insertion; only the Unit C Active-work row changes in PROJECT-STATE; LOCK stays REVIEW; no earlier HANDOFF or REVIEW record is edited. |
| F1 measured role/ACL boundary | PASS except finding 1 | `roles-acl.txt` supports the narrowed current table-level grid; claims 19–21 honestly record tooling, owner, and column-ACL limits. The remaining anon phrase is broader than the same grid. |
| Exact-target 004a stability | PASS | Detached plain-path target: six gated artifacts × two runs, all twelve comparisons identical, differing 0, process 0. |
| Static baseline and permanent negative control | PASS | Fresh 78/78 baseline; fresh and committed twelve-scenario control is 12/12 red with named FAIL and process 1. |
| Exact-schema/absence claim | FAIL introduced by Unit C; retained after fix cycle 2 | Six fresh parse-valid material neighbors returned process 0 and 78/78; finding 2. No database application of counterfactuals was run. |
| Claimed 18-neighbor audit | FAIL introduced | No committed full-battery artifact, and the narrative says five + thirteen while listing seventeen; finding 3. |
| F3 redaction behavior | PASS | Fresh no-ledger probe returned 1 and retained the unscanned file; the committed planted residual control deletes its file. Fresh 004b captures reproduced the control bytes. |
| Initial exact-target 004b stability attempt | FAIL pre-existing to this review write; attribution NOT VERIFIABLE | The wrapper returned 1 on a suppressed capture failure and deleted its scratch diagnostics, so the exact cause cannot be classified more narrowly. |
| Subsequent exact-target 004b captures | PASS | A direct capture matched all five committed bytes; a complete five-artifact × two-run retry made all ten comparisons identical, differing 0, process 0. The earlier red result remains separately recorded. |
| Live transcript binding and counts | PASS from committed artifacts / fresh live NOT RUN | Independent hashes and sizes equal the GREEN gate: anon 3518 B `f2a3717c…d9b9`, auth 12415 B `3b23ba2e…4ef6`; 11/46 PASS, zero FAIL, exact 16-probe cross-user section. |
| F4 current external state | PASS from controller-restated owner record / fresh external verification NOT RUN | Dispatch and newest HANDOFF record confirmation ON and both `ctrl004d` users deleted. Reviewer made no staging/auth query. |
| F5 exact response oracle | PASS | Every denial site calls `deniedExact` with one status and code; list/signup checks are exact; committed bytes contain the required `401/42501`, `403/42501`, `409/23503`, `400/NoSuchKey`, and `400/AccessDenied` results. |
| Four non-install repository gates | PASS from fresh stability | Both exact-target stability runs reproduced typecheck, lint, Jest, and format-check exit-0 transcripts byte-for-byte. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta; the committed captures separately prove the no-dependency-delta premise. |
| Delta whitespace | PASS | Full-range, fix-delta, and target `git show --check` returned 0 without diagnostics. |
| Branch CI | NOT RUN | Fresh GitHub API queries found zero PRs and zero workflow runs at the target SHA. |
| Owner apply/types generation, ACL probe, auth toggle, and deletions | NOT RUN by reviewer | Owner-executed/owner-recorded under ruling 10; outputs and dispatch record were reviewed, actions were not repeated. |
| Local database lint/stack | NOT RUN | Docker/database execution is unchanged and outside this fix-cycle review boundary. |
| Advisory outcome | NOT RUN in this record | DeepSeek V4 Pro remains the named advisory reviewer; no advisory verdict artifact was supplied here. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deploy, or outward-facing action occurred. |

## Standards

Standards: **three medium hard violations and one low historical residue;
worst severity medium.** Findings 1–3 breach AGENTS.md's measurement-to-claim
and artifact rules. Finding 4 leaves an inaccurate label in the authoritative
LOCK record, though current evidence surfaces are corrected. No unrelated
cleanup, weakening of security controls, or actionable baseline code smell
was found.

## Spec

Spec: **three unresolved requirements; worst severity medium.** F1 is partial
because one privilege statement remains absolute. F2 is not cleared because
the exact oracle accepts six new material neighbor classes and its 18-run
proof claim is not artifact-backed. F5's producer and current summary are
fixed, with only the low historical LOCK label remaining. F3 and the required
per-namespace F4 correction are complete. No scope creep was found: the
fix-cycle delta is the dispatched 16 files and every exclusion holds.

Standards: 4 findings, worst medium. Spec: 3 findings, worst medium.

## Carried and adjacent items

The current migrations and committed live responses remain correct at the
measured boundaries; no authenticated-user RLS bypass, public bucket in the
actual migration, or credential leak was found. The measured platform-default
non-CRUD ACL observation, applied-migration comments, disposable-clone
precedent for machine-local `supabase/.temp`, and parked gate-machinery items
remain settled and were not remediated or re-litigated. The unexplained first
004b fail-closed run is disclosed above; three subsequent exact-target
captures succeeded and matched every gated byte.

The medium findings prevent PASS. The LOCK remains
`Status: REVIEW — fix cycle 2 complete, awaiting re-review`; MERGED is
controller-only.
