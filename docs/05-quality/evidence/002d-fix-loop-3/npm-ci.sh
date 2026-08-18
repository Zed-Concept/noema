#!/usr/bin/env bash
# The artifact behind the "npm ci installs the committed lockfile" row in
# docs/02-roles/OPERATIONS.md — REVIEW-005 finding 2. That row previously
# cited environment.txt and the gate transcripts beside it, none of which run
# or record npm ci; environment.txt only queries versions, and the gate
# scripts require the install to already exist. This transcript is a real
# install, run at the head it is committed at, with the exit code captured.
#
# Normalisation, and what is deliberately left varying. The one masked field
# is the wall-clock duration npm appends to its "added ..." summary line — it
# measures the machine, not the lockfile. The mask is total over npm's two
# documented summary forms — with and without the ", and audited N packages"
# clause (REVIEW-006 finding 1: the first version required that clause, so
# the shorter form leaked its raw duration) — and over every duration shape
# npm formats (Nms, Ns, N.Ns, Nm, NmNs), because it replaces everything after
# the summary's final " in " rather than matching duration shapes one by one.
# Totality is proven by the committed positive control beside this script:
# normalizer-control.sh pipes one sample of each form through --filter below
# and fails unless every one comes back masked. Everything else passes
# through, which is why README.md classifies this transcript run-varying
# rather than gated: npm prints deprecation notices in download-completion
# order, and the closing audit summary is the upstream advisory database's
# answer on the day of the run — the same fields npm-audit.txt is already
# classified run-varying for. What the OPERATIONS row claims is carried by
# the stable part: the package count, which comes from the committed
# lockfile, and the exit code.
#
# Run from the repo root. Deletes and rebuilds node_modules, as npm ci always
# does.

set -u
OUT="docs/05-quality/evidence/002d-fix-loop-3/npm-ci.txt"

normalize() {
  sed -E 's/^(added [0-9]+ packages(, and audited [0-9]+ packages)?) in .+$/\1 in <duration>/'
}

# --filter: apply the normalizer to stdin and exit. This is the hook the
# positive control uses, so what it proves total is the exact expression the
# transcript below is produced with, not a copy that could drift.
if [ "${1:-}" = "--filter" ]; then
  normalize
  exit 0
fi

{
  echo "\$ npm ci"
  npm ci 2>&1
  echo "--- exit code: $? ---"
} | normalize > "$OUT"
echo "wrote $OUT"
