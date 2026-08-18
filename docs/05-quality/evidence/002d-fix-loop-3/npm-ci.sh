#!/usr/bin/env bash
# The artifact behind the "npm ci installs the committed lockfile" row in
# docs/02-roles/OPERATIONS.md — REVIEW-005 finding 2. That row previously
# cited environment.txt and the gate transcripts beside it, none of which run
# or record npm ci; environment.txt only queries versions, and the gate
# scripts require the install to already exist. This transcript is a real
# install, run at the head it is committed at, with the exit code captured.
#
# Normalisation, and what is deliberately left varying. The one masked field
# is the wall-clock duration npm appends to its "added ..." summary line —
# everything after the final " in ", since npm formats it as seconds or
# minutes depending on magnitude. It measures the machine, not the lockfile.
# Everything else passes through,
# which is why README.md classifies this transcript run-varying rather than
# gated: npm prints deprecation notices in download-completion order, and the
# closing audit summary is the upstream advisory database's answer on the day
# of the run — the same fields npm-audit.txt is already classified
# run-varying for. What the OPERATIONS row claims is carried by the stable
# part: the package count, which comes from the committed lockfile, and the
# exit code.
#
# Run from the repo root. Deletes and rebuilds node_modules, as npm ci always
# does.

set -u
OUT="docs/05-quality/evidence/002d-fix-loop-3/npm-ci.txt"

{
  echo "\$ npm ci"
  npm ci 2>&1
  echo "--- exit code: $? ---"
} | sed -E 's/^(added .*, and audited .* packages) in .+$/\1 in <duration>/' \
  > "$OUT"
echo "wrote $OUT"
