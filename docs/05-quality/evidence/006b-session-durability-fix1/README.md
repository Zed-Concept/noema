# Evidence — Unit E fix cycle 1, session durability (006b)

**Controller:** CTRL-006 · **Branch:** `feat/session-durability` · **Base:**
`main` at `7caf23e1` (the Unit E dispatch pin; unchanged — main has not moved).

**Model+Effort:** Fable 5 / Max / fresh session — ruling 5's tier for a
review-fix loop, the dispatched seat, verified at session start.

**Scope:** close REVIEW-023 findings 1–3, 5, 6 under owner rulings 25 and 26,
plus the cycle-1 addendum adjudicating REVIEW-023-ADVISORY leads 1–3 into
scope (one invariant: no path exposes a session while a re-authentication
demand is outstanding, in memory or durable). Finding 4 is controller-owned:
`docs/01-state/BRANCH-NOTES.md` is touched by ZERO bytes in this cycle's
builder commits. Offline: no live Supabase call, no credential, nothing under
`supabase/` (proven in `red-lane.txt`, whose git invocations now check their
own exits).

---

## SUPERSESSION — this README governs over 006a's claims

`../006a-session-durability/` is **superseded by this record** and stays
byte-identical (immutable-record practice). REVIEW-023 and the owner rulings
withdrew or narrowed the following 006a claims; they are listed here so no
reader has to reconstruct the deltas:

- **Claims 13, 15, and 18 — WITHDRAWN as written.** No "where the demand
  store answers" exception survives ruling 25. The fail-closed rethrow those
  claims recorded as a deliberate fallback was the controller's recommended
  shape and is withdrawn: REVIEW-023 finding 1 measured it re-entering the
  pinned client's throw-and-reject path (two unhandled rejections) and
  forgetting the demand across restart. The shipped behaviour is now: absorb
  in every case; hold the demand in memory when every medium refuses; retry
  the durable record at every later opportunity. R3 is unqualified — zero
  unhandled rejections on every refused-write path, including double refusal
  — and claims 4 and 5 below re-instrument the property.
- **Claim 22 — WITHDRAWN as credited.** "Fails closed on any gate, scan, or
  control failure" was false: REVIEW-023's negative control returned exit 77
  from every `git diff` and 006a's capture still exited 0 reporting an empty
  range — its regex controls test pattern recognition, not producer success.
  This cycle's `capture.sh` checks EVERY git invocation's exit and fails the
  run on any non-zero; the reviewer's control is committed as
  `capture-refusal-control.sh` with its transcript.
- **Claim 1 — NARROWED.** The finding-3 probe's base run proves only what
  executes before its first failing assertion; it is a valid RED control, not
  proof of every later base fact 006a's row named.
- **Claim 2 — CLOSED BY UPGRADE.** The committed test proved 513 reads and
  no writes but not the exact unique address set. The instrument now asserts
  the exact ORDERED address set (index, then generation 0 × 256, then
  generation 1 × 256, each exactly once) plus the reviewer's
  value-at-the-final-address probe (false only after all 513 reads).
- **M14 attribution — NARROWED.** M14's unit test is a generic later
  successful write at the observer boundary, not the `signOut()`
  internal-refresh schedule. It remains the mutant's fast red-detector; the
  reviewer's real-client schedule is now itself a committed instrument (the
  `review023-probe` finding-2 test holds the logout open across the internal
  refresh and watches the demand survive to read-back proof).
- **Claims 23 and 24 — NARROWED to the literal patterns measured.** The
  banned-API and gated-name scans measure exactly their literal pattern
  lists through the comment-blanking pipeline; aliased or token-assembled
  occurrences would survive them, stated rather than claimed away. The
  gated-name scan gains the positive control 006a lacked (a fragment-built
  synthetic occurrence must match through the same pipeline).
- **Known limit 11 — RESTATED AS UNVERIFIED, and its false sentence
  corrected.** The double-refusal Deferred-stranding schedule was source-read
  speculation; REVIEW-023 ran two directed probes (full 513-delete provider
  schedule; direct concurrent `getSession()`) and REVIEW-023-ADVISORY ran
  four (D4a/b/c/e), and none reproduced a hang. It is UNVERIFIED, not a
  candidate defect, and the 006a "adjacent finding" is **withdrawn as a
  defect claim**. Separately, 006a's sentence "the durable demand is
  recorded before any such hang" is FALSE under double refusal — the
  advisory's D4a observed 0 demand files there, because the demand store is
  the second refusing medium. Under ruling 25 the demand is now HELD in
  memory in that schedule and retried; the durable record exists only once a
  medium answers (claims 2–3 below), and the death-before-recovery window is
  the ruling-25 Known limit (Known limit 1 below).
- **Ruling 26 — the storage-key transition is out of scope, on a fact.** No
  one has ever signed in through the app on any surface, so no Unit D
  session exists anywhere; there is nothing to sweep and no sweep is built.
  The application comments asserting that world-fact are DELETED — code does
  not assert the world — and this paragraph is the citation the code now
  points at. REVIEW-023 finding 3's "web unchanged" claim narrows to: **web
  keeps `localStorage` and gains no observer**; the namespace change on web
  is accepted under ruling 26 and stated as such.
- **006a Known limit 9 (the `File.exists` consult gate) — MECHANISM
  CLOSED AT MODULE LEVEL, premise still NOT RUN.** Advisory lead 2 (E1):
  the consult now READS the record's content first; `exists` corroborates
  absence only; an unreadable existing-or-indeterminate record is
  outstanding. Whether the installed `expo-file-system` can report
  `exists === false` under an I/O refusal remains NOT RUN offline (Phase B's
  physical-device test owns the premise).
- **006a Known limit 2's cost sentence — UPDATED by advisory lead 3.** "One
  conservative re-authentication" was, measured end-to-end, one CONSUMED
  sign-in: reported success, never exposed, destroyed by the stale purge.
  A fresh sign-in whose session is persisted AND read back now RESOLVES the
  demand. The conservative consumed-sign-in cost remains only where the
  evidence is missing (refused persist, nothing reads back) or a purge is
  already in flight — the safe direction, still disclosed.

---

## The mutation standard

Unchanged from 005c/005d/006a: every claim carrying a mutant ID ships a
named, exact edit to shipped source that breaks the behaviour the claim
names, plus a recorded observation that the claim's own instrument turns RED
under it. Checked three ways per mutant: **baseline GREEN** (≥1 test
executed), **build TYPECHECKS** (learning 16 — every mutant, before it is
counted), **mutant RED** (≥1 failed assertion).

This cycle: **25 mutants, 25 SENSITIVE, 0 build-invalid**, tree restored
byte-identical (`mutants.txt`). The battery re-bases the 006a mutants that
still apply (M1–M12, M14; anchors moved by the fix are updated), REPLACES
the withdrawn-fallback mutant (old M13 restored a rethrow that no longer
exists), and adds M13 and M15–M25 for this cycle's behaviours. `25/25` is an
**execution fact**, never a coverage measure.

---

## Claims

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 1 | **REVIEW-023 finding 1 is closed on the reviewer's own schedule.** Double refusal — keychain writes+deletes AND demand-store writes all refusing: process 1 shows `signedOut` with ZERO unhandled rejections and no durable record (every medium refused); the demand store recovering BEFORE death lands the record at the next opportunity; a fresh module registry over the same media finds it and honours it — no session exposed, purge proven by read-back, demand cleared | PASS | `review023-probe.sh` → `review023-probe.txt`, "finding 1" test: RED at the reviewed candidate `caa31ee2` (the learning-14 positive control — the reviewer's exact failure reproduces there), GREEN at this head | — (the two-tree run IS the counterfactual) |
| 2 | `record()` NEVER rejects: a refused backend write holds the demand in the handle's memory, reported as `held`; `isOutstanding` answers true for a held demand without a backend read | PASS | `reauth-demand.test.ts` (ruling-25 describe) | M13 |
| 3 | The held demand's durable record is retried at every later opportunity until a medium answers: `retryHeldRecord` flushes on recovery and the flushed record is restart-visible; the observer retries at its next write; the provider retries on every outstanding-branch foreground | PASS | `reauth-demand.test.ts` + `foreground-refresh.test.ts` + `auth-provider.test.tsx` | M15 (flush), M16 (next-write), M17 (foreground) |
| 4 | **A refused session write is absorbed in EVERY case** — including when the demand store also refuses. No path out of the session-key branch rethrows; the pinned client never enters its throw-and-reject Deferred path | PASS | `foreground-refresh.test.ts` (double-refusal absorb) + zero unhandled rejections across every `review023-probe` schedule | M11 |
| 5 | The demand is recorded before the refused write resolves (demand first, flag second, then resolve) | PASS | `foreground-refresh.test.ts`, event-order assertion | M12 |
| 6 | **REVIEW-023 finding 2 is closed on the reviewer's own schedule.** With the logout leg HELD after `signOut()`'s internal refresh: `signedOut` and the durable demand exist AT the hold point — the state changed when the demand was made, not when the purge settled; release → read-back → demand cleared | PASS | `review023-probe.sh`, "finding 2" test (RED at `caa31ee2`, GREEN here) + `auth-provider.test.tsx` pending-logout test | M18 |
| 7 | While a demand is outstanding, NO auth event exposes a session: the mid-purge TOKEN_REFRESHED carrying the session being purged is dropped; events flow again once the read-back ends the demand | PASS | `auth-provider.test.tsx` + `review023-probe` finding-2/A2 tests | M19 (the gate), M20 (the outstanding mark that feeds it — shares M19's instrument; M19 removes the door, M20 the signal) |
| 8 | **Advisory lead A:** an event arriving under an UNCONSUMED write-refusal flag — the A2/A3 window where the observer has recorded refusal+demand but this provider's cache is stale — is dropped; the A2 hold-point renders no unpersisted rotated session, and a refused-persist sign-in (A3) is never exposed | PASS | `auth-provider.test.tsx` flag-gate test + `review023-probe` A2/A3 tests (RED at `caa31ee2`) | M21 |
| 9 | **Advisory lead B (E1):** the shipped file backend consults by READ — content first; `exists` corroborates absence only; an unreadable existing-or-indeterminate record is outstanding; a record `exists` denies but the read returns is OUTSTANDING | PASS | `reauth-demand.test.ts` E1 describe + `review023-probe` E1 test (RED at `caa31ee2`) | M22 |
| 10 | **Advisory lead C (P3/B2):** a fresh sign-in RESOLVES an outstanding demand once its session is persisted AND read back — cleared, exposed, never destroyed by the stale demand's purge; resolution refuses when the persist was refused or nothing reads back, and only the app's own `verifyOtp` resolves (no event does) | PASS | `auth-provider.test.tsx` resolution tests + `review023-probe` B2 test (RED at `caa31ee2`) | M23 (read-back required), M25 (no unconsumed refusal) |
| 11 | The death-before-recovery schedule — every medium refuses AND the process dies before any recovers — loses the demand: demonstrated, with absorption still holding (zero unhandled) and the residual exposed on restart. **The ruling-25 Known limit, instrumented rather than claimed away** (Known limit 1) | PASS (as the recorded limit) | `review023-probe.sh`, Known-limit test (RED at `caa31ee2` on its zero-unhandled half) | — (the limit is the absence of a mechanism; nothing to mutate) |
| 12 | The REVIEW-022 finding-3 closure is preserved at this head: the 006a probe re-run is RED at base `7caf23e1` and GREEN here, restart schedule included. The base run proves only what executes before its first failing assertion (REVIEW-023 finding 5's narrowing, carried) | PASS | `../006a-session-durability/finding3-probe.sh` re-run at this head → this directory's `finding3-probe.txt` | — |
| 13 | `confirmRemoved` reads exactly the ordered enumerable address set — index, generation 0 × 256, generation 1 × 256, each address once, reads only — and a value at the FINAL address turns the verdict false only after all 513 reads | PASS | `secure-store-adapter.test.ts`, exact-address + final-address tests (the REVIEW-023 claim-2 upgrade) | M24 |
| 14 | The provider's purge verdict is the read-back and nothing else; the demand clears on the purge path only on read-back proof; the observed purge precedes the provider's own `getSession()`; consult-refusal is outstanding; the flag path records durably before purging; a recorded demand is restart-visible; the demand record is exactly `{v, reason, at}` with no token material | PASS (carried from 006a, re-run at this head) | `auth-provider.test.tsx`, `reauth-demand.test.ts`, op-log assertions | M4, M5, M6, M7, M8, M9, M10 |
| 15 | The read-back detects stranded material `getItem` would never return; refused chunk/index reads are never absence | PASS (carried) | `secure-store-adapter.test.ts` | M1, M2, M3 |
| 16 | A successful session write does NOT end the demand — only read-back proof does. Mutant sensitivity is measured at the observer boundary by a generic later write; the real-client `signOut()` internal-refresh schedule is the `review023-probe` finding-2 test (the REVIEW-023 attribution narrowing) | PASS | `foreground-refresh.test.ts` + the probe schedule | M14 |
| 17 | Carried, 005d claim 53: the write-refusal flag is sticky until taken | PASS | `foreground-refresh.test.ts` (unchanged schedule) | — (005d's M31 was its counterfactual) |
| 18 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check, all exit 0 — **10 suites, 180 tests** | PASS | `gates.txt` | — |
| 19 | Every mutant is build-valid and every claim carrying a mutant ID has one that turns its instrument red — **25/25 SENSITIVE, 0 build-invalid** | PASS | `mutants.txt` | this row IS the mutation record |
| 20 | The gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, both exiting 0, all matching the committed copies; `binding.txt` compared two-tier (strict between runs; head-line-masked against the committed copy, both heads printed) | PASS | `stability.txt` — 8/8 gated + binding | — |
| 21 | **The capture binds itself and fails closed on producer failure**: `binding.txt` records the exact candidate SHA and a clean-tree verdict (porcelain empty beyond this evidence/output directory) before anything else is written; every git invocation's exit is checked and any non-zero exit fails the capture; the reviewer's PATH-prepended exit-77 `git diff` control is committed and proves it (wrapper self-tested, wrapped capture exits non-zero) | PASS | `binding.txt` + `capture-refusal-control.sh` → `capture-refusal-control.txt` | — (the committed control is the counterfactual: 006a's producer false-greened under it) |
| 22 | RED lane: `supabase/`, `.github/`, and generated types are object-identical to base; 0 database-layer paths; 0 database-operation hits; every scan's positive control matched; every git invocation's exit checked | PASS | `red-lane.txt` | — |
| 23 | No banned auth surface appears in application source — measured as EXACTLY the literal pattern list through the comment-blanking pipeline, every pattern's control matched (the REVIEW-023 claims-23/24 narrowing) | PASS | `banned-apis.txt` | — |
| 24 | `expo.scheme` is byte-identical to base (ruling 8); no src/ code hit and no `expo.name` hit for the gated name — the literal case-insensitive pattern, now WITH a fragment-built positive control | PASS | `chrome.txt` | — |
| 25 | The dependency delta is exactly Unit E's authorized one: **the lockfile package-key set is IDENTICAL to base** (0 added, 0 removed, proven from the lockfile objects), the only changed entries being the root manifest (the one direct-dependency line) and `expo-file-system` 57.0.4→57.0.5; this fix cycle adds nothing | PASS | `deps.txt` (the REVIEW-023 finding-5 key-set proof) | — |
| 26 | GitHub CI passes on the exact pushed head (PR #17, draft) | **NOT RUN at capture time** | `ci.txt` — added post-push, bound to the pushed SHA (a head cannot be known before its own push) | — |

---

## Producers and artifacts

`capture.sh` writes every `.txt` artifact here **except** `README.md`,
`mutants.txt`, `stability.txt`, `finding3-probe.txt`, `review023-probe.txt`,
`capture-refusal-control.txt`, and `ci.txt` — seven exceptions, listed
exhaustively, matching its own header. It pins `BASE=7caf23e1…` literally,
refuses a stale pin, refuses a dirty tree (beyond this evidence/output
directory), records its binding, checks every git invocation's exit, and
fails closed on any gate, scan, control, or git failure.

**Not offline by construction:** `npm audit` reaches the npm registry,
confined to the non-gated `npm-audit.txt`. No Supabase endpoint is contacted
anywhere in this suite and no credential is read.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `binding.txt` | `capture.sh` | gated (two-tier in stability) | candidate SHA + clean-tree verdict; the head line is masked only against the committed copy at a different head |
| `gates.txt` | `capture.sh` | gated | the four CI steps; 10 suites, 180 tests |
| `adapter-properties.txt` | `capture.sh` | gated | one jest invocation per suite |
| `session-properties.txt` | `capture.sh` | gated | provider + foreground-refresh + reauth-demand |
| `route-guards.txt` | `capture.sh` | gated | unchanged surface, re-proven at this head |
| `banned-apis.txt` | `capture.sh` | gated | run-time positive control per pattern |
| `red-lane.txt` | `capture.sh` | gated | object identity, path filter, operation scans, git exits checked |
| `chrome.txt` | `capture.sh` | gated | scheme freeze; gated-name scan with its new positive control |
| `deps.txt` | `capture.sh` | gated | lockfile package-key set proof + the authorized delta |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | reaches the network; upstream advisories |
| `mutants.txt` | `mutants.sh` | not gated | exit status is its contract; verifies its own restoration |
| `finding3-probe.txt` | `../006a-session-durability/finding3-probe.sh` (re-run, output here) | not gated | the 006a instrument at this head: base RED, head GREEN; 006a stays byte-identical |
| `review023-probe.txt` | `review023-probe.sh` | not gated | seven schedules; reviewed candidate `caa31ee2` RED, head GREEN; verdict block + runner exit are the contract |
| `capture-refusal-control.txt` | `capture-refusal-control.sh` | not gated | the committed REVIEW-023 negative control; wrapper self-test + wrapped capture non-zero |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself |
| `ci.txt` | one-off `gh run view` | not gated | post-push, bound to the pushed SHA |

`review023-probe.tsx` is the committed probe source (no `.test` suffix, so
`npm test` never runs it in place; typechecked at this head by the ordinary
`tsc` gate — the tsconfig includes `docs/`). `review023-probe.sh` copies it
into disposable worktrees at the pinned reviewed candidate and at HEAD and
requires RED-then-GREEN.

---

## NOT RUN — and why

1. **GitHub CI on this cycle's pushed head** (claim 26) until the post-push
   `ci.txt`. A head cannot be known before the push that creates it.
2. **Any live Supabase call.** Offline by dispatch. The ruling-25 bound —
   refresh-token rotation rejecting a consumed token outside the reuse
   interval — is server behaviour; Unit F measures it live.
3. **Locked-device behaviour.** ADR-009 keeps it NOT RUN / NOT CLAIMED in
   Phase A; the named physical-device test gates Phase B exit.
4. **A real process restart.** The probes' restarts are jest module-registry
   resets over persistent in-memory fakes; no OS process died.
5. **The demand store's real backend.** `expo-file-system`'s file-on-disk
   behaviour is exercised nowhere in this suite. In particular, whether the
   INSTALLED package can report `exists === false` under an I/O refusal —
   the advisory E1 premise — is NOT RUN; what IS proven is that the shipped
   consult no longer lets that answer be the sole gate (claim 9), over
   synthetic mocks.

---

## Known limits of the instruments

1. **The ruling-25 limit: death before any medium recovers.** When the
   keychain AND the demand store refuse and the process dies before either
   recovers, no durable record can exist and the next process exposes the
   residual session (claim 11 demonstrates exactly this). Recorded as a
   Known limit, not a defect, per ruling 25: the bound is Supabase's
   refresh-token rotation — the residual's refresh token was consumed at
   rotation, and a consumed token is rejected outside the reuse interval, so
   the exposure ends server-side at its next refresh. The bound is live
   behaviour and Unit F measures it; the probes' fake server grants every
   rotation and cannot.
2. **The record window is not atomic** (carried from 006a Known limit 7). A
   crash between the keychain's refusal and the durable record's write loses
   that event's durability — same bound as limit 1.
3. **The read-back proves an instant, not a barrier** (carried from 006a
   Known limit 8). A library-internal operation in flight when
   `confirmSessionPurged()` returns true can write afterwards; its outcome
   is contained by the same machinery as any other write.
4. **Resolution's clear can be refused.** Lead C's resolution clears the
   demand on read-back evidence; if the durable record's removal is refused,
   the record outlives this process and the next RESTART's consult purges —
   costing one conservative re-authentication of a valid session. Safe
   direction; the in-process exposure decision is unaffected.
5. **A purge already in flight defers resolution.** The `evaluating` latch
   makes a sign-in completing mid-purge fall to the conservative
   consumed-sign-in path rather than race the sweep. Narrow window (a
   foreground transition during OTP entry); safe direction; disclosed.
6. **The mutation battery is not coverage.** 25/25 is an execution fact
   (learning 16).
7. **Re-authentication still cannot force a refusing store** (carried from
   006a Known limit 5). The demand survives and retries until read-back
   proof, but a store that refuses deletes forever keeps the residual on
   disk; this layer provably refuses to USE it and cannot delete what the
   OS will not delete.
8. **The A2 exposure window collapses under in-memory fakes.** React
   batches the mid-purge transient away inside one `act()`, so the A2 probe
   holds the logout leg open to keep the window observable — the same
   compression the advisory noted of the committed 006a probe. The unit
   instruments (M19–M21) are the render-boundary counterfactuals.
9. **`refreshWhileForeground`'s `unpersisted` outcome remains native-only**
   (ADR-008, carried). On web no observer exists, no demand is recorded,
   nothing is claimed; web keeps `localStorage` and gains no observer, and
   the storage-key namespace change on web is accepted under ruling 26.
10. **The absorb is key-filtered, not path-filtered** (carried from 006a
    Known limit 10, now bounded further by lead C): a refused sign-in
    persist reports success with nothing on disk, the flag gates its event
    (claim 8), and the divergence still ends at the next evaluation.

---

## Disclosures — ruling 6

1. **Workflows run: NONE.** No multi-agent workflow and no subagent was used
   in this cycle; every probe, battery, and capture was run inline by the
   builder session. The ruling-6 fan-out disclosure is nil.
2. **Two writers shared this branch.** `REVIEW-023-ADVISORY.md` (DeepSeek V4
   Pro) landed at `0de2e406` while this cycle was in flight; the branch was
   rebased onto it before the first push (`git pull --rebase`, per
   dispatch). Per the cycle-1 addendum, leads 1–3 were adjudicated into
   scope and are closed as claims 8–10; nothing else in the advisory was
   acted on.
3. **The 006a probe was re-run, not edited.** `finding3-probe.txt` here is
   the output of `../006a-session-durability/finding3-probe.sh` invoked with
   this directory as its output parameter; 006a stays byte-identical.
4. **`npm audit` reaches the network** (non-gated artifact only).
5. **`ci.txt` is added post-push** — claim 26's boundary.
6. **M4/M5 and M19/M20 share instruments** — each pair's rows say why and
   which assertion or mechanism separates them.
7. **The editor was open throughout; no `npm ci` was run** in this session
   (no dependency work existed); no ENOTEMPTY occurred in any run.
