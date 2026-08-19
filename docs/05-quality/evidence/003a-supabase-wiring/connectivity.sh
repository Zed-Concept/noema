#!/usr/bin/env bash
# Produces connectivity.txt — run-varying (network, live staging state, run
# date). Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# in the caller's environment: the owner-held staging values, never committed.
# scripts/check-supabase-connectivity.ts redacts both from every line it
# prints, including error text; this wrapper adds nothing that could leak them.
#
# The child's exit status is this script's exit status (REVIEW-008
# adjudication): a red connectivity run must not return green. The green-path
# transcript bytes are unchanged by that fix — the committed connectivity.txt
# stands as captured.
#
# Usage, from the repo root, with the two variables exported:
#   bash docs/05-quality/evidence/003a-supabase-wiring/connectivity.sh
set -u
cd "$(git rev-parse --show-toplevel)"
outdir="${1:-docs/05-quality/evidence/003a-supabase-wiring}"

child=0
{
  echo "# Staging connectivity — output of scripts/check-supabase-connectivity.ts"
  echo "# via 'npm run check:supabase'. URL and key are redacted by the script."
  echo "# run date (UTC): $(date -u +%Y-%m-%d)"
  if npm run --silent check:supabase 2>&1; then child=0; else child=$?; fi
  echo "--- exit code: $child ---"
} > "$outdir/connectivity.txt"
echo "wrote $outdir/connectivity.txt"
exit "$child"
