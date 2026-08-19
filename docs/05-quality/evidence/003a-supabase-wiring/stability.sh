#!/usr/bin/env bash
# Proves this directory's byte-stability claim per artifact (learning 7): runs
# capture.sh twice into fresh temp directories and compares each gated
# artifact — gates.txt, deps.txt, types-plumbing.txt, redaction-control.txt,
# secret-scan.txt — against the copy committed here, byte for byte. The exit
# status is the contract: 0 when every gated artifact matches in both runs, 1
# otherwise. capture.sh itself fails closed (exit 1, artifacts missing) on a
# secret-scan match or broken control, which this gate then reports as
# differing. stability.txt itself is not gated — a gate cannot contain a run
# of itself (house precedent: ../002d-fix-loop-3/negative-control.txt).
#
# Prerequisites: run from the repo root at a committed head, `git fetch origin`
# not required. Takes a few minutes — each capture run does a full `npm ci`.
set -u
cd "$(git rev-parse --show-toplevel)"
dir="docs/05-quality/evidence/003a-supabase-wiring"
a="$(mktemp -d)"; b="$(mktemp -d)"
trap 'rm -rf "$a" "$b"' EXIT

bash "$dir/capture.sh" "$a" > /dev/null
bash "$dir/capture.sh" "$b" > /dev/null

gated=(gates.txt deps.txt types-plumbing.txt redaction-control.txt secret-scan.txt)
fails=0
{
  echo "\$ bash docs/05-quality/evidence/003a-supabase-wiring/stability.sh"
  echo "# two fresh capture.sh runs, each gated artifact compared to the committed copy"
  for f in "${gated[@]}"; do
    for run in "$a" "$b"; do
      tag="run$( [ "$run" = "$a" ] && echo 1 || echo 2 )"
      if cmp -s "$dir/$f" "$run/$f"; then
        printf '%-22s %s: identical\n' "$f" "$tag"
      else
        printf '%-22s %s: DIFFERS\n' "$f" "$tag"
        diff -u "$dir/$f" "$run/$f" | sed 's/^/    /'
        fails=$((fails + 1))
      fi
    done
  done
  echo "gated artifacts: ${#gated[@]}    differing comparisons: $fails"
  echo "--- encoded exit code: $([ "$fails" -eq 0 ] && echo 0 || echo 1) ---"
} > "$dir/stability.txt"

cat "$dir/stability.txt"
[ "$fails" -eq 0 ] && exit 0 || exit 1
