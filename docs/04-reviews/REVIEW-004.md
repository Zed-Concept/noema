# REVIEW-004: REVIEW-003 fix-loop re-review

**Date:** 2026-08-18
**Reviewer:** Codex (reviewer of record)
**Target:** `feat/app-skeleton` at
`c2ffd15becf9a5bd40fc2f60c129f89b79756710`, delta from
`670b5365a78417523fee26741425dda3a6c4b45c`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed only the single fix-loop commit `670b536...c2ffd15` and the directed
REVIEW-003 remediations. Both full SHAs resolve, the base is the target's sole
parent and merge-base, the diff is non-empty, and `git diff --check` passes. I
did not re-examine matters settled in REVIEW-003 or earlier.

I made a disposable detached clone at the exact target, ran a fresh `npm ci`,
then ran the four committed 002b scripts unchanged. I compared every regenerated
artifact with its committed blob. The sandboxed script run could not reach the
npm registry for Expo Doctor or npm audit; I reran those two commands with
network access. Expo Doctor returned 21/21 and npm audit reproduced 22
advisories. Neither network-dependent output is needed for the verdict: four
other artifacts independently disprove the required byte stability.

This was a repository-only review. I did not query Supabase or any deployment,
open a PR, run GitHub Actions, fix reviewed work, or merge. The review changes
only this record and the required HANDOFF append.

Controller rulings applied without reopening them: slug and npm package/repo
names are internal; scheme is quasi-outward, frozen pending name clearance, and
hard-gated before distribution. CI remains NOT RUN until a PR opens. Audit
advisories, retained navigation dependencies, Node skew, and the CI job-label
wording are accepted and are not findings.

## Findings

| # | Severity | Classification | File:line at `c2ffd15` | Finding | Status |
|---|---|---|---|---|---|
| 1 | medium | FAIL introduced by this work | `docs/05-quality/evidence/002b-fix-loop/README.md:26-39`; `push-state.txt:4-12`; `name-scan.txt:47-49`; `test.txt:6-13`; `expo-export.txt:7-13` | **The explicit byte-stable regeneration gate fails.** After a fresh install at the committed head, the committed scripts changed 4 of the 12 generated 002b transcripts without relying on network: `push-state.txt` moved from the old `670b536` remote head to the actual `c2ffd15`; `name-scan.txt` changed the governance-file count from 14 to 21; and test/export timings and export warning lines changed. Their committed/regenerated Git blob pairs were respectively `68a215e`/`dafd06e`, `8c63737`/`a4dcf70`, `a49d590`/`464533e`, and `358aa5a`/`abaeeff`. The stale push artifact is also the stated proof for claim 10. This is an evidence-record defect, not a product defect, but it directly fails a dispatched re-review gate. | open; verdict-driving |
| 2 | medium | FAIL introduced by this work | `docs/02-roles/OPERATIONS.md:25-27,52-59,64-66`; `docs/05-quality/evidence/002b-fix-loop/README.md:20,42` | **REVIEW-003 finding 2 is only partially resolved.** The operational source now documents the commands, but it says a fresh clone "runs," that a local Expo dev-server environment "exists," and that the app skeleton "runs." The same file and evidence index say rendering is NOT RUN and bundle export does not prove runtime behavior. Under `AGENTS.md`'s evidence rule, those runtime claims remain unverified. | open |

Finding 1 is verdict-driving because byte-stable regeneration is an explicit
dispatch requirement. Finding 2 independently leaves a prior medium finding
open.

## REVIEW-003 finding status

| Prior finding | Classification | Reviewer evidence | Status |
|---|---|---|---|
| 1 — user-visible app name | PASS | Fresh `name-scan.sh` reproduction returned zero `/noema/i` matches in user-visible fields at all three depths: `app.json`, resolved public Expo config, and the exported web manifest. `name`, `web.name`, and `web.shortName` resolve to `ZC App (dev)`. The section-4 count is stale as described in finding 1 above, but that does not change the three-depth product result. | fixed |
| 2 — false operations source | FAIL introduced by this work | The old "nothing exists" text is gone and the command table is useful, but the replacement overclaims unverified runtime state as described in finding 2 above. | open |
| 3 — stale unpushed narrative | PASS | The 002a README now correctly says the feature branch is pushed and that this does not trigger CI. Fresh Git resolves `origin/feat/app-skeleton` to `c2ffd15` with `HEAD...origin` equal to `0 0`. The replacement `push-state.txt` is itself stale; that is separately captured in finding 1. | fixed; new evidence defect open |
| 4 — non-head tracked-file listing | PASS | Fresh `tracked-files.sh` reproduction was byte-identical to the committed artifact. Its 70 paths exactly equal `git ls-files` and `git ls-tree -r --name-only c2ffd15`. | fixed |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact target and range | PASS | `c2ffd15` is one linear commit above `670b536`; both resolve and the merge-base is exactly the supplied base. |
| Fresh lockfile install | PASS | In the detached clone, `npm ci` installed 1,085 packages and exited 0. |
| CI's five local commands | PASS | Fresh install, `npm run typecheck`, `npm run lint`, `npm test -- --ci`, and `npm run format:check` each exited 0. The lint artifact still lists five inspected files. |
| Three-depth user-visible name scan | PASS | Fresh [name-scan](../05-quality/evidence/002b-fix-loop/name-scan.txt) reproduction returned 0/false/0 for the written, resolved, and exported-manifest checks. Controller-classified identifiers were not flagged. |
| Expo compatibility | PASS | The network-enabled rerun returned 21/21, semantically matching [expo-doctor.txt](../05-quality/evidence/002b-fix-loop/expo-doctor.txt). |
| iOS, Android, and web export | PASS | Fresh export exited 0 and produced all three platform bundles and three static routes, semantically matching [expo-export.txt](../05-quality/evidence/002b-fix-loop/expo-export.txt). |
| 002b byte-stable regeneration | FAIL introduced by this work | Finding 1. Six regenerated files differed in the sandboxed run; excluding the two registry failures, four non-network artifacts still differed and fail the gate. |
| `npm audit` | FAIL pre-existing | Network-enabled rerun reproduced 22 advisories (7 moderate, 15 high). Controller-accepted; not a review finding. |
| CI execution | NOT RUN | No PR or push-to-main event exists. This is controller-accepted and unchanged. |
| REVIEW-003 finding 2 | FAIL introduced by this work | Finding 2. Commands are documented, but runtime assertions are not proven. |
| REVIEW-003 finding 3 | PASS | The corrected 002a narrative matches fresh origin state. See finding 1 for the new stale-artifact defect. |
| REVIEW-003 finding 4 | PASS | The tracked-file transcript reproduces byte-for-byte and matches the exact target tree. |
| HANDOFF prior-block preservation | PASS | Fix delta is 140 insertions and 0 deletions; the only hunk inserts the new block above every prior block. |
| BRANCH-NOTES prior-content preservation | PASS | Fix delta is 34 insertions and 0 deletions; the only hunk appends the fix-loop note inside the Unit A LOCK. Status stays `REVIEW`. |
| PROJECT-STATE boundary | PASS | Numstat is 1 insertion/1 deletion, and the sole hunk is the Unit A Active-work row. |
| Immutable decision/review paths | PASS | The reviewed fix delta contains no path under `docs/03-decisions/` or `docs/04-reviews/`. |
| Rendering on device, simulator, or browser | NOT RUN | The bundle export passed; runtime rendering remains unverified. |

## Standards

Two hard standards findings: finding 1 violates the dispatched evidence
reproducibility requirement and leaves claim 10 backed by a pre-head artifact;
finding 2 violates `AGENTS.md`'s rule that an unverified claim must be reported
as unverified. No baseline code smell is reported. The duplicated capture shape
is justified by immutable evidence history, and the CI label is the accepted
backlog nit.

## Spec

Finding 1 fails the explicit requirement that 002b evidence regenerate
byte-stably at the committed head. All other bounded product and state checks
pass except the operational-source overclaim in finding 2. There is no scope
creep and no controller-accepted matter was reopened.

Standards: 2 hard findings; worst is the medium unverified operations claim.
Spec: 1 verdict-driving medium evidence-record finding; the product name and
the other bounded checks pass.

## Carried items

CI remains NOT RUN pending the PR-open event. Audit advisories, retained
navigation dependencies, local/CI Node skew, scheme/name-clearance gating, and
the CI job-label wording remain accepted or explicitly deferred, not findings.
