#!/usr/bin/env bash
# Positive control for npm-ci.sh's duration normalizer — REVIEW-006 finding 1.
#
# The finding: the first normalizer matched only the summary form containing
# ", and audited N packages", so npm's equally valid shorter summary
# ("added 1085 packages in 2m", observed in the reviewer's fresh run) passed
# through with its raw duration. This control proves the fixed normalizer is
# total: one sample line for each documented summary form crossed with each
# duration shape npm formats (Nms, Ns, N.Ns, Nm, NmNs) is piped through
# `npm-ci.sh --filter` — the exact committed expression the transcript is
# produced with, not a copy — and each output must equal its input with the
# duration replaced by `<duration>`, exactly. Any other output counts as
# unmasked, and the encoded and process exit codes are both nonzero.
#
# The transcript is deterministic: fixed sample strings through a committed
# filter, no environment read. Run from the repo root; takes under a second.

set -u
DIR="docs/05-quality/evidence/002d-fix-loop-3"
OUT="$DIR/normalizer-control.txt"

SAMPLES=(
  "added 1085 packages in 950ms"
  "added 1085 packages in 4s"
  "added 1085 packages in 2.5s"
  "added 1085 packages in 2m"
  "added 1085 packages in 1m30s"
  "added 1085 packages, and audited 1086 packages in 950ms"
  "added 1085 packages, and audited 1086 packages in 4s"
  "added 1085 packages, and audited 1086 packages in 2.5s"
  "added 1085 packages, and audited 1086 packages in 2m"
  "added 1085 packages, and audited 1086 packages in 1m30s"
)

{
  echo "\$ bash docs/05-quality/evidence/002d-fix-loop-3/normalizer-control.sh"
  echo
  unmasked=0
  for line in "${SAMPLES[@]}"; do
    out=$(printf '%s\n' "$line" | bash "$DIR/npm-ci.sh" --filter)
    expected="${line% in *} in <duration>"
    if [ "$out" = "$expected" ]; then
      status="masked"
    else
      status="UNMASKED"
      unmasked=$((unmasked + 1))
    fi
    printf 'in:  %s\nout: %s   [%s]\n' "$line" "$out" "$status"
  done
  echo
  echo "samples: ${#SAMPLES[@]}    unmasked: $unmasked"
  echo "--- exit code: $([ "$unmasked" -eq 0 ] && echo 0 || echo 1) ---"
} > "$OUT"
echo "wrote $OUT"

# The process returns what the transcript records — same contract as the
# stability gate (REVIEW-005 finding 1).
if [ "$unmasked" -eq 0 ]; then
  exit 0
else
  exit 1
fi
