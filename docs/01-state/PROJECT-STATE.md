# NOEMA — PROJECT-STATE

The authoritative record of what is true right now. If this file and your
memory of the project disagree, this file is right and you are stale.

**Last verified:** 2026-08-19, CTRL-003 opening, verified against main at
`2698332` (the PR #3 merge of the CTRL-002 close-out, GitHub-signed,
parents `8d648bb` + `9605807`)
**Verification method:** controller read of main via GitHub API — both
state files, AGENTS.md (sha256 re-verified `0ff02d20…f013`, 5378 bytes),
ARCHITECTURE.md, the commit list, and the branch inventory (`main` is the
only remote branch; no LOCK in BUILD other than controller state lag).

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
- **Environments:** staging Supabase exists — project `noema-staging`,
  region Americas / East US (North Virginia), created by the owner
  2026-08-18; credentials owner-held, never in the repo; builders receive
  the staging URL + anon key only, at Unit B dispatch. **Production is
  deliberately deferred** (free-tier slot went to staging): create it in the
  same region before any launch-facing unit — hard requirement. There is no
  deployed web app, no EAS project, and no store presence.
- **Owners:** Ahmed (owner — sole holder of production credentials, approves
  scope, merges). Noema Controller Claude Project conversation (controller —
  dispatches, adjudication, Linear sync, controller-only sections of this file).

## Current state

As of 2026-08-19:

- Repository `Zed-Concept/noema` is **private**; `main` is at `2698332`
  (PR #3, the CTRL-002 close-out state merge).
- **Unit A is merged**: Expo SDK 57 managed app at the repo root — TypeScript
  strict, expo-router, npm with committed lockfile, ESLint + Prettier,
  jest-expo — one placeholder home screen, user-visible name `ZC App (dev)`.
- **CI is live and green**: `.github/workflows/ci.yml` runs install,
  typecheck, lint, test, format:check on pull_request and push-to-main; its
  first two runs (PR #2 and the merge push) both succeeded, retiring the
  Node 26-local vs Node 24-CI question.
- **The evidence system is real**: a byte-stability gate whose exit status is
  its contract (proven by committed negative control), a normalizer positive
  control, per-artifact gated/run-varying classification owned by the
  evidence READMEs, and an owner attestation for web rendering
  (`docs/05-quality/evidence/002c-owner-smoke/attestation.md`). Device
  rendering remains NOT RUN.
- Review chain for Unit A: REVIEW-003/004/005/006 FAIL → fix loops →
  REVIEW-007 PASS, all immutable under `docs/04-reviews/`.
- **Linear mirror is active**: workspace team **NOE**, issues NOE-1..5
  mirror the LOCK records, one-way repo → Linear, repo wins.
- Scaffold-era facts stand: ADR-001/002/003 accepted; AGENTS.md sha256
  0ff02d20…f013 (5378 bytes); REVIEW-001 (FAIL, resolved) and REVIEW-002
  (PASS) on record.

## Binding rulings

Decisions that are settled. Do not relitigate these; if one is wrong, raise it
explicitly and get it overturned on the record.

| # | Ruling | Date | Full body |
|---|---|---|---|
| 1 | The multi-agent operating model is fixed: controller dispatches, one builder per branch, a reviewer of record who never built the unit, advisory review only on named triggers, and `BRANCH-NOTES.md` as the authoritative lock record with Linear as a mirror. | 2026-08-17 | `docs/03-decisions/ADR-001-operating-model.md` |
| 2 | The v1 data layer is Supabase — not Neon plus assembled services — and carries no ORM: `supabase-js` against RLS with generated types. Drizzle is not adopted in v1. | 2026-08-17 | `docs/03-decisions/ADR-002-v1-stack.md` |
| 3 | Payment, purchase, entitlement, and billing-webhook logic changes are RED lane. | 2026-08-18 | `docs/03-decisions/ADR-003-red-lane-payments.md` |
| 4 | Operating-model seats: controller = Fable 5 / Max effort (Extra is the sanctioned fallback, noted when used); primary builder = Fable 5 in Claude Code, effort set per ruling 5; reviewer of record = Codex Sol / Ultra, fresh session per review. In-flight units finish under their issued terms. | 2026-08-18 | this row (owner ruling, CTRL-002) |
| 5 | Effort taxonomy: build units → Ultracode (xhigh + workflows); evidence, gate, and measurement work and review-fix loops → Max; scribe-class chores → High. The controller names the tier in every dispatch. | 2026-08-18 | this row (owner ruling, CTRL-002) |
| 6 | Every builder HANDOFF discloses workflows run and per-workflow subagent fan-out. Workflow self-verification is supplementary and is never the review; the reviewer of record gates. | 2026-08-18 | this row (owner ruling, CTRL-002) |
| 7 | Dispatches live in controller conversations, not the repo — so any authorization a reviewer could dispute is restated on the record in the next review dispatch. | 2026-08-18 | this row (controller practice, CTRL-002) |
| 8 | Naming: no user-visible field may be or contain "noema" until trademark clearance (fallback: Kayan). Internal identifiers — repo, slug, npm package names — are exempt. `expo.scheme` is quasi-outward: frozen pending clearance, a hard gate before any distribution unit. | 2026-08-18 | this row (owner ruling + REVIEW-003) |
| 9 | The Linear mirror is active (team NOE): controller syncs Linear from the repo after every merge; one-way, repo wins. The earlier deferral ruling is void. | 2026-08-18 | this row (owner ruling, CTRL-002) |

## Active work

What is in flight, who owns it, and what it is blocked on. One row per stream.

| Stream | Owner | Status | Blocked on |
|---|---|---|---|
| Unit B — Supabase wiring (supabase-js client, generated types, staging env plumbing) | Claude Code (Fable 5 / Ultracode / fresh session); RoR Codex | Built on `feat/supabase-wiring` — HANDOFF written, LOCK REVIEW | Reviewer-of-record review (Codex, fresh session) |
| Production Supabase project | Owner | Parked by ruling — create in East US (North Virginia) before any launch-facing unit | Free-tier slot or Pro upgrade at that time |

Unit A merged 2026-08-19 at `8d648bb` (PR #2, REVIEW-007 PASS); its full
record lives in the feat/app-skeleton LOCK and the HANDOFF chain.

**Active controller session:** CTRL-003 Supabase Wiring — name confirmed
against this file at opening (2026-08-19). The successor is named at
CTRL-003 close-out.

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
| 5 | Two LOCK statuses went stale because a state branch cannot flip its own status and no one reconciled post-merge | Every controller state commit begins by reconciling all LOCK statuses against merge reality |
| 6 | A builder verified against a stale local clone and stopped on a phantom mismatch | Dispatches to reused working copies open with fetch + confirm of the expected origin tip SHA, which the dispatch names; and the owner's shared working copy is synced after every merge (pull main, safe-delete merged locals, prune remote refs) |
| 7 | Broad reproducibility claims were disproven per-artifact across three reviews | Claims of byte-stability must state their normalization and be proven per-artifact before handoff; gates' exit codes are their contract |

## Known issues

Defects that are real, understood, and not yet fixed. An issue that is not
written here does not exist to the next session.

| # | Issue | Impact | Status |
|---|---|---|---|
| 1 | REVIEW-001 was committed without a HANDOFF block, under the same flawed dispatch wording as learning 4. | Accepted inconsistency; not to be repaired by editing history. | Accepted |
| 2 | 22 npm audit advisories (7 moderate, 15 high), all transitive in Expo's SDK-pinned build tooling. | No runtime exposure identified; `npm audit fix --force` would break SDK pins. | Accepted — revisit at each Expo SDK upgrade |

## Backlog — recorded nits

Not defects; each is gated or batched. Recorded so they exist to the next
session.

- Route-derived names leak into user-visible chrome (header + tab read
  `index`) and the web document title is unset — one item, **hard gate before
  any user-facing unit**.
- Gate-set expansion (add `normalizer-control.txt` to the gated set) —
  batched to the next unit that touches the gate machinery.
- `LICENSE` file absent; OPERATIONS.md staging/production rows are
  TODO(owner); CI job label doesn't name the format step.
- Three unused optional navigation deps retained — revisit at the first
  device-build unit; an Expo Go / device attestation remains welcome,
  gating nothing.

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
