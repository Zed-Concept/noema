# REVIEW-021 — Unit D auth and session v1, fix cycle 2

**Date:** 2026-08-25
**Reviewer of record:** Codex Sol, Ultra effort, fresh session; authored
REVIEW-019 and REVIEW-020 but reopened neither, and did not build this unit
**Review target:** `feat/auth-session-v1` at
`7bea41c4f8b769ce0e602ea290c2d6b7d8a413ea`
**Review base:** `main` at
`d5b4f8aec3b45e7009a9a7bb2a7119c9758e1bc3`
**Pull request:** #11; exact target head and exact base at the review boundary
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** ADR-007 is not implemented at this head. `autoRefreshToken: false`
does suppress the pinned client's timers, but it does not make refresh initiation
exclusive to the foreground gate. The real `supabase-js` client registers an
auth listener during construction; auth-js's initial-session emission loads the
stored session and refreshes it near expiry without an application auth call.
The provider also makes its own unconditional bootstrap `getSession()` call,
including when mounted in the background. Both paths contradict the governing
foreground-only clause and the branch's PASS claims.

The security-relevant persistence clause is only partly implemented. In the
bounded native, explicit-foreground path, the real observer does fire and the
provider really does call local sign-out and set its current state to
`signedOut`; this is more than a warning, but it is not proof of durable
re-authentication. Best-effort sign-out can reject before storage removal, the
old session can survive, and the provider itself says a later cold start can
read it back. The same real-client path also creates an unhandled sibling
promise rejection in pinned auth-js. Automatically initiated refreshes bypass
the foreground consumer, web lacks the native observer signal, and a later
successful write can clear a previously unconsumed failure. ADR-007's
unqualified guarantee therefore does not hold.

There are also recurring claims that exceed their instruments: token opacity,
the ninth reader/removal schedule, and the ceiling's “actual session” and
per-sign-out cost statements. This is the third review in the chain. Per the
controller's stop rule, the response must subtract or precisely narrow those
claims rather than add a fourth scanner or another claimed semantic oracle.
That does not permit deletion of ADR-007's binding lifecycle requirements: the
two HIGH implementation findings below **must close**, or the controller must
change the governing decision on the record.

Fix cycle 2 of 3 is consumed. **One fix cycle remains.**

## Review boundary and preconditions

- Local `HEAD` and `origin/feat/auth-session-v1` were pinned to
  `7bea41c4f8b769ce0e602ea290c2d6b7d8a413ea` before inspection and rechecked
  immediately before this record was written.
- Local `main`, `origin/main`, and the merge base are exactly
  `d5b4f8aec3b45e7009a9a7bb2a7119c9758e1bc3`. The cumulative range is 13 ahead
  / 0 behind, 79 paths, `+11887/-26`.
- `BRANCH-NOTES.md:137-219` names Codex Sol / Ultra / fresh session as reviewer
  of record, names DeepSeek V4 Pro / fresh session as the single advisory seat,
  and records `Status: REVIEW`. The LOCK precondition is satisfied.
- The sole commit after `ca44c84f9aa864426b1105be41519ae0ae077fec` is
  `7bea41c4`. Independent `diff-tree` inspection shows that it changes only
  `docs/01-state/BRANCH-NOTES.md`. The stop condition did not fire.
- `git diff --check` does **not** pass: it reports introduced trailing whitespace
  at `docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:637`.
- Live GitHub metadata showed current-head CI **success** for exact head
  `7bea41c4`, Actions run `32748119490`, check run `97498385034`. The committed
  `ci.txt` remains honestly narrower and claims only code head `97f1b7d5`.
  `ca44c84f` and `7bea41c4` are documentation-only, so the builder's code-head
  scoping is honest rather than stale.
- Three read-only review lanes covered the real auth-client lifecycle, adapter
  and mutation sensitivity, and evidence/producers. All review mutations lived
  in disposable exact-head clones. No review mutation touched the shared
  checkout; its tracked tree was clean before the authorized record writes.
- No advisory-review result was supplied to this reviewer. That controller-owned
  result is **NOT RUN in this record**.

## RED-lane scope

**PASS at the requested Git-object boundary.** The independent review did not
rely on the stale committed `red-lane.txt` discussed in finding 6.

- `supabase/` is object-identical at base and target:
  `2b13461b9abd40f1c00afd316e3321d0931ef2fc`.
- `.github/` is object-identical:
  `173fa30fae4f5f83a35a88ef29914fbf8016c39a`.
- `src/lib/database.types.ts` is the same blob:
  `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc`.
- The 79-path cumulative range contains no SQL, migration, policy, database
  function, grant, storage-bucket policy, payment, purchase, entitlement,
  billing-webhook, secret, or outward-deployment path.
- Added non-documentation lines contain no policy/RLS operation,
  `SECURITY DEFINER`, grant/revoke, storage-bucket operation, function creation,
  or database RPC. The same path and added-line scans matched synthetic positive
  controls, so the negative results were non-vacuous.
- No production or staging Supabase query was made in this review. No credential
  value was read, exposed, or printed. Read-only GitHub PR/CI metadata and npm's
  advisory endpoint were the only external services consulted.

This establishes the committed range. It cannot establish the builder's
historical external conduct; that remains testimony rather than a Git fact.

## Disposition of all seven REVIEW-020 findings

| # | REVIEW-020 defect | Disposition at `7bea41c4` | Result |
|---|---|---|---|
| 1 | AppState did not bound auth-js lifecycle refresh | **OPEN / NOT CLOSED** | ADR-007's replacement still permits constructor/listener refresh and an unconditional background bootstrap call. Real-client probes reproduce both. See findings 1 and 2. |
| 2 | 64 chunks refused a persistable session; size not measured | **PARTIALLY CLOSED** | 256 admits the exact 100,000-character counterexample; the producer reads shipped constants; refusal remains fail-closed. Synthetic data is still called the product's “actual session,” M29 universalizes the bound, and 513 is not the total successful sign-out cost. See finding 5. |
| 3 | Token-opacity tests accepted behavior-preserving parsing | **PARTIALLY CLOSED / recurring** | The directed caught `JSON.parse(value)` is killed while 54 behavioral adapter tests stay green. A build-valid alias of `JSON.parse` survives all eight opacity assertions and all 54 behavioral tests. See finding 3. |
| 4 | Removal was absent from the queue mutation boundary | **PARTIALLY CLOSED** | Production is queued and a remove-only bypass reddens the committed test, but the test fails first because the reader never reaches its claimed stall. A corrected review schedule confirms the named behavior, not the committed attribution. See finding 4. |
| 5 | M4 was build-invalid and false-red | **CLOSED** | M4 now typechecks and first falsifies the no-write preservation postcondition. M5 and M16 are build-valid. The fresh full harness reports 27/27 sensitive and 0 build-invalid, with byte-identical restoration. |
| 6 | Checksum evidence claimed to distinguish same-length payloads | **CLOSED** | The universal claim is gone rather than reworded; an executable equal-length collision remains; `payloadChecksum` is still inline 32-bit FNV-1a and was not widened. |
| 7 | Current records disagreed with their artifacts | **OPEN / recurring** | npm-audit and CI scope corrections hold, but the producer base and manifest are stale, exact-head stability is red, HANDOFF has a 53/54 count mismatch, and the state records disagree again. See findings 6 and 7. |

## REVIEW-019 disposition recheck

The immutable REVIEW-019 contains ten numbered findings, so all ten are covered
here even though the dispatch refers to nine dispositions.

| # | Disposition at `7bea41c4` |
|---|---|
| 1 | **CLOSED.** The one-instance queue still holds a reader through index and chunk reads. |
| 2 | **CLOSED.** Writers still serialize, and the checksum independently rejects the original hybrid. |
| 3 | **CLOSED.** A refused delete is accumulated across the full sweep and removal rejects. |
| 4 | **CLOSED in implementation and current M4 evidence.** Refused state discovery is not laundered into absence; M4 now typechecks and falsifies preservation. |
| 5 | **CLOSED under ADR-006 / ruling 15.** The two exact checksum-disagreement counterexamples return `null`; no collision-resistance claim is credited. |
| 6 | **CLOSED.** Removal sweeps both 256-key generations rather than stopping at a gap. The cost statement is separately inaccurate; see finding 5. |
| 7 | **OPEN as artifact-backed evidence; current source clean.** The adapter presently treats payload as opaque, but the universal AST-scan claim accepts an alias parse. See finding 3. |
| 8 | **CLOSED for the three original omissions.** Chunk-read failure, client-storage wiring, and cleanup deletion remain reached. New observer-wiring and lifecycle gaps are findings 1–2, not a reopening of those exact omissions. |
| 9 | **CLOSED.** The retained 005a count remains corrected to 28 adapter + 3 platform = 31. |
| 10 | **CLOSED.** The retained original range and HANDOFF touch figures remain corrected. The new 53/54 statement is a different current-cycle record error. |

## Findings

### 1. HIGH — refresh still self-initiates and bypasses the foreground gate

**Class:** FAIL introduced by this work; verdict-driving; **MUST close**.
**Files:** `src/lib/supabase.ts:28-58`;
`src/lib/auth/auth-provider.tsx:103-124,162-212`;
`src/__tests__/auth-provider.test.tsx:138-141,345-360`;
`src/__tests__/supabase-client.test.ts:98-120`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:21-50,176-180`.

The cited pinned-source statements are individually accurate but not exhaustive.
`GoTrueClient.js:4104` gates `_recoverAndRefresh` on `autoRefreshToken`, and
`:4693` gates the non-browser ticker. The browser ticker at `:4724-4727` is a
third flag-gated start. Turning the option off suppresses those timers.

It does not suppress every refresh initiation:

1. `SupabaseClient` construction calls `_listenForAuthEvents()`
   (`@supabase/supabase-js` 2.112.3 source `SupabaseClient.ts:413-415,662-666`;
   built CJS `:669,832-835`).
2. `onAuthStateChange()` schedules an asynchronous initial-session emission
   (`GoTrueClient.js:3629-3644`).
3. `_emitInitialSession()` enters `_useSession()`, whose `__loadSession()` calls
   `_callRefreshToken()` for a near-expiry stored session at `:2526-2554`, with
   no `autoRefreshToken` check.

A real `createClient()` probe using pinned 2.112.3, a near-expiry stored session,
and a local fake token response observed exactly one
`/token?grant_type=refresh_token` request and persisted the rotated token without
any application auth method call. This is client-initiated refresh, not merely a
ticker terminology dispute.

The application adds another direct violation. The cold-start effect calls
`supabase.auth.getSession()` unconditionally at `auth-provider.tsx:116-124`.
The branch's own background-mount test expects exactly one call and explains
that it is the bootstrap. Pinned auth-js refreshes inside that call when the
session is near expiry. The separate call at `:191-194` is foreground-gated;
the bootstrap is not.

The architecture has further latent call sites: `supabase-js`'s wrapped REST,
Storage, and Functions fetches obtain a token through `_getSessionToken()`, which
calls `auth.getSession()` at built CJS `:792-797`. No such data request is
present in the current product source, so that path was not needed to reproduce
this finding, but it disproves the comment that one application helper is the
only possible caller.

Claims 1 and 2, the construction comment, and the provider background test are
therefore mutually inconsistent with ADR-007 and binding ruling 17. Deleting
the evidence prose cannot close this implementation finding.

### 2. HIGH — refused rotated writes do not reliably force durable re-authentication

**Class:** FAIL introduced by this work; security/lifecycle; verdict-driving;
**MUST close**.
**Files:** `src/lib/auth/session-storage.ts:63-117,120-139`;
`src/lib/auth/foreground-refresh.ts:85-106`;
`src/lib/auth/auth-provider.tsx:133-160,183-198`;
`src/__tests__/foreground-refresh.test.ts:122-218`;
`src/__tests__/auth-provider.test.tsx:399-445`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:37-43,180-186,337-346`.

The directed native explicit-path question has a split answer. A real pinned
`GoTrueClient` over the exact `observingWrites` decorator and real chunked
adapter received a rotated fake response, then encountered a refused backend
write. The observer recorded the refusal, the gate returned `unpersisted`, and
the provider-shaped continuation invoked `signOut({ scope: 'local' })` and
reached `{ status: 'signedOut' }` even when that best-effort sign-out rejected.
The state transition is real; it is not a logged warning. Durable
re-authentication is not established: the real composition rejected before
cleanup ran and left the old session on disk. Separately, provider control flow
and the mocked cleanup-failure test show that `signedOut` is set even when
removal itself rejects, while `auth-provider.tsx:148-150` admits that a later
cold start can read the residual session back. The observer fires; forced
durable re-authentication does not necessarily follow.

The whole lifecycle still fails in three ways.

First, pinned auth-js creates an orphaned rejection on the exact single-caller
path. `_callRefreshToken()` creates `refreshingDeferred` at `GoTrueClient.js:4198`.
When `_saveSession()` throws a non-`AuthError`, the catch both rejects that
Deferred and throws at `:4300-4301`. The initiating `getSession()` chain can be
caught, but no waiter consumes the Deferred promise. The exact standalone probe
reported:

```text
{"fetchCalls":1,"caught":"refused-session-write","unhandled":["refused-session-write"]}
```

The real provider-shaped composition still forced `signedOut`, but produced two
unhandled rejections: one from the foreground refresh and another when best-effort
`signOut({ scope: 'local' })` re-entered `_useSession()` and refreshed before it
could remove storage. An auth-path failure that leaves uncaught promise
rejections is not safely surfaced.

Second, the constructor/listener and bootstrap refreshes in finding 1 do not
originate in `refreshWhileForeground`, so no consumer is guaranteed to call
`takeSessionPersistenceFailure()` and produce the required re-authentication
outcome at the time of failure. The observer itself can fire, but
`session-storage.ts:110-114` clears the outstanding failure on any later
successful write. A real-client review schedule refused rotated session v2,
then successfully wrote v3 before the foreground consumer read the flag; the
gate returned `settled`. The earlier refused rotation was never surfaced as
claimed.

Third, the observer is deliberately absent on web: `authSessionStorage` is
`undefined`, so localStorage writes do not produce the native failure signal.
A foreground web call can still enter `refreshWhileForeground`, but a
real-client probe whose unobserved storage write rejected returned `settled`
because `takeSessionPersistenceFailure()` was empty. The README discloses this
boundary, but ADR-007 and ruling 17 do not contain a native-only qualifier. A
README limit cannot narrow an accepted ADR.

The committed suites split the chain: foreground tests manually wrap their own
adapter, while provider tests mock both `getSession()` and the failure flag.
Replacing only the production export at `session-storage.ts:138-139` with the
raw, unobserved adapter still typechecked and left four relevant suites green,
41/41 tests. Production wiring is presently correct by source inspection; the
claimed integration evidence is not.

The final cycle must handle the real client path and the governing platform
scope. Merely deleting claims 3–8 is insufficient for the unqualified binding
decision.

### 3. MEDIUM — the token-opacity AST claim accepts an aliased parser

**Class:** FAIL introduced in evidence; recurring claim/instrument mismatch;
**DELETE or NARROW the claim**.
**Files:** `src/__tests__/token-opacity.test.ts:69-171,206-230`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:98-108,188-190,348-356`;
`docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:582-593`.

The exact directed mutation still behaves as claimed. Adding
`try { JSON.parse(value); } catch {}` to the adapter left all 54 behavioral
adapter tests green and turned the opacity suite red. The literal is detected
by two source assertions. This confirms the new instrument is sensitive to the
one spelling it declares.

It does not establish the categorical PASS row that the adapter “never parses
or inspects” the payload. This build-valid equivalent survived all eight opacity
assertions and all 54 behavioral adapter tests:

```ts
const parsePayload = JSON.parse;
try {
  parsePayload(value);
} catch {}
```

The visitor recognizes a property access whose receiver is literally the
identifier `JSON`; it does not follow aliases. Similar indirection can bypass
the method-name whitelist. Direct source review found no such behavior in the
current adapter, so this is an evidence defect rather than proof that production
currently parses tokens.

This is REVIEW-019 finding 7, REVIEW-020 finding 3, and now a third
claims-versus-instrument cycle. The stop rule applies. Do not grow another
syntactic whitelist and call it whole-program opacity. Delete the universal
automated PASS, or narrow it to the exact constructs the AST walker rejects and
leave the binding opacity property to source review.

### 4. MEDIUM — the ninth schedule turns red before constructing its stated stall

**Class:** FAIL introduced in evidence; recurring attribution defect;
**DELETE or NARROW the claim**.
**Files:** `src/__tests__/secure-store-adapter.test.ts:848-901`;
`docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:570-579`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:110-115,188-191`.

The exact remove-only bypass is build-valid and the committed test turns red.
Its first failure is not the claimed complete-value postcondition. It is
`expect(stalled).toBe(true)` at line 883: unqueued removal overtakes before the
reader reaches its first chunk, so the alleged “stalled reader” schedule was
never established. Jest stops there and does not attribute the failure to the
next complete-value or interleaving assertions.

A disposable corrected schedule first held the reader after its first chunk,
then started removal. Production returned the complete live value with no
interleaved delete; the same remove-only bypass returned `null`. Source review
and that schedule support the implementation. They do not retroactively make
the committed ninth schedule's stronger wording accurate.

The final cycle should subtract the claim that this committed instrument creates
the named stalled-reader schedule, or narrow the row to the sequencing fact it
actually detects. This is an oracle-attribution issue, not a request for another
instrument.

### 5. MEDIUM — the ceiling record calls synthetic data actual and understates sign-out cost

**Class:** FAIL introduced in evidence and resource justification;
**DELETE or NARROW the claims**.
**Files:** `src/lib/auth/secure-store-adapter.ts:126-183`;
`src/__tests__/secure-store-adapter.test.ts:951-1035,1120-1137`;
`docs/05-quality/evidence/005c-auth-session-fix2/session-sizes.sh:55-64,113,133-146`;
`docs/05-quality/evidence/005c-auth-session-fix2/session-sizes.txt:13-41`;
`docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:595-600`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:57-92,188`.

The core mechanics pass:

- `session-sizes.sh` reads `CHUNK_BUDGET_BYTES` and `MAX_CHUNKS` from the shipped
  TypeScript module rather than transcribing them. A disposable 256 → 257
  constant change altered the generated ceiling and delete count.
- The 100,000-character REVIEW-020 counterexample needs 67 chunks and is admitted.
- A 1 MiB shape needs 684 chunks and is refused before any write; the old value
  remains readable. The ceiling is a resource bound and disclosed functional
  limit, not a safety guarantee.
- One logical adapter `removeItem()` performs exactly 513 backend deletes:
  the base key plus 256 keys in each generation.

The surrounding claims exceed those measurements. The 2-chunk object is a
hand-built session-shaped fixture with an empty metadata object. It is repeatedly
called “what Noema v1 actually creates” and “the session this product actually
creates,” while the same README classifies a real OTP/live session and real
server size **NOT RUN**. `mutants.sh:597` further labels M29 as proving that the
ceiling admits “every session auth-js can hand this adapter,” although the same
record exhibits a structurally valid 684-chunk session that is refused.

The 513 statement is also only per logical removal, not “paid once per sign-out.”
Pinned auth-js 2.112.3 `_removeSession()` always removes the primary storage key,
the PKCE flow-index key, the legacy PKCE key, and `${storageKey}-user`; its
normal producer caps the indexed PKCE flow slots at five. With this adapter, a
successful sign-out therefore invokes at least four 513-delete sweeps, 2,052
backend deletes, and a normally producer-maintained five-slot index invokes
nine, 4,617 deletes, before considering read work. That is not an absolute
maximum for a manually seeded oversized index because the reader validates IDs
but does not truncate the array. The test proves 513 for one call and cannot
support the lifecycle total.

Delete “actual,” the universal M29 label, and “once per sign-out,” or restate
them as synthetic shape, bounded named counterexample, and per-logical-removal
cost. The branch need not invent another session-size oracle to make those
subtractions.

### 6. MEDIUM — exact-head stability is reproducibly red against a stale RED-lane producer

**Class:** FAIL introduced in evidence; verdict-driving for claim 50;
**MUST correct the producer or delete the PASS claim**.
**Files:** `docs/05-quality/evidence/005c-auth-session-fix2/capture.sh:41-46,340-452`;
`docs/05-quality/evidence/005c-auth-session-fix2/red-lane.txt:1-25`;
`docs/05-quality/evidence/005c-auth-session-fix2/stability.sh:49-95`;
`docs/05-quality/evidence/005c-auth-session-fix2/stability.txt:1-27`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md:193-196,262,358-367`.

`capture.sh` says it measures current main and hard-codes
`7095267f3891e4d019cc9926b57930107e6e86be`. The current merge base and the
005c README base are `d5b4f8ae`. The committed `red-lane.txt` repeats the false
“current main / merge base” description and records only 58 paths.

A fresh exact-head `stability.sh` run produced two successful captures. Their
eight gated artifacts were byte-identical to one another; `gates.txt` and the
other seven current outputs agreed between A and B. The run nevertheless exited
1 because regenerated `red-lane.txt` did not match the committed bytes:

```text
capture run A exit: 0
capture run B exit: 0
red-lane.txt  IDENTICAL
red-lane.txt  DIFFERS from the committed copy
differing-or-failing comparisons: 1
```

The regenerated stale-base counts were 80 paths, 55 documentation paths, and
4,188 added non-documentation lines, versus committed 58, 36, and 3,567. The
requested exact `d5b4f8ae..7bea41c4` boundary is 79 paths. This is deterministic
post-commit staleness, not the old unexplained `gates.txt` anomaly.

Claim 50 says the committed copies regenerate at this head. They do not. The
independent RED-lane result remains PASS, but this evidence artifact and its
stability claim fail.

### 7. LOW — current producer and handoff records still disagree

**Class:** FAIL introduced in records/tooling; not independently verdict-driving.
**Files:** `docs/05-quality/evidence/005c-auth-session-fix2/capture.sh:5-8,41-46`;
`docs/05-quality/evidence/005c-auth-session-fix2/deps.txt:1-17`;
`docs/05-quality/evidence/005c-auth-session-fix2/mutants.sh:635-638`;
`docs/01-state/HANDOFF.md` at the reviewed target `:40-52,75-81`;
`docs/01-state/PROJECT-STATE.md:120-123`;
`docs/01-state/BRANCH-NOTES.md:137-219`.

- The `capture.sh` header lists four exceptions but also does not write
  `session-sizes.txt`. README and HANDOFF say the manifest now names all five;
  the producer itself does not.
- `deps.txt`, generated from the obsolete base, shows `expo-secure-store` added,
  while current claim 47 says this cycle adds no dependency. The intended
  fix-cycle-only statement and the recorded range do not match.
- HANDOFF says the directed caught parse left 53 behavioral adapter tests green;
  the committed adapter artifact and fresh run contain 54.
- `mutants.sh:637` has introduced trailing whitespace, making cumulative
  `git diff --check` exit nonzero.
- The authoritative LOCK says REVIEW while `PROJECT-STATE.md` still says BUILD.
  The transition commit was controller-only by dispatch, so this last mismatch
  is controller-owned and does not change the satisfied LOCK precondition. It
  does mean learning 18's repo-state reconciliation has drifted again.

The npm-audit/network correction holds. `ci.txt` is SHA-bounded honestly. Those
parts of REVIEW-020 finding 7 remain closed.

## Directed assessments and fresh verification

### Three re-reddened instruments

1. **Token opacity:** the directed caught literal parse left 54/54 behavioral
   adapter tests green and made the AST suite red. The alias survivor is finding 3.
2. **Reader/removal:** the remove-only bypass typechecked and made the ninth test
   red. Its first failed assertion is the attribution gap in finding 4; a corrected
   disposable schedule separately falsified the intended value postcondition.
3. **M4:** the rebuilt refusal-laundering mutant typechecked and turned the
   preservation test red at the no-write postcondition, before error identity.

### Full mutation battery

A fresh exact-head clone ran the committed `mutants.sh` to completion:

```text
mutants.sh: 27/27 mutants turned their claim red; tree restored.
mutants:       27
sensitive:     27
build-invalid: 0
exit:          0
```

The full tracked digest before and after was identical,
`0e61e6358a294378a4d98972b7799c653b9f0840084aba4f8ac8f79e7ec5a158`;
the index tree remained `6220eedbb35e0803bba06454d3c926d9c4c56e0b`;
cached and unstaged tracked diffs were empty. The five touched source files were
byte-identical to their pre-run copies. This closes build validity and restoration
as execution facts. It does not override the semantic survivors and attribution
defects above.

### Checksum subtraction

The old same-length distinguishing sentence appears only in historical or
explicitly negative/subtraction text. The active test demonstrates the equal-
length session-shaped collision and says no general distinguishing property is
claimed. `payloadChecksum()` remains the same nine-line, dependency-free,
32-bit FNV-1a implementation. The hash was not widened.

### Carry-forward items

- **Early `gates.txt` anomaly:** still disclosed and unexplained. It did not recur
  in this review: both fresh captures exited 0 and their `gates.txt` bytes matched.
  It remains non-dispositive to that bounded fact and still bars a universal
  environment-independent determinism claim. Finding 6 is a different,
  reproducible current-head mismatch and is dispositive to claim 50.
- **CI scope:** committed `ci.txt` accurately limits itself to `97f1b7d5`.
  Subsequent commits are documentation-only. Exact target `7bea41c4` also has a
  separate successful GitHub check, so the code claim is neither stale nor
  inherited from an unrelated SHA.

## Verification classification

| Check | Classification | Result |
|---|---|---|
| Exact SHA/base/range/LOCK/post-`ca44c84f` gate | **PASS** | Preconditions satisfied; 13 ahead / 0 behind, 79 files |
| Independent cumulative RED-lane boundary | **PASS** | Protected objects identical; controlled path/operation scans clean |
| Exact-head GitHub CI | **PASS** | Run `32748119490`, check `97498385034`, exact target success |
| Fresh local typecheck, lint, tests, format | **PASS** | Both `capture.sh` runs exited 0 |
| Cumulative `git diff --check` | **FAIL introduced** | Trailing whitespace at `mutants.sh:637` |
| Fresh stability against committed artifacts | **FAIL introduced** | Pair-identical fresh outputs, stale committed `red-lane.txt` |
| 27-mutant execution/build/restoration | **PASS, bounded** | 27/27 red, 0 build-invalid, tracked bytes restored |
| ADR-007 foreground-only refresh | **FAIL introduced** | Automatic listener refresh and background bootstrap reproduced |
| Native explicit observer → forced signed-out transition | **PASS, bounded** | Real client/adapter composition forced the state transition |
| Durable re-authentication after a refused rotated write | **FAIL introduced** | Best-effort sign-out can reject before removal; residual session can return on cold start |
| Whole-lifecycle persistence surfacing | **FAIL introduced** | Ungated/web gaps, failure erasure, and unhandled rejections |
| Current adapter source token opacity | **PASS by direct review; artifact claim fails** | No present parse/inspection found; alias mutation survives oracle |
| Ceiling above named 100k counterexample | **PASS, bounded** | Constants read; 67 admitted; 684 refused fail-closed |
| Real OTP/live session size and server-side bound | **NOT RUN** | No live Supabase call or credential |
| Physical device/keychain/locked lifecycle | **NOT RUN** | No device or simulator |
| Served browser/localStorage behavior | **NOT RUN as browser flow** | Real storage-double failure path was exercised and was not surfaced |
| npm audit | **FAIL pre-existing** | 21 upstream advisories; fix-cycle-2 added no dependency, while the cumulative unit still contains its authorized `expo-secure-store` addition |
| Advisory reviewer result | **NOT RUN in this record** | No controller-owned artifact supplied |

## Required final-cycle disposition

**Must close in implementation or governing architecture:**

1. All runtime refresh initiation must satisfy ADR-007's explicit foreground
   boundary; `autoRefreshToken: false` alone is not that boundary.
2. A refused rotated write must be safely surfaced on every platform/scope the
   ruling claims, without unhandled promise rejection and without an unconsumed
   failure being erased before action; a residual superseded session must not
   silently restore without the required re-authentication.

**Delete or narrow; do not add another semantic instrument:**

1. The categorical automated token-opacity PASS.
2. The claim that the committed ninth test constructs a stalled-reader/removal
   interleaving.
3. “Actual session,” “every session auth-js can hand,” and “513 once per
   sign-out.”
4. Any observer-wiring PASS broader than the separately tested components.

**Record/tool correction, not a new behavioral oracle:**

1. Reconcile the capture base and committed RED-lane/stability bytes, or delete
   claim 50.
2. Reconcile the producer manifest, dependency-range language, test count,
   whitespace, and controller-owned active-state row.

The LOCK remains `Status: REVIEW`. A response to REVIEW-021 is fix cycle 3 of 3.
