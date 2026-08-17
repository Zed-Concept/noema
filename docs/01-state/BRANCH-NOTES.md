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

## LOCK — main (scaffold)

```
Project:            Noema
Branch:             main — single authorized direct commit, this dispatch only
Controller:         Noema Controller (Claude Project conversation)
Builder:            Claude Code
Model+Effort:       Opus / high effort / fresh session per unit
Reviewer of record: Codex
Status:             REVIEW
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

---
