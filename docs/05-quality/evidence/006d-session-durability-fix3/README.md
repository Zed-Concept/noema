# Evidence — Unit E fix cycle 3, session durability (006d) — SUBTRACTION ONLY

**Controller:** CTRL-006 · **Branch:** `feat/session-durability` · **Base:**
`main` at `7caf23e1` (the Unit E dispatch pin; unchanged — main has not moved).

**Model+Effort:** Fable 5 / Max / fresh session — ruling 5's tier for a
review-fix loop, the dispatched seat, verified at session start.

**Scope — ruling 28 (owner, 2026-08-26) governs this cycle:** cycle 3 changes
NO behaviour. The stop rule fired on the exposure class after three
recurrences (REVIEW-023, REVIEW-024, REVIEW-025). No mechanism, gate,
barrier, lint rule, scanner, or state channel was added; no product runtime
code was modified — the three product-file changes this cycle are
comment-only, proven by comment-stripped token comparison against the prior
commit (see the HANDOFF). What this cycle does instead: **withdraws or
narrows every claim REVIEW-025 disproved**, names the two surviving
schedules as Known Issues with their compensating controls, re-runs the
existing instruments unchanged at this head, and commits an EXPECTED-RED
witness of the Known Issues. Offline: no live Supabase call, no credential,
nothing under `supabase/` (proven in `red-lane.txt`).

---

## SUPERSESSION — this README is the unit's final claims table and governs over 006c's, 006b's, and 006a's claims

`../006c-session-durability-fix2/`, `../006b-session-durability-fix1/`, and
`../006a-session-durability/` are **superseded by this record** and stay
byte-identical (immutable-record practice). Every claim withdrawn or
narrowed this cycle is listed here with the REVIEW-025 finding that caused
it:

- **The exposure invariant — WITHDRAWN as a claim (REVIEW-025 finding 1,
  third in-class recurrence; ruling 28).** 006c's scope prose and claim 6
  asserted the cycle-1 invariant: "no path exposes a session while a
  re-authentication demand is outstanding, in memory or durable." That
  invariant is **NOT established in general.** The narrowed truth: it holds
  for the enumerated schedules in the committed probes — REVIEW-023's
  pending-logout and the addendum's A2/A3; REVIEW-024's bootstrap,
  mid-process, event-before-record, and fresh-sign-in resolution — each
  re-proven at this head (claims 1–5, 7–8, 12 below), and for nothing
  further. REVIEW-025 demonstrated two schedules that defeat it; they ship
  as **Known Issues 1 and 2** in the register below, with a committed
  expected-RED witness. The invariant wording is withdrawn wherever it
  appeared: the 006c README (superseded by this section), the
  `auth-provider.tsx` listener comment, the `auth-state-publisher.ts`
  header, and the `auth-provider.test.tsx` describe head (all narrowed in
  the comment-only commit this cycle).
- **The lint/type "fact" — WITHDRAWN (REVIEW-025 finding 1; ruling 28).**
  006c claim 6's enforcement half asserted "no caller can reach `setState`
  by another route" as a scope-, lint-, and test-level fact. REVIEW-025's
  counterfactual disproved the universal: a default React import
  destructured under an alias (`const { useState: makeState } = React`)
  minted a second setter in the provider while typecheck exited 0, ESLint
  exited 0, and all nine committed publisher-suite tests stayed green. What
  is true and STAYS: the raw setter is a closure variable of the hook
  (TypeScript rejects any outside reference to that variable); the ESLint
  restriction bars the direct named `useState` import in
  `auth-provider.tsx` (that exact shape — REVIEW-025's direct-import
  control made it fire); and the source-shape test enumerates the CURRENT
  publishers and setter sites. The rule and the test stay; the claim
  shrinks to that enumeration. The aliasing bypass is documented beside the
  rule in `eslint.config.js` and in this README; the test describe phrased
  as "no route to the setter exists" was renamed (assertions unchanged —
  they were and remain byte counts of current source).
- **The evidence invariant — WITHDRAWN as a universal; NARROWED to the
  heads it measured (REVIEW-025 finding 2; ruling 28).** 006c claim 16
  asserted gated artifacts are "a function of the product trees only" and
  byte-stable "by construction" across ANY docs-only commit including the
  records head. Two REVIEW-025 counterfactuals disproved it with all twelve
  bound OIDs held equal: a docs/04-only review record grew the red-lane
  range listing (19→20) and stability exited 1; a type-invalid `.ts` under
  docs/ turned the typecheck gate and `gates.txt` drifted. The narrowed
  truth, stated in `capture.sh`, `stability.sh`, and the artifacts they
  write: gated artifacts depend on the bound product-tree OIDs **AND** on
  TypeScript under `docs/` (the tsconfig typechecks `**/*.ts(x)`) **AND**
  on the red-lane listing's range, which includes `docs/04-reviews`.
  **Stability is claimed at the named heads only** (claim 16 below);
  review records added afterwards change `red-lane.txt` by construction
  and are outside the claim. No exclusion was added to the listing this
  cycle — that would be a scanner change, and cycle 3 changes no
  behaviour.
- **`binding.txt`'s "NO commit SHA appears" sentence — REMOVED (REVIEW-025
  finding 2, source fact 1).** The sentence was false: line 14 carried the
  literal base SHA. Of the two remedies ruling 28 offered — remove the
  sentence or remove the literal — the sentence was the smaller edit: the
  base pin is an input the range scans start from and stays, now described
  honestly as "the one commit SHA in this file". 006c claim 18's "no
  commit SHA" parenthetical is corrected the same way (claim 18 below).
- **006c claim 19's "product-path listing" label — CORRECTED (REVIEW-025
  finding 2, source fact 3).** The listing never named product paths only:
  it excludes exactly `docs/05-quality/evidence` and `docs/01-state`, so
  review records under `docs/04-reviews` remain in it — REVIEW-023,
  REVIEW-023-ADVISORY, REVIEW-024, and now REVIEW-025 all appear, and the
  listing grows with every review record. The artifact's own heading now
  says exactly that (claim 19 below).
- **006c claim 14's publication-log credit — NARROWED (REVIEW-025
  publication-log calibration).** The log records candidate input before
  the barrier — "did this event reach `publish()`" — and cannot observe
  consumer exposure or standing state. It is credited below as a mechanism
  instrument for the named carried behaviours only, never as exposure
  evidence.
- **The cycle-2 HANDOFF's "F2 CLOSED STRUCTURALLY" and "F3 CLOSED BY
  CONSTRUCTION" statements — SUPERSEDED by this record.** REVIEW-025 found
  finding 2 closed only on its named schedules (OPEN at the class — the
  stop rule fired) and finding 3's universal false. The register below and
  claims 6 and 16 are the surviving form.

**What is NOT withdrawn:** 006c claims 1–5, 7–13, 15, 17, 20–22 stand as
named-schedule and execution facts; each is re-established at this head by
the same instrument, re-run unchanged (the table below binds each row to
its instrument and carries the 006c claim number). The 006c Known limits
carry forward unchanged (REVIEW-025 narrowed none of them; it ACCEPTED
limit 6 at its boundary).

---

## KNOWN ISSUES REGISTER — ships on merge (ruling 28)

In the form PROJECT-STATE's Known issues section takes on merge. Both
issues are one class; the class recurred three times (REVIEW-023 finding 2,
REVIEW-024 finding 2, REVIEW-025 finding 1) and the stop rule fired, so the
remedy is this register plus a named follow-up unit, not a fourth
mechanism.

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

1. **Any restart purges through the bootstrap path** — the durable demand
   is consulted at bootstrap before any session load, and the observed
   purge runs before the provider's own `getSession()` (claims 13–14; the
   restart schedules in both committed probes).
2. **Server-side refresh-token rotation makes the residue unrefreshable** —
   the exposed session's refresh token was superseded at rotation, so it
   dies at its next refresh attempt (the ruling-25 bound, recorded in
   `reauth-demand.ts`).
3. **Unit F measures that backstop live** (registered in PROJECT-STATE
   Active work; blocked on Unit E's merge).
4. **A follow-up unit replaces gating with subscription** — publication-time
   sampling is the class defect; the fix direction is recorded here, not
   attempted this cycle (ruling 28: no further fix inside Unit E).

**Retirement rule:** the witness runner exits 0 only while the issues
REPRODUCE. The unit that closes the class must retire or invert
`known-issue-witness.*` in the same change — a witness left green is the
exact claims-exceeding-instruments defect this chain exists to prevent.

---

## The mutation standard

Unchanged from 005c/005d/006a/006b/006c: every claim carrying a mutant ID
ships a named, exact edit to shipped source that breaks the behaviour the
claim names, plus a recorded observation that the claim's own instrument
turns RED under it. Checked three ways per mutant: **baseline GREEN** (≥1
test executed), **build TYPECHECKS** (learning 16), **mutant RED** (≥1
failed assertion).

This cycle: **the 006c battery re-run UNCHANGED — 33 mutants, 33
SENSITIVE, 0 build-invalid**, tree restored byte-identical (`mutants.txt`).
Ruling 28: cycle 3 changes no behaviour, so no mutant was added, removed,
or re-anchored (the comment-only product edits touch no anchor). `33/33`
remains an **execution fact**, never a coverage measure (learning 16).

---

## Claims

Every row is bound to the instrument that measured it, in the words of that
instrument's output (learning 11). Rows carry their 006c claim number where
one exists; anything the instruments do not establish is NOT RUN or appears
in the SUPERSESSION list as WITHDRAWN.

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 1 | **REVIEW-024 finding 1 stays closed on the reviewer's schedule** (006c claim 1): record present, read THROWS, `exists` false — consult OUTSTANDING, residual purged, never signedIn. "candidate RED (exit 1), head GREEN (exit 0)" | PASS | `review024-probe.sh` → `review024-probe.txt` finding-1 test; `reauth-demand.test.ts` reviewer-schedule case | M22 |
| 2 | The reviewer's control: the identical thrown read with `exists === true` is outstanding the SAME way at both trees (006c claim 2) | PASS | `review024-probe.txt` control test | — (control) |
| 3 | **Absence is OBSERVED, never converted from a failure** (006c claim 3): refused listing, listed-but-unreadable, and listing/`exists` contradiction all stay outstanding; absence only by a successful empty listing with `exists` corroborating | PASS | `reauth-demand.test.ts` + `review024-probe.txt` absence-control schedule | M32, M33 |
| 4 | **REVIEW-024 finding 2 stays closed on its named bootstrap schedule** (006c claim 4): fresh-sign-in resolution with a refused follow-up persist ends **signedOut**, new demand durable, zero unhandled, rotated session never rendered | PASS | `review024-probe.txt` finding-2 bootstrap test + `auth-provider.test.tsx` bootstrap-refusal schedule | M26, M28 |
| 5 | The mid-process resolution re-read schedule, same properties (006c claim 5) | PASS | `review024-probe.txt` mid-process test + `auth-provider.test.tsx` mid-process schedule | — (M26/M28 mutate the shared barrier) |
| 6 | **NARROWED (was 006c claim 6).** What stands: every CURRENT provider publication flows through `publish()` — zero `useState`/`setState` sites and exactly five `publish(` sites in the provider, one `useState` and two `setState` calls in the barrier, enumerated by name — and `publish` refuses `signedIn` at its INPUT while either signal stands, resolving signedOut, never a silent drop. A direct named `useState` import fails ESLint (positive-controlled). **WITHDRAWN half:** "no caller can reach setState by another route" — the REVIEW-025 alias counterfactual minted a second setter with lint and tests green; and input-checking cannot retract queued/standing state (Known Issues 1–2) | PASS as enumeration of current bytes | `auth-state-publisher.test.ts` (barrier behaviour + enumeration + source-shape pins) | M27, M31; M26/M28 through a real publisher |
| 7 | The flag is installed synchronously at the refusal, before the durable record settles (006c claim 7) | PASS | `foreground-refresh.test.ts` parked-record test | M29 |
| 8 | Consuming the flag and raising the demand cache are one synchronous act (006c claim 8) | PASS | `auth-provider.test.tsx` take-to-cache test | M30 |
| 9 | The consult-by-read contract (006c claim 9): content is the answer whenever readable; a thrown read is outstanding absolutely; absence only by observed listing plus corroboration; native File/listing semantics **NOT RUN** | PASS (over synthetic mocks) | `reauth-demand.test.ts` full describe + both probe finding-1 schedules | M22, M32, M33 |
| 10 | Resolution (006c claim 10): a fresh sign-in resolves only on evidence — no unconsumed refusal, session persisted AND read back, only via the app's own `verifyOtp`; a refused follow-up ends signedOut with a new demand | PASS | `auth-provider.test.tsx` resolution tests + `review023-probe.txt` B2 + `review024-probe.txt` finding-2 tests | M23, M25 |
| 11 | The refused session write is absorbed in EVERY case (ruling 25; 006c claim 11): zero unhandled rejections on every schedule both probes run; the durable record lands before the refused write resolves | PASS | `foreground-refresh.test.ts` + `reauth-demand.test.ts` + zero-unhandled assertions across both probe transcripts | M11, M12, M13, M15, M16, M17 |
| 12 | **The seven REVIEW-023 schedules remain closed at this head** (006c claim 12): "candidate RED (exit 1), head GREEN (exit 0)" — 7/7 RED at `caa31ee2`, 7/7 GREEN here, runner exit 0 | PASS | `review023-probe.sh` → `review023-probe.txt` | — (the two-tree run IS the counterfactual) |
| 13 | The REVIEW-022 finding-3 closure is preserved at this head (006c claim 13): the 006a probe re-run byte-unchanged — RED at base `7caf23e1`, GREEN here, restart schedule included | PASS | `../006a-session-durability/finding3-probe.sh` re-run → this directory's `finding3-probe.txt` | — |
| 14 | **NARROWED (was 006c claim 14).** The named carried behaviours re-run GREEN at this head: purge proven by read-back only, demand consulted before exposure, purge before the provider's own getSession, signedOut before the purge await, the listener gates on their named schedules, record shape. The publication-log instrument measures calls entering `publish()` — its own call boundary — and is NOT evidence about consumer exposure (REVIEW-025 calibration) | PASS at the named behaviours | `auth-provider.test.tsx`, `reauth-demand.test.ts`, `secure-store-adapter.test.ts` | M1–M10, M14, M18, M19, M20, M21, M24 |
| 15 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check all exit 0 — **11 suites, 196 tests** (unchanged from 006c: this cycle deletes claims, not tests) | PASS | `gates.txt` | — |
| 16 | **REPLACED (was 006c claim 16, withdrawn).** Stability demonstrated at the heads this record names: two fresh captures pair-identical and committed-identical on all 9 gated artifacts, exit 0, at the evidence head and re-verified at the records head (both SHAs in the HANDOFF/completion report — a commit cannot name its own SHA). Review records added afterwards change `red-lane.txt` by construction and are outside the claim | PASS at the named heads only | `stability.txt` + the post-records re-run reported in the HANDOFF | — |
| 17 | Every mutant build-valid, every carried claim's instrument turns red — **33/33 SENSITIVE, 0 build-invalid**, battery unchanged from 006c | PASS | `mutants.txt` | this row IS the mutation record |
| 18 | **NARROWED (was 006c claim 18).** The capture binds the bound product trees and fails closed on producer failure: binding.txt records the tree OIDs of every bound product path PLUS the base pin — the one commit SHA in the file, stated as such; the run's own commit lives in non-gated binding-head.txt; every git exit checked; the PATH-prepended exit-77 control committed | PASS | `binding.txt` + `binding-head.txt` + `capture-refusal-control.sh` → `capture-refusal-control.txt` | — (the committed control is the counterfactual) |
| 19 | **NARROWED (was 006c claim 19).** RED lane: `supabase/`, `.github/`, generated types object-identical to base; the range listing excludes exactly docs/05-quality/evidence and docs/01-state — review records under docs/04-reviews REMAIN in it and it grows with every review record, stated in the artifact's own heading; 0 database-layer paths in the FULL range; 0 database-operation hits; every positive control matched; every git exit checked | PASS | `red-lane.txt` | — |
| 20 | No banned auth surface in application source — the literal pattern list through the comment-blanking pipeline, every pattern's control matched (006c claim 20) | PASS | `banned-apis.txt` | — |
| 21 | `expo.scheme` byte-identical to base (ruling 8); no src/ code hit and no `expo.name` hit for the gated name (006c claim 21) | PASS | `chrome.txt` | — |
| 22 | The dependency delta is exactly Unit E's authorized one; **this fix cycle adds nothing**: lockfile package-key set identical to base (006c claim 22) | PASS | `deps.txt` | — |
| 23 | **NEW — the Known Issues are witnessed, expected RED:** "counts: preconditions 3/3 passed, witnesses 3/3 failed-as-expected · verdict: WITNESS-HOLDS" — the two REVIEW-025 schedules reproduce at this head and their reproduction is committed | PASS (of the witness contract; the witnessed invariant itself is the Known Issue) | `known-issue-witness.sh` → `known-issue-witness.txt` | — (an expected-RED witness cannot carry a mutant) |
| 24 | GitHub CI passes on the exact pushed head (PR #17, draft) | **NOT RUN at capture time** | `ci.txt` — added post-push, bound to the pushed SHA (a head cannot be known before its own push) | — |

---

## Producers and artifacts

`capture.sh` writes every `.txt` artifact here **except** `README.md`,
`mutants.txt`, `stability.txt`, `finding3-probe.txt`,
`review023-probe.txt`, `review024-probe.txt`, `known-issue-witness.txt`,
`capture-refusal-control.txt`, and `ci.txt` — nine exceptions, listed
exhaustively, matching its own header. It pins `BASE=7caf23e1…` literally,
refuses a stale pin, refuses a dirty tree (beyond this evidence/output
directory), records the product-tree binding, checks every git
invocation's exit, and fails closed on any gate, scan, control, or git
failure. **Ruling 28: every 006d instrument is the 006c instrument with
paths re-based and PROSE narrowed — no check, scan, exclusion, or gate
changed; the two new files (`known-issue-witness.*`) are the Known-Issue
witness and touch no product behaviour.**

**Not offline by construction:** `npm audit` reaches the npm registry,
confined to the non-gated `npm-audit.txt`. No Supabase endpoint is
contacted anywhere in this suite and no credential is read.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `binding.txt` | `capture.sh` | gated (strict) | bound product-tree OIDs + the base pin (the one commit SHA, stated); the honest-inputs statement is in its header |
| `binding-head.txt` | `capture.sh` | run-varying | the commit the capture ran at + clean-tree verdict |
| `gates.txt` | `capture.sh` | gated | the four CI steps; 11 suites, 196 tests |
| `adapter-properties.txt` | `capture.sh` | gated | one jest invocation per suite |
| `session-properties.txt` | `capture.sh` | gated | provider + publisher + foreground-refresh + reauth-demand |
| `route-guards.txt` | `capture.sh` | gated | unchanged surface, re-proven at this head |
| `banned-apis.txt` | `capture.sh` | gated | run-time positive control per pattern |
| `red-lane.txt` | `capture.sh` | gated | object identity, range listing with exclusions stated honestly, full-range db filters, git exits checked |
| `chrome.txt` | `capture.sh` | gated | scheme freeze; gated-name scan with positive control |
| `deps.txt` | `capture.sh` | gated | lockfile package-key set proof; nothing added this cycle |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | reaches the network; upstream advisories |
| `mutants.txt` | `mutants.sh` | not gated | exit status is its contract; verifies its own restoration; battery unchanged from 006c |
| `finding3-probe.txt` | `../006a-session-durability/finding3-probe.sh` (re-run, output here) | not gated | the 006a instrument at this head: base RED, head GREEN; 006a byte-identical |
| `review023-probe.txt` | `review023-probe.sh` (this directory) | not gated | seven schedules; `caa31ee2` RED, head GREEN; probe source byte-identical to 006c's |
| `review024-probe.txt` | `review024-probe.sh` (this directory) | not gated | five schedules; `5f6d2e6c` RED on the three discriminating schedules, head GREEN; probe source byte-identical to 006c's |
| `known-issue-witness.txt` | `known-issue-witness.sh` (this directory) | not gated | **EXPECTED RED**: preconditions must PASS and witnesses must FAIL, or the runner exits 1; the committed reproduction of Known Issues 1–2 |
| `capture-refusal-control.txt` | `capture-refusal-control.sh` | not gated | the committed negative control, carried; wrapper self-test + wrapped capture non-zero |
| `stability.txt` | `stability.sh` | not gated (a gate cannot contain a run of itself) | no run head recorded; the heads where stability was demonstrated are named in claim 16 and the HANDOFF |
| `ci.txt` | one-off `gh run view` | not gated | post-push, bound to the pushed SHA |

`review023-probe.tsx`, `review024-probe.tsx`, and `known-issue-witness.tsx`
are the committed probe sources (no `.test` suffix, so `npm test` never
runs them in place; typechecked at this head by the ordinary `tsc` gate —
the tsconfig includes `docs/`). The review probes copy into disposable
worktrees at their pinned trees and at HEAD and require RED-then-GREEN;
the witness copies into a worktree at HEAD and requires
preconditions-GREEN-witnesses-RED.

---

## NOT RUN — and why

1. **GitHub CI on this cycle's pushed head** (claim 24) until the
   post-push `ci.txt`. A head cannot be known before the push that creates
   it.
2. **Any live Supabase call.** Offline by dispatch. The ruling-25 bound —
   refresh-token rotation rejecting a consumed token outside the reuse
   interval — is server behaviour; Unit F measures it live. It is also
   compensating control 2 of the Known Issues register.
3. **Locked-device behaviour.** ADR-009 keeps it NOT RUN / NOT CLAIMED in
   Phase A; the named physical-device test gates Phase B exit.
4. **A real process restart.** The probes' restarts are jest
   module-registry resets over persistent in-memory fakes; no OS process
   died.
5. **The demand store's real backend.** `expo-file-system`'s file-on-disk
   behaviour is exercised nowhere in this suite. Whether the INSTALLED
   package can produce a thrown `textSync`, an `exists === false` under
   refusal, or a refused/lying directory listing remains NOT RUN; what IS
   proven is that the shipped consult converts none of those answers into
   absence (claims 1–3, 9), over synthetic mocks.
6. **Same-operation reachability of the event-before-record interval in
   the pinned client** — carried from 006c; REVIEW-024 records it
   UNVERIFIED, and driving an event inside auth-js's own save await would
   mean reading library internals (learning 20). The interval itself is
   instrumented at the unit level (claim 7).

---

## Known limits of the instruments

Carried from 006c **unchanged** (S4: REVIEW-025 narrowed none of them; it
ACCEPTED limit 6 at its boundary — "fail-closed, one redundant
purge/re-authentication, no exposure"). The two REVIEW-025 exposure
schedules are NOT limits of the instruments — they are defects of the
mechanism, recorded as Known Issues 1–2 in the register above.

1. **The ruling-25 limit: death before any medium recovers** (the
   `review023-probe` Known-limit schedule demonstrates it at this head).
   When the keychain AND the demand store refuse and the process dies
   before either recovers, no durable record can exist and the next
   process exposes the residual. Bounded server-side by refresh-token
   rotation; Unit F measures the bound live.
2. **The record window is not atomic**: a crash between the keychain's
   refusal and the durable record's write loses that event's durability —
   same bound as limit 1.
3. **The read-back proves an instant, not a barrier**: a library-internal
   operation in flight when `confirmSessionPurged()` returns true can
   write afterwards; its outcome is contained by the same machinery as any
   other write.
4. **Resolution's clear can be refused**: the stale durable record then
   survives into the next process, whose consult purges — one conservative
   re-authentication of a valid session. Safe direction.
5. **A refused follow-up refresh consumes the fresh sign-in** (measured in
   claim 4's schedule): signedOut with a new demand. Safe direction.
6. **`clear()`/`remove()` still consults `exists` on its delete path.** A
   lying `exists === false` there makes the removal a silent no-op: the
   record SURVIVES and keeps demanding — fail-closed (one redundant purge
   cycle per consult). ACCEPTED by REVIEW-025 at this boundary; bounded,
   stated, deliberately not widened (and cycle 3 changes no behaviour).
7. **The A2 exposure window collapses under in-memory fakes**: probes hold
   the logout leg open to keep the window observable; the unit instruments
   are the render-boundary counterfactuals.
8. **The mutation battery is not coverage** (learning 16). 33/33 is an
   execution fact.
9. **Re-authentication still cannot force a refusing store**: the demand
   survives and retries until read-back proof, but this layer cannot
   delete what the OS will not.
10. **`refreshWhileForeground`'s `unpersisted` outcome remains
    native-only** (ADR-008, ruling 18 — carried). Web keeps `localStorage`
    and gains no observer; nothing is claimed there.
11. **The absorb is key-filtered, not path-filtered**: a refused sign-in
    persist reports success with nothing on disk; the flag and the barrier
    gate its NEXT publication, and Known Issue 2 records what they cannot
    do about an already-queued one.

---

## Disclosures — ruling 6

1. **Workflows run: NONE.** No multi-agent workflow and no subagent was
   used in this cycle; every edit, probe, battery, and capture was run
   inline by the builder session. The ruling-6 fan-out disclosure is nil.
2. **The three product-file edits are comment-only, proven:** for each of
   `auth-provider.tsx`, `auth-state-publisher.ts`, and `eslint.config.js`,
   the comment-stripped executable tokens (TypeScript `transpileModule`
   with `removeComments`, JSX preserved) are byte-identical before and
   after the subtraction commit. The proof command and its output are in
   the HANDOFF.
3. **Witness development left a transient debug copy** of
   `known-issue-witness.tsx` at `src/__tests__/known-issue-witness.test.tsx`
   in the working tree for two direct jest runs before the committed
   worktree runner existed; it was deleted before any capture ran and was
   never staged or committed. The committed transcript comes from the
   worktree runner at the committed head.
4. **The witness runner's JSON classifier was corrected during
   development** (jest's `assertionResults` field; a missing argv pass)
   before its first committed transcript; the committed
   `known-issue-witness.txt` is from the corrected runner, whose per-test
   classification block shows exactly which tests passed and failed.
5. **`npm audit` reaches the network** (non-gated artifact only).
6. **`ci.txt` is added post-push** — claim 24's boundary.
7. **M19/M20 share an instrument; M26/M28 share the provider bootstrap
   schedule** (carried convention from 006c — door vs signal half).
8. **The 006a and 006c probe re-runs are re-runs, not edits**: the 006a
   runner is byte-unchanged in its own directory (output written here);
   `review023-probe.tsx`/`review024-probe.tsx` here are byte-identical to
   the 006c copies (runners differ only in paths and provenance headers).
9. **The editor was open throughout; no `npm ci` was run** in this session
   (no dependency work existed); no ENOTEMPTY occurred in any run.
