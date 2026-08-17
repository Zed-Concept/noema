# Noema — OPERATIONS

Who runs what, and how. This is the file someone opens to answer "how do I run
it" and "who is allowed to do this".

**Status:** stub. As of 2026-08-17 there is nothing to run — the repository holds
governance documents and no application code. Fill each section when the thing it
describes first exists, not before.

## Credential ownership

This part is already decided and binds now.

- **Ahmed (owner)** is the sole holder of production credentials: production
  Supabase, Vercel production, EAS, RevenueCat, and Mercury. Agents request these
  actions; the owner executes them.
- **Builders receive staging keys only.** Staging does not exist yet, so builders
  currently hold no keys at all.
- Rotating, printing, or committing any key is RED lane. See `AGENTS.md`.

## How to run it locally

TODO(owner) — no application exists. There is no `package.json`, no Expo project,
and no dependency to install.

## Environments

TODO(owner) — none exist. No staging or production Supabase project has been
created; that is an owner task. There is no deployed web app and no store
presence.

| Environment | Status | Owner |
|---|---|---|
| local | does not exist | — |
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
