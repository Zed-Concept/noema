# Noema — OPERATIONS

Who runs what, and how. This is the file someone opens to answer "how do I run
it" and "who is allowed to do this".

**Status:** partly filled. As of 2026-08-18 the Unit A Expo app skeleton exists on
`feat/app-skeleton`, so **How to run it locally** below is real and the local row
of the environments table has changed. Everything else is still a stub: no
staging or production environment, no deploy target, and no monitoring exists.
Fill each section when the thing it describes first exists, not before.

Every runtime statement in this file is limited to what an artifact under
`docs/05-quality/evidence/` proves, per the verification rule in `AGENTS.md`.
Four things are proven today: the committed lockfile installs, `expo export`
produces iOS, Android and web bundles, the dev server starts and serves the root
route, and — as of the owner's smoke test on 2026-08-18 — **the app renders on
the web target**. It has still never been seen on a simulator, an emulator, or a
device. Where this file would otherwise say the app "runs", it says which of
those is meant.

## Credential ownership

This part is already decided and binds now.

- **Ahmed (owner)** is the sole holder of production credentials: production
  Supabase, Vercel production, EAS, RevenueCat, and Mercury. Agents request these
  actions; the owner executes them.
- **Builders receive staging keys only.** Staging does not exist yet, so builders
  currently hold no keys at all.
- Rotating, printing, or committing any key is RED lane. See `AGENTS.md`.

## How to run it locally

The Expo app skeleton lives at the repository root and targets iOS, Android, and
web. There is no backend, no `.env`, and nothing to configure: Supabase wiring is
Unit B and does not exist yet, so no credentials are needed to install or start
it.

Requires Node and npm. CI pins **Node 24 LTS**; Unit A was built and verified on
Node 26. No global Expo CLI install — `npx` resolves the version in the lockfile.

```
npm ci      # exact lockfile install; use this rather than npm install
npm start   # Metro dev server, then press i, a, or w to pick a target
```

| Command | What it does |
|---|---|
| `npm start` | Metro dev server; choose the target from its prompt |
| `npm run ios` | iOS Simulator — needs Xcode, macOS only |
| `npm run android` | Android emulator or attached device — needs Android Studio |
| `npm run web` | Opens the web target in a browser |
| `npm run typecheck` | `tsc --noEmit` under `strict` |
| `npm run lint` | `expo lint` |
| `npm test` | Jest via `jest-expo` |
| `npm run format` / `npm run format:check` | Prettier write / check |

CI runs five of these in order — `npm ci`, typecheck, lint, test, format:check.
The definition is `.github/workflows/ci.yml`; it is the same set you can run
locally before pushing.

### What is actually proven, and what is not

| Statement | Class | Artifact |
|---|---|---|
| `npm ci` installs the committed lockfile | PASS | `docs/05-quality/evidence/002b-fix-loop/environment.txt` and the gate transcripts beside it |
| `expo export --platform all` produces iOS, Android and web bundles | PASS | `docs/05-quality/evidence/002b-fix-loop/expo-export.txt` |
| The dev server starts and answers HTTP 200 on `/`, with the placeholder screen's text in the markup it serves | PASS | `docs/05-quality/evidence/002c-fix-loop-2/dev-server.txt` |
| The app renders **in a browser** | PASS | `docs/05-quality/evidence/002c-owner-smoke/attestation.md` — owner, web, Chrome on macOS, 2026-08-18 |
| The app renders on a simulator, emulator, or physical device | **NOT RUN** | none — the same slot is still open for a device run |

The distinction the export and dev-server rows turn on: an export is a build
product, and the dev server's web markup is produced by Expo Router's static
rendering inside Node. Neither involves a browser laying out a page or React
Native mounting a view. The browser row is a person having looked at a screen —
which is why it is the only one of the four an agent could not produce.

The device row matters on its own and is not a formality: the web target runs
react-native-web, so nothing has yet exercised React Native itself. It is also
the only target on which the app's name is user-visible.

`npm run ios` and `npm run android` have never been executed at all; they are
listed above because the scripts exist, not because they are known to work.

## Owner smoke test

The one check no agent can run: does the app actually appear on a screen.

**Web: done — PASS, 2026-08-18**
(`docs/05-quality/evidence/002c-owner-smoke/attestation.md`). The procedure is
kept here because it is worth repeating whenever the skeleton changes, and
because the device target below has not been run.

**Web — the short version.**

```
npm ci                  # exact lockfile install
npm run web             # equivalently: npx expo start --web
```

Expected result, as observed on 2026-08-18: a browser tab opens on
`http://localhost:8081`, **the browser tab is titled `index`**, and the page
shows a **header bar reading `index`** across the top, with the **placeholder
home screen** centred below it — `Placeholder home screen` above `Edit
src/app/index.tsx to replace this.`. The first of those two lines is a heading
element, but the skeleton applies no font styling of its own, so do not expect
it to look large or bold; centring and an 8px gap are the only layout it sets.

The `index` in both places is the route filename showing through: the root
`<Stack />` titles its header with the route name, and Expo Router sets the
document title to the same thing on the client after hydration. It is not a
fault to report — it is what an untitled placeholder route looks like — but it
does need a real title before any of this is user-facing.

**Where the `ZC App (dev)` name shows, and where it does not.** On web it does
**not** appear on screen anywhere — not in the tab, not in the header — because
the skeleton sets no title of its own; the name lives only in the web manifest
embedded in the bundle. To see the name in a user-visible place, run the device
target, which has **not** been run:

```
npm start               # then scan the QR code with Expo Go
```

Expected result: the Expo Go project list shows **`ZC App (dev)`**, and opening
it shows the same placeholder home screen. This is the target that exercises
React Native rather than react-native-web, and after the web run it is the
outstanding one.

**What to record.** Whichever target is run, the result goes in
`docs/05-quality/evidence/002c-owner-smoke/` — see the README there for what
the attestation needs to say. A screenshot is ideal; a written attestation
naming the target, the date, and what appeared is enough. The device row above
stays NOT RUN until one lands.

**If it fails**, that is a real finding about Unit A and not an owner problem:
record what happened in the same place and hand it back to the controller.

## Environments

**Local** is the only environment: the repository, installed from its lockfile,
with no backend and no keys. **Staging and production do not exist** —
TODO(owner). No Supabase project has been created; that is an owner task and RED
lane. There is no deployed web app and no store presence.

| Environment | Status | Owner |
|---|---|---|
| local | installs, bundles, serves `/` from the dev server, and renders in a browser; not yet run on a simulator, emulator, or device | any builder |
| staging | not created | Ahmed |
| production | not created | Ahmed |

## Deploys and releases

TODO(owner). Vercel (web) and EAS (store builds) are the intended targets per
`docs/00-master/ARCHITECTURE.md`. Neither is configured. Every deploy path listed
there is RED lane.

## Monitoring

TODO(owner). Sentry (errors) and PostHog (product analytics) are intended;
neither is configured.

## On-call and incident response

TODO(owner). Not applicable while nothing is deployed.
