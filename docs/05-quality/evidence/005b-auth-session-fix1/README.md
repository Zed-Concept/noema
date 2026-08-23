# Evidence — 005b Auth and session v1, fix cycle 1 (Unit D, CTRL-005)

Branch `feat/auth-session-v1`, fix cycle 1 of 3 in response to **REVIEW-019
FAIL**. Main was merged into the branch first, so this cycle is measured against
`main` at `7095267f3891e4d019cc9926b57930107e6e86be` — which carries ADR-004,
ADR-005, and ADR-006. Those are main's records and nothing here attributes them
to this unit.

Phase A, offline: **no Supabase call, no credential read, no signup, no user
creation, no types regeneration, no migration** was performed.

`../005a-auth-session/` is the build cycle's record and is retained
unregenerated. It measures replaced code; read it as history, not as a current
claim.

## What this cycle changed, and why it is three things rather than ten

REVIEW-019 reproduced eight deterministic counterexamples. They were not fixed
as eight schedules — eight schedules imply a ninth, and the two-generation
design already failed once by reasoning schedule by schedule. Three invariants
were established instead, and the counterexamples are unreachable because the
invariants hold.

| Invariant | What it says | Findings it closes |
|---|---|---|
| 1 — absence is not failure | A backend that refuses to answer has told us nothing. `setItem` rejects rather than guessing a generation when it cannot read the current index; `removeItem` reports success only when every key it swept is actually gone. `getItem` is a deliberate asymmetry — a refused read cannot prove a value, and `null` is its fail-closed answer, not an assertion about the store | 3, 4 |
| 2 — operations are serialized | Every public operation runs to completion before the next starts, so a reader can never hold an index across a writer's cleanup and two writers can never select the same spare generation | 1, 2 |
| 3 — cleanup does not stop at the first gap | `removeItem` deletes the complete enumerable key space for both generations and never terminates early on an absent key | 6 |

Plus **ADR-006**: a dependency-free, non-cryptographic checksum recorded in the
index and verified on read, closing finding 5.

**The checksum is corruption detection, not tamper resistance.** Binding ruling
15 bars any claim otherwise here, in code, or in documentation. It catches
truncation, accidental damage, and a payload assembled from two different
writes. It does not resist an adversary who can write self-consistent values
into the Keychain — such an adversary recomputes it as easily as we do, and
already holds the tokens. That limit is not only stated: claim 12 below asserts
it as a behaviour, so no later reader can mistake the checksum for integrity.

**ADR-005 lands here**, having been ruled pending in the review candidate:
`signOut({ scope: 'local' })`, auto-refresh gated on AppState, and SecureStore
stated at `WHEN_UNLOCKED` rather than inherited.

### Serialization scope, stated rather than assumed

| | |
|---|---|
| **Covered** | Every operation issued through one adapter instance in one JS runtime. On native that is all of it in practice: `session-storage.ts` builds exactly one instance at module scope, JavaScript on iOS and Android runs on a single interpreter, and every session read and write auth-js performs goes through that instance |
| **Not covered** | A second OS process or app extension touching the same keychain item; a native thread writing below the JS layer; a second adapter instance, which would carry its own queue. None arise in this app today and none are claimed |
| **Not applicable** | Web. `Platform.OS === 'web'` never reaches this module — `session-storage.ts` hands `supabase-js` `undefined` so it uses its own `localStorage` default — so nothing here says anything about browser tabs |
| **Not used** | auth-js's `lock` option. The pinned auth-js 2.112.3 marks the only lock it ships for this environment (`processLock`) `@deprecated` — "the auth client coordinates refreshes itself ... passing `{ lock: processLock }` to it has no effect" — and annotates its own lock path `TODO(v3): remove legacy lock path`. It would also serialize only the calls auth-js makes, where the adapter's queue covers every call that reaches it |

## Producers and artifacts

`capture.sh` writes every artifact except `README.md`, `mutants.txt`, and
`stability.txt`. It takes an optional output directory as its **first positional
argument** (defaulting to this directory) — a parameter, deliberately not an
environment variable, because learning 10 bans ambient flags that steer a
shipped producer. `stability.sh` uses that argument to capture into temp
directories.

`capture.sh` **fails closed**: a failing gate, a banned-API hit in source, a
broken positive control, a RED-lane hit, or a changed `expo.scheme` makes it
exit 1 after writing the transcript that shows why.

Locale is pinned `LC_ALL=C LANG=C` (learning 7). The Expo CLI loads a local
`.env` of its own accord and echoes the variable **names** it exported; those
lines are dropped by `mask()` as machine state, and no value is ever printed.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | the four CI steps. Exactly three normalizations: `env:` lines dropped; trailing `(N s)`/`(N ms)` suffixes removed entirely rather than masked — jest prints a suite duration only above a threshold, so a masked-but-optional field is not presence-invariant; `Time:` masked. No general mid-line duration rule exists, deliberately: `\b` is a word boundary to GNU sed and a literal `b` to BSD sed. Jest emits one `PASS`/`FAIL` line per suite in completion order, which is timing-dependent, so those lines are sorted — sorted, not dropped |
| `adapter-properties.txt` | `capture.sh` | gated | `--verbose`, so every storage-layer assertion is named individually: the adapter, the platform split, the keychain accessibility class, and the client wiring. **One jest invocation per suite**, in an order this producer names — see *Instrument corrections* 8 for why a single four-suite invocation was not byte-stable |
| `session-properties.txt` | `capture.sh` | gated | `--verbose`, the auth provider's assertions named individually |
| `route-guards.txt` | `capture.sh` | gated | `--verbose`, guard and chrome assertions named individually |
| `banned-apis.txt` | `capture.sh` | gated | ten banned identifiers scanned across `src/` excluding tests, each with a run-time-assembled positive control |
| `red-lane.txt` | `capture.sh` | gated | **new this cycle.** Whole-tree object identity for `supabase/`, `.github/`, and the generated database types; a database-layer path filter; and ten database-operation patterns over the range's added lines. Every negative scan carries a positive control |
| `chrome.txt` | `capture.sh` | gated | app-name source, `expo.scheme` compared against the base commit, ruling-8 name scan, title mechanisms |
| `deps.txt` | `capture.sh` | gated | dependency delta against the base commit. This cycle adds none |
| `environment.txt` | `capture.sh` | run-varying | node, npm, and OS of the machine; the locale line is pinned by construction |
| `npm-audit.txt` | `capture.sh` | run-varying | tracks the upstream advisory database |
| `mutants.txt` | `mutants.sh` | not gated | **new this cycle.** Its exit status is its contract. Not compared by `stability.sh`: `mutants.sh` rewrites and restores tracked source, and running it twice more inside a stability gate doubles that exposure for no additional information. It verifies its own restoration byte for byte instead |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself (house precedent: `../002d-fix-loop-3/negative-control.txt`). Its exit status is its contract: 0 all-match, 1 otherwise |

### What the doubles model and do not model

The adapter is exercised against an in-memory double, which is what makes these
properties provable with no device, no native module, and no credentials.

The double is **strict** where `expo-secure-store` 57.0.1 is strict: it enforces
the same key regex (`/^[\w.-]+$/`) and the same string-only value rule. It is
**faithful** where the real module is lenient: a missing key reads back `null`
and deleting an absent key is a no-op.

Two things it gained this cycle, both required to reach behaviour REVIEW-019
showed the previous battery never touched:

- **Per-operation failure injection.** A predicate per verb decides which
  individual calls reject. Rejecting *every* call, which is all the previous
  double could do, cannot reach a schedule where discovery succeeds and cleanup
  fails — and that schedule is findings 3, 4, and 6.
- **A structured operation log.** Interleaving is a property of the ORDER of
  backend calls, so the order is asserted on directly rather than inferred from
  an outcome that might hold for another reason.

It does **not** model the real keychain. OS-level failures, biometric gating,
cross-process access, and the platform's actual per-value ceiling are outside it
— see NOT RUN below.

**The previous concurrency test drove a reader re-entrantly from inside the
writer's own backend call.** That schedule is now impossible by construction:
the adapter serializes, so a re-entrant call would wait for the operation that
is waiting for it. The tests drive real concurrent operations instead, which is
also what auth-js actually does.

## The mutation standard

REVIEW-019 findings 7 and 8 proved that three claims survived deletion of the
behaviour they named. A claim whose instrument cannot fail is not evidence.

**Every claim re-instrumented in this cycle ships a MUTANT**: a named, exact
edit to shipped source that breaks the behaviour the claim names, plus a
recorded observation that the claim's own instrument turns RED under it. This
generalises the run-time positive controls `banned-apis.txt` already applies to
its absence scans — the technique that became learning 14 and was then not
applied to the claims table.

Each mutant is checked both ways, which is what makes RED mean anything:

- **baseline** — the instrument runs against the unmutated tree and must be
  GREEN with at least one test actually executed. This catches a mistyped
  test-name filter, which would otherwise select nothing and be recorded as a
  passing control.
- **mutant** — the same instrument must be RED *with at least one failed
  assertion*. A mutant that made the file unparseable would also exit nonzero
  and would prove nothing, so the verdict is classified from jest's JSON report
  rather than from its exit status.

`mutants.sh` restores every file it edits and byte-compares the restoration.
Runtime is roughly 15 minutes: two jest invocations per mutant, single-worker.

## The battery

| Suite | Count | What it instruments |
|---|---|---|
| `secure-store-adapter.test.ts` | 48 | round trip, opacity, fail-closed, the checksum, the three invariants, teardown, key derivation, generation alternation |
| `supabase-client.test.ts` | 5 | **new.** the storage option actually reaching `createClient` |
| `session-storage-platform.test.ts` | 3 | the web/native split, both branches |
| `secure-store-accessibility.test.ts` | 2 | **new.** `WHEN_UNLOCKED` on every write, index and chunks |
| `auth-provider.test.tsx` | 20 | bootstrap, currency, OTP call shapes, device-local sign-out, the AppState gate |
| `route-guards.test.tsx` | 9 | redirect decisions, bootstrap gating, screen titles |
| `home-screen.test.tsx` | 2 | harness smoke, signed-in identity |
| **total** | **89** | |

## Claims

Every claim below is derived FROM the battery: each row names the exact
assertion that measures it and the exact mutant that turns it red. A claim with
no instrument is not here; a claim whose mutant survived was not explained away,
it was split until it isolated (see *Instrument corrections*).

| # | Claim | Class | Instrument | Mutant |
|---|---|---|---|---|
| 1 | A payload past the chunk threshold round-trips **byte-for-byte identical** (asserted as UTF-8 byte equality, not merely string equality), is genuinely split across more than one chunk key, and every stored chunk is within the byte budget | PASS | `adapter-properties.txt` — three named assertions | — see note below the table |
| 2 | Multi-byte text (Arabic) and non-BMP characters round-trip uncorrupted, and no chunk ever contains a lone surrogate | PASS | `adapter-properties.txt` — two assertions; the surrogate check is a UTF-8 encode/decode identity, which a torn pair fails | — |
| 3 | An empty string round-trips, and an absent key reads as null | PASS | `adapter-properties.txt` — "round-trips an empty string and reports an absent key as null" | — |
| 4 | A value larger than the chunk ceiling is **refused, not truncated**, and leaves nothing readable | PASS | `adapter-properties.txt` — "refuses a value larger than the chunk ceiling instead of truncating it" | — |
| 5 | The payload stays **opaque**: it is never parsed, so a value that is not valid JSON round-trips | PASS | `adapter-properties.txt` — "stores and returns a payload that is not valid JSON" | **M14** `payload-parsed-on-write` — inserts `JSON.parse(value)` into `setItem` |
| 6 | The payload is stored **verbatim**: the stored chunks concatenate to exactly the input, so nothing re-serialises it | PASS | `adapter-properties.txt` — "stores the payload verbatim, so nothing re-serialises it" | **M15** `payload-reserialised-on-write` |
| 7 | The index carries **adapter metadata only** — exact key set `__scs, c, g, len, n` — so no token field is copied out of the payload | PASS | `adapter-properties.txt` — "writes an index of its own metadata only, with no field off the payload" | **M16** `payload-bytes-leak-into-index` — adds a 32-character slice of the payload to the index |
| 8 | A missing middle chunk, a missing final chunk, an unparseable index, a foreign value at the base key, and an index with no recorded checksum each fail closed to **null, never a truncated prefix** | PASS | `adapter-properties.txt` — five named assertions | partially — see note |
| 9 | A payload that disagrees with its index fails closed to null | PASS | `adapter-properties.txt` — "returns null when the reassembled length disagrees with the index" | **M12** `payload-verification-removed` — removes both completeness checks. NOT ISOLABLE to the length check alone; see *Instrument corrections* 2 |
| 10 | `getItem` **resolves null rather than rejecting** for any backend throw — the index read and, separately, a **chunk** read | PASS | `adapter-properties.txt` — two assertions, the second with the index read succeeding first | **M13** `chunk-read-rejection-escapes` — unguards the chunk read AND rethrows from the outer catch. Load-bearing: auth-js awaits `getItem` outside its own try/catch |
| 11 | Corruption that **preserves the total length**, and a **self-consistent index describing a shorter payload**, both fail closed to null | PASS | `adapter-properties.txt` — two assertions; these are REVIEW-019 finding 5's two counterexamples verbatim | **M10**, **M11** `checksum-not-verified` |
| 12 | The checksum **does not detect a forger who recomputes it** | PASS, and it is a NON-property | `adapter-properties.txt` — "does NOT detect a forger who recomputes the checksum — this is not tamper resistance". Recorded as executable behaviour so ruling 15's distinction cannot quietly erode | — a mutant would assert tamper resistance, which is barred |
| 13 | The checksum is deterministic, distinguishes same-length payloads, and stays inside the unsigned 32-bit range the index encodes | PASS | `adapter-properties.txt` — "is deterministic, and distinguishes same-length payloads" | — |
| 14 | The index is written **last**, and a write interrupted before it lands is unreadable | PASS | `adapter-properties.txt` — two assertions, one on backend call order | — |
| 15 | **INVARIANT 1.** A refused current-index read makes `setItem` **reject**, and the live session survives it | PASS | `adapter-properties.txt` — "refuses to write, and preserves the live session, when the index read is refused", which is finding 4's schedule verbatim | **M4** `index-read-refusal-laundered` |
| 16 | The asymmetry is real: an **absent** index is not a refusal and the write proceeds; an **unreadable** index is overwritten without refusing, because nothing readable is lost | PASS | `adapter-properties.txt` — two assertions. Without these, a blanket "any problem rejects" would pass claim 15 and break the app | — |
| 17 | **INVARIANT 1.** `removeItem` **rejects** when every delete is refused, and the complete session is still readable afterwards | PASS | `adapter-properties.txt` — "reports failure with the session still readable when every delete is refused", which is finding 3's schedule verbatim | **M6** `removal-failure-swallowed-entirely` — drops both halves of the completeness report |
| 18 | Each half of that report is load-bearing on its own: only the index delete refused, and only a chunk delete refused, each still reject | PASS | `adapter-properties.txt` — two assertions | **M5** `index-delete-failure-swallowed`, **M7** `chunk-delete-failure-swallowed` |
| 19 | Reporting the failure does not cost the cleanup: the sweep is finished first, so the refused key is the only survivor and the value is already unreadable | PASS | `adapter-properties.txt` — "reports failure when only a chunk delete is refused, after finishing the sweep" | **M7** |
| 20 | `removeItem` resolves and leaves **zero keys** when the store is healthy | PASS | `adapter-properties.txt` — "resolves and leaves nothing when the store is healthy" | — |
| 21 | **INVARIANT 2.** A reader a writer overtakes is **never shown null**, and gets exactly the old payload or the new one | PASS | `adapter-properties.txt` — "never exposes null to a reader that a writer overtakes". The reader stalls a full macrotask mid-payload while the writer yields microtasks, which is finding 1's schedule | **M2** `serialization-removed--stale-reader` |
| 22 | **INVARIANT 2.** No write lands between a reader's chunk read and the next — asserted structurally, on the backend call order, not inferred from an outcome | PASS | `adapter-properties.txt` — "lets no write land between a reader chunk read and the next" | **M3** `serialization-removed--read-interleaving` |
| 23 | **INVARIANT 2.** Two concurrent writers never commit a payload belonging to neither, and each writer's chunk writes form one unbroken run | PASS | `adapter-properties.txt` — "does not let two writers commit a payload belonging to neither", which is finding 2's schedule | **M1** `serialization-removed--concurrent-writers` |
| 24 | A rejected operation does not stall the queue behind it | PASS | `adapter-properties.txt` — "keeps running after an operation rejects" | — |
| 25 | **INVARIANT 3.** A fragment stranded behind a gap **the adapter created itself** is still cleared | PASS | `adapter-properties.txt` — "clears a fragment stranded behind a gap the adapter created itself", which is finding 6's schedule: one refused cleanup delete, then a shorter replacement, then removal | **M8** `sweep-stops-at-first-gap` |
| 26 | **INVARIANT 3.** Removal sweeps the **complete enumerable key space** — every chunk key of both generations, present or not: `2 x MAX_CHUNKS + 1` deletes | PASS | `adapter-properties.txt` — "sweeps the complete enumerable key space, not just the occupied part", asserting the exact delete set | **M9** `sweep-bounded-to-occupied-range` |
| 27 | Removal leaves zero keys with a corrupted index, with a chunk already deleted, with a fragment in either generation, and after a longer value is replaced by a shorter one | PASS | `adapter-properties.txt` — four assertions, each asserting the exact surviving key set is empty | — |
| 28 | `removeItem` touches no sibling key auth-js derives off the same base key | PASS | `adapter-properties.txt` — "touches no other key while removing its own"; scope limit under **Known limits** | — |
| 29 | Chunk keys are derived deterministically from the base key and generation, are accepted by SecureStore's key rule, and cannot collide with auth-js's own sibling keys. Because exactly two generations exist, the complete chunk-key space stays enumerable from the base key alone — which is what makes claim 26 possible against a store with no key enumeration | PASS | `adapter-properties.txt` — three assertions | — |
| 30 | Successive writes alternate generation, and only one generation survives a replacement | PASS | `adapter-properties.txt` — two assertions | — |
| 31 | Web receives **no** adapter, so `supabase-js` falls back to its `localStorage` default; iOS and Android receive the chunked adapter | PASS | `adapter-properties.txt` — three platform assertions re-importing the module under each mocked `Platform.OS` | — |
| 32 | **The platform storage actually reaches the Supabase client**, asserted on the options object `createClient` is called with — presence *and* identity, because identity alone passes vacuously on web where the correct value is `undefined` | PASS | `adapter-properties.txt` — "passes the platform session storage to createClient". This is REVIEW-019 finding 8.2, which had no instrument at all | **M17** `client-storage-option-deleted` |
| 33 | Persistence stays on, without which `supabase-js` ignores the storage option entirely; auto-refresh stays enabled for the AppState gate to control; no session is parsed out of the URL | PASS | `adapter-properties.txt` — three assertions | — |
| 34 | **ADR-005.** Every SecureStore write states `WHEN_UNLOCKED`, on chunk keys as well as the index | PASS | `adapter-properties.txt` — two assertions against the DEFAULT backend, the only tests in the battery that do not inject a double | **M21** `keychain-accessibility-inherited` |
| 35 | `bootstrapping` is distinct from `signedOut`; cold start resolves to each correctly; it resolves rather than hanging when the read fails, **and when the read never settles** | PASS | `session-properties.txt` — five assertions | — |
| 36 | The provider subscribes to `onAuthStateChange` **before** reading; session state follows events in, through a refresh, and out; a late cold-start read cannot overwrite a newer event; the subscription is released on unmount | PASS | `session-properties.txt` — four assertions | — |
| 37 | Sign-in requests a code with `shouldCreateUser: true` **and never `emailRedirectTo`** (its presence is what makes a magic link); verification calls `verifyOtp` with `type: 'email'`; errors are returned, never thrown, including when auth-js **throws** rather than returning one | PASS | `session-properties.txt` — five assertions | — |
| 38 | **ADR-005.** `signOut` passes `scope: 'local'` — the exact argument, not merely that a call happened | PASS | `session-properties.txt` — "ends the session through signOut, device-locally" | **M18** `signout-scope-reverted-to-global` |
| 39 | **ADR-005.** Auto-refresh is gated on AppState: started when active, stopped on `background` and on `inactive`, restarted on `active` | PASS | `session-properties.txt` — "stops the ticker on background and on inactive, and restarts on active" | **M19** `appstate-gate-always-starts` |
| 40 | **ADR-005.** The gate reads the state the app is actually in at mount, so a provider mounted while backgrounded starts no ticker | PASS | `session-properties.txt` — "does not start a ticker when mounted while the app is backgrounded" | **M20** `appstate-gate-ignores-mount-state` |
| 41 | The AppState listener is released and the ticker stopped on unmount, and a rejected gate call is absorbed rather than crashing the effect | PASS | `session-properties.txt` — two assertions | — |
| 42 | During bootstrap the root mounts **no navigator at all**, so protected content cannot flash; a signed-out visitor to the protected group is redirected to `/sign-in`; a signed-in user is redirected out of the sign-in group; each group renders for its own audience | PASS | `route-guards.txt` — five assertions | — |
| 43 | Screen titles are set explicitly and resolve from the single config source — the header does not read the route name `index` | PASS | `route-guards.txt` — two assertions; bounded to the title values, not the mechanism (see **Known limits**) | — |
| 44 | Ten banned authentication surfaces appear **nowhere in application code** (`.ts`, `.tsx`, `.js`, `.jsx` under `src/`, tests excluded) | PASS | `banned-apis.txt` — 0 code hits each, every positive control MATCHED through the same pipeline, and the file count scanned is printed and asserted non-zero so the scan cannot pass vacuously | the run-time positive controls are the mutants |
| 45 | **The RED lane holds at the Git-object boundary.** `supabase/`, `.github/`, and `src/lib/database.types.ts` are byte-identical to base; no database-layer path is in the range; no added **non-`docs/`** line performs a policy, RLS, function, grant, storage-bucket, or RPC operation | PASS | `red-lane.txt` — object-ID comparison plus eleven controlled scans, each proven against a synthetic control containing what it looks for. The path filter runs over the whole range with no exclusion; the added-line scan excludes `docs/` and the artifact states the count. The exclusion is bounded — see **Known limits** | the run-time positive controls are the mutants |
| 46 | `expo.scheme` is byte-identical to the base commit; the user-visible app name resolves from one config source; ruling 8's gated name appears in no `src/` code and not in `expo.name` | PASS | `chrome.txt` — direct comparison, consumer list, zero-hit literal-title scan, and a direct assertion on `app.json` that fails the run if it matches | — |
| 47 | **Fix cycle 1 adds no dependency.** The ADR-006 checksum is computed inline, with no crypto API and no new package | PASS | `deps.txt` — the dependency-line diff against main contains exactly one `+` line, `expo-secure-store ~57.0.1`, which is the build cycle's authorized addition and the unit's only one. auth-js is recorded at its lockfile-pinned 2.112.3 and this cycle does not move it | — |
| 48 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check — all exit 0 | PASS | `gates.txt` | — |
| 49 | Every claim above that names a behaviour has a mutant that turns its instrument red | PASS | `mutants.txt` — 21 mutants, all SENSITIVE, tree restored byte-identical | — this row IS the mutation record |
| 50 | The gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, both runs exited 0, and both match the committed copies | PASS | `stability.txt`, plus three consecutive passes of the whole gate. Read with *Instrument corrections* 8 and 9, which are the two times it failed | — |

**On the rows with no mutant.** They are the ones whose behaviour has no
single removable guard — a round trip has nothing to disable but the whole
adapter, and an exact-key-set assertion on removal fails under any of several
mutants already listed. Rows 8 and 1 are partially covered: the missing-chunk
and length paths fall under M12, and the checksum-absent path under M10/M11.
Listing a mutant that does not isolate the named behaviour would repeat the
error this standard exists to prevent, so the column is left empty rather than
filled.

## Evidence classifications

Every check this cycle ran, classified as the dispatch requires.

| Boundary / check | Classification | Artifact or reason |
|---|---|---|
| `npm run typecheck` | PASS | `gates.txt`, exit 0 |
| `npm run lint` | PASS | `gates.txt`, exit 0 |
| `npm test -- --ci` | PASS | `gates.txt`, 7 suites / 89 tests / exit 0 |
| `npm run format:check` | PASS | `gates.txt`, exit 0 |
| Storage-layer properties (adapter, platform split, accessibility, client wiring) | PASS | `adapter-properties.txt`, four single-suite runs / 58 assertions named individually (48 + 5 + 3 + 2) |
| Session, OTP, sign-out scope, and AppState gate | PASS | `session-properties.txt`, 20 assertions named individually |
| Route protection and chrome titles | PASS | `route-guards.txt`, 9 assertions named individually |
| Ten banned auth surfaces absent from application code | PASS | `banned-apis.txt`, 0 code hits each, every positive control MATCHED |
| Client-only RED scope; no database auth delta | PASS | `red-lane.txt`, identical `supabase/`, `.github/`, and database-types objects plus eleven controlled scans |
| `expo.scheme` frozen; ruling-8 name absent; single name source | PASS | `chrome.txt`, `result: UNCHANGED` and zero-hit scans |
| No dependency added by this cycle | PASS | `deps.txt` |
| Mutation sensitivity of every re-instrumented claim | PASS | `mutants.txt`, 21/21 SENSITIVE, tree restored byte-identical, exit 0 |
| Byte-stability of the eight gated artifacts | PASS, with a disclosed history | `stability.txt`, 0 differing-or-failing comparisons, both captures exit 0 — and three consecutive passes of the gate after the ordering defect in *Instrument corrections* 8 was fixed. One earlier failure naming `gates.txt` was never reproduced or explained; it is recorded in *Instrument corrections* 9 rather than written off |
| REVIEW-019 findings 1-6 (the six implementation defects) | **fixed, and each fix instrumented** | claims 15, 17, 21, 23, 25, 11 — each instrument reproduces the review's own schedule, and each carries a mutant |
| REVIEW-019 findings 7-8 (the two evidence defects) | **fixed** | claim 7 is the missing token-opacity instrument; claims 10, 32, and 18 close the three claims that exceeded their probes; the mutation standard is the general remedy |
| REVIEW-019 findings 9-10 (the two record defects) | **corrected** | see **Record corrections** |
| `npm audit` | **NOT RUN this cycle** | `npm-audit.txt` records `getaddrinfo ENOTFOUND registry.npmjs.org` — this session had no route to the registry, so the advisory count was not re-measured. The standing figure and its FAIL pre-existing classification come from the 005a capture and PROJECT-STATE **Known issues** #2, which owns it. This cycle adds no dependency, so it cannot have changed the picture. Not this unit's defect and explicitly out of this cycle's scope |
| GitHub CI for this head | NOT RUN at the time of writing | PR #11 was open at head `4a190ac` with an empty check rollup. Pushing this cycle moves that head and triggers `.github/workflows/ci.yml` on `pull_request`; the result is not part of this artifact set. The HANDOFF states what was true when it was written |
| Live Supabase, real OTP, real session, credential use | NOT RUN | Phase A is offline; owner-executed Phase B |
| Real iOS/Android keychain, OS accessibility enforcement, OS/process concurrency | NOT RUN | no device or simulator run; see the NOT RUN table below |
| Browser `localStorage`, rendered title, real router navigation | NOT RUN | module and components tested with doubles; no served browser flow |
| Advisory-reviewer result | NOT RUN in this record | controller owns that seat; the auth-diff trigger in ADR-001 still applies |

## NOT RUN — and why

| Property | Why not run |
|---|---|
| Any live Supabase behaviour: a real OTP email, a real sign-in, a real session written to a real keychain | Phase A is offline by dispatch. Phase B carries all of it, owner-executed |
| The adapter against a **real** iOS/Android keychain | Needs a device or simulator build; none was made. Every adapter claim above is against the in-memory double |
| That `WHEN_UNLOCKED` actually prevents a background write on a locked device | Claim 34 measures that the option is passed on every write. What the OS does with it is a device property and was not measured |
| The platform's actual per-value size ceiling | The installed `expo-secure-store` 57.0.1 enforces **no** limit — the iOS-only oversize warning was deleted in 55.0.0, and no JS, Swift, or Kotlin path inspects value length. The chunk budget is a chosen safety margin, not a measured threshold |
| True OS-level concurrent access from two processes or native threads | Stated exactly under **Serialization scope**. The queue covers one JS runtime; a second process or a sub-JS-layer race is outside it and is not claimed |
| The cost of the exhaustive removal sweep on a real device | `2 x MAX_CHUNKS + 1 = 129` backend deletes per removed key, on sign-out. `MAX_CHUNKS` was reduced from 256 to 64 for exactly this reason, keeping a 96 KiB ceiling that is an order of magnitude beyond any session payload. The wall-clock cost of 129 native calls was not measured |
| That the web build actually uses `localStorage` at runtime | Claim 31 measures which value the module exports per platform, which is the branch this unit owns. The fallback itself is `supabase-js` behaviour, read from `GoTrueClient.ts`, not executed in a browser |
| The rendered browser tab title in a real static export | The mechanism is instrumented only as far as the screens rendering `<Head><title>`. No web export was built or served |
| Route protection under real expo-router navigation | Claims 42-43 measure each layout's guard decision with the router replaced by a double. No navigator was actually driven |
| A checksum collision returning a truncated payload | 1 in 2^32 by construction, and the length check is the independent guard that makes it not matter. Not reachable by any test that could be written in reasonable time |

## Known limits of the instruments

- **The checksum is corruption detection, not tamper resistance.** Stated here,
  in `secure-store-adapter.ts`, in ADR-006, and asserted as claim 12. An
  adversary with write access to the Keychain recomputes it and already holds
  the tokens.
- **The length check cannot be isolated by mutation.** It is a redundant second
  guard over the same corruption the checksum catches — kept because it is exact
  where a 32-bit checksum is probabilistic. Claim 9's mutant therefore removes
  both, and the claim is stated as the pair.
- **The banned-API scan blanks comments before scanning.** A comment that names
  a banned API is a mention, not a use. Two consequences, stated rather than
  hidden: a `//` sequence inside a string literal truncates the rest of that
  line, and a line whose first non-space character is `*` is treated as a JSDoc
  continuation. Either could be abused deliberately to hide a call. The positive
  controls run through the same blanking.
- **The scan covers `src/` and excludes `src/__tests__/`.** Test files
  deliberately contain banned tokens; a banned call introduced *in a test file*
  would not be caught. It reads source, not the bundle.
- **Claim 28 is bounded to the sibling keys auth-js actually derives.** The
  chunk namespace is `<key>.<generation>.<n>`; a *different* stored key literally
  named `<key>.0.0` would collide. auth-js's derived keys avoid dots by design,
  so this cannot arise from the library, but the adapter does not defend against
  a caller that chooses such a key itself.
- **The two chrome title assertions compare the rendered title against
  `APP_NAME` itself.** That catches a header reading the route name `index`, and
  a wrong or empty title. It does **not** distinguish "reads the single config
  source" from "hard-codes the string `APP_NAME` currently evaluates to". The
  single-source property is carried by `chrome.txt`'s consumer list and the
  zero-hit literal-title scan.
- **`red-lane.txt`'s added-line scan excludes `docs/`.** Two things under
  `docs/` name the operations the scan looks for without performing any:
  REVIEW-019.md's prose describing the scan the reviewer ran, and this
  directory's own transcript recording the pattern list and the synthetic
  control that must match it. Both are records of scanning, not scanning
  targets. The exclusion is bounded and cannot hide a database change: the path
  filter runs over the whole range with **no** exclusion and catches `.sql`
  anywhere, `supabase/` anywhere, and any `migrations/` or `policies/`
  directory; the three object-identity comparisons cover the entire `supabase/`
  tree; and nothing under `docs/` is applied to any database by any path in this
  repo. The excluded path count is printed in the artifact.
- **`red-lane.txt` establishes what the committed range contains.** It cannot
  establish the historical claim that no credential was read and no live service
  was contacted during the session — that remains unverifiable from Git, as
  REVIEW-019 recorded.
- **The stability gate proves determinism on this machine**, across two runs at
  one head. `environment.txt` records the environment it held for.
- **The mutation harness rewrites tracked source.** It restores from a
  pre-edit copy, byte-compares the restoration, and traps EXIT/INT/TERM. A
  SIGKILL would leave the tree mutated; the backup directory is printed at the
  top of `mutants.txt` so that is recoverable by hand.

## Instrument corrections made during this cycle

Recorded because a green artifact set that was never red proves less than one
that was — and because two of these were found by the new standard catching its
own subject.

1. **The mutation harness reported all twenty mutants as SURVIVED on its first
   run.** No mutation had been applied: `node -e` places the first script
   argument at `argv[1]`, not `argv[2]`, so the mutator read a file named by the
   anchor string, exited nonzero, and nothing consulted its exit status. Fixed
   both ways — correct indexing, and `edit` failures now abort the mutant and
   fail the run as a BROKEN MUTANT rather than being recorded as either result.
   The first run is the reason the verdict is classified from jest's JSON report
   instead of its exit status.
2. **`length-not-verified` SURVIVED, correctly.** Removing only the length
   comparison left the claim green because the checksum catches the same
   corruption. The instrument was not "explained"; the claim was restated as the
   pair it actually measures, the mutant now removes both guards, and the
   non-isolability is disclosed above rather than left implicit.
3. **`index-delete-failure-swallowed` SURVIVED.** Its instrument refused every
   delete, so the sweep's own check failed the removal and masked the mutation.
   The instrument was **split**: a new assertion refuses the index delete alone,
   and a second mutant covers the whole-report case. Both are now sensitive.
4. **`MAX_CHUNKS` was reduced from 256 to 64.** The bound cost nothing while the
   sweep stopped at the first absent key; invariant 3 gives it a price of
   `2 x MAX_CHUNKS + 1` deletes per removal. This is a narrowing of an
   over-generous constant, not a new limit: 96 KiB remains an order of magnitude
   beyond any session payload, and exceeding it is a thrown error at write time
   (claim 4), never a silent truncation.
5. **An index without a checksum now parses as "not ours".** The format is
   self-describing rather than migrated. This code has never run on a device —
   no EAS project, no store presence, Phase A offline — so the installed base it
   would strand is empty, and the alternative is accepting a payload that cannot
   be verified. Cost if that assumption is ever wrong: one re-authentication.
   Instrumented as part of claim 8.
6. **The RED-lane scanner matched itself, and exited 1.** Its first two
   captures reported hits that were the scanner's own pattern list, its
   run-time control literals, and `REVIEW-019.md`'s prose describing the scan
   the reviewer ran — mentions, not operations. Remedied the way 005a remedied
   the same class: the control literals are assembled from fragments at run
   time so the producer never contains the tokens it scans for, and the
   added-line scan is scoped to non-`docs/` paths with the bound stated above.
   The path filter and the object-identity comparisons were left unscoped, so
   nothing about a real database change became harder to see.
7. **The verbose transcripts were not byte-stable, and the stability gate caught
   it twice.** With `--verbose`, jest prints each suite's whole assertion tree as
   one block and orders the FILES by its own scheduling heuristic — slowest-first
   from its timing cache — so whole blocks changed places between runs as
   timings drifted. `--runInBand` did **not** fix it: the ordering is jest's
   file scheduler, not worker completion, and it survives a single worker. The
   gate transcript escaped it only because it prints one line per suite and
   sorts them, and a multi-line block cannot be sorted without being destroyed.
   Fixed by taking the order away from jest rather than normalising afterwards:
   `adapter-properties.txt` is now **one invocation per suite**, in a sequence
   the producer names. A first attempt at this — adding `--runInBand` alone —
   is recorded because it was wrong: it was applied on a plausible hypothesis
   about worker completion order before the differing bytes had been read, and
   reading them is what identified the real cause. `--runInBand` was kept, for
   the narrower reason now stated in `capture.sh`.
8. **One stability failure was never reproduced or explained.** An early run
   reported `gates.txt` DIFFERS from both its pair and the committed copy. It
   did not recur across ten subsequent runs — six isolated repeats of the test
   step and four full captures, two of them concurrent — and the committed copy
   matched every one of them byte for byte. It is **not** the reordering above:
   that section prints one line per suite and sorts them. The cause is
   **unidentified**, and it is recorded here because a byte-stability claim with
   a swept-aside failure behind it is the kind of stable false-green REVIEW-019
   was about.
9. **The pre-write purge of the target generation was removed.** After any
   completed write that generation is already empty, because that write's own
   cleanup emptied it; after an interrupted one it may hold fragments, and those
   are unreachable (bounded by `n`, verified by length and checksum) and are
   cleared by removal's exhaustive sweep. Keeping it would have cost
   `MAX_CHUNKS` deletes on every token refresh to clean material that is already
   unreadable. Subtraction, not extension.

## Record corrections

Both are REVIEW-019 findings 9 and 10, and both are corrections to records this
unit wrote.

1. **The 005a storage-test count.** `../005a-auth-session/README.md` said its
   producer table named "all 25 storage-layer assertions" while its own
   committed transcript reports `Tests: 31 passed` — 28 adapter cases plus 3
   platform cases. Corrected in place in that file, marked inline with the date
   and the finding number. Nothing else in that directory was regenerated: it
   measures replaced code and is the record of what REVIEW-019 reviewed.
2. **The HANDOFF touch-set boundary.** The build cycle's HANDOFF reported 10
   existing-file changes at `+138/-27` plus 25 new files at 2785 lines. Those
   figures are the range with the HANDOFF's own 211 inserted lines omitted.
   Learning 9 was applied correctly — a recordable-delta count is the right
   count — but the exclusion was not disclosed, and an undisclosed boundary is
   what makes a true number read as a wrong one. Derived and stated in this
   cycle's HANDOFF block: the full immutable range of the reviewed target
   (`07ad5a51..d6dc677`) is **36 files, +3134/-27**; excluding the HANDOFF alone
   it is **35 files, +2923/-27**; the HANDOFF itself is **1 file, +211**. The
   prior HANDOFF block is left exactly as written — append-only governance puts
   the correction in the new block, not over the old one.
