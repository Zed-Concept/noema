# REVIEW-008: Unit B Supabase wiring

**Date:** 2026-08-19
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Target:** `feat/supabase-wiring` at
`98c4d6d71d16beea3f521aadf37caabc8edb5339`, delta from
`98f3c6ae00ccca4af732e573cac02cb3f2c926f2`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

The v1 review dispatch was stopped by the reviewer under learning 4 before any
review work, file change, verdict, or record. The controller corrected it to
authorize exactly this immutable review plus one new HANDOFF block at the top;
formal review began only after that correction.

Reviewed the full single-commit delta
`98f3c6ae00ccca4af732e573cac02cb3f2c926f2...98c4d6d71d16beea3f521aadf37caabc8edb5339`.
The checked-out branch, local branch ref, remote-tracking ref, and fetched
remote head all resolved to the exact target; its sole parent and merge-base
were the supplied base. The tree was clean and `git diff --check` passed.

In a disposable detached worktree I ran the committed 003a stability gate, the
Unit A fixed-head gate, and the Unit A fixed-base demonstration. Separately,
against the exact target, I reran the fail-loudly branches, malformed-URL and
thrown-detail redaction controls, dependency/audit checks, ignore probes, and
an all-byte credential shape scan. One sandbox-limited Unit A run added a
transient dev-server difference; the exact unchanged gate was rerun with
network/local-bind access and decisively returned the committed semantic
result: 11 gated, 3 differing, process exit 1. Generated evidence bytes were
restored from the index and the disposable tree was clean afterward.

No live Supabase check was run. I had no staging values and the dispatch makes
the committed connectivity transcript the evidence boundary. This review did
not query Supabase, change product/evidence or state content beyond the
required HANDOFF block, open a PR, deploy, merge, or push. It writes only this
record and that HANDOFF block.

## Findings

| # | Severity | Classification | File:line at `98c4d6d` | Finding | Status |
|---|---|---|---|---|---|
| 1 | medium | FAIL introduced by this work | `docs/05-quality/evidence/003a-supabase-wiring/README.md:13-24,44`; `docs/05-quality/evidence/003a-supabase-wiring/capture.sh:95-108`; `docs/05-quality/evidence/003a-supabase-wiring/stability.sh:18-40`; `docs/05-quality/evidence/003a-supabase-wiring/deps.txt:1-5` | **The dispatched byte-stability claim fails because `deps.txt` does not normalize npm's locale-dependent tree glyph.** The exact committed gate ran `capture.sh` twice: `gates.txt` and `secret-scan.txt` matched in both runs, but both fresh `deps.txt` copies used `└──` where the committed file uses `` `-- ``, so the gate reported two differing comparisons and returned process 1. Node 26.0.0, npm 11.12.1, and Darwin 24.6.0 matched the committed environment artifact. The omitted variable is locale: the review environment is `C.UTF-8`; forcing `LC_ALL=C` makes the producer slice byte-identical. The stated normalization masks only repo/package names, not this valid output form, contrary to learning 7. | open; verdict-driving |
| 2 | medium | FAIL introduced by this work | `docs/02-roles/OPERATIONS.md:3-10,34-37`; `docs/01-state/HANDOFF.md:73-76,102-122` | **The operational source of truth now says the Supabase wiring does not exist.** `OPERATIONS.md` says to fill a section when its subject first exists, yet its local-run section still says there is no backend or configuration and that Unit B does not exist. If updating that adjacent file was outside builder scope, AGENTS required reporting it; instead the HANDOFF treats leaving it untouched as compliance and reports nothing broken beyond settled items. This is a direct Unit B documentation ripple, not a runtime defect. | open; verdict-driving |
| 3 | medium | FAIL introduced by this work | `.gitignore:22-25`; `docs/05-quality/evidence/003a-supabase-wiring/gates.txt:35-46`; `docs/05-quality/evidence/003a-supabase-wiring/README.md:40`; `docs/01-state/HANDOFF.md:70-72,94` | **The explicit “`.env*` ignored” requirement and PASS claim are only partial.** The rules ignore `.env` and `.env.*`, with the intended `.env.example` exception, but do not ignore `.envrc` or `.envfoo`; fresh `git check-ignore --no-index` probes returned not ignored for both. The named evidence tests only `.env` and dot-suffix forms, so it cannot support the broader claim. The example itself is correctly tracked with exactly two blank values. | open; verdict-driving |
| 4 | low | FAIL introduced by this work | `AGENTS.md:92-96`; `docs/05-quality/evidence/003a-supabase-wiring/README.md:5,34-45`; `docs/05-quality/evidence/003a-supabase-wiring/gates.txt:30-33`; `docs/01-state/HANDOFF.md:88-97` | **Three PASS claims lack the required committed evidence coverage.** Claim 3 says either variable missing but `gates.txt` tests only both missing; claim 4 labels generated-types plumbing PASS while citing source/README rather than an artifact under `docs/05-quality/evidence/`; and the HANDOFF labels malformed-URL redaction totality PASS based only on an uncommitted workflow repro. Reviewer controls confirmed all three behaviors today, so this is an evidence-record defect, not a current code failure. | open |
| 5 | low | FAIL introduced by this work | `docs/01-state/HANDOFF.md:77-80` | **The HANDOFF inventory is factually wrong.** It says the evidence directory contains six scripts, nine transcripts, and a README. The exact target tree contains five `.sh`, nine `.txt`, and one README. | open |

Finding 1 independently prevents PASS. Findings 2 and 3 are also
verdict-driving. Findings 4 and 5 are evidence/governance accuracy defects.

## Claims-table verification

| Claim | Classification | Reviewer evidence |
|---|---|---|
| 1 — `supabase-js` dependency | PASS | Fresh `npm ls` returned 2.112.3, matching [deps.txt](../05-quality/evidence/003a-supabase-wiring/deps.txt). The manifest uses `^2.112.3`; the committed lock resolves exact 2.112.3 with integrity and exact sibling versions. The 102-line lock addition introduces only the Supabase family, Phoenix, and `iceberg-js`. |
| 2 — shared client and staging connectivity | PASS from committed evidence; live rerun NOT RUN | The source reads the two dispatched Expo variables and creates the single `createClient<Database>`; the publishable-key variable correctly implements the dispatch's anon-key-successor clarification. [connectivity.txt](../05-quality/evidence/003a-supabase-wiring/connectivity.txt) records four PASS, zero FAIL, 4/4, encoded exit 0, and internally consistent `PGRST205`/HTTP 200 results. It contains no URL, host, key, JWT, or redaction-placeholder value. No live staging inference beyond that transcript is made. |
| 3 — fail loudly when either variable is missing | PASS behavior / FAIL evidence coverage | Fresh reviewer runs for neither set, URL-only, and key-only each returned the intended configuration failure. The named [gates.txt](../05-quality/evidence/003a-supabase-wiring/gates.txt) covers only neither set; finding 4. |
| 4 — generated-types plumbing | PASS behavior / FAIL evidence coverage; live generation NOT RUN | `types:gen` reaches the executable script; the project ref is required from runtime env; the command/flags match the current official CLI; the placeholder is imported as the client's generic; README assigns authenticated generation to the owner. Missing-ref and shell-syntax checks passed. Authenticated generation was correctly not run, but no committed artifact supports the plumbing PASS; finding 4. |
| 5 — `.env` hygiene | FAIL introduced by this work | [gates.txt](../05-quality/evidence/003a-supabase-wiring/gates.txt) proves the tracked two-blank-variable example and three conventional ignored names, but not literal `.env*`; finding 3. |
| 6 — five local CI steps | PASS | Two fresh captures inside the exact stability run reproduced [gates.txt](../05-quality/evidence/003a-supabase-wiring/gates.txt): install, typecheck, lint, Jest (1 suite/1 test), and Prettier all encoded exit 0. |
| 7 — branch CI | NOT RUN | Fresh GitHub queries returned no PR and no workflow run for `feat/supabase-wiring`; the workflow file is unchanged. |
| 8 — no credential shape in the index | PASS | The exact four-pattern scan and every assembled positive control reproduced [secret-scan.txt](../05-quality/evidence/003a-supabase-wiring/secret-scan.txt) byte-for-byte. An independent `git grep -a` over 109 tracked blobs / 980,941 bytes plus extended provider/JWT/PAT/URI/PEM patterns found zero credential-shaped bytes. |
| 9 — gated artifacts regenerate byte-for-byte | FAIL introduced by this work | Fresh exact-gate process exit 1; both `deps.txt` comparisons differ. The committed [stability.txt](../05-quality/evidence/003a-supabase-wiring/stability.txt) is disproven by finding 1. |
| 10 — Unit A gate at this head | FAIL as disclosed; attribution confirmed | The decisive unchanged rerun reproduced [unit-a-gate-at-head.txt](../05-quality/evidence/003a-supabase-wiring/unit-a-gate-at-head.txt): 3/11 differ, process 1. The fixed-base producers reproduced the two historical differences in [unit-a-gate-at-base.txt](../05-quality/evidence/003a-supabase-wiring/unit-a-gate-at-base.txt); the third is exactly the three new lintable files, all clean. No Unit A evidence was repaired. |

## Directed checks

| Check | Classification | Reviewer evidence |
|---|---|---|
| Secret hygiene and redaction | PASS with finding 4 | No tracked credential shape was found. Synthetic malformed-URL and thrown-network-detail controls returned process 1 with zero raw URL/host/key occurrences; URL/host/key placeholders appeared where applicable. The implementation is total today, but the malformed-path PASS lacks a committed artifact. |
| Dependency/audit delta | PASS / FAIL pre-existing | Fresh audit remains the accepted 22 (7 moderate, 15 high), matching [npm-audit.txt](../05-quality/evidence/003a-supabase-wiring/npm-audit.txt). Every reported vulnerable lock node already existed unchanged at the base; none of this unit's new nodes is reported. |
| `tsconfig.json` one-line change | PASS | The only change is `allowImportingTsExtensions: true`; effective config retains `noEmit: true`, fresh typecheck is green in [gates.txt](../05-quality/evidence/003a-supabase-wiring/gates.txt), and no app source imports a `.ts` specifier. The flag permits the Node-only connectivity script's explicit import and is behaviorally inert for current app code. |
| Unit A triage | PASS attribution / gate remains exit 1 | Two base differences and one Unit B lint-file-list difference reproduced exactly after excluding the disclosed sandbox-only port race. The other eight gated artifacts were identical. |
| Builder HANDOFF ruling-6 disclosure | PASS as a disclosure check | It names one workflow and fan-out 18, with 4 finder plus 14 refuter agents accounting for the total, and says self-verification is supplementary. Git cannot independently prove the workflow testimony; no stronger claim is approved. |
| State-file touch scope | PASS | BRANCH-NOTES changes only the Unit B block (+26/-2); PROJECT-STATE replaces only the Unit B Active-work row (+1/-1); prior HANDOFF bytes are preserved and the new builder block is insertion-only (+135/-0). LOCK remains `REVIEW`. |
| Excluded scope | PASS | No schema, migration, RLS/auth-policy, auth UI, payment, provider-key, production, deploy, CI, `expo.scheme`, `docs/03-decisions/`, or prior review path changed. No added line contains a user-visible case-insensitive `noema` occurrence. |

## Standards

Hard findings: the false byte-stability gate/claim, the newly false operational
source, the incomplete environment ignore boundary, and the artifactless PASS
coverage. The evidence-directory count is a low factual defect. No baseline
code smell is reported; cross-cutting env references and evidence-script
repetition are justified by the dispatched wiring and immutable evidence model.

Advisory, not independently verdict-driving: `scripts/gen-types.sh:15` would
run floating `npx --yes supabase@2` outside the committed lock during the
owner-executed generation, when `SUPABASE_ACCESS_TOKEN` must be present.
Supabase's current [npm security guidance](https://supabase.com/docs/guides/security/npm-security#beware-npx--pnpm-dlx--bunx)
recommends an exact CLI version or locked devDependency. The implemented
invocation is viable, and the dispatch did not explicitly require a locked
CLI, so the controller should adjudicate it in the fix loop rather than
treating it as an unauthorized reviewer edit.

Two producer robustness observations are likewise non-verdict-driving at this
clean target: `capture.sh` reports rather than fails closed on secret matches or
broken controls, and `connectivity.sh` records the child exit in its transcript
but returns the final `echo` status. Neither made the current artifacts false.

## Spec

Three explicit requirements are missing or false: per-artifact byte stability,
literal `.env*` ignore coverage, and complete artifact backing for all PASS
claims. The operational-source ripple and incorrect HANDOFF count are separate
governance defects. Dependency/client/types plumbing, redacted committed
connectivity, fresh five-step local gates, secret-free tracked bytes, Unit A
attribution, excluded paths, and state-file boundaries otherwise meet scope.
No unauthorized scope creep was found.

Standards: 4 hard findings, 1 low factual finding, and 3 advisory observations;
worst is the medium false byte-stability contract. Spec: 3 missing/partial
requirements; worst is the same medium reproducibility failure.

## Carried items

The accepted 22 advisories and CI NOT RUN remain settled. Live connectivity and
authenticated generated-types production remain NOT RUN by design. Separately,
`OPERATIONS.md:28-29,141-150` already contradicted the base state that staging
exists; that pre-existing adjacent documentation defect is recorded but not
charged to Unit B. The Unit A gate's two base-era differences remain reported
and unrepaired as required.
