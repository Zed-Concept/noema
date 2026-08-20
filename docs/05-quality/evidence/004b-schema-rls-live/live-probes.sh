#!/usr/bin/env bash
# Produces anon-probes.txt and auth-probes.txt — run-varying (live staging
# state, network, generated ids and timestamps; varying fields named in
# README.md), captured once per phase: the committed transcripts are the
# evidence boundary (003a connectivity precedent). Re-running the --auth mode
# needs the owner-class cleanup documented in README.md.
#
# Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
# either already exported (the Unit B pattern), or present in the repo-root
# .env (gitignored; the OPERATIONS.md pattern), from which exactly these two
# names are extracted below — the file is never sourced, and no value is ever
# echoed. rls-probes.mjs redacts every registered value at source and
# self-gates on redaction totality before printing anything.
#
# Exit: the worst child status — 0 all probes passed; 1 any probe failure or
# redaction trip; 2 not configured; 3 authenticated path NOT RUN (reason
# recorded in the transcript; the anon evidence stands separately).
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/004b-schema-rls-live/live-probes.sh
set -u
export LC_ALL=C
export LANG=C
evdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(git rev-parse --show-toplevel)"
outdir="${1:-docs/05-quality/evidence/004b-schema-rls-live}"
mkdir -p "$outdir"

extract_env() {
  # $1 = variable name. First NAME=value line from .env; strips one layer of
  # surrounding quotes and a trailing CR. Never echoed by any caller.
  sed -n "s/^$1=//p" .env | head -1 |
    sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//" -e 's/\r$//'
}
if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] && [ -f .env ]; then
  EXPO_PUBLIC_SUPABASE_URL="$(extract_env EXPO_PUBLIC_SUPABASE_URL)"
  export EXPO_PUBLIC_SUPABASE_URL
fi
if [ -z "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ] && [ -f .env ]; then
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(extract_env EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
  export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
fi

worst=0
run_mode() {
  mode="$1"
  outfile="$2"
  child=0
  {
    echo "# ${outfile%.txt} — rls-probes.mjs $mode against staging (redacted at source)"
    echo "# run date (UTC): $(date -u +%Y-%m-%d)"
    if node "$evdir/rls-probes.mjs" "$mode" 2>&1; then child=0; else child=$?; fi
    echo "--- exit code: $child (0 pass; 1 fail/redaction-trip; 2 unconfigured; 3 auth path NOT RUN) ---"
  } > "$outdir/$outfile"
  [ "$child" -gt "$worst" ] && worst=$child
  echo "wrote $outdir/$outfile (exit $child)"
}
run_mode --anon anon-probes.txt
run_mode --auth auth-probes.txt
exit "$worst"
