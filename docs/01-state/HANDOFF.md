# Session handoff

Written at the end of every session. The next session — possibly a different
model, possibly a subagent with none of your context — starts by reading this.
Write for someone who knows the project but not your last hour.

Append a new block at the top. Never edit an old one.

---

## 2026-08-18 — feat/app-skeleton (REVIEW-004)

**Controller:** CTRL-002 App Skeleton. **Reviewer of record:** Codex, fresh
session, review only. **Target:**
`c2ffd15becf9a5bd40fc2f60c129f89b79756710`. **Fix-loop base:**
`670b5365a78417523fee26741425dda3a6c4b45c`.

**What I set out to do**

Re-review only the REVIEW-003 fix-loop commit. Reproduce the three-depth name
scan, all committed 002b scripts, the fresh-install gates, and the directed
state-file checks. Preserve every settled ruling and do not fix, merge, deploy,
or open a PR.

**Verdict: FAIL**

Two medium findings remain. First, the dispatch's byte-stable evidence gate
fails: four non-network 002b artifacts change when the committed scripts run at
the committed head. Second, `OPERATIONS.md` now documents the correct commands
but asserts that the app and local environment "run" while the same file says
runtime rendering is unverified. Full evidence, classifications, blob IDs, and
line citations are in `docs/04-reviews/REVIEW-004.md`.

**What I verified**

- **REVIEW-003 finding 1 — PASS/fixed.** Fresh `name-scan.sh` returned zero
  `/noema/i` matches in user-visible fields at all three depths: `app.json`,
  resolved Expo config, and the exported web manifest. The three visible names
  resolve to `ZC App (dev)`. Controller-classified identifiers were not flagged.
- **REVIEW-003 finding 2 — FAIL/open.** The stale "nothing exists" prose is
  removed, but its replacement makes unproven runtime assertions.
- **REVIEW-003 finding 3 — PASS/fixed, with a new evidence defect.** The 002a
  narrative correctly says the feature branch is pushed and CI is still NOT
  RUN. Fresh origin state is `c2ffd15` and `0 0`; committed `push-state.txt`
  instead records `670b536` and changes on rerun.
- **REVIEW-003 finding 4 — PASS/fixed.** `tracked-files.sh` regenerated its
  artifact byte-for-byte; all 70 paths equal the exact target tree.
- **Fresh install and five commands — PASS.** `npm ci`, typecheck, lint,
  `npm test -- --ci`, and format:check each exited 0. Expo Doctor returned
  21/21 with network access; all three platform exports succeeded.
- **Evidence byte stability — FAIL introduced by this work.** `push-state.txt`,
  `name-scan.txt`, `test.txt`, and `expo-export.txt` changed without relying on
  network. The initial sandboxed Expo Doctor and audit calls could not resolve
  the registry; network-enabled reruns reproduced 21/21 and the accepted 22
  advisories, so those two files are not needed to establish the failure.
- **State discipline — PASS.** HANDOFF is +140/-0 and preserves prior blocks;
  BRANCH-NOTES is +34/-0 inside the Unit A LOCK; PROJECT-STATE changes only the
  Unit A Active-work row; no `docs/03` or `docs/04` path is in the reviewed fix
  delta.
- **CI — NOT RUN.** No PR or push-to-main event exists, as accepted.

**What I changed**

- Added immutable `docs/04-reviews/REVIEW-004.md`.
- Appended this HANDOFF block above all prior blocks.

No reviewed application, configuration, state row, LOCK block, or evidence
artifact was edited. No PR was opened and nothing was merged or deployed.

**Next step**

Return the two open findings to the same builder on `feat/app-skeleton`, then
route the next fix commit to a fresh immutable re-review. CI remains for the
owner's PR-open step after a PASS.

LOCK status line: `Status: REVIEW`.

---

## 2026-08-18 — feat/app-skeleton (REVIEW-003 fix loop)

**Controller:** CTRL-002 App Skeleton. **Builder:** Claude Code, Opus / high
effort / fresh session — the same builder that built Unit A, on the same branch,
as the protocol requires for a fix loop. **Reviewer of record:** Codex.
**Base:** `670b5365a78417523fee26741425dda3a6c4b45c`, the REVIEW-003 record
commit, confirmed as the `origin/feat/app-skeleton` tip before any work started.

**What I set out to do**

Resolve all four REVIEW-003 findings and nothing else. LOCK stays `REVIEW`
throughout — a same-unit fix loop does not move it.

**What I changed**

- `app.json` — `expo.name` from `noema` to `ZC App (dev)`. One line. This is the
  whole product change in this loop.
- `docs/02-roles/OPERATIONS.md` — filled "How to run it locally" and the local
  row of the environments table.
- `docs/05-quality/evidence/002a-app-skeleton/README.md` — corrected the
  unpushed-branch narrative; added a note on the regenerated tracked-file
  listing and its script.
- `docs/05-quality/evidence/002a-app-skeleton/git-ls-files.txt` — regenerated.
- `docs/05-quality/evidence/002b-fix-loop/` — new: four scripts, ten
  transcripts, and a README mapping every claim to its artifact.
- `docs/01-state/BRANCH-NOTES.md` — fix-loop closing note on the Unit A LOCK.
  Status unchanged.
- `docs/01-state/PROJECT-STATE.md` — the Unit A **Active work** row only.
- `docs/01-state/HANDOFF.md` — this block, appended above the existing ones.

**Finding 1 — the verdict-driving one**

`expo.name` is the name Expo Go lists and an installed app puts under its icon,
so the uncleared product name was genuinely user-visible. It now reads
`ZC App (dev)`.

On the controller's ruling, `slug` and `scheme` stay as they are: internal
identifiers of the same class as the GitHub repo name, along with the npm `name`
in `package.json` and the lockfile, which belong to a `private: true` package
that is never published. **Recording that distinction so a re-review need not
reopen it.**

I proved it at three depths rather than asserting it — `name-scan.txt`:

1. `app.json` as written — no user-visible field matches `/noema/i`.
2. The config Expo resolves (`expo config --type public`) — same result.
3. The manifest string actually embedded in the exported web bundle — the one
   that ships. This is the one worth having: Expo *derives* `web.name` and
   `web.shortName` from `name`, and both now read `ZC App (dev)`. A check that
   stopped at `app.json` would not have seen those two fields at all.

Section 4 lists every remaining tracked occurrence — two in `AGENTS.md`, one in
`README.md`, `slug` and `scheme`, and three npm `name` fields. All internal or
governance prose.

**What I verified, and how**

Full table with classifications in
`docs/05-quality/evidence/002b-fix-loop/README.md`.

- **No user-visible name field carries the uncleared name — PASS.**
  `name-scan.txt`, three independent depths as above.
- **The product change is one line — PASS.** `app-json-diff.txt`, diffed against
  the pinned REVIEW-003 head so it reads the same before and after the commit.
- **Every gate still green after the rename — PASS.** Typecheck, lint, test, and
  format:check each exit 0; lint still inspects 5 files, so the pass is not
  vacuous. `typecheck.txt`, `lint.txt`, `lint-file-list.txt`, `test.txt`,
  `prettier-check.txt`.
- **Dependencies still match SDK 57 — PASS.** `expo-doctor` 21/21.
- **Still bundles for all three targets — PASS.** `expo export --platform all`
  produced iOS (2.3MB hbc), Android (2.6MB hbc), and web (1.1MB js) bundles plus
  three static routes, exit 0. `expo-export.txt`.
- **The branch is on `origin` — PASS.** `push-state.txt` resolves
  `refs/remotes/origin/feat/app-skeleton` to the REVIEW-003 head with zero
  commits either side. This is what made the 002a narrative false; the finding
  was about the narrative, not the classification.
- **The tracked-file listing matches its tree — PASS.** Regenerated by
  `tracked-files.sh` from the staged index, run to a fixed point so it includes
  itself. At the committed head one run reproduces it byte-for-byte, and it can
  be checked against `git ls-tree -r --name-only <head>`. It describes the
  fix-loop commit, deliberately not the superseded `9708fc2` tree.
- **`npm audit` — FAIL pre-existing, unchanged.** Still 22 advisories (7
  moderate, 15 high) in Expo's own build tooling. Not touched by this loop.
- **CI — NOT RUN.** Unchanged and unchangeable from here: the workflow triggers
  on `pull_request` and push to `main`, and a feature-branch push is neither.
  This loop adds a commit, not a trigger. The first run still comes with the PR.
- **Negative controls — NOT RUN.** Deliberate. Nothing this loop touched is
  exercised by them; `002a/gate-negative-control.txt` still describes the
  current gates, and a re-run would have produced a duplicate transcript rather
  than new information.
- **Rendering — NOT RUN.** No simulator, emulator, or browser session. Bundling
  under the new name is proven; rendering is not, unchanged from Unit A.

**What I did NOT do**

No Supabase, no keys, no `.env`, no transcription code, no EAS/Vercel/RevenueCat/
Sentry/PostHog configuration, no deploy, no PR, no merge, no force-push, no
history rewrite. Every RED-lane item and every prior scope exclusion still
holds. I did not touch `AGENTS.md`, `README.md`, `docs/03-decisions/`, or
`docs/04-reviews/`; I did not edit an existing HANDOFF block or another LOCK
block; I did not move the LOCK status; I changed no `PROJECT-STATE.md` section
other than the Unit A Active work row. I did not re-litigate anything REVIEW-003
passed or the controller had already accepted.

**What is broken or uncertain**

1. **CI is still unproven** and cannot be proven before a PR exists. Unchanged.
2. **Local Node 26 vs CI Node 24.** Unchanged.
3. **The app has still never been run** on a device, simulator, or browser.
4. **`ZC App (dev)` is a development placeholder.** It says so in the name, but
   it is a real user-visible string: whatever ships to a store has to be a
   deliberate decision, not this. Open question 2 (trademark clearance for
   "Noema", fallback "Kayan") is still open and still owner-only.

**Adjacent findings — reported, acted on in none**

- **`expo.scheme` is classified internal, and that is arguable.** A custom URI
  scheme can surface in an OS "Open in…?" prompt, so it is not purely invisible
  the way a slug is. The controller's ruling named `slug` and the repo name;
  REVIEW-003 finding 1 named `app.json:3` only. I left `scheme` alone rather
  than widening scope on my own reading. **Controller decision requested** if
  strict outward-facing purity is wanted there too.
- **REVIEW-003's judgment-call observation is untouched.** The CI job display
  name is still `typecheck, lint, test` and no longer names the format step. The
  review explicitly recorded it as not verdict-driving and not a finding, and
  this loop's scope is the recorded findings and nothing else. One-line fix
  whenever the controller wants it.
- The repo still has no `LICENSE` — unchanged owner decision from Unit A.

**Next step**

Route the fix commit to a fresh re-review session for an immutable REVIEW-004.
Then: owner opens the PR, which is the event that produces the first CI run.
Controller to rule on `expo.scheme` and the CI job label if it wants either
changed.

LOCK status line: `Status: REVIEW`.

---

## 2026-08-18 — feat/app-skeleton (REVIEW-003)

**What I set out to do**

Review the complete two-commit Unit A delta from
`ed0340d46a0cacbeffaaf71ed1cc229d62316fc9` to
`9708fc223dff97343e7a1dad5389b701609d692f` as Codex reviewer of record. Verify
scope, independently reproduce the evidence scripts, check tracked-file and CI
requirements, and verify the narrow state-file edits. Do not fix, merge, deploy,
or touch any file beyond the immutable review record and this HANDOFF append.

**What changed**

- `docs/04-reviews/REVIEW-003.md` — immutable Unit A review, verdict **FAIL**.
- `docs/01-state/HANDOFF.md` — this append-only review handoff.

No reviewed application, configuration, state row, LOCK block, or evidence
artifact was edited. No PR was opened and nothing was merged or deployed.

**What I verified, and how**

- **Exact review range — PASS.** The target is two linear commits above the
  supplied base; the full Git-object diff and every changed path were inspected.
- **Fresh evidence reproduction — PASS.** In a clean detached clone, `npm ci`
  installed the lockfile, both committed scripts ran unchanged, all local gates
  passed, `expo-doctor` returned 21/21, all three platform bundles exported,
  the accepted 22 audit advisories reproduced, and injected typecheck/lint/test
  faults each went red before returning to green.
- **Scope restrictions — FAIL introduced by this work.** `app.json.name` is
  `noema`; Expo defines that field as the name shown in Expo Go and on an
  installed app's home screen. This is outward-facing use of the uncleared name.
- **Repository hygiene and CI definition — PASS.** The lockfile is tracked;
  generated and machine-local paths are not; the workflow has the five required
  steps on pull requests and push-to-main.
- **CI execution — NOT RUN.** Accepted: there is still no PR or push-to-main
  event, and Node 24 has not run this workflow.
- **State boundaries — PASS.** Only the Unit A Active-work row changed in
  `PROJECT-STATE.md`; HANDOFF changes are additions only and the original Unit A
  block is byte-preserved beneath its amendment; only the Unit A LOCK changed in
  `BRANCH-NOTES.md`.
- **Additional review findings — FAIL introduced by this work.** `OPERATIONS.md`
  still asserts there is no runnable app; the evidence README incorrectly calls
  the now-pushed branch unpushed; and the tracked-file transcript records 50
  paths rather than the target's 52. The latter two are evidence-record defects,
  not failures of the underlying CI or tracked-file requirements.

Full findings, classifications, methods, hashes, and artifact links are in
`docs/04-reviews/REVIEW-003.md`.

**What I did NOT do**

Did not fix any finding, modify reviewed work, query Supabase, inspect or change
an external deployment, open a PR, merge, or change the LOCK. The isolated
reproduction did not write into the reviewed checkout.

**Next step**

Return the FAIL findings to the same builder for a fix loop, then route the new
fix commit to a fresh immutable re-review. CI remains for the owner's PR-open
step.

LOCK status line: `Status: REVIEW`.

---

## 2026-08-18 — feat/app-skeleton (CTRL-002 Unit A, post-handoff amendment)

Same session, same branch, continuing under a controller ruling that accepted
the Unit A handoff with one amendment. Appended rather than edited into the
block below, which stays as written.

**What changed**

- `.github/workflows/ci.yml` — added a fifth step, `npm run format:check`,
  after the test step. This closes the gap raised as item 3 of the block
  below: `eslint-config-prettier` disables ESLint's formatting rules, so
  before this step nothing in CI checked formatting. That item is now resolved
  and should not be read as open.
- `docs/01-state/BRANCH-NOTES.md` — the `feat/app-skeleton` LOCK moved
  `BUILD` → `REVIEW`, with an opening note recording the pre-build stop, a
  closing note, and an amendment note. The controller ruled that `REVIEW` at
  handoff is the builder's act per the precedent set by the scaffold and
  formatting units; `MERGED` remains a controller act. The original dispatch
  line I was given said not to move the status, so this is done on an explicit
  later ruling, not on my own reading.
- `docs/05-quality/evidence/002a-app-skeleton/README.md` — claim 10 and the
  "CI has not run yet" section updated from four steps to five. An evidence
  index that describes a workflow the repo no longer contains is worse than no
  index.
- `docs/01-state/PROJECT-STATE.md` — the Unit A Active work row only.
- `feat/app-skeleton` pushed to `origin`. No PR opened, per the ruling.

**What I verified, and how**

- **`npm run format:check` — PASS**, exit 0, so the new CI step passes on this
  tree rather than being added untested.
  `docs/05-quality/evidence/002a-app-skeleton/prettier-check.txt`.
- **The other four gates still pass — PASS.** Typecheck, lint, and test re-run
  after the amendment, all exit 0.
- **CI — still NOT RUN.** Adding a step does not run it. The workflow has now
  never executed with five steps rather than never executed with four; the
  first run still comes with the PR.

**Accepted by controller ruling, no action taken**

The 22 transitive npm advisories in Expo build tooling, the three retained
navigation dependencies, and the local Node 26 / CI Node 24 skew. All three
remain true and are recorded in the block below; none is open work.

**Next step**

Unchanged: route the diff to Codex as reviewer of record. The owner opens the
PR, which produces the first CI run.

LOCK status line: `Status: REVIEW`.

---

## 2026-08-18 — feat/app-skeleton (CTRL-002 Unit A)

**Controller:** CTRL-002 App Skeleton. **Builder:** Claude Code, Opus / high
effort / fresh session. **Reviewer of record:** Codex. **Branch cut from:**
`main` at `ed0340d46a0cacbeffaaf71ed1cc229d62316fc9`.

**What I set out to do**

Unit A: initialize an Expo managed app at the repo root targeting iOS, Android,
and web, with expo-router and one placeholder home screen; npm with a committed
lockfile; ESLint, Prettier, TypeScript strict; one GitHub Actions workflow
running install, typecheck, lint, and test; and evidence for every PASS claim.
No Supabase, no keys, no transcription, no deploys.

**The stop before the build**

My first session action was a stop, not a commit. `BRANCH-NOTES.md` at
`59db981` contained no LOCK for `feat/app-skeleton`, so there was nothing to
verify the dispatch's model and scope lines against — the check learning 3 put
in force. The controller ruled the snapshot stale, pointed to `ed0340d`, and I
re-verified against that tree: LOCK present, `Status: BUILD`, Builder Claude
Code, Model+Effort `Opus / high effort / fresh session`, RoR Codex, dispatch
line matching. Only then did I create the branch. Recording this because the
stop was the protocol working, not friction.

**What I changed**

Application:

- `package.json` — Expo SDK 57.0.14, `main: expo-router/entry`, npm scripts for
  `start`/`ios`/`android`/`web`, `typecheck`, `lint`, `format`, `format:check`,
  `test`. Private, version `0.1.0`.
- `package-lock.json` — committed. `node_modules/` and `dist/` are not tracked.
- `app.json` — slug `noema`, scheme `noema`, `web.output: static`,
  `plugins: [expo-router]`, `typedRoutes` and `reactCompiler` experiments on.
- `tsconfig.json` — extends `expo/tsconfig.base`, `strict: true`, `@/*` → `./src/*`.
- `src/app/_layout.tsx` — a bare `<Stack />`.
- `src/app/index.tsx` — the one placeholder home screen. Two lines of neutral
  text; no product copy, no product feature.
- `src/__tests__/home-screen.test.tsx` — one trivial test that renders the
  placeholder screen.
- `eslint.config.js` — `eslint-config-expo/flat`, then `eslint-config-prettier`
  last so formatting stays Prettier's job.
- `.prettierrc`, `.prettierignore`, `jest.config.js` (`preset: jest-expo`).
- `.github/workflows/ci.yml` — `pull_request` and push-to-`main`; checkout,
  setup-node (Node 24 LTS, npm cache), `npm ci`, typecheck, lint, test.
- `.gitignore` — two lines added (`expo-env.d.ts`, `.metro-health-check*`).
  Nothing removed.

Governance:

- `docs/05-quality/evidence/002a-app-skeleton/` — eleven artifacts plus the two
  scripts that generate them, and a `README.md` mapping every claim to its
  artifact with an explicit classification.
- `docs/01-state/PROJECT-STATE.md` — the Unit A **Active work** row only.
- `docs/01-state/HANDOFF.md` — this block.

`AGENTS.md`, `README.md`, `docs/03-decisions/`, `docs/04-reviews/`, and every
prior HANDOFF block are untouched. `.prettierignore` lists `docs/`, `AGENTS.md`,
and `README.md` so no formatter can ever reflow governance text.

**What I verified, and how**

Full table with classifications in
`docs/05-quality/evidence/002a-app-skeleton/README.md`.

- **Typecheck — PASS.** `tsc --noEmit` exit 0 under `strict`. `typecheck.txt`.
- **Lint — PASS.** Exit 0, zero errors, zero warnings. `lint.txt`.
- **The lint pass is not vacuous — PASS.** `expo lint` prints nothing on
  success, so a zero exit alone cannot distinguish "found nothing" from "matched
  no files." ESLint inspected 5 files. `lint-file-list.txt`.
- **Test — PASS.** 1 passed, 1 total. `test.txt`.
- **The gates are real — PASS.** This is the check worth having. I injected one
  deliberate fault per gate: typecheck went to exit 2, lint to 1, test to 1, and
  all three returned to 0 once removed. A green check nobody has seen go red
  proves nothing. `gate-negative-control.txt`, script `negative-control.sh`.
- **Prettier — PASS.** Every matched file already formatted. `prettier-check.txt`.
- **Dependencies match SDK 57 — PASS.** `expo-doctor` 21/21. `expo-doctor.txt`.
- **All three targets bundle — PASS.** `expo export --platform all` produced iOS
  (2.3MB hbc), Android (2.6MB hbc), and web (1.1MB js) bundles plus three static
  routes, exit 0. This is the strongest evidence available here that the
  skeleton really targets all three. `expo-export.txt`.
- **No generated file tracked — PASS.** 50 files, no `node_modules/`, no
  `dist/`, no `.env`. `git-ls-files.txt`.
- **CI — NOT RUN.** No `pull_request` or push-to-`main` event has occurred, so
  the workflow has never executed. **The first CI run triggers when this
  branch's PR is opened.** The four commands it invokes each pass locally; the
  workflow file itself — Actions syntax, action resolution, Node 24 — is
  asserted by reading only.
- **`npm audit` — FAIL pre-existing.** 22 advisories (7 moderate, 15 high), all
  transitive through Expo's own build tooling and arriving with `expo@57.0.14`.
  Not introduced by this unit, not acted on. `npm-audit.txt`.

**Decisions I made under delegated judgment**

- **SDK 57.0.14**, the current `latest` dist-tag.
- **`src/app/` routes**, matching the current Expo default template layout.
- **jest-expo**, Expo's default runner. Two findings worth passing on: `jest-expo@57`
  is built on the **Jest 29** line, and installing `jest@30` yields a broken
  mixed tree (`clearMocksOnScope is not a function`); and
  `@testing-library/react-native@14` made `render` **async**, so `await
  render(...)` is now required. I pinned Jest to 29 rather than forcing the
  install — `--legacy-peer-deps` here would have been weakening a check to make
  it pass.
- **Dropped the template's demo-only packages** (`@expo/ui`, `expo-image`,
  `expo-symbols`, `expo-glass-effect`, `expo-web-browser`, `expo-device`,
  `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`) and
  all demo assets and screens. A skeleton should not ship code nothing imports.
- **Kept `react-native-gesture-handler`, `react-native-reanimated`, and
  `react-native-worklets`** even though expo-router marks them *optional* peers
  and nothing imports them. Dropping them is very likely correct, but the
  failure mode would be a device-runtime crash, and I cannot run a device build
  in this environment. I did not trim on an unverifiable assumption. Flagged
  below as a cleanup a later unit can do with a simulator in hand.

**What I did NOT do**

No Supabase in any form. No provider key, no `.env`, no secret read, printed, or
committed. No transcription code. No EAS, Vercel, RevenueCat, Sentry, or PostHog
configuration. No deploy, no push, no PR, no merge. I did not flip the LOCK past
`BUILD` — that is a controller/owner act. I did not touch any state section other
than the Unit A Active work row, and did not edit an existing HANDOFF block.

The name "Noema" appears only as the lowercase internal slug (`package.json`
name, `app.json` `slug` and `scheme`) — nothing outward-facing, per the uncleared
trademark in open question 2.

**What is broken or uncertain**

1. **CI is unproven.** It cannot be proven before a PR exists. If the first run
   fails, it fails on the workflow file or on Node 24, not on the four commands
   — those are green locally on Node 26.
2. **Local Node 26 vs CI Node 24.** I built on Node 26 (current); CI pins 24
   (LTS), which is what Expo supports. The mismatch is deliberate but untested.
   Worth a `.nvmrc` in a later unit; adding one was not in this dispatch.
3. **Prettier is configured but not CI-enforced.** The dispatch names exactly
   four CI steps — install, typecheck, lint, test — and `eslint-config-prettier`
   *disables* formatting rules in ESLint, so nothing in CI checks formatting.
   `npm run format:check` exists and passes locally. Adding it as a fifth step
   is a one-line change I did not make because it is outside the dispatched
   scope. **Controller decision requested.**
4. **22 transitive npm advisories** in Expo build tooling (item above). The fix
   would move Expo off SDK-pinned versions that `expo-doctor` requires — above a
   builder's authority. **Reported, not acted on.**
5. **Three unused navigation dependencies** retained for the reason given above.
6. **The app has never been run.** No simulator, emulator, or browser session.
   Bundling for all three platforms is proven; rendering on a device is not.

**Adjacent findings — reported, acted on in none**

- The repo has no `LICENSE`. The Expo template ships one; adding it is an owner
  decision, so I did not.
- `docs/02-roles/OPERATIONS.md` is still the scaffold stub. There is now
  something runnable to document (`npm start`, `npm run ios|android|web`), so it
  is fillable for the first time — but it is not in this dispatch.

**Next step**

Route the `feat/app-skeleton` diff to Codex as reviewer of record. Then: owner
opens the PR, which is the event that produces the first CI run and converts
claim 10 from NOT RUN to a real result. Controller to rule on item 3 (Prettier
in CI) and item 4 (audit advisories).

LOCK status line unchanged and reported as: `Status: BUILD`.

---

## 2026-08-18 — chore/state-ctrl-001-closeout (CTRL-001 close-out)

**What I set out to do**

Controller close-out for CTRL-001: write ADR-003 recording the RED-lane
payments ruling, update the controller sections of `PROJECT-STATE.md`, flip
the `chore/agents-md-formatting` LOCK to `MERGED`, and record this branch's
own LOCK.

**What I changed**

- `docs/03-decisions/ADR-003-red-lane-payments.md` — new ADR: payment,
  purchase, entitlement, and billing-webhook logic changes are RED-lane items
  requiring explicit per-item approval.
- `docs/01-state/PROJECT-STATE.md` — added binding ruling 3 (ADR-003);
  appended learnings digest entries 2–4; updated Current state to note the
  merge, AGENTS.md sha256, and REVIEW-001/REVIEW-002 record; added a known
  issue for REVIEW-001's missing HANDOFF block; cleared Active work and added
  the App skeleton stream; updated Last verified.
- `docs/01-state/BRANCH-NOTES.md` — flipped the `chore/agents-md-formatting`
  LOCK to `MERGED` (commit `2e6b9f33c2cedbc8dbad2f30bd95a9550bf06675`); added
  the LOCK for this branch.
- `docs/01-state/HANDOFF.md` — appended this session record at the top.
- `docs/05-quality/evidence/001d-closeout/git-log.txt` — `git log --oneline
  -8` output.

**What I verified, and how**

- Pre-flight: `git merge-base --is-ancestor chore/agents-md-formatting main`
  confirmed the branch is merged into `main` before starting.

---

## 2026-08-18 — chore/agents-md-formatting (REVIEW-002 re-review)

**What I set out to do**

Re-review only the REVIEW-001 fix commit at `71630bb` against `6501b2d`, verify
the four controller-directed conditions, and write a new immutable review
record without changing the reviewed work.

**What I changed**

- `docs/04-reviews/REVIEW-002.md` — recorded the narrow re-review with verdict
  PASS, explicit resolution of REVIEW-001 findings 1 and 2, evidence links, and
  the accepted README deviation.
- `docs/01-state/HANDOFF.md` — appended this session record at the top, per the
  session protocol.

No other file was changed. The reviewed commit was not fixed or merged.

**What I verified, and how**

- **AGENTS.md fingerprint and exact delta — PASS.** Fresh Git-object hashing
  returned the required sha256, and the parent-to-head diff contains exactly
  the owner-approved payment line after the auth/RLS line.
- **HANDOFF preservation — PASS.** The scaffold block byte-matches the block in
  `fdbc384`; the pre-existing formatting block byte-matches `6501b2d`; both
  newer blocks are above the scaffold block.
- **001c scope — PASS.** The changed-path list is limited to the five allowed
  path classes, with `PROJECT-STATE.md` limited to the Active work row.
- **REVIEW-001 findings 1 and 2 — PASS.** Both are resolved. No new finding was
  identified.

Full methods, hashes, classifications, and evidence links are in
`docs/04-reviews/REVIEW-002.md`.

**What I did NOT do**

Did not re-examine the scaffold or formatting commits beyond the directed
content comparisons. Did not relitigate the owner-approved payment wording or
the controller-overruled README item. Did not modify `BRANCH-NOTES.md`, the
reviewed fix, or any external system. Did not merge.

**What is broken or uncertain**

Nothing open from this re-review. The previously recorded model discrepancy and
upstream markdown-stripping cause remain outside this review's scope.

**Next step**

Controller receives this HANDOFF and the unchanged LOCK status line:
`Status: REVIEW`. The owner may merge after controller processing.

---

## 2026-08-18 — chore/agents-md-formatting (REVIEW-001 fix loop)

**What I set out to do**

Fix REVIEW-001 findings 1 (high) and 2 (medium) on this branch. Finding 3
(README.md) was overruled by the controller and explicitly out of scope for
this dispatch.

**What I changed**

- `AGENTS.md` — inserted one line into the RED lane list, immediately after
  the auth/RLS line: "Changing payment, purchase, entitlement, or
  billing-webhook logic" (owner-approved wording, line-wrapped to match the
  file's existing style). No other line touched.
- `docs/01-state/HANDOFF.md` — restored the scaffold block's
  `## 2026-08-17 — main (scaffold)` heading, deleted by `f25631c`, from
  `fdbc384:docs/01-state/HANDOFF.md`. Positioned below this block and the
  001b block, above the scaffold body it always headed.
- `docs/01-state/BRANCH-NOTES.md` — closing note on this branch's LOCK block;
  status stays `REVIEW`.
- `docs/01-state/PROJECT-STATE.md` — Active work row only.
- `docs/05-quality/evidence/001c-fixes/` — `agents-md-diff.txt`,
  `agents-md-fingerprint.txt`, `handoff-restore-diff.txt`.

Nothing else was touched. README.md was not opened.

**What I verified, and how**

- **AGENTS.md diff is exactly one insertion — PASS.** `git diff AGENTS.md`
  shows a single added line and nothing else.
  `docs/05-quality/evidence/001c-fixes/agents-md-diff.txt`.
- **AGENTS.md fingerprint — PASS.** 5378 bytes, sha256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`.
  `docs/05-quality/evidence/001c-fixes/agents-md-fingerprint.txt`.
- **HANDOFF restoration is byte-for-byte — PASS.** Diffed the restored
  scaffold block (from the re-inserted heading to end of file) against
  `fdbc384:docs/01-state/HANDOFF.md` — empty diff.
  `docs/05-quality/evidence/001c-fixes/handoff-restore-diff.txt`.

**What I did NOT do**

Did not touch README.md or anything under `docs/03-decisions/` or
`docs/04-reviews/`. Did not edit any prior HANDOFF block — appended above the
scaffold block and restored its own heading, nothing else in that block
changed. Did not merge.

**What is broken or uncertain**

Nothing new. The prior block's open items (model discrepancy, upstream
markdown-stripping cause) are unchanged by this fix loop.

**Next step**

Route to Codex for re-review of REVIEW-001 findings 1 and 2. On PASS, the
controller moves the LOCK block to `MERGED`.

---

## 2026-08-17 — chore/agents-md-formatting

**What I set out to do**

Restore the markdown structure of `AGENTS.md`. The scaffold commit shipped it
verbatim as approved, but the approved text had lost its formatting upstream:
headings flattened to paragraphs, the Quick reference table reduced to
tab-separated lines. Structure was the whole deliverable — wording was not to be
touched.

**What I changed**

- `AGENTS.md` — content replaced byte-for-byte with the owner-approved file
  (`~/Downloads/AGENTS-approved.md`, transferred as a file after an inline paste
  had already lost its syntax once). 4998 → 5310 bytes.
- `docs/01-state/BRANCH-NOTES.md` — LOCK block for this branch, opened and
  closed to `REVIEW`.
- `docs/01-state/PROJECT-STATE.md` — Active work row only.
- `docs/01-state/HANDOFF.md` — this block.
- `docs/05-quality/evidence/001b-agents-md/` — three artifacts plus the two
  scripts that produced them, so the checks are re-runnable rather than asserted.

Nothing else was touched. No file outside the dispatch's allowed set was opened
for write.

**What I verified, and how**

- **The replacement is byte-for-byte — PASS.** The owner supplied an expected
  fingerprint (5310 bytes, 10 `^#` lines, 10 `|` lines, sha256 `1028ac15…`). I
  ran the STOP check against the file before writing anything; all four matched,
  and `AGENTS.md` hashes to the same sha256 after the copy.
  `docs/05-quality/evidence/001b-agents-md/fingerprint.txt`.
- **Wording is unchanged — PASS.** This was the risk worth proving: a structural
  fix that quietly reworded the rulebook would be worse than the flattening.
  `normalize.py` strips every marker that differs between the two files (heading
  `#`, bullets, ordered numbers, `**`, backticks, table pipes and delimiter row,
  tabs, all whitespace) and emits one word per line. 713 words before, 713 after,
  empty diff. `docs/05-quality/evidence/001b-agents-md/wording-diff.txt`.
- **Structure is valid — PASS.** `structcheck.py` parses the file against the GFM
  rules it depends on: 10 ATX headings (one h1, nine h2), each preceded by a
  blank line; a 2-column Quick reference table with a well-formed delimiter row
  immediately after the header and 7 body rows all of matching width; the
  lock-protocol block indented as preformatted text; zero literal tabs. The same
  script fails on the pre-existing file (exit 1, four faults), which is what
  makes the PASS meaningful.
  `docs/05-quality/evidence/001b-agents-md/structure-check.txt`.
- **Visual render — NOT RUN.** No markdown renderer exists in this environment
  (`pandoc`, `glow`, `mdcat`, `python-markdown` all absent) and installing one
  was outside scope. The claim in the dispatch's step 4 — "file renders with
  proper headings and a piped table" — is therefore supported by a structural
  parse, not by an actual render. Treat it as such.

**What I did NOT do**

Did not merge. Did not edit a single word of the rulebook's prose, including
places where I might have phrased something differently. Did not correct the
scaffold handoff's now-stale note about `AGENTS.md` not rendering — that block is
an immutable past record and superseding it is the controller's call, not a
builder's. Did not touch any `PROJECT-STATE.md` section other than Active work;
in particular the Learnings digest is left alone despite this being an obvious
candidate entry (see below). No credential read, printed, or committed.

**What is broken or uncertain**

- **The dispatch's model line does not match this session.** It names
  `Sonnet 4.6 / low`; the environment reported Opus 5 (1M context). Recorded both
  in the LOCK block rather than picking one. The controller should reconcile —
  a lock record naming a model that did not build the unit is exactly the sort of
  quiet inaccuracy the governance is meant to catch.
- **The upstream cause is unfixed.** Something between the owner's approved text
  and the repo strips markdown — it happened on the scaffold dispatch and again
  on the first paste attempt this session. The file-transfer route worked. Until
  the cause is known, any future rulebook change pasted inline is at risk of the
  same silent flattening. This is a candidate Learnings digest entry, with a rule
  along the lines of *transfer governance documents as files with a
  pre-agreed sha256, never as inline paste* — controller-only, so I have not
  written it.
- **`AGENTS.md` content is unverified against owner intent.** I verified the file
  matches the supplied hash. I did not and cannot verify that the supplied file
  is what the owner meant to approve.

**Next step**

Route this diff to Codex as reviewer of record: confirm `AGENTS.md` matches the
approved source byte-for-byte, that the prose is untouched, that no file outside
the allowed set changed, and that the evidence scripts do what their output
claims. Then the controller moves the LOCK block to `MERGED`, decides on the
Learnings digest entry, and reconciles the model discrepancy.

---

## 2026-08-17 — main (scaffold)

**What I set out to do**

Create the private repository `Zed-Concept/noema` and scaffold the project
governance system in a single commit on `main`, so that every later unit of work
has a rulebook, a state file, a lock record, and an evidence gate to work against.
No application code.

**What I changed**

Created the repository and, in one commit:

- `AGENTS.md` — the rulebook, written verbatim from the owner-approved content in
  the dispatch. Not reformatted or edited.
- `README.md` — three lines: name, one-liner, pointer to `AGENTS.md`.
- `.gitignore` — standard Node/Expo.
- `docs/00-master/ARCHITECTURE.md` — filled from the dispatch's stated facts:
  Expo for mobile and web, Tauri later; Supabase via `supabase-js` with RLS and
  generated types, no ORM; Anthropic for intelligence; Vercel, EAS, Sentry,
  PostHog, RevenueCat, Linear; English-first with Arabic supported but not
  first-class. Everything else carries a `TODO(owner)` marker.
- `docs/01-state/PROJECT-STATE.md` — project facts, no environments yet, binding
  rulings #1 and #2, this scaffold as the only active stream, and two open
  questions.
- `docs/01-state/BRANCH-NOTES.md` — LOCK block format plus this scaffold as the
  first entry, closed to `REVIEW`.
- `docs/01-state/HANDOFF.md` — this file.
- `docs/02-roles/OPERATIONS.md` — a stub; there is nothing to run yet.
- `docs/03-decisions/ADR-001-operating-model.md` — the multi-agent operating model.
- `docs/03-decisions/ADR-002-v1-stack.md` — Supabase over Neon; no Drizzle in v1.
- `docs/03-decisions/ADR-NNN-template.md`, `docs/04-reviews/REVIEW-NNN.md` — the
  unfilled record templates.
- `docs/05-quality/evidence/001-scaffold/` — the two verification artifacts.

**What I verified, and how**

- **The tracked tree is exactly what was scoped — PASS.** `git ls-files` output at
  `docs/05-quality/evidence/001-scaffold/git-ls-files.txt`. Contains no
  `package.json`, no lockfile, no CI config, no application source.
- **The repository is private — PASS.** `gh repo view Zed-Concept/noema --json
  visibility` output at
  `docs/05-quality/evidence/001-scaffold/repo-visibility.json`.

Both artifacts were written before the commit, so they ship inside it.

**What I did NOT do**

Deliberately, per scope: no application code, no `package.json`, no Expo
initialization, no dependencies, no CI configuration, no Supabase configuration,
no `docs/06-content/` (Noema is not a content-driven site). No credential was read,
printed, or committed. `OPERATIONS.md` is a stub rather than a filled document
because nothing runnable exists to document.

**What is broken or uncertain**

- `AGENTS.md` was written **verbatim** as approved. Its markdown does not render
  as structured markdown — section headings arrive as plain paragraphs, list items
  as plain lines, and the Quick reference table as tab-separated text without pipes.
  This is faithful to the approved content and was not corrected. If the owner
  wants it to render, that is a separate dispatch.
- The `ARCHITECTURE.md` product definition is `TODO(owner)`. Nothing in this repo
  states what Noema actually is. Do not infer it.
- The voice transcription provider is undecided between Deepgram and ElevenLabs
  Scribe. Any transcription code written before that ADR exists will be wrong.
- The name "Noema" has not been cleared for trademark or domain. Fallback: Kayan.
  The repository name would change with it.

**Next step**

Route this diff to Codex as reviewer of record: confirm the tree matches the
`project-governance` skill scaffold, `AGENTS.md` matches the approved content
byte-for-byte, and no code or secrets are present. After review, the controller
moves the LOCK block to `MERGED` and syncs Linear.

---
