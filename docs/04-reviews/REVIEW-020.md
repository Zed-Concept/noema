# REVIEW-020 — Unit D auth and session v1, fix cycle 1

**Date:** 2026-08-24
**Reviewer of record:** Codex Sol, Ultra effort, fresh session; authored
REVIEW-019 but did not reopen that session and did not build this unit
**Review target:** `feat/auth-session-v1` at
`4a43f454abc596617854edac67cc8cf835fc57c1`
**Review base:** `main` at
`7095267f3891e4d019cc9926b57930107e6e86be`
**Pull request:** #11; exact target head and exact base at the review boundary
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** REVIEW-019 findings 1–6 are closed in the production adapter, finding
7 is only partially closed, and findings 8–10 are closed. The three replacement
invariants are real within the stated one-adapter-instance / one-JavaScript-
runtime boundary. All eight deterministic REVIEW-019 reproductions were rerun.
The product schedules across findings 1–6 no longer construct; the evidence
mutations from findings 7–8 are classified separately below.

The candidate still cannot pass. Its AppState integration calls
`stopAutoRefresh`, but that call is not a lifecycle barrier in the pinned auth
client: initialization can restart the ticker after the app has backgrounded,
initial session recovery can refresh despite the stop, and a refresh already in
flight can persist a rotated session after the stop resolves. This reopens the
token-loss path ADR-005 and binding ruling 13 require the unit to exclude.

The evidence also overstates the mutation battery. A behavior-preserving token
parse and a remove-only queue bypass both survive the committed tests, while
one of the claimed sensitive mutants turns red for an error-message mismatch
without falsifying its safety postcondition. The new 64-chunk ceiling is
fail-closed, but it rejects a session shape the pinned client can persist; the
claim that 96 KiB is beyond any session payload is not established.

Fix cycle 1 of 3 has been consumed. **Two cycles remain.** A response to this
review is fix cycle 2; the controller's stop rule remains in force.

## Review boundary and preconditions

- `HEAD` and `origin/feat/auth-session-v1` were both pinned to
  `4a43f454abc596617854edac67cc8cf835fc57c1` before substantive inspection and
  rechecked before writing this record.
- `BRANCH-NOTES.md:107-140` names Codex Sol / Ultra / fresh session as reviewer
  of record, names DeepSeek V4 Pro / fresh session for the narrow concurrency
  advisory, and records `Status: REVIEW`. The LOCK precondition is satisfied.
- The merge base is exactly
  `7095267f3891e4d019cc9926b57930107e6e86be`. The cumulative range is 7 ahead / 0
  behind, 56 paths, `7240` insertions and `27` deletions. `git diff --check`
  passed.
- The two commits after the last code/evidence head `bee105f876937fc8bed65bedf5890090ce57f029`
  are `7991b7b8db2c1a7e12acc932b31e18fd7db9f90e` and
  `4a43f454abc596617854edac67cc8cf835fc57c1`. Independent `diff-tree` checks
  show that each modifies only `docs/01-state/BRANCH-NOTES.md`. No product code
  or evidence changed in either commit.
- GitHub CI exists for the current target, rather than being inherited from
  `bee105f`: workflow run `32675151572`, check run `97281873229`, exact head
  `4a43f454abc596617854edac67cc8cf835fc57c1`, completed **success**. Its
  `typecheck, lint, test` job includes install, typecheck, lint, test, and format
  check. The legacy commit-status collection is empty; that does not override
  the exact-head Actions check run.
- The advisory reviewer result is **NOT RUN in this record**. The controller
  owns that independent seat and no advisory artifact was supplied to the
  reviewer of record.

## RED-lane scope

**PASS at the Git-object boundary.** The cumulative 56-path range stays within
the authorized client auth surface.

- `supabase/` is the same tree at base and target:
  `2b13461b9abd40f1c00afd316e3321d0931ef2fc`.
- `.github/` is the same tree:
  `173fa30fae4f5f83a35a88ef29914fbf8016c39a`.
- `src/lib/database.types.ts` is the same blob:
  `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc`.
- No changed path is SQL, a migration, a policy, a database function, a grant,
  or a storage-bucket policy. Added non-documentation lines contain no policy,
  RLS, `SECURITY DEFINER`, grant/revoke, bucket, or database-RPC operation. The
  same scans detected synthetic path and operation controls.
- No payment, purchase, entitlement, billing-webhook, secret, or outward
  deployment surface changed. `expo.scheme` is `"noema"` at both endpoints.
  The unit's only dependency addition is `expo-secure-store`.

This proves the committed range, not historical conduct. Whether a credential
was read or a live service was contacted remains **UNVERIFIABLE FROM GIT**. No
production or staging Supabase query was made in this review.

## Disposition of every REVIEW-019 finding

| # | REVIEW-019 defect | Disposition | Result at `4a43f454` |
|---|---|---|---|
| 1 | In-flight reader could see `null` | **CLOSED** | The public-operation queue holds the reader through index and chunk reads. The original schedule now returns the complete old value before the queued replacement runs. |
| 2 | Concurrent writers could commit a hybrid | **CLOSED** | Both writers serialize through the same queue, so their chunk runs cannot interleave. The original hybrid schedule no longer constructs. |
| 3 | Removal could report success while the session survived | **CLOSED** | Delete refusal is retained and the completed sweep rejects. The original all-deletes-refused schedule reports failure with the old session still readable. |
| 4 | Refused index read could destroy the old session | **CLOSED in implementation** | The read union distinguishes absent from refused and rejects before any write. The original destructive schedule no longer constructs. The M4 evidence for this closure is defective; see finding 5. |
| 5 | Same-length corruption and a self-consistent shorter index returned data | **CLOSED under ADR-006 / ruling 15** | Both exact counterexamples now disagree with the recorded checksum and return `null`. The checksum/tamper distinction is honored. A categorical collision claim is inaccurate; see finding 6. |
| 6 | First-gap cleanup stranded an adapter-created fragment | **CLOSED** | Removal unconditionally sweeps all 64 keys in both generations. The original gap schedule leaves no adapter key. |
| 7 | Token-opacity had no sensitive evidence | **PARTIALLY CLOSED** | Invalid JSON and an uncaught parse are now instrumented, but a behavior-preserving parse still passes every relevant gate. See finding 3. |
| 8 | Three claims exceeded their instruments | **CLOSED** | Fresh mutations confirm the original chunk-read rejection, client-storage wiring, and cleanup-delete gaps are now reached. The general mutation-coverage claim remains false for different properties. |
| 9 | Storage-test count was wrong | **CLOSED** | The retained 005a record now says 28 adapter plus 3 platform assertions, 31 total. |
| 10 | HANDOFF range/touch figures were wrong | **CLOSED** | The corrected historical figures are exact: 36 files, `+3134/-27`; excluding HANDOFF, 35 files, `+2923/-27`; HANDOFF alone, `+211`. |

## Findings

### 1. HIGH — AppState does not bound refresh execution or storage writes

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/auth-provider.tsx:88-165`;
`src/lib/supabase.ts:19-46`;
`src/__tests__/auth-provider.test.tsx:298-357`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:210-212`.

The provider does call `stopAutoRefresh()` on `background` and `inactive`, and
that call clears the ticker that exists at that moment. It does not establish
ADR-005's causal property that a refresh only ever fires while foreground.

The singleton client is constructed with `autoRefreshToken: true` before the
provider effects run. In pinned `@supabase/auth-js` 2.112.3, construction starts
initialization; `_initialize()` recovers and may refresh the stored session,
then its `finally` calls `_handleVisibilityChange()`. On a non-browser runtime,
that method starts auto-refresh whenever `autoRefreshToken` is true. The
library's `stopAutoRefresh()` clears the current interval and pending timeout;
it neither cancels initialization nor aborts a refresh already in flight.

Three deterministic probes against the installed client constructed the
violation:

1. Hold initialization in storage, issue the background stop, then release
   initialization. The ticker was absent immediately after the stop and present
   after `_initialize()` settled: initialization restarted it while the app was
   still backgrounded.
2. Seed an expired stored session and stop immediately. Initialization still
   began one recovery refresh after the background stop.
3. Hold the refresh response, stop auto-refresh, then release the response. The
   storage probe recorded a write to its configured auth storage key with
   `afterStop: true`.

These probes establish the forbidden post-stop refresh/write path. Actual
SecureStore rejection while a physical device is locked, and the resulting
token loss, remain **NOT RUN**; no device or simulator participated.

The committed provider tests replace the whole auth client with method spies.
They prove only that `startAutoRefresh` or `stopAutoRefresh` was called; they
cannot observe initialization, recovery refresh, ticker restart, cancellation,
or a post-stop storage write. The source comment at
`auth-provider.tsx:147-150` even accepts on-demand refresh outside the ticker,
which is incompatible with the unqualified ruling that refresh only fires
while foreground. ADR-005:32-35 and binding ruling 13 therefore fail.

### 2. MEDIUM — the unrequested 64-chunk ceiling rejects a persistable session shape

**Class:** FAIL introduced by this work; functional limitation.
**Files:** `src/lib/auth/secure-store-adapter.ts:126-138,478-483`;
`src/lib/supabase.ts:19-37`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:176,270-276`.

The implementation is fail-closed at the new ceiling. An exact-module probe
with a live old value and a 65-chunk replacement observed zero backend writes,
the thrown `needs 65 chunks` error, a byte-stable key set, and the old value
still readable. It never truncates.

The safety claim used to justify 256 → 64 is nevertheless false as stated.
Pinned auth-js persists the whole `Session.user` when no separate `userStorage`
is configured, as here. Its `UserMetadata` and `UserAppMetadata` types have
open-ended index signatures. A structurally valid session containing a
100,000-character metadata value serializes above the 98,304-byte ceiling and
needs 66 chunks at the 1,536-byte budget. That is a session shape the installed
client can pass to this adapter, not a value outside the storage contract.

Whether the current Noema Supabase configuration will accept and return that
much metadata is **NOT RUN** because Phase A made no live auth call. That
unknown cannot support “far beyond any session payload.” The branch has
introduced an unrequested refusal boundary without a server-side bound or real
session-size measurement establishing that it is unreachable.

### 3. MEDIUM — the token-opacity oracle still accepts parsing

**Class:** FAIL introduced in evidence; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:9-13`;
`src/__tests__/secure-store-adapter.test.ts:285-332`;
`docs/05-quality/evidence/005b-auth-session-fix1/mutants.sh:385-393`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:166-179,251-254`.

ADR-004 requires that the adapter never mint, parse, validate, or refresh a
token. The new M14 mutation inserts a bare `JSON.parse(value)`, so the invalid-
JSON test kills it because it throws. That measures whether parsing changes the
observed result for one input, not whether parsing occurs.

A disposable, build-valid violation inserted:

```ts
try {
  JSON.parse(value);
} catch {}
```

The three opacity tests passed, all 48 adapter tests passed, and typecheck,
lint, and format check passed. No static source/AST instrument detects the
parse. The current product code remains opaque by inspection, but the required
artifact-backed regression boundary is absent. REVIEW-019 finding 7 is only
partially closed.

### 4. MEDIUM — the “every public operation” queue claim omits removal

**Class:** FAIL introduced in evidence; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:338-362,558-562`;
`src/__tests__/secure-store-adapter.test.ts:669-770`;
`docs/05-quality/evidence/005b-auth-session-fix1/mutants.sh:231-260`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:123-142,193-196,222`.

The requested ninth schedule is reader versus removal:

1. A reader captures the index and first chunk, then stalls for one macrotask.
2. `removeItem` begins.
3. The invariant requires removal to wait, so the reader returns the complete
   old value before the key space is cleared.

Exact source passes that probe. A mutant that bypasses only removal's queue,
`removeItem: (key) => removeItemBody(key)`, returns `null` to the stalled reader.
Yet that mutant passes all 48 committed adapter tests. M1–M3 remove the central
queue globally and are killed by get/set schedules; none makes removal's own
participation load-bearing.

The production queue is correct within scope, but the evidence cannot certify
the claimed invariant over every public operation. A 21/21 count is not a
substitute for the missing schedule.

### 5. MEDIUM — M4 is an attribution false-red, so 21/21 overstates sensitivity

**Class:** FAIL introduced in evidence; verdict-driving.
**Files:** `docs/05-quality/evidence/005b-auth-session-fix1/mutants.sh:263-269`;
`src/__tests__/secure-store-adapter.test.ts:546-567`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:166-169,222,225-232`.

M4 launders a refused index read back into absence, but its named test also
configures the first replacement chunk write to fail. The mutant turns red
because the assertion expects the adapter's refusal-specific error text and
instead receives the injected write error. The first failed chunk changes no
stored byte, and the subsequent assertion still observes the complete old
session.

Relaxing only the error regex to assert generic rejection made the named test
pass under M4, including its safety postcondition. The battery therefore does
not show that the mutation destroyed the live value or that the named
postcondition became false. A load-bearing variant would allow at least one
destructive replacement write before failing.

M4 is also not a build-valid counterfactual. Its exact edit leaves TypeScript
unable to narrow `BackendRead`; `npm run typecheck` exits 2 with two TS2339
diagnostics on access to `indexRead.value`. Jest's Babel path still executes the
mutant, and the harness does not typecheck each mutated tree before calling it
sensitive.

The fresh battery still exits 0 and prints 21/21 `SENSITIVE`; that execution
fact is reproducible. The semantic claim is not. Claim 49 also says every
behavioral row has a mutant while the table and its own note explicitly leave
rows blank or partially covered.

### 6. LOW — the checksum evidence makes a categorical collision claim

**Class:** FAIL introduced in evidence; not verdict-driving.
**Files:** `src/__tests__/secure-store-adapter.test.ts:500-535`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:183-185,276,280-287`.

The code, ADR-006, evidence prose, and executable forged-checksum test all say
FNV-1a is corruption detection and not tamper resistance. Ruling 15 is honored,
and the two exact REVIEW-019 finding-5 counterexamples close.

The narrower evidence statement that the checksum “distinguishes same-length
payloads” is false. These valid session-shaped JSON strings are each 60 code
units and have the same exported checksum, `2614443459`:

```text
{"access_token":"000pwu","refresh_token":"r","expires_at":1}
{"access_token":"00b5fa","refresh_token":"r","expires_at":1}
```

After storing the first and replacing only its chunk with the second while
retaining the original index, exact `getItem` returns the corrupted second
value, non-null. This does **not** violate ADR-006: its rule is conditional on
the recorded checksum disagreeing, and here it agrees. The test proves one
selected pair differs; the evidence must not universalize that sample. This
collision does not by itself construct README:276's narrower truncated-prefix
collision.

### 7. LOW — current records disagree with their own artifacts

**Class:** FAIL introduced in records; not verdict-driving.
**Files:** `docs/01-state/PROJECT-STATE.md:121`;
`docs/01-state/BRANCH-NOTES.md:107-145`;
`docs/01-state/HANDOFF.md:357-371`;
`docs/05-quality/evidence/005b-auth-session-fix1/README.md:54-84,219-223,256-257`;
`docs/05-quality/evidence/005b-auth-session-fix1/npm-audit.txt:1-15`;
`docs/05-quality/evidence/005b-auth-session-fix1/ci.txt:1-38`;
`docs/05-quality/evidence/005b-auth-session-fix1/capture.sh:5-6,15-17,516-522`.

- `PROJECT-STATE.md` says Unit D is in BUILD and that both reviewers are
  unnamed. The authoritative LOCK now names both reviewers and says REVIEW.
- README and HANDOFF classify `npm audit` as NOT RUN / ENOTFOUND and say the
  artifact records that. The committed artifact instead reports 21
  vulnerabilities and no ENOTFOUND. `capture.sh` itself runs networked
  `npm audit`, contradicting the statements that the producer is offline by
  construction.
- The producer manifest says `capture.sh` writes every artifact except README,
  mutants, and stability. It also does not write the one-off `ci.txt`.
- Run `32671673617` was valid exact-head CI for `81ecd0d`. `ci.txt` overextends
  it to “the exact tree under review” even though the artifact itself was added
  later and the current target is later still. Exact current CI separately
  passes as recorded in this review, so this is record accuracy rather than an
  open CI gate.

The historical completion figures were re-derived and are correct after the
REVIEW-019 correction. The current target is 7 ahead / 0 behind and 56 files,
`+7240/-27`; the two additional commits after `bee105f` are LOCK-only.

## Directed assessments that are not findings

### ADR-005 device-local sign-out

**PASS at the client-call boundary.** `auth-provider.tsx:193-197` passes the
exact `{ scope: 'local' }` argument. The provider assertion at
`auth-provider.test.tsx:283-295` checks that argument, and fresh M18 reversion to
the inherited global behavior turns the instrument red. No live multi-device
revocation behavior was run or credited.

### Builder-disclosed first mutation-harness run

**Disclosed and non-dispositive to the final harness execution, but not
independently replayable.** The historical first run reported all twenty
mutants `SURVIVED` because its `node -e` mutator read `argv[2]` instead of
`argv[1]` and ignored the edit failure. That broken transcript/tree was not
retained, so the historical event is builder testimony rather than a fresh
reviewer reproduction.

The shipped harness now slices arguments from `argv[1]`, requires exactly one
anchor, propagates edit failure as a broken mutant, and classifies Jest JSON
rather than a bare process status. The fresh exact-head run proves the current
script applies its 21 declared edits and restores the tracked battery clone. It
does not cure findings 3–5 about semantic sensitivity.

### Serialization scope

**PASS.** The scope is stated where a future maintainer meets the invariant at
`secure-store-adapter.ts:79-107`, repeated in the evidence README, and realized
by the module-scope singleton in `session-storage.ts`. It covers one adapter
instance in one JavaScript runtime. A second process, a native writer below the
JavaScript layer, a second instance, and web are expressly excluded. No broader
claim is credited; those environments remain NOT RUN.

### Pinned auth-js `lock` decision

**The deprecation/removal premise is verified; the quoted no-effect rationale
is not literally true; rejecting the option is nevertheless reasonable.** The
installed version is exactly 2.112.3. `processLock` is marked deprecated with
the quoted “has no effect” coordination note; `GoTrueClientOptions.lock` says
custom locks still work in v2 and will be removed in v3; the client contains
the `TODO(v3)` legacy path and still assigns and invokes a supplied lock. The
candidate source itself acknowledges that it is still honored.

Thus “no effect” is not literally “the callback never executes.” It is the
upstream rationale that the auth client/server already coordinate refreshes.
Not adopting a deprecated, removal-bound auth-operation lock is still sound:
the property needed here is serialization of every direct adapter operation,
which the local queue supplies within its explicit scope.

### Earlier `gates.txt` stability anomaly

**Non-dispositive to the bounded exact-head stability result.** A fresh
reviewer-side `stability.sh` run at `4a43f454` exited 0 while the mutation run
also loaded the machine: both captures exited 0; all eight gated artifacts were
pair-identical and matched the committed bytes; regenerated `stability.txt`
matched its committed blob. The unidentified early `gates.txt` mismatch did
not recur in the builder's ten follow-ups or this fresh run.

The anomaly remains unexplained and must stay disclosed. It bars a universal,
environment-independent determinism claim, but it does not falsify the narrow
claim that these two exact captures at this target matched. It does not drive
this verdict.

## Independent verification

Three shared-branch-read-only adversarial lanes inspected the adapter schedules,
auth-client lifecycle, and evidence harness. Review-only mutations stayed
isolated in disposable exact-head clones; the clone used for the committed
mutation battery restored its tracked tree exactly. No Supabase/product
credential was used, no credential value was exposed in probe output, and no
probe contacted Supabase or the live application backend. An authenticated
GitHub lookup read only PR and CI metadata.

| Check | Classification | Result |
|---|---|---|
| `npm run typecheck` | PASS | exit 0 |
| `npm run lint` | PASS | exit 0 |
| `npm test -- --ci --runInBand` | PASS | 7 suites, 89/89 tests, exit 0 |
| `npm run format:check` | PASS | exit 0 |
| Adapter suite | PASS | 48/48 assertions; prior product counterexamples across findings 1–6 no longer construct |
| Committed `mutants.sh` | PASS as an execution/restoration fact; FAIL as the claimed semantic oracle | exit 0, 21/21 printed SENSITIVE; rerun matched committed text except the temporary backup path |
| Mutation restoration | PASS | full tracked digest before/after `874c38da857ad71d98d77ba9477ff729f97fca28d133c1ffa29b27d31f679c31`; clean tracked diff; all three source hashes restored |
| Committed `stability.sh` | PASS at this exact target | two captures exit 0; 8/8 gated artifacts pair-identical and equal to committed bytes |
| Current-head GitHub CI | PASS | run `32675151572`, exact `4a43f454`, conclusion success |
| RED-lane object/scope checks | PASS | identical database/workflow/type objects; controlled scans find no database operation |
| Real OTP, live Supabase session, current staging session size | NOT RUN | Phase A; no credential or live call |
| Real iOS/Android keychain, locked-device lifecycle, second process/native thread | NOT RUN | no device or simulator; local pinned-library behavior was probed |
| Served browser flow and real `localStorage` | NOT RUN | module/component tests only |
| `npm audit` reviewer refresh | NOT RUN | not a gate for this review; the committed record inconsistency is finding 7 |
| Advisory reviewer result | NOT RUN in this record | controller-owned independent seat |

## Conclusion

The repair is materially stronger than the REVIEW-019 target: its storage
implementation closes all six prior product defects, its serialization scope is
honest, and its checksum obeys ruling 15. Those facts do not cure the new
ADR-005 lifecycle violation or the remaining evidence defects.

**Verdict: FAIL.** Keep the LOCK at REVIEW. Return the same branch to the same
builder for fix cycle 2 if the controller elects to continue; two cycles remain
at this review boundary and the stop rule is unchanged.
