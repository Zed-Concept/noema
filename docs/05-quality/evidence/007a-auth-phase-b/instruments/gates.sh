#!/usr/bin/env bash
# The four CI-equivalent gates at this head → ../gates.txt.
# Nothing under src/ changes in this unit, so the results must match main's
# (REVIEW-028 recorded 11 suites, 196 tests at the Unit E merge).
# Normalization (the 006d practice): jest 'Time:' masked, per-suite duration
# suffixes stripped, 'env:' lines dropped (printed only when a local .env
# exists — machine state, not repo state). Locale pinned (learning 7).
set -u
export LC_ALL=C LANG=C

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../../../.." && pwd)"
OUT="$HERE/../gates.txt"

cd "$REPO_ROOT"

overall=0
{
  echo "# Unit F gates — the four non-install CI steps at this head"
  echo "# (producer: instruments/gates.sh; jest Time masked, suite durations stripped, env: lines dropped)"
  for step in typecheck lint test "format:check"; do
    echo ""
    echo "== npm run ${step} =="
    npm run "$step" 2>&1 \
      | sed -E 's/^Time:.*$/Time: <masked>/' \
      | sed -E 's/ \([0-9.]+ (ms|s)\)$//' \
      | grep -v '^env: ' \
      | grep -v 'ExperimentalWarning' \
      | grep -v '^(node:'
    status=${PIPESTATUS[0]}
    echo "exit: ${status}"
    if [ "$status" -ne 0 ]; then overall=1; fi
  done
  echo ""
  if [ "$overall" -eq 0 ]; then
    echo "gates: 4/4 PASS"
  else
    echo "gates: FAIL — at least one step exited nonzero"
  fi
} > "$OUT"

cat "$OUT"
exit "$overall"
