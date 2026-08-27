#!/usr/bin/env bash
#
# Byte-stability gate for 006d — session durability fix cycle 3 (Unit E,
# CTRL-006).
#
# Runs capture.sh twice into fresh temporary directories and compares the
# gated artifacts byte for byte — between the two fresh runs AND against the
# committed copies. Its EXIT STATUS IS ITS CONTRACT: 0 when every comparison
# is identical and both captures exited 0, 1 otherwise.
#
# WHAT A GREEN RUN CLAIMS — narrowed by ruling 28 after REVIEW-025
# finding 2, which disproved 006c's "at ANY commit whose product trees
# match" universal by two docs-only counterfactuals (a docs/04 review
# record grew the red-lane listing; a type-invalid docs .ts turned the
# typecheck gate). A green run claims stability AT THE COMMIT IT RAN AT,
# and nothing further: the gated artifacts depend on the bound product-tree
# OIDs AND on TypeScript under docs/ (tsconfig typechecks it) AND on the
# red-lane listing's range, which includes docs/04-reviews. The heads where
# stability was demonstrated are named in the README; review records added
# afterwards change red-lane.txt by construction and are outside the claim.
# This transcript records no run head (the commit a given run happened at
# is in the NON-gated binding-head.txt, written by capture.sh into the
# temporary run directories and never compared), so re-running at a later
# head overwrites nothing when the artifacts regenerate identically there.
#
# It lives outside the gated set on house precedent — a gate cannot contain a
# run of itself. It records both capture exit statuses rather than discarding
# them: a consistently RED capture would otherwise compare clean and report a
# green gate.
#
# finding3-probe.txt, review023-probe.txt, review024-probe.txt, and
# capture-refusal-control.txt are not compared here: their runners produce
# them from jest/capture runs whose failure output orders lines by timing;
# each runner's exit status is its contract. mutants.txt is deliberately not
# compared — mutants.sh rewrites and restores tracked source, and doubling
# that exposure buys no information. environment.txt, npm-audit.txt, and
# binding-head.txt are run-varying by construction.
#
# NOT OFFLINE BY CONSTRUCTION. capture.sh reaches the network in exactly one
# step — `npm audit` — writing the non-gated npm-audit.txt; running it twice
# here posts the dependency manifest twice.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006d-session-durability-fix3

GATED=(
  binding.txt
  gates.txt
  adapter-properties.txt
  session-properties.txt
  route-guards.txt
  banned-apis.txt
  red-lane.txt
  chrome.txt
  deps.txt
)

RUN_A="$(mktemp -d)"
RUN_B="$(mktemp -d)"
trap 'rm -rf "$RUN_A" "$RUN_B"' EXIT

PORCELAIN="$(git status --porcelain 2>/dev/null)"; ST_STATUS=$?

bash "$HERE/capture.sh" "$RUN_A" > /dev/null 2>&1
STATUS_A=$?
bash "$HERE/capture.sh" "$RUN_B" > /dev/null 2>&1
STATUS_B=$?

DIFFERING=0
{
  echo "# Byte-stability across two fresh capture.sh runs, at the one commit"
  echo "# this run happened at (ruling 28: the 006c every-matching-commit"
  echo "# universal is withdrawn — REVIEW-025 finding 2). The heads where"
  echo "# stability was demonstrated are named in the README; review records"
  echo "# added afterwards change red-lane.txt by construction and are outside"
  echo "# the claim. Compares the gated artifacts — binding.txt included —"
  echo "# between the two fresh runs AND against the committed copies. No run"
  echo "# head is recorded in this transcript; the commit each capture ran at"
  echo "# is in the run directories' non-gated binding-head.txt, not compared"
  echo "# and not kept."
  echo
  echo "## Binding of this stability run"
  echo "product trees: as recorded in binding.txt — the comparison against the"
  echo "               committed copy below IS the verification that this run"
  echo "               measured the same product trees the committed set binds"
  DIRTY_BEYOND="$(printf '%s\n' "$PORCELAIN" | grep -v -F "$HERE" | grep -c . | tr -d ' ')"
  echo "tree: $([ "$DIRTY_BEYOND" = "0" ] && echo "clean beyond this evidence directory" || echo "DIRTY beyond this evidence directory") (git status exit $ST_STATUS)"
  [ "$ST_STATUS" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  [ "$DIRTY_BEYOND" = "0" ] || DIFFERING=$((DIFFERING + 1))
  echo
  echo "capture run A exit: $STATUS_A"
  echo "capture run B exit: $STATUS_B"
  [ "$STATUS_A" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  [ "$STATUS_B" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  echo
  echo "## Gated artifacts (fresh run A vs fresh run B, then run A vs committed)"
  for artifact in "${GATED[@]}"; do
    if cmp -s "$RUN_A/$artifact" "$RUN_B/$artifact"; then
      printf '  %-26s IDENTICAL\n' "$artifact"
    else
      printf '  %-26s DIFFERS\n' "$artifact"
      DIFFERING=$((DIFFERING + 1))
    fi
    if cmp -s "$HERE/$artifact" "$RUN_A/$artifact"; then
      printf '  %-26s matches the committed copy\n' "$artifact"
    else
      printf '  %-26s DIFFERS from the committed copy\n' "$artifact"
      DIFFERING=$((DIFFERING + 1))
    fi
  done
  echo
  echo "gated artifacts: ${#GATED[@]}"
  echo "differing-or-failing comparisons: $DIFFERING"
} > "$HERE/stability.txt"

if [ "$DIFFERING" -ne 0 ]; then
  echo "stability.sh: $DIFFERING differing-or-failing comparisons — see stability.txt" >&2
  exit 1
fi
echo "stability.sh: ${#GATED[@]} gated artifacts identical across two runs and against the committed copies; both captures exited 0."
