#!/usr/bin/env bash
#
# Byte-stability gate for 006b — session durability fix cycle 1 (Unit E,
# CTRL-006).
#
# Runs capture.sh twice into fresh temporary directories and compares the
# gated artifacts byte for byte. Its EXIT STATUS IS ITS CONTRACT: 0 when every
# gated pair is identical and both captures exited 0, 1 otherwise.
#
# It lives outside the gated set on house precedent — a gate cannot contain a
# run of itself. It records both capture exit statuses rather than discarding
# them: a consistently RED capture would otherwise compare clean and report a
# green gate.
#
# BINDING (REVIEW-023 finding 5): this gate records the head it ran at and
# its own clean-tree verdict, and it compares binding.txt in two tiers —
# strictly between the two fresh runs (same head, must be identical), and
# against the committed copy with the head line masked: a rerun at a LATER
# head differing from the committed copy on exactly that line is the binding
# WORKING (the committed artifact names the head it described), and both
# values are printed so the reader sees which head the committed set binds.
#
# finding3-probe.txt, review023-probe.txt, and capture-refusal-control.txt are
# not compared here: their runners produce them from jest/capture runs whose
# failure output orders lines by timing; each runner's exit status is its
# contract. mutants.txt is deliberately not compared — mutants.sh rewrites and
# restores tracked source, and doubling that exposure buys no information.
#
# NOT OFFLINE BY CONSTRUCTION. capture.sh reaches the network in exactly one
# step — `npm audit` — writing the non-gated npm-audit.txt; running it twice
# here posts the dependency manifest twice.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006b-session-durability-fix1

GATED=(
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

STAB_HEAD="$(git rev-parse HEAD 2>/dev/null)"; RP_STATUS=$?
PORCELAIN="$(git status --porcelain 2>/dev/null)"; ST_STATUS=$?

bash "$HERE/capture.sh" "$RUN_A" > /dev/null 2>&1
STATUS_A=$?
bash "$HERE/capture.sh" "$RUN_B" > /dev/null 2>&1
STATUS_B=$?

mask_head_line() { sed -E 's/^(head:).*/\1 <run-head>/'; }

DIFFERING=0
{
  echo "# Byte-stability across two fresh capture.sh runs at this head."
  echo "# Compares the gated artifacts; environment.txt and npm-audit.txt are"
  echo "# run-varying by construction; mutants.txt and the probe/control"
  echo "# transcripts have their own producers and contracts."
  echo
  echo "## Binding of this stability run (REVIEW-023 finding 5)"
  echo "head at run time: ${STAB_HEAD:-<git rev-parse failed>} (git exit $RP_STATUS)"
  DIRTY_BEYOND="$(printf '%s\n' "$PORCELAIN" | grep -v -F "$HERE" | grep -c . | tr -d ' ')"
  echo "tree: $([ "$DIRTY_BEYOND" = "0" ] && echo "clean beyond this evidence directory" || echo "DIRTY beyond this evidence directory") (git status exit $ST_STATUS)"
  [ "$RP_STATUS" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  [ "$ST_STATUS" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  [ "$DIRTY_BEYOND" = "0" ] || DIFFERING=$((DIFFERING + 1))
  echo
  echo "capture run A exit: $STATUS_A"
  echo "capture run B exit: $STATUS_B"
  [ "$STATUS_A" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  [ "$STATUS_B" -eq 0 ] || DIFFERING=$((DIFFERING + 1))
  echo
  echo "## Gated artifacts"
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
  echo "## binding.txt — two-tier comparison"
  if cmp -s "$RUN_A/binding.txt" "$RUN_B/binding.txt"; then
    echo "  run A vs run B:            IDENTICAL"
  else
    echo "  run A vs run B:            DIFFERS (same head; this is a failure)"
    DIFFERING=$((DIFFERING + 1))
  fi
  committed_head_line="$(grep '^head:' "$HERE/binding.txt" 2>/dev/null || echo '<no committed binding.txt>')"
  fresh_head_line="$(grep '^head:' "$RUN_A/binding.txt" 2>/dev/null || echo '<no fresh binding.txt>')"
  echo "  committed $committed_head_line"
  echo "  fresh     $fresh_head_line"
  if cmp -s <(mask_head_line < "$HERE/binding.txt") <(mask_head_line < "$RUN_A/binding.txt"); then
    if [ "$committed_head_line" = "$fresh_head_line" ]; then
      echo "  vs committed copy:         IDENTICAL (same head)"
    else
      echo "  vs committed copy:         identical apart from the head line — a rerun"
      echo "                             at a different head; the committed copy binds"
      echo "                             the head it names. Not a failure."
    fi
  else
    echo "  vs committed copy:         DIFFERS beyond the head line (failure)"
    DIFFERING=$((DIFFERING + 1))
  fi
  echo
  echo "gated artifacts: ${#GATED[@]} (+ binding.txt, two-tier)"
  echo "differing-or-failing comparisons: $DIFFERING"
} > "$HERE/stability.txt"

if [ "$DIFFERING" -ne 0 ]; then
  echo "stability.sh: $DIFFERING differing-or-failing comparisons — see stability.txt" >&2
  exit 1
fi
echo "stability.sh: ${#GATED[@]} gated artifacts (+ binding.txt) identical across two runs; both captures exited 0."
