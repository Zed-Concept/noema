# Noema — OPERATIONS

Who runs what, and how. This is the file someone opens to answer "how do I run
it" and "who is allowed to do this".

**Status:** partly filled. As of 2026-08-18 the Unit A Expo app skeleton exists on
`feat/app-skeleton`, so **How to run it locally** below is real and the local row
of the environments table has changed. Everything else is still a stub: no
staging or production environment, no deploy target, and no monitoring exists.
Fill each section when the thing it describes first exists, not before.

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
Unit B and does not exist yet, so a fresh clone runs with no credentials at all.

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

**Not yet verified:** nobody has rendered the app on a simulator, emulator, or
browser. `expo export --platform all` produces iOS, Android, and web bundles
(`docs/05-quality/evidence/002a-app-skeleton/expo-export.txt`), which proves it
bundles, not that it renders. First run on a real target is still open work.

## Environments

**Local** exists as of Unit A: an Expo dev server with no backend and no keys.
**Staging and production do not exist** — TODO(owner). No Supabase project has
been created; that is an owner task and RED lane. There is no deployed web app
and no store presence.

| Environment | Status | Owner |
|---|---|---|
| local | app skeleton runs; no backend, no keys | any builder |
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
