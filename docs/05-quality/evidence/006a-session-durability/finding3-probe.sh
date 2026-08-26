#!/usr/bin/env bash
#
# Runner for the REVIEW-022 finding-3 probe (Unit E, CTRL-006).
#
# Runs `finding3-probe.tsx` against TWO committed trees, each in a disposable
# git worktree with this working copy's node_modules symlinked in:
#
#   1. the pinned BASE — 7caf23e1, the tree Unit E started from, where the
#      probe must be RED: its assertions encode ADR-009's three requirements,
#      and the base is the revision REVIEW-022 finding 3 was found against
#      (as merged; the finding's mechanics are unchanged from c86ed5c2). That
#      RED run is this instrument's POSITIVE CONTROL (learning 14): a probe
#      that cannot fail proves nothing, and this one demonstrably fails where
#      the defect lives.
#   2. the current HEAD — the candidate, where the probe must be GREEN.
#
# ITS EXIT STATUS IS ITS CONTRACT: 0 only when the base run FAILED and the
# head run PASSED. A probe green at both is vacuous and exits 1. A probe red
# at both means the candidate does not close the finding and exits 1.
#
# The probe file carries no `.test` suffix in this directory, so the ordinary
# `npm test` never executes it; this runner copies it into each worktree as
# `src/__tests__/finding3-probe.test.tsx`, where the tree's own jest config
# picks it up.
#
# OFFLINE: the probe injects a fake fetch and fake stores; no Supabase
# endpoint is contacted and no credential is read. This runner itself runs
# only git and jest.
#
# The transcript is written to finding3-probe.txt (or into the directory given
# as the first positional argument — a parameter, not an environment variable,
# per learning 10). Worktree paths and durations are masked; the transcript is
# NOT in the byte-stable gated set — jest failure output orders some lines by
# timing — and its verdict block plus this runner's exit status are the facts
# the claims table cites.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006a-session-durability
OUT="${1:-$HERE}"
BASE=7caf23e10856601f17d52ae37ae59fbb9dbbac60

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "finding3-probe.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

# The same stale-pin refusal capture.sh carries: a base that is not an
# ancestor of HEAD would make the RED run meaningless.
if [ "$(git merge-base "$BASE" HEAD 2>/dev/null)" != "$BASE" ]; then
  echo "finding3-probe.sh: BASE $BASE is not an ancestor of HEAD — the pin is stale." >&2
  exit 1
fi

HEAD_SHA="$(git rev-parse HEAD)"

# Runs the probe at $1 in a disposable worktree; transcript to $2, status to
# the caller. The worktree gets this working copy's node_modules by symlink —
# the base's dependency set is satisfied by it (expo-file-system was already
# present transitively there; every other pin is unchanged).
run_at() {
  local ref="$1" transcript="$2" wt status
  wt="$(mktemp -d)" || return 90
  if ! git worktree add --detach "$wt/tree" "$ref" > /dev/null 2>&1; then
    rm -rf "$wt"
    return 91
  fi
  ln -s "$(pwd)/node_modules" "$wt/tree/node_modules"
  cp "$HERE/finding3-probe.tsx" "$wt/tree/src/__tests__/finding3-probe.test.tsx"
  (cd "$wt/tree" && npx jest --ci --runInBand --testPathPattern finding3-probe 2>&1) |
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

BASE_T="$(mktemp)"
HEAD_T="$(mktemp)"
trap 'rm -f "$BASE_T" "$HEAD_T"' EXIT

run_at "$BASE" "$BASE_T"
BASE_STATUS=$?
run_at "$HEAD_SHA" "$HEAD_T"
HEAD_STATUS=$?

{
  echo "# REVIEW-022 finding-3 probe — one probe, two trees."
  echo "# See finding3-probe.tsx for what is asserted and finding3-probe.sh for how."
  echo "#"
  echo "# base: $BASE (pinned; must be RED — the positive control)"
  echo "# head: $HEAD_SHA (the candidate at the time of this run; must be GREEN)"
  echo "# NOTE the head SHA above is the commit the probe ran against. The commit"
  echo "# that adds this transcript necessarily post-dates it — the same"
  echo "# head-cannot-name-itself boundary as ci.txt (REVIEW-022 claim 48a ruling)."
  echo
  echo "=========================================================================="
  echo "## RUN 1 — base $BASE (expected: RED)"
  echo "=========================================================================="
  cat "$BASE_T"
  echo
  echo "exit: $BASE_STATUS"
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
  if [ "$BASE_STATUS" -ne 0 ] && [ "$HEAD_STATUS" -eq 0 ]; then
    echo "base RED (exit $BASE_STATUS), head GREEN (exit 0):"
    echo "the probe fails where REVIEW-022 finding 3 lives and passes at the"
    echo "candidate. NON-VACUOUS by the base run itself (learning 14)."
    echo "runner exit: 0"
  elif [ "$BASE_STATUS" -eq 0 ]; then
    echo "FAILURE: the probe PASSED at the base — it cannot detect the defect it"
    echo "exists to detect, so it proves nothing about the candidate."
    echo "runner exit: 1"
  else
    echo "FAILURE: the probe is RED at the candidate (exit $HEAD_STATUS) — the"
    echo "finding is not closed at this head."
    echo "runner exit: 1"
  fi
} > "$OUT/finding3-probe.txt"

if [ "$BASE_STATUS" -ne 0 ] && [ "$HEAD_STATUS" -eq 0 ]; then
  echo "finding3-probe.sh: base RED, head GREEN — see finding3-probe.txt."
  exit 0
fi
echo "finding3-probe.sh: verdict FAILED (base exit $BASE_STATUS, head exit $HEAD_STATUS) — see finding3-probe.txt." >&2
exit 1
