#!/usr/bin/env bash
# Byte-stability gate for the 004b gated artifacts (learning 7: the claim is
# per-artifact and the exit status is the contract). Two fresh capture.sh
# runs into scratch directories, each compared byte-for-byte against the
# committed copies. environment.txt is run-varying and excluded; the three
# live artifacts (anon-probes.txt, auth-probes.txt, redaction-gate.txt) are
# run-varying by nature (produced once by live-probes.sh) and are never
# regenerated here.
#
# Exit: 0 = every gated artifact identical in both runs; 1 = any difference
# or any capture failure; 2 = prerequisite missing.
#
# Usage, from the repo root, at a committed (or fully staged) head:
#   bash docs/05-quality/evidence/004b-schema-rls-live/stability.sh
set -u
cd "$(git rev-parse --show-toplevel)"
dir="docs/05-quality/evidence/004b-schema-rls-live"
gated="types-shape.txt redaction-control.txt gates.txt inventory.txt secret-scan.txt"

for f in $gated; do
  [ -f "$dir/$f" ] || {
    echo "prerequisite missing: $dir/$f"
    exit 2
  }
done

differing=0
for run in 1 2; do
  out="$(mktemp -d)"
  if ! bash "$dir/capture.sh" "$out" >/dev/null 2>&1; then
    echo "run $run: capture.sh failed (fail-closed path) — gate FAILS"
    rm -rf "$out"
    exit 1
  fi
  for f in $gated; do
    if cmp -s "$dir/$f" "$out/$f"; then
      echo "run $run: $f identical"
    else
      echo "run $run: $f DIFFERS"
      differing=$((differing + 1))
    fi
  done
  rm -rf "$out"
done

echo "gated artifacts: 5; runs: 2; comparisons differing: $differing"
if [ "$differing" -eq 0 ]; then
  echo "gate: PASS (exit 0)"
  exit 0
else
  echo "gate: FAIL (exit 1)"
  exit 1
fi
