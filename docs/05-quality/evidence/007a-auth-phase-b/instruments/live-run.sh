#!/usr/bin/env bash
# Unit F live run — owner entry point (owner-executed, the 004b pattern).
#
#   bash docs/05-quality/evidence/007a-auth-phase-b/instruments/live-run.sh
#
# Preconditions: repo-root .env filled with the two owner-held staging values
# (verified by name here, never printed); dependencies materialized per the
# committed lockfile (npm ci has run); the Mailtrap sandbox UI open in a
# browser for the three code relays.
#
# This wrapper: creates the 0600 redaction ledger OUTSIDE the repo (the
# producer refuses to run without it), registers the module loader that stubs
# expo-secure-store (see expo-stub-loader.mjs), runs the producer on the
# owner's terminal (interactive: ruling-24 code relay), and deletes the
# ledger on exit. Exit status is the producer's.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../../../.." && pwd)"

if [ ! -f "$REPO_ROOT/.env" ]; then
  echo "live-run: no .env at the repo root. The owner fills it (ruling 10/24)." >&2
  exit 2
fi
for name in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY; do
  if ! grep -q "^${name}=." "$REPO_ROOT/.env"; then
    echo "live-run: ${name} is missing or empty in .env (checked by name only)." >&2
    exit 2
  fi
done

LEDGER="$(mktemp "${TMPDIR:-/tmp}/unitf-redaction-ledger.XXXXXX")"
chmod 600 "$LEDGER"
trap 'rm -f "$LEDGER"' EXIT

cd "$REPO_ROOT"
REDACTION_LEDGER="$LEDGER" node \
  --disable-warning=DEP0205 \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  --import "$HERE/register-loader.mjs" \
  "$HERE/live-run.mjs"
status=$?

echo ""
echo "live-run: exit ${status}. Transcripts (already redacted at source) are in"
echo "docs/05-quality/evidence/007a-auth-phase-b/ — the builder verifies, scans"
echo "and commits them; nothing sensitive is on disk in the repo."
exit "$status"
