# REVIEW-023 — Unit E session durability

**Date:** 2026-08-26
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the harness does not expose model or effort metadata, so those two
attributes cannot be independently confirmed
**Code target:** `feat/session-durability` builder head
`caa31ee2ff77331d7ab976bff5bb7bb4588244c9`
**Review overlay:** `501c1635dfb8f9158e07d690279aec6b0acff3d1` — controller LOCK transition only
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Pull request:** #17; draft; CI passed at the review overlay
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** Unit E materially improves the recovery mechanism, but it does not
close REVIEW-022 finding 3 to all three ADR-009 requirements under the
controller's governing wording.

The read-back implementation correctly proves absence across all 513 addresses
of the new `zc-auth-session` key space, and a `signOut()` rejection before
removal now reads as not purged. The ordinary refused-write schedule also
records a secretless demand before resolving and avoids the pinned client's
unhandled Deferred path. Those are real closures at their measured boundary.

Three directed schedules remain dispositive:

1. When the demand store itself refuses, the adapter deliberately rethrows the
   original session-write error. The pinned client again emits two unhandled
   `review-refused-session-write` failures. No durable demand exists, the
   residual keychain session survives, and a fresh module process over the same
   fake stores exposes `signedIn`. R2 and R3 therefore remain open; the evidence
   record's exception cannot narrow the controller's unqualified R3 wording.
2. On the flag-driven path, `requireReauthentication()` records the demand but
   awaits the entire purge before setting `signedOut`. A real pinned-client
   schedule held the logout request pending after `signOut()` performed its
   internal refresh. The demand remained durable, proving M14's clear-on-write
   defect was fixed, but the provider continued to expose `signedIn` for the
   unbounded purge interval. The failure had been detected but had not forced
   re-authentication.
3. Unit E changes the storage namespace without sweeping Unit D's derived key.
   The current client ignores the old session, but `confirmSessionPurged()`
   declares the new space empty while the old material remains, and a rollback
   client recovers it as usable. The same explicit key changes the web
   `localStorage` namespace, so “web unchanged” is false even though web's
   native-only surfacing boundary remains preserved.

The builder has three fix cycles under the dispatch. The product findings below
are **MUST CLOSE** for a PASS. Governance and evidence claims must be reconciled
by the named owner of each record; they cannot be defended by another scanner.

## Requirement matrix

| Requirement | Result at `caa31ee2` | Disposition |
|---|---|---|
| R1 — purge success observed over the full enumerable session key space | **FAIL / partial** | **PASS** for the new key: exact 513-address read-back, read-only, and upstream `signOut()` rejection classified not purged. **FAIL** at the required Unit D → Unit E transition: the old derived key is never read or removed and remains rollback-usable. |
| R2 — secretless non-keychain demand, durable across restart, consulted before usable bootstrap, purge before provider `getSession()` | **FAIL** | Ordinary and outstanding-at-bootstrap paths pass over injected stores. A demand-write refusal leaves no durable record and restart exposes the residual session. The newly detected flag path also leaves the already signed-in provider usable while purge is pending. The real file backend remains NOT RUN. |
| R3 — zero unhandled rejections on the refused-write path | **FAIL** | Ordinary demand-record success passes. Demand-store refusal deliberately re-enters the pinned client's throw-and-reject path and produced two unhandled failures. No exception is authorized by the governing wording. |

## Owner decision matrix

| Finding | Triage | Merge consequence |
|---|---|---|
| 1. Demand-store refusal loses restart durability and re-enters the unhandled path | **MUST CLOSE** | R2 and R3 remain open; blocks a PASS |
| 2. Flag-driven recovery keeps exposing `signedIn` during an unbounded purge | **MUST CLOSE** | ADR-009's detected-failure re-authentication guarantee remains open |
| 3. Old key survives and the web storage namespace changes | **MUST CLOSE** | Required transition/web probe fails; current installed-base assertion only bounds impact |
| 4. Builder wrote a controller-owned governance record | **MUST RECONCILE** | Hard session-protocol violation; controller-owned correction required |
| 5. Evidence claims exceed their instruments, including a false-green producer failure | **MUST NARROW / SUBTRACT** | Evidence record is not merge-ready as written; no additional scanner can cure the universal claims |
| 6. HANDOFF commit and touch counts are inaccurate | **CORRECTED by the companion HANDOFF top insert** | Bookkeeping defect; immutable old block preserved; no product-code effect |

## Review boundary and preflight disclosure

- The first preflight stopped after reading a stale local checkout whose LOCK
  still read `BUILD`. The original dispatch ordered READ FIRST ahead of
  CHECKOUT. CTRL-006 then identified that step order as a controller defect and
  supplied the committed transition. No product analysis or review artifact was
  produced before the stop.
- On resume, the required sequence was followed: `git fetch origin`, checkout
  of `501c1635dfb8f9158e07d690279aec6b0acff3d1`, then
  `git diff --stat caa31ee2..HEAD`. The diff reports only
  `docs/01-state/BRANCH-NOTES.md`, 20 changed lines. The overlay's sole parent is
  `caa31ee2ff77331d7ab976bff5bb7bb4588244c9`.
- At the corrected checkout the `feat/session-durability` LOCK reads
  `Status: REVIEW`, names Codex Sol / Ultra / fresh session as reviewer of
  record, and names DeepSeek V4 Pro / fresh session as advisory reviewer.
- The dispatched seat is recorded exactly. The harness does not expose the
  actual model or effort tier, so “Sol / Ultra” cannot be independently
  confirmed from runtime metadata.
- `AGENTS.md` was 5378 bytes and its SHA-256 was
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`
  before it was trusted.
- Base, requested base, and merge base are exactly
  `7caf23e10856601f17d52ae37ae59fbb9dbbac60`. The builder range contains five
  commits, 35 files, `+4331/-515`. The review overlay is excluded from every
  product and evidence range claim.
- The candidate was tested in a disposable worktree pinned at `caa31ee2`.
  Its tracked tree was clean before and after the runs. The shared controller
  checkout contained an untracked advisory probe; it was not read, edited, or
  deleted. `REVIEW-023-ADVISORY.md` did not exist when this review began.
- Three read-only subagents independently covered the specification,
  standards, and governance/evidence axes. The reviewer of record then ran the
  verdict-driving pinned-client schedules and made every disposition.
- All auth probes used injected in-memory keychain/file stores and fake local
  fetch responses. No staging or production Supabase request was made, no
  credential was read, and no secret value was printed.

## Method and fixed boundary

Mechanism conclusions below come from executing the pinned
`@supabase/supabase-js@2.112.3` / `@supabase/auth-js@2.112.3` composition with
injected storage and fetch, not from reading library source or accepting the
builder's workflow. Source inspection was used only to locate application code
after a probe established behavior.

The builder's one 17-subagent workflow was treated as a list of leads. Its M14
lead, double-refusal lead, demand-store fallback, old-key transition, and web
boundary were independently probed. The review also added an exact-address
read-back probe and a producer-failure negative control.

## Directed probe results

| Probe | Fresh result | Disposition |
|---|---|---|
| Committed finding-3 probe at base and head | Base `7caf23e1`: RED, exit 1. Head `caa31ee2`: GREEN, exit 0. The runner used a fresh module registry over the same fake keychain and demand-store objects. | **PASS at the committed schedule.** The base run aborts at its first R1 assertion, so it is not evidence for every later base fact claimed in row 1. |
| Exact read-back address set | Empty space read exactly `[base, generation 0 × 256, generation 1 × 256]` in order, 513 unique addresses; a value at the final address made the result false after all 513 reads. | **PASS for the new key.** This closes the substantive R1 address/cardinality question independently of the count-only committed test. |
| M14 battery and real mid-purge schedule | M14 typechecked and turned its selected test red. In the fixed real-client path, while logout was held: `state:"signedIn"`, `demandFiles:1`, `logoutPending:true`. | **M14 closure PASS; provider exposure FAIL.** The successful internal refresh no longer clears the demand, but re-authentication is delayed until purge settles. |
| Demand-store refusal, process 1 | Provider eventually `signedOut`; demand files 0; two residual session-space keys remained. Jest reported two unhandled `review-refused-session-write` errors and the probe suite exited 1. | **FAIL R2/R3.** The probe-local listener did not intercept the errors, but Jest's own process handler surfaced both as test failures. |
| Demand-store refusal, restart | Fresh module registry over the same storage maps, with stores answering again: `state:"signedIn"`, `demandFiles:0`. | **FAIL R2.** No durable record survived, so the residual session was exposed as usable. |
| Double refusal through provider | Invalid refresh plus all 513 delete refusals settled with `state:"signedOut"`, one demand file, and 513 delete attempts. After delete recovery and restart, state remained `signedOut` and the demand cleared. | **NOT REPRODUCED as a strand.** Durability held in this schedule. |
| Direct concurrent Deferred probe | Two concurrent pinned-client `getSession()` calls both fulfilled inside one second under the candidate double-refusal setup. | **No availability finding established.** Known limit 11 is source-read speculation and should be stated as unverified, not as a candidate defect. |
| Old derived key | For the injected test-project URL, the pinned client discovered `sb-legacy-unit-d-auth-token`; current explicit-key client did not read it and returned no session; new-key read-back returned true; rollback client recovered the legacy access token. Old material remained. | **FAIL transition boundary.** Current-use false, rollback-use true. |
| Web fallback storage | With fake `localStorage` and no explicit storage object, the pinned client read and wrote `zc-auth-session`, never read the Unit D key, and left that old key present. | **FAIL “web unchanged”; PASS native-only surfacing.** Web still uses localStorage and no write observer, but its namespace changed. |
| Mutation battery | 14/14 SENSITIVE, 0 build-invalid; every mutant typechecked; mutated files restored byte-identically. | **PASS as an execution fact only.** It is not coverage. |
| Fresh capture and stability | Four gates passed; 10 suites / 159 tests. Eight gated artifacts matched across two captures and matched the committed copies. | **PASS at the reviewer-pinned candidate.** The producer artifacts do not bind themselves to a candidate SHA or clean tree. |
| Protected-scope producer refusal | A PATH-prepended `git` wrapper returned 77 for every `git diff`; `capture.sh` still exited 0 and reported zero range paths and zero added lines with all regex controls matched. | **FAIL evidence oracle.** Pattern controls do not prove the producer succeeded. |

## Findings

### 1. HIGH — the fail-closed demand-store refusal is neither restart-durable nor handled

**Class:** FAIL pre-existing, partially remediated but not closed; auth/session
correctness; verdict-driving; **MUST CLOSE**.
**Invariant:** ADR-009 R2 and R3.
**Probe:** independent pinned-client demand-store-refusal process/restart
schedule.
**Files:** `src/lib/auth/session-storage.ts:116-136,152-180`;
`src/lib/auth/auth-provider.tsx:234-248`;
`docs/05-quality/evidence/006a-session-durability/README.md:72-77,128-145`.

When the keychain refuses the rotated-session write,
`observingWrites()` first tries to record a demand. If that second store also
refuses, lines 163–170 set the process-local flag and rethrow the original
keychain error. The evidence calls this a deliberate fail-closed exception.
That describes the implementation but does not satisfy the governing
requirement.

The real pinned-client schedule made keychain writes and deletes refuse and
made the demand store refuse writes. Process 1 eventually exposed `signedOut`,
but no demand file existed and two session-space keys remained. The test
runner then surfaced two unhandled `review-refused-session-write` failures, the
same throw-and-reject shape REVIEW-022 finding 3 required Unit E to close.

After unmounting, resetting the module registry, and restoring the stores while
retaining their maps, the new provider exposed `signedIn`; no demand existed to
trigger the observed purge. This is a restart over the same fake durable media,
not a second fresh fixture. The fallback therefore fails both parts it needs to
protect: R3 is unhandled in process 1, and R2 is forgotten by process 2.

README claims 13 and 18 narrow their boundary to “where the demand store
answers.” The controller explicitly ruled that the dispatch wording governs,
and R3 says zero unhandled rejections on the refused-write path without that
exception. Subtraction cannot convert an unmet behavioral requirement into a
PASS.

### 2. HIGH — detected persistence failure leaves the provider signed in until an unbounded purge settles

**Class:** FAIL pre-existing and not closed; auth/session lifecycle;
verdict-driving; **MUST CLOSE**.
**Invariant:** ADR-009's detected failure “forces re-authentication” guarantee
and R2's usable-session boundary.
**Probe:** independent M14/pending-logout pinned-client schedule.
**Files:** `src/lib/auth/auth-provider.tsx:195-215,234-248,280-306`;
`src/__tests__/auth-provider.test.tsx:482-520`.

`requireReauthentication()` records the durable demand, then waits for
`observedPurge()`, and only after that await sets `signedOut`. The purge waits
for pinned `signOut()`, whose network legs have no application timeout. This is
the inverse of the candidate's outstanding-at-bootstrap branch, which correctly
sets `signedOut` before awaiting the same purge.

The probe started from a genuinely signed-in provider, refused the next rotated
session write, allowed `signOut()`'s internal refresh write to succeed, and held
the subsequent local logout fetch pending. At that point the durable demand
still existed, so the M14 clear-on-success defect was absent, but the provider
state remained `signedIn`. Releasing logout allowed read-back to prove empty and
then changed the state to `signedOut`.

The candidate therefore records the failure durably while continuing to expose
the affected session as usable for an unbounded interval. A durable promise to
act later is not the required forced re-authentication now. Existing provider
tests use purges that settle and do not construct this state-exposure interval.

### 3. MEDIUM — the explicit storage key strands the Unit D namespace and changes web

**Class:** FAIL introduced by this work; compatibility/session correctness;
verdict-driving under required probes 5 and 6; **MUST CLOSE**.
**Invariant:** R1 across the dispatched Unit D → Unit E transition; web
unchanged while ADR-008 native-only surfacing remains preserved.
**Probes:** independent pinned-client old-key/rollback probe and pinned-client
fake-localStorage web probe.
**Files:** `src/lib/auth/session-storage.ts:9-27,235-257`;
`src/lib/supabase.ts:35-37`.

The current client and `confirmSessionPurged()` agree on
`zc-auth-session`, but neither enumerates the old derived space, represented
by `sb-legacy-unit-d-auth-token` for the injected test-project URL. The current build consequently does not
expose the old session: that part fails safe. It also lets the observed purge
return true while the old material remains, and a client configured like Unit
D recovers it as a valid session. A rollback therefore makes the surviving
material usable after Unit E's demand has been declared cleared.

The “no installed base” assertion bounds present operational exposure; it does
not make the required transition probe pass. It is also broader than the
evidence can establish: no live device was checked. If the transition is truly
excluded, that requires a controller scope ruling rather than an application
comment declaring the old space empty of users.

The storage backend on web remains the pinned client's `localStorage`, and no
native persistence-failure observer is introduced there, so ADR-008's
native-only surfacing boundary passes. The explicit `storageKey` is nevertheless
platform-wide. The pinned-client web probe read and wrote only the new key and
left the old key untouched. The namespace changed; “web unchanged” does not
survive the probe.

### 4. MEDIUM — the builder edited a controller-owned governance record

**Class:** FAIL introduced by this work; governance; **MUST RECONCILE**.
**Probe:** exact Git-object diff and authorship audit.
**Files:** `docs/01-state/BRANCH-NOTES.md:119-146`; `AGENTS.md:83-85`.
**Commit:** `7705a969`.

The builder added the 19-line “Build closing note” under the LOCK. The LOCK
itself says status transitions remain controller-owned and the builder reports
through HANDOFF. `AGENTS.md` permits builders to update only the Active work row
and their HANDOFF block. This is a hard session-protocol violation, not an
adjacent style preference. The reviewer does not delete or rewrite it; the
controller owns reconciliation.

The rest of the governed touch-set passes: PROJECT-STATE changes only its Active
work row; the HANDOFF is a top insertion whose prior suffix is byte-identical;
the ruling-6 disclosure names one workflow and 3 + 14 subagents; and no ADR or
prior review was edited.

### 5. MEDIUM — evidence claims exceed their instruments, and the scope producer can false-green

**Class:** FAIL introduced in evidence; **MUST NARROW / SUBTRACT** under the
stop rule; not a separate product defect.
**Probes:** failed-`git diff` negative control, exact-address reviewer probe,
base/head probe control-flow audit, and direct Git-object comparisons.
**Files:** `docs/05-quality/evidence/006a-session-durability/capture.sh`;
`docs/05-quality/evidence/006a-session-durability/README.md:55-85,90-117`;
`src/__tests__/secure-store-adapter.test.ts:1302-1315`.

The strongest defect is executable. A fake `git` returned exit 77 for every
`git diff`. `capture.sh` still exited 0 and emitted “paths in range: 0” and
“added non-docs lines in range: 0.” Its synthetic regex controls all matched
because they test pattern recognition, not producer success. README's
“fails closed on any gate, scan, or control failure” and claim 22's instrument
credit are false. The protected database, workflow, and generated-type range is
unchanged only because this review re-established it directly from Git objects.

Other required subtractions are narrower:

- Claim 2's committed test proves 513 reads and no writes, but not the exact
  unique address set. The candidate mechanism passes because the reviewer probe
  asserted the ordered set; the committed instrument attribution overclaims.
- Claim 1 says the base probe observes every named base fact. The base run exits
  at its first R1 assertion before the later demand/restart assertions. It is a
  valid RED control, but not proof of every later base statement.
- M14 is genuinely build-valid and sensitive, but its selected test is a generic
  later successful write, not the real `signOut()` internal-refresh/pending-purge
  schedule. The reviewer probe established the fixed fact and also found
  finding 2.
- Claims 23 and 24 are bounded literal scanners. Aliased/computed auth calls and
  a user-visible gated name assembled across tokens survive; claim 24's zero
  name scan has no positive control. State only the literal patterns measured.
- The dependency delta is true by direct object comparison, but `deps.txt`
  prints the direct dependency and does not prove the lockfile package-key set
  stayed identical.
- Capture checks base ancestry, not exact candidate SHA or clean-tree state;
  stability records no candidate SHA. The fresh review rerun restores confidence
  at `caa31ee2` but does not make the committed artifacts self-binding.

The stop rule applies: delete universal wording or narrow it to the measured
artifact. Adding another scanner would repeat the class of error.

### 6. LOW — the Unit E HANDOFF misstates the commit and touch counts

**Class:** FAIL introduced in records; governance bookkeeping; **CORRECTED by
the companion HANDOFF top insert**.
**Probe:** exact `git log` and `git diff --shortstat` over the dispatched range.
**File:** `caa31ee2:docs/01-state/HANDOFF.md:13-17,154-162` (the reviewed
builder object).

The block says four commits, 32 files, and `+4129/-514`. The exact builder range
contains five commits, 35 files, and `+4331/-515`. The controller transition
records the correct figures. The old block is append-only and was not edited in
place. The companion REVIEW-023 HANDOFF top insert records the correct boundary
and supersedes this bookkeeping defect.

## R1 detail — what does pass

`confirmRemoved()` is a read-only member of the serialized adapter. To return
true, it reads the base index and all 256 addresses in each of two generations.
A refused read or present value returns false; no absence is inferred from a
delete call or from `signOut()` resolution. The provider catches `signOut()`
only to proceed to this read-back, and clears the demand only on a true result.

The exact-address probe observed 513 ordered, unique reads and no writes. With a
stranded value at generation 1, chunk 255, the result was false. The committed
finding-3 probe separately proves that an upstream `signOut()` rejection with a
populated current key is no longer classified as purged. That is a substantive
closure of REVIEW-022's false-inference mechanism for the new key.

## R2 detail — what does pass

- The demand record's asserted wire shape is exactly `{v, reason, at}` and
  contains no session, access token, refresh token, or credential material.
- Native demand storage is selected through `expo-file-system`, a different
  facility from the SecureStore/keychain adapter. The actual native failure
  domains and persistence behavior are NOT RUN offline.
- When the demand store answers, a record is written before the refused
  session-key write resolves. A fresh handle over the same backend sees it.
- At first active bootstrap, an outstanding demand sets the provider to
  `signedOut`, attempts the observed purge before the provider's own
  `getSession()`, and does not start bootstrap while the demand remains.
- A demand-store read refusal is treated as outstanding, not as absence.
- M14 proves a later successful write no longer clears the demand; only proven
  read-back does.

These facts are necessary and real. Findings 1 and 2 show why they are not
sufficient for the unqualified R2 guarantee.

## Double-refusal disposition

The builder's Known limit 11 was explicitly source-read speculation. It did not
survive either directed probe at this candidate. The provider schedule completed
the full 513-delete attempt, retained its demand, reached `signedOut`, and
recovered on restart. The direct concurrency schedule returned two fulfilled
settlements within one second. No durability or availability defect is credited
from those results.

This is not proof that no auth-js schedule can strand a Deferred. It is the
correct evidence classification: the named candidate schedule is **NOT
REPRODUCED**, and the broader universal remains **UNVERIFIED**, not an accepted
source-derived mechanism fact.

## Evidence and quality execution

| Check | Classification | Result |
|---|---|---|
| Finding-3 probe, base/head | **PASS at its actual control-flow boundary** | runner exit 0; base test exit 1, head test exit 0 |
| Mutation battery | **PASS** | 14/14 sensitive, 0 build-invalid, all typechecked, tree restored |
| Typecheck | **PASS** | `npm run typecheck`, exit 0 |
| Lint | **PASS** | `npm run lint`, exit 0 |
| Unit tests | **PASS** | 10 suites, 159 tests, exit 0 |
| Format check | **PASS** | exit 0 |
| Fresh capture fixed point | **PASS at reviewer-pinned head** | 8/8 gated artifacts pair-identical and matching committed copies |
| Capture false-green resistance | **FAIL introduced** | `git diff` producer exit 77 was suppressed; capture exit 0 |
| GitHub CI | **PASS at overlay `501c1635`** | PR #17 check `typecheck, lint, test` succeeded |
| Current npm audit | **NOT RUN** | registry lookup failed with sandbox DNS `ENOTFOUND`; committed 19-advisory output is historical/run-varying and not credited as current |
| Live Supabase behavior | **NOT RUN by dispatch** | no endpoint or credential used |
| Physical process restart and real demand file | **NOT RUN by dispatch / Unit F** | Jest reset module state over persistent fake stores only |
| Locked-device behavior | **NOT RUN by ADR-009** | Phase B exit gate remains |
| Real browser integration | **NOT RUN** | web key behavior was measured against pinned client with fake localStorage, not a browser |

## Governance and scope verification

**PASS by direct Git-object verification, independently of `capture.sh`:**

- `supabase/` is object-identical to base at
  `2b13461b9abd40f1c00afd316e3321d0931ef2fc`.
- `.github/` is object-identical at
  `173fa30fae4f5f83a35a88ef29914fbf8016c39a`.
- `src/lib/database.types.ts` is the same blob,
  `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc`.
- `app.json` is object-identical, so `expo.scheme` is unchanged.
- No added application/source string presents the gated internal name to a
  user. Existing slug, package, scheme, and comments remain internal.
- The only direct dependency added is `expo-file-system ~57.0.5`; the lockfile
  package-key set is identical to base and only that package's resolution moves
  from 57.0.4 to 57.0.5.
- No migration, RLS policy, database function, grant, storage-bucket policy,
  payment, purchase, entitlement, billing-webhook, secret, or outward-facing
  deployment change exists in the candidate range.

The unchanged database, workflow, generated-type, and excluded product
boundaries are Git-object facts. The capture oracle defect in finding 5 limits
the instrument, not those independently verified ranges. The dispatched client
authentication changes remain RED-lane work and are the subject of this review.

## Final classifications

**PASS:** new-key full read-back; upstream-rejection classification; secretless
demand shape; ordinary demand-record-first behavior; outstanding-bootstrap
ordering; read-refusal-as-outstanding; M14; exact gates; exact mutation run;
protected-object boundary; direct dependency scope; ruling-6 disclosure.

**FAIL pre-existing, not closed:** durable re-authentication when both stores
refuse; zero unhandled rejections on that refused-write path; immediate
provider refusal to expose the affected session while flag-driven purge is
pending.

**FAIL introduced by this work:** old-key/rollback compatibility; web storage
namespace change against the “unchanged” probe; unauthorized BRANCH-NOTES edit;
false-green/overbroad evidence claims. The builder's inaccurate HANDOFF counts
are corrected by this review's companion top insert without editing the old
block.

**NOT RUN:** live Supabase, real credentials, real OS restart, actual native
demand-file behavior, locked-device behavior, and real-browser integration.

## Conclusion

REVIEW-022 finding 3 remains open. Unit E proves a strong new-key read-back and
a durable ordinary-case demand, but the governing question is conjunctive. A
refusal by the demand store loses the record, re-enters the unhandled pinned
path, and exposes the residual on restart; a pending flag-driven purge leaves
the provider signed in; and the storage-key transition does not clear Unit D's
namespace.

No product code, ADR, LOCK status, BRANCH-NOTES content, or prior review was
changed by this review. Governance writes were limited to this immutable record
and the required HANDOFF top insert, which supersedes the builder's inaccurate
counts. The LOCK status line remains untouched.
