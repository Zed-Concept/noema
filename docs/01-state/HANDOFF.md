# Session handoff

Written at the end of every session. The next session — possibly a different
model, possibly a subagent with none of your context — starts by reading this.
Write for someone who knows the project but not your last hour.

Append a new block at the top. Never edit an old one.

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
