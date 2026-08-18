# REVIEW-005: REVIEW-004 fix-loop re-review

**Date:** 2026-08-18
**Reviewer:** Codex (reviewer of record)
**Target:** `feat/app-skeleton` at
`9178280f65fdf3709c81756dee697c5ba2725420`, delta from
`52061c95b660b5efc39d558da04563da9a6e0aaf`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed only the two supplied fix-loop/attestation commits
`52061c9...9178280`. Both full SHAs resolve, the supplied base is the
merge-base, the range is linear and non-empty, and the checked-out branch and
`origin/feat/app-skeleton` both resolved to the exact target before review.
Matters settled in REVIEW-004 and earlier were not reopened.

I used a disposable detached worktree at the target, ran a fresh `npm ci`, then
ran typecheck, lint, test and format:check. I reran the committed stability
script unchanged with npm-network and localhost access; it regenerated from a
fresh export and returned the expected 11 gated artifacts, zero differing and
four run-varying artifacts with their fields named. A sandboxed attempt that
could not bind the Expo server was excluded as an environmental failure.

I also ran a bounded negative probe in the disposable worktree: generator calls
were temporarily replaced with a no-op and one gated working-copy artifact was
given a marker. The script reported `DIFFERS`, printed `--- exit code: 1 ---`,
then itself exited 0. The probe files were restored and the disposable tree was
clean afterward.

This was a repository-only review. I did not query Supabase or a deployment,
fix reviewed work, merge, or open a PR. The review changes only this immutable
record and the required HANDOFF append.

Controller rulings applied without findings: all prior accepted deviations;
Metro's run-varying export transcript, module counts and web bundle hash; the
`index` chrome backlog item; the disclosed dev-server kill; and device-target
rendering remaining NOT RUN.

## Findings

| # | Severity | Classification | File:line at `9178280` | Finding | Status |
|---|---|---|---|---|---|
| 1 | medium | FAIL introduced by this work | `docs/05-quality/evidence/002c-fix-loop-2/stability.sh:72-103` | **The stability gate is false-green when an artifact differs.** It counts differences and writes an encoded exit-code line, but after restoring artifacts its final command is `cat "$OUT"`; it never exits with `fails`. The bounded negative probe produced one `DIFFERS` and printed exit code 1 while the shell process returned 0. This contradicts the script's own “Any difference is a failure” contract and weakens the new validation boundary. | open; verdict-driving |
| 2 | medium | FAIL introduced by this work | `docs/02-roles/OPERATIONS.md:64-70`; `docs/05-quality/evidence/002b-fix-loop/environment.txt:1-7`; `docs/05-quality/evidence/002b-fix-loop/capture.sh:28-155` | **REVIEW-004 finding 2 remains partial for install.** OPERATIONS marks “`npm ci` installs the committed lockfile” PASS but cites `environment.txt` and neighboring gate transcripts. `environment.txt` only queries versions, and the capture/gate scripts require dependencies to be installed before they run; none of the cited artifacts records `npm ci`. The owner attestation mentions an install, but this row does not cite it. The other three PASS rows and the NOT RUN row match their artifacts. | open; verdict-driving |
| 3 | medium | FAIL introduced by this work | `docs/01-state/PROJECT-STATE.md:73`; `docs/05-quality/evidence/002c-fix-loop-2/stability.txt:16-22` | **Authoritative state is stale.** The Unit A Active-work row says ten gated artifacts and three run-varying artifacts. The final evidence, HANDOFF and BRANCH-NOTES all say eleven and four. Commit `9178280` amended this same state row for the owner smoke result without carrying the new counts across, so the dispatched state-file-discipline check fails. | open; verdict-driving |
| 4 | low | FAIL introduced by this work | `docs/05-quality/evidence/002b-fix-loop/capture.sh:13-15,49-59`; `docs/05-quality/evidence/002c-fix-loop-2/README.md:47-48`; `docs/05-quality/evidence/002c-fix-loop-2/dev-server.sh:9-11,69-79` | **The corrections are explicit and substantively correct, but current explanatory source retains false/stale prose.** The capture script says module counts pass through unchanged although its normalizer masks them; the final-head README still says there are three run-varying artifacts although there are four; and the new dev-server source says its earlier version made the two page-description errors although Git history places those errors in surrounding prose and shows the prior script's served-markup claims were accurate. | open |
| 5 | low | FAIL introduced by this work | `docs/05-quality/evidence/002b-fix-loop/export-summary.txt:6`; `docs/05-quality/evidence/002b-fix-loop/capture.sh:149` | **The reviewed delta fails `git diff --check`.** The route-files line ends in a generated trailing space because the producer maps every newline, including the last one, to a space. This is generator-produced rather than a hand edit, but it remains a committed whitespace defect. | open |

Findings 1-3 independently prevent PASS. Findings 4-5 are evidence-record
defects, not product defects.

## REVIEW-004 finding status

| Prior finding | Classification | Reviewer evidence | Status |
|---|---|---|---|
| 1 — byte-stable regeneration | PASS at this head, with a new enforcement defect | The unchanged committed script regenerated 11 gated artifacts byte-for-byte with zero differences. Four excluded artifacts name their varying fields. Finding 1 above is about the gate returning success when that comparison fails, not about this head's matching bytes. | fixed for current bytes; new finding 1 open |
| 2 — unsupported runtime claims | FAIL introduced by this work | Export, HTTP 200, browser rendering and device NOT RUN are accurately classified and linked. The install PASS is not backed by the artifact OPERATIONS cites, as finding 2 describes. | open |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact target and range | PASS | Target and origin were `9178280`; merge-base with the supplied base was exactly `52061c9`; the range contains only `68c14d1` and `9178280`. |
| Fresh lockfile install | PASS (reviewer run) | `npm ci` added 1,085 packages and exited 0 in the detached worktree. See finding 2 for the missing committed artifact link. |
| Five local CI gates | PASS | Fresh `npm ci`, typecheck, lint, Jest with 1/1 test, and format:check each exited 0. |
| Current-head byte reproduction | PASS | Unchanged `stability.sh` reported 11 gated, 0 differing, and exited 0. |
| Stability negative probe | FAIL introduced by this work | One injected gated difference produced `DIFFERS` and an encoded exit code 1, but the script process exited 0. Finding 1. |
| Run-varying classification | PASS | Four are named with fields: environment (Node/npm/OS), Expo Doctor (resolved build/check count), npm audit (upstream advisory database), and Expo export (web hash/concurrent log order). |
| Normalization in generators | PASS with finding 4 | Fresh generation reproduced every gated byte; output changes are produced by committed scripts, so no hand-only output delta is required. One normalization comment and two provenance/count statements remain false or stale. |
| Three-platform export summary | PASS | The permitted full rerun rebuilt `dist/`; gated `export-summary.txt` reproduced one iOS, Android and web bundle, three named routes and export exit 0. |
| Expo compatibility | PASS | The permitted rerun returned 21/21 Expo Doctor checks. |
| Dev server HTTP 200 | PASS | Fresh `dev-server.sh` reproduction was byte-identical to the committed artifact, including HTTP 200 and the placeholder/header checks. |
| Owner attestation form | PASS | `attestation.md` names Ahmed, 2026-08-18, exact tested SHA `68c14d1`, web/Chrome/macOS, and PASS. The target's later commit changes documentation/evidence only, not the tested application tree. |
| Browser rendering | PASS | The owner attests that the placeholder rendered with no error overlay and clean hydration. This human act was checked for form, not regenerated. |
| Simulator/emulator/device rendering | NOT RUN | Explicitly accepted for this unit; not a finding. |
| Title/header corrections | PASS with finding 4 | The new attestation, owner-smoke README and HANDOFF explicitly identify and supersede both wrong descriptions; prior history is preserved. Current dev-server prose misattributes where those errors previously lived. |
| Web bundle-hash correction | PASS | The correction is explicit rather than silently dropped; `expo-export.txt` is classified run-varying and the replacement `export-summary.txt` is gated and reproduced. |
| HANDOFF preservation | PASS | Reviewed delta is 243 insertions and 0 deletions; both new blocks are prepended above every prior block. |
| BRANCH-NOTES preservation | PASS | Reviewed delta is 98 insertions and 0 deletions inside the Unit A LOCK; status remains `REVIEW`. |
| PROJECT-STATE boundary | FAIL introduced by this work | Only the Active-work row changed, but its 10/3 counts contradict final 11/4 evidence. Finding 3. |
| Immutable paths | PASS | The reviewed builder delta changes no file under `docs/03-decisions/` or `docs/04-reviews/`. |
| Delta whitespace | FAIL introduced by this work | `git diff --check 52061c9...9178280` exits 2. Finding 5. |
| CI execution | NOT RUN | No PR was opened; controller-accepted and unchanged. |

## Standards

Five hard standards findings: the false-green evidence gate, unsupported install
PASS, stale authoritative state, contradictory correction source, and failing
whitespace check. One non-verdict judgment call is a possible Mysterious Name:
`stability.sh` uses `A` and `B` for evidence directories. No other baseline
smell is reported; repeated correction prose is required by immutable history.

## Spec

Two dispatched requirements are missing or partial: an artifact-backed install
PASS and final 11/4 authoritative state. Current-head stability, all five fresh
gates, export-summary reproduction, the explicit web-hash correction, HTTP 200,
attestation form, browser PASS and device-target NOT RUN all match the dispatch.
The false-green behavior is a decisive new standards defect in the validator,
not a failure of the dispatched current-head 11/0 reproduction. No scope creep
or accepted ruling was reopened.

## Carried items

CI and simulator/emulator/device rendering remain NOT RUN. The 22 accepted audit
advisories, retained navigation dependencies, Node skew, name/scheme ruling,
`index` route-name backlog item and owner-server kill remain accepted or
deferred, not findings.

Standards: 5 hard findings and 1 judgment call; worst is the medium false-green gate. Spec: 2 missing/partial requirements; worst is the medium unsupported install PASS/stale authoritative state.
