# Evidence — Unit E fix cycle 2, session durability (006c)

**Controller:** CTRL-006 · **Branch:** `feat/session-durability` · **Base:**
`main` at `7caf23e1` (the Unit E dispatch pin; unchanged — main has not moved).

**Model+Effort:** Fable 5 / Max / fresh session — ruling 5's tier for a
review-fix loop, the dispatched seat, verified at session start.

**Scope:** close REVIEW-024 findings 1–3 under rulings 25–26 and the cycle-1
invariant (no path exposes a session while a re-authentication demand is
outstanding, in memory or durable — all carried per ruling 7), plus the one
authorised adjacent act: the `secure-store-adapter.ts` world-assertion
comment deletion under ruling 26. The stop rule was LIVE on the exposure
class: REVIEW-024 finding 2 was its second in-class recurrence, and this
cycle closes it STRUCTURALLY — one enforced publication barrier — not with
another per-publisher gate. Offline: no live Supabase call, no credential,
nothing under `supabase/` (proven in `red-lane.txt`).

---

## SUPERSESSION — this README governs over 006b's and 006a's claims

`../006b-session-durability-fix1/` and `../006a-session-durability/` are
**superseded by this record** and stay byte-identical (immutable-record
practice). REVIEW-024 withdrew or narrowed the following; they are listed
here so no reader has to reconstruct the deltas:

- **006b claims 20 and 21 — WITHDRAWN AS DESIGNED, replaced by
  tree-binding.** The committed fixed-point and exact-candidate-binding
  claims were FALSE at the formal candidate `5f6d2e6c` (REVIEW-024
  finding 3): `binding.txt` and `stability.txt` named the code commit
  `74024465`, and `red-lane.txt`'s range listing grew when the evidence and
  HANDOFF commits entered the measured range, so the committed stability
  producer exited 1 at the head under review. This cycle changes the
  DESIGN rather than regenerating one artifact at one more head: gated
  artifacts now bind to the **product trees** (`binding.txt` records
  `git rev-parse HEAD:<path>` for every path the gates measure and NO
  commit SHA; the commit goes in the non-gated `binding-head.txt`), and the
  red-lane range listing names **product paths only** (docs/05-quality/
  evidence and docs/01-state — the paths that grow with evidence and
  records commits — are excluded from the listing, while the database-layer
  filter still runs over the FULL range). Consequence, by construction: a
  docs-only commit changes no bound tree, every gated artifact and
  `stability.txt` itself regenerate byte-identically at the records head,
  and `stability.sh` at the final head exits 0 against the committed bytes
  — the proof this cycle runs after its records commit, and the reviewer
  can run at the pushed head (claim 16).
- **006b claim 9 — RE-CLOSED; its closure wording was an overclaim.** The
  cycle-1 consult read content first but, when the read threw, still
  returned "no demand" on `exists === false` — the boolean acting as the
  absence gate after the read failure. REVIEW-024 finding 1's schedule
  (record present, read throws, `exists === false`) exposed the residual
  session behind that conversion. The branch is DELETED. Now a thrown read
  is OUTSTANDING unless absence is positively observed by a read that
  SUCCEEDED and returned nothing: the parent directory's listing with no
  entry under the record's name, `exists` corroborating (claims 1–3).
  Whether the INSTALLED expo-file-system can produce a thrown read, a lying
  `exists`, or a refused listing natively remains **NOT RUN** offline.
- **006b claim 10 — NARROWED.** "Resolved and exposed" holds only when no
  new refusal arises before the publication. A fresh sign-in whose
  FOLLOW-UP refresh persist is refused now ends **signedOut with a new
  durable demand** — the rotated, unpersisted session is never exposed
  (REVIEW-024's verdict-driving schedule, claim 4). The cost in that
  schedule is one consumed sign-in — the safe direction, disclosed as
  Known limit 5.
- **006b claim 8 / advisory lead A — RESTATED.** The listener gate stands,
  but it is no longer the invariant's enforcement: it is a narrower drop in
  front of the ONE publication barrier, kept because a stale event should
  not mark the bootstrap superseded. The barrier is what gates EVERY
  publisher (claim 6) — REVIEW-024 found the same exposure class recurring
  through the ungated bootstrap promise and the mid-process re-read, and
  ruled that enumerating another publisher in another test is not closure.
- **006b claim 5 — SUPERSEDED BY THE NEW ORDER.** "Demand first, flag
  second, then resolve" is replaced: the FLAG is installed synchronously at
  the refusal, before any await — it is the barrier's second signal and
  must exist from the first instant — then the durable demand lands (or is
  held, ruling 25), then the write resolves (claims 7 and 11). REVIEW-024
  measured the interval the old order left: an event between the refusal
  and the record's settle was gated by neither signal.
- **006b's supersession section MISATTRIBUTED one withdrawal — corrected
  here, with 006b left byte-identical.** It attributed the withdrawn "fails
  closed on any gate, scan, or control failure" capture sentence to "006a
  claim 22". Actual 006a claim 22 was the RED-lane claim; the fail-closed
  producer sentence was UNNUMBERED PROSE in the 006a README's producer
  section. The withdrawal itself was correct and its remediation (every git
  exit checked; the committed refusal control) carries forward into this
  cycle's producer unchanged.
- **Ruling 26 — the citation for this cycle's one adjacent act.** The
  `parseIndex` docblock in `secure-store-adapter.ts` asserted "this code
  has never run on a device … the installed base this would strand is
  empty" — the world-assertion class ruling 26 ordered deleted from
  `session-storage.ts` and `supabase.ts` in cycle 1, flagged by the cycle-1
  HANDOFF, ruled SHOULD DELETE by REVIEW-024's adjacent finding, and
  authorised for this cycle by the controller's extension of the ruling's
  touch-set. The world-assertion is deleted; the code-behaviour
  documentation (the self-describing index format, the fail-toward-absence
  choice and its one-re-authentication cost) stays; this paragraph is the
  citation the code does not carry.
- **The 006b probe source is re-based into this directory; 006b stays
  byte-identical.** The fixed consult corroborates absence with the parent
  directory's LISTING — an expo-file-system surface the 006b fake did not
  model, so under the old fake a missing `list()` reads as a refused
  listing and the fresh-mount/Known-limit schedules turn spuriously red at
  this head (observed: 6/7 with only the Known-limit schedule failing).
  `review023-probe.tsx` here is that fake enrichment and nothing else; the
  seven schedules, their assertions, and the pinned trees are unchanged,
  and the RED control at `caa31ee2` is undisturbed because the old consult
  never calls `list()`. The 006a `finding3-probe` needed NO re-base: its
  schedules never consult with an absent record while a session should
  survive, and its committed runner re-ran base-RED/head-GREEN unchanged
  (claim 13).

---

## The mutation standard

Unchanged from 005c/005d/006a/006b: every claim carrying a mutant ID ships a
named, exact edit to shipped source that breaks the behaviour the claim
names, plus a recorded observation that the claim's own instrument turns RED
under it. Checked three ways per mutant: **baseline GREEN** (≥1 test
executed), **build TYPECHECKS** (learning 16 — every mutant, before it is
counted), **mutant RED** (≥1 failed assertion).

This cycle: **33 mutants, 33 SENSITIVE, 0 build-invalid**, tree restored
byte-identical (`mutants.txt`). The battery re-bases the 006b mutants that
still apply (M1–M21, M23–M25; anchors moved by the fix are updated), REBUILDS
M22 (the old edit restored a branch REVIEW-024 finding 1 deleted; the new
M22 re-creates the exact finding-1 defect), and adds M26–M33 for this
cycle's behaviours: the barrier and each half (M26–M28), the synchronous
flag order (M29), the take-to-cache single act (M30), refusal-resolves-to-
signedOut (M31), and the two absence-observation guards (M32–M33). `33/33`
is an **execution fact**, never a coverage measure.

**Disclosed: the battery's first run had four provider-side survivors, and
what they exposed is itself evidence.** M19, M21, and M30 survived because
render-level assertions cannot see the defect their mutants re-create:
React batches a transient `signedIn` away within one tick (the same
compression Known limit 7 records for the probes), and the BARRIER absorbs
a deleted listener gate — the mutant's exposure was refused one layer down,
which is the barrier doing exactly what finding 2 demanded. The committed
instruments therefore assert beneath batching, on a publication log — a
transparent identity-stable wrap of the real barrier recording every
`publish()` invocation — because a *dropped* event never reaches `publish`
at all. M20 survived because the take-wrapper's synchronous cache raise
(claim 8) made `requireReauthentication`'s own mark REDUNDANT on the flag
path — deliberate defense in depth, so the single-site deletion is
unfalsifiable; M20 is now the two-site combined deletion, the falsifiable
unit. All four were then observed RED individually before the committed
full run.

---

## Claims

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 1 | **REVIEW-024 finding 1 is closed on the reviewer's own schedule.** A durable record is present, its read THROWS, and `exists` reports false: the consult is OUTSTANDING — the restart purges the residual and never exposes signedIn. RED at the reviewed candidate `5f6d2e6c` (where the thrown read plus the false boolean read as absence and the residual was exposed — the learning-14 positive control), GREEN at this head | PASS | `review024-probe.sh` → `review024-probe.txt`, finding-1 test; `reauth-demand.test.ts` reviewer-schedule case | M22 |
| 2 | The reviewer's control: the identical thrown read with `exists === true` is outstanding the SAME way — the pair isolates the deleted branch (this control passes at both trees by design; claim 1 is the discriminating half) | PASS | `review024-probe.txt` control test + `reauth-demand.test.ts` control case | — (control) |
| 3 | **Absence is OBSERVED, never converted from a failure:** a thrown read stays outstanding when the listing is refused, and when `exists` contradicts the empty listing; absence is answered only by a listing that SUCCEEDED with no entry under the record's name, `exists` corroborating — and that path keeps a fresh install (and the absence-control schedule's stored session) bootstrapping normally | PASS | `reauth-demand.test.ts` (refused-listing, contradiction, observed-absent cases) + `review024-probe.txt` absence-control schedule | M32 (corroboration), M33 (refused listing) |
| 4 | **REVIEW-024 finding 2 is closed on the reviewer's own schedule.** Fresh-sign-in resolution legitimately clears the old demand and starts the deferred bootstrap; the pinned client refreshes the near-expiry fresh session during it; only that follow-up persist is refused: the provider ends **signedOut**, the NEW demand is durable, zero unhandled rejections, and the rotated unpersisted session never renders. RED at `5f6d2e6c` (the ungated `getSession().then` published it as signedIn), GREEN here | PASS | `review024-probe.txt` finding-2 bootstrap test + `auth-provider.test.tsx` bootstrap-refusal schedule | M26, M28 |
| 5 | The mid-process resolution re-read is gated the same way: its own `getSession()` can refresh the fresh session and have THAT persist refused — the publication re-checks and resolves to signedOut with the new demand durable, nothing exposed. RED at `5f6d2e6c` (the branch called setState with no re-check) | PASS | `review024-probe.txt` mid-process test + `auth-provider.test.tsx` mid-process schedule | — (M26/M28 mutate the shared barrier; the probe's RED half is this claim's counterfactual) |
| 6 | **ONE publication barrier, no other route to the setter.** Every provider state publication flows through `useAuthStatePublisher`'s `publish`, which re-checks the demand signal AND the write-refusal flag at publication time and refuses `signedIn` while either stands — resolving to signedOut, never a silent drop. No caller can reach `setState` by another route: the raw setter is a closure variable of the hook (a scope-level fact TypeScript enforces), `useState` in `auth-provider.tsx` is lint-banned (`eslint.config.js`, positive-controlled during the build), and the test pins the source shape — zero `useState`/`setState` in the provider, exactly five `publish(` sites, enumerated by name; one `useState` and two `setState` in the barrier | PASS | `auth-state-publisher.test.ts` (barrier behaviour + the publisher enumeration + source-shape pins) | M27 (demand half), M31 (no silent drop); M26/M28 exercise the barrier through a real publisher |
| 7 | **The flag is installed synchronously at the refusal** — before the durable record settles, so no event in the record() interval is ungated: with the record write HELD pending, the flag is already peekable and nothing durable exists yet; the record still lands before the refused write resolves | PASS | `foreground-refresh.test.ts` parked-record test | M29 |
| 8 | **Consuming the flag and raising the demand cache are one synchronous act:** a microtask-injected event in the take-to-cache interval — after the flag was consumed, before `requireReauthentication` could run — finds the demand signal already raised and is dropped | PASS | `auth-provider.test.tsx` take-to-cache test | M30 |
| 9 | The consult-by-read contract, restated to what findings 1–2 leave true (the 006b claim-9 narrowing): content is the answer whenever it can be read, whatever `exists` says; a thrown read is outstanding absolutely, absence only by observed listing plus corroboration; native File/listing semantics **NOT RUN** | PASS (over synthetic mocks) | `reauth-demand.test.ts` full describe + both probe finding-1 schedules | M22, M32, M33 |
| 10 | Resolution, restated (the 006b claim-10 narrowing): a fresh sign-in resolves an outstanding demand only on evidence — no unconsumed refusal, session persisted AND read back — and only through the app's own `verifyOtp`; a refused follow-up ends signedOut with a new demand (one consumed sign-in, the safe direction); the stale purge never destroys a verified fresh session | PASS | `auth-provider.test.tsx` resolution tests + `review023-probe.txt` B2 + `review024-probe.txt` finding-2 tests | M23 (read-back required), M25 (no unconsumed refusal) |
| 11 | The refused session write is absorbed in EVERY case (ruling 25 carried): demand held when every medium refuses, retried at the next write / foreground / purge opportunity; zero unhandled rejections on every schedule both probes run; the durable record lands before the refused write resolves | PASS | `foreground-refresh.test.ts` + `reauth-demand.test.ts` + zero-unhandled assertions across `review023-probe.txt` and `review024-probe.txt` | M11, M12, M13, M15, M16, M17 |
| 12 | **The seven REVIEW-023 schedules remain closed at this head:** double refusal with recovery and restart, the ruling-25 Known limit, pending logout, A2, A3, E1, B2 — 7/7 RED at reviewed candidate `caa31ee2`, 7/7 GREEN here, runner exit 0 (the probe source re-based only in its fake — see SUPERSESSION) | PASS | `review023-probe.sh` → `review023-probe.txt` | — (the two-tree run IS the counterfactual) |
| 13 | The REVIEW-022 finding-3 closure is preserved at this head: the 006a probe re-run — byte-unchanged, runner and source — is RED at base `7caf23e1` and GREEN here, restart schedule included | PASS | `../006a-session-durability/finding3-probe.sh` re-run at this head → this directory's `finding3-probe.txt` | — |
| 14 | Purge proven by read-back only, demand consulted before exposure, purge before the provider's own getSession, signedOut before the purge await, listener gates, record shape — all carried and re-run at this head | PASS | `auth-provider.test.tsx`, `reauth-demand.test.ts`, `secure-store-adapter.test.ts` | M1–M10, M14, M18, M19, M20, M21, M24 |
| 15 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check, all exit 0 — **11 suites, 196 tests** (+1 suite, +16 tests this cycle) | PASS | `gates.txt` | — |
| 16 | **The evidence invariant under docs-only commits, by construction and then proven:** gated artifacts (binding.txt included) are a function of the product trees only; `stability.sh` — run after the records commit, at the final head — exits 0 against the committed bytes, regenerating `stability.txt` byte-identically; the reviewer can run it at the pushed head | PASS (verified at the records head; the run is repeatable there) | `stability.txt` + the HANDOFF's post-records verification | — |
| 17 | Every mutant is build-valid and every claim carrying a mutant ID has one that turns its instrument red — **33/33 SENSITIVE, 0 build-invalid** | PASS | `mutants.txt` | this row IS the mutation record |
| 18 | **The capture binds to the product trees and fails closed on producer failure:** binding.txt records the tree OIDs of every measured product path (no commit SHA; the commit is in non-gated binding-head.txt); every git invocation's exit is checked and any non-zero fails the capture; the PATH-prepended exit-77 control is committed and proves it | PASS | `binding.txt` + `binding-head.txt` + `capture-refusal-control.sh` → `capture-refusal-control.txt` | — (the committed control is the counterfactual) |
| 19 | RED lane: `supabase/`, `.github/`, and generated types are object-identical to base; the product-path range listing (docs/05-quality/evidence and docs/01-state excluded BY DESIGN — finding 3) names only this unit's authorised paths; 0 database-layer paths in the FULL range; 0 database-operation hits; every scan's positive control matched; every git exit checked | PASS | `red-lane.txt` | — |
| 20 | No banned auth surface in application source — exactly the literal pattern list through the comment-blanking pipeline, every pattern's control matched | PASS | `banned-apis.txt` | — |
| 21 | `expo.scheme` byte-identical to base (ruling 8); no src/ code hit and no `expo.name` hit for the gated name — the literal case-insensitive pattern with its fragment-built positive control | PASS | `chrome.txt` | — |
| 22 | The dependency delta is exactly Unit E's authorized one: lockfile package-key set IDENTICAL to base (0 added, 0 removed), only the root manifest and expo-file-system 57.0.4→57.0.5 changed; **this fix cycle adds nothing** | PASS | `deps.txt` | — |
| 23 | GitHub CI passes on the exact pushed head (PR #17, draft) | **NOT RUN at capture time** | `ci.txt` — added post-push, bound to the pushed SHA (a head cannot be known before its own push) | — |

---

## Producers and artifacts

`capture.sh` writes every `.txt` artifact here **except** `README.md`,
`mutants.txt`, `stability.txt`, `finding3-probe.txt`, `review023-probe.txt`,
`review024-probe.txt`, `capture-refusal-control.txt`, and `ci.txt` — eight
exceptions, listed exhaustively, matching its own header. It pins
`BASE=7caf23e1…` literally, refuses a stale pin, refuses a dirty tree
(beyond this evidence/output directory), records the product-tree binding,
checks every git invocation's exit, and fails closed on any gate, scan,
control, or git failure.

**Not offline by construction:** `npm audit` reaches the npm registry,
confined to the non-gated `npm-audit.txt`. No Supabase endpoint is contacted
anywhere in this suite and no credential is read.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `binding.txt` | `capture.sh` | gated (strict) | product-tree OIDs only — byte-stable across docs-only commits BY DESIGN |
| `binding-head.txt` | `capture.sh` | run-varying | the commit the capture ran at + clean-tree verdict; changes every commit, which is why it is not gated |
| `gates.txt` | `capture.sh` | gated | the four CI steps; 11 suites, 196 tests |
| `adapter-properties.txt` | `capture.sh` | gated | one jest invocation per suite |
| `session-properties.txt` | `capture.sh` | gated | provider + publisher + foreground-refresh + reauth-demand |
| `route-guards.txt` | `capture.sh` | gated | unchanged surface, re-proven at this head |
| `banned-apis.txt` | `capture.sh` | gated | run-time positive control per pattern |
| `red-lane.txt` | `capture.sh` | gated | object identity, product-path listing, full-range db filters, git exits checked |
| `chrome.txt` | `capture.sh` | gated | scheme freeze; gated-name scan with positive control |
| `deps.txt` | `capture.sh` | gated | lockfile package-key set proof + the authorized delta |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | reaches the network; upstream advisories |
| `mutants.txt` | `mutants.sh` | not gated | exit status is its contract; verifies its own restoration |
| `finding3-probe.txt` | `../006a-session-durability/finding3-probe.sh` (re-run, output here) | not gated | the 006a instrument at this head: base RED, head GREEN; 006a byte-identical |
| `review023-probe.txt` | `review023-probe.sh` (this directory; re-based fake) | not gated | seven schedules; `caa31ee2` RED, head GREEN; verdict block + runner exit are the contract |
| `review024-probe.txt` | `review024-probe.sh` | not gated | five schedules; reviewed candidate `5f6d2e6c` RED on the three discriminating schedules (both controls pass there by design), head GREEN; verdict block + runner exit are the contract |
| `capture-refusal-control.txt` | `capture-refusal-control.sh` | not gated | the committed REVIEW-023 negative control, carried; wrapper self-test + wrapped capture non-zero |
| `stability.txt` | `stability.sh` | not gated (a gate cannot contain a run of itself) | tree-bound like the artifacts it compares: no run head recorded, so it regenerates byte-identically at the records head |
| `ci.txt` | one-off `gh run view` | not gated | post-push, bound to the pushed SHA |

`review024-probe.tsx` and `review023-probe.tsx` are the committed probe
sources (no `.test` suffix, so `npm test` never runs them in place;
typechecked at this head by the ordinary `tsc` gate — the tsconfig includes
`docs/`). Each runner copies its source into disposable worktrees at its
pinned tree and at HEAD and requires RED-then-GREEN.

---

## NOT RUN — and why

1. **GitHub CI on this cycle's pushed head** (claim 23) until the post-push
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
   INSTALLED package can produce a thrown `textSync`, an `exists === false`
   under refusal, or a refused/lying directory listing — the finding-1
   premises — is NOT RUN; what IS proven is that the shipped consult
   converts none of those answers into absence (claims 1–3, 9), over
   synthetic mocks.
6. **Same-operation reachability of the event-before-record interval in the
   pinned client** — REVIEW-024 records it UNVERIFIED, and driving an event
   inside auth-js's own save await would mean reading library internals
   (learning 20). The interval itself is instrumented at the unit level
   (claim 7): the flag now exists for its whole duration.

---

## Known limits of the instruments

1. **The ruling-25 limit: death before any medium recovers** (carried; the
   `review023-probe` Known-limit schedule demonstrates it at this head).
   When the keychain AND the demand store refuse and the process dies
   before either recovers, no durable record can exist and the next process
   exposes the residual. Bounded server-side by refresh-token rotation;
   Unit F measures the bound live.
2. **The record window is not atomic** (carried): a crash between the
   keychain's refusal and the durable record's write loses that event's
   durability — same bound as limit 1. The flag-order fix (claim 7) narrows
   the in-process ungated interval to nothing, but cannot make the crash
   window atomic.
3. **The read-back proves an instant, not a barrier** (carried): a
   library-internal operation in flight when `confirmSessionPurged()`
   returns true can write afterwards; its outcome is contained by the same
   machinery as any other write.
4. **Resolution's clear can be refused** (carried): the stale durable
   record then survives into the next process, whose consult purges —
   costing one conservative re-authentication of a valid session. Safe
   direction.
5. **A refused follow-up refresh consumes the fresh sign-in** (the claim-10
   narrowing's cost, measured in claim 4's schedule): the sign-in reports
   success, resolves the old demand, and is then never exposed because its
   rotation could not persist — signedOut with a new demand. Safe
   direction; the alternative the reviewed candidate shipped was exposing a
   session that exists nowhere durable.
6. **`clear()`/`remove()` still consults `exists` on its delete path.** A
   lying `exists === false` there makes the removal a silent no-op: the
   record SURVIVES and keeps demanding — the fail-closed direction (one
   redundant purge cycle per consult), unlike the read path where the same
   lie produced exposure. Bounded, stated, and deliberately not widened
   this cycle (smallest change; the read path is what REVIEW-024 named).
7. **The A2 exposure window collapses under in-memory fakes** (carried):
   probes hold the logout leg open to keep the window observable; the unit
   instruments are the render-boundary counterfactuals.
8. **The mutation battery is not coverage** (learning 16). 33/33 is an
   execution fact.
9. **Re-authentication still cannot force a refusing store** (carried): the
   demand survives and retries until read-back proof, but this layer cannot
   delete what the OS will not.
10. **`refreshWhileForeground`'s `unpersisted` outcome remains native-only**
    (ADR-008, carried). On web no observer exists, no demand is recorded,
    nothing is claimed; web keeps `localStorage` and gains no observer, and
    the storage-key namespace change on web is accepted under ruling 26.
11. **The absorb is key-filtered, not path-filtered** (carried, bounded by
    lead C): a refused sign-in persist reports success with nothing on
    disk; the flag and the barrier gate its exposure, and the divergence
    ends at the next evaluation.

---

## Disclosures — ruling 6

1. **Workflows run: NONE.** No multi-agent workflow and no subagent was used
   in this cycle; every probe, battery, and capture was run inline by the
   builder session. The ruling-6 fan-out disclosure is nil.
2. **The 006a probe was re-run, not edited** (claim 13); the 006b probe
   source was RE-BASED into this directory (fake enrichment only — see
   SUPERSESSION) and 006b stays byte-identical.
3. **`npm audit` reaches the network** (non-gated artifact only).
4. **`ci.txt` is added post-push** — claim 23's boundary.
5. **The lint ban was positive-controlled during the build:** `useState`
   was temporarily added to `auth-provider.tsx`'s react import and
   `npx eslint` reported the `no-restricted-imports` error with the barrier
   message before the import was removed. The transcript convention for
   one-off controls is the HANDOFF, not a committed artifact; the rule
   itself is exercised by every lint gate run.
6. **M19/M20 share an instrument** (carried convention): the rows say which
   mechanism separates them. M26/M28 share the provider bootstrap schedule
   the same way (door vs signal half of the barrier).
7. **The editor was open throughout; no `npm ci` was run** in this session
   (no dependency work existed); no ENOTEMPTY occurred in any run.
