# REVIEW-009: REVIEW-008 fix-cycle re-review

**Date:** 2026-08-19
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Target:** `feat/supabase-wiring` at
`c2210068da0a8c8ff5b6ab838b2fbcc09c32f9e2`, delta from
`b14b925283082193a9cb6ff9a8b00cbf7528e59b`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed the supplied single-commit fix delta
`b14b925283082193a9cb6ff9a8b00cbf7528e59b...c2210068da0a8c8ff5b6ab838b2fbcc09c32f9e2`
against the five REVIEW-008 findings and the three controller adjudications
restated in the review dispatch. The clean checked-out branch, local branch
ref, and freshly fetched `origin/feat/supabase-wiring` all resolved to the exact
target. Its sole parent and merge-base are the supplied base; the range contains
one non-empty commit; `git diff --check` and `git show --check` passed.

In a detached disposable exact-head clone, under the reviewer's native
`C.UTF-8` locale, I ran the exact 003a stability gate, an independent pinned
dependency producer, and a deliberately broken secret-scan positive control.
Separately I reran the missing-variable, ignore, generated-types, redaction,
connectivity-exit, registry, secret, inventory, state-boundary, and excluded-path
checks. Disposable mutations were restored byte-for-byte; the disposable and
primary checkouts and indexes were clean afterward.

No staging credential was provided or used. I did not query Supabase, run
authenticated type generation, regenerate `connectivity.txt`, modify reviewed
product or evidence files, open a PR, merge, deploy, or push. This review writes
only this immutable record and one new HANDOFF block.

## Finding

| # | Severity | Classification | File:line at `c221006` | Finding | Status |
|---|---|---|---|---|---|
| 1 | low | FAIL introduced by this work | `.gitignore:25-26`; `AGENTS.md:92-96`; `docs/05-quality/evidence/003a-supabase-wiring/capture.sh:124-136`; `docs/05-quality/evidence/003a-supabase-wiring/gates.txt:45-60`; `docs/05-quality/evidence/003a-supabase-wiring/README.md:42,62`; `docs/01-state/HANDOFF.md:45-49` | **The committed `.env.example` negative probe is vacuous because it omits `--no-index`.** `capture.sh` runs `git check-ignore .env.example`, but that path is already tracked; default `git check-ignore` does not report tracked paths, so exit 1 would occur even if `.env*` still ignored the file and no negation existed. A correct fresh `git check-ignore --no-index .env.example` returned 1, and the verbose form identified `.gitignore:26:!.env.example`, so the implementation is correct. The defect is the required committed proof: `gates.txt` does not demonstrate the negative side, contrary to the README and HANDOFF claims and AGENTS.md's artifact rule. | open; verdict-driving |

The fix cycle had to clear all five prior findings. Correct current behavior does
not replace the required committed artifact, the same distinction applied to
REVIEW-008 finding 4. This one open evidence defect therefore prevents PASS.

## REVIEW-008 finding disposition

| Prior finding | Prior severity | Reviewer evidence | Status |
|---|---|---|---|
| F1 — locale-variant `deps.txt` broke stability | medium | Exact unchanged gate under native `C.UTF-8`: five artifacts, two runs each, all ten comparisons identical, zero differing, process exit 0. Independent pinned producer matched committed `deps.txt`; both SHA-256 `dfe44342df00494e0fe9c718f2bb2150b586ef17d4665d442c9d9cbecc62973a`. | cleared |
| F2 — OPERATIONS false-existence lines | medium | The only OPERATIONS hunk replaces the Unit B false-existence text with accurate local-run instructions. `TODO(owner)` rows and the pre-existing staging contradictions are byte-untouched. | cleared |
| F3 — literal `.env*` boundary and two-sided proof | medium | `.gitignore` now correctly uses `.env*` with sole negation `!.env.example`; `.env`, `.envrc`, `.envfoo`, and `.env.nonconventional-suffix` are ignored, and the proper `--no-index` negative passes. The committed negative control itself is invalid; finding 1. | **not cleared: behavior fixed, evidence open** |
| F4 — three PASS claims lacked committed coverage | low | All three missing-variable cases are committed in `gates.txt`; `types-plumbing.txt` proves the reachable executable, syntax, pre-CLI missing-ref refusal, exact pin, generic import, and typecheck; `redaction-control.txt` records exit 1 and zero raw synthetic values. The reclassifications distinguish plumbing PASS from authenticated generation NOT RUN. | cleared |
| F5 — evidence inventory count | low | Exact head tree: five `.sh`, eleven `.txt`, one README. The prior block is preserved; the correction is in the new builder HANDOFF and evidence README. | cleared |

## Controller adjudications

| Adjudication | Classification | Reviewer evidence |
|---|---|---|
| Pin generated-types CLI exact in script and README | PASS | `scripts/gen-types.sh:20` and the repository/evidence READMEs pin `supabase@2.115.0`. The [official npm manifest](https://registry.npmjs.org/supabase/2.115.0) reports that exact published version, tarball, and integrity; registry dist-tags reported `latest: 2.115.0` at review time. The authenticated command remains correctly NOT RUN. |
| Propagate connectivity child exit without regenerating committed connectivity | PASS | A credential-free missing-env child returned 2; `connectivity.sh` returned 2 and encoded 2 in a disposable transcript. `connectivity.txt` is absent from the delta and has identical base/head Git blob `0d71be34da7988e1522e0d85f9af93d9307f4398`. `deps.txt` is likewise absent and retains blob `d7e78d05acbe02b5318b49ac1ca4e096757c4d8b`. |
| `capture.sh` fails closed on a secret match or broken control | PASS | One disposable positive-control sample was deliberately broken. `capture.sh` returned 1 with `FAIL CLOSED` and one violation; the transcript showed that control `no`, the other three `yes`, and zero matching files. It exited before `npm-audit.txt`, then the mutation was removed and both worktree and index matched the exact head. |

## Directed verification

| Check | Classification | Reviewer evidence |
|---|---|---|
| Exact stability gate | PASS | Exact script, native caller locale `C.UTF-8`: five gated artifacts × two runs, zero differing, encoded and process exit 0. The internal `LC_ALL=C LANG=C` pin made the caller locale immaterial and is recorded in the fresh environment transcript. |
| `capture.sh` delta composition | PASS scope; dispatch shorthand not literal | Numstat is exactly +135/-10. The hunks comprise F1 locale pin/recording, F3 ignore probes, F4 single-missing/types/redaction producers, and the adjudicated redaction/secret fail-closed machinery. Therefore “locale pin plus fail-closed machinery and nothing else” is not literally exclusive: authorized F3/F4 evidence code is also present. No unrelated behavior or scope creep was found. |
| F4 missing-variable behavior | PASS | Fresh neither-set, URL-only, and key-only imports all returned the intended configuration error; the committed `gates.txt` records all three. |
| Generated-types plumbing | PASS plumbing / NOT RUN generation | Script mode is 100755; `bash -n` returned 0; missing project ref returned 1 before CLI invocation; the exact pin is present; placeholder import/generic checks pass; `npx tsc --noEmit` returned 0. Authenticated generation needs owner-held access and was not run. |
| Malformed-URL redaction | PASS | Fresh control returned 1 and retained zero raw URL/key values. The committed transcript regenerated through the green stability gate; capture's general fail-closed enforcement was independently proven with the broken secret-scan control. |
| Literal environment ignore behavior | PASS behavior / FAIL committed negative evidence | Positive `--no-index` probes returned ignored for `.env`, `.envrc`, `.envfoo`, and `.env.nonconventional-suffix`; the proper negative returned 1 and verbose output named `!.env.example`. Finding 1 applies to the committed producer. |
| Secret scan | PASS | The committed scan regenerated byte-for-byte: four patterns, zero files, every positive control `yes`. An independent all-byte scan over 112 tracked blobs / 1,026,831 bytes found no Supabase key/host shape, inline access token, JWT, GitHub PAT, AWS key ID, private-key header, credentialed Postgres URI, Anthropic key, or Sentry DSN. |
| Local five-step gate | PASS | Both fresh captures record `npm ci`, typecheck, lint, one Jest suite/test, and Prettier exit 0; `gates.txt` matched committed bytes twice. |
| Branch CI | NOT RUN | Fresh GitHub queries found zero PRs and zero workflow runs for `feat/supabase-wiring`; the workflow file is unchanged. |
| Evidence inventory | PASS | Exact Git tree count is 5 `.sh`, 11 `.txt`, and 1 README; no other 003a file exists. |
| Builder LOCK amendments | PASS | Changes stay inside the Unit B block: one Max/fresh-session continuation, a REVIEW status restatement, and an additive fix-loop closing note. The status is not MERGED; all other LOCK blocks are unchanged. |
| Builder ruling-6 disclosure | PASS as testimony | The committed HANDOFF says workflows 0 and fan-out none. Git cannot prove session testimony. The dispatch additionally supplies a harness-keyword false-positive note, but no such note exists in the committed delta; this discrepancy does not defeat the two fields ruling 6 requires. |
| State and HANDOFF boundaries | PASS | PROJECT-STATE changes only the Unit B Active-work row. Builder HANDOFF is +111/-0 at the top, preserving every prior byte. BRANCH-NOTES is confined to its Unit B block. |
| Immutable and excluded scope | PASS | No prior review/decision, schema, migration, auth/RLS, payment, production, provider-key, CI, `app.json`, product source, package manifest, lockfile, or user-visible product path changed. `connectivity.txt` and `deps.txt` are unchanged. |
| Delta whitespace | PASS | Two-dot `git diff --check` and `git show --check c221006` returned 0 with no diagnostics. |

## Standards

No production-code standards finding. The locale pin is explicit, the new
controls are focused, the exact CLI pin follows [Supabase's npm security
guidance](https://supabase.com/docs/guides/security/npm-security), and the
fail-closed branches return real nonzero process status. Repetition in the
evidence producer is justified by immutable, human-readable transcripts.

The sole evidence-standard finding is the tracked-file negative probe above.
Its current result is true by coincidence with index suppression, not because
the command exercises the negation it claims to test.

## Spec

F1, F2, F4, F5, all three controller adjudications, the counts, state/LOCK
boundaries, and excluded paths meet the restated fix-cycle scope. F3's source
behavior meets the requirement, but its required two-sided committed probe does
not. No remediation is performed in this review.

Standards: 1 low evidence finding. Spec: 1 incomplete proof; worst severity low.

## Carried items

The accepted 22 audit advisories, Unit A gate staleness, CI NOT RUN, live
connectivity not rerun, authenticated type generation NOT RUN, and the
pre-existing OPERATIONS staging contradictions remain settled. The literal
capture-delta shorthand and the dispatch-only harness false-positive note are
observations, not additional findings.
