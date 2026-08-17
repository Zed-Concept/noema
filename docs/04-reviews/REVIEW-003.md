# REVIEW-003: Unit A app skeleton

**Date:** 2026-08-18
**Reviewer:** Codex (reviewer of record)
**Target:** `feat/app-skeleton` at
`9708fc223dff97343e7a1dad5389b701609d692f`, delta from
`ed0340d46a0cacbeffaaf71ed1cc229d62316fc9`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed the complete two-commit delta
`ed0340d46a0cacbeffaaf71ed1cc229d62316fc9..9708fc223dff97343e7a1dad5389b701609d692f`.
The target is a linear child of the base through `05a92a8d857c38df2cf415c843e45f362f576fd8`.
I inspected every changed path and independently checked scope, tracked files,
CI definition, state-file boundaries, and evidence claims.

The committed evidence was treated as assertion. I made a clean detached clone
at the target, ran `npm ci`, then ran the committed `capture.sh` and
`negative-control.sh` unchanged. The initial sandboxed capture could not resolve
the npm registry for `expo-doctor@latest` or `npm audit`; the exact capture
script was rerun with network access and completed. Only runtime durations,
Metro warning lines, and generated bundle hashes differed from the committed
transcripts; classifications and substantive outputs reproduced.

This was a repository-only review. I did not query Supabase or any deployment,
open a PR, run GitHub Actions, deploy, fix findings, or merge. The review writes
only this record and the required HANDOFF append.

## Findings

| # | Severity | Classification | File:line at `9708fc2` | Finding | Status |
|---|---|---|---|---|---|
| 1 | high | FAIL introduced by this work | `app.json:3`; `docs/01-state/PROJECT-STATE.md:125-127`; `docs/01-state/HANDOFF.md:187-189` | **The uncleared product name is placed in a user-visible app field.** A fresh lockfile install defines Expo's top-level `name` as the name shown in Expo Go and on a standalone app's home screen (`node_modules/@expo/config-types/build/ExpoConfig.d.ts:6-8`). The target sets that field to `noema`. The HANDOFF incorrectly omits `app.json.name` when asserting that all occurrences are internal. Building/installing the configured app therefore exposes the prohibited name. | open |
| 2 | medium | FAIL introduced by this work | `docs/02-roles/OPERATIONS.md:6-8,21-24,32-35`; `package.json:7-15`; `docs/01-state/HANDOFF.md:216-218` | **The operational source of truth becomes false when the runnable app is added.** `OPERATIONS.md` says to fill a section when its subject first exists, but still says there is no application, `package.json`, dependency, or local environment. The new scripts make those statements false. The builder identified the issue but left it as adjacent work. This is a documentation/governance defect, not a runtime defect. | open |
| 3 | low | FAIL introduced by this work | `docs/05-quality/evidence/002a-app-skeleton/README.md:31-35`; `docs/01-state/HANDOFF.md:35-36` | **The evidence index says the branch is unpushed after the accepted amendment records it as pushed.** Fresh Git evidence resolves `refs/remotes/origin/feat/app-skeleton` exactly to the reviewed head. This does not invalidate CI's NOT RUN result because feature-branch pushes are not workflow triggers, but the evidence narrative is stale. This is an evidence-record defect only. | open |
| 4 | low | FAIL introduced by this work | `docs/05-quality/evidence/002a-app-skeleton/git-ls-files.txt:1-55` | **The committed tracked-file transcript is not a target-head listing.** It records 50 paths and omits its own final path plus `docs/05-quality/evidence/002a-app-skeleton/README.md`; fresh `git ls-tree -r --name-only 9708fc2` returns 52 paths. The underlying requirement still passes: the two omitted paths are evidence files, `package-lock.json` is tracked, and no generated or machine-local path is tracked. This is an evidence-record defect only. | open |

Finding 1 is verdict-driving by itself. Findings 2-4 are separately recorded so
product scope, governance documentation, and evidence-record accuracy are not
conflated.

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact target, base, and commit count | PASS | Both full SHAs resolve; `git rev-list --parents` shows `9708fc2` → `05a92a8` → `ed0340d`; `git diff --check` passed. |
| Supabase scope | PASS | No changed non-document path or direct dependency contains Supabase configuration or code. No Supabase command or query was run. |
| Keys, secrets, and real `.env` values | PASS | Target-tree path scan finds no tracked `.env`, key, certificate, or common provider-secret assignment; changed direct dependencies contain no provider SDK. The committed [tracked-file artifact](../05-quality/evidence/002a-app-skeleton/git-ls-files.txt) is supplemented by a fresh target-tree scan because of finding 4. |
| EAS, Vercel, RevenueCat, Sentry, and PostHog configuration | PASS | No matching configuration path or direct dependency exists in the target tree. `.gitignore` mentioning `.easignore` is an ignore rule, not service configuration. |
| Deployment code/configuration in the delta | PASS | No deployment workflow, command, configuration, or target was added. |
| Whether any external deploy occurred | NOT RUN | Repository-only review cannot prove non-occurrence; no environment exists and querying or deploying externally was outside this review. |
| Outward-facing use of `Noema` | FAIL introduced by this work | Finding 1. `app.json:3` is Expo's user-visible app name field. |
| Lockfile tracked and installable | PASS | `package-lock.json` is in the target tree; clean `npm ci` installed 1,085 packages and exited 0. |
| No generated or machine-local file tracked | PASS | Fresh target-tree scan returned 52 paths and none under `node_modules/`, `dist/`, `.expo/`, or `coverage/`, and no `.env`; see finding 4 for the stale count in the committed artifact. |
| TypeScript strict gate | PASS | Fresh `npm run typecheck` exited 0, matching [typecheck.txt](../05-quality/evidence/002a-app-skeleton/typecheck.txt); `tsconfig.json:4` sets `strict: true`. |
| ESLint gate | PASS | Fresh `npm run lint` exited 0, matching [lint.txt](../05-quality/evidence/002a-app-skeleton/lint.txt). |
| Lint coverage is non-vacuous | PASS | Fresh capture listed the same five files with zero errors/warnings as [lint-file-list.txt](../05-quality/evidence/002a-app-skeleton/lint-file-list.txt). |
| Test gate | PASS | Fresh `npm test -- --ci` passed one suite and one test, matching [test.txt](../05-quality/evidence/002a-app-skeleton/test.txt) semantically; only durations differed. |
| Format gate | PASS | Fresh `npm run format:check` reported all matched files formatted, matching [prettier-check.txt](../05-quality/evidence/002a-app-skeleton/prettier-check.txt). |
| Negative controls | PASS | Fresh committed script results were typecheck injected 2, lint injected 1, test injected 1; every clean run was 0, matching [gate-negative-control.txt](../05-quality/evidence/002a-app-skeleton/gate-negative-control.txt). Temporary faults were removed. |
| Expo dependency compatibility | PASS | Network-enabled fresh capture returned 21/21 checks, matching [expo-doctor.txt](../05-quality/evidence/002a-app-skeleton/expo-doctor.txt). |
| iOS, Android, and web export | PASS | Fresh clean-cache export produced one bundle for each target and three static routes, matching [expo-export.txt](../05-quality/evidence/002a-app-skeleton/expo-export.txt) semantically. |
| `npm audit` | FAIL pre-existing | Fresh capture reproduced 22 advisories (7 moderate, 15 high), matching [npm-audit.txt](../05-quality/evidence/002a-app-skeleton/npm-audit.txt). Controller-accepted; not a review finding. |
| CI workflow definition | PASS | `.github/workflows/ci.yml:3-6,29-44` triggers on every `pull_request` and push to `main`, then runs install → typecheck → lint → test → format:check in order. |
| GitHub Actions execution and Node 24 behavior | NOT RUN | Accepted: no PR or push-to-main event has occurred; first execution is expected when the PR opens. Local reproduction used Node 26. |
| Unit A Active-work state edit | PASS | `PROJECT-STATE.md` numstat is 1 insertion/1 deletion, solely the Unit A row. |
| HANDOFF append-only preservation | PASS | Full delta numstat is 220 insertions/0 deletions. The original Unit A block hashes identically at `05a92a8` and `9708fc2`: sha256 `2ab481c12ea38186c5a00ef1ea47c9dead1f6e14ec5feb3e28bb48aabebca28a`; the amendment remains above it. |
| `feat/app-skeleton` LOCK-only edit | PASS | Zero-context diff changes only this LOCK's `BUILD` → `REVIEW`, dispatch/evidence lines, and its opening/closing/amendment notes; no other LOCK block changes. |
| Device, simulator, or browser rendering | NOT RUN | No runtime target was available; the three-platform export passed, but rendering was not claimed as proven. |

## Standards

Hard violations: finding 1 breaks the recorded outward-facing naming
restriction; finding 2 leaves the operational source of truth false after the
app first becomes runnable; findings 3 and 4 leave target-inaccurate evidence.

Judgment-call smell, not verdict-driving: the CI job display name
`typecheck, lint, test` at `.github/workflows/ci.yml:17` no longer names the
format gate added at lines 41-44 (possible Mysterious Name). Tooling does not
enforce this label.

## Spec

Finding 1 violates the explicit requirement that the delta contain no
outward-facing use of `Noema`. Finding 3 violates evidence-record accuracy but
does not change the accepted CI NOT RUN classification. All other directed
scope, CI-definition, state-boundary, and fresh-reproduction checks pass or are
classified NOT RUN above.

Standards: 4 hard findings and 1 judgment-call observation; worst is the high
user-visible naming violation. Spec: 2 findings; worst is the same high naming
violation.

## Controller-accepted deviations

Not findings: the 22 Expo-tooling audit advisories, the three retained optional
navigation dependencies, local Node 26 versus CI Node 24, CI itself NOT RUN,
the controller-added format gate, the HANDOFF amendment block, and the evidence
README claim-10 update from four to five steps.

## Carried items

None added by this review. Open findings remain on `feat/app-skeleton` for the
same builder's fix loop; the reviewer did not fix them.
