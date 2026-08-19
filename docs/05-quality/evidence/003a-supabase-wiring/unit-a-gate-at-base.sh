#!/usr/bin/env bash
# Produces unit-a-gate-at-base.txt: proof that two of the Unit A stability
# gate's differences pre-date this unit. In a detached worktree at this unit's
# base commit (main as dispatched), it reruns the two cheap gated producers —
# ../002b-fix-loop/fix-state.sh (push-state.txt) and
# ../002b-fix-loop/tracked-files.sh (../002a-app-skeleton/git-ls-files.txt) —
# and reports whether their regenerated output matches the bytes committed at
# that base. Neither needs npm; both are pure git.
#
# Expected result, recorded rather than papered over: both DIFFER at the base,
# because (a) origin/feat/app-skeleton was deleted after the Unit A merge, so
# push-state.txt's containment answers flip, and (b) controller state commits
# added tracked files after the listing was last regenerated. Reproducible at
# the fixed base commit named below. Run from the repo root.
set -u
cd "$(git rev-parse --show-toplevel)"
BASE=98f3c6ae00ccca4af732e573cac02cb3f2c926f2
dir="docs/05-quality/evidence/003a-supabase-wiring"
wt="$(mktemp -d)"
trap 'git worktree remove --force "$wt" > /dev/null 2>&1; rm -rf "$wt"' EXIT

git worktree add --detach "$wt" "$BASE" > /dev/null 2>&1

{
  echo "# Unit A gate producers rerun at base $BASE (detached worktree)"
  echo
  for row in \
    'docs/05-quality/evidence/002b-fix-loop/fix-state.sh|docs/05-quality/evidence/002b-fix-loop/push-state.txt' \
    'docs/05-quality/evidence/002b-fix-loop/tracked-files.sh|docs/05-quality/evidence/002a-app-skeleton/git-ls-files.txt'; do
    script="${row%%|*}"
    artifact="${row#*|}"
    committed="$(mktemp)"
    git -C "$wt" show "$BASE:$artifact" > "$committed"
    (cd "$wt" && bash "$script" > /dev/null 2>&1)
    echo "\$ bash $script   # at $BASE"
    if cmp -s "$committed" "$wt/$artifact"; then
      echo "$artifact: identical at base"
    else
      echo "$artifact: DIFFERS at base — pre-existing, not introduced by this unit"
      diff -u "$committed" "$wt/$artifact" | sed 's/^/    /'
    fi
    rm -f "$committed"
    echo
  done
  echo "--- exit code: 0 (this is a demonstration, not a gate) ---"
} | sed -E 's/[[:space:]]+$//' > "$dir/unit-a-gate-at-base.txt"
# The sed strips trailing whitespace: diff -u pads context lines around blank
# lines with spaces, which carry no signal and fail `git diff --check`
# (REVIEW-005 finding 5 precedent — fix the producer, not the output).
echo "wrote $dir/unit-a-gate-at-base.txt"
