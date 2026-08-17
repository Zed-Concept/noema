#!/usr/bin/env bash
# Two small artifacts that the gate transcripts cannot carry:
#
#   push-state.txt     — where origin/feat/app-skeleton actually points, which
#                        is what made the 002a "unpushed branch" narrative false
#                        (REVIEW-003 finding 3).
#   app-json-diff.txt  — the whole product change in this fix loop, diffed
#                        against the REVIEW-003 head rather than against
#                        whatever HEAD happens to be, so it reads the same
#                        before and after the fix commit.
#
# Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002b-fix-loop"
BASE=670b5365a78417523fee26741425dda3a6c4b45c # the REVIEW-003 record commit

{
  echo "\$ git rev-parse $BASE   # REVIEW-003 head"
  git rev-parse "$BASE"
  echo
  echo "\$ git rev-parse refs/remotes/origin/feat/app-skeleton"
  git rev-parse refs/remotes/origin/feat/app-skeleton
  echo
  echo "\$ git log --oneline -1 refs/remotes/origin/feat/app-skeleton"
  git log --oneline -1 refs/remotes/origin/feat/app-skeleton
  echo
  echo "\$ git rev-list --left-right --count HEAD...refs/remotes/origin/feat/app-skeleton"
  echo "  (local-only commits <TAB> origin-only commits)"
  git rev-list --left-right --count HEAD...refs/remotes/origin/feat/app-skeleton
  echo "--- exit code: $? ---"
} > "$OUT/push-state.txt"
echo "wrote $OUT/push-state.txt"

{
  echo "\$ git diff $BASE -- app.json"
  git diff "$BASE" -- app.json
  echo "--- exit code: $? ---"
} > "$OUT/app-json-diff.txt"
echo "wrote $OUT/app-json-diff.txt"
