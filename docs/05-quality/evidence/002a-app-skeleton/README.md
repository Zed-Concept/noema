# Evidence — 002a app skeleton (Unit A, CTRL-002)

Branch `feat/app-skeleton`, built from `main` at
`ed0340d46a0cacbeffaaf71ed1cc229d62316fc9`.

Every claim below names the artifact that proves it. Classifications follow
`AGENTS.md`: PASS / FAIL introduced by this work / FAIL pre-existing / NOT RUN
with reason.

Environment for all transcripts: `environment.txt` — Node v26.0.0, npm 11.12.1,
TypeScript 6.0.3, Expo SDK 57.0.14, Darwin 24.6.0.

## Claims

| # | Claim | Class | Artifact |
|---|---|---|---|
| 1 | TypeScript typechecks under `strict` | PASS | `typecheck.txt` (exit 0) |
| 2 | ESLint passes with zero errors and zero warnings | PASS | `lint.txt` (exit 0) |
| 3 | The lint pass is not vacuous — ESLint actually inspected 5 files | PASS | `lint-file-list.txt` |
| 4 | The test suite runs and one test passes | PASS | `test.txt` (1 passed, 1 total) |
| 5 | All three gates fail on a real violation, then return to green | PASS | `gate-negative-control.txt` |
| 6 | Prettier reports every matched file already formatted | PASS | `prettier-check.txt` (exit 0) |
| 7 | Dependencies match what Expo SDK 57 expects | PASS | `expo-doctor.txt` (21/21) |
| 8 | The app bundles for iOS, Android, and web | PASS | `expo-export.txt` (three bundles, exit 0) |
| 9 | No generated or machine-local file is tracked | PASS | `git-ls-files.txt` |
| 10 | CI runs install → typecheck → lint → test → format:check on PR and push-to-main | NOT RUN | see "CI has not run yet" below |
| 11 | `npm audit` reports 22 transitive advisories in Expo build tooling | FAIL pre-existing | `npm-audit.txt` |

## CI has not run yet

`.github/workflows/ci.yml` triggers on `pull_request` and on `push` to `main`.
Neither event has occurred: this work sits on an unpushed feature branch with no
pull request. **The first CI run triggers when the PR for this branch is
opened.** Until that run exists, claim 10 is NOT RUN, and the workflow is
asserted correct by reading, not by execution.

What *was* verified locally is that the five commands the workflow invokes all
succeed on this tree (claims 1, 2, 4, 6, and the `npm ci`-equivalent install
that produced the committed lockfile). What was not verified is the workflow
file itself — GitHub Actions syntax, action resolution, and Node 24 behaviour.
This session ran Node 26 locally; CI pins Node 24 LTS, so the CI run is also
the first execution on that version.

`format:check` was added as the fifth step by CTRL-002 scope amendment after
the initial handoff. It is the only step that checks formatting:
`eslint-config-prettier` switches ESLint's formatting rules off, so the lint
step cannot catch it.

## On claim 11 — `npm audit`

22 advisories (7 moderate, 15 high), all transitive through Expo's own build
tooling (`@expo/config`, `@expo/config-plugins`, `@expo/prebuild-config`,
`@expo/local-build-cache-provider`). They arrive with `expo@57.0.14` itself and
are not introduced by any choice made in this unit — hence FAIL pre-existing
rather than FAIL introduced.

Not acted on. `npm audit fix --force` would move Expo off the SDK-pinned
versions that `expo-doctor` requires, which is both outside this dispatch and a
decision above a builder's authority. Reported to the controller as an adjacent
finding.

## Re-running these checks

Both scripts are committed so the results are reproducible rather than asserted:

- `capture.sh` — regenerates every transcript except `git-ls-files.txt` and
  `gate-negative-control.txt`.
- `negative-control.sh` — injects one deliberate fault per gate, records the
  exit code, removes it, and confirms the gate returns to green.

Run either from the repository root.
