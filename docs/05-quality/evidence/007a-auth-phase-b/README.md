# Evidence — 007a Auth Phase B live evidence (Unit F, CTRL-006)

**Branch** `evidence/auth-phase-b` · **base** `main` at `ee015ac3` (the
CTRL-006 post-merge state commit above the Unit E merge `4e748741`).
**Model+Effort:** Fable 5 / Max / fresh session (ruling 5: evidence work),
model check passed at session start (model ID `claude-fable-5`).
**Evidence only.** No product code, no test change under `src/`, no
migration, no config, no dependency. A defect found here is REPORTED in the
HANDOFF and becomes a new unit; nothing is fixed here. This unit found two —
see **Findings** below.

**What this unit measured.** Phase B live evidence for the auth surface had
never run: no one-time code had ever been delivered, no live session
measured, no device had participated (PROJECT-STATE). The owner-executed
live run of 2026-08-27 (run `mtbab7s47u`, transcripts committed here)
delivered the first codes, measured the first real sessions, and observed
the ruling-25 backstop — which did not hold at the measured interval
(Finding F1).

**Provenance note.** The dispatch's `004c-*` reference resolves to
`../004b-schema-rls-live/` — the Unit C live round whose redaction
discipline and owner-executed event pattern this unit inherits; no `004c`
directory exists. The dispatch's "006d claim B3" resolves to the 005d README
§B3 record (carried through 006d's constants prose): *no session issued by
the Noema Supabase project has ever been measured* — the gap L3 closed.

---

## What is real and what is fake — stated once, up front

The Node instruments ran the **real pinned `@supabase/supabase-js` 2.112.3**
(auth-js 2.112.3, both from this repo's lockfile) against **real staging**
over the network; every session, token, rotation, expiry and rejection in
the transcripts is real server behaviour. The storage handed to each client
was the **real shipped chunking adapter** (`createChunkedSecureStore` from
`src/lib/auth/secure-store-adapter.ts`) running over an **instrumented
in-memory fake** of its `SecureStoreBackend` seam — the adapter's declared
constructor argument, the same public seam the unit tests use — because
SecureStore is a native keychain API that does not exist in Node. **The
SESSION is real while SecureStore stays offline.**

Two boundaries, stated rather than blurred:

- The app's observer/demand decoration (`observingWrites` +
  `reauth-demand.ts`) was NOT in the Node loop: its demand store is
  expo-file-system, equally native. That layer's behaviour is Unit E's
  offline evidence and is not re-measured here.
- `expo-secure-store` is stubbed at module load ONLY so the adapter module
  can be imported in Node (`instruments/expo-stub-loader.mjs`); the stub's
  methods THROW on any call, so the instruments cannot silently measure the
  stub — the fake backend is passed explicitly through the constructor seam.
  Nothing in the shipped product reads an environment variable to select a
  backend; no test hook alters production-path behaviour (learning 10).

The `auth` construction options mirror `src/lib/supabase.ts` exactly —
`persistSession: true`, `storageKey` extracted at runtime from
`session-storage.ts` (fail-closed if the pin drifts; it read
`'zc-auth-session'`), `autoRefreshToken: false`, `detectSessionInUrl:
false` — and every transcript header prints them.

## Credentials, identities, and redaction — three layers

Staging URL and publishable key: owner-held, in the gitignored repo-root
`.env` (ruling 10; verified by variable name only, values never printed; no
service_role exists for this unit). Test identities were disposable,
run-namespaced, sandbox-captured addresses (ruling 24); each one-time code
was relayed by the owner at runtime from the Mailtrap sandbox UI into the
producer's interactive prompt — never a committed file, never an inbox API,
never an admin-minted code.

1. **At source** (`instruments/redaction.mjs`): every artifact line passes
   through the redactor before it is buffered — registered values (URL,
   host, project ref, key, every email, every code, every access/refresh
   token observed) become named placeholders; a JWT-shape sweep runs on
   every line; the writer REFUSES any line a registered value survives.
   Transcript files are written only by the redacting writer; process
   stdout is a progress channel and is not committed — a structural
   narrowing of the 004b totality problem (a stray direct write cannot
   reach the committed stream, because the committed stream is not stdout).
2. **In-run totality gate** (`in-run-scan.txt`): every registered value was
   mirrored to a 0600 scratch ledger outside the repo (the producer refuses
   to run unledgered); after all files were written, the exact file bytes
   were re-scanned against the full ledger (26 distinct values) plus the
   JWT shape. Verdict **GREEN** for all seven files, with a sha256 per file
   binding the scanned bytes to the committed bytes — verifiable by
   comparing `shasum -a 256` of each committed transcript against the
   recorded value.
3. **Commit-time shape scan** (`instruments/redaction-scan.mjs` →
   `redaction-scan.txt`): after the ledger is gone, every committed byte in
   this directory is scanned for SHAPES — JWT, JWT-marker residue, Supabase
   host, key prefix, email, project-ref shape, URL — with a
   runtime-assembled positive control per pattern (learning 14), committed
   as `redaction-scan-control.txt` (CONTROL PROVED RED, all 7 patterns).
   The one allowance, stated in the scan header: `.md` documents may carry
   `unitf-*@example.com` TEMPLATE addresses (RFC-2606-reserved instruction
   text, the 004b identity class); `.txt` artifacts may carry no email
   shape at all. Verdict at the committed bytes: **GREEN**.

## Email budget — stated before the first send, and what was used

The sandbox meter reads against a **50-message ceiling** (PROJECT-STATE).
Stated design: Node run **3** messages, device procedure **1**, contingency
+1 only by an explicit owner `RESEND` action at the terminal.

**Used by the Node run: exactly 3** (instrument-counted, `run-summary.txt`;
no contingency was consumed). The absolute meter reading is sandbox-side
state the owner reports; the report is recorded in the HANDOFF, labelled
owner-reported. The device procedure's 1 message is consumed only when the
owner runs it.

## Staging posture as observed — including one drift

- `/auth/v1/settings` (fail-loud preflight, before any send):
  `disable_signup=false`, `mailer_autoconfirm=true` — confirm-email off
  (ruling 23) observed.
- **SMTP capture and the code template observed as owner-executed events:**
  all three messages were captured by the Mailtrap sandbox and each carried
  a six-digit CODE the owner relayed — never a link.
- **JWT expiry: the run observed 3600 s, not ruling 23's 600 s** — Finding
  F2 below. Every session in the run (`L1`, `L5`, `L6`, `L4` transcripts)
  carried `expires_in=3600`. After the run ended (last transcript closed
  09:57:05Z), the owner found the dashboard reading 3600, set it to 600 and
  saved at 18:02 local — an owner-executed config event, reported in-session
  and recorded here; **no artifact in this directory binds the post-run 600**
  (the 004b owner-event class). The device procedure depends on the
  600-second posture (an 11-minute lock must out-live the token), so the
  attestation must postdate 18:02.

## Execution order — and why L4 ran last

`L1 → L2 → L5(sign-in + sign-out) → L3 → L6 → L4`. Owner interaction (three
code relays) clustered in the first ~3 minutes; the expiry wait (L6) was
unattended; **L4 ran last because presenting a superseded refresh token can
trigger reuse detection and revoke the whole token family**, which no later
claim may depend on. L5 reused session A1 (from L1) as the surviving
sibling, which is what let the run cost 3 messages rather than 4.

## Findings — reported, not acted on (evidence-only unit)

**F1 — staging accepted a superseded refresh token 30 seconds after
rotation (`L4-rotation-backstop.txt`).** After an explicit rotation, the
run waited 30 s — past GoTrue's DEFAULT 10 s reuse interval, the assumption
the transcript states — and presented the SUPERSEDED refresh token from a
throwaway client. Staging answered HTTP 200 with a usable session; the
informative follow-up showed the family survived. The dispatch pre-classified
acceptance as **a finding, not a note**. Consequence, stated precisely: the
ruling-25 bound — PROJECT-STATE names it compensating control 2 for Known
Issues 1–2, "rotation rejects a consumed refresh token outside the reuse
interval so the on-disk residue cannot be refreshed into a usable session" —
**was not observed to hold at 30 seconds**. The acceptance is consistent
with a staging reuse interval configured longer than 30 s; the dashboard
value was not read by this unit (stated boundary), so cause is undetermined
here. What IS separately proven live: a locally signed-out session's token
dies immediately (L5, `refresh_token_not_found`) — revocation, unlike
supersession, was observed to bind at once. Disposition: new unit / owner
action — read and, if the owner so rules, tighten the interval, then
re-measure the backstop; this unit fixes nothing.

**F2 — JWT-expiry posture drift (`L6-jwt-expiry.txt`).** Ruling 23 and
PROJECT-STATE record staging JWT expiry as 600 s, owner-confirmed
2026-08-26. At run time the dashboard held 3600 s and every issued session
said so. The 600-second figure was therefore NOT observed; the drift was
detected by the instrument (the honest 3644-second wait is in the
transcript). The owner reset it to 600 (saved 18:02 local, post-run,
unbound by artifact). Disposition: posture re-observation lands with the
first artifact that measures a session issued after 18:02 — the device
attestation, or any future live round.

## Claims

| # | Claim | Result | Instrument / artifact |
|---|---|---|---|
| L1 | Live one-time-code round trip: `signInWithOtp(shouldCreateUser)` (HTTP 200, 1148 ms) → message captured, owner-read in the sandbox UI, code relayed (~124 s including lookup) → `verifyOtp(type 'email')` (1695 ms) → real session (shape recorded: 6 session keys, 15 user keys; a NEW user created by the flow). The code appears in no artifact (ruling 24) | **PASS** | `L1-otp-roundtrip.txt` |
| L2 | Provisioning and RLS live: both OTP-created users hold their Unit C `profiles` row (exactly 200, exactly 1 row, own id, `locale 'en'` — the provisioning trigger ran); cross-user select RLS-invisible both directions (exactly 200, zero rows); no-session probes refused (exactly 401 code 42501 — SELECT ×3 tables + INSERT, the 004b anon set live again) | **PASS** (all oracles exact) | `L2-provisioning-rls.txt` |
| L3 | Live session size through the real adapter: **2228 UTF-8 bytes → 2 chunks** (1536 B + 692 B, each ≤ `CHUNK_BUDGET_BYTES` 1536), index n=2 = `splitByUtf8Budget` prediction, len match, checksum present, headroom 2/256 of the removal bound; payload is a real session object (keys recorded, values never printed). **The first non-synthetic measurement — the 005d §B3 gap closed** | **PASS** | `L3-session-size.txt` |
| L4a | Refresh rotation: explicit `refreshSession()` rotates both tokens (323 ms); persisted through the adapter path (write log: 2 chunks + index) and read back by a fresh adapter instance | **PASS** | `L4-rotation-backstop.txt` |
| L4b | The ruling-25 backstop: the SUPERSEDED token presented 30 s after rotation is rejected | **FINDING F1 — ACCEPTED** (HTTP 200; family survived; the probe's own consumption of the current token recorded) | `L4-rotation-backstop.txt` |
| L5 | `signOut({ scope: 'local' })` on A2 with A1 alive for the same user: sign-out 204; A2's store proven purged by adapter read-back (`confirmRemoved` true, zero keys — ADR-009 requirement 1 observed live, full 513-delete sweep + 513-read confirm in the op log, the 005d derived figure now observed); A2's token REFUSED verbatim (`AuthApiError` 400 `refresh_token_not_found`); A1 still refreshes after (ADR-005 live). Concurrent-session posture pre-checked | **PASS** | `L5-signout-local.txt` |
| L6a | Expiry-on-schedule mechanics: the access token expired exactly on its issued schedule (full honest wait, no hook), the pinned client's refresh path took over (`grant_type=refresh_token` → 200 observed), rotation persisted through the adapter and read back | **PASS** (at a 3600 s schedule) | `L6-jwt-expiry.txt` |
| L6b | The schedule is ruling 23's 600 s | **FINDING F2 — observed 3600 s**; owner reset to 600 post-run (18:02, unbound) | `L6-jwt-expiry.txt` |
| P1 | Staging posture as observed: confirm-email off, SMTP capture, code-not-link, JWT expiry — see the posture section | **observed as stated** (expiry drifted — F2) | `run-summary.txt` + transcripts |
| R1 | Redaction totality: layer 1 GREEN (26 ledger values, all 7 files, sha256-bound), layer 2 GREEN over the committed bytes, every pattern proven falsifiable by the committed control | **PASS** | `in-run-scan.txt`, `redaction-scan.txt`, `redaction-scan-control.txt` |
| G1 | Gates 4/4 at this head — nothing under `src/` changes, so they must match main's: typecheck, lint, test, format:check all exit 0; **11 suites, 196 tests** — exactly the REVIEW-028 figures | **PASS** | `gates.txt` (`instruments/gates.sh`) |
| D1 | Device: sign-in with a relayed code in Expo Go on the owner's iPhone | NOT RUN until attestation | `device-procedure.md` steps 2–3 |
| D2 | Device: kill and relaunch — session restored, no code prompt | NOT RUN until attestation | procedure step 4 |
| D3 | Device: the ADR-named locked window — foregrounded at lock, locked > 10 min, unlock: signed-in (refresh + keychain write succeeded) or sign-in demanded (a demand was raised), error text verbatim. **"No refusal occurred" is a valid PASS for recovery and NOT OBSERVED for the refusal itself — never a claim that refusal cannot happen** | NOT RUN until attestation (run only after the 18:02 expiry reset — see posture) | procedure steps 5–6 |
| D4 | Device: sign out, kill, relaunch — signed out stays signed out | NOT RUN until attestation | procedure steps 7–8 |

## NOT RUN — and why

1. **Known Issues 1–2 live** (the two REVIEW-025 exposure schedules).
   MEASURED only if reachable without a test hook (learning 10) — they are
   not: both need a REFUSED keychain write at an exact instant
   (mid-`signOut` internal refresh; between publication sampling and React
   commit). A refused keychain write cannot be induced in Node against a
   fake without making the fake misbehave on cue — a test hook by another
   name — and no React renderer or provider runs in these instruments. What
   Unit F did measure is their named compensating control 2, and it did not
   hold at 30 s (Finding F1) — which raises, not lowers, the standing of
   those Known Issues.
2. **GitHub CI on this branch.** `ci.yml` fires on `pull_request` and
   push-to-main only; the dispatch forbids a PR ("push the branch; no PR").
   The controller opens a draft PR post-handoff for CI — the Unit E
   pattern. The HANDOFF names the pushed head for the run to bind to.
3. **Mutation battery: none — there is no code to mutate.** This unit
   changes nothing under `src/`; stating a battery would be padding.
4. **Byte-stability of the live transcripts.** Run-varying, captured once —
   the 004b/003a class: the committed transcript is the evidence boundary
   (timings, UUIDs, server timestamps vary; a re-run costs captured
   messages). `gates.txt` is regenerable at this head; `redaction-scan.txt`
   is deterministic over the bytes it scanned; the control's scratch path
   varies per run.
5. **Staging's reuse-interval and reuse-detection dashboard values.** Not
   read by this unit; F1's cause is therefore undetermined here (stated in
   the finding).
6. **The post-run 600-second expiry.** Owner-reported (18:02), unbound by
   any artifact here; first bound by the next artifact measuring a session
   issued after it (the device attestation, or a future round).
7. **The locked-window write refusal itself** — observed only if it happens
   (D3's wording); its non-occurrence in one run claims nothing.
8. **Standalone-build keychain behaviour.** The device procedure runs in
   Expo Go (the PROJECT-STATE-named runtime), whose SecureStore lives in
   Expo Go's own keychain namespace; a real build's behaviour is a recorded
   boundary, not measured.
9. **Web.** No claim; no observer exists there (ADR-008, ruling 18).

## Disclosures — small and stated

- **L4's HTTP log carries one line from L5**: the `probe: … → 400` entry is
  L5's dead-token check — the throwaway probes share one fetch log and L5's
  transcript prints its own calls from the client logs only. The 400's
  verbatim error is in L5 where it belongs; the L4 lines that matter (200,
  200) are the reuse and family probes. A labeling nit in a captured
  transcript, disclosed rather than edited (a transcript is measured
  output, not editable prose).
- **L5's transcript is ~97 KB**: the sign-out sweep prints all 513 deletes
  and the 513-read confirm — verbose by design (it is the first live
  observation of the sweep); left as captured.
- **The run's stdout is not committed** (progress channel, owner's
  terminal); the committed stream is the redacting writer's only.

## Artifacts and classification

| Artifact | Producer | Class |
|---|---|---|
| `L1..L6-*.txt`, `run-summary.txt` | `instruments/live-run.sh` → `live-run.mjs` (owner-executed, interactive — ruling 24; run `mtbab7s47u`, 2026-08-27) | run-varying, captured once (004b live class); bytes bound by sha256 in `in-run-scan.txt` |
| `in-run-scan.txt` | `live-run.mjs` (layer-1 totality gate) | run-varying, captured once; the sha256 bindings |
| `gates.txt` | `instruments/gates.sh` | gated in principle at this head (normalization in the producer header) |
| `redaction-scan.txt` | `instruments/redaction-scan.mjs` | deterministic over the committed bytes it scans |
| `redaction-scan-control.txt` | `redaction-scan.mjs --control` | positive control; scratch path varies per run |
| `device-procedure.md`, `attestation-template.md` | authored | procedure documents (deliverables regardless of run state) |
| `owner-attestation.md` | owner words verbatim + builder header | owner-executed event record (when obtained) |

## Re-running

- Node live run (owner, interactive, 3 captured messages; ~8 min at the
  600 s posture): `bash docs/05-quality/evidence/007a-auth-phase-b/instruments/live-run.sh`
- Gates: `bash docs/05-quality/evidence/007a-auth-phase-b/instruments/gates.sh`
- Redaction shape scan: `node docs/05-quality/evidence/007a-auth-phase-b/instruments/redaction-scan.mjs`
  (`--control` for the positive control)
- Device: `device-procedure.md`, owner-executed (1 captured message)

Residual staging state and its owner-class cleanup are recorded in
`run-summary.txt` (deleting the `unitf-*` users in the dashboard cascades
away their rows).
