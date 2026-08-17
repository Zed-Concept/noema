#!/usr/bin/env bash
# Regenerates ../002a-app-skeleton/git-ls-files.txt — REVIEW-003 finding 4.
#
# Why this script exists. The original listing was captured before its own file
# and the evidence README were staged, so it recorded 50 paths for a tree that
# held 52: a transcript that could not match the head it described. `git ls-files
# ` reads the *index*, so the listing is exact only once everything is staged.
#
# How to use it while building: run it, `git add -A`, run it again, and repeat
# until the output stops changing. Two passes is normally enough — pass 1 creates
# the file, pass 2 sees it staged and lists it. The result is a fixed point.
#
# How to check it after the fact: at the committed head every listed path is
# already tracked, so a single run reproduces the file byte-for-byte, and it can
# be compared against `git ls-tree -r --name-only <head>`.
#
# Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002a-app-skeleton/git-ls-files.txt"

{
  echo "\$ git ls-files"
  git ls-files
  echo "--- exit code: $? ---"
  echo
  echo "\$ git ls-files | wc -l"
  git ls-files | wc -l
} > "$OUT"
echo "wrote $OUT"
