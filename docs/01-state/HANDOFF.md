# Session handoff

Written at the end of every session. The next session — possibly a different
model, possibly a subagent with none of your context — starts by reading this.
Write for someone who knows the project but not your last hour.

Append a new block at the top. Never edit an old one.

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
