# NOEMA — PRODUCT DEFINITION v1

**Status:** ruled. Owner-approved 2026-08-22 ("approved with both amendments",
then "addendum approved"); ratified by the owner's merge of PR #8 and this
close-out commit. This document closes the long-standing
`What it is: TODO(owner)` in `docs/01-state/PROJECT-STATE.md`. Every future
dispatch steers by it. Supersedes any product description living only in chat.

## What it is

A voice-first AI second brain. You speak — or type — thoughts the moment they
occur; the system stores them privately, transcribes them, and an AI layer
organises, distils, connects, resurfaces, and discusses them with you. The
user's only job is to capture. Everything downstream is the machine's job.

## Principles — binding

1. **Universal capture.** No input is ever refused or lost for reasons of
   language or dialect. Audio is retained permanently; transcription is
   best-effort at the provider frontier and re-runnable as models improve;
   mixed-language speech is a first-class case. (Owner amendment: this governs
   **content** — what the user speaks. UI locale is staged separately, below.)
2. **Zero-friction capture.** Thought to recording in under a second, one
   thumb, eyes optional. Capture works offline and uploads later.
3. **The AI organises, never the user.** No mandatory folders, tags, or
   filing. Structure is generated, not maintained.
4. **Privacy is structural.** Owner-only RLS at the database layer, proven by
   evidence, stated plainly in the product. Only claims the architecture
   actually enforces are ever made.
5. **Brain-first, absorb outward.** The long-term ambition is one app that
   replaces the user's tool stack. The route is staged: capture and memory
   excellence first, integrations as bridges and reconnaissance, then native
   replacement of a category only when the memory substrate makes Noema's
   version categorically better than the standalone tool it replaces.
   Execution lives in external tools until that moment. Absorption is
   triggered by evidence of users trying to live in Noema for a job, never by
   roadmap ambition.
6. **Notifications return the user's own words at the right moment**, never
   engagement bait. Progress is a mirror — a growing graph, weekly reflection
   — never a score.
7. **Zero reset cost.** Every surface behaves as if it has already read the
   corpus. The user never rebuilds context, restates the same thing, or
   stitches last week to today by hand.

## Capture inputs — staging

- **v1:** voice (the hero) and typed input (an equal citizen, the quiet second
  path — and the graceful fallback when a mic is denied or transcription
  fails).
- **v1.x:** screenshots and photos — vision-derived text through the same
  pipeline.
- **Later:** video (audio track plus sampled frames), documents/PDFs, shared
  links.

One `kind`/`source` discriminator decision covers all of these; it gets an ADR
when scheduled, together with whether derived text generalises inside
`transcripts` or moves to a sibling table.

## Layers — roadmap order

- **L0 Capture loop** *(data layer merged as Unit C)*: record or type, private
  storage, transcript, library.
- **L1 Memory engine:** embeddings, entity extraction, AI-drawn links between
  captures, proactive "this connects to…" at capture time. Memory is
  **curated for durability** — recurring themes, decisions, commitments,
  relationships, unresolved threads — not merely embedded for retrieval.
  Ships before its visual faces.
- **L2 Dialogue:** ask-your-memory chat over the corpus first; realtime voice
  conversation after, in three tiers — (a) the app speaks (TTS over summaries,
  resurfaced thoughts, planner briefs); (b) voice command in, action out, plus
  OS-level entry points (Siri Shortcuts / App Intents, Assistant intents);
  (c) full duplex streaming with barge-in. Auto language detection and
  code-switching throughout. Chat carries session modes — brainstorm,
  challenge, organise, listen — that condition how the agent uses the corpus.
- **L3 Views and rituals:** Graph (the signature view); AI-generated topic
  maps, never a hand-built canvas; a tasks view with kanban-style lanes over
  extracted tasks only; Planner as a morning/evening ritual; resurfacing of
  commitments and unfinished threads (prospective memory).
- **L4 Integrations:** MCP-first outbound — Notion, calendars (Apple
  on-device, Google), tasks (Todoist / Reminders), Readwise inbound, markdown
  export; one-tap externalisation of a thought cluster into a page, draft, or
  document. Provider tokens live server-side only, encrypted, owner-only RLS,
  reached through an edge function. Each integration is a RED unit.

## Sharing — staged

Absent from v1 by construction: the merged schema makes a cross-user read
unrepresentable. The principle when it arrives is **share outputs, not the
stream** — the raw capture vault stays sacred, because a second brain whose
raw memory is casually shareable teaches its user to self-censor at the mic.
Order: (1) a distilled idea as a read-only page via signed, revocable,
expiring links; (2) a single capture, with audio behind an extra deliberate
toggle; (3) topic digests and mind-graph excerpts; (4) talk-space session
transcripts; (5) much later, shared spaces where several people capture into a
common brain. Handing someone a task goes through integrations, not an in-app
social layer. Every sharing mechanism is RED-lane and outward-facing, so all of
it sits behind the trademark gate.

## Language and locale

Content languages: all, per principle 1, provider-bounded with graceful
degradation. Transcription-provider selection (open question 1) is weighted
first on language and dialect breadth, code-switching quality, and realtime
capability; per-language routing is an allowed future architecture. UI locale
is staged: English first, Arabic (full RTL) second, others later. Logical-
direction layout is mandatory from the first UI commit so the RTL flip is a
mirror, not a redesign.

## Naming

Feature names are plain: **Chat**, **Graph**, **Journal**, **Planner**. No
sub-brands — a calm tool does not need five of them, and the brand lives in
the product name. Borrowed or coined vocabulary from other products is
excluded outright. The app name renders from a single config source and stays
a placeholder in every user-visible string, icon, and store-facing surface
until the trademark gate clears (ruling 8; fallback name **Kayan**).

## Anti-goals

Permanent, because they are about identity rather than scope:

- **No therapy or mental-health positioning, ever.** Noema is a thinking tool
  that handles feelings gracefully, not a wellness product — that market
  carries duty-of-care, crisis-pathway, and regulatory obligations this
  product is not built for.
- **No social-feed mechanics** — no public profiles, discovery, or likes.
  Sharing means sending, never broadcasting. "Replaces every app" means the
  user's *tool* stack.

Anti-goals of the **v1 era** (sequencing, not ceilings): no full
project-management suite; no XP, points, or streaks; no sharing or
collaboration; no user-maintained taxonomy.

## UX reference

The home screen is the record button. A large capture control in the thumb
zone, a reverse-chronological feed of capture cards, search above it, and
nothing else competing for attention; recording is a full-screen takeover with
waveform and strong haptics; saving returns home instantly with the card
already present and marked transcribing. New layers appear as quiet touches —
a resurfaced card, a connection chip, a language badge — while Graph, Chat,
Tasks, and Planner live in navigation rather than crowding the feed. Desktop
is a three-pane variant: sidebar, capture list, detail with playback,
transcript, summary, tasks, connected thoughts, and externalisation actions.
Standing constraints: system-level entry points (widgets, Action Button, watch
later); RTL-safe logical layout; offline-first capture; calm,
typography-forward chrome. The `status` state machine
(`recorded → transcribing → ready → failed`) maps directly onto card states.

## Provenance

Ruled across CTRL-004 (2026-08-22). Derived from the owner's founding brief in
CTRL-001, the merged Unit C entity scope, and the stack decisions in
`PROJECT-STATE.md`. The "all-in-one" ambition from CTRL-001 is reconciled in
principle 5: destination and route, not a contradiction. Concept-level lessons
drawn from a competitor document were rewritten in Noema's own language; no
external product's coined terms or text appear here.
