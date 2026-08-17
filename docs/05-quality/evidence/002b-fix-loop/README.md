# Evidence — 002b REVIEW-003 fix loop (Unit A, CTRL-002)

Branch `feat/app-skeleton`, same builder, same LOCK. Base for this loop is the
REVIEW-003 record commit `670b5365a78417523fee26741425dda3a6c4b45c`.

This directory covers **only** the four REVIEW-003 findings. The Unit A build
evidence stays in `../002a-app-skeleton/`; nothing there was re-litigated, and
the only file of it that changed is `git-ls-files.txt` (finding 4) and its
README narrative (findings 3 and 4).

Environment for all transcripts: `environment.txt` — Node v26.0.0, npm 11.12.1,
TypeScript 6.0.3, Expo SDK 57.0.14, Darwin 24.6.0. Same machine and versions as
the 002a capture, so the transcripts are comparable line for line.

## The four findings

| # | REVIEW-003 finding | Resolution | Artifact |
|---|---|---|---|
| 1 | high — the uncleared name sits in a user-visible app field (`app.json:3`) | `expo.name` is now `ZC App (dev)`; `slug` and `scheme` untouched per the controller ruling | `name-scan.txt`, `app-json-diff.txt` |
| 2 | medium — `OPERATIONS.md` still says nothing is runnable | "How to run it locally" and the environments table now describe the real app | the `OPERATIONS.md` diff |
| 3 | low — the 002a evidence README calls the pushed branch unpushed | narrative corrected; NOT RUN classification unchanged | `push-state.txt`, the 002a README diff |
| 4 | low — the tracked-file transcript is not a head listing | regenerated from the staged index by a committed script, to a fixed point | `tracked-files.sh`, `../002a-app-skeleton/git-ls-files.txt` |

## Claims

| # | Claim | Class | Artifact |
|---|---|---|---|
| 1 | No user-visible name field contains the uncleared name — in `app.json`, in Expo's resolved config, or in the manifest actually shipped in the web bundle | PASS | `name-scan.txt` sections 1–3 |
| 2 | The product change is exactly one line | PASS | `app-json-diff.txt` |
| 3 | TypeScript still typechecks under `strict` | PASS | `typecheck.txt` (exit 0) |
| 4 | ESLint still passes with zero errors and zero warnings | PASS | `lint.txt` (exit 0) |
| 5 | The lint pass is still non-vacuous — 5 files inspected | PASS | `lint-file-list.txt` |
| 6 | The test suite still passes | PASS | `test.txt` (1 passed, 1 total) |
| 7 | Prettier still reports every matched file formatted | PASS | `prettier-check.txt` (exit 0) |
| 8 | Dependencies still match what Expo SDK 57 expects | PASS | `expo-doctor.txt` (21/21) |
| 9 | The app still bundles for iOS, Android, and web after the rename | PASS | `expo-export.txt` (three bundles, exit 0) |
| 10 | The branch is on `origin`, which is what made the 002a narrative stale | PASS | `push-state.txt` |
| 11 | The tracked-file listing matches the tree it describes | PASS | `../002a-app-skeleton/git-ls-files.txt` |
| 12 | `npm audit` is unchanged by this loop — still 22 advisories | FAIL pre-existing | `npm-audit.txt` |
| 13 | CI runs install → typecheck → lint → test → format:check on PR and push-to-main | NOT RUN | still no PR; see below |
| 14 | The gates fail on a real violation and return to green | NOT RUN | not re-run; see below |
| 15 | The app renders on a device, simulator, or browser | NOT RUN | no runtime target available; unchanged from 002a |

## On finding 1 — which name fields are user-visible

The controller ruled the distinction that resolves this finding, and it is
recorded here so a re-review does not have to reopen it:

| Field | Class | Why |
|---|---|---|
| `expo.name` | **user-visible** | Expo defines it as the name shown in Expo Go and as the installed app's home-screen label. This is the field REVIEW-003 flagged, and the only one changed. |
| `expo.web.name`, `expo.web.shortName` | **user-visible, derived** | Unset in `app.json`; Expo fills both from `expo.name` at export. They now read `ZC App (dev)`. |
| `expo.slug` | internal | Project identifier for Expo/EAS. Same class as the GitHub repo name. |
| `expo.scheme` | internal | Deep-link URI scheme, not a display string. |
| `package.json` / `package-lock.json` `name` | internal | npm package identifier of a `private: true` package that is never published. |
| Repo name `Zed-Concept/noema` | internal | Explicitly the same class per the ruling; also a private repo. |

`name-scan.txt` proves this at three depths, weakest first: the field as written
in `app.json`; the config Expo resolves from it (`expo config --type public`);
and the manifest string embedded in the exported web bundle, which is the one
that ships. All three agree — zero user-visible fields match `/noema/i`, while
`slug` and `scheme` still read `noema` by design.

Section 4 of the same artifact lists every remaining tracked occurrence: two in
`AGENTS.md`, one in `README.md`, `slug` and `scheme` in `app.json`, and three
npm `name` fields. Each is internal or governance prose. 14 files under `docs/`
name the project, as governance documents must.

If the controller wants `scheme` moved as well, that is a separate ruling: a
custom URI scheme can surface in an OS "Open in…?" prompt, so the "internal"
classification is defensible but not the only reading. Not acted on here —
REVIEW-003 finding 1 names `app.json:3` only, and this loop's scope is the
recorded findings and nothing else.

## On finding 4 — why the first listing could not have been right

`git ls-files` reads the index, so a listing captured before its own file is
staged can never include itself. The 002a capture recorded 50 paths for a tree
that held 52 — it omitted itself and the evidence README.

`tracked-files.sh` fixes the method rather than the number: stage everything,
run it, stage again, repeat until the output stops changing. Two passes reach
the fixed point. At the committed head every listed path is already tracked, so
one run reproduces the artifact byte-for-byte, and it can be checked against
`git ls-tree -r --name-only <head>`. The artifact now describes the fix-loop
commit; it is deliberately not a listing of the superseded `9708fc2` tree.

## What is still NOT RUN, and why

- **CI (claim 13).** Unchanged from 002a: `.github/workflows/ci.yml` triggers on
  `pull_request` and push to `main`. The branch is pushed, but a feature-branch
  push matches neither trigger and no PR is open. The first run still comes with
  the PR. This loop adds a commit to the branch; it does not add a trigger.
- **Negative controls (claim 14).** Not re-run. This loop changed one string in
  `app.json` and some prose; no gate, config, or script that the 002a negative
  control exercised was touched, so `../002a-app-skeleton/gate-negative-control.txt`
  still describes the current gates. Re-running would have produced a
  second identical transcript, not new information.
- **Rendering (claim 15).** No simulator, emulator, or browser session was run.
  The three-platform export proves the app bundles under the new name, not that
  it renders.

## Re-running these checks

Every artifact here comes from a committed script. Run any of them from the
repository root:

- `capture.sh` — the gate transcripts, `expo-doctor`, the three-platform export,
  and `npm audit`. Same shape as the 002a script; only the output directory
  differs.
- `name-scan.sh` — `name-scan.txt`. Section 3 needs `dist/` from `capture.sh`
  and reports itself skipped without it.
- `fix-state.sh` — `push-state.txt` and `app-json-diff.txt`.
- `tracked-files.sh` — rewrites `../002a-app-skeleton/git-ls-files.txt`.
