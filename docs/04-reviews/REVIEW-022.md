# REVIEW-022 — Unit D auth and session v1, fix cycle 3

**Date:** 2026-08-26
**Reviewer of record:** Codex Sol, Ultra effort, fresh session; authored
REVIEW-019, REVIEW-020, and REVIEW-021 but reopened none, and did not build this
unit
**Review target:** `feat/auth-session-v1` at
`c86ed5c2b024f287208a3152697ac71a3f90d5df`
**Review base:** `main` at
`6c925d1c5b5e9aa4f8da660028482707e3763c8a`
**Pull request:** #11; exact target head and exact base at the review boundary
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** Three implementation defects are **MUST CLOSE** and block a normal
merge under ADR-007 and binding ruling 17.

First, the foreground boundary is still incomplete. The branch moved the app's
listener registration and bootstrap read behind `AppState === 'active'`, but
the pinned `SupabaseClient` registers its own auth listener during construction.
That listener's initial-session emission still refreshes and persists a
near-expiry stored session without an application auth call or an AppState
check. The advisory's mechanism correction was wrong, and the claims that
construction no longer refreshes and that the app listener is the only trigger
remain false as written.

Second, a fourth app-initiated refresh entrance exists. Both the exported user
`signOut()` and the recovery purge call pinned auth-js `signOut()`. Pinned
auth-js enters `_useSession()` before deletion; loading a near-expiry session
refreshes it. The exported call has no AppState gate. Counting the constructor's
internal listener makes this at least the fifth runtime entrance overall. The
claims that exactly two app-initiated on-demand entrances exist are therefore
false.

Third, re-authentication is not durable. The purge observer records only a
`removeItem` rejection. Absence of that record can mean either that removal
succeeded or that `signOut()` rejected before removal was attempted. The code
conflates those cases and clears the demand. Every demand flag is process-local,
so a surviving superseded session outlives the demand across restart. A second
actual removal refusal stays pending in one mounted provider, but a second
upstream rejection can again be misclassified as success. Pinned auth-js also
leaves rejected refresh Deferreds unhandled on this path. Claim 55 does not
survive the directed schedules.

The remaining current defects are evidence bookkeeping only and are
**SHOULD DELETE or narrow**, not merge blockers: claim 50 does not reproduce at
the exact target because the committed `red-lane.txt` is stale, and the record's
clean cumulative-diff statement is false. These do not change the security
verdict.

The fix-cycle budget is exhausted. There is no cycle 4. The owner decision is
therefore explicit: findings 1–3 require an override to merge on a documented
security/correctness FAIL; finding 4 can be resolved by subtraction alone.

## Owner decision matrix

| Finding | Triage | Merge consequence |
|---|---|---|
| 1. Constructor/listener refresh bypass | **MUST CLOSE** | Blocks a normal merge; real foreground-boundary defect |
| 2. `signOut()` is a fourth app-initiated refresh entrance | **MUST CLOSE** | Blocks a normal merge; real foreground-boundary defect |
| 3. Purge success is inferred and the demand is not restart-durable | **MUST CLOSE** | Blocks a normal merge; real session-correctness defect |
| 4. Exact-head stability and clean-diff claims are false | **SHOULD DELETE / narrow** | Bookkeeping only; no product-code change required |
| B1 scanner limit, B2 narrowed schedule, B3 derived delete cost, absent `ci.txt`, early gates anomaly, native-only surfacing, and latent service-token entrance | **ACCEPT AND RECORD** | Known limits or honestly bounded facts; not merge blockers |

## Review boundary and preflight

- Before inspection, local `HEAD` and `origin/feat/auth-session-v1` were pinned
  to `c86ed5c2b024f287208a3152697ac71a3f90d5df`. Immediately before authoring
  this record they were rechecked at the same object.
- `origin/main`, the requested base, and the merge base are exactly
  `6c925d1c5b5e9aa4f8da660028482707e3763c8a`. The target is 19 ahead / 0 behind;
  the cumulative range is 99 files, `+16561/-26`.
- The LOCK names Codex Sol / Ultra / fresh session as reviewer of record and
  DeepSeek V4 Pro / fresh session as advisory reviewer, and reads
  `Status: REVIEW`. The review precondition is satisfied.
- `c86ed5c2` has sole parent
  `acb393058fb253429022e2bd3f56f3e70a0da882`. Independent `diff-tree` and patch
  inspection show that it changes only `docs/01-state/BRANCH-NOTES.md`, changing
  the controller-owned LOCK to REVIEW. It is unsigned, as disclosed in the
  dispatch. The explicit stop condition did not fire.
- The target worktree was clean before review. All adversarial storage and auth
  probes used injected in-memory storage and fake local `fetch` responses. No
  production or staging Supabase request was made.
- The standards and specification axes were run independently, followed by
  reviewer-of-record reproduction of the verdict-driving mechanisms. Neither
  axis edited the shared checkout.

## RED-lane scope

**PASS at the requested Git-object boundary.**

- `supabase/` is object-identical at base and target:
  `2b13461b9abd40f1c00afd316e3321d0931ef2fc`.
- `.github/` is object-identical:
  `173fa30fae4f5f83a35a88ef29914fbf8016c39a`.
- `src/lib/database.types.ts` is the same blob:
  `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc`.
- Two fresh exact-target captures report 99 paths in range, zero database-layer
  paths, zero added non-documentation database-operation hits, and all synthetic
  positive controls matched.
- The cumulative range contains no migration, RLS policy, database function,
  grant, storage-bucket policy, payment, purchase, entitlement,
  billing-webhook, secret, or outward-deployment change.
- No live Supabase query was made and no credential value was read, printed, or
  exposed. External reads were limited to GitHub PR/check metadata, npm's
  advisory endpoint, and official Supabase documentation/changelog pages.

This establishes the committed Git boundary. It does not establish historical
external conduct by the builder.

## Disposition of all seven REVIEW-021 findings

| # | REVIEW-021 finding | Disposition at `c86ed5c2` | Result |
|---|---|---|---|
| 1 | Refresh self-initiated and bypassed the foreground gate | **OPEN / MUST CLOSE** | The app bootstrap was deferred, but the constructor's internal listener remains and refreshes without an app call. The exported `signOut()` is the newly identified fourth app-initiated entrance and fifth overall. See findings 1–2. |
| 2 | Refused rotation did not reliably force durable re-authentication | **OPEN / MUST CLOSE** | Sticky write detection is real, but absence of a purge-failure observation is treated as proof of deletion; no durable marker survives restart, and the pinned-client path still leaves unhandled sibling rejections. See finding 3. |
| 3 | Token-opacity oracle accepted an aliased parser | **CLOSED BY SUBTRACTION** | The universal claim is deleted and the surviving claim is limited to directly-spelled constructs. The two added tests preserve the alias hole as an executable limit; they do not rescue the deleted claim. |
| 4 | Ninth schedule did not construct its claimed interleaving | **CLOSED BY SUBTRACTION** | The interleaving claim is deleted. The retained test states only the earlier sequencing fact that its first failure observes. |
| 5 | Synthetic session and per-sign-out cost were misdescribed | **CLOSED, BOUNDED** | Every measured row is labeled synthetic. The 2052–4617 completed-removal cost follows from pinned source and is explicitly labeled derived-by-reading, not observed. |
| 6 | Capture base and exact-head stability were stale | **PARTIALLY CLOSED** | The literal base and ancestry refusal are correct. Fresh exact-target captures are pair-identical, but committed `red-lane.txt` is stale, so claim 50 is false at this target. See finding 4. |
| 7 | Current records disagreed with their artifacts | **PARTIALLY OPEN / SHOULD DELETE OR RECONCILE** | Manifest, dependency scope, test count, CI scope, and native-only wording are corrected. The cumulative whitespace claim and exact-head stability claim are false; current state records also differ after the disclosed controller transition. See finding 4 and carry-forward records. |

## REVIEW-019 disposition recheck

REVIEW-019 remains immutable; none of its findings was reopened.

| # | Disposition at `c86ed5c2` |
|---|---|
| 1 | **CLOSED.** One-instance read serialization remains in production and its adapter suite passes. |
| 2 | **CLOSED.** Writers remain serialized; the checksum still rejects the original hybrid without a cryptographic claim. |
| 3 | **CLOSED.** A refused delete is accumulated across the full sweep and removal rejects. |
| 4 | **CLOSED.** Refused state discovery is not treated as absence; the current M4 record is build-valid. |
| 5 | **CLOSED under ADR-006 / ruling 15.** Exact checksum disagreements fail closed; no collision-resistance claim is credited. |
| 6 | **CLOSED.** Removal still sweeps both generations rather than stopping at a gap. B3 separately corrects total successful sign-out cost. |
| 7 | **CLOSED only at the narrowed boundary.** Current adapter source is clean by direct review; the automated claim now says directly-spelled constructs and explicitly preserves its alias blindness. |
| 8 | **CLOSED for the original three omissions.** Chunk-read failure, client-storage wiring, and cleanup deletion remain reached. Findings 1–3 here are later lifecycle defects. |
| 9 | **CLOSED.** The retained 005a count remains 28 adapter + 3 platform = 31. |
| 10 | **CLOSED.** The original range and HANDOFF touch figures remain corrected. |

## REVIEW-020 disposition recheck

| # | Disposition at `c86ed5c2` |
|---|---|
| 1 | **OPEN / MUST CLOSE.** Probe 1 is eliminated; probe 2 remains through the constructor listener; probe 3 remains an allowed crossing whose recovery is not durable. `signOut()` adds a fourth app-initiated entrance and fifth overall. |
| 2 | **CLOSED at the stated synthetic/resource boundary.** The named 100,000-character counterexample is admitted; no universal live-session ceiling is claimed. |
| 3 | **CLOSED BY SUBTRACTION.** The universal token-opacity claim is gone; source is clean by direct review and the scanner's alias hole is explicit. |
| 4 | **CLOSED BY SUBTRACTION.** Production removal remains queued; the test claims only the sequencing fact it actually detects. |
| 5 | **CLOSED.** M4 remains build-valid in the committed record; no false-red credit is taken. |
| 6 | **CLOSED.** The universal same-length checksum claim remains deleted and the collision record remains. |
| 7 | **PARTIALLY OPEN / BOOKKEEPING.** The CI, npm-audit, manifest, count, and range corrections hold. Exact-head stability, cumulative whitespace, and current state reconciliation do not. |

## REVIEW-021-ADVISORY disposition

The advisory's verdict-driving finding remains **OPEN / MUST CLOSE**, but its
correction of REVIEW-021's mechanism does not hold at the pinned package:
`SupabaseClient` does register an auth listener during construction. The
advisory was correct that the app's listener and bootstrap were additional
ungated entrances at its target; moving only those app calls did not close the
library entrance.

The advisory's platform observation remains correctly disposed under ADR-008:
persistence-failure surfacing is native-only in Phase A, web surfacing is
deferred and not claimed, and locked-device behavior remains NOT RUN.

## Directed lifecycle probes

Pinned versions are `@supabase/supabase-js@2.112.3` and
`@supabase/auth-js@2.112.3`. Each real-client probe used fake local storage and
an injected fake `fetch`; no Supabase service was contacted.

| Probe | Fresh result | Disposition |
|---|---|---|
| 1. Initialization restarts the refresh ticker | `autoRefreshToken: false` produced zero interval starts and zero fetches | **ELIMINATED** |
| 2. Near-expiry stored-session recovery refreshes after construction | `createClient()` alone made one token request and persisted the rotated session, with no application auth call | **OPEN** — constructor listener bypass, finding 1 |
| 3. A foreground-started refresh writes after the app backgrounds | Delaying the fake token response, moving synthetic AppState to background, then releasing it persisted the rotated session while backgrounded | **RELOCATED, NOT ELIMINATED** — allowed only if refused-write recovery is sound; finding 3 shows it is not |
| 4. `signOut()` can itself refresh before deleting | A real pinned client made a token refresh and then local logout; storage recorded a rotated write before removal | **FOURTH APP-INITIATED ENTRANCE / OPEN** — fifth overall with the constructor listener; finding 2 |

The latent SDK token-provider path is also broader than “exactly two”:
supabase-js's REST, Storage, Functions, and Realtime token acquisition can call
`auth.getSession()`. No current production call site exercised that route, so
it is **ACCEPT AND RECORD**, not a separate merge blocker at this head.

## Findings

### 1. HIGH — the constructor's internal auth listener still bypasses AppState

**Class:** FAIL introduced by this work; security/lifecycle; verdict-driving;
**MUST CLOSE**.
**Files:** `src/lib/supabase.ts:19-26,42-70`;
`src/lib/auth/auth-provider.tsx:95-119,155-179`;
`src/lib/auth/foreground-refresh.ts:13-28`;
`node_modules/@supabase/supabase-js/src/SupabaseClient.ts:413-415,662-666`;
`node_modules/@supabase/auth-js/src/GoTrueClient.ts:2993-3089,4300-4345`;
`docs/05-quality/evidence/005d-auth-session-fix3/README.md:27-61,123-126`.

`src/lib/supabase.ts` constructs the client at module evaluation, before the
provider's effect. Pinned supabase-js executes `_listenForAuthEvents()` in that
constructor and calls `auth.onAuthStateChange()`. The resulting initial-session
emission enters `_useSession()` and `__loadSession()`; when the stored access
token is within `EXPIRY_MARGIN_MS`, `__loadSession()` calls
`_callRefreshToken()` without consulting `autoRefreshToken` or AppState.

A fully local reproduction supplied a near-expiry session and fake token
response to the real pinned `createClient()`. Without invoking any application
auth method it observed one
`/token?grant_type=refresh_token` request, four storage reads, and one rotated
session write:

```text
{"fetchCalls":["https://example.test/auth/v1/token?grant_type=refresh_token"],
 "counts":{"get":4,"set":1,"remove":0},"rotated":true}
```

The fix correctly moves the app's own listener and bootstrap read behind the
gate, but it does not stand in front of this constructor path. The comments at
`supabase.ts:46-47,63-70`, `auth-provider.tsx:104-119`, and
`foreground-refresh.ts:19-28`, plus evidence claim 51, are false as written.
The provider and supabase-client tests mock the auth/client surfaces that would
reveal the behavior. Deleting prose cannot close the ADR-007 implementation
defect.

### 2. HIGH — `signOut()` is the fourth app-initiated refresh entrance and has no explicit foreground gate

**Class:** FAIL introduced by this work; security/lifecycle; verdict-driving;
**MUST CLOSE**.
**Files:** `src/lib/auth/auth-provider.tsx:193-203,293-306`;
`src/lib/auth/foreground-refresh.ts:19-28`;
`node_modules/@supabase/auth-js/src/GoTrueClient.ts:3040-3089,4043-4091`;
`docs/05-quality/evidence/005d-auth-session-fix3/README.md:48-57,123-129`.

Pinned auth-js `signOut()` enters `_signOut()`, which enters `_useSession()`
before calling `_removeSession()`. That session load executes the same
near-expiry refresh at `GoTrueClient.ts:3089`. The recovery purge is reached
from an active evaluation, but the exported user `signOut()` at
`auth-provider.tsx:293-306` contains no AppState check. It is the fourth
app-initiated path listed below and the fifth overall once the constructor
listener is counted.

A local real-client probe with `autoRefreshToken: false` observed a token
refresh followed by `/logout?scope=local`, a rotated session write, and then
removals. The flag disables scheduling; it does not disable this load-time
refresh. The app therefore has at least four refresh-capable initiators: its
listener registration, bootstrap `getSession()`, foreground-gate `getSession()`,
and `signOut()`. The constructor's internal listener makes at least five runtime
entrances overall. “Exactly TWO” and “both sit behind the gate” are false. The
app's normal UI may call sign-out while visible, but ADR-007 requires an explicit
foreground gate rather than UI reachability as an implicit lifecycle invariant.

### 3. HIGH — purge success is inferred from no observation, and the demand does not survive restart

**Class:** FAIL introduced by this work; security/session correctness;
verdict-driving; **MUST CLOSE**.
**Files:** `src/lib/auth/session-storage.ts:66-88,91-134,148-184`;
`src/lib/auth/auth-provider.tsx:133-135,182-227,230-255`;
`src/__tests__/auth-provider.test.tsx:513-602`;
`node_modules/@supabase/auth-js/src/GoTrueClient.ts:2993-3089,4043-4091,4989-5127`;
`docs/05-quality/evidence/005d-auth-session-fix3/README.md:63-88,123-130,365-368`.

`purgeStoredSession()` clears `lastPurgeFailure`, catches every `signOut()`
rejection, then returns success when `takeSessionPurgeFailure()` is null. The
observer can record only a `removeItem` call that ran and rejected. Null
therefore has two meanings:

1. removal ran and succeeded; or
2. auth-js rejected before it called removal.

The second case is real. Pinned `signOut()` loads the stored session through
`_useSession()` first. A near-expiry session refreshes, and a refused rotated
write rejects before `_removeSession()` is reached. A real pinned-client probe
reported:

```text
{"fetchCalls":2,"setCalls":2,"removeCalls":0,
 "settleError":"refused-session-write",
 "signOutError":"refused-session-write","purgeFailure":null,
 "residual":true,
 "unhandled":["refused-session-write","refused-session-write"]}
```

The provider reads null as success and sets `purgeOutstanding` false while the
superseded session remains readable. The test at
`auth-provider.test.tsx:573-590` encodes that false inference: mocked sign-out
rejects, the mocked purge flag is null, and the test expects no retry.

REVIEW-021's crash-class sibling-rejection subdefect also remains open and is
part of this **MUST CLOSE** finding. `_callRefreshToken()` creates
`refreshingDeferred`, then on the non-AuthError persistence failure both rejects
that Deferred and throws to the initiating chain. Catching the initiating
`getSession()` or `signOut()` rejection does not consume the Deferred rejection.
The real composition above observed two unhandled `refused-session-write`
rejections. Green provider mocks do not exercise that pinned-client behavior.

The directed durability answers are split and dispositive:

- A second actual adapter removal refusal in the same mounted provider leaves
  `purgeOutstanding` true. That narrow same-process retry works.
- A second rejection before removal again produces no purge record and can
  falsely end the demand.
- Process restart resets `lastPersistenceFailure`, `lastPurgeFailure`, and the
  effect-local `purgeOutstanding`. No durable marker is stored. The residual
  session survives and the constructor listener can immediately load and
  refresh it.
- On a later foreground while `purgeOutstanding` is true, the provider calls
  `getSession()` before retrying purge, so it can load or refresh the session it
  says it refuses to use.

Claim 55 and the known-limit statement are therefore false. This is not
subtraction-only while durable re-authentication remains binding behavior.

### 4. LOW — exact-head stability and cumulative clean-diff claims are false

**Class:** FAIL introduced in evidence/records; **SHOULD DELETE or narrow**;
not a product merge blocker.
**Files:** `docs/05-quality/evidence/005d-auth-session-fix3/README.md:123-136,215-251`;
`docs/05-quality/evidence/005d-auth-session-fix3/stability.txt`;
`docs/05-quality/evidence/005d-auth-session-fix3/red-lane.txt`;
`docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:637`.

Two fresh `capture.sh` runs at exact target were pair-identical across all eight
gated artifacts, and seven matched their committed copies. `red-lane.txt` did
not. The committed file reports 81 paths and 56 documentation paths; both fresh
runs report 99 and 74. Its protected-object and zero-hit conclusions remain
true, but claim 50's exact-head byte-reproduction statement is false. The
artifact was generated before the commit that made its own range visible.

Separately, cumulative
`git diff --check 6c925d1c..c86ed5c2` exits 2 on retained
`005c-auth-session-fix2/mutants.sh:637`. The 005d statements that the whitespace
was removed and the cumulative diff is clean are false; removing whitespace
only from the copied 005d producer did not change the retained 005c file.

These are claim/instrument and record errors. Delete or narrow claim 50 to its
measured pre-commit boundary, correct the whitespace statement, and do not
delay an owner decision on findings 1–3 for them.

## The five subtractions

1. **B1 token opacity — accepted.** The universal claim is gone. The surviving
   claim says “directly-spelled,” which is exactly what the scanner detects.
   Tests at `token-opacity.test.ts:304-344` assert that aliased parsing and
   inspection survive. They instrument the B1 hole and make it harder to
   reassert the deleted claim; they do not rescue it.
2. **B2 ninth schedule — accepted.** The interleaving attribution is deleted.
   The retained comment at `secure-store-adapter.test.ts:858-873` names only the
   earlier sequencing fact its first failure establishes.
3. **B3 session figures — accepted, bounded.** Every row is synthetic. One
   logical adapter removal performs 513 backend deletes. Pinned
   `_removeSession()` removes the session key, zero to five library-maintained
   PKCE slots, the flow index, the legacy verifier key, and the user key: four
   to nine logical removals, hence 2052–4617 deletes for a completed removal.
   `session-sizes.txt:33-54` repeatedly labels this “derived by reading” and
   “not observed.” The label is honest. A malformed externally seeded index can
   exceed five entries because the reader validates but does not truncate it;
   the stated range is therefore credited for auth-js-maintained state, not as
   an adversarial-storage absolute.
4. **B4 base pin — accepted.** `capture.sh:57` pins the requested base literally,
   and `:68-77` checks ancestry before writing artifact files. Running the actual
   script in an unrelated disposable repository exited 1 with the stated
   stale-pin refusal and produced zero artifact files. The refusal fires.
   Exact-target committed-byte stability is separately partial under finding 4.
5. **B5 records — partial.** Manifest count, dependency range, adapter count,
   CI scope, and ADR-008 qualifications are corrected. Whitespace and
   exact-target stability are not. The controller-only transition at
   `c86ed5c2` also leaves authoritative `BRANCH-NOTES.md` at REVIEW while
   `PROJECT-STATE.md:124` still says BUILD/awaiting REVIEW-022. That disclosed
   phase transition is not tampering and is **ACCEPT AND RECORD** for the owner
   or controller's next reconciliation.

## CI, anomaly, and carry-forward rulings

### Claim 48a and absent `ci.txt`

**Accepted as honest NOT RUN.** A head SHA cannot be embedded in an artifact
before the commit and push that create that head. Copying cycle 2's green
`ci.txt` would falsely bind another head's result to cycle 3. Leaving the file
absent and classifying claim 48a NOT RUN is correct; it is an honest evidence
gap, not a green claim wearing an argument.

Current status is separately known: a read-only GitHub query showed PR #11 at
exact head `c86ed5c2b024f287208a3152697ac71a3f90d5df`, with check
`typecheck, lint, test` completed successfully. That current observation does
not retroactively turn the committed NOT RUN row into a PASS artifact.

### Early `gates.txt` anomaly — third ruling

The early anomaly remains **DISCLOSED, UNEXPLAINED, and NON-DISPOSITIVE** for a
third review. It did not recur in the two fresh exact-target captures: their
`gates.txt` files were pair-identical and matched the committed bytes. That
bounded success does not resolve the earlier anomaly and cannot support a
universal environment-independent determinism claim. It remains
**ACCEPT AND RECORD** as an open Known Issue.

The fresh `red-lane.txt` mismatch in finding 4 is a different, explained
exact-head staleness and must not be conflated with the gates anomaly.

## Standards axis

- **FAIL:** ADR-007 and ruling 17 require refresh initiation only through
  explicit foreground-gated calls. Constructor-listener recovery and exported
  sign-out violate that boundary.
- **FAIL:** durable re-authentication is not achieved when a failed pre-removal
  refresh is mistaken for successful deletion and all demand state resets at
  process restart.
- **PASS, bounded:** the requested LOCK, reviewer naming, exact SHA/base,
  controller-only post-`acb39305` exception, RED-lane Git objects, local gates,
  and native-only ADR-008 qualification satisfy their stated boundaries.
- **BOOKKEEPING:** current state reconciliation and cumulative clean-diff
  language do not hold at the exact target.

## Specification axis

- **FAIL:** claims 51 and 55 and the exact “two entrances” comments do not match
  pinned-client behavior.
- **PASS by subtraction:** B1 and B2 claim only what their instruments observe;
  the two B1 additions record the hole rather than claim it closed.
- **PASS, bounded:** B3's 2052–4617 arithmetic is correct for a completed removal
  over auth-js-maintained PKCE state, and its source-derived label is honest.
- **PASS:** the literal base pin and stale-pin refusal are real.
- **NOT RUN, honest:** committed exact-head GitHub CI claim 48a; current live CI
  is a separate successful observation.
- **FAIL in records only:** claim 50 and cumulative whitespace cleanup exceed
  the exact-target artifacts.

## Verification classification

| Check | Classification | Result |
|---|---|---|
| Exact target/base/merge-base/LOCK/post-`acb39305` gate | **PASS** | Requested immutable boundary and exception verified |
| Cumulative RED-lane Git objects and operation scans | **PASS** | Protected objects identical; 99 paths, 0 database paths/hits; positive controls matched |
| Fresh local typecheck, lint, tests, format | **PASS** | 4/4 commands exit 0; 9 suites, 130 tests |
| Relevant mocked unit suites | **PASS, bounded** | 4 suites, 53 tests; mocks do not cover the real-client survivors |
| Exact-head GitHub CI read | **PASS** | PR #11 head `c86ed5c2`; `typecheck, lint, test` success |
| Committed claim 48a | **NOT RUN, honest** | `ci.txt` absent; no stale head inherited |
| Ticker elimination | **PASS** | Real pinned client: 0 interval starts, 0 fetches |
| Constructor/listener foreground boundary | **FAIL introduced** | Real pinned client refreshes and writes without an app auth call |
| Exported sign-out foreground boundary | **FAIL introduced** | Real pinned client refreshes before logout/removal; no explicit AppState gate |
| Durable re-auth after refused rotation | **FAIL introduced** | 0 removals, null purge record, residual session, unhandled sibling rejections; flags reset on restart |
| B1 alias-hole tests | **PASS as limit instrumentation** | Aliased parser and inspection are deliberately not detected |
| B2 narrowed scheduling claim | **PASS by source/test review** | Claims sequencing only, not the deleted interleaving attribution |
| B3 2052–4617 source derivation | **PASS, bounded** | Pinned `_removeSession()` and producer-maintained PKCE index; explicitly not observed live |
| Literal base pin and counterfactual refusal | **PASS** | Wrong repository exits 1 and writes 0 artifact files |
| Two fresh gated capture sets | **PASS for pair stability; FAIL against committed set** | Fresh 8/8 pair-identical; committed match 7/8; `red-lane.txt` stale |
| Cumulative `git diff --check` | **FAIL introduced in retained evidence** | Trailing whitespace at 005c `mutants.sh:637` |
| 31-mutant committed battery | **NOT RUN by reviewer as a full mutable harness** | Its green transcript does not override the real-client survivors |
| Live Supabase auth, real OTP/session size, production/staging | **NOT RUN / RED lane** | No credential or service call |
| Physical-device/keychain/locked lifecycle | **NOT RUN** | Phase B evidence remains required |

## Final disposition

**MUST CLOSE before a normal merge:** findings 1, 2, and 3.

**SHOULD DELETE or narrow, with no product-code change:** finding 4's exact-head
stability and clean cumulative-diff claims; any “exactly two entrances,” claim
51, or claim 55 language if the owner overrides the implementation FAIL.

**ACCEPT AND RECORD in Known Issues:** the alias-blind token scanner, narrowed
ninth schedule, successful-removal B3 cost and its non-live status, native-only
surfacing, locked-device NOT RUN, latent SDK service-token entrance, honest
absence of `ci.txt`, controller-transition state mismatch, and the unexplained
early gates anomaly.

The LOCK remains `Status: REVIEW`. There is no cycle 4. An owner override may
merge a documented FAIL, but green CI, green mocks, and 31 named mutants do not
close the three real-client survivors above.
