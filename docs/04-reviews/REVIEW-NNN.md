# REVIEW-NNN: <what was reviewed>

**Date:** <YYYY-MM-DD>
**Reviewer:** <human or model>
**Target:** <branch, PR, commit range, or path>
**Verdict:** PASS | PASS WITH FINDINGS | FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

What was examined, and — just as importantly — what was not. An unstated gap
reads as coverage.

## Findings

| # | Severity | File:line | Finding | Status |
|---|---|---|---|---|
| 1 | high / medium / low | `path:12` | | open / fixed / accepted |

For each finding, state the concrete failure: the input or state, and the wrong
result. A finding that cannot be stated that way is a preference, and should be
labelled as one.

## Evidence

Link the artifacts that back the verdict — output, screenshots, query results —
in `docs/05-quality/evidence/`. A verdict with no evidence is an opinion.

## Carried items

Anything deliberately not fixed here, and where it is tracked. These must also
appear under **Known issues** in `PROJECT-STATE.md`, or they will be lost.
