# NOEMA — PROJECT-STATE

The authoritative record of what is true right now. If this file and your
memory of the project disagree, this file is right and you are stale.

**Last verified:** 2026-08-24, CTRL-005 fix cycle 1 preparation, verified against main at
`07ad5a51ed597f67bac523e681525c4e87fe644d` (the PR #9 merge of the CTRL-004
close-out, GitHub-signed, parents `d794328` + `6809dbf`)
**Verification method:** controller read of main via GitHub API — both state
files verbatim, `AGENTS.md` re-hashed and matched byte-exact against the
recorded sha256 (`0ff02d20…f013`, 5378 bytes), the PR ledger #1–#9 (all merged,
merge SHAs matching the LOCK record), the branch inventory, and an independent
audit of the Unit D candidate at `d6dc677` (diff contents, `expo.scheme`
byte-identity across refs, and HANDOFF byte-preservation established by suffix
test rather than by builder testimony).

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

As of 2026-08-24:

- Repository `Zed-Concept/noema` is **private**; `main` is at
  `07ad5a51ed597f67bac523e681525c4e87fe644d` (PR #9, the CTRL-004 close-out merge).
- **Unit C is merged** at `d794328` (PR #8): `profiles`, `captures`,
  `transcripts` with FORCE RLS and owner-only policies, the
  `handle_new_user()` SECURITY DEFINER provisioning trigger, and the private
  `captures-audio` bucket. Merged on owner override of a REVIEW-018 FAIL whose
  remaining findings were all claim-trimming with no security defect.
- **Unit D is built and under review, not merged**: `feat/auth-session-v1` at
  `d6dc677`, one commit, 36 files, ahead 1 / behind 0 from this tip. Phase A
  is offline by construction — no live Supabase call, no credential read, and
  no SQL, migration, or policy file in the diff.
- Two merged branches still survive on origin — `feat/schema-rls-v1` and
  `chore/state-ctrl-004-closeout`, both 0 ahead. Convention is main as the sole
  live branch; owner deletion pending.
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

## Active work

What is in flight, who owns it, and what it is blocked on. One row per stream.

| Stream | Owner | Status | Blocked on |
|---|---|---|---|
| Unit D — Auth and session v1 | Claude Code (`feat/auth-session-v1`) | BUILD — **fix cycle 3 of 3 delivered**, answering REVIEW-021 FAIL and REVIEW-021-ADVISORY DEFECTS_FOUND. **This is the final cycle; there is no cycle 4.** REVIEW-019/020 FAILs and fix cycles 1-2 are closed history. Main merged in at `b5c9cee` (origin/main `6c925d1`, PR #14) for ADR-008, rulings 18-19; evidence at `docs/05-quality/evidence/005d-auth-session-fix3/` (005a-005c retained as their cycles' records). Two findings closed by implementation, five by subtraction. Phase A offline; PR #11 open | Nothing. Awaiting REVIEW-022. If it is not a PASS the options are an owner override merge on a documented FAIL (the Unit C precedent) or further subtraction. RoR Codex Sol (fresh session, authored REVIEW-019/020/021, did not build); advisory DeepSeek V4 Pro (fired at REVIEW-021-ADVISORY)
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

**Next controller session:** CTRL-005 Auth and session v1 — the successor
confirms this name against this file before planning anything. Derived from
`docs/00-master/PRODUCT.md`, whose L0 sequencing puts the auth unit ahead of
the capture loop; open question 1 (transcription provider) does not gate it.
RED on arrival: auth-touching diffs re-trigger the advisory seat per ADR-001,
and standing rulings S1-S3 apply.

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

## Known issues

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
  not, before the next live-evidence unit.
- Staging now rejects `@example.com` signups (`email_address_invalid`) where
  four earlier rounds succeeded; any future live evidence run needs a
  different address domain.
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
