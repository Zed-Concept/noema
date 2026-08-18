#!/usr/bin/env bash
# Produces unit-a-gate-at-head.txt: the Unit A byte-stability gate
# (../002c-fix-loop-2/stability.sh) run unmodified at this unit's head, full
# transcript and process exit recorded. This unit does not edit Unit A
# evidence — differences are triaged in README.md: which were already present
# at the base commit (see unit-a-gate-at-base.sh) and which are this unit's
# legitimate tracked-file additions. The gate overwrites its own
# ../002c-fix-loop-2/stability.txt transcript on every run; that file is
# restored from the index afterwards so merged, reviewed evidence stays as
# merged.
#
# Prerequisites: the gate's own — npm ci done, everything staged (it reads the
# index), port 8081 free. Takes several minutes (full three-platform export
# plus a dev-server probe). Run from the repo root.
set -u
cd "$(git rev-parse --show-toplevel)"
dir="docs/05-quality/evidence/003a-supabase-wiring"

# Trailing whitespace is stripped: diff -u pads context lines around blank
# lines with spaces, which carry no signal and fail `git diff --check`
# (REVIEW-005 finding 5 precedent — fix the producer, not the output).
{
  bash docs/05-quality/evidence/002c-fix-loop-2/stability.sh 2>&1
  echo "--- process exit code: $? ---"
} | sed -E 's/[[:space:]]+$//' > "$dir/unit-a-gate-at-head.txt"

git checkout-index -f -- docs/05-quality/evidence/002c-fix-loop-2/stability.txt
echo "wrote $dir/unit-a-gate-at-head.txt"
