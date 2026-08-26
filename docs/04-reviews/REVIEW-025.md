# REVIEW-025 — Unit E session durability, fix cycle 2

**Date:** 2026-08-27
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the harness does not expose model, effort, or prior-session identity
metadata, so those three attributes cannot be independently confirmed
**Code target:** `feat/session-durability` fix-cycle-2 head
`2620802a208981a34a88690d4eba5ad10b096b61`
**Review overlay:** `85a319d866fb7818ac8367a3a0f1669cee49bd74` — controller LOCK transition only
**Prior reviewed candidate:** `5f6d2e6ca873ff3b45d9d9a6e52d42bdebed30bd`
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Pull request:** #17; draft; exact-candidate CI passed
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** REVIEW-024 finding 1 is closed by positive observation. The named
REVIEW-024 finding-2 schedules are also closed, and the implementation has one
lexical setter boundary: all five current provider publications call
`publish()`, the raw setter is private to its hook, a direct named `useState`
import is lint-barred, the refusal flag is installed before the demand record
await, and the foreground take raises the demand cache synchronously.
The authorised ruling-26 comment deletion is honoured and comment-only.

Those results do not close the governing no-exposure invariant:

1. With the real pinned auth client, a signed-in user called the provider's
   `signOut()`. Its internal near-expiry refresh was refused, which installed
   the flag and durable demand. The client then emitted both
   `TOKEN_REFRESHED(session)` and `SIGNED_OUT(null)`. The provider dropped both
   events while the signal stood, the action itself published no state, and the
   provider remained `signedIn` with a durable demand outstanding. There were
   zero unhandled rejections and no session bytes remained, so neither an error
   nor a residual explains the stale usable publication.
2. Independently, `publish(signedIn)` can sample both signals as false and
   enqueue React state; a real observed write can then install the flag and
   durable demand before React commits. The queued `signedIn` still commits,
   and changing the demand predicate does not cause re-evaluation. The barrier
   checks publication input, not consumer exposure or standing state.
3. The claimed type/lint enforcement is bypassable. A default React import,
   destructured as `const { useState: makeState } = React`, can mint a second
   setter in the provider while both ESLint and the committed source-shape
   tests stay green.
4. The two requested stability runs pass at `2620802a` and the docs-only LOCK
   overlay `85a319d8`, but the claimed invariant is false by construction.
   `red-lane.txt` still lists `docs/04/reviews/*`, and the gates typecheck
   `docs/**/*.ts(x)` while the binding omits `docs/`. A disposable commit adding
   only a Markdown review record kept all twelve bound product OIDs identical
   yet made `stability.sh` exit 1. Adding this required `REVIEW-025.md` is that
   exact class of commit.

REVIEW-024 finding 2 was already the second in-class recurrence. The exposure
class has therefore recurred again at this head. The dispatch's stop rule is
binding: **cycle 3 remedies the class by subtraction, not by a further fix.**
The evidence claim must likewise be deleted or narrowed to what its actual
inputs establish; another scanner does not make the universal true.

## REVIEW-024 closure matrix

| REVIEW-024 item | REVIEW-025 disposition |
|---|---|
| Finding 1 — consult by positive observation | **CLOSED.** The prior read-throws/`exists=false` schedule and the refused-listing, listed-but-unreadable, and listing/`exists` contradiction schedules all remain outstanding; only a successful empty listing corroborated by `exists=false` yields absence. |
| Finding 2 — one publication barrier | **OPEN at the governing invariant and structural-enforcement claim.** The requested prior publishers and timing windows pass, and the current source uses the barrier. A newly raised signal does not revoke queued or already-published `signedIn`; the real-client sign-out schedule ends `signedIn` with a durable demand. A default-import/destructure alias can also mint a second setter while ESLint and the source-shape tests stay green. |
| Exposure-defect class | **OPEN / THIRD IN-CLASS OCCURRENCE.** Named schedule closure is not class closure. The stop rule routes cycle 3 to subtraction. |
| Finding 3 — docs-only evidence invariant | **OPEN.** Stability passes at the two named heads, but two docs-only counterfactuals with identical bound OIDs break it. The required review record itself changes the gated red-lane listing. |
| Ruling-26 `secure-store-adapter.ts` comment deletion | **HONOURED.** Commit `b715105` changes one file and only comment prose; executable tokens are unchanged. |

## Review boundary and preflight

- The required sequence ran before product analysis: `git fetch origin`;
  checkout `85a319d866fb7818ac8367a3a0f1669cee49bd74`; then
  `git diff --stat 2620802a..HEAD`. The diff names only
  `docs/01-state/BRANCH-NOTES.md`, 19 changed lines (`+18/-1`). The overlay's
  sole parent is the exact code candidate.
- At the overlay, the Unit E LOCK reads `Status: REVIEW` and its controller
  note says “cycle-2 review, REVIEW-025.” It names the dispatched seat. This
  review does not edit the LOCK or any byte of `BRANCH-NOTES.md`.
- `AGENTS.md` was 5378 bytes with SHA-256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`
  before it was trusted.
- Product, evidence, and mutation probes ran in disposable worktrees pinned to
  exact candidate `2620802a208981a34a88690d4eba5ad10b096b61`. The shared
  checkout remained clean at the controller overlay until these two review
  records were written.
- The base is the candidate's merge base. The full base-to-candidate range is
  21 commits, 93 files, `+17689/-538`. This cycle is five builder commits, 40
  files, `+6105/-100`; `git diff --check` is clean.
- The five cycle commits and direct deltas are exact: `46deb1e` (9 files,
  `+628/-93`), `b715105` (1 file, `+4/-6`), `4742aef` (1 file, `+57/-0`),
  `862a4f7` (27 files, `+5165/-0`), and `2620802` (3 files, `+251/-1`).
- Rulings 25–27 and the cycle-1 invariant were applied from the controller
  state named by the dispatch. Ruling 25 keeps the every-medium-refuses-then-
  death case a Known limit; ruling 26 governs the authorised comment deletion;
  ruling 27 does not change this review boundary.
- Three supplementary subagents covered evidence, real-client schedules, and
  static auth-state routes. The reviewer of record inspected the instruments,
  reran every verdict-driving command, and made the classifications. No
  orchestrated workflow was invoked; the local Noema governance procedure,
  Supabase safety boundary, test guard, standards/spec review, and docs guard
  were used.
- Runtime probes used the installed `@supabase/auth-js@2.112.3` and
  `@supabase/supabase-js@2.112.3`, with fake SecureStore, File, and fetch
  boundaries. No live Supabase endpoint, credential, secret, device, or
  production system was accessed.

## Directed probe results

| Probe | Fresh result | Classification |
|---|---|---|
| Builder `review024-probe.sh`, both pinned trees | `5f6d2e6c`: 3 discriminating schedules RED, 2 controls GREEN, Jest 1. `2620802a`: 5/5 GREEN, Jest 0. Runner 0. | **PASS at the five named schedules.** |
| Rebased `review023-probe.sh` | `caa31ee2`: 7/7 RED, Jest 1. `2620802a`: 7/7 GREEN, Jest 0. Runner 0. | **PASS at the seven named schedules.** |
| REVIEW-024 finding-1 schedule | Record present, record read throws, `exists=false`: history `[bootstrapping,signedOut]`; residual purged; no session exposure. | **PASS / finding 1 CLOSED.** |
| Positive-observation additions | Refused listing; listed-but-unreadable with `exists=false`; and empty listing contradicted by `exists=true` all produced `[bootstrapping,signedOut]`, retained demand, and zero unhandled refusals. | **PASS over synthetic File boundaries.** Native reachability remains NOT RUN. |
| Flag-before-record and take-to-cache schedules | Flag was observable before the parked durable record settled; the real-client event after refusal was barred. Foreground take raised the cache in the same synchronous act. | **PASS at the named windows.** |
| Current-tree setter enumeration | Provider has zero `useState`/`setState` sites and exactly five `publish(` sites; publisher owns one `useState` and two setter calls. A direct named `useState` import made ESLint emit the configured barrier error. | **PASS as a fact about current bytes and that named import.** |
| Structural lint/type counterfactual | Added default `React`, destructured `useState` as `makeState`, and minted a differently named setter. Typecheck exited 0; ESLint exited 0 with warnings only; all 9 committed publisher/source-shape tests passed. The file was restored byte-identically. | **FAIL the claim that the provider cannot mint a second setter.** |
| Barrier deletion | Deleting the barrier check typechecked and turned the behavior instrument RED. The publisher-count enumeration alone stayed GREEN. | **PASS for the behavior instrument; enumeration is not semantic proof.** |
| Already-signed-in then refused sign-out refresh | Real client: rotation count `0→1`; refusal and durable demand; events `TOKEN_REFRESHED(session)` then `SIGNED_OUT(null)`; action error null; no session material; zero unhandled; final provider state `signedIn`. Focused Jest expected `signedOut`, received `signedIn`, exit 1. | **FAIL no-exposure invariant.** |
| Opposite-order queued publication | `publish(signedIn)` sampled false signals; a real observed write installed the flag/demand before React flush; final state still `signedIn`. Demand change alone did not re-evaluate. Two focused assertions expected `signedOut`, received `signedIn`; Jest 1. | **FAIL no-exposure invariant.** |
| Stability at code head | Exact `2620802a`: capture A/B 0; 9/9 gated artifacts pair-identical and committed-identical; stability 0. | **PASS at this named head.** |
| Stability at controller overlay | Exact `85a319d8`: same result, stability 0. | **PASS at this named docs/01-only overlay.** |
| Docs/04-only counterfactual | Added only `docs/04/reviews/REVIEW-PROBE.md`; all 12 bound OIDs unchanged. Both captures 0 and pair-identical, but product-path count grew 19→20, fresh `red-lane.txt` differed from committed, and stability exited 1. | **FAIL the universal/final-head invariant.** |
| Unbound docs TypeScript counterfactual | Added one type-invalid `.ts` under 006c; all 12 bound OIDs unchanged. Both captures exited 1, `gates.txt` differed, stability exited 1 with three failing comparisons. | **FAIL the “function of product trees only” claim.** |
| Fresh mutation battery | Runner 0; 33 baseline GREEN, 33 build-valid, 33 individually RED, 0 build-invalid; all five mutated files restored byte-identically. | **PASS as an execution fact, not coverage.** |
| Publication-log calibration | M19 rendered `signedOut` and failed only because the log records candidate input before the barrier. Removing the logger let M19/M30 remain GREEN. | **PARTIAL instrument.** It measures publication attempts/listener reach, not consumer exposure. |
| Adjacent `clear()`/`remove()` lie | `exists=false` made removal a no-op; the record survived and a fresh handle still observed the demand. | **ACCEPT as Known limit 6.** Fail-closed, one redundant purge opportunity. |

## Findings

### 1. HIGH — a newly raised demand does not revoke queued or standing `signedIn`

**Class:** FAIL pre-existing / in-class recurrence, not closed; authentication
lifecycle and session exposure; verdict-driving. **STOP RULE: SUBTRACT IN
CYCLE 3, DO NOT ATTEMPT ANOTHER FIX.**
**Invariant:** no path exposes a session while re-authentication demand is
outstanding in memory or durable.
**Probes:** pinned-client already-signed-in/sign-out schedule; independent
real-observer queued-publication schedule.
**Files:** `src/lib/auth/auth-state-publisher.ts:78-94`;
`src/lib/auth/auth-provider.tsx:177-198,425-445,492-506`.

`publish()` reads the demand predicate and refusal flag before it calls
`setState`. `setDemandSignal()` replaces a ref; it neither subscribes the state
to that signal nor schedules a corrective publication. The barrier can reject
a candidate while a signal already stands, but it cannot retract state queued
before the signal or state already exposed when the signal later rises.

The claimed structural enclosure is also narrower than stated. The ESLint rule
restricts a named import whose `importName` is `useState`; the committed regexes
look for `useState` followed by call/import syntax and for a setter literally
named `setState`. In a disposable exact-head tree, the following provider-local
shape minted a second state channel:

```ts
import React from 'react';
const { useState: makeState } = React;
const [state, update] = makeState(0);
```

Typecheck exited 0, ESLint exited 0 with only duplicate-import warnings, and all
nine committed `auth-state-publisher` tests passed, including “contains no
useState and no setState call site.” The mutation was restored byte-identically.
The raw setter inside `useAuthStatePublisher` is genuinely unreachable, but the
provider is not prevented from minting another raw setter. That requested
lint/type-level fact is **OPEN**.

The real-client sign-out schedule reaches the standing-state form without an
invented internal event. The provider first reached `signedIn`. Its public
`signOut()` then caused auth-js to refresh the near-expiry session. The observed
persist refused, installed the flag synchronously, and created the durable
demand. Auth-js emitted `TOKEN_REFRESHED` with a session and then
`SIGNED_OUT` with null. The listener's line-195 gate drops every event while a
signal stands, including the safe null-session event. The action at lines
492–506 does not publish state itself. It returned no error, the session key
space was empty, and there were zero refused-write unhandled rejections, yet
the provider remained `signedIn` and the demand file remained.

The separate queued-publication probe isolates the barrier itself. A
`signedIn` was queued while the predicates were false; the real observer then
installed the refusal flag and demand before React committed. The queued value
committed anyway and remained until a second explicit `publish()` call. Both
the demand and flag variants expected `signedOut` and received `signedIn`.

The five REVIEW-024 probe schedules, the mid-process branch, the
event-before-record order, the current-tree setter enumeration, and the direct
named-import ESLint control all pass. They establish useful local facts, not
the governing invariant or the stronger structural-enforcement claim. The
publication log is beneath React batching, but it records the input to the
barrier rather than consumer-visible state, so it cannot refute either schedule
above.

This is the same session-exposure class REVIEW-023 and REVIEW-024 recorded,
not a new adjacent class. The stop rule therefore fires exactly as dispatched:
cycle 3 remedies by subtraction rather than adding a fourth schedule-specific
mechanism.

### 2. MEDIUM — the docs-only evidence invariant omits inputs and fails on the required review record

**Class:** FAIL introduced by this work; cycle-2 evidence, reproducibility, and claim
calibration; verdict-driving as REVIEW-024 finding 3. **MUST DELETE OR NARROW.**
**Invariant:** gated artifacts are a function only of the bound product-tree
OIDs and regenerate identically after any docs-only commit, including the final
records head.
**Probes:** requested stability at `2620802a` and `85a319d8`; isolated
docs/04-only and docs-TypeScript commits with all bound OIDs held constant.
**Files:** `docs/05-quality/evidence/006c-session-durability-fix2/binding.txt:1-26`;
`red-lane.txt:16-24`; `capture.sh:86-109,271-304,459-466`;
`tsconfig.json:11`;
`README.md:28-47,153-179`.

The two requested runs are genuinely green. They show that the current nine
artifacts reproduce at the code head and survive the specific controller
overlay, whose only change is under excluded `docs/01-state`. They do not prove
the stated universal.

Three source facts contradict “by construction”:

1. `binding.txt` says no commit SHA appears, but line 14 contains the literal
   base commit SHA. More importantly, it binds no docs tree.
2. `capture.sh` says docs are deliberately absent from the binding while also
   acknowledging that `tsconfig.json` typechecks them. The gate at lines
   276–303 therefore reads inputs not represented by any bound OID.
3. `red-lane.txt` calls its range a product-path listing but includes
   `REVIEW-023.md`, `REVIEW-023-ADVISORY.md`, and `REVIEW-024.md`. The capture
   excludes only `docs/05-quality/evidence` and `docs/01-state` from that
   listing, not `docs/04/reviews`.

The direct counterfactual added one harmless Markdown review record on top of
the exact candidate. All twelve OIDs printed by `binding.txt` stayed equal.
Both fresh captures exited 0 and agreed with each other, but the red-lane
product list grew from 19 to 20, so fresh-versus-committed comparison failed and
`stability.sh` exited 1. A second docs-only commit added one type-invalid
evidence `.ts` file: the same OIDs stayed equal, both capture gates failed, and
`gates.txt` drifted. These are independent omitted-input failures.

This immutable review is required to add `docs/04/reviews/REVIEW-025.md`.
Therefore README claim 16's promised stability at the pushed records head is
predictably false for the actual authorized output, not merely for an exotic
path. Claims 18–19 and the HANDOFF's finding-3 closure inherit the same
overstatement. The 006b claims 9/10 and the old claim-number misattribution are
textually narrowed/corrected as requested, but the scope/invariant prose and
claims 6, 16, 18, and 19 replace them with new universals their instruments do
not establish. Claim 14 receives credit only for the named carried behaviors.
Learning 19's stop rule requires narrowing or deletion, not another scanner.

## Passing checks and evidence classifications

| Check | Classification | Fresh result |
|---|---|---|
| REVIEW-024 positive-observation consult | **PASS / CLOSED** | Prior schedule and all three added refusal/contradiction cases remained outstanding; observed absence control passed. |
| REVIEW-024 named publication schedules | **PASS at exact schedules** | Prior tree 3 discriminating RED; candidate 5/5 GREEN; runner 0. |
| REVIEW-023 seven schedules | **PASS at exact schedules** | Prior tree 7/7 RED; candidate 7/7 GREEN; runner 0. |
| Flag installation before record await | **PASS** | Flag observable during parked record; record completed before refused write returned. |
| Foreground take/cache atomicity | **PASS** | Failure take and demand-cache raise were one synchronous act. |
| Current-source setter enumeration and direct named-import lint control | **PASS, bounded** | Current shape exact; direct named `useState` import made ESLint fail; source restored. |
| “Provider cannot mint a second setter” lint/type fact | **FAIL introduced by this work** | Default-import/destructure alias typechecked and minted a second setter while ESLint and all nine publisher-suite tests stayed green. |
| One-publication-barrier governing invariant | **FAIL pre-existing / recurring** | Two independent opposite-order/standing-state schedules ended `signedIn` after the signal/demand arose. |
| 33-mutant run | **PASS as execution** | 33/33 individually RED and build-valid; 0 invalid; restoration exact. Not a coverage claim. |
| Four committed gates | **PASS at candidate** | Typecheck, lint, test, format check all 0; 11 suites / 196 tests. |
| Named-head stability | **PASS at `2620802a` and `85a319d8`** | 9/9 gated pair/committed comparisons; exit 0 at each head. |
| Universal/final-record stability | **FAIL introduced by this work** | Docs/04-only commit: unchanged bindings, capture pair 0/identical, red-lane drift, stability 1. Docs `.ts` control independently failed gates. |
| 006a and 006b immutability | **PASS** | Trees stay `be85ba58558cd167f72ca88572f1aa687d4e7c15` and `67d57d138cc5c99cfc5705cc312761f2408b818a` across the cycle. |
| Ruling-26 comment deletion | **PASS / HONOURED** | One file, comment-only, executable behavior unchanged. |
| GitHub CI | **PASS at exact candidate** | CI run 32989188068, `head_sha=2620802a…`, completed success. Overlay run 32990477910 also passed. |
| Git diff hygiene | **PASS** | `git diff --check` clean; exact touch/count and excluded-path checks pass. |
| Live Supabase / physical device / locked keychain / real process restart | **NOT RUN by boundary** | Only local fakes and module-registry restarts; Unit F/device gates retain these claims. |

## Evidence and documentation audit

- 006a and 006b are byte-identical across the cycle. The 006c supersession
  list correctly withdraws old fixed-point claims, narrows 006b claims 9/10,
  and corrects the old 006b misattribution: the fail-closed producer sentence
  was unnumbered 006a prose, not claim 22.
- The 006c producers enumerate their ordinary outputs and disclosed exceptions
  accurately. Fresh exact-candidate mutation output differs from the committed
  transcript only in the random disposable backup path.
- The new publication log is a legitimate instrument for “did this event reach
  `publish`?” It is not independent proof that the consumer saw, or did not
  see, a session. README prose at lines 134–149 explains the former but then
  uses it toward the broader exposure claim; credit is limited accordingly.
- `ci.txt` is correctly bound to substantive evidence head `862a4f7` and run
  32987240082, not to candidate `2620802a`. Exact-candidate success comes from
  the separately queried GitHub run 32989188068 and the controller overlay.
- Evidence claim 16 and the binding/red-lane prose are contradicted by direct
  counterfactuals. They are not publishable as universal or final-head claims.
  No evidence artifact was edited by this review.

## Governance and scope verification

**PASS by direct Git-object verification:**

- `git log d38b2ba4..2620802a -- docs/01-state/BRANCH-NOTES.md` is empty.
  The builder did not touch the LOCK record. The controller overlay alone
  changes it.
- No cycle commit changes `supabase/`, `.github/`, `app.json`, package
  manifests, generated database types, ADRs, prior reviews, or
  `BRANCH-NOTES.md`. No added application-source line introduces a
  user-visible `noema` string.
- `eslint.config.js` adds only the provider `useState` restriction and its
  explanation. The direct-import positive control proves that named shape
  fires; the alias counterfactual proves the claimed universal does not. No
  other lint configuration changed.
- The five commit/touch counts in the HANDOFF match Git. The builder's ruling-6
  disclosure is nil: no workflow and no subagent.
- PR #17 remains open and draft. At the last pre-record check its head was the
  controller overlay `85a319d8`, its check was successful, and it was not
  merged.
- No migration, RLS policy, authorization policy, payment path, secret,
  production query, deployment, publication, or other outward-facing action
  occurred. Client-auth code was read and probed only within the dispatched
  review boundary.

## Adjacent findings — reported, not acted on

- `reauth-demand.ts:203-208` still consults `exists` before deletion. The
  adversarial false answer leaves the durable record in place; a fresh handle
  continues to report outstanding. **ACCEPT as 006c Known limit 6 at this
  boundary:** it fails closed and costs a redundant purge/re-authentication,
  not session exposure.
- The mutation publication log measures its own call boundary, not exposure.
  **ACCEPT as a bounded mechanism instrument, not as semantic evidence.** No
  test or production code was changed in response.
- `auth-state-publisher.ts:47-48` says the module contains exactly one
  `setState` call site, while the implementation and its test correctly count
  two calls at lines 86 and 89. **LOW documentation mismatch; report only.**

## Conclusion

REVIEW-024 finding 1 is **CLOSED**. The ruling-26 comment deletion is
**HONOURED**. Finding 2 is closed only on its named schedules and remains
**OPEN** at the governing exposure invariant; the exposure class has recurred
for the third time. Finding 3 remains **OPEN** because its universal and
final-head evidence claims fail direct docs-only counterfactuals, including the
class of commit this review is required to add.

The verdict is **FAIL**. Under the binding stop rule, cycle 3 remedies the
exposure class by subtraction, not another fix. This review does not recommend
merge. No product code, evidence artifact, ADR, LOCK status, BRANCH-NOTES
content, prior review, migration, or outward-facing system was changed.
