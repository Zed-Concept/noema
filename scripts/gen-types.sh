#!/usr/bin/env bash
# Regenerates src/lib/database.types.ts from the live Supabase schema.
#
# Owner-executed: the Supabase CLI authenticates with SUPABASE_ACCESS_TOKEN,
# which builders do not hold. The project ref comes from the environment at
# run time — it is never committed. See README "Supabase" for usage.
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required — the project ref from the Supabase dashboard URL}"

out="src/lib/database.types.ts"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

# CLI version pinned exact per REVIEW-008 adjudication and Supabase's npm
# security guidance (no floating tag resolved outside the lockfile while
# SUPABASE_ACCESS_TOKEN is present). 2.115.0 was the current release when
# pinned, 2026-08-19; bump deliberately, recording the new version here and
# in the README's Supabase section.
npx --yes supabase@2.115.0 gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  --schema public > "$tmp"

# Refuse to overwrite the committed file with an empty or malformed result.
grep -q 'export type Database' "$tmp"

mv "$tmp" "$out"
npx prettier --write "$out" > /dev/null
echo "regenerated $out (project ref taken from env, not echoed)"
