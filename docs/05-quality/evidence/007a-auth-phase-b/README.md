# Evidence — 007a Auth Phase B live evidence (Unit F, CTRL-006)

**Branch** `evidence/auth-phase-b` · **base** `main` at `ee015ac3` (the
CTRL-006 post-merge state commit above the Unit E merge `4e748741`).
**Model+Effort:** Fable 5 / Max / fresh session (ruling 5: evidence work),
model check passed at session start (model ID `claude-fable-5`).
**Evidence only.** No product code, no test change under `src/`, no
migration, no config, no dependency. A defect found here is REPORTED in the
HANDOFF and becomes a new unit; nothing is fixed here.

**What this unit measures.** Phase B live evidence for the auth surface had
never run: no one-time code had ever been delivered, no live session
measured, no device had participated (PROJECT-STATE). This directory binds
each live claim to an instrument whose redacted output is committed, and
carries the ADR-named locked-device test as an owner-executed procedure with
an attestation.

**Provenance note.** The dispatch's `004c-*` reference resolves to
`../004b-schema-rls-live/` — the Unit C live round whose redaction
discipline and owner-executed event pattern this unit inherits; no `004c`
directory exists. The dispatch's "006d claim B3" resolves to the 005d README
§B3 record (carried through 006d's constants prose): *no session issued by
the Noema Supabase project has ever been measured* — the gap L3 closes.

---

## What is real and what is fake — stated once, up front

The Node instruments run the **real pinned `@supabase/supabase-js`** from
this repo's lockfile against **real staging** over the network; every
session, token, rotation, expiry and rejection is real server behaviour. The
storage handed to each client is the **real shipped chunking adapter**
(`createChunkedSecureStore` from `src/lib/auth/secure-store-adapter.ts`)
running over an **instrumented in-memory fake** of its `SecureStoreBackend`
seam — the adapter's declared constructor argument, the same public seam the
unit tests use — because SecureStore is a native keychain API that does not
exist in Node. **The SESSION is real while SecureStore stays offline.**

Two boundaries, stated rather than blurred:

- The app's observer/demand decoration (`observingWrites` +
  `reauth-demand.ts`) is NOT in the Node loop: its demand store is
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
`session-storage.ts` (fail-closed if the pin drifts), `autoRefreshToken:
false`, `detectSessionInUrl: false` — and the transcripts print them.

## Credentials, identities, and redaction — three layers

Staging URL and publishable key: owner-typed into the gitignored repo-root
`.env` (ruling 10; verified by variable name only, values never printed; no
service_role exists for this unit). Test identities are disposable,
run-namespaced, sandbox-captured addresses (ruling 24); the one-time code is
relayed by the owner at runtime from the Mailtrap sandbox UI into the
producer's interactive prompt — never a committed file, never an inbox API,
never an admin-minted code.

1. **At source** (`instruments/redaction.mjs`): every artifact line passes
   through the redactor before it is buffered — registered values (URL,
   host, project ref, key, every email, every code, every access/refresh
   token observed) become named placeholders; a JWT-shape sweep runs on
   every line; the writer REFUSES any line a registered value survives.
   Transcript files are written only by the redacting writer; process stdout
   is a progress channel and is not committed — a structural narrowing of
   the 004b totality problem (a stray direct write cannot reach the
   committed stream, because the committed stream is not stdout).
2. **In-run totality gate**: every registered value is mirrored to a 0600
   scratch ledger outside the repo (the producer refuses to run
   unledgered); after all files are written, the exact file bytes are
   re-scanned against the full ledger plus the JWT shape; residue unlinks
   the file and fails the run. Verdict and per-file sha256 bindings:
   `in-run-scan.txt`.
3. **Commit-time shape scan** (`instruments/redaction-scan.mjs` →
   `redaction-scan.txt`): after the ledger is gone, every committed byte in
   this directory is scanned for SHAPES — JWT, JWT-marker residue, Supabase
   host, key prefix, email, project-ref shape, URL — with a runtime-assembled
   positive control per pattern (learning 14), committed as
   `redaction-scan-control.txt` (CONTROL PROVED RED, all 7 patterns). The
   one allowance, stated in the scan header: `.md` documents may carry
   `unitf-*@example.com` TEMPLATE addresses (RFC-2606-reserved instruction
   text, the 004b identity class); `.txt` artifacts may carry no email shape
   at all.

## Email budget — stated before the first send

The sandbox meter reads against a **50-message ceiling** (PROJECT-STATE).
This unit's design:

| Run | Messages | Identities |
|---|---|---|
| Node live run (L1–L6) | **3** — user A (L1), user B (L2), user A second session (L5) | `<user-a-email>`, `<user-b-email>` |
| Device procedure (D1–D4) | **1** | `unitf-device-1@example.com` (template form) |
| Contingency | +1 only by an explicit owner `RESEND` action at the terminal — never an automatic retry | — |

A rate-limited send captures no message and is the only retryable send
failure. The producer counts sends and prints the count; the meter reading
is sandbox-side state the owner reports, recorded here as owner-reported.
**The run stops before its first send if the owner reports the meter near
50.**

## Execution order — and why L4 is last

`L1 → L2 → L5(sign-in + sign-out) → L3 → L6 → L4`. Owner interaction (three
code relays) is clustered in the first ~5 minutes; the 600-second expiry
wait (L6) is unattended; **L4 runs last because presenting a superseded
refresh token can trigger reuse detection and revoke the whole token
family**, which no later claim may depend on. L5 reuses session A1 (from L1)
as the surviving sibling, which is what lets the run cost 3 messages rather
than 4.

## Claims

Results are filled from the committed transcripts after the owner-executed
run; until then every live row is **PENDING THE OWNER-EXECUTED RUN** and the
device rows are **NOT RUN** unless the attestation is obtained.

| # | Claim | Result | Instrument / artifact |
|---|---|---|---|
| L1 | Live one-time-code round trip: `signInWithOtp(shouldCreateUser)` → message captured (owner-read in the sandbox UI) → owner-relayed code → `verifyOtp(type 'email')` → session. Shapes and timings recorded; the code never recorded (ruling 24) | pending live run | `instruments/live-claims.mjs` (runL1) → `L1-otp-roundtrip.txt` |
| L2 | Provisioning and RLS live: both OTP-created users hold their Unit C `profiles` row (`locale 'en'`, own row only); cross-user select is RLS-invisible (exactly 200, zero rows); no-session requests refused (exactly 401 code 42501 — SELECT ×3 tables + INSERT, the 004b anon set live again) | pending live run | `runL2` → `L2-provisioning-rls.txt` |
| L3 | Live session size: the persisted payload of a real staging-issued session measured through the real adapter — UTF-8 bytes, UTF-16 code units, the chunk count the payload produces, per-chunk sizes ≤ `CHUNK_BUDGET_BYTES` (1536), index n vs `splitByUtf8Budget` prediction, headroom vs `MAX_CHUNKS` (256). Closes the 005d §B3 gap: the first non-synthetic measurement | pending live run | `runL3` → `L3-session-size.txt` |
| L4 | Refresh rotation: explicit `refreshSession()` rotates both tokens, persisted through the adapter path and read back by a fresh adapter instance; THEN the ruling-25 backstop — the SUPERSEDED refresh token presented 30 s later (past the assumed 10 s default reuse interval, stated) and staging's rejection recorded VERBATIM (error class and message). Acceptance would be a FINDING. Family outcome after the reuse attempt recorded as informative | pending live run | `runL4` → `L4-rotation-backstop.txt` |
| L5 | `signOut({ scope: 'local' })` on session A2 with A1 alive for the same user: A2's store proven purged by adapter read-back (`confirmRemoved` — ADR-009 requirement 1, live), A2's refresh token refused afterwards (verbatim), A1 still refreshes (ADR-005 live). Concurrent-session posture pre-checked | pending live run | `runL5` → `L5-signout-local.txt` |
| L6 | The 600-second JWT expiry (ruling 23) observed: the access token expires on schedule (full wait, no hook), the pinned client's refresh path takes over (`grant_type=refresh_token` call observed), new `expires_in` exactly 600, rotated session persisted through the adapter | pending live run | `runL6` → `L6-jwt-expiry.txt` |
| P1 | Staging posture as observed: `/auth/v1/settings` booleans (`disable_signup`, `mailer_autoconfirm`) read in a fail-loud preflight BEFORE any send; code-as-code and SMTP capture observed as owner-executed events; JWT 600 s via L6 | pending live run | `run-summary.txt` + `L6-jwt-expiry.txt` |
| R1 | Redaction totality (layer 2 shape scan currently GREEN over 16 files; layer 1 runs with the live run): no URL, key, JWT, code, project ref or live address in any committed byte; every pattern proven falsifiable | layers 2+control GREEN pre-run; layer 1 pending live run | `redaction-scan.txt`, `redaction-scan-control.txt`, `in-run-scan.txt` |
| G1 | Gates 4/4 at this head — nothing under `src/` changes, so they must match main's: **typecheck, lint, test, format:check all exit 0; 11 suites, 196 tests** — exactly the REVIEW-028 figures | **PASS** | `gates.txt` (`instruments/gates.sh`) |
| D1 | Device: sign-in with a relayed code in Expo Go on the owner's iPhone | NOT RUN until attestation | `device-procedure.md` steps 2–3 → `owner-attestation.md` |
| D2 | Device: kill and relaunch — session restored from the keychain-backed adapter, no code prompt | NOT RUN until attestation | procedure step 4 → attestation |
| D3 | Device: the ADR-named locked window — foregrounded at lock, locked > 10 min (JWT 600 s), unlock: signed-in (refresh + keychain write succeeded) or sign-in demanded (a demand was raised), error text verbatim. **"No refusal occurred" is a valid PASS for recovery and NOT OBSERVED for the refusal itself — never a claim that refusal cannot happen** | NOT RUN until attestation | procedure steps 5–6 → attestation |
| D4 | Device: sign out, kill, relaunch — signed out stays signed out | NOT RUN until attestation | procedure steps 7–8 → attestation |

## NOT RUN — and why

1. **Known Issues 1–2 live** (the two REVIEW-025 exposure schedules).
   MEASURED only if their schedules are reachable without a test hook
   (learning 10) — they are not: both need a REFUSED keychain write at an
   exact instant (mid-`signOut` internal refresh; between publication
   sampling and React commit). A refused keychain write cannot be induced in
   Node against a fake without making the fake misbehave on cue, which is a
   test hook by another name; and no React renderer or provider runs in
   these instruments at all. What Unit F DOES measure live is their named
   **compensating control 2** — the ruling-25 rotation backstop (L4).
2. **GitHub CI on this branch.** `ci.yml` fires on `pull_request` and
   push-to-main only; the dispatch forbids a PR ("push the branch; no PR").
   The controller opens a draft PR post-handoff for CI — the Unit E pattern
   (006d claim 24 lineage). A head cannot carry its own CI URL before that
   event; the HANDOFF names the pushed head for the run to bind to.
3. **Mutation battery: none — there is no code to mutate.** This unit
   changes nothing under `src/`; stating a battery here would be padding.
4. **Byte-stability of the live transcripts.** Run-varying, captured once —
   the 004b/003a class: the committed transcript is the evidence boundary
   (timings, UUIDs, server timestamps vary; a re-run costs captured
   messages). `gates.txt` is regenerable at this head; `redaction-scan*` are
   deterministic over the committed bytes plus a run-varying scratch path in
   the control.
5. **Staging's exact reuse interval.** Dashboard state this unit does not
   read; GoTrue's 10 s default is assumed and stated, with a 30 s wait
   providing margin (L4).
6. **The locked-window write refusal itself** — observed only if it happens
   (D3's wording); its non-occurrence in one run claims nothing.
7. **Standalone-build keychain behaviour.** The device procedure runs in
   Expo Go (the PROJECT-STATE-named runtime), whose SecureStore lives in
   Expo Go's own keychain namespace; a real build's behaviour is a recorded
   boundary, not measured.
8. **Web.** No claim; no observer exists there (ADR-008, ruling 18).

## Artifacts and classification

| Artifact | Producer | Class |
|---|---|---|
| `L1..L6-*.txt`, `run-summary.txt` | `instruments/live-run.sh` → `live-run.mjs` (owner-executed, interactive — ruling 24) | run-varying, captured once (004b live class) |
| `in-run-scan.txt` | `live-run.mjs` (layer-1 totality gate) | run-varying, captured once; carries the sha256 bindings |
| `gates.txt` | `instruments/gates.sh` | gated in principle at this head (normalization in the producer header) |
| `redaction-scan.txt` | `instruments/redaction-scan.mjs` | deterministic over the committed bytes it scans |
| `redaction-scan-control.txt` | `redaction-scan.mjs --control` | positive control; scratch path varies per run |
| `device-procedure.md`, `attestation-template.md` | authored | procedure documents (deliverables regardless of run state) |
| `owner-attestation.md` | owner words verbatim + builder header | owner-executed event record (if obtained) |

## Re-running

- Node live run (owner, interactive, ~15–20 min, 3 captured messages):
  `bash docs/05-quality/evidence/007a-auth-phase-b/instruments/live-run.sh`
- Gates: `bash docs/05-quality/evidence/007a-auth-phase-b/instruments/gates.sh`
- Redaction shape scan: `node docs/05-quality/evidence/007a-auth-phase-b/instruments/redaction-scan.mjs`
  (`--control` for the positive control)
- Device: `device-procedure.md`, owner-executed (1 captured message)

Residual staging state after the live run and its owner-class cleanup are
recorded in `run-summary.txt` (the 004b pattern: deleting the `unitf-*`
users in the dashboard cascades away their rows).
