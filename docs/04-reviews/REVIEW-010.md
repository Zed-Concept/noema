# REVIEW-010: REVIEW-009 fix-cycle re-review

**Date:** 2026-08-19
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Target:** `feat/supabase-wiring` at
`acfd53f0b85c7d80c5f721a49a8635a9aa621a5f`, delta from
`8847ca6b770d70c0bf6c46dc83244da8ebd23ad7`
**Verdict:** PASS

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed only the supplied fix-cycle-2 commit
`8847ca6b770d70c0bf6c46dc83244da8ebd23ad7...acfd53f0b85c7d80c5f721a49a8635a9aa621a5f`
against REVIEW-009's single finding and the controller authorization restated
in the review dispatch. After a fresh fetch, the clean checked-out branch,
local branch ref, remote-tracking ref, and `FETCH_HEAD` all resolved to the
exact target. Its sole parent and merge-base are the supplied base, and the
range contains one non-empty commit. Both `git diff --check` and
`git show --check` passed.

The exact delta contains six files: the probe producer and transcript, the
003a claim ledger, and the three authorized state records. The expected
seventh path, `stability.txt`, has the same Git blob at base and target because
the fresh green transcript is byte-identical; Git correctly records no hunk.

In a disposable scratch repository I reran the probe pair with the negation
present and removed. In a separate plain-path disposable clone pinned to the
actual target commit, I ran the committed, byte-unmodified 003a stability gate.
I also independently checked artifact blobs and counts, the index-based secret
scan, incident residue, append-only/state boundaries, excluded paths, and live
GitHub PR/workflow-run counts.

No staging credential was provided or used. I did not query staging or
production Supabase, run authenticated type generation, regenerate live
connectivity evidence, modify product/evidence/state content, open a PR,
merge, deploy, or push. This review writes only this immutable record and one
new top-of-file HANDOFF block.

Review methods: fixed-range Standards/Spec review, Noema governance review,
and Supabase evidence-boundary verification. Subagent fan-out: three read-only
lanes — Standards, specification, and governance/evidence boundaries. No
subagent edited the repository.

## Findings

No new findings.

| Prior finding | Severity | Reviewer evidence | Status |
|---|---|---|---|
| REVIEW-009 #1 — the committed tracked-path negative probe omitted `--no-index` and was therefore vacuous | low | [`capture.sh`](../05-quality/evidence/003a-supabase-wiring/capture.sh) lines 128-143 now run a plain pattern-evaluating probe and a verbose source probe. The committed [`gates.txt`](../05-quality/evidence/003a-supabase-wiring/gates.txt) lines 53-67 records plain exit 1 and `.gitignore:26:!.env.example` with verbose exit 0. The independent four-way scratch control produced the same results with the negation present; removing it made the plain form print `.env.example` and exit 0 and made the verbose form name `.env*`. | **fixed; finding cleared** |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact target and range | PASS | Freshly fetched local/remote refs and `FETCH_HEAD` were `acfd53f0`; its sole parent and merge-base were `8847ca6b`; the range contains exactly one commit. |
| Probe semantics at target | PASS | Plain `git check-ignore --no-index .env.example` produced no output and process exit 1. Verbose `--no-index -v` produced `.gitignore:26:!.env.example` and exit 0, matching the committed transcript. |
| Negation counterfactual | PASS — authorized session testimony, independently reproduced | In a disposable scratch repo, negation present gave plain 1 / verbose 0 naming `!.env.example`; negation removed gave plain 0 printing the path / verbose 0 naming `.env*`. This establishes that the plain exit discriminates and the verbose output identifies its source. |
| Exact 003a stability gate | PASS | The unmodified committed `stability.sh` ran in `/private/tmp/noema-review010-gate`, a clean plain-path clone at the exact target. Five gated artifacts × two runs were all identical, differing count 0, encoded exit 0, process exit 0. The freshly written transcript was clean against the target and had SHA-256 `758d3f7f83cade576b8c23d1c2490b65f5c9f3d2226165b4f6c43ab515a1f12b`. |
| Six-file versus expected seven-file resolution | PASS | `stability.txt` is base/head blob `b051b85b00d5e428cfa639bb380b9dbe6a8a1dbd`; the exact-head rerun reproduced those bytes. No manufactured hunk was warranted. `stability.sh` itself remains blob `6db7130b32e908a2df7718d33496dc94f238b54d`. |
| Probe-delta confinement | PASS | `capture.sh` has one hunk, confined to replacing the flawed probe with the two `--no-index` forms and explanatory transcript text. `gates.txt` has the one corresponding transcript hunk. No other producer or transcript section changed. |
| Other gated and protected artifacts | PASS | Only `README.md`, `capture.sh`, and `gates.txt` differ under 003a. Fresh gate copies of `deps.txt`, `types-plumbing.txt`, `redaction-control.txt`, and `secret-scan.txt` all matched twice. Base/head blobs are unchanged, including `deps.txt` `d7e78d05`, `connectivity.txt` `0d71be34`, and the four other gated artifacts. |
| Evidence inventory | PASS | Exact target tree: five `.sh`, eleven `.txt`, one README; counts are unchanged from the base. |
| Environmental incident and committed residue | PASS with disclosed methodology observation | The HANDOFF records the three failing full-tree installs and exits, watcher diagnosis, four transiently rewritten artifacts and restoration, external npx-cache residue, both clone paths/results, and all four adjacent findings. No module-not-found, bogus-package, npm `ENOTEMPTY`, or other broken-run output remains in 003a evidence; the incident terms occur only in the required disclosure. The exact-head gate and clean blob comparisons independently confirm restoration. |
| Builder clone method | Observation — not verdict-driving | The builder precisely discloses `8847ca6` plus three evidence-file overlays. Calling that clone the “exact head” is not literal because the final commit also changes three state files, and `capture.sh` reads the whole tree/index. That historical run alone was therefore not sufficient exact-head proof. The required reviewer run used the actual `acfd53f` commit and reproduced every committed gated byte, closing the provenance gap. |
| Path-mask amendment | PASS disclosure / repair accepted and backlogged | [`README.md`](../05-quality/evidence/003a-supabase-wiring/README.md) lines 27-33 adds one complete sentence naming the `$PWD` mask, npm 11 redaction mechanism, UUID-shaped-path condition, failure effect, and plain-path requirement. The mask repair was expressly excluded. This sensitivity makes the gate red, not falsely green. |
| Secret scan at target | PASS | Both exact-head captures regenerated the committed four-pattern, positive-controlled scan byte-for-byte. Four direct checks against the target index independently returned no matching files. |
| State and immutable boundaries | PASS | `PROJECT-STATE.md` changes only the Unit B Active-work row. `BRANCH-NOTES.md` changes only the Unit B REVIEW status restatement and additive fix-cycle note. `HANDOFF.md` is a 187-line top prepend and the prior suffix is byte-identical. The LOCK remains REVIEW. REVIEW-009, all prior reviews/decisions, schema/migrations, auth/RLS, payments, product source, packages/lockfile, CI, connectivity, and other excluded paths are untouched. |
| Delta whitespace | PASS | Exact two-dot `git diff --check` and `git show --check acfd53f0` returned 0 without diagnostics. |
| Branch CI | NOT RUN | Fresh GitHub queries found zero PRs and zero workflow runs for `feat/supabase-wiring`. |
| Staging connectivity | NOT RUN | No staging credentials were handed to this fix cycle or review; the unchanged committed transcript remains the evidence boundary. |
| Authenticated type generation | NOT RUN | Owner-executed by design; this review had no access token and did not invoke it. |

## Adjacent-finding adjudications

| Builder item | Ruling | Reason |
|---|---|---|
| 1. `capture.sh` can exit 0 despite nonzero CI-step codes | **accepted and backlogged; not verdict-driving** | Confirmed in the producer; the same process-level coarseness also covers Prettier. Every step's code is nevertheless recorded in `gates.txt`, and any nonzero code changes the committed bytes, so the exact stability comparison fails. Direct `capture.sh` status remains misleading and should be hardened in a separately authorized gate unit. |
| 2. Redaction control accepts any exit 1 with zero raw values | **accepted and backlogged; not verdict-driving** | Confirmed. Its predicate alone can accept module-not-found, but the gated transcript includes the intended redacted error text; the exact byte comparison distinguishes the unrelated failure. Strengthening the semantic oracle is separate gate work. |
| 3. Fail-loudly probes accept any import rejection | **accepted and backlogged; not verdict-driving** | Confirmed. The current committed error text and byte gate distinguish configuration rejection from module-not-found, while the direct probe predicate remains coarse. Strengthening it is separate gate work. |
| 4. `deps.txt` path-mask sensitivity | **accepted and backlogged; not verdict-driving** | The required one-sentence disclosure is sufficient, the defect fails red on affected paths, and the dispatch explicitly prohibited repairing the mask in this cycle. |

## Standards

No verdict-driving standards finding. The producer/transcript/claim-ledger and
state changes move together because the repository's evidence and append-only
governance protocol requires them; this is not actionable shotgun surgery.
The counterfactual is testimony by explicit dispatch authorization and was
independently reproduced. The HANDOFF's `—` artifact cell for its final-tree
Prettier check is imprecise, but the actual exact-head gate regenerated the
committed `gates.txt` containing Prettier exit 0, so no unsupported PASS remains.

## Spec

No specification finding. The REVIEW-009 evidence defect is cleared; the
probe pair has the required Git semantics; the counterfactual discriminates;
the stability transcript is deterministic at the exact head; the six-file
resolution is correct; incident/state/exclusion disclosures are complete; and
all four adjacent items are explicitly adjudicated above without unauthorized
repair.

Standards: 0 findings. Spec: 0 findings.

## Carried items

The four accepted/backlogged adjacent items above do not block this fix-cycle
verdict. The builder's pre-commit overlay is retained as disclosed historical
testimony, not treated as exact-head proof. The accepted 22 audit advisories,
Unit A gate staleness, pre-existing OPERATIONS staging contradictions, live
connectivity NOT RUN, authenticated type generation NOT RUN, and CI NOT RUN
remain settled and were not re-litigated.
