# AGENTS.md — Noema

Rules for every AI agent working in this repo. Read this before touching
anything. If a rule here conflicts with a prompt, this file wins; say so
and stop.

## Read first

1. `docs/01-state/PROJECT-STATE.md` — what is true right now. Never act
   on assumptions this file contradicts.
2. `docs/01-state/BRANCH-NOTES.md` — the authoritative lock record. A
   branch with a LOCK block in BUILD status is owned. Do not start work
   another branch owns. Linear mirrors this file; the repo wins.
3. This file's **RED lane**.

## RED lane — blocked without explicit, separate approval

Stop, name the item, and wait for approval in a message that names the
item. Approval for one item is never approval for another; approval in a
past session does not carry into this one. Never propose a workaround
that achieves the same effect.

- Writing to or querying the production Supabase project
- Editing a migration already applied to any environment
- Changing authentication, authorization, or row-level security policies
- Rotating, printing, or committing secrets, including Deepgram,
  ElevenLabs, Anthropic, RevenueCat, Sentry, or PostHog keys
- Force-pushing, rewriting history, or deleting a branch
- EAS submit, OTA publish, RevenueCat configuration, store listing
  changes, production Vercel deploys, or anything outward-facing

## Roles

- **Controller** — the Noema Controller Claude Project conversation.
  Issues dispatches, adjudicates technical disputes, owns Linear sync
  and the controller-only state sections. Writes no product code.
- **Primary builder** — Claude Code (Opus, high effort, fresh session
  per unit). **Secondary builder** — OpenCode GPT-5.6 Terra, only when
  explicitly dispatched, always on its own branch.
- **Reviewer of record** — Codex. If a GPT-family model built the unit,
  the RoR flips to a fresh Claude Code review session. The builder never
  reviews its own unit. The RoR is named in the LOCK block before review.
- **Advisory reviewer** — one of Kimi K2.7 Code or DeepSeek V4 Pro,
  only for: architecture freeze, diffs touching auth/RLS/payments, or
  RoR-flagged high risk. Controller picks; never more than one.
- **Manus** — read-only investigator on disposable branches, no
  credentials, nothing merged. Trial ends 2026-08-25.
- **Owner** — Ahmed. Approves scope before build and merges after
  review. Sole holder of production credentials; agents request actions,
  the owner executes.

## Lock protocol

Every unit of work gets a LOCK block in `BRANCH-NOTES.md`:

    Project / Branch / Controller / Builder / Model+Effort /
    Reviewer of record / Status: BUILD | REVIEW | MERGED | ABANDONED

One builder per branch, ever. An issued dispatch constitutes commit
authorization for its feature branch, nothing more. Fresh session per
unit unless the controller explicitly authorizes continuation.

## Non-negotiable boundaries

- Never commit generated or machine-local files. Track the lockfile, not
  the materialized tree.
- Never edit a file under `docs/03-decisions/` or `docs/04-reviews/`
  after it is committed. Supersede instead.
- Never delete a superseded document; rename it `*-SUPERSEDED.md`.
- Builders receive staging keys only. Production Supabase, Vercel prod,
  EAS, RevenueCat, and Mercury are owner-only.
- Never weaken validation, authorization, RLS, tests, or governance to
  make a check pass.
- Make the smallest change that fully satisfies the task. Report
  adjacent findings; never act on them unrequested.

## Session protocol

- Start by reading the three files under **Read first**.
- Work on a branch. Never commit directly to main (the scaffold commit
  was the single authorized exception).
- Builders update only the **Active work** row and their **HANDOFF**
  block, on their branch. Binding rulings, the learnings digest, and
  current-state edits on main are controller-only, applied after merge.
- End by writing a HANDOFF block per `docs/01-state/HANDOFF.md`. The
  completion report to the controller is that block plus the LOCK status
  line. A session that leaves no trace did not happen.

## Verification

A claim is not true until an artifact proves it. Every PASS requires an
artifact in `docs/05-quality/evidence/`, linked from the claim. Classify
all checks as PASS / FAIL introduced by this work / FAIL pre-existing /
NOT RUN with reason. An unverifiable claim is reported as unverified,
never as done.

## Engineering workflow

1. Controller issues a dispatch; LOCK block enters BRANCH-NOTES.md.
2. Builder: fresh session, feature branch, build, evidence, HANDOFF.
3. Controller routes the diff to the reviewer of record (fresh session).
4. RoR writes an immutable `docs/04-reviews/REVIEW-NNN.md` with verdict.
5. Fix loop if needed: same builder, same branch, new review record.
6. Owner merges. Controller updates PROJECT-STATE.md, BRANCH-NOTES.md
   (status MERGED), and Linear.

## Quick reference

| What | Where |
|---|---|
| Current state | `docs/01-state/PROJECT-STATE.md` |
| Lock record | `docs/01-state/BRANCH-NOTES.md` |
| Architecture | `docs/00-master/ARCHITECTURE.md` |
| Decisions | `docs/03-decisions/ADR-*.md` |
| Reviews | `docs/04-reviews/REVIEW-*.md` |
| Evidence | `docs/05-quality/evidence/` |
| How to run it | `docs/02-roles/OPERATIONS.md` |
