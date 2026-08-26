# Noema — BRANCH-NOTES

**The authoritative lock record.** Every unit of work gets a LOCK block here
before it starts. A branch whose LOCK block reads `Status: BUILD` is owned — do
not start work on it. Linear mirrors this file; where the two disagree, this file
wins.

Append new blocks at the top. Do not delete a block when work finishes — change
its `Status` line to `MERGED` or `ABANDONED` and leave the record in place.

## LOCK block format

Copy this shape exactly. Every field is required; write `—` rather than omitting
a line.

```
## LOCK — <branch>
Project:            <project name>
Branch:             <branch name>
Controller:         <the dispatching controller>
Builder:            <the single agent that owns this branch>
Model+Effort:       <model / effort level / session policy>
Reviewer of record: <the reviewer, named before review begins; never the builder>
Status:             BUILD | REVIEW | MERGED | ABANDONED
Dispatch:           <one line — what this unit is authorized to do>
Evidence:           <path under docs/05-quality/evidence/, or "pending">
```

One builder per branch, ever. An issued dispatch authorizes commits on its own
feature branch and nothing more.

---

**Superseding note (CTRL-004 close-out, 2026-08-23).** The Phase B note in
this file's Unit C LOCK describes the anon evidence as "11/11" denials. The
accurate figure, established by fix cycle 5 and unchanged since, is **9
denial/invisibility probes plus 2 service-context probes = 11 PASS**. The
historical sentence is left in place per supersede-never-delete; this note
governs. Controller-owned throughout: the builder was instructed not to touch
it (REVIEW-013 finding 4, REVIEW-015 finding 3).

---

## LOCK — chore/state-ctrl-006-opening

```
Project:            Noema
Branch:             chore/state-ctrl-006-opening
Controller:         CTRL-006 Auth Phase B and session durability
Builder:            Controller (direct state edit through the Composio GitHub
                    connection and the Git Data API, after proving byte
                    identity of both base files against their blob SHAs; no
                    product code — controller-only class per AGENTS.md state
                    ownership)
Model+Effort:       Fable 5 / Max / same session — the controller seat
                    returned to Fable 5 at this session per ruling 22, as the
                    owner set it. No session can verify its own effort tier
                    from inside; this line records the dispatched setting.
Reviewer of record: none (controller-only state edits)
Status:             BUILD
Dispatch:           CTRL-006 opening state commit. Reconcile the
                    ctrl-005-closeout LOCK to MERGED (PR #15, b95913e1) —
                    first act per learning 5. Rebaseline PROJECT-STATE's
                    verification header and Current state, both left stale by
                    the CTRL-005 close-out. Register the Unit E LOCK
                    (feat/session-durability) with both reviewers named,
                    record rulings 23–24 (staging auth posture; test
                    identities and code relay), open the CTRL-006 governance
                    ledger, and mark CTRL-006 active. On a branch; owner
                    merges; the merge ratifies the rulings recorded here.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** This block reads `BUILD` after the owner merges until the next
controller state commit reconciles it.

---

## LOCK — feat/session-durability

```
Project:            Noema
Branch:             feat/session-durability
Controller:         CTRL-006 Auth Phase B and session durability
Builder:            Claude Code
Model+Effort:       Fable 5 / Ultracode (xhigh + workflows) / fresh session
                    (fix cycles: Fable 5 / Max per ruling 5, fresh session).
                    Ruling 22 restores the Fable 5 seat; the Opus 5
                    substitution recorded on Unit D does not carry forward.
Reviewer of record: Codex Sol / Ultra / fresh session — named here, ahead of
                    review, per ruling 4 and the REVIEW-020 stop.
Advisory reviewer:  DeepSeek V4 Pro / fresh session — the ADR-001 auth trigger
                    (client auth surface, RED on arrival); the controller's
                    pick of the single seat. Scope: the durability mechanism
                    only, established by probe against the pinned package,
                    not by reading it (learning 20). Advisory carries no merge
                    authority; the controller adjudicates against the RoR
                    record.
Status:             BUILD
Dispatch:           Unit E — Session durability: close REVIEW-022 finding 3 to
                    ADR-009's three review-gated requirements — purge success
                    observed by read-back, never inferred from the absence of
                    a rejection; a re-authentication demand durable across
                    process restart, consulted at bootstrap before any
                    session load; rejected refresh Deferreds on this path
                    handled, not left unhandled. The durable marker must not
                    live in the store whose refusal it records and must
                    contain no secret. One new dependency permitted if the
                    marker needs a non-keychain store, named and justified in
                    the HANDOFF. Offline: no live Supabase call, no
                    credential. The database auth surface stays frozen at
                    Unit C's merged state. Three-cycle fix budget; the stop
                    rule applies from the start. Per ruling 21 this is the
                    last chance to close finding 3 — if it does not close
                    here, it ships as a Known Issue and Unit D is finished.
Evidence:           docs/05-quality/evidence/006a-session-durability/
```

Registered by the controller in the CTRL-006 opening state commit, ahead of
the builder session. `BUILD` marks the branch owned from the moment this
merges; the dispatch text is delivered to the builder separately, after the
merge, naming the post-merge tip (learning 13). Status transitions on this
branch are controller-owned throughout: the controller flips `BUILD` →
`REVIEW` when it names the review and `MERGED` after the owner merges; the
builder leaves the line untouched and reports it in the HANDOFF — the
REVIEW-019 practice, adopted so no reviewer stops on an unreconciled block.

**Build closing note (2026-08-26, builder).** Build complete and pushed;
`Status` left at `BUILD` per the paragraph above. All three ADR-009
requirements closed with committed instruments: purge success proven by
full key-space read-back (the purge-failure flag and its false inference
deleted, the encoding test replaced); the re-authentication demand durable
in an expo-file-system record consulted before any session exposure, with
the observed purge ordered before the provider's own `getSession()`;
refused session writes recorded (demand first, observer second) and
absorbed, with a fail-closed rethrow when the demand store also refuses.
The committed finding-3 probe is RED at base `7caf23e1` and GREEN at the
head, including a restart schedule; mutation battery 14/14 SENSITIVE with
0 build-invalid; stability 8/8; gates 4/4 (10 suites, 159 tests); RED lane
clean with positive controls. One dependency: expo-file-system ~57.0.5
(already SDK-pinned in the tree via `expo`). One pre-handoff adversarial
workflow (17 subagents) found a real HIGH — the clear-on-success path could
erase a purge-pending demand mid-purge — fixed by subtraction before
handoff; full adjudication in the HANDOFF block. Evidence:
`docs/05-quality/evidence/006a-session-durability/`. `ci.txt` follows
post-push, bound to the pushed SHA.

**Phase transition BUILD -> REVIEW, 2026-08-26, CTRL-006.** Builder head
verified reachable on origin at `caa31ee2ff77331d7ab976bff5bb7bb4588244c9`:
five commits on `7caf23e1`, 35 files, +4331/-515, nothing under
`supabase/`, `app.json` untouched, PROJECT-STATE.md changed in one line
(the Active work row). The code under review is that head; this note is
the only commit above it and touches this file alone. Reviewer of record
Codex Sol / Ultra / fresh session writes REVIEW-023 (immutable record plus
HANDOFF top-insert, two files, on this branch). Advisory DeepSeek V4 Pro /
fresh session writes REVIEW-023-ADVISORY on the durability mechanism; no
merge authority. Accepted preflight deviation, recorded: the owner's local
`main` lagged one fast-forward behind origin at dispatch; the builder
fast-forwarded and disclosed rather than stopped, which the controller
accepts — the dispatch's "stop on any mismatch" applied a rule written for
origin mismatches to a local lag. A draft PR is opened by the controller so
CI runs on the branch (`ci.yml` fires on pull_request and push-to-main
only); the draft state is the merge block, the REVIEW-023 verdict is the
merge gate. Written through the Composio GitHub connection.

**Phase transition REVIEW -> BUILD (fix cycle 1 of 3), 2026-08-26, CTRL-006.**
REVIEW-023 (Codex Sol / Ultra, record at `fed364d9`): **FAIL** — findings
1–3 MUST CLOSE, 5 MUST NARROW/SUBTRACT, 4 controller-owned, 6 corrected by
the reviewer's HANDOFF insert. Owner rulings 25 (R2 under double refusal)
and 26 (the Unit D → Unit E storage-key transition is out of scope, on the
fact that no one has ever signed in through the app) are recorded in the
CTRL-006 cycle-1 state commit on main and restated in the fix dispatch,
which governs (ruling 7). Fix cycle 1 dispatched to Claude Code, Fable 5 /
Max / fresh session (ruling 5). REVIEW-023-ADVISORY (DeepSeek V4 Pro) had
not landed at this transition; it is adjudicated on arrival and feeds cycle
2 if it adds anything. Draft PR #17 stays open for CI only.

**Controller annotation on the build closing note above (REVIEW-023
finding 4).** The builder wrote that note on the controller's explicit
authorisation in the Unit E dispatch. `AGENTS.md` permits builders to update
only the Active work row and their HANDOFF block; the authorisation, not the
builder, was the defect, recorded in the CTRL-006 ledger. The note stays —
this record supersedes and never deletes — and no future dispatch authorises
a builder write to this file. Written through the Composio GitHub
connection.

**Phase transition BUILD -> REVIEW (cycle-1 review, REVIEW-024), 2026-08-26,
CTRL-006.** Fix-cycle-1 head verified reachable at
`5f6d2e6ca873ff3b45d9d9a6e52d42bdebed30bd`: four builder commits
(`f66c451c`, `74024465`, `7d2229b9`, `5f6d2e6c`) above the advisory record
`0de2e406`; this file untouched by the builder in that range (finding 4
honoured); nothing under `supabase/`, `.github/`, `app.json` or the
lockfile; CI success at the head (run 32973184321). Scope of REVIEW-024:
closure of REVIEW-023 findings 1–6 under rulings 25–26, plus the cycle-1
addendum's three advisory leads (A listener gate, B consult by read,
C sign-in resolves the demand), adjudicated in from REVIEW-023-ADVISORY
leads 1–3. Reviewer of record Codex Sol / Ultra / fresh session; record
REVIEW-024 plus HANDOFF top-insert, two files. The advisory seat is spent
for this unit unless the reviewer of record flags new high risk. This note
is the only commit above the builder head and touches this file alone.
Written through the Composio GitHub connection.

**Phase transition REVIEW -> BUILD (fix cycle 2 of 3), 2026-08-26, CTRL-006.**
REVIEW-024 (Codex Sol / Ultra, record at `055ac265`): **FAIL** — three
findings: (1) HIGH, a thrown demand read plus `exists === false` still
reads as absence; (2) HIGH, in-class recurrence of the exposure defect —
`getSession()` publishes state after its await with no demand boundary;
(3) MEDIUM, 006b bound to `74024465`, not the candidate, and `red-lane.txt`
not byte-stable at the candidate. REVIEW-023 findings 1, 3, 4, 6 closed or
honoured; 2 closed in its exact schedule but open in class; 5 open. The
reviewer invoked the stop rule on the exposure class: cycle 2 must close it
structurally — one enforced post-await publication barrier — or cycle 3
remedies by subtraction. The adjacent `secure-store-adapter.ts:353-363`
world-assertion comment is authorised for deletion under ruling 26 this
cycle (controller extension of the ruling's touch-set; one file). Fix
cycle 2 dispatched to Claude Code, Fable 5 / Max / fresh session. Draft
PR #17 stays open for CI only. Written through the Composio GitHub
connection.

**Phase transition BUILD -> REVIEW (cycle-2 review, REVIEW-025), 2026-08-26,
CTRL-006.** Fix-cycle-2 head verified reachable at
`2620802a208981a34a88690d4eba5ad10b096b61`: five builder commits
(`46deb1e`, `b715105`, `4742aef`, `862a4f7`, `2620802`) above `d38b2ba4`,
40 files, this file untouched in the range, nothing under `supabase/`,
`.github/`, `app.json`, `package.json` or the lockfile; CI success at the
head (run 32989188068). Scope of REVIEW-025: closure of REVIEW-024 findings
1–3 — consult by positive observation, ONE publication barrier as a type-
and lint-level fact (the stop-rule class), evidence invariant under
docs-only commits proven at the final head — plus the authorised ruling-26
comment deletion in `secure-store-adapter.ts`. Reviewer of record Codex Sol
/ Ultra / fresh session; record REVIEW-025 plus HANDOFF top-insert, two
files. One fix cycle remains; an in-class recurrence of the exposure defect
here is remedied by subtraction in cycle 3, not by a further fix. This
note is the only commit above the builder head and touches this file
alone. Written through the Composio GitHub connection.

**Phase transition REVIEW -> BUILD (fix cycle 3 of 3 — SUBTRACTION),
2026-08-26, CTRL-006.** REVIEW-025 (Codex Sol / Ultra, record at
`214a4508`): **FAIL** — (1) HIGH, third in-class recurrence of the exposure
defect: the barrier cannot retract state queued before, or standing when,
a demand rises; `signOut()` under a refused mid-sign-out refresh leaves the
provider `signedIn`; the lint-level enforcement is bypassable by aliasing
`useState`; stop rule fired. (2) MEDIUM, the docs-only evidence invariant
omits inputs (`docs/04-reviews` in the red-lane listing; `.ts` under
`docs/` typechecked) and fails on the one docs commit every review adds.
REVIEW-024 finding 1 CLOSED; the ruling-26 deletion HONOURED. **Owner ruling
28** (recorded on main): cycle 3 changes no behaviour — the exposure
invariant is withdrawn as a claim and narrowed to the enumerated schedules
that hold; the two REVIEW-025 schedules ship as HIGH Known Issues with
their compensating controls; the lint claim narrows to what it enforces;
the evidence claim narrows to the heads it measured; the subscription-based
fix gets a follow-up unit after Phase B. Fix cycle 3 dispatched to Claude
Code, Fable 5 / Max / fresh session, subtraction only. Draft PR #17 stays
open for CI only. Written through the Composio GitHub connection.

---

## LOCK — chore/state-ctrl-005-closeout

```
Project:            Noema
Branch:             chore/state-ctrl-005-closeout
Controller:         CTRL-005 Auth and session v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Opus 5 / Max / same session — the sanctioned ruling-4
                    substitution. Fable 5 returned late in the session; the
                    controller seat deliberately did not switch mid-session with
                    a close-out pending. CTRL-006 opens on Fable 5.
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           CTRL-005 close-out. Reconcile the Unit D LOCK to MERGED
                    (PR #11, 6ee4407) and the adr-008 LOCK to MERGED
                    (PR #14, 6c925d1) — first act per learning 5. Record the
                    Unit D merge, REVIEW-022's open finding and its
                    ACCEPT-AND-RECORD set into Known issues, rulings 20-22,
                    learnings 20-22, and name CTRL-006 from this file.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** This block reads `BUILD` after the owner merges until the next
controller state commit reconciles it. CTRL-006's opening commit owns that.

**Reconciled 2026-08-26 by CTRL-006 opening** — merged at
`b95913e13bb82f97b75441f78c0a93dd0cb0c2e5` (PR #15). The branch was deleted
from origin at merge; `main` is the sole branch.

---

## LOCK — chore/state-adr-008-surfacing-scope

```
Project:            Noema
Branch:             chore/state-adr-008-surfacing-scope
Controller:         CTRL-005 Auth and session v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Opus 5 / Max / same session — sanctioned ruling-4
                    substitution for the Fable 5 controller seat
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           Reconcile the adr-007 LOCK to MERGED (PR #13,
                    d5b4f8a) — first act per learning 5. Record ADR-008,
                    narrowing ADR-007's surfacing sentence to native per
                    REVIEW-021-ADVISORY. Rulings 18 and 19, learning 19.
                    Written BEFORE the fix cycle 3 dispatch, which cites it.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** This block reads `BUILD` after the owner merges until the next
controller state commit reconciles it.

**Reconciled 2026-08-26 by CTRL-005 close-out** — merged at
`6c925d1c5b5e9aa4f8da660028482707e3763c8a` (PR #14).

---

## LOCK — chore/state-adr-007-refresh-lifecycle

```
Project:            Noema
Branch:             chore/state-adr-007-refresh-lifecycle
Controller:         CTRL-005 Auth and session v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Opus 5 / Max / same session — sanctioned ruling-4
                    substitution for the Fable 5 controller seat
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           Reconcile the adr-006 LOCK to MERGED (PR #12,
                    7095267) — first act per learning 5. Record ADR-007,
                    which narrows one clause of ADR-005 following REVIEW-020
                    finding 1, plus ruling 17 and learnings 16-17. Correct the
                    Active work row on main, which has read "Not started" since
                    2026-08-22 for a unit already twice reviewed. Written
                    BEFORE the fix cycle 2 dispatch, which cites ADR-007.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** This block reads `BUILD` after the owner merges until the next
controller state commit reconciles it.

**Reconciled 2026-08-25 by CTRL-005** — merged at `d5b4f8aec3b45e7009a9a7bb2a7119c9758e1bc3`
(PR #13). Branch deleted from origin under RED-lane approval; recreatable at
`43dd571add7409318603ae4c1e460af2063cfb16`.

---

## LOCK — chore/state-adr-006-read-integrity

```
Project:            Noema
Branch:             chore/state-adr-006-read-integrity
Controller:         CTRL-005 Auth and session v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Opus 5 / Max / same session — sanctioned ruling-4
                    substitution for the Fable 5 controller seat
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           Reconcile the ctrl-005-opening LOCK to MERGED (PR #10,
                    8ab1782) — first act per learning 5. Record ADR-006,
                    which narrows one clause of ADR-004 following REVIEW-019
                    finding 5, plus rulings 15 and 16. Written BEFORE the fix
                    cycle 1 dispatch because that dispatch cites ADR-006, and
                    learning 13 bars issuing a dispatch that names a document
                    which does not yet exist.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** This block reads `BUILD` after the owner merges until the next
controller state commit reconciles it.

**Reconciled 2026-08-24 by CTRL-005** — merged at `7095267f3891e4d019cc9926b57930107e6e86be`
(PR #12).

---

## LOCK — chore/state-ctrl-005-opening

```
Project:            Noema
Branch:             chore/state-ctrl-005-opening
Controller:         CTRL-005 Auth and session v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Opus 5 / Max / same session — the sanctioned substitution
                    for the ruling-4 Fable 5 controller seat, recorded here
                    rather than assumed.
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           CTRL-005 opening state commit, landed late and out of
                    order. Reconcile the ctrl-004-opening LOCK to MERGED
                    (PR #7, 64c1ce6) and retroactively register the
                    ctrl-004-closeout LOCK that was never written — both first
                    acts per learning 5. Record ADR-004 (auth method and
                    session storage) and ADR-005 (session lifecycle and
                    revocation posture), rulings 12–14, learnings 13–15, and
                    the CTRL-005 governance ledger. Deliberately does NOT
                    register a Unit D LOCK: one already exists on
                    `feat/auth-session-v1`, and adding a second would conflict
                    on merge and would backdate a block that was in fact
                    written late by the builder.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** As with every controller state branch, this block reads `BUILD`
after the owner merges until the next controller state commit reconciles it.

**Reconciled 2026-08-24 by CTRL-005** — merged at `8ab17821f2dbc3d46ae77c75090cf8d7bbeca96b`
(PR #10). Reconciled on the next state commit, as the protocol intends.

---

## LOCK — feat/auth-session-v1

```
Project:            Noema
Branch:             feat/auth-session-v1
Controller:         CTRL-005 Auth and session v1
Builder:            Claude Code
Model+Effort:       Opus 5 [1m] / Ultracode (xhigh + workflows) / fresh session
                    — the owner-ruled substitution for the dispatched Fable 5,
                    recorded here because the dispatch instructed that this
                    specific substitution be recorded rather than stopped for.
                    Effort tier per ruling 5 for a build unit.
Reviewer of record: Codex Sol / Ultra / fresh session — named by CTRL-005 on
                    2026-08-24 per ruling 4. Authored REVIEW-019; REVIEW-020
                    goes to a fresh session, not a reopened one.
Advisory reviewer:  DeepSeek V4 Pro / fresh session — the ADR-001 auth trigger,
                    controller's pick of the single advisory seat. Narrow
                    scope: the concurrency design of the session adapter only,
                    so it does not duplicate the reviewer of record. Advisory
                    carries no merge authority; the controller adjudicates
                    against the RoR record.
Status:             MERGED
Dispatch:           Unit D — the v1 CLIENT-SIDE authentication surface only:
                    email OTP sign-in/sign-up, session persistence behind a
                    chunked expo-secure-store adapter, route protection, and
                    the owner-absorbed chrome gate (explicit screen and
                    document titles from a single config source). Phase A,
                    offline. The database auth surface stays frozen at Unit C's
                    merged state: no migration, RLS policy, database function,
                    grant, or storage-bucket policy is touched. Dependencies:
                    expo-secure-store only, plus the released backlog nit
                    adding `supabase/.temp` to .prettierignore.
Evidence:           docs/05-quality/evidence/005a-auth-session/
```
**Phase transition BUILD -> REVIEW, 2026-08-24, CTRL-005.** Fix cycle 1
delivered at `bee105f8` (5 ahead / 0 behind main, 56 files, GitHub CI PASS).
Recorded here because Codex Sol issued a compliant stop on the first REVIEW-020
dispatch: this block still read `BUILD` with both reviewers unnamed, and line
122 instructed the controller to name them before review begins. The reviewer
was correct and started no work. The controller's defect was dispatching review
before reconciling the lock to the phase being dispatched — the third
precondition failure of this session and the same root cause each time.
Adjacent gap for the backlog: AGENTS.md defines no LOCK status vocabulary and
no phase-transition rule, so BUILD -> REVIEW -> MERGED is used throughout and
defined nowhere.

**This block was written by the builder, not the controller.** The CTRL-005
opening state commit that would normally register it had not landed when this
unit started: `BRANCH-NOTES.md` carried no `feat/auth-session-v1` LOCK, and
`PROJECT-STATE.md`'s Active work row still read *"Not started ... Blocked on:
CTRL-005 opening"*. The dispatch requires a LOCK status line in the completion
report and requires the model substitution to be recorded in the LOCK, neither
of which is possible against a block that does not exist. Recorded here for the
controller to reconcile — see the HANDOFF block for the full disclosure.

**Fix cycle 1, 2026-08-24 — same builder, same branch, fresh session** (AGENTS.md
workflow step 5, in response to REVIEW-019 **FAIL**). Model+Effort for this cycle:
**Opus 5 [1m] / Max / fresh session** — the owner-set substitution for the
dispatched Fable 5, recorded here because the dispatch instructed that this
specific substitution be recorded rather than stopped for. Max is the ruling-5
tier for a review-fix loop; the build cycle above ran at the Ultracode tier.
Evidence for this cycle: `docs/05-quality/evidence/005b-auth-session-fix1/`.
`Status` is left at `BUILD` — REVIEW-019 records status reconciliation as
controller-owned, and a builder does not flip its own LOCK.

**Phase transition REVIEW -> BUILD, 2026-08-24, CTRL-005 — fix cycle 2 of 3.**
REVIEW-020 returned **FAIL** at `01b3d825`: REVIEW-019 findings 1-6 closed in
the implementation and 8-10 closed, finding 7 partially closed, with seven new
findings led by an ADR-005 lifecycle violation. Reviewer of record and advisory
seat stay as named above; the advisory seat was **never dispatched** in this
session and is re-scoped to the auth-client lifecycle for the cycle-2 candidate.
One fix cycle remains after this one. The stop rule is unchanged: an in-class
defect recurring after cycle three is remedied by subtraction.

**Phase transition BUILD -> REVIEW, 2026-08-24, CTRL-005 — REVIEW-021.**
Fix cycle 2 delivered at `ca44c84f` (12 ahead / 0 behind main, 79 files, CI
success on the exact head, PR #11 mergeable and clean). Reviewer of record
Codex Sol / Ultra, fresh session. The advisory seat fires for the first time on
this candidate: DeepSeek V4 Pro, re-scoped from the adapter concurrency — which
the reviewer of record independently closed at REVIEW-020 — to the auth-client
refresh lifecycle, where the live risk now sits. **One fix cycle remains.** If
cycle 3 arrives with claims still exceeding their instruments, the stop rule
fires and the remedy is subtraction.

**Phase transition REVIEW -> BUILD, 2026-08-25, CTRL-005 — fix cycle 3 of 3.**
REVIEW-021 returned **FAIL** and REVIEW-021-ADVISORY returned
**DEFECTS_FOUND** at `dbf1fb3b`. The two reviewers, working independently and
in different families, converged on the same core defect: the foreground gate
does not stand in front of every refresh entrance. The advisory traced the
exact door — the app's own `onAuthStateChange` registration re-entering through
`_emitInitialSession` with neither an `autoRefreshToken` gate nor a foreground
gate — and corrected the reviewer of record on one detail: `supabase-js`
registers no auth listener; the app's own registration is the trigger.

Controller adjudication: **two findings close by implementation** (the ungated
entrances; durable re-authentication after a refused rotation) and **five close
by subtraction** — the reviewer of record framed findings 3 through 7 as
"delete or narrow" itself, arriving independently at the stop rule's remedy.
The recurring class across three cycles is claims exceeding instruments; the
remedy is deleting the claims, not building a sixth instrument to rescue them.

**This is the final cycle. There is no cycle 4.** If REVIEW-022 is not a PASS,
the options are an owner override merge on a documented FAIL — the Unit C
precedent — or further subtraction until the evidence suite is smaller and
entirely true.

**Phase transition BUILD -> REVIEW, 2026-08-25, CTRL-005 — REVIEW-022, final.**
Fix cycle 3 delivered at `acb39305` (0 behind main at `6c925d1`). Two findings
closed by implementation, five by subtraction, as adjudicated. Reviewer of
record Codex Sol / Ultra, fresh session. The advisory seat is **spent**: it
fired once at REVIEW-021-ADVISORY, found the entrance the reviewer of record
missed, and its scope is closed — it is not re-dispatched here.

**The fix-cycle budget is exhausted.** If REVIEW-022 is not a PASS, there is no
cycle 4: the options are an owner override merge on a documented FAIL, the
Unit C precedent, or further subtraction. Three builder disclosures are carried
to the reviewer rather than buried: `ci.txt` is absent from 005d by design,
because a head cannot be known before its own push and carrying cycle 2's
forward would place a green CI artifact beside a different head; two tests were
added in a subtraction cycle, instrumenting the B1 hole rather than rescuing the
deleted claim, and the builder argued that distinction rather than letting it
pass; and the early `gates.txt` anomaly stays DISCLOSED and unexplained across
three cycles, recorded so "non-dispositive twice" is never quietly promoted to
"resolved".

**Owner override authorised, 2026-08-26, CTRL-005.** REVIEW-022 returned
**FAIL** at `c86ed5c2`: three findings MUST CLOSE, one SHOULD DELETE, the rest
ACCEPT AND RECORD. The fix-cycle budget was exhausted.

Findings 1 and 2 were attempts to enforce ADR-007's foreground-gating clause,
which **ADR-009 now supersedes as unenforceable**: three cycles found four-plus
refresh entrances into a pinned dependency that self-initiates from
construction, from `getSession()`, and from `signOut()`, each fix revealing
another. Under ADR-009 they are recorded library behaviour, not defects.
Finding 4 closes by subtraction. **Finding 3 — purge success inferred from the
absence of a rejection, with a process-local demand that does not survive
restart — remains genuinely open** and is the sole subject of the override.

The owner authorised merging on that single documented finding, on the Unit C
precedent, with no users, no production, and staging-only credentials. Finding 3
is recorded in Known Issues and closes in a named follow-up unit **before Phase
B exit**, not before Phase B starts. **ADR-009 is the last re-scope of Unit D**:
if the follow-up does not close finding 3, it ships as a Known Issue and the
unit is finished regardless.

**Reconciled 2026-08-26 by CTRL-005 close-out** — **MERGED** at
`6ee4407da0a95fbe285d5a0b8d6afbcf9843ba71` (PR #11), 20 commits, 99 files,
+16561/-26. Review chain REVIEW-019 through REVIEW-022 by Codex Sol with
REVIEW-021-ADVISORY by DeepSeek V4 Pro, across three fix cycles. Merged on
owner override of a REVIEW-022 FAIL, over **one** open finding — finding 3,
non-durable purge demand — after ADR-009 reclassified findings 1 and 2 as
recorded library behaviour and finding 4 closed by subtraction.

This block was edited in the owner's working tree rather than through the
GitHub API: the controller's Composio project key was revoked mid-session and
repo write access was lost. The owner commits and pushes it. Recorded because
the route a state edit took is part of its provenance.

**Fix cycle 3, 2026-08-25 — same builder, same branch, fresh session** (AGENTS.md
workflow step 5, in response to REVIEW-021 **FAIL** and REVIEW-021-ADVISORY
**DEFECTS_FOUND**). **THE FINAL CYCLE — there is no cycle 4.**

**Model+Effort for this cycle: Opus 5 [1m] / Max / fresh session.** The dispatch
named **Fable 5**; Fable 5 quota was unavailable and the owner set Opus 5 [1m].
The dispatch authorises exactly this substitution provided it is RECORDED rather
than passed over, and directs the builder not to stop for it. Recorded here, in
the HANDOFF, and in the cycle's evidence README. No other dispatch term was
substituted, and no other mismatch was found.

Preflight, both checks hard, both passed — the second only after a correction
worth recording. `origin/feat/auth-session-v1` was `c33de65` as dispatched, the
LOCK read `BUILD`, and `c33de65` touched `BRANCH-NOTES.md` only. ADR-008
appeared **missing from main** on the first check: the LOCAL `main` ref was two
commits stale at `d5b4f8ae`. On `origin/main` at `6c925d1` — the PR #14 merge
commit the dispatch names as BASE — ADR-008 is present. The dispatch was correct
and the local ref was not. `origin/main` was merged into the branch at `b5c9cee`
(0 behind), and the same staleness trap is now instrumented: `capture.sh` pins
its BASE literally and refuses to run if that pin is not an ancestor of HEAD.

Delivered: **two findings closed by implementation** — both refresh entrances
(the `onAuthStateChange` registration and the cold-start `getSession()`) deferred
behind the `AppState === 'active'` gate, and re-authentication after a refused
rotation made durable via a separate purge observer, a sticky write flag, and a
retry that outlives its first attempt. **Five findings closed by subtraction**:
the universal token-opacity claim, the stalled-reader schedule claim, the
synthetic-described-as-actual and 513-per-sign-out figures, the stale stability
base, and the record inconsistencies. ADR-008 applied throughout — every
unqualified cross-platform surfacing claim qualified to native-only.

Evidence: `docs/05-quality/evidence/005d-auth-session-fix3/`. Gates 4/4 green
(9 suites, 130 tests), mutation battery **31/31 SENSITIVE, 0 build-invalid**,
stability **8/8 identical** across two fresh runs with both captures exiting 0
and all matching the committed copies — the claim REVIEW-021 finding 6 found
reproducibly red. The gates.txt anomaly remains **DISCLOSED and unexplained**
across three cycles and is deliberately not written off.

**Fix cycle 2, 2026-08-24 — same builder, same branch, fresh session** (AGENTS.md
workflow step 5, in response to REVIEW-020 **FAIL**). Model+Effort for this
cycle: **Opus 5 [1m] / Max / fresh session** — the owner-set substitution for
the dispatched Fable 5, recorded here because the dispatch instructed that this
specific substitution be recorded rather than stopped for. Max is the ruling-5
tier for a review-fix loop. **Workflows run: none**, so the ruling-6 fan-out
disclosure is nil for this cycle.

Main was merged in at `d5b4f8ae` for ADR-007, ruling 17, and learnings 16-18.
The one merge conflict — PROJECT-STATE's Active work row — was resolved by
taking this branch's row and bringing it current, as the dispatch directed,
rather than leaving a stale entry to dodge the conflict (learning 18).

Substance of this cycle: ADR-007 implemented in place of patching the three
lifecycle paths REVIEW-020 finding 1 proved unpatchable; the chunk ceiling
re-derived from measurement rather than assertion; three instruments rebuilt
(a source/AST token-opacity scan, the ninth reader-versus-removal schedule, and
a build-valid load-bearing M4); one claim **deleted** by subtraction; and the
records reconciled to the artifacts they describe. Gates all exit 0 — 9 suites,
116 tests; 27/27 mutants sensitive with 0 build-invalid; 8/8 gated artifacts
byte-stable.

Evidence for this cycle: `docs/05-quality/evidence/005c-auth-session-fix2/`.
`Status` is left at `BUILD` — REVIEW-019 records status reconciliation as
controller-owned, and a builder does not flip its own LOCK. The advisory seat
remains named above and **never dispatched**.

---

## LOCK — chore/state-ctrl-004-closeout

```
Project:            Noema
Branch:             chore/state-ctrl-004-closeout
Controller:         CTRL-004 Schema and RLS v1
Builder:            Controller (direct state edit via GitHub API)
Model+Effort:       Opus 5 / Max / same session (Fable 5 quota exhausted
                    mid-unit; the ruling-4 substitution)
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           CTRL-004 close-out state commit: Unit C merge record,
                    REVIEW-018 disposition and the owner override, the five
                    known limitations of the merged evidence suite, learnings
                    promotion, and the naming of CTRL-005.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Registered retroactively 2026-08-24 by CTRL-005 — this is a defect record,
not a routine entry.** The branch merged at `07ad5a51ed597f67bac523e681525c4e87fe644d`
(PR #9) having never registered a LOCK block at all, so for one full session
the authoritative lock record omitted a branch that existed, was built on, and
was merged. Nothing was lost — the branch was controller-only and its diff is
in history — but the omission means BRANCH-NOTES was not complete during that
window, and completeness is the whole claim this file makes. Recorded rather
than backfilled silently.

---

## LOCK — chore/state-ctrl-004-opening

```
Project:            Noema
Branch:             chore/state-ctrl-004-opening
Controller:         CTRL-004 Schema and RLS v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Fable 5 (controller conversation) / Max / same session
Reviewer of record: none (controller-only state edits)
Status:             MERGED
Dispatch:           CTRL-004 opening state commit: reconcile the
                    ctrl-003-closeout LOCK to MERGED (PR #6, 5b4fa8a) — first
                    act per learning 5 — register the Unit C LOCK
                    (feat/schema-rls-v1), promote P8/P9 to learnings 8–9,
                    record ruling 10 (owner-executed migration application)
                    and the advisory seat, update Active work, and mark
                    CTRL-004 active. On a branch; owner merges; the merge
                    ratifies the rulings recorded here.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** As with every controller state branch, this block reads `BUILD`
after the owner merges until the next controller state commit reconciles it —
learning 5 makes that reconciliation the first act of the next state commit.

**Reconciled 2026-08-24 by CTRL-005** — merged at `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
(PR #7). The lag ran two sessions rather than one: the CTRL-005 opening state
commit did not land before Unit D was built. See the CTRL-005 governance ledger
in `PROJECT-STATE.md`.

---

## LOCK — feat/schema-rls-v1

```
Project:            Noema
Branch:             feat/schema-rls-v1
Controller:         CTRL-004 Schema and RLS v1
Builder:            Claude Code
Model+Effort:       Fable 5 / Ultracode (xhigh + workflows) / fresh session
                    (fix cycles: Fable 5 / Max per ruling 5, fresh session;
                    fix cycle 2 began under those terms and finished under
                    Opus 5 [1m] per the owner ruling in the Model-transition
                    note below; fix cycle 3 ran wholly as Opus 5 [1m] / Max,
                    fresh session — an owner-ruled temporary substitution for
                    Fable 5, dispatched as such, with Max the effort label
                    this session's UI reports and ruling 5's tier for
                    review-fix loops)
Reviewer of record: Codex (Codex Sol / Ultra / fresh session); advisory
                    reviewer DeepSeek V4 Pro on the RLS/auth policy diff
                    (RED-on-arrival trigger per ADR-001)
Status:             MERGED — merge commit
                    d7943288aabb2c597b0657cf56daea89d2a11041 (PR #8,
                    2026-08-23). Merged by owner ruling over REVIEW-018's
                    FAIL, whose findings were all claim-trimming with no
                    security content; REVIEW-018 stands as the final review
                    of record. Seven fix cycles; no security defect found in
                    any review. Reconciled by the CTRL-004 close-out commit
Dispatch:           Unit C — Schema and RLS v1: author initial SQL migrations
                    and the first RLS policy set for the owner-ruled v1
                    entities, regenerate database types against the applied
                    schema, and produce an evidence suite. Migration files
                    live in-repo; application to staging is owner-executed
                    (ruling 10). Staging only. Exclusions: no production
                    access, no provider keys, no auth UI or client feature
                    code. Entity scope is enumerated in the dispatch text
                    once the owner rules; the dispatch is not yet issued at
                    registration.
Evidence:           docs/05-quality/evidence/004a-schema-rls/ (Phase A,
                    static), docs/05-quality/evidence/004b-schema-rls-live/
                    (Phase B, post-apply live) — was "pending" until the
                    Phase B amendment
```

Registered by the controller in the CTRL-004 opening state commit, ahead of
the owner's entity-scope ruling and the builder session. Per the house
workflow the builder flips `BUILD` → `REVIEW` in its handoff amendment;
`MERGED` only by the controller, after review.

**Phase A closing note (2026-08-20).** Static build complete: the four
migrations (three ruled entities, RLS ENABLE+FORCE with the owner-only
policy matrix, SECURITY DEFINER provisioning, private `captures-audio`
bucket with `{user_id}/`-scoped policies), pinned-CLI `supabase/`
scaffolding, and the 004a evidence suite (real-PG17 AST parse + 72
assertions, seven-scenario negative control, provenance, gates, secret
scan, stability 6×2). No database was touched; LOCK stayed `BUILD` by
dispatch design — Phase A ended with a HANDOFF requesting the
owner-executed apply (ruling 10).

**Phase B closing note (2026-08-20).** Post-apply build complete, staging
only. The owner applied the four migrations to `noema-staging` and ran
`types:gen` (ruling 10, 2026-08-20); this phase committed the regenerated
`src/lib/database.types.ts` as-is (first commit, provenance in message),
then proved the applied schema live with owner-handed URL + publishable key
via local env only: anon denial across REST and storage (11/11, HTTP 401
`42501` on every table; storage obfuscation/RLS-rejection/zero-list),
signup provisioning for two disposable namespaced test users, owner CRUD
across all three tables with `updated_at` triggers observed, cross-user
denial with true-no-op re-reads and WITH CHECK 403 `42501`, the composite-FK
consistency guarantee live (409 `23503` naming
`transcripts_capture_id_user_id_fkey`), and storage `{user_id}/` scoping
including no-folder fail-closed (40/40). Types verification is indirect by
design (typecheck + probe row-shape consistency — ruling 10). Evidence in
`docs/05-quality/evidence/004b-schema-rls-live/` (five producers, eight
transcripts, claims README; redaction at source with an in-process totality
gate; gated set byte-stable 4×2). One authorized OPERATIONS.md sentence
records the FORCE-RLS inspection posture. Two owner-executed config events
are on the record in the HANDOFF (mid-session `.env` hand-off; staging
email confirmation disabled before the authenticated run, state recorded in
the transcripts). Nothing under `supabase/` changed; 004a is byte-untouched.
Status moved `BUILD` → `REVIEW` in this amendment (the Evidence line above
updated from `pending` in the same amendment); `MERGED` only by the
controller, after review — reviewer of record plus the advisory RLS/auth
seat per the LOCK.

**Model transition (2026-08-20, fix cycle 2).** Fix cycle 2 was dispatched
and began as **Fable 5 / Max**, verified against the dispatch before any work
(learning 3). Mid-cycle the session model was switched to **Opus 5 [1m]**.
The builder stopped on the mismatch — ruling 4 holds that in-flight units
finish under their issued terms — and the **owner ruled in-loop on
2026-08-20 that fix cycle 2 continues and completes under Opus 5 [1m]**,
with the transition recorded here and in the HANDOFF. Both readings are on
the record rather than one being silently chosen (the
`chore/agents-md-formatting` precedent): the session environment reported
Fable 5 at start and the `/model` command reported `claude-opus-5[1m]` at
the switch, and no session can resolve from the inside which model produced
which token. The `Model+Effort` line above carries the original dispatch
terms plus this ruling; the split of work either side of the switch is in
the fix-cycle-2 HANDOFF block. For the controller to acknowledge at
close-out.

---

## LOCK — chore/state-ctrl-003-closeout

```
Project:            Noema
Branch:             chore/state-ctrl-003-closeout
Controller:         CTRL-003 Supabase Wiring
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Fable 5 (controller conversation) / Max / same session
Reviewer of record: none (controller-only state edits)
Status:             MERGED — merge commit
                    5b4fa8ab4a8fe3e6ed83a31b1acd189c0ac577ab (PR #6);
                    lag reconciled per learning 5
Dispatch:           CTRL-003 close-out: reconcile the feat/supabase-wiring
                    LOCK to MERGED (PR #5, d1a8642) and the ctrl-003-opening
                    LOCK to MERGED (PR #4, 98f3c6a) — first act per learning
                    5 — then Active work, current state, publishable-key
                    wording, backlog additions, the CTRL-003 governance
                    ledger, proposed learnings P8/P9, and the successor name
                    CTRL-004 Schema and RLS v1. On a branch; owner merges.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** As with every controller state branch, this block reads `BUILD`
after the owner merges until the next controller state commit reconciles it —
learning 5 makes that reconciliation the first act of the next state commit.

---

## LOCK — chore/state-ctrl-003-opening

```
Project:            Noema
Branch:             chore/state-ctrl-003-opening
Controller:         CTRL-003 Supabase Wiring
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Fable 5 (controller conversation) / Max / same session
Reviewer of record: none (controller-only state edits)
Status:             MERGED — merge commit
                    98f3c6ae00ccca4af732e573cac02cb3f2c926f2 (PR #4);
                    lag reconciled per learning 5
Dispatch:           CTRL-003 opening state commit: reconcile the
                    ctrl-002-closeout LOCK to MERGED (PR #3, merge commit
                    2698332), register the Unit B LOCK (feat/supabase-wiring),
                    update Active work and the current-state main pointer, and
                    mark CTRL-003 active. On a branch; owner merges.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** As with every controller state branch, this block reads `BUILD`
after the owner merges until the next controller state commit reconciles it —
learning 5 makes that reconciliation the first act of the next state commit.

---

## LOCK — feat/supabase-wiring

```
Project:            Noema
Branch:             feat/supabase-wiring
Controller:         CTRL-003 Supabase Wiring
Builder:            Claude Code
Model+Effort:       Fable 5 / Ultracode (xhigh + workflows) / fresh session
                    (fix cycles: Fable 5 / Max per ruling 5, fresh session)
Reviewer of record: Codex (Codex Sol / Ultra / fresh session)
Status:             MERGED — merge commit
                    d1a86425803f36955ada8662b2477429c1030542 (PR #5);
                    review chain REVIEW-008 (FAIL), REVIEW-009 (FAIL),
                    REVIEW-010 (PASS), two fix cycles
Dispatch:           Unit B — Supabase wiring: add supabase-js, a typed client
                    module fed by staging env config, generated-types plumbing
                    (generation script plus committed placeholder output),
                    .env.example, and a staging connectivity evidence artifact.
                    Staging only. Exclusions: no schema, no migrations, no RLS
                    or auth policy work, no production access, no provider
                    keys. The owner hands the staging URL + anon key at
                    dispatch; credentials are never committed.
Evidence:           docs/05-quality/evidence/003a-supabase-wiring/
```

Registered by the controller in the CTRL-003 opening state commit, ahead of
the builder session. Per the house workflow the builder flips `BUILD` →
`REVIEW` in its handoff amendment; `MERGED` only by the controller, after
review.

**Closing note (2026-08-19).** Build complete, staging only.
`@supabase/supabase-js@2.112.3` is in with the committed lockfile (zero new
audit advisories — still the accepted 22). `src/lib/supabase.ts` exports one
shared client typed by the committed placeholder `src/lib/database.types.ts`,
reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
and throws at load if either is missing (proven, not asserted). `npm run
types:gen` wraps CLI type generation with the project ref from env at run
time — the generation run itself is NOT RUN: owner-executed, it needs the
access token builders do not hold. `.env.example` carries exactly the two
variables, blank; `.env*` stays ignored. Staging connectivity proven by
`npm run check:supabase` with owner-handed values via local env only: three
unauthenticated round-trips plus one local client check, 4/4 pass, exit 0,
URL/key/host redacted at source and the redaction proven total on the failure
path. All five CI steps green locally; CI itself NOT RUN (no PR yet). One
service fact recorded: the REST OpenAPI root rejects publishable-class keys
by design, so health is probed on a table route. Evidence in
`docs/05-quality/evidence/003a-supabase-wiring/`, including the Unit A
stability gate run unmodified at this head (exit 1 — three differences: two
proven pre-existing at the dispatch base, one this unit's new lintable files;
triaged in the 003a README, handed to the controller in the HANDOFF, no Unit A
evidence repaired). Built under Ultracode per ruling 5; workflow disclosure
per ruling 6 is in the HANDOFF block. Status moved `BUILD` → `REVIEW` in this
amendment; `MERGED` only by the controller, after review.

**REVIEW-008 fix loop closing note (2026-08-19).** REVIEW-008 (Codex Sol,
verdict FAIL) recorded three medium findings — locale-variant `deps.txt`
breaking the byte-stability claim, `OPERATIONS.md` falsely asserting Unit B
does not exist, and only-partial `.env*` ignore coverage — plus two low
(three PASS claims without committed artifacts; a wrong HANDOFF inventory
count) and three advisory items the controller adjudicated into this cycle.
All cleared here — same builder, same branch, fresh session at Max effort per
ruling 5, `Status: REVIEW` throughout, no staging credentials handed or used.

`capture.sh` pins `LC_ALL=C LANG=C` (the omitted variable REVIEW-008
identified) and now fails closed on a secret-scan match, broken positive
control, or broken redaction control. The gated set grew three → five:
`types-plumbing.txt` (npm script reachable, `bash -n`, missing-ref refusal
before any CLI invocation, pinned CLI, placeholder-import typecheck) and
`redaction-control.txt` (the malformed-URL repro committed: exit 1, zero raw
occurrences). Fail-loudly now proves URL-only and key-only, not just
both-missing. `.gitignore` ignores literal `.env*` with `.env.example` the
sole negation, probed from both sides including `.envrc`/`.envfoo` and the
negative probe. `OPERATIONS.md`'s local-run section states what Unit B
shipped (controller ruling superseded the v1 exclusion for those lines only;
the pre-existing staging contradiction stays backlogged, untouched).
`scripts/gen-types.sh` pins `supabase@2.115.0` exact (resolved at fix time),
recorded in script and README. `connectivity.sh` propagates the child exit
status; the committed `connectivity.txt` was not regenerated — the evidence
boundary stands.

Stability gate fresh at this head: five gated artifacts, two runs each,
0 differing, process exit 0; the regenerated `deps.txt` is byte-identical to
the reviewed copy. The five CI steps re-ran green inside both captures; CI
itself still NOT RUN (no PR). The 003a directory now holds five scripts,
eleven transcripts, and the README (the new transcripts come from the
existing `capture.sh`, not new scripts) — the prior HANDOFF block's "six
scripts" (finding 5) is corrected in the new HANDOFF block, never by editing
the old one. Status stays `REVIEW` for the re-review.

**REVIEW-009 fix loop closing note (2026-08-19).** REVIEW-009 (Codex Sol,
verdict FAIL) recorded a single low, verdict-driving evidence finding: the
committed `.env.example` negative probe ran `git check-ignore` without
`--no-index`, and a tracked path is index-suppressed by default — exit 1
regardless of the patterns — so `gates.txt` proved nothing about the
`!.env.example` negation. Fixed here — same builder, same branch, fresh
session at Max effort per ruling 5, `Status: REVIEW` throughout, no staging
credentials handed or used.

The committed probe is now pattern-evaluating and two-sided in one transcript:
plain `git check-ignore --no-index .env.example` exits 1 — and would print the
path and exit 0 if the negation were removed — and the verbose form names
`.gitignore`'s `!.env.example` as the deciding line. One git semantic the fix
had to honor, verified from both sides in a disposable scratch repo before the
edit: in `-v` mode a negation match counts as a match, so the verbose
invocation exits 0 by design and the discriminating exit code stays with the
plain form. The dispatch's single-probe shorthand therefore resolves to those
two invocations — the same pair REVIEW-009's own methodology ran. `gates.txt`
was regenerated through `capture.sh`; among gated artifacts only `gates.txt`
changed, `deps.txt` regenerated byte-identical under the pinned locale, and
`connectivity.txt` is untouched. The 003a README's gates row and claim 5 now
describe the pattern-evaluating probe, and — per an in-flight controller
amendment — its normalization statement records the observed `deps.txt`
path-mask sensitivity in one sentence, the mask itself left unrepaired
(adjacent finding). Counts unchanged: five `.sh`, eleven `.txt`, one README.

Stability gate fresh at this head: five gated artifacts, two runs each,
0 differing, process exit 0. Disclosed in full in the HANDOFF block: the gate
ran in a disposable clone of this exact head carrying this cycle's three
changed files (byte-identical gated inputs to this commit), because the
session's environment reproduced the 002d-documented npm `ENOTEMPTY`
transient on every full-tree `npm ci` (three of three; npm's log names
`rmdir node_modules/@jest`, errno -66, shell exit 190). Two capture attempts
hit that transient and transiently rewrote working-tree artifacts before the
clean regeneration restored every byte; nothing red was staged or committed.
Status stays `REVIEW` for the re-review.

---

## LOCK — chore/state-ctrl-002-closeout

```
Project:            Noema
Branch:             chore/state-ctrl-002-closeout
Controller:         CTRL-002 App Skeleton
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Fable 5 (controller conversation) / Max / same session
Reviewer of record: none (controller-only state edits)
Status:             MERGED — merge commit
                    2698332fb362af6b69b75cf17624ff238c006b84 (PR #3);
                    lag reconciled per learning 5
Dispatch:           CTRL-002 close-out: flip the feat/app-skeleton and
                    ctrl-002-opening LOCKs to MERGED, record the 2026-08-18
                    owner rulings (operating-model seats, effort taxonomy,
                    disclosure line, dispatch-confirmation practice, naming
                    and scheme freeze, Linear activation), record staging
                    Supabase facts and prod deferral, append learnings 5-7,
                    update Known issues and backlog, set Active work to
                    Unit B, and name CTRL-003 Supabase Wiring as successor.
Evidence:           — (documentation-only state edit; the diff is the
                    evidence; CI run IDs cited inline are GitHub's records)
```

**Known lag.** As with every controller state branch, this block reads `BUILD`
after the owner merges until the next controller state commit reconciles it —
learning 5 makes that reconciliation the first act of CTRL-003's first state
commit.

---

## LOCK — chore/state-ctrl-002-opening

```
Project:            Noema
Branch:             chore/state-ctrl-002-opening
Controller:         CTRL-002 App Skeleton
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       controller conversation / — / same session
Reviewer of record: none (controller-only state edits; same class as
                    chore/state-ctrl-001-closeout)
Status:             MERGED — merge commit
                    ed0340d46a0cacbeffaaf71ed1cc229d62316fc9 (PR #1);
                    lag reconciled per learning 5
Dispatch:           CTRL-002 opening state commit: flip the stale scaffold and
                    CTRL-001 close-out LOCK statuses to MERGED, register the
                    Unit A LOCK (feat/app-skeleton), and update Active work for
                    the owner-approved Unit A/B split. Owner ruled 2026-08-18:
                    on a branch, owner merges — no second main exception.
Evidence:           — (documentation-only state edit; the diff is the evidence)
```

**Known lag.** A state branch cannot flip its own status: after the owner
merges, this block reads `BUILD` until a later controller state commit
reconciles it — the same lag that left the CTRL-001 close-out block stale.
From CTRL-002 onward, reconciling all LOCK statuses against merge reality is
the first act of every controller state commit.

---

## LOCK — feat/app-skeleton

```
Project:            Noema
Branch:             feat/app-skeleton
Controller:         CTRL-002 App Skeleton
Builder:            Claude Code
Model+Effort:       Opus / high effort / fresh session
Reviewer of record: Codex
Status:             MERGED — merge commit
                    8d648bb5036d22817d30a29ec21b3c19edcc9ed4 (PR #2);
                    REVIEW-007 PASS
Dispatch:           Unit A — initialize the Expo (React Native) app for mobile
                    and web plus a CI baseline. No Supabase, no provider keys,
                    no transcription code, no deploys. Supabase wiring is
                    Unit B, a separate future dispatch. Amended by CTRL-002
                    after handoff: add `npm run format:check` as a fifth CI
                    step.
Evidence:           docs/05-quality/evidence/002a-app-skeleton/
```

Registered by the controller in the CTRL-002 opening state commit, ahead of
dispatch issue. `BUILD` marks the branch owned from the moment this merges;
the dispatch text is delivered to the builder separately.

**Opening note — the builder stopped before building.** The dispatch told the
builder to verify itself against this block. At the snapshot the builder held
(`59db981`) the block did not exist, so there was nothing to verify against and
the session stopped without creating the branch. The controller ruled the
snapshot stale and pointed to `ed0340d`, where this block is present; the
builder re-verified and only then began. Recorded because the stop is the
protocol working as designed, not an incident.

**Closing note (2026-08-18).** Build complete. The Expo skeleton is in:
SDK 57.0.14, expo-router, TypeScript strict, one placeholder home screen, npm
with a committed lockfile, ESLint + Prettier, jest-expo with one passing test,
and a GitHub Actions workflow. Verified locally — typecheck, lint, and test all
exit 0; each gate was proven to go red on an injected fault and back to green;
`expo-doctor` 21/21; `expo export --platform all` produces iOS, Android, and
web bundles. CI itself is **NOT RUN**: no `pull_request` or push-to-`main`
event has occurred, so the first CI run happens when the PR opens. Two results
are carried forward rather than fixed — 22 transitive npm advisories in Expo's
own build tooling, and the local Node 26 / CI Node 24 skew — both accepted by
controller ruling. Evidence in `docs/05-quality/evidence/002a-app-skeleton/`.
Handoff is in `docs/01-state/HANDOFF.md`.

**Post-handoff amendment (2026-08-18).** The handoff flagged that Prettier was
configured but not enforced in CI, since `eslint-config-prettier` disables
ESLint's formatting rules and the original dispatch named exactly four CI
steps. The controller amended scope: `npm run format:check` is now a fifth CI
step. Status moved `BUILD` → `REVIEW` in the same amendment, per the house
precedent set by the scaffold and formatting units — the builder does not
review its own unit.

Status moves to `MERGED` only by the controller, after review.

**Fix loop closing note (2026-08-18).** REVIEW-003 (Codex, verdict FAIL)
recorded four findings on this branch. All four are resolved here — same
builder, same branch, fresh session, `Status: REVIEW` throughout.

Finding 1 (high), verdict-driving: `app.json`'s `name` is Expo's user-visible
app label and read `noema`. It is now `ZC App (dev)`, a one-line change. On the
controller's ruling, `slug` and `scheme` stay — they are internal identifiers of
the same class as the GitHub repo name, as are the npm `name` fields in
`package.json` and the lockfile. Proven at three depths (the file as written,
Expo's resolved config, and the manifest embedded in the exported web bundle):
zero user-visible fields match the name; `web.name` and `web.shortName`, which
Expo derives from `name`, now read `ZC App (dev)` too.

Finding 2 (medium): `docs/02-roles/OPERATIONS.md` no longer claims there is
nothing to run. "How to run it locally" and the local row of the environments
table describe the real app; staging and production remain `TODO(owner)`
because they still do not exist.

Finding 3 (low): the 002a evidence README called the branch unpushed after the
amendment had pushed it. Corrected, with the push state captured as an
artifact. The CI NOT RUN classification is unchanged and was never at issue —
a feature-branch push is not a workflow trigger.

Finding 4 (low): `git-ls-files.txt` was regenerated from the staged index by a
committed script, run to a fixed point so it includes itself. It now describes
the fix-loop head and can be checked against `git ls-tree -r --name-only`.

All gates re-run after the change: typecheck, lint, test, and format:check exit
0, `expo-doctor` 21/21, `expo export --platform all` produces iOS, Android, and
web bundles. CI is still **NOT RUN** — this loop adds a commit, not a trigger.
The 22 Expo-tooling audit advisories are unchanged. Evidence in
`docs/05-quality/evidence/002b-fix-loop/`. Status stays `REVIEW` for the
re-review.

**REVIEW-004 fix loop closing note (2026-08-18).** REVIEW-004 (Codex, verdict
FAIL) recorded two medium findings on this branch. Both are resolved here —
same builder, same branch, fresh session, `Status: REVIEW` throughout, and the
RED lane and every prior exclusion and ruling left untouched.

Finding 1, verdict-driving: the byte-stable regeneration gate failed. Four 002b
transcripts — `push-state.txt`, `name-scan.txt`, `test.txt`, `expo-export.txt` —
changed when the committed scripts were rerun at the committed head. Each
carried a field that moves on its own: wall-clock durations, a cold-cache
warning, a count read from the working tree rather than the index, and the
remote's current head. The fix is in the generating scripts, never in their
outputs; every artifact here was regenerated by running its script. A fifth
artifact, `lint-file-list.txt`, had the same defect and REVIEW-004 could not
have seen it: ESLint also inspects the generated, gitignored `expo-env.d.ts`,
which is absent in a fresh clone and present after any `expo` command, so the
listing read 5 files for the reviewer and 6 here. It now lists tracked files
only and counts problems in untracked ones separately (`0`); `lint.txt` remains
the gate and still covers everything ESLint sees. Three
artifacts cannot be normalised without lying about what they measure and are
now classified **run-varying**, each naming exactly which fields vary:
`environment.txt` (node, npm, os), `expo-doctor.txt` (the build resolved from
`@latest`, its check count, and which of its checks can reach Expo's services)
and `npm-audit.txt` (the upstream advisory database). That classification was
borne out during the loop: `expo-doctor` returned three different transcripts
across the eight runs this loop made against the same tree, and `npm audit`
reordered its
dependency tree while reporting the same 22 advisories. The byte-stability claim is scoped to the remaining ten gated
artifacts and re-proven at the committed head by
`docs/05-quality/evidence/002c-fix-loop-2/stability.txt`. One limit is recorded
rather than engineered around: `push-state.txt` cannot attest that its own
commit is pushed, because no artifact inside a commit can name that commit's
hash; it attests containment of every commit through the REVIEW-004 record.

Finding 2: `docs/02-roles/OPERATIONS.md` no longer says the clone, the
environment, or the app "runs". Each runtime statement is now separate, classed,
and tied to an artifact — install PASS, three-platform export PASS, dev server
starts and serves `/` PASS (new evidence, `002c-fix-loop-2/dev-server.txt`),
rendering **NOT RUN**. The dev-server artifact states its own limit: the markup
is produced by Expo Router's static rendering in Node, so no browser or device
rendered anything. An **Owner smoke test** section was added with the `npm ci` /
`npm run web` procedure and its expected result, and
`docs/05-quality/evidence/002c-owner-smoke/` was created as the slot the owner's
attestation lands in, before re-review. It is deliberately empty.

**Adjacent finding, reported and not acted on.** On the web target the app name
`ZC App (dev)` is not visible anywhere on screen — the skeleton leaves the
document title empty, so the name lives only in the web manifest embedded in the
bundle and in the Expo Go project list. The dispatch's expected smoke result
named a `ZC App (dev)` context; the smoke procedure therefore sends anyone who
wants to see the name to the Expo Go target and says plainly that a web-only
attestation cannot claim it. Setting a document title is a product change
outside this loop's scope.

All gates re-run: typecheck, lint, test and format:check exit 0, `expo-doctor`
21/21, `expo export --platform all` produces iOS, Android and web bundles. CI is
still **NOT RUN** — this loop adds a commit, not a trigger. The 22 Expo-tooling
audit advisories are unchanged. Evidence in
`docs/05-quality/evidence/002c-fix-loop-2/`, with the amended artifacts in
`docs/05-quality/evidence/002b-fix-loop/`. Status stays `REVIEW` for the
re-review.

**Owner smoke test recorded (2026-08-18).** The owner ran the web target at
`68c14d1` and it **passed** — the placeholder home screen renders, no error
overlay, clean hydration. Attestation in
`docs/05-quality/evidence/002c-owner-smoke/attestation.md`. Rendering is now
**PASS on web** and **NOT RUN** on simulator, emulator and device; the device
target is also the only one on which the `ZC App (dev)` name is user-visible,
so that sighting is still outstanding.

The run corrected two statements this loop had written about the page, both
now fixed at source: the browser tab reads `index`, not the URL (the served
`<title>` is empty, but Expo Router sets it on the client after hydration,
which no server-side capture can observe), and there *is* a header bar, titled
with the route name, which was in the served markup all along. No check in
`dev-server.txt` was wrong — the prose around it was. `dev-server.sh` now also
asserts the header, and `dev-server.txt` has been added to the gated set.

**The gate then caught a defect in the previous commit.** With `dev-server.txt`
added, the re-run failed on `expo-export.txt`. Two moving fields, in two stages:
one export in eight reported 1099 iOS modules against 1101 in the other seven,
while emitting an identical bundle hash and size every time — so the module
count is a statistic about the build, not a property of it, and is normalised;
and more seriously, the **web** bundle's content hash is not reproducible at
all, because `expo export --platform all` bundles concurrently and assigns
module ids in completion order. Three distinct web hashes were observed, while
iOS and Android were identical in every run and a web-only export reproduced its
own hash exactly. The previous commit's claim that bundle content hashes
reproduced exactly was therefore **wrong for web**, and is corrected on the
record rather than dropped. The transcript is reclassified run-varying with both
fields named, and the claim it backed moved to a new gated `export-summary.txt`
— one bundle per platform, three named static routes, exit code, read from
`dist/`. The gate is now eleven gated artifacts and four run-varying.

**Adjacent finding, reported not acted on.** The header bar and the browser tab
both read `index` — the route filename in user-visible chrome. Not introduced
here and not in scope; it needs a real screen and document title before any of
this is user-facing. Status stays `REVIEW`.

**Model transition (2026-08-18).** Loops 1-2 built under Opus/high as
dispatched; loop 3 onward under Fable 5 / Ultracode per owner ruling
2026-08-18. The `Model+Effort` line in the block above is the original
dispatch record and stays as written — historical, not a mismatch.

**REVIEW-005 fix loop closing note (2026-08-18).** REVIEW-005 (Codex, verdict
FAIL) recorded three medium and two low findings. All five are resolved here —
same builder, same branch, fresh session under the model transition noted
above, `Status: REVIEW` throughout, and the RED lane and every prior exclusion
and ruling left untouched.

Finding 1, verdict-driving: the stability gate printed `DIFFERS` and an
encoded exit-code line when a gated artifact changed, but its process returned
0 — false-green. `stability.sh` now exits 1 when any gated artifact differs
and 0 when all match; the exit status is the gate's contract. Proven from both
sides by a committed negative control
(`docs/05-quality/evidence/002d-fix-loop-3/negative-control.txt`): a marker
staged into `typecheck.txt`'s index copy made the gate report exactly that
artifact as differing and **exit 1**; restoring the bytes exactly made the
full gate run green again, **exit 0**. The control is rerunnable at any
committed head and is not itself gated — a gate cannot contain a run of
itself.

Finding 2, verdict-driving: the install PASS in `OPERATIONS.md` now cites a
real artifact — `002d-fix-loop-3/npm-ci.txt`, a fresh `npm ci` at this head
transcribed by the committed `npm-ci.sh`: 1,085 packages, exit 0, wall-clock
masked, registry-sourced lines classified run-varying. One environmental retry
(npm `ENOTEMPTY` while deleting the old tree, exit 190) is disclosed in the
002d README rather than silently discarded.

Finding 3, verdict-driving: the Active-work row in `PROJECT-STATE.md` is
current — and the raw gated/run-varying counts are removed from that file
entirely, replaced by a pointer to the evidence README that owns them
(`002b-fix-loop/README.md`, "Gated versus run-varying"). Counts duplicated
into state files rot; pointers do not. The one-row shape change was authorized
by the dispatch.

Findings 4-5: the three false/stale prose statements are corrected at source —
`capture.sh` no longer claims module counts pass through unchanged, the 002c
README no longer says three run-varying artifacts, and `dev-server.sh` no
longer attributes the two page-description errors to its own earlier version;
they lived in the prose written around it, and its served-markup checks were
accurate throughout. `export-summary.txt`'s producer now joins route filenames
with `paste`, removing the generated trailing space `git diff --check`
flagged. Both artifacts were regenerated by running their scripts. Among the
regenerated gated artifacts, three changed: those two, each exactly as
intended, and `git-ls-files.txt`, which picked up the six paths new since it
was last regenerated — the five 002d files, and the REVIEW-005 record
committed at this loop's base.

Gates at this head: the full stability gate ran green inside the negative
control's second run — zero differing gated artifacts, process exit 0 — which
also regenerated the typecheck, lint, test and format:check transcripts
byte-identically, all exit 0. CI is still **NOT RUN** — this loop adds
commits, not a trigger. Rendering remains PASS on web and NOT RUN on
simulator, emulator and device. Evidence in
`docs/05-quality/evidence/002d-fix-loop-3/`. Status stays `REVIEW` for the
re-review.

**REVIEW-006 fix loop closing note (2026-08-18).** REVIEW-006 (Codex Sol,
verdict FAIL) recorded a single low finding: `npm-ci.sh`'s duration mask was
not total — it required the `, and audited N packages` clause, so npm's
equally valid shorter summary (`added 1085 packages in 2m` in the reviewer's
fresh run) leaked its raw duration, contradicting the script's and the 002d
README's stated contract. Fixed here — same builder, same branch, fresh
session, `Status: REVIEW` throughout, all priors byte-preserved and every
ruling standing.

The mask now accepts both documented summary forms, the audited clause
optional, and replaces everything after the summary's final ` in `, covering
every duration shape npm formats (`Nms`, `Ns`, `N.Ns`, `Nm`, `NmNs`).
Totality is proven by a committed positive control
(`002d-fix-loop-3/normalizer-control.txt`): ten sample lines — each form
crossed with each duration shape, including the reviewer's exact observed
line — piped through `npm-ci.sh --filter`, the same committed expression the
transcript is produced with; all ten came back masked, zero unmasked, encoded
and process exit 0. The control was also probed from its failing side with a
disposable scratch copy carrying the old regex: five `UNMASKED`, exit 1 — a
green control is not vacuous. `npm ci` was rerun in full through the fixed
script, first attempt, no retry: 1,085 packages, encoded exit 0; the fresh
transcript reproduced the committed `npm-ci.txt` byte for byte (same-day,
warm-cache coincidence, disclosed in the README — the classification stays
run-varying). `git-ls-files.txt` was regenerated to a fixed point and lists
three new paths (85 → 88): the REVIEW-006 record, committed at this loop's
base, and the two normalizer-control files.

Gates at this head: the full stability gate ran green — zero differing gated
artifacts, process exit 0 — regenerating the typecheck, lint, test and
format:check transcripts byte-identically, all exit 0. CI is still **NOT
RUN** — this loop adds a commit, not a trigger. Rendering remains PASS on web
and NOT RUN on simulator, emulator and device. Status stays `REVIEW` for the
re-review.


**Unit closed (2026-08-19, CTRL-002).** Review chain: REVIEW-003 FAIL (user-visible naming) → REVIEW-004 FAIL (evidence byte-stability, runtime
claims) → REVIEW-005 FAIL (gate false-green, install artifact, stale counts)
→ REVIEW-006 FAIL (duration-mask totality, low) → REVIEW-007 **PASS** at
`f4dbe82`. Merged via PR #2 at `8d648bb`; branch deleted; owner working copy
synced and pruned. CI's first two runs are green: run 1 (pull_request,
`a00593e`, id 32166739595) and run 2 (push to main, `8d648bb`,
id 32167057897) — the CI claim moves NOT RUN → PASS with those runs as the
artifact. Loops 1-2 built under Opus/high, loops 3-4 under Fable 5 per the
recorded model transition.
---

## LOCK — chore/state-ctrl-001-closeout

```
Project:            Noema
Branch:             chore/state-ctrl-001-closeout
Controller:         CTRL-001 Scaffold and Governance
Builder:            Claude Code
Model+Effort:       Sonnet / low effort
Reviewer of record: none (controller-only state edits per AGENTS.md
                    state-ownership rule; RoR review not required for this
                    class)
Status:             MERGED — merge commit
                    59db981b931d2827c58d26c0a4d7bcc62cfdfac4
Dispatch:           Controller close-out for CTRL-001: write ADR-003
                    (RED-lane payments), update PROJECT-STATE.md controller
                    sections, flip the chore/agents-md-formatting LOCK to
                    MERGED, and add this LOCK.
Evidence:           docs/05-quality/evidence/001d-closeout/
```


**Status flip (2026-08-18, CTRL-002).** All CTRL-001 close-out deliverables
are verifiably on main; the close-out merged at `59db981`. The BUILD
status was stale because a state branch cannot flip its own status —
reconciled here per the owner's 2026-08-18 ruling.

---

## LOCK — chore/agents-md-formatting

```
Project:            Noema
Branch:             chore/agents-md-formatting
Controller:         CTRL-001 Scaffold and Governance
Builder:            Claude Code
Model+Effort:       dispatched as Sonnet 4.6 / low effort; the session that
                    built it reported itself as Opus 5 (1M context) —
                    see "Model discrepancy" below
Reviewer of record: Codex
Status:             MERGED — merge commit 2e6b9f33c2cedbc8dbad2f30bd95a9550bf06675
Dispatch:           Restore the markdown structure of AGENTS.md by replacing
                    its content byte-for-byte with the owner-approved file.
                    Structure is the deliverable; wording not to be edited.
                    Fix loop (REVIEW-001): insert RED-lane payment/billing
                    entry into AGENTS.md; restore the scaffold HANDOFF
                    heading deleted by f25631c.
Evidence:           docs/05-quality/evidence/001b-agents-md/,
                    docs/05-quality/evidence/001c-fixes/
```

**Why this unit exists.** The scaffold commit shipped `AGENTS.md` verbatim as
approved, and the approved text had lost its markdown upstream: zero ATX
headings, and the Quick reference table tab-separated with no pipes. The
scaffold handoff recorded this under *What is broken or uncertain* and left it
for a separate dispatch. This is that dispatch.

**Model discrepancy — for the controller to reconcile.** The dispatch names
`Sonnet 4.6 / low`. This session's environment reported the model as Opus 5
(1M context). One of the two is wrong and I cannot tell which from inside the
session. Both are recorded rather than silently picking one, because a lock
record that asserts a model which did not build the unit is the kind of quiet
falsehood this file exists to prevent. Not acted on further — it is adjacent to
the task.

**Closing note (2026-08-17).** Build complete. `AGENTS.md` now matches the
owner-approved source byte-for-byte (sha256
`1028ac153298d361c434c7963a78f0dc49de1d0212f42171104e02793d678295`, 5310 bytes),
replacing the flattened 4998-byte version. Wording was proven unchanged by a
normalized word-stream diff: 713 words before, 713 after, zero differences.
Status moved `BUILD` → `REVIEW`; the builder does not review its own unit.
Not merged. Handoff is in `docs/01-state/HANDOFF.md`.

Status moves to `MERGED` only by the controller, after review.

**Fix loop closing note (2026-08-18).** REVIEW-001 (Codex, verdict FAIL) found
two open items on this branch: finding 1 (high) — `AGENTS.md`'s RED lane did
not name payment/billing work, conflicting with ADR-001; finding 2 (medium) —
`f25631c` deleted the scaffold HANDOFF block's heading instead of appending
above it. Finding 3 (README) was overruled by the controller and left
untouched. Both fixed: `AGENTS.md` gained one RED-lane line (sha256
`0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`, 5378
bytes; diff shows exactly one insertion), and the scaffold HANDOFF block's
`## 2026-08-17 — main (scaffold)` heading was restored from `fdbc384`,
proven byte-for-byte against that commit. Evidence in
`docs/05-quality/evidence/001c-fixes/`. Status stays `REVIEW` for Codex to
re-review. Not merged.

---

## LOCK — main (scaffold)

```
Project:            Noema
Branch:             main — single authorized direct commit, this dispatch only
Controller:         Noema Controller (Claude Project conversation)
Builder:            Claude Code
Model+Effort:       Opus / high effort / fresh session per unit
Reviewer of record: Codex
Status:             MERGED — direct-commit unit, on main at fdbc384;
                    review chain REVIEW-001 (FAIL, findings resolved)
                    then REVIEW-002 (PASS); merged state at 2e6b9f3
Dispatch:           Scaffold project governance — docs/ tree, AGENTS.md, ADR-001,
                    ADR-002, filled state and architecture files, evidence
                    artifacts. No application code.
Evidence:           docs/05-quality/evidence/001-scaffold/
```

**Why this is on `main`.** Feature-branch governance does not exist until this
commit creates it, so there was no branch protocol to follow. Direct commit to
`main` was explicitly authorized by the owner for this dispatch only. It does not
recur: every subsequent unit works on a feature branch.

**Closing note (2026-08-17).** Build complete. The scaffold shipped as one commit
containing `AGENTS.md`, `README.md`, `.gitignore`, the full `docs/` tree
(`06-content` intentionally omitted), ADR-001, ADR-002, and both evidence
artifacts. Zero application code, zero dependencies, zero credentials. Status
moved `BUILD` → `REVIEW`; the reviewer of record is Codex and the builder does not
review its own unit. Handoff is in `docs/01-state/HANDOFF.md`.

Status moves to `MERGED` only by the controller, after review.

**Status flip (2026-08-18, CTRL-002).** That review is complete: REVIEW-001
covered the full scaffold tree (verdict FAIL), its findings were fixed on
`chore/agents-md-formatting` and re-reviewed PASS in REVIEW-002, and the
combined result merged at `2e6b9f3`. Flipped by the controller per the
owner's 2026-08-18 ruling.

---
