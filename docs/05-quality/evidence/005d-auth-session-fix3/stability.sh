#!/usr/bin/env bash
#
# Byte-stability gate for 005d — auth and session v1, fix cycle 3.
#
# Runs capture.sh twice into fresh temporary directories and compares the gated
# artifacts byte for byte. Its EXIT STATUS IS ITS CONTRACT: 0 when every gated
# pair is identical and both captures exited 0, 1 otherwise.
#
# It lives outside the gated set on house precedent — a gate cannot contain a
# run of itself (../002d-fix-loop-3/negative-control.txt). It also records both
# capture exit statuses rather than discarding them: a consistently RED capture
# would otherwise compare clean and report a green gate, which is the defect
# fixed in 005a (instrument defect 10).
#
# session-sizes.txt is also not compared here, for the plainer reason that
# capture.sh does not produce it: `session-sizes.sh` does. It is deterministic
# by construction — it reads two constants out of the shipped module and does
# arithmetic, with no clock, no network, and no filesystem ordering — and that
# is stated rather than gated, because a stability run of it would compare a
# pure function against itself.
#
# mutants.txt is deliberately NOT compared here. `mutants.sh` rewrites and
# restores tracked source, and running it twice more inside a stability gate
# doubles that exposure for no additional information — its own exit status is
# already its contract, and it verifies its own restoration byte for byte.
#
# NOT OFFLINE BY CONSTRUCTION. capture.sh reaches the network in exactly one
# step — `npm audit` — and that step writes the non-gated npm-audit.txt. Running
# capture.sh twice here therefore posts the dependency manifest to the npm
# registry twice. Stated plainly because REVIEW-020 finding 7 found the cycle-1
# records describing this producer as offline while it was not.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/005d-auth-session-fix3

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

bash "$HERE/capture.sh" "$RUN_A" > /dev/null 2>&1
STATUS_A=$?
bash "$HERE/capture.sh" "$RUN_B" > /dev/null 2>&1
STATUS_B=$?

DIFFERING=0
{
  echo "# Byte-stability across two fresh capture.sh runs at this head."
  echo "# Compares the gated artifacts only; environment.txt and npm-audit.txt are"
  echo "# run-varying by construction and mutants.txt is produced separately."
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
    # The committed copy must also match, or the directory is stale relative to
    # its own producer.
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
echo "stability.sh: ${#GATED[@]} gated artifacts identical across two runs; both captures exited 0."
