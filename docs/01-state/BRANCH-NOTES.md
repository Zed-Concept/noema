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
Status:             BUILD
Dispatch:           Unit A — initialize the Expo (React Native) app for mobile
                    and web plus a CI baseline. No Supabase, no provider keys,
                    no transcription code, no deploys. Supabase wiring is
                    Unit B, a separate future dispatch.
Evidence:           docs/05-quality/evidence/002a-app-skeleton/ (pending)
```

Registered by the controller in the CTRL-002 opening state commit, ahead of
dispatch issue. `BUILD` marks the branch owned from the moment this merges;
the dispatch text is delivered to the builder separately.

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
