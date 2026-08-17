# Noema — ARCHITECTURE

What the system is, and why. Anything not stated here is not decided. A
`TODO(owner)` marker means the decision belongs to Ahmed and has not been made —
do not fill it in by inference.

**Last updated:** 2026-08-17
**Status:** initial scaffold. Not an architecture freeze.

## What Noema is

TODO(owner) — the product definition has not been recorded in a dispatch yet.
Write it here, not in a chat transcript.

## Client platforms

- **Mobile and web:** Expo (React Native). One codebase serves iOS, Android, and
  web.
- **Desktop:** Tauri, later. Not in v1. No desktop code, config, or dependency
  belongs in the repo until a dispatch says so.

## Backend and data

- **Supabase.** Postgres plus Supabase auth, storage, and realtime.
- **Access pattern:** `supabase-js` against row-level security policies, with
  generated TypeScript types. **No ORM in v1** — see
  [ADR-002](../03-decisions/ADR-002-v1-stack.md).
- **Schema, migrations, RLS policy design:** TODO(owner). Nothing exists yet.

RLS is the authorization boundary, not a convenience layer. Changing a policy is
a RED lane item.

## Voice transcription

**Undecided.** The candidates are Deepgram and ElevenLabs Scribe.

TODO(owner) — pick one and record it as an ADR. Until then, do not write client
code that assumes either provider's SDK, response shape, or streaming model.
This is tracked as an open question in
[PROJECT-STATE.md](../01-state/PROJECT-STATE.md).

## Intelligence

- **Anthropic API.** The model layer for Noema's intelligence features.
- Which models, prompt architecture, context strategy, streaming, and cost
  envelope: TODO(owner).

## Delivery and operations

| Concern | Service |
|---|---|
| Web hosting | Vercel |
| Mobile builds and store submission | EAS |
| Error monitoring | Sentry |
| Product analytics | PostHog |
| Subscriptions and entitlements | RevenueCat |
| Issue tracking | Linear (mirrors `docs/01-state/BRANCH-NOTES.md`; the repo wins) |

Environments: none exist yet. Staging and production Supabase projects are an
owner task. See [PROJECT-STATE.md](../01-state/PROJECT-STATE.md).

## Localisation

- **English-first.** English is the primary language and the default.
- **Arabic is supported, not first-class.** Arabic is a supported locale; it does
  not drive layout, typography, or copy decisions in v1.
- RTL handling, font stack, and translation workflow: TODO(owner).

## Not decided

Everything below is open. Do not infer an answer and build on it.

- Product definition and scope — TODO(owner)
- Voice provider: Deepgram vs ElevenLabs Scribe — TODO(owner)
- Data model and RLS policy set — TODO(owner)
- Anthropic model selection and prompt architecture — TODO(owner)
- Offline behaviour and sync — TODO(owner)
- Testing strategy and CI — TODO(owner)
- Name: "Noema" trademark and domain availability unverified; fallback is
  "Kayan" — TODO(owner)
