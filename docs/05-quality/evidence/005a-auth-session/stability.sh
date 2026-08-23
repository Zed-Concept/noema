#!/usr/bin/env bash
# Proves this directory's byte-stability claim per artifact (learning 7): runs
# capture.sh twice into fresh temp directories and compares each gated artifact
# against the copy committed here, byte for byte. The exit status is the
# contract: 0 when every gated artifact matches in both runs, 1 otherwise.
#
# capture.sh fails closed (exit 1) on a failed gate, a banned-API hit, a broken
# positive control, an unwritable output directory, or a changed expo.scheme.
# Both capture exit statuses are recorded and counted as failures here, so a
# consistently-red capture cannot pass this gate merely by being reproducible.
#
# NOT gated, and why:
#   environment.txt — node/npm/OS of the running machine, varying by design
#   npm-audit.txt   — tracks the upstream advisory database
#   stability.txt   — a gate cannot contain a run of itself
#                     (house precedent: ../002d-fix-loop-3/negative-control.txt)
#
# Takes several minutes: each capture run executes the test suite three times.
set -u
cd "$(git rev-parse --show-toplevel)"
dir="docs/05-quality/evidence/005a-auth-session"
a="$(mktemp -d)"; b="$(mktemp -d)"
trap 'rm -rf "$a" "$b"' EXIT

# The capture exit statuses are RECORDED, not discarded. Without this a red
# capture reproduced identically twice would compare clean and report a green
# gate — determinism proven, correctness never asked about.
bash "$dir/capture.sh" "$a" > /dev/null 2>&1; a_status=$?
bash "$dir/capture.sh" "$b" > /dev/null 2>&1; b_status=$?

gated=(gates.txt adapter-properties.txt session-properties.txt route-guards.txt banned-apis.txt chrome.txt deps.txt)
fails=0
{
  echo "\$ bash docs/05-quality/evidence/005a-auth-session/stability.sh"
  echo "# two fresh capture.sh runs, each gated artifact compared to the committed copy"
  for f in "${gated[@]}"; do
    for run in "$a" "$b"; do
      tag="run$( [ "$run" = "$a" ] && echo 1 || echo 2 )"
      if cmp -s "$dir/$f" "$run/$f"; then
        printf '%-26s %s: identical\n' "$f" "$tag"
      else
        printf '%-26s %s: DIFFERS\n' "$f" "$tag"
        diff -u "$dir/$f" "$run/$f" | sed 's/^/    /'
        fails=$((fails + 1))
      fi
    done
  done
  echo "capture.sh exit status: run1=$a_status run2=$b_status (0 required)"
  [ "$a_status" -eq 0 ] || fails=$((fails + 1))
  [ "$b_status" -eq 0 ] || fails=$((fails + 1))
  echo "gated artifacts: ${#gated[@]}    differing-or-failing comparisons: $fails"
  echo "--- encoded exit code: $([ "$fails" -eq 0 ] && echo 0 || echo 1) ---"
} > "$dir/stability.txt"

cat "$dir/stability.txt"
[ "$fails" -eq 0 ] && exit 0 || exit 1
