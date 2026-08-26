#!/usr/bin/env bash
#
# Runner for the REVIEW-023 findings 1+2 probe (Unit E fix cycle 3 re-run,
# CTRL-006). Carried into 006d from ../006c-session-durability-fix2/
# review023-probe.sh unchanged except for this directory's paths (ruling 28:
# cycle 3 changes no behaviour). It copies THIS directory's
# review023-probe.tsx — byte-identical to the 006c copy; the fake models the
# directory listing the REVIEW-024 finding-1 consult corroborates absence
# with; schedules and the pinned trees are unchanged (see that file's
# header).
#
# Runs `review023-probe.tsx` against TWO committed trees, each in a disposable
# git worktree with this working copy's node_modules symlinked in:
#
#   1. the pinned REVIEWED CANDIDATE — caa31ee2, the exact head REVIEW-023
#      measured, where the probe must be RED: its assertions encode the
#      reviewer's own schedules (the double-refusal process-1 + restart, the
#      pending-logout hold point, zero unhandled rejections under ruling 25),
#      and that head is where findings 1 and 2 live. The RED run is this
#      instrument's POSITIVE CONTROL (learning 14).
#   2. the current HEAD — the fix candidate, where the probe must be GREEN.
#
# ITS EXIT STATUS IS ITS CONTRACT: 0 only when the candidate run FAILED and
# the head run PASSED. Green at both is vacuous and exits 1. Red at both means
# the findings are not closed and exits 1.
#
# The probe file carries no `.test` suffix in this directory, so the ordinary
# `npm test` never executes it; this runner copies it into each worktree as
# `src/__tests__/review023-probe.test.tsx`, where the tree's own jest config
# picks it up. The probe IS typechecked at this head by the ordinary tsc gate
# (the tsconfig includes docs/), so the instrument itself is build-valid.
#
# OFFLINE: the probe injects a fake fetch and fake stores; no Supabase
# endpoint is contacted and no credential is read. This runner itself runs
# only git and jest, and it checks every git invocation's exit status —
# REVIEW-023 finding 5 is why that sentence exists.
#
# The transcript is written to review023-probe.txt (or into the directory
# given as the first positional argument — a parameter, not an environment
# variable, per learning 10). Worktree paths and durations are masked; the
# transcript is NOT in the byte-stable gated set — jest failure output orders
# some lines by timing — and its verdict block plus this runner's exit status
# are the facts the claims table cites.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006d-session-durability-fix3
OUT="${1:-$HERE}"
CANDIDATE=caa31ee2ff77331d7ab976bff5bb7bb4588244c9

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "review023-probe.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

# The stale-pin refusal capture.sh carries: a candidate that is not an
# ancestor of HEAD would make the RED run meaningless.
MB="$(git merge-base "$CANDIDATE" HEAD 2>/dev/null)"; MB_STATUS=$?
if [ "$MB_STATUS" -ne 0 ] || [ "$MB" != "$CANDIDATE" ]; then
  echo "review023-probe.sh: CANDIDATE $CANDIDATE is not an ancestor of HEAD (git exit $MB_STATUS) — the pin is stale." >&2
  exit 1
fi

HEAD_SHA="$(git rev-parse HEAD)"; RP_STATUS=$?
if [ "$RP_STATUS" -ne 0 ] || [ -z "$HEAD_SHA" ]; then
  echo "review023-probe.sh: git rev-parse HEAD failed (exit $RP_STATUS) — refusing to run." >&2
  exit 1
fi

# Runs the probe at $1 in a disposable worktree; transcript to $2, status to
# the caller. The worktree gets this working copy's node_modules by symlink —
# both pinned trees' dependency sets are satisfied by it (the lockfile
# package-key set is unchanged across this cycle; deps.txt proves it).
run_at() {
  local ref="$1" transcript="$2" wt status
  wt="$(mktemp -d)" || return 90
  if ! git worktree add --detach "$wt/tree" "$ref" > /dev/null 2>&1; then
    rm -rf "$wt"
    return 91
  fi
  ln -s "$(pwd)/node_modules" "$wt/tree/node_modules"
  cp "$HERE/review023-probe.tsx" "$wt/tree/src/__tests__/review023-probe.test.tsx"
  (cd "$wt/tree" && npx jest --ci --runInBand --testPathPattern review023-probe 2>&1) |
    sed -E \
      -e "s|$wt/tree|<worktree>|g" \
      -e "s|$(pwd)|<repo>|g" \
      -e 's|(\.\./)+[^ :)]*node_modules|<node_modules>|g' \
      -e 's/ \([0-9]+(\.[0-9]+)? ?m?s\)//g' \
      -e 's/^(Time:[[:space:]]+).*$/\1<duration>/' \
      -e 's/, estimated [0-9.]+ s//' \
      > "$transcript"
  status=${PIPESTATUS[0]}
  git worktree remove --force "$wt/tree" > /dev/null 2>&1
  rm -rf "$wt"
  return "$status"
}

CAND_T="$(mktemp)"
HEAD_T="$(mktemp)"
trap 'rm -f "$CAND_T" "$HEAD_T"' EXIT

run_at "$CANDIDATE" "$CAND_T"
CAND_STATUS=$?
run_at "$HEAD_SHA" "$HEAD_T"
HEAD_STATUS=$?

{
  echo "# REVIEW-023 findings 1+2 probe — one probe, two trees."
  echo "# See review023-probe.tsx for what is asserted and review023-probe.sh for how."
  echo "#"
  echo "# candidate: $CANDIDATE (pinned; the head REVIEW-023 measured; must be RED)"
  echo "# head:      $HEAD_SHA (the fix candidate at the time of this run; must be GREEN)"
  echo "# NOTE the head SHA above is the commit the probe ran against. The commit"
  echo "# that adds this transcript necessarily post-dates it — the same"
  echo "# head-cannot-name-itself boundary as ci.txt (REVIEW-022 claim 48a ruling)."
  echo
  echo "=========================================================================="
  echo "## RUN 1 — reviewed candidate $CANDIDATE (expected: RED)"
  echo "=========================================================================="
  cat "$CAND_T"
  echo
  echo "exit: $CAND_STATUS"
  echo
  echo "=========================================================================="
  echo "## RUN 2 — head $HEAD_SHA (expected: GREEN)"
  echo "=========================================================================="
  cat "$HEAD_T"
  echo
  echo "exit: $HEAD_STATUS"
  echo
  echo "=========================================================================="
  echo "## VERDICT"
  echo "=========================================================================="
  if [ "$CAND_STATUS" -ne 0 ] && [ "$HEAD_STATUS" -eq 0 ]; then
    echo "candidate RED (exit $CAND_STATUS), head GREEN (exit 0):"
    echo "the probe fails where REVIEW-023 findings 1 and 2 live and passes at"
    echo "the fix candidate. NON-VACUOUS by the candidate run itself (learning 14)."
    echo "runner exit: 0"
  elif [ "$CAND_STATUS" -eq 0 ]; then
    echo "FAILURE: the probe PASSED at the reviewed candidate — it cannot detect"
    echo "the findings it exists to detect, so it proves nothing about the fix."
    echo "runner exit: 1"
  else
    echo "FAILURE: the probe is RED at the head (exit $HEAD_STATUS) — the"
    echo "findings are not closed at this head."
    echo "runner exit: 1"
  fi
} > "$OUT/review023-probe.txt"

if [ "$CAND_STATUS" -ne 0 ] && [ "$HEAD_STATUS" -eq 0 ]; then
  echo "review023-probe.sh: candidate RED, head GREEN — see review023-probe.txt."
  exit 0
fi
echo "review023-probe.sh: verdict FAILED (candidate exit $CAND_STATUS, head exit $HEAD_STATUS) — see review023-probe.txt." >&2
exit 1
