# Evidence — Unit E, session durability (006a)

**Controller:** CTRL-006 · **Branch:** `feat/session-durability` · **Base:**
`main` at `7caf23e1` (the CTRL-006 opening state commit, the tip the dispatch
names), branched from directly — no merge was needed; main has not moved.

**Model+Effort:** Fable 5 / Ultracode (xhigh + workflows) / fresh session —
the dispatched seat, verified at session start per learning 3. Ruling 22
restored Fable 5; no substitution occurred.

**Scope:** close REVIEW-022 finding 3 to ADR-009's three review-gated
requirements. Offline: no live Supabase call, no credential, nothing under
`supabase/` (asserted with positive controls in `red-lane.txt`, not assumed).

---

## Supersession of 005d claims

This unit deletes the purge-failure observer (`lastPurgeFailure` and its
peek/take/clear functions) that 005d's claims 54 and 55 were instrumented on:
REVIEW-022 finding 3 established that the ABSENCE of that observer's record
was being read as proof of deletion, which pinned `signOut()` can produce by
rejecting before any removal is attempted. Claims 54 and 55 therefore no
longer describe the shipped program — their properties are superseded by this
unit's claims 3–11 (purge success proven by key-space read-back; the demand
durable across restart), and the tests that encoded the false inference
(`auth-provider.test.tsx:573-590` as reviewed) are replaced, not patched.
Claim 51's boundary wording ("no app-initiated refresh can occur before the
first foreground") is withdrawn per ADR-009 — REVIEW-022 proved the pinned
client refreshes from construction with no app call — while its app-conduct
halves (this app's own calls and listener registration are deferred to first
foreground, the listener registers exactly once) survive and remain tested.
Claim 53 (the write flag is sticky until taken) carries forward unchanged and
is re-asserted here. The 005d README is not edited (immutable-record
practice); this paragraph governs.

---

## The mutation standard

Unchanged from 005c/005d: every claim carrying a mutant ID ships a named,
exact edit to shipped source that breaks the behaviour the claim names, plus
a recorded observation that the claim's own instrument turns RED under it.
Checked three ways per mutant: **baseline GREEN** (≥1 test executed), **build
TYPECHECKS** (learning 16 — every mutant, before it is counted), **mutant
RED** (≥1 failed assertion).

This unit: **14 mutants, 14 SENSITIVE, 0 build-invalid**, tree restored
byte-identical (`mutants.txt`). `14/14` is an **execution fact**, never a
coverage measure. Rows below without a mutant ID are exactly the rows that
have none, and each says why.

---

## Claims

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 1 | **The REVIEW-022 finding-3 probe is RED at the base and GREEN at this head.** At `7caf23e1`, the committed probe observes the finding's exact facts — zero delete attempts after a refused rotation (purge success inferred from silence), no durable demand record, unhandled `refused-session-write` rejections. At the candidate every assertion passes, across a restart schedule over the same fake storage | PASS | `finding3-probe.sh` → `finding3-probe.txt`; the base RED run is the probe's positive control (learning 14) | — (the two-tree run IS the counterfactual) |
| 2 | `confirmRemoved` reads the complete enumerable key space — the index plus both generations' full chunk ranges, 1 + 2×256 reads — and ONLY reads; observation cannot perturb what it proves | PASS | `secure-store-adapter.test.ts`, op-log assertions | — (asserted directly on the backend op log; a mutant that wrote during read-back would be caught by the same log assertion that defines the claim) |
| 3 | The read-back detects stranded chunk material that `getItem` would never return — "empty" means no material, not merely no readable session | PASS | `secure-store-adapter.test.ts` | M1 |
| 4a | A refused chunk read is never read as absence: one refusal withholds the proof | PASS | `secure-store-adapter.test.ts` | M2 |
| 4b | A refused index read is never read as absence | PASS | `secure-store-adapter.test.ts` | M3 |
| 5 | **The provider's purge verdict is the read-back and nothing else.** A `signOut()` rejection with a populated key space is NOT purged, and a later foreground retries the purge | PASS | `auth-provider.test.tsx` | M4 |
| 6 | The durable demand clears on the purge path only when the read-back proves the space empty | PASS | `auth-provider.test.tsx` | M5 — same instrument as M4, different failing assertion (the unproven clear fires while the retry still runs); stated because an unexplained shared instrument reads as a gap |
| 7 | The durable demand is consulted at first foreground BEFORE any session is exposed: while unmet, no bootstrap read, no listener registration, no settle | PASS | `auth-provider.test.tsx` | M7 |
| 8 | While the demand is outstanding, the observed purge comes BEFORE the provider's own `getSession()` — the order REVIEW-022 found reversed | PASS | `auth-provider.test.tsx`, invocation-order assertions | M6 |
| 9 | A demand store that will not answer is treated as an outstanding demand — refusal is never absence | PASS | `auth-provider.test.tsx` + `reauth-demand.test.ts` | M8 |
| 10 | The flag-driven recovery records the demand durably BEFORE attempting the purge, so a crash mid-purge leaves the record | PASS | `auth-provider.test.tsx`, invocation-order assertion | M9 |
| 11 | A recorded demand is visible to a fresh handle over the same backend — the restart shape at the module's granularity | PASS | `reauth-demand.test.ts` | M10 |
| 12 | The demand record contains no secret: exactly `{v, reason, at}`, asserted as the exact key set, with no token material | PASS | `reauth-demand.test.ts` + the probe's content assertion against its own fake tokens | — (structural: the claim is an equality on the written bytes) |
| 13 | **A refused session-key write is recorded and absorbed**: the pinned client never enters its throw-and-reject path for it — EXCEPT under the recorded fallback of claim 15, when the demand store also refuses and the refusal must reach the caller | PASS | `foreground-refresh.test.ts`, real adapter + real demand module over in-memory doubles | M11 |
| 14 | The durable record lands before the refused write resolves — nothing between the refusal and the record could observe silence | PASS | `foreground-refresh.test.ts`, event-order assertion | M12 |
| 15 | When the demand itself cannot be recorded, the write rejects with the ORIGINAL cause — the recorded fail-closed fallback, executed rather than described | PASS | `foreground-refresh.test.ts` | M13 |
| 16 | **A successful session write does NOT end the demand** — like the sticky flag, the demand outlives later successes and ends only on read-back proof. This direction was flipped by this unit's own adversarial review: the earlier clear-on-success let `signOut()`'s internal refresh write (REVIEW-022 finding 2, recorded behaviour) erase a purge-pending demand mid-purge, before any proof | PASS | `foreground-refresh.test.ts` | M14 — the mutant RE-CREATES the reviewed defect by restoring the clear |
| 17 | Carried, 005d claim 53: the write-refusal flag is sticky until taken | PASS | `foreground-refresh.test.ts` (same schedule as 005d) | — (005d's M31 was its counterfactual; the schedule is unchanged here) |
| 18 | Zero unhandled `refused-session-write` rejections across the probe's full schedule — refused rotations, refused purges, a restart, a recovery. Bounded to schedules where the demand store answers: the claim-15 fallback deliberately re-enters the pre-ADR-009 rejection path when BOTH stores refuse, and is recorded, not hidden | PASS | `finding3-probe.txt` (the base run shows the rejections the head run must not have) | — |
| 19 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check, all exit 0 — **10 suites, 159 tests** | PASS | `gates.txt` | — |
| 20 | Every mutant is build-valid and every claim carrying a mutant ID has one that turns its instrument red | PASS | `mutants.txt` — 14/14 SENSITIVE, 0 build-invalid | this row IS the mutation record |
| 21 | The gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, both exiting 0, all matching the committed copies | PASS | `stability.txt` — 8/8 identical | — |
| 22 | RED lane: `supabase/`, `.github/`, and generated types are object-identical to base; 0 database-layer paths; 0 database-operation hits; every scan's positive control matched | PASS | `red-lane.txt` | — |
| 23 | No banned auth surface appears in application source; every pattern's runtime positive control matched | PASS | `banned-apis.txt` | — |
| 24 | `expo.scheme` is byte-identical to base (ruling 8); no user-visible string contains the gated name | PASS | `chrome.txt` | — |
| 25 | The dependency delta is exactly `expo-file-system ~57.0.5` — already in the lockfile via `expo` itself; no new package entered the tree | PASS | `deps.txt` | — |
| 26 | GitHub CI passes on the exact pushed head | **NOT RUN** | `ci.txt` ABSENT BY DESIGN — a head cannot be known before its own push (the REVIEW-022 claim-48a ruling). To be added post-push, bound to the pushed SHA | — |

---

## Producers and artifacts

`capture.sh` writes every `.txt` artifact here **except** `README.md`,
`mutants.txt`, `stability.txt`, `finding3-probe.txt`, and `ci.txt` — five
exceptions, listed exhaustively, matching its own header. It pins
`BASE=7caf23e1…` literally and **refuses to run** if that pin is not an
ancestor of HEAD (inherited from 005d after REVIEW-021 finding 6). It fails
closed on any gate, scan, or control failure.

**Not offline by construction:** `npm audit` reaches the npm registry, confined
to the non-gated `npm-audit.txt`. No Supabase endpoint is contacted anywhere
in this suite and no credential is read.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | the four CI steps; 10 suites, 159 tests |
| `adapter-properties.txt` | `capture.sh` | gated | one jest invocation per suite, adapter first |
| `session-properties.txt` | `capture.sh` | gated | provider + foreground-refresh + reauth-demand; the middle one runs the real adapter and real demand module over in-memory doubles |
| `route-guards.txt` | `capture.sh` | gated | unchanged surface, re-proven at this head |
| `banned-apis.txt` | `capture.sh` | gated | run-time positive control per pattern |
| `red-lane.txt` | `capture.sh` | gated | object identity, path filter, operation scans with controls |
| `chrome.txt` | `capture.sh` | gated | scheme freeze, ruling-8 scan |
| `deps.txt` | `capture.sh` | gated | the one authorized dependency, shown from the diff |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | reaches the network; upstream advisories |
| `mutants.txt` | `mutants.sh` | not gated | exit status is its contract; verifies its own restoration byte for byte |
| `finding3-probe.txt` | `finding3-probe.sh` | not gated | jest failure output orders lines by timing; the verdict block and the runner's exit status are the contract. Contains the head SHA it ran against — the implementation commit; the commit adding this transcript necessarily post-dates it (the same boundary as `ci.txt`) |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself |
| `ci.txt` | one-off `gh run view` | not gated | **ABSENT as committed** — see claim 26 |

`finding3-probe.tsx` is the committed probe source. It deliberately carries no
`.test` suffix so `npm test` never runs it in place; `finding3-probe.sh` copies
it into disposable worktrees at the base pin and at HEAD, with this working
copy's `node_modules` symlinked in, and requires RED-then-GREEN. It IS
typechecked at this head by the ordinary `tsc` gate (the tsconfig includes
`docs/`), so the instrument itself is build-valid (learning 16's spirit).

---

## NOT RUN — and why

1. **GitHub CI on this unit's pushed head** (claim 26). The head cannot be
   known before the push that creates it. `ci.txt` is absent, not stale.
2. **Any live Supabase call.** This unit is offline by dispatch. No OTP sent,
   no session issued, no live refresh or purge measured. Unit F owns all live
   behaviour.
3. **Locked-device behaviour.** ADR-009 keeps it NOT RUN / NOT CLAIMED in
   Phase A; the named physical-device test gates Phase B exit. Unit F owns it.
4. **A real process restart.** The probe's restart is a jest module-registry
   reset over persistent in-memory fakes: every process-local variable any
   revision keeps is genuinely gone, but no OS process died and no real disk
   was read back. The device-level restart is Unit F territory.
5. **The demand store's real backend.** `expo-file-system`'s actual
   file-on-disk behaviour is exercised nowhere in this suite — the module is
   mocked in jest — and cannot be until a device participates. What IS proven
   offline is the module's whole contract with its store (`reauth-demand.test.ts`)
   and the composition over a store double (probe, foreground-refresh suite).

---

## Known limits of the instruments

1. **The swept space is the session key's.** `confirmSessionPurged` reads back
   the key space under `AUTH_SESSION_STORAGE_KEY` — the space `removeItem`
   sweeps. The probe's discovery step asserts exactly ONE adapter index exists
   after a real sign-in, so in this configuration (no `userStorage`, email OTP,
   no PKCE flow) that space is the whole of what the pinned client stored. A
   future configuration change (a `userStorage`, an OAuth flow writing
   verifiers) would widen what "purged" must mean; the boundary is stated
   here rather than discovered later.
2. **The demand ends in exactly one place — and the review that forced that.**
   An earlier version of this unit also cleared the demand on any successful
   session write, reasoning that a completed write proves the disk holds the
   newest session. The pre-handoff adversarial review (disclosure 1) refuted
   the design with a concrete schedule: `signOut()` refreshes the residual on
   its way out (REVIEW-022 finding 2, recorded behaviour), so the purge's OWN
   internal write — succeeding inside Supabase's refresh-token reuse-grace —
   erased a `session-purge-pending` demand while the purge was unproven; a
   kill in the window that follows (a full no-timeout network fetch sits
   between that write and the removal) left a readable session and no durable
   record. The clear was deleted rather than conditioned: the sticky flag was
   going to force a re-authentication after any recovery write anyway, so the
   clear bought nothing and opened a restart hole. The cost of the surviving
   design is one conservative re-authentication when a session is freshly
   minted while a demand is outstanding — the same safe-direction behaviour
   the sticky flag has had since 005d. Fragments of an overwritten OLD
   generation can outlive a refused cleanup: unreachable through `getItem`
   (reads are bounded by the new index), removed by the next full sweep, and
   named here rather than claimed away.
3. **The read-back costs 513 reads** per verification, on recovery paths only
   (never on the ordinary sign-in/settle path). Same cost class as removal's
   own 513-delete sweep, and the same reason: enumerability is what makes
   proof possible.
4. **The mutation battery is not coverage.** 14/14 is an execution fact
   (learning 16).
5. **Re-authentication still cannot force a refusing store.** Carried from
   005d: the demand now survives restart and retries until the read-back
   proves the space empty, but a store that refuses deletes forever keeps the
   residual on disk. This layer refuses to USE it — provably, claim 7 — and
   cannot delete what the OS will not delete. Disclosed, not closed.
6. **`refreshWhileForeground`'s `unpersisted` outcome remains native-only**
   (ADR-008). On web no observer exists, no demand is recorded, and nothing
   is claimed. `confirmSessionPurged` returns false on web and no production
   web path calls it.
7. **The record window is not atomic.** A crash in the interval between the
   keychain's refusal and the durable record's write loses that event's
   durability — a write-ahead record would only invert the window. Bounded:
   the on-disk residual's superseded token then meets Supabase's server-side
   refresh-token reuse detection, the backstop that predates this unit.
8. **The read-back proves an instant, not a barrier.** A library-internal
   operation already in flight when `confirmSessionPurged()` returns true can
   write afterwards. Its outcome is contained by the same machinery as any
   other write — a refusal records flag and demand; a success stores a
   server-current session — and is recorded behaviour under ADR-009, not
   prevented.
9. **The shipped demand-store backend gates its read on `File.exists`.**
   Whether the installed `expo-file-system` can report `exists === false` on
   an I/O refusal rather than throwing is not observable offline; if it can,
   a refusal at that layer reads as absence and a consult misses a demand.
   The module-level fail-closed contract is proven over the injectable
   interface (claim 9); the native layer is Phase B territory. Failure
   direction: a missed demand falls back to the server-side reuse-detection
   backstop.
10. **The absorb is key-filtered, not path-filtered.** Every refused
    `AUTH_SESSION_STORAGE_KEY` write is recorded-and-absorbed, including a
    sign-in's own persist — auth-js then reports the sign-in as succeeded
    with nothing on disk. The divergence is bounded to one foreground cycle:
    the flag and the durable demand were both recorded before the write
    resolved, so the next evaluation forces the re-authentication. An
    oversized (>MAX_CHUNKS) session hits the same path: the adapter's
    fail-closed refusal is recorded as a demand rather than surfacing as a
    sign-in error, and the stored previous session is then purged — a
    disclosed consequence of not distinguishing the library's persist paths,
    which ADR-009 bars enumerating.
11. **A double-refusal availability schedule is source-read, not probed.**
    Reading pinned auth-js suggests a store that refuses DELETES during
    `_callRefreshToken`'s internal cleanup can leave its refresh Deferred
    pending — hanging concurrent `getSession()` callers and, through the
    provider's `evaluating` latch, parking the purge machinery for the rest
    of the process. The durable demand is recorded BEFORE any such hang, so a
    restart recovers and R2 holds; the hang itself is an availability
    question about library internals under schedules no Phase A instrument
    reaches (learning 20: a probe, not a reading, would settle it). Reported
    to the controller as an adjacent finding rather than closed here.

---

## Disclosures — ruling 6

1. **Workflows run:** one — `unit-e-adversarial-review`: 3 finder lenses (one
   per ADR-009 requirement) + 14 verifiers (one per finding), 17 subagents
   total, run against the committed implementation before handoff. It
   returned 14 confirmed findings; the builder's adjudication — one HIGH
   class fixed by subtraction (the clear-on-success, claim 16), one freeze
   fixed by a one-line reorder (signedOut set before the purge await), two
   claims narrowed (13, 18), the rest disclosed as Known limits 7–11 — is
   recorded in the HANDOFF with the full list. Workflow self-verification is
   supplementary and is never the review (ruling 6); the reviewer of record
   gates.
2. **The editor was open throughout.** The learning-11/ENOTEMPTY caution names
   `npm ci` and gate runs; `npm ci` was never run in this session (the one
   dependency was added with `npx expo install`, which installs additively),
   and no ENOTEMPTY occurred in any gate, battery, stability, or probe run.
3. **The probe transcript names the implementation commit as its head** — see
   the artifact table note. Rerunnable at any later head by
   `bash finding3-probe.sh`.
4. **`npm audit` reaches the network** (non-gated artifact only).
5. **There is no `ci.txt` in this directory** — claim 26, absent by design.
6. **M4 and M5 share an instrument** — claim 6's note says why, and which
   assertion fails under which mutant.
