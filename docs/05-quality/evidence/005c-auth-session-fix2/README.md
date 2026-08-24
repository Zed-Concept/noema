# Evidence — Unit D, auth and session v1, fix cycle 2 (005c)

**Cycle:** fix cycle 2 of 3, answering **REVIEW-020 FAIL**. One cycle remains.
**Branch:** `feat/auth-session-v1`. **Base:** `main` at `d5b4f8ae`, merged in.
**Phase:** A — offline. No credential is read and no Supabase endpoint is
touched. `npm audit` is the one step that reaches a network service; see
**Record corrections** 1.

Predecessors are retained, not replaced: `../005a-auth-session/` is the build
cycle's record and `../005b-auth-session-fix1/` is fix cycle 1's. Where this
cycle contradicts one of them, the contradiction is named here rather than
silently corrected there.

---

## What this cycle changed

Seven findings, and they divide into four different kinds of work. Saying which
kind each is matters, because two of them are not repairs.

### 1. ADR-007 — a decision replaced, not a defect patched (finding 1)

REVIEW-020 finding 1 proved with three probes that `stopAutoRefresh()` cannot
establish ADR-005's property while the client schedules its own refreshes:
construction begins `_initialize()`, which may recover-and-refresh and then
restarts the ticker through `_handleVisibilityChange()` regardless of app state,
and `stopAutoRefresh` cancels neither initialization nor an in-flight refresh.
Pinned auth-js 2.112.3 exposes no cancellation API for either.

The three lifecycle paths are therefore **not patched**. ADR-007 replaced the
clause, and this cycle implements it:

| ADR-007 clause | Where it lives | How it is checkable |
|---|---|---|
| The client never self-schedules | `src/lib/supabase.ts`, `autoRefreshToken: false` | one construction option. Both restart paths are gated on this flag in the pinned source — `_recoverAndRefresh` at `GoTrueClient.js:4104`, `_handleVisibilityChange` at `:4693` — so turning it off removes them rather than racing them |
| Refresh only by explicit foreground-gated calls | `src/lib/auth/foreground-refresh.ts` | one function, dependencies injected. `status !== 'active'` is a whole-function early return: while backgrounded it initiates **nothing**. There is no ticker to stop |
| A refresh whose persistence fails is surfaced | `src/lib/auth/session-storage.ts` observer + `auth-provider.tsx` | a refused session write is recorded, and the session layer requires re-authentication rather than continuing against a token it did not store |

**Item 3 is the security-relevant one, and it is the point.** The danger was
never that a refresh fired; it was that a rotated token vanished unnoticed. When
`_saveSession` cannot write, the server has already rotated the refresh token,
so what remains on disk is the **superseded** one — the exact input to
refresh-token reuse detection days later, with no diagnostic trail.

What deliberately remains is auth-js's **on-demand** refresh: `getSession()`
still calls `_callRefreshToken` when the stored access token is inside its 90s
`EXPIRY_MARGIN_MS` (`GoTrueClient.js:2554`). That is not self-scheduling — it
fires only on a call this app makes — and the foreground gate is what keeps
those calls foreground-only. It is also the path that recovers a
long-backgrounded session, which is why it is not disabled.

**Locked-device behaviour is NOT RUN and NOT CLAIMED.** ADR-007 classifies it so
for the whole of Phase A and carries a named physical-device test into Phase B.
No claim about a locked keychain appears in this suite, and the one that used to
sit in `secure-store-adapter.ts` has been withdrawn in place.

### 2. The ceiling — a number re-derived from measurement (finding 2)

`MAX_CHUNKS` is **64 → 256**. The old value was fail-closed and never
truncated — REVIEW-020 verified that — but its justification was asserted and
false: auth-js persists the whole `Session.user`, `UserMetadata` carries an
open-ended index signature, and a structurally valid session with a
100,000-character metadata value needs 67 chunks. 64 refused a session the
pinned client can hand this adapter.

Findings 6 (REVIEW-019) and 2 (REVIEW-020) **constrain each other**: sweeping
the full key space rather than trusting the index is what made removal cost
scale with the ceiling, which is what drove the ceiling down, which is what
finding 2 rejects. `session-sizes.txt` is the measurement that resolves it, and
it reads `CHUNK_BUDGET_BYTES` and `MAX_CHUNKS` out of the shipped module rather
than restating them:

| chunks | session shape |
|---|---|
| 2 | empty `user_metadata` — what Noema v1 email OTP actually creates |
| 8 | 10 KiB metadata |
| 67 | REVIEW-020 finding 2's counterexample |
| 172 | 256 KiB metadata |
| 684 | 1 MiB metadata — **above the ceiling, refused** |

256 covers this product's actual session **128×** and finding 2's
counterexample **3.8×**, at a removal cost of exactly **513** backend deletes,
paid once per sign-out and asserted as a literal by test.

**The claim is bounded, and here is the bound.** No finite ceiling is provably
unreachable — the 1 MiB row is a session above this one. `MAX_CHUNKS` is a
**resource bound on removal, not a safety property**, and the refusal above it
is a **disclosed functional limit**. What makes it safe rather than merely
bounded is that exceeding it throws *before any backend write*: zero writes, a
byte-stable key set, the previous value still readable, never a truncation.
Whether the Noema Supabase project would return metadata approaching this size
is **NOT RUN** — no server-side bound is established, and none is assumed.

### 3. Three instruments rebuilt (findings 3, 4, 5)

Each of these existed and measured something other than what it claimed.

**Token opacity is now a source scan** (`src/__tests__/token-opacity.test.ts`).
A behaviour-preserving parse is undetectable by black-box test *by definition* —
REVIEW-020 demonstrated it with `try { JSON.parse(value); } catch {}`, which
passed all 48 adapter tests and all four gates. The new instrument parses the
adapter with the TypeScript compiler and walks the AST. An AST rather than a
grep because the adapter contains **one legitimate `JSON.parse`** — `parseIndex`
parses the index, which this adapter wrote and which is not token material — and
a ban that must be suppressed at its only real hit is a ban nobody keeps. The
rule is that `JSON.parse` may appear only inside `parseIndex`. Five positive
controls, one per rule, per learning 14, plus a control asserting the sanctioned
index parse does **not** trip it.

**The ninth schedule exists** — reader versus removal. A mutant bypassing only
removal's queue, `removeItem: (key) => removeItemBody(key)`, returned `null` to
a stalled reader while passing all 48 cycle-1 adapter tests: M1–M3 remove the
queue *globally*, and none made removal's own participation load-bearing. The
new schedule asserts the reader returns the complete old value, and structurally
that no delete lands between its first and last chunk read.

**M4 is rebuilt on both axes it failed.** See **The mutation standard** below.

### 4. One claim deleted (finding 6)

Subtraction, applied deliberately. See **Subtractions** below.

---

## The mutation standard

Cycle 1 introduced mutants; this cycle adds the gate that makes their count
mean something. Every mutant is now checked **three** ways: baseline GREEN,
**mutated tree TYPECHECKS**, mutant RED with at least one failed assertion.

The build gate is learning 16, and REVIEW-020 finding 5 is what earned it: a
mutation that fails typecheck is not a counterfactual, because it is not a
program this project could ship — but Jest's Babel path strips types and runs it
anyway, so the harness scored it red for the wrong reason.

**The gate found two more of these on its first run**, both inherited from cycle
1 and both previously reported SENSITIVE:

| mutant | why it was build-invalid | now |
|---|---|---|
| M5 `index-delete-failure-swallowed` | `(await deleteBackend(key)) \|\| true` makes TypeScript infer the literal type `true`, so the later `complete = false` raises TS2322 | explicit `: boolean` annotation; same behaviour removed, compiles |
| M16 `payload-bytes-leak-into-index` | added a field to the `ChunkIndex` object literal, tripping the excess-property check on a closed type | leaks the same payload bytes through the serialized object instead; compiles |

**M4 failed both axes and is rebuilt on both.**

*Not build-valid:* `if (!indexRead.ok && false)` destroys narrowing of the
`BackendRead` union, so `indexRead.value` raises two TS2339 diagnostics and
`typecheck` exits 2. Independently reproduced this cycle. The edit is now a
refusal returning the *other member of the same union*, so narrowing is
untouched — and it is the cleaner statement of the defect anyway, since
invariant 1 is precisely "absence is not failure".

*Not load-bearing:* its named test refused the **first** replacement chunk
write, so the laundering mutant changed no stored byte — the old session
survived, the safety postcondition still held, and the test went red only
because the refusal-specific error text did not match. The test now allows one
chunk write to land first, so the mutant overwrites a live chunk of generation 0
in place, **and the assertions are reordered**: the no-write postcondition is
checked first and the error's identity last. Verified — under the rebuilt
mutant the failure is `Array []` versus a `set` of `…auth-token.0.0`, not a
string mismatch.

**27 mutants, 27 SENSITIVE, 0 build-invalid, tree restored byte-identical.**
That count is an **execution fact** — each edit landed, the mutated tree
compiled, the named instrument turned red. It is **not** a coverage measure and
**not** a claim that every behaviour has a mutant. See claim 49.

---

## Claims

Claims carried unchanged from `../005b-auth-session-fix1/README.md` are not
restated; that record stands except where **Record corrections** says otherwise.
What follows is what this cycle adds, changes, or withdraws.

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 1 | The auth client never self-schedules a refresh: `autoRefreshToken: false` at construction | PASS | `supabase-client.test.ts` asserts the option on the object `createClient` was actually called with | M22 |
| 2 | While the app is not foreground the session layer initiates **no** refresh — it does not stop a ticker, it starts nothing | PASS | `foreground-refresh.test.ts`, both non-foreground AppState values, asserting the call count is zero | M23 |
| 3 | A rotated session whose write is refused is reported as `unpersisted` | PASS | `foreground-refresh.test.ts` over the **real** adapter and a **real** in-memory keychain, refusing an actual write. Also asserts the superseded token is what survived on disk | M24 |
| 4 | The write observer records the refused write itself, and rethrows rather than absorbing it | PASS | `foreground-refresh.test.ts` | M25 |
| 5 | An `unpersisted` outcome forces re-authentication, device-locally | PASS | `auth-provider.test.tsx`; asserts `{ scope: 'local' }` — ADR-005's scope decision is untouched by ADR-007 | M26 |
| 6 | Re-authentication is forced **even when the cleanup removal also fails** | PASS | `auth-provider.test.tsx`. The residual is disclosed, not closed — see **Known limits** 1 | — bounded by claim 5's mutant |
| 7 | A transient failure that is **not** a persistence failure does not sign the user out | PASS | `foreground-refresh.test.ts`, `auth-provider.test.tsx` | — |
| 8 | The failure flag is read-and-clear, so one refused write forces re-authentication once | PASS | `foreground-refresh.test.ts` | — |
| 9 | A refused **removal** is not recorded as a persistence failure | PASS | `foreground-refresh.test.ts` — bounded to the claim it supports, per learning 12 | — |
| 10 | The ticker is never touched, in any AppState | PASS | `auth-provider.test.tsx`, asserted negatively across three transitions | — |
| 11 | The ceiling admits every session shape measured, including REVIEW-020 finding 2's counterexample, and still fails closed above itself with zero writes | PASS | `secure-store-adapter.test.ts`, `session-sizes.txt` | M29 |
| 12 | The adapter never parses or inspects the payload — **by source scan**, not by result | PASS | `token-opacity.test.ts`: AST walk, five positive controls, exactly one `JSON.parse` and only inside `parseIndex` | M28 |
| 13d | The serialization queue covers **every** public operation, removal included | PASS | the ninth schedule in `secure-store-adapter.test.ts` | M27 |
| 14a | A refused index read blocks the write and preserves the live session | PASS | rebuilt load-bearing; safety postcondition asserted before error identity | M4 (rebuilt) |
| 47 | This cycle adds **no dependency**. ADR-007 is a construction option and two small modules; the token-opacity scan uses the TypeScript compiler already present as a devDependency, and `@types/node` was deliberately **not** added — see **Known limits** 3 | PASS | `deps.txt` | — |
| 48 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check — all exit 0 | PASS | `gates.txt`; 9 suites, 116 tests | — |
| 49 | **Every mutant in the battery is build-valid, and every claim marked with a mutant ID above has one that turns its instrument red.** The battery does **not** cover every behavioural row, and rows without a mutant ID are exactly the rows that have none | PASS | `mutants.txt` — 27 mutants, 27 SENSITIVE, 0 build-invalid | — this row IS the mutation record |
| 50 | The gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, both runs exited 0, and both match the committed copies | PASS | `stability.txt` — 8/8 identical | — |

**Claim 49 is corrected, not restated.** Cycle 1's version read "every claim
above that names a behaviour has a mutant that turns its instrument red", while
its own table left rows blank and its own note said so — REVIEW-020 finding 5.
The claim now says what the table shows: coverage is exactly the rows carrying a
mutant ID, and the count is an execution fact rather than a semantic one.

---

## Subtractions

**The checksum no longer claims to distinguish same-length payloads.**

REVIEW-020 finding 6 exhibited two valid session-shaped JSON strings, 60 code
units each, with identical FNV-1a `2614443459`. Both are reproduced here and
verified this cycle:

```text
{"access_token":"000pwu","refresh_token":"r","expires_at":1}
{"access_token":"00b5fa","refresh_token":"r","expires_at":1}
```

The predecessor test was named *"is deterministic, and distinguishes same-length
payloads"* and proved that with a single hand-picked pair. One pair differing is
not a distinguishing property.

**The remedy is deletion, not a wider hash.** ADR-006 forbids the dependency and
the crypto call, and 32-bit FNV remains exactly adequate for what ruling 15 asks
of it — truncation, accidental damage, and the interleaved-writer hybrid of
REVIEW-019 finding 2. The instrument was right; the sentence written about it was
wrong. The collision is now kept as an **executable record** so the deleted
claim cannot quietly return.

This does **not** violate ADR-006, whose rule is conditional on the recorded
checksum *disagreeing* with the reassembled payload. Here it agrees.

The surrounding describe-block comment is also narrowed: it now says the
checksum closes *those exact two* REVIEW-019 counterexamples, and that "catches
same-length corruption" as a general property is **not** claimed.

---

## Producers and artifacts

`capture.sh` writes every artifact in this directory **except** `README.md`,
`mutants.txt`, `stability.txt`, `session-sizes.txt`, and `ci.txt`. Five
exceptions, listed exhaustively: cycle 1's manifest named three and had four,
which REVIEW-020 finding 7 caught. A manifest that cannot be checked against the
directory listing is not a manifest.

`capture.sh` takes an optional output directory as its **first positional
argument** — a parameter, not an environment variable, because learning 10 bans
ambient flags that steer a shipped producer. It **fails closed**: a failing gate,
a banned-API hit, a broken positive control, a RED-lane hit, or a changed
`expo.scheme` makes it exit 1 after writing the transcript that shows why.

**This producer is not offline by construction.** See **Record corrections** 1.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | the four CI steps |
| `adapter-properties.txt` | `capture.sh` | gated | `--verbose`, one jest invocation per suite in a producer-chosen order. **`token-opacity` added this cycle** — a property of the adapter module, measured by reading its source |
| `session-properties.txt` | `capture.sh` | gated | `--verbose`, **two suites this cycle**. `auth-provider` replaces the client with a double and proves the wiring; `foreground-refresh` runs the real adapter over a real in-memory keychain and proves the behaviour. The split answers REVIEW-020 finding 1 directly: method spies cannot observe a storage write |
| `route-guards.txt` | `capture.sh` | gated | `--verbose`, guard and chrome assertions |
| `banned-apis.txt` | `capture.sh` | gated | banned identifiers across `src/` excluding tests, each with a run-time positive control |
| `red-lane.txt` | `capture.sh` | gated | object identity for `supabase/`, `.github/`, generated types; path filter; database-operation scans, each with a positive control |
| `chrome.txt` | `capture.sh` | gated | app-name source, `expo.scheme` against base, ruling-8 scan |
| `deps.txt` | `capture.sh` | gated | dependency delta against base. This cycle adds none |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | **reaches the network.** Tracks the upstream advisory database |
| `session-sizes.txt` | `session-sizes.sh` | not gated | **new this cycle.** Deterministic by construction — reads two constants from the shipped module and does arithmetic, with no clock, network, or filesystem ordering. Not compared by `stability.sh`, which runs `capture.sh`, and a stability run of a pure function compares it against itself |
| `mutants.txt` | `mutants.sh` | not gated | its exit status is its contract. Not compared by `stability.sh`: `mutants.sh` rewrites and restores tracked source, and running it twice more doubles that exposure for no information. It verifies its own restoration byte for byte |
| `ci.txt` | one-off `gh run view` | not gated | GitHub CI on the **exact pushed head**, recorded in a follow-up commit because the head cannot be known before the push that creates it. Bound to that one SHA and to nothing else — see **Record corrections** 3 |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself. Its exit status is its contract |

---

## Record corrections

These correct **this cycle's predecessors**. REVIEW-019 and REVIEW-020 are
immutable records and are not edited; the corrections live here.

**1. `npm audit` was RUN in cycle 1, and the cycle-1 record said it was not.**

`005b/README.md:256` classified it **NOT RUN**, stating that `npm-audit.txt`
records `getaddrinfo ENOTFOUND registry.npmjs.org`. The committed artifact
records no ENOTFOUND: it reports **21 vulnerabilities (10 moderate, 11 high)**.
The record contradicted the artifact sitting beside it.

`005b/README.md:84` compounded it by describing `capture.sh` as "offline by
construction". It is not, and its own header already said so: `npm audit` posts
the dependency manifest to the npm registry's advisory endpoint.

Corrected here in three places at once: this README, `capture.sh`'s header —
which now states the network step in block capitals rather than in passing — and
`stability.sh`'s header, which notes that running `capture.sh` twice posts the
manifest twice.

**This cycle's status: `npm audit` RAN.** 21 vulnerabilities, unchanged. The
finding class is **FAIL pre-existing** and out of scope: it is owned by
PROJECT-STATE **Known issues** #2, every advisory is upstream of Expo, and this
cycle adds no dependency, so it cannot have moved the number.

**2. The cycle-1 producer manifest omitted `ci.txt`.** It named three exceptions
and had four. This cycle's manifest names five and the directory has five.

**3. `ci.txt` overextended its run in cycle 1.** Run `32671673617` was valid
exact-head CI for `81ecd0d`, but the artifact described it as covering "the
exact tree under review" — and the artifact itself was added after `81ecd0d`,
with the review target later still. A CI run is evidence about one commit. This
cycle's `ci.txt` names its SHA and claims that commit only.

**4. `PROJECT-STATE.md`'s Active work row.** Cycle 1's row read BUILD with both
reviewers unnamed while the authoritative LOCK said otherwise. Reconciled on
this branch as part of the main merge, taking this branch's row and bringing it
current rather than leaving a conflict-dodging stale entry — learning 18.

**5. A withdrawn claim in `secure-store-adapter.ts`.** Its `WHEN_UNLOCKED` note
asserted that a refresh "never fires against a locked device, and there is no
lost write to fix". REVIEW-020 finding 1 disproved the first half; the second was
never established in this phase. Both are withdrawn in place, with what replaced
them named: the codebase no longer claims the write cannot be lost — it
**detects** that it was.

---

## NOT RUN — and why

| | Why |
|---|---|
| Real OTP, live Supabase session, real session size from the server | Phase A is offline. No credential is read and no endpoint is contacted. This is why the ceiling is justified by measurement rather than by a server-side bound |
| **Locked-device behaviour, and the token loss it would cause** | No device or simulator. ADR-007 classifies this NOT RUN and NOT CLAIMED for Phase A and carries a named physical-device test into Phase B: background a signed-in app, lock the device, force a refresh window, assert the write either succeeds or its failure is surfaced. Passing it gates Phase B exit |
| Real iOS/Android keychain; a second process or native thread | Same. The adapter's serialization scope is stated in the module and excludes these explicitly |
| Served browser flow and real `localStorage` | Module and component tests only. The web branch of `session-storage.ts` is asserted, not exercised in a browser. The write observer does **not** cover web, and does not claim to |
| Advisory reviewer (DeepSeek V4 Pro) | Controller-owned seat. Named in the LOCK, **never dispatched** this session |

---

## Known limits of the instruments

1. **Re-authentication cannot force the store to cooperate.** If the store that
   refused the rotated write also refuses the deletes, the superseded session
   stays on disk and the next cold start reads it back. The app refuses to keep
   using it — that decision is unconditional — but the residue is real. This is
   **disclosed, not closed**, and it is stated in `auth-provider.tsx` at the
   code that makes the trade.

2. **The write observer is native-only.** Web gets `undefined` storage so
   `supabase-js` uses `localStorage`, which this module never sees. A
   quota-exceeded write there is not observed and no claim is made that it is.

3. **The token-opacity scan reads the adapter module only.** It is a whitelist
   of forbidden constructs over one file, not whole-program taint analysis: it
   would not catch a payload exported to another module and parsed there. The
   claim is bounded to the module the ADR names. It also runs under `tsconfig`'s
   `types: ["jest"]` and uses `require('fs')` rather than `node:fs` deliberately
   — adding `@types/node` to satisfy one test would widen the project's type
   surface and its declared dependencies, and REVIEW-020's RED-lane check
   records `expo-secure-store` as this unit's only dependency addition. That
   stays true.

4. **`session-sizes.txt` measures shapes, not observations.** It says what the
   adapter would need for sessions of the shapes named. It does not claim any
   shape occurs, and it establishes no server-side bound.

5. **The early `gates.txt` stability anomaly remains unexplained.** It did not
   recur in the builder's ten follow-ups, in the reviewer's fresh run, or in
   this cycle's runs. REVIEW-020 ruled it non-dispositive. It is **not** written
   off: it still bars any universal, environment-independent determinism claim,
   and what is claimed remains the narrow one — these captures, at this head,
   matched. Carried forward deliberately as an open disclosure.

---

## Disclosures — ruling 6

- **Model substitution.** Dispatched as Fable 5; run as **Opus 5 [1m]** at the
  ruling-5 Max effort class, the sanctioned fallback when Fable 5 quota is
  unavailable. Recorded here, in the LOCK, and in HANDOFF. The harness-fixed
  `Co-Authored-By` trailer disagrees; the LOCK and HANDOFF are authoritative.
- **Workflows run: none.** No subagent fan-out. All work was performed in one
  session by the builder directly.
- **Mutation exposure.** `mutants.sh` rewrote tracked source 27 times and
  restored it; restoration is verified byte-for-byte in `mutants.txt` and the
  backup directory is printed in the transcript. Additionally, five disposable
  mutations were applied by hand during development to verify new instruments
  redden — the ninth schedule, the token-opacity scan, both M4 variants, and the
  two rebuilt build-invalid edits — each restored and digest-verified against a
  pre-edit copy at the time.
- **No live run.** No Supabase endpoint was contacted. The `.env` present in the
  working copy is loaded by the Expo CLI of its own accord during `lint`; its
  variable **names** are echoed and are dropped from transcripts by `mask()`. No
  value is printed and none was read by this work.
- Every file written this cycle was read back after writing — learning 11.
