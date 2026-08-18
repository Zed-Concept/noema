#!/usr/bin/env bash
# Two small artifacts that the gate transcripts cannot carry:
#
#   push-state.txt     — that the branch really is on `origin`, which is what
#                        made the 002a "unpushed branch" narrative false
#                        (REVIEW-003 finding 3).
#   app-json-diff.txt  — the whole product change in the REVIEW-003 fix loop,
#                        diffed against the REVIEW-003 head rather than against
#                        whatever HEAD happens to be, so it reads the same
#                        before and after the fix commit.
#
# Why push-state.txt names no moving SHA (REVIEW-004 finding 1). The first
# version of this script printed `git rev-parse origin/feat/app-skeleton` and
# the ahead/behind count against HEAD. Both move: the remote head advances with
# every push, and the ahead/behind count reads `1 0` between committing and
# pushing and `0 0` afterwards. An artifact committed inside a commit can never
# name that commit's own hash, so a transcript built on the remote's current
# head is stale the moment it is committed.
#
# What is asked instead is the question the claim actually needs: is each
# already-reviewed commit of this branch contained in the remote branch? Those
# answers are pinned constants — once true, permanently true — so this
# transcript reproduces byte for byte at any later head. It does require an
# up-to-date remote-tracking ref: run `git fetch origin` first.
#
# The one thing this artifact cannot attest is its own commit's push, for the
# same self-reference reason. That is stated in README.md rather than papered
# over.
#
# Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002b-fix-loop"
REMOTE=refs/remotes/origin/feat/app-skeleton
BASE=670b5365a78417523fee26741425dda3a6c4b45c # the REVIEW-003 record commit

# $1 = commit, $2 = what it is
contains() {
  local sha="$1" what="$2" answer
  if git merge-base --is-ancestor "$sha" "$REMOTE" 2>/dev/null; then
    answer=yes
  else
    answer=no
  fi
  echo "\$ git merge-base --is-ancestor $sha $REMOTE"
  echo "  $what"
  echo "  contained in origin/feat/app-skeleton: $answer"
  echo
}

{
  echo "\$ git rev-parse --verify --quiet $REMOTE >/dev/null"
  if git rev-parse --verify --quiet "$REMOTE" >/dev/null; then
    echo "  remote-tracking ref: present"
  else
    echo "  remote-tracking ref: ABSENT — run 'git fetch origin' and rerun"
  fi
  echo
  contains 05a92a8d857c38df2cf415c843e45f362f576fd8 "Unit A app skeleton — the commit 002a described as unpushed"
  contains 9708fc223dff97343e7a1dad5389b701609d692f "CTRL-002 amendment — format:check in CI, LOCK to REVIEW"
  contains 670b5365a78417523fee26741425dda3a6c4b45c "REVIEW-003 record"
  contains c2ffd15becf9a5bd40fc2f60c129f89b79756710 "REVIEW-003 fix loop"
  contains 52061c95b660b5efc39d558da04563da9a6e0aaf "REVIEW-004 record"
  echo "No line above names the remote's current head, and none names HEAD."
  echo "Both move; containment does not."
  echo "--- exit code: 0 ---"
} > "$OUT/push-state.txt"
echo "wrote $OUT/push-state.txt"

{
  echo "\$ git diff $BASE -- app.json"
  git diff "$BASE" -- app.json
  echo "--- exit code: $? ---"
} > "$OUT/app-json-diff.txt"
echo "wrote $OUT/app-json-diff.txt"
