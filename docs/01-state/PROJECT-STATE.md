# NOEMA — PROJECT-STATE

The authoritative record of what is true right now. If this file and your
memory of the project disagree, this file is right and you are stale.

**Last verified:** 2026-08-18, CTRL-002 opening, verified against main at
`59db981` (the CTRL-001 close-out merge) and review records
REVIEW-001/REVIEW-002
**Verification method:** controller read of main via GitHub API —
PROJECT-STATE.md, BRANCH-NOTES.md, HANDOFF.md, both review records, and
AGENTS.md re-hashed to the recorded fingerprint (sha256 0ff02d20…f013,
5378 bytes, match).

## Project facts

Things that are stable and rarely change: what this is, who it serves, what it
runs on, where it is deployed.

- **What it is:** TODO(owner) — the product definition has not been recorded in a
  dispatch. Do not infer one from the repo name.
- **Stack:** Expo (React Native) for mobile and web; Tauri desktop later, not in
  v1. Supabase for Postgres, auth, storage, and realtime, accessed via
  `supabase-js` with RLS and generated types — no ORM in v1. Anthropic API for
  intelligence. Voice transcription is undecided between Deepgram and ElevenLabs
  Scribe. Vercel (web), EAS (store builds), Sentry, PostHog, RevenueCat, Linear.
  English-first; Arabic supported but not first-class. Full detail in
  `docs/00-master/ARCHITECTURE.md`.
- **Environments:** **none yet.** No staging or production Supabase project
  exists. Creating both is an owner task and has not been done. There is no
  deployed web app, no EAS project, and no store presence.
- **Owners:** Ahmed (owner — sole holder of production credentials, approves
  scope, merges). Noema Controller Claude Project conversation (controller —
  dispatches, adjudication, Linear sync, controller-only sections of this file).

## Current state

As of 2026-08-17:

- Repository `Zed-Concept/noema` exists and is **private** (verified —
  `docs/05-quality/evidence/001-scaffold/repo-visibility.json`).
- One commit on `main`: the governance scaffold.
- Files tracked: `AGENTS.md`, `README.md`, `.gitignore`, and the `docs/` tree
  (`00-master`, `01-state`, `02-roles`, `03-decisions`, `04-reviews`,
  `05-quality/evidence`). `06-content` is intentionally absent — Noema is not a
  content-driven site.
- **Zero application code.** No `package.json`, no Expo project, no dependencies,
  no CI, no Supabase config. This is deliberate and was the explicit scope of the
  scaffold dispatch.
- Two ADRs accepted: ADR-001 (operating model), ADR-002 (v1 stack).
- Scaffold + AGENTS.md restoration merged to main; AGENTS.md sha256
  0ff02d20…f013 (5378 bytes); REVIEW-001 (FAIL, resolved) and REVIEW-002
  (PASS) on record; the scaffold handoff's "AGENTS.md does not render" flag is
  resolved as of the merge — noted here, the old handoff block itself stays
  untouched.

## Binding rulings

Decisions that are settled. Do not relitigate these; if one is wrong, raise it
explicitly and get it overturned on the record.

| # | Ruling | Date | Full body |
|---|---|---|---|
| 1 | The multi-agent operating model is fixed: controller dispatches, one builder per branch, a reviewer of record who never built the unit, advisory review only on named triggers, and `BRANCH-NOTES.md` as the authoritative lock record with Linear as a mirror. | 2026-08-17 | `docs/03-decisions/ADR-001-operating-model.md` |
| 2 | The v1 data layer is Supabase — not Neon plus assembled services — and carries no ORM: `supabase-js` against RLS with generated types. Drizzle is not adopted in v1. | 2026-08-17 | `docs/03-decisions/ADR-002-v1-stack.md` |
| 3 | Payment, purchase, entitlement, and billing-webhook logic changes are RED lane. | 2026-08-18 | `docs/03-decisions/ADR-003-red-lane-payments.md` |

## Active work

What is in flight, who owns it, and what it is blocked on. One row per stream.

| Stream | Owner | Status | Blocked on |
|---|---|---|---|
| Unit A — app skeleton (Expo init + CI baseline; no Supabase) | Claude Code, dispatched by CTRL-002 | LOCK `REVIEW`; REVIEW-005 (FAIL) fix loop complete — all five findings resolved — and REVIEW-006 (FAIL) fix loop complete — its single low finding, the install producer's non-total duration mask, resolved with a committed positive control (`docs/05-quality/evidence/002d-fix-loop-3/normalizer-control.txt`). The stability gate now fails by exit status when any gated artifact differs, proven by a committed negative control; the install claim has its own `npm ci` transcript; the stale prose and whitespace defects are fixed at their generating sources. Which artifacts are gated vs run-varying, and their counts, live in the evidence README — `docs/05-quality/evidence/002b-fix-loop/README.md`, "Gated versus run-varying" — the single authoritative place for the stability gate's statistics (loop-specific artifacts are classified in their own loop's README); this row no longer duplicates any of it (controller-authorized shape change, this dispatch). Loop evidence in `docs/05-quality/evidence/002d-fix-loop-3/`. Gates re-run green; CI still NOT RUN until the PR opens. Owner smoke test 2026-08-18: rendering **PASS on web** (`002c-owner-smoke/attestation.md`), NOT RUN on simulator/emulator/device. | Re-review of the fix commit |
| Unit B — Supabase wiring (supabase-js, generated types, staging env plumbing) | Controller + owner | Queued | Staging Supabase project creation (owner task, RED lane) |
| Supabase projects, staging + production | Owner, guided by CTRL-002 | In progress | — |

Unit A/B split ruled by the owner 2026-08-18 (CTRL-002): the skeleton has no
Supabase dependency and proceeds unblocked; Supabase wiring follows as its
own dispatched unit once the staging project exists.

## RED lane

Work that is identified but blocked pending explicit approval. Listing it here
is not approval to start it. The full RED lane is defined in `AGENTS.md`; these
are the items already foreseeable for Noema:

- Creating the staging and production Supabase projects, and anything that writes
  to or queries production once it exists.
- The first auth and RLS policy set — RED on arrival, and an advisory-reviewer
  trigger per ADR-001.
- RevenueCat configuration, EAS submit, OTA publish, store listings, and
  production Vercel deploys.
- Handling any provider key (Deepgram, ElevenLabs, Anthropic, RevenueCat, Sentry,
  PostHog). Builders receive staging keys only.

## Learnings digest — BINDING

The most valuable section in this file. Each entry is something that went wrong
and the rule derived from it. Keep entries short; move long narratives to
`STATE-LEARNINGS.md` once this section outgrows a screen.

| # | What happened | Rule now in force |
|---|---|---|
| 2 | Markdown was stripped twice when governance text was pasted inline between tools | Governance documents transfer between tools as files with a pre-agreed sha256, never as inline paste |
| 3 | A unit dispatched as Sonnet was built by an Opus session; the LOCK had to record a discrepancy | The owner sets /model to the dispatched model before pasting; the builder verifies and stops on mismatch before any work |
| 4 | A reviewer dispatch said REVIEW-NNN.md must be "the only change," conflicting with the mandatory HANDOFF block; Codex correctly stopped | Reviewer dispatches always scope exactly two files: the REVIEW record and the HANDOFF append |

## Known issues

Defects that are real, understood, and not yet fixed. An issue that is not
written here does not exist to the next session.

| # | Issue | Impact | Status |
|---|---|---|---|
| 1 | REVIEW-001 was committed without a HANDOFF block, under the same flawed dispatch wording as learning 4. | Accepted inconsistency; not to be repaired by editing history. | Accepted |

## Open questions

Things genuinely undecided. Move each to **Binding rulings** once settled — an
open question that quietly becomes a decision is how state files start lying.

1. **Voice transcription provider: Deepgram or ElevenLabs Scribe.** Undecided.
   Blocks any client code that touches transcription. Resolve with an ADR, not a
   commit.
2. **The name "Noema": trademark and domain availability unchecked.** Fallback
   name is **Kayan**. Owner task. Until this clears, do not put the name into
   anything outward-facing — store listings, domains, or public copy.

## Index of satellite files

Populated only after this file is split (see the skill's `references/scaling.md`).
Not yet split; no satellites exist.

- `STATE-LEARNINGS.md` — full learning narratives
- `STATE-KNOWN-ISSUES.md` — full issue bodies
- `STATE-ARCHIVE.md` — superseded state, kept for the reasoning trail
- `STATE-REFERENCE.md` — long reference material
