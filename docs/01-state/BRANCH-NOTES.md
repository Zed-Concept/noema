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
Status:             BUILD
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
Status:             REVIEW
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
