# REVIEW-024 — Unit E session durability, fix cycle 1

**Date:** 2026-08-26
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the harness does not expose model or effort metadata, so those two
attributes cannot be independently confirmed
**Code target:** `feat/session-durability` fix-cycle-1 head
`5f6d2e6ca873ff3b45d9d9a6e52d42bdebed30bd`
**Review overlay:** `36321d31e1258a6dacf24a56b35c7a0aeb8a3337` — controller LOCK transition only
**Prior reviewed candidate:** `caa31ee2ff77331d7ab976bff5bb7bb4588244c9`
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Pull request:** #17; draft; exact-candidate CI passed
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** The fix closes the exact double-refusal and pending-logout schedules
from REVIEW-023, and all seven committed schedules turn from RED at
`caa31ee2` to GREEN at `5f6d2e6`. R3 is satisfied in every refused-write
schedule this review ran: zero unhandled rejections. Ruling 25's
every-medium-refuses-then-death case remains a Known limit, not a finding, and
ruling 26 removes the old-key sweep and web namespace change from the verdict.

The broader cycle-1 invariant is not closed. Three independent results are
dispositive:

1. A demand-file read that throws while `File.exists` reports false is still
   converted to absence. A restart then loads and exposes the residual session.
   Consequence B expressly says every read error is outstanding and an
   `exists` boolean is never the sole gate.
2. Fresh-sign-in resolution can create a new persistence demand during its
   follow-up `getSession()` and still publish that unpersisted session through
   an ungated promise path. The listener correctly drops the auth event, but
   the promise independently sets `signedIn` while the new demand is durable.
3. The committed binding and stability records describe `74024465`, not the
   formal candidate. Fresh captures at `5f6d2e6` are mutually stable, but
   `red-lane.txt` necessarily changes when the evidence and HANDOFF commits
   enter the measured range. The committed fixed-point claim fails its own
   stability producer at the reviewed head.

Findings 1 and 2 are **MUST CLOSE**. Finding 3 is **MUST NARROW / REGENERATE AT
THE ACTUAL FIXED POINT**. Two fix cycles remain. The stop rule applies to the
recurring state-publication and evidence-overclaim classes: closure needs a
single enforced boundary and claims limited to the artifact actually measured,
not another list of selected green schedules.

## Requirement and addendum matrix

| Requirement | Result at `5f6d2e6` | Disposition |
|---|---|---|
| R1 — purge success observed by full read-back | **PASS** | The current session namespace is read back over its exact 513-address enumerable space; upstream `signOut()` rejection is not treated as proof. Ruling 26 excludes the Unit D key sweep and accepts the web namespace change. |
| R2 — durable demand, consulted before usable bootstrap | **FAIL / partial** | Double refusal, memory hold, retry, ordinary read refusal, and bootstrap ordering pass. A thrown read plus `exists === false` is still treated as no demand and exposes the residual. |
| R3 — zero unhandled rejections on every refused-write path | **PASS at every required and adversarial schedule run** | The exact double-refusal schedule produced zero unhandled rejections; the held record retried before the next write and on foreground/purge opportunity without re-entering auth-js's throw-and-reject path. |
| Addendum A — listener gates session publication | **PASS at the literal listener callbacks; overarching invariant OPEN** | The demand and unconsumed-refusal gates close A2/A3 and the pending-logout event. Other state publishers bypass that listener gate. |
| Addendum B — consult by read; every read error outstanding | **FAIL** | `textSync()` error plus `exists === false` returns `null`. The `exists` boolean remains decisive after the read error. |
| Addendum C — verified fresh sign-in resolves without stale purge destruction | **FAIL / partial** | Ordinary B2 and the clear-refusal edge pass. A follow-up refresh whose persist is refused creates a new demand, yet bootstrap publishes the returned session as `signedIn`. |

## REVIEW-023 disposition

| REVIEW-023 item | REVIEW-024 disposition |
|---|---|
| Finding 1 — double refusal loses durability and re-enters unhandled Deferreds | **CLOSED under ruling 25.** Exact schedule: process 1 `signedOut`, zero unhandled; demand medium recovers, held record lands; restart honours it and clears only after read-back proof. |
| Finding 2 — pending purge continues exposing `signedIn` | **OPEN at the governing no-exposure invariant.** The exact pending-logout schedule is closed, but the same exposure class recurs through ungated promise/state paths during fresh-sign-in resolution. |
| Finding 3 — old key and web namespace | **CLOSED BY RULING 26 / HONOURED.** Named world-asserting comments were removed, the ruling is cited, no sweep was built, web keeps localStorage and gains no observer. |
| Finding 4 — builder edited controller-owned `BRANCH-NOTES.md` | **HONOURED / CONTROLLER-RECONCILED.** The builder changed zero bytes in this cycle; the controller annotation remains authoritative. |
| Finding 5 — evidence claims exceed instruments | **OPEN.** Producer-exit, dependency-set, exact-address, and subtraction remediations pass, but the exact-head/fixed-point claims are false at the formal candidate and semantic claims 9–10 exceed the schedules. |
| Finding 6 — inaccurate commit/touch counts | **CLOSED / HONOURED.** The corrected original range remains exact, and this cycle's four commit deltas are exact. |

## Review boundary and preflight

- The required preflight ran before product analysis: fetch; checkout
  `36321d31e1258a6dacf24a56b35c7a0aeb8a3337`; then
  `git diff --stat 5f6d2e6c..HEAD`. The diff names only
  `docs/01-state/BRANCH-NOTES.md`, 18 changed lines (`+17/-1`).
- At that control checkout, the `feat/session-durability` LOCK reads
  `Status: REVIEW` and says “cycle-1 review, REVIEW-024.” It names the
  dispatched reviewer seat. The LOCK status line was not edited.
- `AGENTS.md` was 5378 bytes with SHA-256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`
  before it was trusted.
- Product and evidence probes ran at the exact detached candidate
  `5f6d2e6ca873ff3b45d9d9a6e52d42bdebed30bd`. The base and prior candidate
  are ancestors. The candidate tree was clean before and after the runs.
- The full base-to-candidate range contains 13 commits, 61 files,
  `+11168/-514`; `git diff --check` is clean. This cycle's builder commits on
  `0de2e406` are exactly: `f66c451` (8 files, `+463/-78`), `7402446`
  (5 files, `+374/-19`), `7d2229b` (23 files, `+3937/-0`), and `5f6d2e6`
  (3 files, `+254/-1`).
- Owner rulings 25 and 26 are applied from the dispatch's governing wording.
  `origin/main` was still `7caf23e1` during review, so this record does not
  misdescribe the separate controller state commit carrying those rulings as
  already merged on main.
- Three supplementary subagents covered runtime schedules, evidence, and
  governance. The reviewer of record inspected the instruments, reran every
  verdict-driving command, and made every classification. No orchestrated
  workflow was invoked; the local Noema governance review procedure, Supabase
  safety skill, and docs-guard final pass were used.
- Runtime probes executed the installed
  `@supabase/auth-js@2.112.3`/`@supabase/supabase-js@2.112.3` composition
  through the app's own provider, storage observer, adapter, and demand module.
  Only fake SecureStore, File, and fetch boundaries were substituted. No live
  Supabase request, credential, or secret was used.

## Directed probe results

The independent schedule suite source had SHA-256
`d62cacb3e6e6de29c2a6e26c979bc428e431a93bf2f57162387fbff9a733e518`.
It was disposable and was not added to the repository because the review
dispatch authorizes exactly two tracked files.

| Probe | Fresh result | Classification |
|---|---|---|
| Builder seven-schedule runner, both trees | `caa31ee2`: 7/7 RED, Jest exit 1. `5f6d2e6`: 7/7 GREEN, Jest exit 0. Runner exit 0. | **PASS at the seven exact schedules.** Non-vacuous two-tree control reproduced. |
| REVIEW-023 double refusal | Process 1 `signedOut`, zero unhandled, no durable record while every medium refused; demand-store recovery landed the held record before death; restart exposed no session and cleared after read-back. | **PASS R2/R3 under ruling 25.** |
| Ruling-25 death-before-recovery | Process 1 `signedOut`, zero unhandled; restart after death exposed the residual because no medium ever accepted a record. | **Known limit, not a finding.** Server-side bound remains Unit F / NOT RUN here. |
| Pending logout; A2; A3 | State changed to `signedOut` before the logout await; demand persisted; listener dropped TOKEN_REFRESHED and refused-persist sign-in events. | **PASS at the named listener schedules.** |
| Consequence B, read throws + `exists=false` | Restart read was attempted; code returned absence; history included `signedIn` and the residual key space remained populated. | **FAIL.** Required synthetic combination reached the residual-exposure consequence. |
| Consequence B control, read throws + `exists=true` | State remained `signedOut`, history never included `signedIn`, and purge removed the residual. | **PASS control.** The result isolates the boolean branch. |
| Ordinary B2 fresh sign-in | Persisted/read-back sign-in resolved the old demand, exposed the fresh session, and no later stale purge destroyed it. | **PASS at the committed schedule.** |
| Fresh-sign-in bootstrap follow-up refresh refusal | Initial fresh session persisted and read back; its near-expiry bootstrap refresh was refused. A new demand existed and unhandled count was zero, but provider state was `signedIn`. | **FAIL no-exposure / consequence C.** Listener gating did not gate the promise result. |
| Mid-process resolver reread follow-up refusal | The schedule failed before its final state assertions, at its expected demand-clear operation. | **No separate result credited.** The bootstrap form above independently establishes the verdict. |
| Event after keychain refusal but before `demand.record()` settles | An injected concurrent TOKEN_REFRESHED produced history `[bootstrapping, signedOut, signedIn]` before the synchronous flag was installed. | **PARTIAL lead.** The app-level window exists; same-operation reachability in the pinned client was not established and is not needed for the verdict. |
| Clear refusal after verified resolution | Current process kept the verified fresh sign-in without an in-process purge; durable stale record survived; next restart performed exactly one conservative re-authentication, with no prior `signedIn` exposure. | **PASS as Known limit 4's measured bound.** |
| Held-demand next-write/foreground/purge retry | Durable demand write occurred before the recovered session write; foreground/purge retry landed it; zero unhandled. | **PASS.** |

## Findings

### 1. HIGH — a thrown demand read plus `exists === false` is still treated as absence

**Class:** FAIL pre-existing and not closed; durability/session exposure;
verdict-driving; **MUST CLOSE**.
**Invariant:** cycle-1 consequence B and ADR-009 R2.
**Probe:** independent real-client restart with a fake File backend whose record
is present, whose read throws, and whose `exists` getter reports false; plus the
same schedule with `exists === true` as the control.
**Files:** `src/lib/auth/reauth-demand.ts:165-186`;
`docs/05-quality/evidence/006b-session-durability-fix1/README.md:85-91,132`.

The candidate correctly attempts `textSync()` before consulting `exists`.
After that read throws, however, line 184 returns `null` solely because
`file.exists` is false. That is still the boolean acting as the absence gate;
the order of the two operations does not change the classification.

The independent restart retained both a durable demand record and the prior
session in the fake media. With read refusal plus the false `exists` answer,
the provider treated the demand as absent, bootstrapped, and exposed
`signedIn`; the residual key space remained populated. With the identical read
refusal and `exists === true`, the provider treated the consult as outstanding,
never exposed `signedIn`, and purged before bootstrap. The control isolates the
one branch at lines 183–185.

Whether the installed native File implementation can produce this combined
answer remains **NOT RUN** offline. That limits a claim about device
reachability; it does not make the explicitly required adversarial schedule
pass. The dispatch says any read error is outstanding and an `exists` boolean
is never the sole gate. README claim 9 and its supersession wording therefore
overclaim closure.

### 2. HIGH — fresh-sign-in resolution can publish a session after its follow-up persist was refused

**Class:** FAIL pre-existing / in-class recurrence, not closed;
authentication lifecycle and session exposure; verdict-driving;
**MUST CLOSE**.
**Invariant:** the addendum's “no path exposes a session while a demand is
outstanding” rule and consequence C.
**Probe:** independent real pinned-client fresh-sign-in bootstrap schedule;
supplementary mid-process reread and event-before-record schedules.
**Files:** `src/lib/auth/auth-provider.tsx:173-219,308-367`;
`src/lib/auth/session-storage.ts:166-183`;
`docs/05-quality/evidence/006b-session-durability-fix1/README.md:124-134`.

In the verdict-driving schedule an old outstanding demand first held the
provider signed out. The user then completed a fresh OTP sign-in. Its session
persisted and read back, so lines 335–354 legitimately cleared the old demand
and started the previously deferred bootstrap. The fake auth server gave the
fresh session a 60-second life, and the pinned client immediately refreshed it
during bootstrap. Only that follow-up persist was refused.

The observer did the parts the fix claims: it absorbed the refusal, wrote a new
durable demand, set the in-process flag, and produced zero unhandled
rejections. The listener at lines 180–205 also dropped TOKEN_REFRESHED. But
the same `getSession()` promise independently ran
`resolveOnce(stateForSession(data.session))` at lines 211–218, with no demand
or refusal check after the await. The provider ended `signedIn` while the new
demand existed. A listener-only gate is not a state-publication barrier.

Post-probe source inspection locates the same unchecked shape in the
mid-process resolution branch at lines 359–363: direct `getSession()` followed
by `setState()` without rechecking the demand or flag. Its supplementary
schedule did not reach final-state assertions, so no second behavioral result
is credited from that branch. An injected event-before-record schedule also
demonstrates a narrower window:
`session-storage.ts` installs the synchronous flag only after awaiting
`demand.record()`, so a concurrent listener event in that interval is not
gated. Same-operation pinned-client reachability for that injected ordering is
**UNVERIFIED** and is not credited as an additional defect; the real-client
bootstrap schedule already proves the invariant false.

REVIEW-023 finding 2's exact pending-logout schedule is closed, as are A2 and
A3. This is still an in-class recurrence of the governing exposure defect, so
the stop rule applies. Enumerating another publisher in another test is not a
durable closure; the state transition needs one enforced post-await demand
boundary.

### 3. MEDIUM — 006b is not bound or byte-stable at the formal candidate

**Class:** FAIL introduced in evidence; exact-head reproducibility and claim
calibration; verdict-driving as REVIEW-023 finding 5; **MUST NARROW / REGENERATE
AT THE ACTUAL FIXED POINT**.
**Probe:** two fresh candidate captures, the committed `stability.sh`, direct
artifact comparison, and README subtraction audit.
**Files:**
`docs/05-quality/evidence/006b-session-durability-fix1/binding.txt`;
`docs/05-quality/evidence/006b-session-durability-fix1/stability.txt`;
`docs/05-quality/evidence/006b-session-durability-fix1/red-lane.txt`;
`docs/05-quality/evidence/006b-session-durability-fix1/README.md:20-98,120-149`.

Committed `binding.txt` and `stability.txt` both name
`74024465e2f13f3ca93f4a779de07a9ea3b8f6e3`, the code commit before the
evidence pack and final HANDOFF entered the range. The formal reviewed
candidate is `5f6d2e6`. Two fresh captures there both exited 0 and were
mutually byte-identical. Seven of eight gated artifacts matched the committed
copies; `red-lane.txt` did not:

- committed at `74024465`: 37 paths in the base range, 24 under `docs/`;
- fresh at `5f6d2e6`: 61 paths in the base range, 48 under `docs/`.

Running the committed stability producer at the candidate exited 1 with one
failing comparison: the two fresh `red-lane.txt` copies were identical to each
other but differed from the committed file. That is the correct outcome. The
measured range changed after capture, so README claim 20's committed fixed
point and claim 21's exact-candidate binding are false as written.

The remediation is otherwise material and passes: every `git` producer exit
is checked; the exit-77 control makes capture exit 1; `deps.txt` proves
1131/1131 package keys with no additions/removals; the exact-address and
literal-scan claims are narrowed; and 006a is byte-identical. But claims 9 and
10 now replace earlier overclaims with the semantic overclaims established by
findings 1 and 2. The supersession section also misattributes the old failed
capture assertion to “Claim 22”; actual 006a claim 22 was the RED-lane claim,
while the fail-closed producer sentence was unnumbered prose.

The stop rule applies. Regenerating the existing range artifact at the actual
candidate fixed point, or narrowing the claim to the pre-evidence code head it
measures, is the relevant choice. Another scanner does not cure the boundary.

## Passing checks and evidence classifications

| Check | Classification | Fresh result |
|---|---|---|
| Seven-schedule base/head runner | **PASS at exact schedules** | prior candidate 7/7 RED; fix candidate 7/7 GREEN; runner 0 |
| Mutation battery | **PASS as execution fact** | 25/25 SENSITIVE; all 25 typechecked; 0 build-invalid; four mutated sources restored byte-identically |
| Typecheck | **PASS** | `npm run typecheck`, exit 0 after the independent schedules |
| Four capture gates | **PASS at candidate** | typecheck, lint, test, format check all 0; 10 suites / 180 tests |
| Exit-77 producer control | **PASS** | wrapper diff 77, rev-parse 0, wrapped capture 1, control runner 0 |
| Dependency object proof | **PASS** | 1131/1131 keys; added `[]`; removed `[]`; only root and `node_modules/expo-file-system` entries changed |
| 006a immutability | **PASS** | same tree `be85ba58558cd167f72ca88572f1aa687d4e7c15` at `caa31ee2` and `5f6d2e6` |
| Fresh 006b pair stability | **PASS between fresh candidate runs** | 8/8 pair-identical plus binding |
| Fresh versus committed 006b fixed point | **FAIL** | `stability.sh` exit 1; committed `red-lane.txt` differs |
| GitHub CI | **PASS at exact candidate** | run 32973184321, `head_sha=5f6d2e6…`, job `typecheck, lint, test`, success |
| Live Supabase | **NOT RUN by dispatch** | no endpoint, project, credential, or live auth server used |
| Physical OS restart / real File backend / locked device | **NOT RUN** | Jest module resets over persistent fakes; real native failure semantics remain Unit F |
| Real browser integration | **NOT RUN** | no browser; ruling 26 governs the accepted web boundary |

## Governance and scope verification

**PASS by direct Git-object verification:**

- `git log 27f5d8d6..5f6d2e6c -- docs/01-state/BRANCH-NOTES.md` is empty, and
  the file is the same blob at both commits. Finding 4 is honoured. The review
  overlay alone changes the controller record and leaves product code
  identical to the candidate.
- No cycle commit changes `supabase/`, `.github/`, generated database types,
  `app.json`, package manifests, ADRs, prior reviews, or `BRANCH-NOTES.md`.
  `app.json` is object-identical to base; `expo.scheme` remains `"noema"`.
  No added user-visible `noema` string was found.
- The original builder range remains exactly five commits, 35 files,
  `+4331/-515`. The cycle's four per-commit file and line counts match the
  HANDOFF. The builder's ruling-6 disclosure says no workflow and no subagent.
- The stale review-worktree registration removal has no committed repo-tree
  effect. Whether that removed worktree held uncommitted data is
  **UNVERIFIABLE FROM GIT OBJECTS**; this record does not promote the builder's
  historical assertion to a verified fact.
- No migration, RLS policy, authorization rule, payment path, secret,
  production project, deployment, or outward-facing system was touched or
  queried. The client-auth changes are the authorized review subject.

## Adjacent findings — reported, not acted on

- `src/lib/auth/secure-store-adapter.ts:353-363` asserts that the code has
  never run on a device and that its installed base is empty. **Ruling: LOW
  pre-existing FOLLOW-UP / SHOULD DELETE, non-verdict-driving; not ACCEPT.** It
  is the same world-assertion class ruling 26 removes from application code,
  but it predates this cycle and lies outside REVIEW-023 finding 3's named
  touch-set.
- The user-facing `signOut` action can report a refused removal without its own
  read-back; the residual is covered by the demand machinery only when a write
  refusal preceded it. This remains an adjacent report, not independently
  promoted into the verdict and not acted on.
- A refused demand clear after verified fresh-sign-in resolution leaves the
  stale durable record for the next restart. The independent C-edge schedule
  confirms the disclosed bound in that schedule: one conservative
  re-authentication on the next restart, no in-process purge, and no prior
  restart exposure. **ACCEPT as the recorded Known limit at this measured
  boundary.**

## Conclusion

REVIEW-023 findings 1, 3, 4, and 6 are closed or honoured. Finding 2 remains
open at its governing no-exposure invariant despite closure of its exact prior
schedule. Finding 5 remains open because the committed evidence is not bound
or stable at the formal candidate. R1 and R3 pass; R2 and addendum consequences
B/C do not.

No product code, ADR, LOCK status, BRANCH-NOTES content, prior review, evidence
artifact, migration, or outward-facing system was changed by this review.
Governance writes are limited to this immutable record and the required
HANDOFF top insert. The LOCK status line remains `Status: REVIEW` and is
untouched.
