# NOEMA — PROJECT-STATE

The authoritative record of what is true right now. If this file and your
memory of the project disagree, this file is right and you are stale.

**Last verified:** 2026-08-27, CTRL-006 post-merge (Unit E), verified against
main at `4e74874125ed483d08919d64ee3e85140cca5e39` (the PR #17 merge of
`feat/session-durability`, GitHub-signed, parents `7caf23e1` + `ef3db3d8`)
**Verification method:** controller read of main via the GitHub API — the
merge commit and its parents, the branch inventory (`main` plus the
controller's own open state branch), PROJECT-STATE on main diffed against
the CTRL-006 opening version (one hunk, the builder's Active work row —
builders touched nothing else in this file), REVIEW-028's merge
recommendation read in full and its Known-Issue block copied below
byte-for-byte. `AGENTS.md` unchanged since `71630bba` (path history).

## Project facts

Things that are stable and rarely change: what this is, who it serves, what it
runs on, where it is deployed.

- **What it is:** a voice-first AI second brain — see `docs/00-master/PRODUCT.md`. The product definition is ruled and
  recorded in `docs/00-master/PRODUCT.md` (owner-approved 2026-08-22 with two
  amendments and an addendum; ratified by the owner's merge of PR #8). That
  document governs: every future dispatch steers by it.
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
  the staging URL + publishable key only, at dispatch (the publishable
  key is the anon-key successor; the state files' earlier "anon key"
  wording meant this key — handed for Unit B on 2026-08-19). **Production is
  deliberately deferred** (free-tier slot went to staging): create it in the
  same region before any launch-facing unit — hard requirement. There is no
  deployed web app, no EAS project, and no store presence.
- **Owners:** Ahmed (owner — sole holder of production credentials, approves
  scope, merges). Noema Controller Claude Project conversation (controller —
  dispatches, adjudication, Linear sync, controller-only sections of this file).

## Current state

As of 2026-08-26, CTRL-006 opening:

- Repository `Zed-Concept/noema` is **private**; `main` is at
  `4e74874125ed483d08919d64ee3e85140cca5e39` (PR #17, the Unit E merge).
  Every merged branch has been deleted; the controller's open state branch
  is the only other ref.
- **Unit E is merged** at `4e748741` (PR #17) on REVIEW-028 PASS, with
  **Known Issues 1–2 open at HIGH** under ruling 28 (see Known issues).
  Chain on the branch: REVIEW-023 FAIL, REVIEW-024 FAIL, REVIEW-025 FAIL
  (stop rule), subtraction cycle 3, REVIEW-026 FAIL, REVIEW-027 FAIL (one
  line each), REVIEW-028 PASS; REVIEW-023-ADVISORY adjudicated into cycle 1.
  One new dependency, `expo-file-system`. Evidence `006a`–`006d`; `006d` is
  the final claims table and Known-Issue register.
- **Unit D is merged** at `6ee4407d` (PR #11) — email one-time-code auth, the
  chunked SecureStore session adapter, route protection, the chrome gate — on
  owner override of a REVIEW-022 FAIL over one open finding, finding 3 (purge
  success inferred; re-authentication demand not restart-durable). **Unit E
  closed it** (REVIEW-028; the exposure class it uncovered ships open). **Phase B live evidence for the auth surface has never run**: no
  one-time code has been delivered, no live session measured, no device has
  participated. Unit F carries it.
- **Seats at CTRL-006** (ruling 22): controller Fable 5 / Max; primary builder
  Fable 5 — Ultracode for build units, Max for fix loops; reviewer of record
  Codex Sol / Ultra, fresh session per review; one advisory seat (DeepSeek V4
  Pro or Kimi K2.7 Code) on the ADR-001 triggers only. The **Manus
  investigator seat lapsed 2026-08-25** — the trial end `AGENTS.md` names has
  passed; no dispatch names it until the owner renews.
- **Staging auth posture is applied** (rulings 23–24), all owner-executed.
  Custom SMTP to the owner's Mailtrap Email Sandbox and a one-time-code
  template rendering `{{ .Token }}` were applied in CTRL-005 and unrecorded
  until now — evidenced by a captured message to `phaseb-check-1@example.com`
  at 2026-08-26 05:06Z, subject "Your sign-in code", a six-digit code in the
  body. Confirm email off and JWT expiry 600 seconds confirmed by the owner
  2026-08-26. The sandbox meter shows a 50-message ceiling; that is the
  live-run email budget until the owner states otherwise. **Device for the
  ADR-named test: the owner's iPhone**, running the app in Expo Go — the
  Unit F procedure is written for that runtime.
- **Unit C is merged** at `d794328` (PR #8): `profiles`, `captures`,
  `transcripts` with FORCE RLS and owner-only policies, the
  `handle_new_user()` SECURITY DEFINER provisioning trigger, and the private
  `captures-audio` bucket. Merged on owner override of a REVIEW-018 FAIL whose
  remaining findings were all claim-trimming with no security defect.
- Unit B is merged: `@supabase/supabase-js` 2.112.3; one shared typed
  client reading `EXPO_PUBLIC_SUPABASE_URL` +
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, failing loudly when unset;
  generated-types plumbing (exact-pinned `supabase@2.115.0`,
  owner-executed generation); literal `.env*` hygiene; the 003a evidence
  suite (five scripts, eleven transcripts, claims-table README).
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
- **Linear mirror is active**: workspace team **NOE**, one-way repo → Linear,
  repo wins. The issue inventory was not re-verified at this commit; the
  CTRL-006 first sync reconciles it against the LOCK record.
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
| 10 | Schema/RLS migration application is owner-executed: builders author migration and policy files in-repo; the owner applies them to staging (same credential class as `types:gen`); builders verify post-apply. Builders still receive the staging URL + publishable key only. | 2026-08-19 | this row (owner ruling, CTRL-004) |
| 11 | Three standing security rulings from REVIEW-014 (advisory), binding on every future unit. **S1:** every function migration pins `revoke all on function ... from public, anon, authenticated` and grants EXECUTE only where intended; any SECURITY DEFINER non-trigger function in a client-reachable schema is RED-lane class. **S2:** any grant to `service_role` re-triggers an advisory review before merge — that role bypasses the entire owner-only matrix. **S3:** every future public-schema table repeats ENABLE + FORCE + per-operation policies; a table granted CRUD to `authenticated` without RLS enabled is wide open. | 2026-08-23 | this row (owner merge of PR #8 ratifies; REVIEW-014) |
| 12 | v1 authenticates by **email one-time code**, and the session is persisted through a **SecureStore-backed chunking adapter** that fails closed. Password, magic-link, and native OAuth flows are not available at v1 — each needs a redirect scheme, and `expo.scheme` is frozen by ruling 8. Web keeps `localStorage`; no token-storage claim may be made unqualified across platforms. | 2026-08-24 | `docs/03-decisions/ADR-004-auth-session-v1.md` |
| 13 | `signOut()` passes `scope: 'local'` — a routine sign-out never destroys another device's session. Token auto-refresh is **gated on AppState**, so a refresh never fires while the device is locked; SecureStore keeps `WHEN_UNLOCKED`. "Sign out everywhere" is a deliberate v1.x affordance, and until it exists there is no remote revocation. | 2026-08-24 | `docs/03-decisions/ADR-005-session-lifecycle.md` |
| 14 | The three-cycle fix budget counts only cycles triggered by an external `REVIEW-NNN` record. A builder's own pre-submission adversarial cycle is recorded but not charged — charging it would make self-review cost budget and reward shipping unreviewed. | 2026-08-24 | this row (controller ruling, CTRL-005) |
| 15 | The session adapter's read-integrity property is narrowed: a read fails closed to `null` when the index is missing, unparseable, out of range, inconsistent in chunk count or total length, **or when a recorded non-cryptographic checksum over the payload disagrees**. That checksum is corruption detection — of truncation, interleaved-writer hybrids, and accidental damage — and explicitly **not** tamper resistance. No claim of resistance to an adversary with write access to the secure store may be made; such an adversary already holds the tokens. | 2026-08-24 | `docs/03-decisions/ADR-006-read-integrity.md` |
| 16 | An ADR may narrow a single clause of an earlier ADR without superseding it wholesale. The narrowing ADR names the exact sentence it replaces and states that the rest stands; the earlier ADR's `Status` stays `Accepted` and its file is not edited. A deliberate departure from the template's binary Accepted/Superseded model, taken because marking ADR-004 superseded would falsely retire the auth-method decision along with one read-integrity sentence. | 2026-08-24 | this row (controller ruling, CTRL-005) |
| 17 | The auth client **never self-schedules a refresh**: `autoRefreshToken: false` at construction, refresh initiated only by explicit foreground-gated calls, and a refresh whose persistence fails is **surfaced**, not silently dropped. Locked-device behaviour is NOT RUN and NOT CLAIMED in Phase A; Phase B carries a named physical-device test. Narrows one clause of ADR-005 per ruling 16; ADR-005's `scope: 'local'` and `WHEN_UNLOCKED` decisions stand. | 2026-08-24 | `docs/03-decisions/ADR-007-refresh-lifecycle.md` |
| 18 | ADR-007's persistence-failure **surfacing guarantee is native-only**. The write observer wraps the SecureStore-backed adapter; on web, storage is `localStorage` through the `supabase-js` default and no observer exists. No unqualified cross-platform claim of surfacing may be made in code, evidence, or product copy. Web surfacing is deferred and named, not claimed. Narrows one sentence of ADR-007 per ruling 16; ADR-007 otherwise stands. | 2026-08-25 | `docs/03-decisions/ADR-008-surfacing-scope.md` |
| 19 | Correcting a decision-text **overclaim** — narrowing a sentence so it states only what the architecture enforces — is **controller-class**, not an owner decision. ADR-006, ADR-007 and ADR-008 were the same motion: a reviewer finds an unqualified sentence, the remedy is to state the enforceable scope. That is bookkeeping against principle 4. Genuine trade-offs, where more than one defensible outcome exists, still go to the owner. | 2026-08-25 | this row (owner ruling, CTRL-005) |
| 20 | **Refresh entrances are not enumerated and not gated.** Library-internal refreshes — from construction, from session loading, from `signOut()`, and from paths not yet identified — are recorded, expected behaviour. The guarantee is persistence, not initiation: any rotated session that cannot be persisted is detected and forces re-authentication, durably across process restart. `autoRefreshToken: false` stands. Supersedes ADR-007 in full. | 2026-08-26 | `docs/03-decisions/ADR-009-refresh-lifecycle-supersession.md` |
| 21 | Unit D merged on **owner override of a REVIEW-022 FAIL**, over exactly one open finding — finding 3, non-durable purge demand. **ADR-009 is the last re-scope of Unit D.** If the CTRL-006 follow-up does not close finding 3, it ships as a Known Issue and the unit is finished regardless. A re-scope that reclassifies findings is legitimate once; twice is budget laundering. | 2026-08-26 | this row (owner ruling, CTRL-005) |
| 22 | Fable 5 is available again. **Builder seats return to Fable 5** — Ultracode for build-class, Max for fix loops — retiring the Opus 5 substitution from future HANDOFFs and restoring ruling 4. The **controller seat moves to Fable 5 at CTRL-006**, not mid-session: CTRL-005 finishes on the recorded substitution rather than muddying the provenance of its own close-out. | 2026-08-26 | this row (owner ruling, CTRL-005) |
| 23 | **Staging auth posture, permanent.** Confirm email **off**. The Magic Link and Confirm signup templates render `{{ .Token }}`, so the one-time code arrives as a code and never as a link (a link needs the scheme frozen by ruling 8). **Custom SMTP** on staging pointed at the owner's Mailtrap Email Sandbox — messages are captured, never delivered — with credentials in the Supabase dashboard only, owner-executed, never in the repo; the default sender's two messages an hour to pre-authorized addresses cannot sustain one review re-run, and a capture sandbox removes recipient constraints entirely. **JWT expiry lowered to 600 seconds** (ten minutes), left low, so the ADR-named device test can force a refresh window by keeping the phone locked longer than that, without a test hook (learning 10). Staging only; production decides each item at its own creation. | 2026-08-26 | this row (owner ruling, CTRL-006) |
| 24 | **Test identities and code relay.** Live auth evidence signs in as disposable, run-namespaced addresses whose mail the Mailtrap sandbox captures — no real mailbox exists for them, so the recipient domain is whatever staging accepts (a message to `phaseb-check-1@example.com` was captured 2026-08-26 under custom SMTP; the default sender's `@example.com` rejection does not carry over). The one-time code is **relayed by the owner at runtime from the sandbox UI**: the producer reads it from a prompt, never from a committed file, and redacts it at source. No inbox API and no new provider key enters the loop — the sandbox's API tokens stay unused — and an admin-minted code (`service_role`) is not used, even for re-runs. | 2026-08-26 | this row (owner ruling, CTRL-006) |
| 25 | **R2 under double refusal (Unit E).** ADR-009's R3 stands unqualified: zero unhandled rejections on every refused-write path, including the path on which the demand store also refuses. R2 holds whenever any durable medium accepts a write: on a refused session write the provider exposes no session from that moment (`signedOut` before any purge is awaited), the demand is held in memory and its durable record retried until a medium answers or the process ends, and the demand clears only on read-back proof. The one schedule this leaves — every durable medium refuses and the process dies before any recovers — is a recorded Known limit, not a defect, bounded by Supabase's refresh-token rotation, which rejects a consumed refresh token outside the reuse interval so the on-disk residue cannot be refreshed into a usable session. Unit F measures that backstop live against staging. | 2026-08-26 | this row (owner ruling, CTRL-006, on REVIEW-023 finding 1) |
| 26 | **The Unit D → Unit E storage-key transition is out of scope, on a fact.** No one has ever signed in through the app on any surface: Phase B never ran, no one-time code was ever delivered to the app, and no distribution unit exists (`expo.scheme` frozen, EAS never run). No Unit D session exists in any keychain, Keystore or browser. Unit E's explicit `auth.storageKey` therefore replaces the derived key without a sweep of the old space; the application comment asserting "no users" is deleted (code does not assert the world) and the evidence README cites this ruling. The dispatch's "web unchanged" narrows to "web keeps `localStorage` and gains no observer"; the namespace change on web is accepted under the same fact. | 2026-08-26 | this row (owner ruling, CTRL-006, on REVIEW-023 finding 3) |
| 27 | **Advisory seats run on OpenCode Go, under a stall protocol.** The owner keeps the Go subscription; the gateway's upstream accounts degrade silently, so every advisory dispatch carries: a one-line health check in a throwaway session before dispatch (no answer within a minute → the other named seat); two short fresh sessions per review (probes to disk, then a fresh session writes the record), neither past ~120K context; reasoning variant high unless the dispatch says otherwise; on a five-minute silent spinner, Esc, then relaunch and resume; a second stall in one session → switch that session to the other named seat, disclosed in the seat line. Parallel seats get separate worktrees by dispatch. | 2026-08-26 | this row (owner decision, CTRL-006) |
| 28 | **How Unit E ships (stop rule, third recurrence).** Cycle 3 changes no behaviour. The exposure invariant — no path exposes a session while a re-authentication demand is outstanding — is withdrawn as a claim and narrowed to the enumerated schedules that hold (REVIEW-023/024 probes, all passing at the cycle-2 head). The two REVIEW-025 schedules — a demand raised after a queued or standing `signedIn` is not retracted until the next publication, and `signOut()` under a refused mid-sign-out refresh leaves the provider `signedIn` with an empty key space — ship as **HIGH Known Issues** with their compensating controls named: any restart purges through the bootstrap path, server-side refresh-token rotation makes the residue unrefreshable, and Unit F measures that backstop live. The lint claim narrows to what it enforces (named-import ban plus test enumeration; the aliasing bypass documented). The evidence fixed-point claim narrows to the heads it measured. The subscription-based remedy — the provider subscribing to the demand signal and republishing on rise, not gating — is a follow-up unit with a fresh budget after Phase B. | 2026-08-26 | this row (owner ruling, CTRL-006, on REVIEW-025) |

## Active work

What is in flight, who owns it, and what it is blocked on. One row per stream.

| Stream | Owner | Status | Blocked on |
|---|---|---|---|
| Unit F — Auth Phase B live evidence | Claude Code | **LOCK registered, BUILD** — `evidence/auth-phase-b`, evidence only against main at `4e748741`; reviewer of record Codex Sol; no advisory seat unless flagged. Live one-time-code round trip and provisioning, live session size, refresh rotation through the adapter, `scope: 'local'`, the ruling-25 rotation backstop, and the ADR-named locked-device walk-through on the owner's iPhone (Expo Go) as an owner attestation. Dispatch issued after this commit merges, naming the post-merge tip. Evidence `007a-auth-phase-b/`. | Merge of this commit |
| Production Supabase project | Owner | Parked by ruling — create in East US (North Virginia) before any launch-facing unit | Free-tier slot or Pro upgrade at that time |

Unit A merged 2026-08-19 at `8d648bb` (PR #2, REVIEW-007 PASS); its full
record lives in the feat/app-skeleton LOCK and the HANDOFF chain.
Unit B merged 2026-08-19 at `d1a8642` (PR #5, REVIEW-010 PASS after two
fix cycles); its full record lives in the feat/supabase-wiring LOCK, the
HANDOFF chain, and REVIEW-008 through REVIEW-010.

Unit C merged 2026-08-23 at `d7943288` (PR #8), 21 commits, 52 files,
+12021/-12. Review chain REVIEW-011 through REVIEW-018 by Codex Sol
(reviewer of record) with REVIEW-014 advisory (DeepSeek V4 Pro, **SOUND**),
across seven fix cycles. **No security defect was found in any review.**
REVIEW-018 is the final review of record and its verdict is **FAIL**; the
owner ruled to merge over it after a final subtraction-only cycle, because
every remaining finding was claim-trimming with no security content. The
merged evidence suite's documented limitations are listed under **Known
issues**. CTRL-004 closed 2026-08-23.

Unit D merged 2026-08-26 at `6ee4407d` (PR #11), 20 commits, 99 files,
+16561/-26. Review chain REVIEW-019 through REVIEW-022 by Codex Sol (reviewer
of record) with REVIEW-021-ADVISORY (DeepSeek V4 Pro, **DEFECTS_FOUND**),
across three fix cycles. REVIEW-022 is the final review of record and its
verdict is **FAIL**. The owner ruled to merge over it on **one** open finding:
ADR-009 reclassified findings 1 and 2 as recorded library behaviour, finding 4
closed by subtraction, and finding 3 alone remains open. Twenty of the
twenty-three findings raised across the chain closed, eight of them by
deletion rather than by building an instrument to defend them. CTRL-005 closed
2026-08-26.

**Active controller session:** CTRL-006 Auth Phase B and session durability —
opened 2026-08-26; the name was confirmed against this file before planning.
Two units, sequential: Unit E first, because it needs nothing but a dispatch;
Unit F after Unit E merges, because it is blocked on owner-executed staging
posture and should measure the final code once. Unit D's Phase B was deferred
through three fix cycles by living inside a unit whose budget the fix loops
consumed; separate units keep separate budgets. Unit E is RED on arrival — the
client auth surface — so the advisory seat fires per ADR-001 and standing
rulings S1–S3 apply; Unit F changes no product code and needs no advisory seat
unless the reviewer of record flags high risk. Unit E merged 2026-08-27; Unit F dispatched from this commit's merge. The
successor session is named at close-out from this file.

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
| 8 | A reviewer dispatch composed another file's mechanics from memory ("only change"; a placement clause contradicting HANDOFF.md), forcing two compliant reviewer stops | Dispatch clauses that specify another file's mechanics (placement, scope counts, formats) are sourced from that file's own rules at dispatch time; enumerated-change clauses say "comprises the authorized items," not "nothing else," when several authorized changes share a file |
| 9 | A cycle's expected touch-set demanded a file whose regeneration was byte-identical, implying a hunk that could not honestly exist | Expected touch-sets count recordable deltas: a byte-identical regeneration produces no hunk, none is ever manufactured, and the discrepancy is disclosed instead |
| 10 | A control hook (`SETTINGS_PREFLIGHT_CONTROL`) was honoured by the shipped producer, so an ambient variable could skip every anon probe while the wrapper stayed green | Test hooks must never alter production-path behaviour: controls invoke their own entry point, and the real runner rejects or clears control variables at entry. Env-flag-driven behaviour in a shipped producer is banned |
| 11 | An edit aborted on its own assertion without writing the file; `bash -n` on the unmodified script was read as confirmation it had landed, and the smoke test that followed became an unauthorised live run | Verify the artifact, not a proxy for it: after any edit, read the written file back. An exit code from a neighbouring command is not evidence that a change exists |
| 12 | Seven fix cycles each closed the named defects and each surfaced a further claim standing slightly ahead of its instrument; the subject under test had been frozen and correct throughout | A claims table converges asymptotically, not finitely. Bound the claim to the instrument (derive the claimed set from the battery), issue a stop rule before the loop starts paying for completeness, and remedy by subtraction once it fires |

**CTRL-003 governance ledger** (defects recorded, none open): the first
REVIEW-008 dispatch repeated the learning-4 "only change" defect and the
corrected version then contradicted HANDOFF.md's top-insert rule — two
compliant reviewer stops, both corrected before any review work. The
controller's cycle-2 expected touch-set demanded a seventh file whose
regeneration was byte-identical (builder disclosure correct, no hunk
manufactured). REVIEW-010 additionally observed the builder's "exact
head" clone was base-plus-overlay testimony, closed by the reviewer's
actual-head rerun.

P8 and P9 were approved by the owner in CTRL-004 and are learnings 8 and 9
above; the owner's merge of the CTRL-004 opening state commit ratifies the
promotion.

**CTRL-004 governance ledger** (defects recorded, none open): two controller
dispatch defects — the Phase B dispatch asserted staging credentials were
present in the local env without verifying it, causing a compliant builder
stop; and the fix-cycle-6 dispatch was self-contradictory, prohibiting
`live-probes.sh` "in any form" while asking for two remedies that could only
be evidenced by regenerating an artifact through it (the builder honoured the
prohibition and disclosed the divergence). One builder defect: an unauthorised
live run during fix cycle 5, self-disclosed — repository-verifiable facts are
that both live transcripts are unchanged and hash-bound, no artifact derives
from the run, and the installed guard now blocks that fall-through; the
asserted external effects (11 denials, two rejected signups, zero writes) rest
on builder testimony, as the `/tmp` output was deleted and is unverifiable from
the repository. Adjudicated non-disqualifying. One process irregularity:
REVIEW-016's commit is owner-authored because the reviewer left its two files
uncommitted; the record names Codex Sol. Model substitution: Fable 5 quota
exhausted mid-unit, so builder and controller both ran as Opus 5 at the
ruling-5 effort class from fix cycle 2 onward; the harness-fixed
`Co-Authored-By: Claude Fable 5` trailer disagrees with the LOCK and HANDOFF
records, which are authoritative.

**CTRL-005.** Three learnings, two of them from controller defects.

**13 — A dispatch is not issuable until every document it cites exists.** The
Unit D dispatch named `ADR-004` as READ FIRST while ADR-004 did not exist in
any tree, branch, or commit. The controller had written the dispatch as a
paste-ready block and the "do not paste until the opening state commit lands"
condition as surrounding prose. The block was pasted; the prose was not a gate.
Cited documents are gating artifacts, not promises — do not emit paste-ready
dispatch text ahead of them. Nothing downstream was corrupted only because the
dispatch happened to restate the adapter's required properties in full, and
because the builder correctly refused to author a controller record to fill the
hole.

**14 — Every negative-result check validates its pattern against a positive
control.** A check that reports "0 hits" is indistinguishable from a check
whose pattern silently stopped matching. Unit D's `banned-apis.txt` runs each
pattern against a synthetic control file that *does* contain it, and fails the
run when a pattern fails its control. Adopt this for every absence claim. Two
vacuous passes on the same day motivated it: the builder's `capture.sh` exited
0 having measured nothing when its output directory was unwritable, and the
controller printed "SQL/migration in diff: NONE — claim holds" from an empty
file list produced by a 404 against a branch that had not been pushed. An
instrument that cannot fail cannot pass.

**15 — Ambiguous approval is only resolvable against a named recommendation.**
"Approved" against a set of lettered options with no controller recommendation
selects nothing, and inferring a choice there is manufacturing compliance.
"Approved" against an explicit recommendation per item resolves cleanly. The
controller's obligation is therefore to carry a named recommendation into every
owner decision it can, and to hold — not guess — when it has not.

**16 — A mutant must be build-valid.** A mutation that fails `typecheck` is not
a counterfactual. Jest's Babel path executes it regardless, and the harness
scores it red for the wrong reason — REVIEW-020 finding 5 caught exactly this:
mutant M4 turned red on an error-message mismatch while its actual safety
postcondition still held, and its edit left TypeScript unable to narrow the
read union. A mutation battery must typecheck each mutated tree before calling
any mutant sensitive, and 21/21 SENSITIVE is an execution fact, never a
semantic one.

**17 — An unverifiable property is a scoping error, not a build target.** When a
claim's failure mode can only be observed on hardware or in an environment the
current phase does not have, narrowing the claim and naming the deferred test is
the correct response; spending fix cycles chasing it is not. ADR-005 required
that a refresh never fire while the device is locked, while the locked-device
rejection it guards against was NOT RUN in Phase A for want of a device. Two of
three fix cycles could have gone to a property no Phase A evidence could ever
have closed.

**18 — The controller's own preconditions are repo state, not paperwork.** Four
times in CTRL-005 a dispatch or artifact went out ahead of the state that
authorised it: ADR-004 cited before it existed, a dispatch naming documents not
yet on main, a review dispatched against a LOCK still reading BUILD with
reviewers unnamed, and an Active work row left reading "Not started" for two
days on a twice-reviewed unit — the last one avoided deliberately to dodge a
merge conflict, which is how a governance file comes to lie. Reconcile state
first, dispatch second. A conflict is cheaper than a false record.

**19 — Write the scope qualifier into the decision sentence, or a reviewer will
write it for you three cycles later.** ADR-004 correctly qualified its web
storage claim. ADR-005 and ADR-007 then stated universals without one, and both
were narrowed by review — ADR-006 and ADR-008 exist only to add qualifiers that
belonged in the original sentences. An ADR sentence that says "a read fails
closed" or "a failure is surfaced" without naming the platform, the phase, and
the adversary it holds against is an overclaim waiting to be found. Draft the
qualifier first; it is cheaper than the ADR that adds it.

**20 — For library-internal behaviour, run a probe; do not read the source.**
Two reviewers read pinned `@supabase/supabase-js@2.112.3` and both concluded
that construction registers no auth listener. REVIEW-021-ADVISORY stated it
affirmatively as a correction to the reviewer of record, and fix cycle 3 was
built on it. REVIEW-022 constructed a client with fake storage and an injected
`fetch`, observed one token request and a persisted rotated session with no
application auth call, and had the answer in a single attempt. A source reading
describes what the code appears to do; a probe reports what it did.

**21 — An advisory correction carries no more authority than any other claim.**
The advisory seat was created for independent judgement, and its first firing
produced real value — it traced an entrance the reviewer of record missed and
answered a question written specifically for it. It also asserted a mechanism
fact that was false, and the controller passed that assertion into a dispatch
without requiring verification. Independence is a reason to weigh a claim, not
a reason to skip checking it.

**22 — Enumerating entrances into a third-party library is not an
architecture.** Three fix cycles gated AppState, removed self-scheduling, and
deferred the app's own listener and bootstrap; each one found an entrance the
previous fix had not accounted for, and a pinned dependency can add another on
any upgrade. It is schedule-patching one level up — the exact error the
controller told the builder to avoid in adapter code at cycle 2, then wrote
into ADR-007 without noticing. When a property requires exhaustive knowledge of
someone else's internals, find the property that does not.

**CTRL-006 governance ledger** (opened 2026-08-26; one inherited defect, none
open). The CTRL-005 close-out (`bcb38a80`, merged as PR #15) rewrote Active
work, rulings, learnings and Known issues but left this file's *Last verified*
line and *Current state* section as the CTRL-005 opening had written them:
main "at `07ad5a51`", Unit D "built and under review, not merged", two merged
branches "still survive". From that merge until this commit the file's own
header contradicted its Active work row — learning-18 class, a governance file
that lies. Corrected here by rebaselining both sections against `b95913e1`;
recorded rather than silently overwritten. Environment fact, not a defect: the
GitHub MCP connector in this Project reads the repository but returned 403 on
ref creation, so this commit was written through the Composio GitHub
connection via the Git Data API — the route CTRL-004 and CTRL-005 used — after
proving byte identity of both base files against their blob SHAs.

A second inherited gap surfaced from the owner's screenshot after this branch
was cut: CTRL-005 had already pointed staging's custom SMTP at a Mailtrap
Email Sandbox, customised the one-time-code template, and captured a check
message at 05:06Z — and recorded none of it, so the close-out's "the staging
auth posture remains unset" was partly false when written. Corrected in this
branch's second commit; the first commit's ruling-24 wording (plus-addressed
owner-mailbox identities) was drafted against the unrecorded state and is
replaced before merge rather than superseded after it.

Cycle-1 entries, 2026-08-26, all controller defects: (a) the Unit E review
dispatch ordered READ FIRST ahead of CHECKOUT, so a fresh reviewer read the
LOCK in a stale local tree and stopped; corrected mid-review, and every
future dispatch puts fetch-and-checkout first. (b) The Unit E build dispatch
recommended a fail-closed fallback — rethrow when the demand store refuses —
that reproduced the REVIEW-022 pathology REVIEW-023 finding 1 then measured;
the recommendation was the defect's origin, and ruling 25 replaces it.
(c) The same dispatch authorised a builder closing note in BRANCH-NOTES.md,
which `AGENTS.md`'s state-ownership rule does not permit (REVIEW-023 finding
4); the note stays under a controller annotation, and no dispatch authorises
a builder write to that file again. (d) Two reviewers were sent into one
working copy; the advisory seat's probe file landed in the tree the reviewer
of record was measuring, and the reviewer isolated itself in a worktree. The
advisory seat was moved to its own worktree; parallel seats get separate
worktrees by dispatch from now on. (e) The build dispatch's "stop on any
mismatch" applied an origin rule to a local lag; accepted deviation,
recorded at the phase transition.

Cycle-2 entries, 2026-08-26: (f) the advisory seat stalled three times on
OpenCode Go before landing its record; the owner keeps Go, so ruling 27
records the operating protocol instead of a tool change. (g) The cycle-1
addendum was pasted into another project's Claude Code session by mistake
and stopped before it acted; no repo effect on either side; the dispatch
message now names the target folder and branch in its first line.

Post-merge entries, 2026-08-27: (h) PR #18, the cycle-1 state commit, was
closed unmerged — cut from the pre-merge main, it would have conflicted
with PR #17 on this file's Active work row; its content (rulings 25–28,
ledger entries a–g, the follow-up unit) is re-issued in this commit, and the
owner's approvals of rulings 25–28 were given in the controller
conversation before any of them was recorded. (i) Unit E took six
reviewer-of-record verdicts for one unit; three of them turned on prose —
the itemised-carry accuracy of a subtraction record. The next subtraction
dispatch carries a diff-derived carry list as an instrument rather than
prose the reviewer must re-derive.

## Known issues

### Unit D — carried from REVIEW-022 (merged on owner override)

**CLOSED by Unit E** (merged 2026-08-27 at `4e748741`, REVIEW-028 PASS).
REVIEW-022 finding 3 — purge success inferred, demand not restart-durable,
rejected Deferreds unhandled — is closed for the named offline schedules:
purge success is determined by full key-space read-back; a non-secret
re-authentication demand survives restart and read failures stay
outstanding; bootstrap performs the observed purge before the provider's
own `getSession()`; refused-write schedules produce a durable demand with
zero unhandled rejections. The exposure class the fix uncovered ships open
below.

### Unit E — carried from REVIEW-025 (merged with the issue OPEN, ruling 28)

**KNOWN ISSUE 1 — OPEN, severity HIGH, class session exposure.** A newly
raised demand does not revoke standing `signedIn`: the pinned-client
sign-out schedule. Verbatim from REVIEW-025:

> With the real pinned auth client, a signed-in user called the provider's
> `signOut()`. Its internal near-expiry refresh was refused, which
> installed the flag and durable demand. The client then emitted both
> `TOKEN_REFRESHED(session)` and `SIGNED_OUT(null)`. The provider dropped
> both events while the signal stood, the action itself published no
> state, and the provider remained `signedIn` with a durable demand
> outstanding. There were zero unhandled rejections and no session bytes
> remained, so neither an error nor a residual explains the stale usable
> publication.

**Witness:** `known-issue-witness.txt`, KI-1 — committed, **RED, expected
RED** (the withdrawn invariant is asserted and fails exactly as the record
states: expected `signedOut`, received `signedIn`); its PRECONDITION test
proves the schedule reproduces (refused rotation, durable demand, empty
key space, action error null, zero unhandled) before the witness fails.

**KNOWN ISSUE 2 — OPEN, severity HIGH, class session exposure.** A newly
raised demand does not revoke queued `signedIn`: the barrier checks
publication input only. Verbatim from REVIEW-025:

> Independently, `publish(signedIn)` can sample both signals as false and
> enqueue React state; a real observed write can then install the flag and
> durable demand before React commits. The queued `signedIn` still
> commits, and changing the demand predicate does not cause re-evaluation.
> The barrier checks publication input, not consumer exposure or standing
> state.

**Witness:** `known-issue-witness.txt`, KI-2 in both variants (flag — a
REAL observed refused write installs the flag and durable demand through
the real observer before commit; demand — the registered predicate rises
before commit) — committed, **RED, expected RED**; each variant's
PRECONDITION test proves the signals genuinely stand and the barrier does
refuse the NEXT publication at its input.

**Compensating controls, exactly as ruling 28 names them (both issues):**

1. **Any restart purges through the bootstrap path** — the observed purge
   runs before the provider's own `getSession()` (claims 13–14; the
   restart schedules in both committed probes). ADR-009 qualifier:
   library-internal loads during client construction — the pinned client
   registers its own listener and can load and refresh a stored session
   before any provider code runs — can precede the demand consult and are
   contained by the purge that follows, never prevented.
2. **Server-side refresh-token rotation makes the residue unrefreshable** —
   the exposed session's refresh token was superseded at rotation, so it
   dies at its next refresh attempt (the ruling-25 bound, recorded in
   `reauth-demand.ts`).
3. **Unit F measures that backstop live** (registered in PROJECT-STATE
   Active work; blocked on Unit E's merge).
4. **A follow-up unit replaces gating with subscription** — publication-time
   sampling is the class defect; the fix direction is recorded here, not
   attempted this cycle (ruling 28: no further fix inside Unit E).

**SHOULD DELETE — bookkeeping, no product-code change.** REVIEW-022 finding 4:
committed `red-lane.txt` is stale, so claim 50 does not reproduce at the exact
target, and the record's clean cumulative-diff statement is false.

**ACCEPT AND RECORD — known limits, honestly bounded.**
- The token-opacity scanner detects **directly-spelled constructs only**; an
  aliased parser passes. Two committed tests preserve that hole as an
  executable limit rather than rescuing the deleted universal claim.
- The removal test states only the sequencing fact its first failure observes,
  not the stalled-reader interleaving originally claimed.
- Sign-out cost of 2052–4617 backend deletes is **derived by reading** pinned
  `_removeSession()`, not observed.
- `ci.txt` is **absent from 005d by design** — a head cannot be known before its
  own push, and carrying cycle 2's forward would place a green CI artifact
  beside a different head. Claim 48a is NOT RUN.
- The early `gates.txt` stability anomaly remains **DISCLOSED and unexplained**
  across three cycles and was ruled non-dispositive three times. Recorded so
  that "non-dispositive" is never quietly promoted to "resolved".
- Persistence-failure surfacing is **native-only** (ADR-008, ruling 18); web
  surfacing is deferred and unclaimed.
- Locked-device SecureStore refusal is **NOT RUN** — no device or simulator has
  participated. ADR-009 names the physical-device test gating Phase B exit.
- A latent SDK token-provider refresh entrance is recorded, not gated
  (ADR-009, ruling 20).

**Unit C merged evidence-suite limitations** (documented, carried knowingly;
each named in REVIEW-018 or self-disclosed and stated in the 004a/004b READMEs):

- `settings-preflight-control.txt` no longer matches its producer, and 004b
  byte-stability is NOT RUN at the merged head.
- The `Functions` class was removed from the oracle's claimed class list rather
  than extended; function definition **and** identity rest on direct inspection
  and REVIEW-014's source-verified analysis.
- Claim 25 asserts refusal state (exit 5, message, output directory
  absent-or-empty), not that refusal precedes every credential read, write, or
  network action — that precedence is NOT RUN.
- Three producer comments retain overstatements, disclosed rather than edited,
  to avoid spreading producer/artifact divergence onto protected transcripts.
- **Largest unmeasured question:** the derivation cross-check binds class
  labels, not each property a class paragraph names. Only `Entity inventory`
  was audited per-property; the other ten classes may list properties no
  scenario demonstrates.

Defects that are real, understood, and not yet fixed. An issue that is not
written here does not exist to the next session.

| # | Issue | Impact | Status |
|---|---|---|---|
| 1 | REVIEW-001 was committed without a HANDOFF block, under the same flawed dispatch wording as learning 4. | Accepted inconsistency; not to be repaired by editing history. | Accepted |
| 2 | 22 npm audit advisories (7 moderate, 15 high), all transitive in Expo's SDK-pinned build tooling. | No runtime exposure identified; `npm audit fix --force` would break SDK pins. | Accepted — revisit at each Expo SDK upgrade |

## Backlog — recorded nits

- `.prettierignore` entry for machine-local `supabase/.temp` — this residue
  interfered with three separate fix cycles and forced a disposable-clone
  workaround each time. One line; take it at the next unit that touches
  tooling.
- Staging auth posture requires flipping **Confirm email** off and on around
  every live evidence round (four rounds so far) — find a posture that does
  not, before the next live-evidence unit. Ruled 2026-08-26 (ruling 23):
  permanently off on staging.
- Staging now rejects `@example.com` signups (`email_address_invalid`) where
  four earlier rounds succeeded; any future live evidence run needs a
  different address domain. Ruled 2026-08-26 (ruling 24): sandbox-captured
  identities; the rejection was observed under the default sender, and a
  `@example.com` message was captured under custom SMTP.
- `004a/capture.sh` runtime grew with the battery (32+ parser runs per
  capture, x2 per stability run) — inside its documented bound, revisit if it
  becomes a drag.
- Bucket `file_size_limit` / `allowed_mime_types` on `captures-audio`
  (REVIEW-014 F5 — quota abuse, not privacy).
- One GraphQL and one Realtime probe to close REVIEW-014 F6.
- Lowercase-UID storage convention note at the SDK layer (REVIEW-014 F7).
- Append `select version();` to the next owner-run probe (REVIEW-014 F8).
- Per-property audit of the ten unaudited oracle classes — needs either added
  scenarios or deletions, so it belongs to a unit of its own.

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
- Unit A stability gate is stale post-merge: `push-state.txt` is
  permanently non-reproducible (its remote branch was deleted after
  merge) and `git-ls-files.txt` matches no current head; both proven
  pre-existing at the Unit B dispatch base (003a at-base artifact).
  Reconcile inside the gate-machinery chore below.
- Pre-existing OPERATIONS.md staging contradictions (credential-ownership
  and environments sections still imply no staging exists) — carried by
  REVIEW-008, not charged to Unit B.
- Gate-machinery hardening chore (one future unit; batch with the
  existing gate-set-expansion item; four distinct REVIEW-010
  accepted-and-backlogged adjudications): capture.sh process exit stays
  0 despite nonzero step codes; the redaction control's predicate
  accepts unrelated exit-1 failures; the fail-loudly probes accept any
  import rejection; the deps.txt path mask fails red (never falsely
  green) under npm 11 output redaction on credential-shaped absolute
  paths.
- Editor watchers vs `npm ci`: three-of-three ENOTEMPTY failures with a
  live TS server on the working copy (fix-cycle-2 incident). OPERATIONS
  caution candidate: quit the editor for builder sessions and gate runs.
  Owner machine action flagged: clear `~/.npm/_npx` (bogus registry
  `tsc@2.0.4` plus fallback expo/jest installs from the broken runs).
- AGENTS.md Roles still reads "Opus, high effort" for the primary
  builder — predates ruling 4. Refresh is its own reviewed chore; edits
  change the tracked sha256.
- REVIEW-028 adjacent (Unit E): the user-facing `signOut` action can report a
  refused removal without its own read-back; `clear()`/`remove()` trust
  `exists` on deletion (fail-closed, one redundant purge — 006d Known limit
  6); the mutation publication log measures calls entering `publish()`, not
  consumer exposure — bounded mechanism instrument only.
- **Follow-up unit after Phase B — session exposure by subscription:** the
  provider subscribes to the demand signal and republishes `signedOut` on
  rise, replacing the publish-time gate; fresh three-cycle budget; closes
  the two Known Issues ruling 28 accepts. Not before Unit F.
- Manus investigator seat: the trial end `AGENTS.md` names, 2026-08-25, has
  passed. Renew or retire is an owner decision; until ruled, no dispatch names
  the seat. Batch the Roles-section wording with the refresh chore above.

## Open questions

Things genuinely undecided. Move each to **Binding rulings** once settled — an
open question that quietly becomes a decision is how state files start lying.

1. **Voice transcription provider: Deepgram or ElevenLabs Scribe.** Undecided.
   Weighted first on language/dialect breadth, code-switching quality, and
   realtime capability, per `docs/00-master/PRODUCT.md` principle 1; per-language
   routing is an allowed future architecture. Settle by measured bake-off.
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
