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

## LOCK — chore/state-ctrl-004-opening

```
Project:            Noema
Branch:             chore/state-ctrl-004-opening
Controller:         CTRL-004 Schema and RLS v1
Builder:            Controller (direct state edit via GitHub API; no product
                    code — controller-only class per AGENTS.md state ownership)
Model+Effort:       Fable 5 (controller conversation) / Max / same session
Reviewer of record: none (controller-only state edits)
Status:             BUILD
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
                    note below)
Reviewer of record: Codex (Codex Sol / Ultra / fresh session); advisory
                    reviewer DeepSeek V4 Pro on the RLS/auth policy diff
                    (RED-on-arrival trigger per ADR-001)
Status:             REVIEW — fix cycle 2 complete, awaiting re-review
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
