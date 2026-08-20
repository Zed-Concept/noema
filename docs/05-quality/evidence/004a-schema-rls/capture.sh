#!/usr/bin/env bash
# Regenerates this directory's artifacts. Gated (byte-stable at the committed
# head, normalization stated in README.md): sql-assertions.txt,
# assertions-negative-control.txt, config-provenance.txt, inventory.txt,
# gates.txt, secret-scan.txt. Run-varying (fields named in README.md):
# environment.txt.
#
# Phase A is static: nothing here talks to any database. The two pinned
# tools are fetched from the npm registry at run time — libpg-query@17.7.4
# (the real PostgreSQL 17 parser) into a scratch directory, and
# supabase@2.115.0 via npx (the same pin scripts/gen-types.sh uses) — so
# reproduction needs registry access; neither is committed.
#
# Fail closed (house rule since REVIEW-008): this script exits 1 — after
# writing the transcript that shows why — if any static assertion fails, if
# the negative control fails to discriminate, if the committed supabase/
# scaffolding is not byte-identical to the pinned CLI's init output, if the
# inventory misses an expected tracked file, or if the secret scan matches
# any tracked file or a positive control breaks. A green artifact set from a
# red run cannot exist.
#
# inventory.txt and secret-scan.txt read the index, so they follow the same
# fixed-point discipline as ../003a-supabase-wiring/capture.sh: `git add -A`,
# run, and repeat until the output stops changing. At a committed head one
# run reproduces it.
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/004a-schema-rls/capture.sh [outdir]
set -u
export LC_ALL=C
export LANG=C
evdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # where verify-migrations.mjs lives
cd "$(git rev-parse --show-toplevel)"
outdir="${1:-docs/05-quality/evidence/004a-schema-rls}"
mkdir -p "$outdir"

BASE=64c1ce603491fb2cb6e8b7b948a369731a436c7f # the dispatch-named origin tip
PARSER_PIN="libpg-query@17.7.4"
CLI_PIN="supabase@2.115.0"

# --- environment.txt — run-varying: node, npm, and OS move with the machine.
{
  echo "node: $(node --version)"
  echo "npm: $(npm --version)"
  echo "os: $(uname -sr)"
  echo "locale: LC_ALL=C LANG=C (pinned by capture.sh; see README normalization note)"
} > "$outdir/environment.txt"

# --- scratch install of the pinned parser (never committed, deleted after) --
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/parser"
if ! npm install --prefix "$scratch/parser" --no-fund --no-audit --loglevel=error "$PARSER_PIN" >/dev/null 2>&1; then
  echo "FAIL CLOSED: could not install $PARSER_PIN into scratch (registry unreachable?)" >&2
  exit 1
fi

# --- sql-assertions.txt — parse validity + AST assertions over the real
# migrations. The transcript is verify-migrations.mjs's stdout, verbatim;
# its exit status is the gate.
if SQLPARSE_NODE_MODULES="$scratch/parser" node "$evdir/verify-migrations.mjs" \
  > "$outdir/sql-assertions.txt" 2>&1; then verify_exit=0; else verify_exit=$?; fi
echo "--- exit code: $verify_exit (0 = every assertion passed) ---" >> "$outdir/sql-assertions.txt"
if [ "$verify_exit" -ne 0 ]; then
  echo "FAIL CLOSED: migration assertions failed (exit $verify_exit) — see $outdir/sql-assertions.txt" >&2
  exit 1
fi

# --- assertions-negative-control.txt — the gate is not vacuous: twelve
# tampered copies of the migration set (five removal/narrowing mutations, two
# append-class mutations from the audit workflow's findings, the exact-value
# neighbor mutation from REVIEW-011 finding 2, and four REVIEW-012 finding 2
# absence-class mutations — an added default, a function-argument neighbor,
# an FK-attribute neighbor, and an appended ON CONFLICT clause) must each
# make verify-migrations.mjs report the named FAIL and exit 1. Mutations
# happen on scratch copies only; the repo is never touched.
control_violations=0
{
  echo "# Negative control: verify-migrations.mjs must go red on each tampered copy."
  echo "# Each scenario: fresh copy of supabase/migrations into scratch, one mutation,"
  echo "# one run. Expected: exit 1 and the named assertion FAILs."
  run_scenario() {
    label="$1"; expect_fail_on="$2"
    if out="$(SQLPARSE_NODE_MODULES="$scratch/parser" MIGRATIONS_DIR="$scratch/tamper" \
      node "$evdir/verify-migrations.mjs" 2>&1)"; then t_exit=0; else t_exit=$?; fi
    if printf '%s\n' "$out" | grep -qF "FAIL $expect_fail_on"; then hit=yes; else hit=no; fi
    [ "$t_exit" -eq 1 ] || control_violations=$((control_violations + 1))
    [ "$hit" = "yes" ] || control_violations=$((control_violations + 1))
    echo
    echo "scenario: $label"
    echo "expected failing assertion: $expect_fail_on"
    echo "exit code: $t_exit (1 required); named FAIL line present: $hit (yes required)"
  }
  fresh() { rm -rf "$scratch/tamper"; mkdir -p "$scratch/tamper"; cp supabase/migrations/*.sql "$scratch/tamper/"; }

  fresh
  grep -v 'alter table public.captures force row level security;' \
    "$scratch/tamper/20260820100100_v1_rls_policies.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100100_v1_rls_policies.sql"
  run_scenario "FORCE ROW LEVEL SECURITY removed from captures" \
    "public.captures: FORCE ROW LEVEL SECURITY"

  fresh
  awk '/create policy transcripts_delete_own/{skip=3} skip>0{skip--; next} {print}' \
    "$scratch/tamper/20260820100100_v1_rls_policies.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100100_v1_rls_policies.sql"
  run_scenario "transcripts DELETE policy deleted" \
    "public.transcripts delete: one permissive policy TO authenticated, (select auth.uid()) = user_id"

  fresh
  sed 's/for insert to authenticated/for insert to anon/' \
    "$scratch/tamper/20260820100300_v1_storage_captures_audio.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100300_v1_storage_captures_audio.sql"
  run_scenario "storage INSERT policy widened to anon" \
    "storage.objects insert: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on WITH CHECK"

  fresh
  sed 's/references public.captures (id, user_id) on delete cascade/references public.captures (id) on delete cascade/' \
    "$scratch/tamper/20260820100000_v1_core_schema.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100000_v1_core_schema.sql"
  run_scenario "composite FK narrowed to capture_id only (user_id consistency lost)" \
    "user_id-consistency guarantee: composite FK (capture_id, user_id) -> public.captures (id, user_id) ON DELETE CASCADE"

  fresh
  sed "s/security definer/security invoker/" \
    "$scratch/tamper/20260820100200_v1_profile_provisioning.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100200_v1_profile_provisioning.sql"
  run_scenario "provisioning function demoted to SECURITY INVOKER" \
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''"

  # The two append-class scenarios (audit workflow findings): a countermanding
  # statement or an unqualified extra policy appended after the real ones.
  fresh
  printf '\nalter table public.captures disable row level security;\n' \
    >> "$scratch/tamper/20260820100100_v1_rls_policies.sql"
  run_scenario "DISABLE ROW LEVEL SECURITY appended after the enable/force block" \
    "public.captures: ENABLE ROW LEVEL SECURITY"

  fresh
  printf '\ncreate policy captures_extra on captures for select to authenticated using (true);\n' \
    >> "$scratch/tamper/20260820100100_v1_rls_policies.sql"
  run_scenario "schema-unqualified USING (true) policy appended" \
    "every policy names its schema explicitly (public or storage) and the total is exactly 17 — an unqualified or extra policy cannot hide"

  # The exact-value neighbor scenario (REVIEW-011 finding 2): the committed
  # oracle once accepted any integer here; this mutation is the review's
  # false-green reproduction, kept as a permanent discriminating control.
  fresh
  sed 's/check (duration_ms >= 0)/check (duration_ms >= -1)/' \
    "$scratch/tamper/20260820100000_v1_core_schema.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100000_v1_core_schema.sql"
  run_scenario "duration_ms CHECK value shifted to its neighbor (>= -1)" \
    "captures.duration_ms integer, nullable, CHECK (duration_ms >= 0)"

  # The four absence-class scenarios (REVIEW-012 finding 2): the committed
  # oracle once accepted each of these valid neighbors green. One permanent
  # scenario per demonstrated class — an added default (the review's exact
  # DEFAULT 0 reproduction), a function-argument neighbor, an FK-attribute
  # neighbor — plus the appended-ON CONFLICT neighbor from this cycle's
  # absence-gap audit. Each class's assertion compares one exact string, so
  # the discrimination proven here holds for every column/site it covers.
  fresh
  sed 's/  duration_ms integer/  duration_ms integer default 0/' \
    "$scratch/tamper/20260820100000_v1_core_schema.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100000_v1_core_schema.sql"
  run_scenario "DEFAULT 0 added to captures.duration_ms (declared default-free; REVIEW-012 finding 2 reproduction)" \
    "public.captures: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  sed '/create table public.captures (/,/^);/ s/id uuid primary key default gen_random_uuid()/id uuid primary key default gen_random_uuid(null)/' \
    "$scratch/tamper/20260820100000_v1_core_schema.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100000_v1_core_schema.sql"
  run_scenario "captures.id default mutated to gen_random_uuid(null) — same function name, argument added" \
    "captures.id uuid PRIMARY KEY DEFAULT gen_random_uuid()"

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id)/constraint captures_user_id_fkey references auth.users (email)/' \
    "$scratch/tamper/20260820100000_v1_core_schema.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100000_v1_core_schema.sql"
  run_scenario "captures.user_id FK referenced-attribute list mutated to (email)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false) on conflict (id) do nothing;/" \
    "$scratch/tamper/20260820100300_v1_storage_captures_audio.sql" > "$scratch/t" \
    && mv "$scratch/t" "$scratch/tamper/20260820100300_v1_storage_captures_audio.sql"
  run_scenario "ON CONFLICT DO NOTHING appended to the bucket insert (idempotency neighbor)" \
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING"

  echo
  echo "--- enforced: every scenario exits 1 with its named FAIL line, or capture.sh exits 1 (fail closed) ---"
} > "$outdir/assertions-negative-control.txt"
rm -rf "$scratch/tamper"
if [ "$control_violations" -ne 0 ]; then
  echo "FAIL CLOSED: negative control failed to discriminate ($control_violations violation(s)) — see $outdir/assertions-negative-control.txt" >&2
  exit 1
fi

# --- config-provenance.txt — the committed supabase/ scaffolding is exactly
# what the pinned CLI generates for a project directory named noema (an
# internal identifier, ruling-8 exempt). Machine-local init output
# (supabase/.temp) must be ignored by supabase/.gitignore and untracked.
# Normalization: the CLI's stderr (npx install noise) is dropped; the scratch
# path never appears (all comparisons run against relative paths).
prov_violations=0
{
  echo "\$ npx --yes $CLI_PIN init   # in an empty scratch git repository named noema"
  echo "# (git init first: the CLI writes supabase/.gitignore only inside a git work tree)"
  mkdir -p "$scratch/provenance/noema"
  git init -q "$scratch/provenance/noema"
  (cd "$scratch/provenance/noema" && npx --yes "$CLI_PIN" init 2>/dev/null)
  echo "--- exit code: $? ---"
  echo
  for f in config.toml .gitignore; do
    if cmp -s "supabase/$f" "$scratch/provenance/noema/supabase/$f"; then same=identical; else same=DIFFERS; prov_violations=$((prov_violations + 1)); fi
    echo "supabase/$f vs fresh init output: $same"
  done
  echo
  echo "\$ git ls-files supabase/.temp   # machine-local init output must be untracked"
  temp_tracked="$(git ls-files supabase/.temp | wc -l | tr -d ' ')"
  echo "tracked files under supabase/.temp: $temp_tracked (0 required)"
  [ "$temp_tracked" = "0" ] || prov_violations=$((prov_violations + 1))
  echo "\$ grep -E '^[.](branches|temp)$' supabase/.gitignore   # and ignored by the committed scaffold"
  grep -E '^[.](branches|temp)$' supabase/.gitignore
  echo "--- exit code: $? (0 = at least one line matched; the enforced check is the conjunction below) ---"
  if grep -qE '^[.]branches$' supabase/.gitignore && grep -qE '^[.]temp$' supabase/.gitignore; then
    both=0
  else
    both=1
    prov_violations=$((prov_violations + 1))
  fi
  echo "both-lines conjunction (.branches AND .temp each present): exit $both (0 required)"
  echo
  echo "--- enforced: both files byte-identical, .temp untracked and ignored, or capture.sh exits 1 (fail closed) ---"
} > "$outdir/config-provenance.txt"
if [ "$prov_violations" -ne 0 ]; then
  echo "FAIL CLOSED: supabase/ scaffolding provenance broken ($prov_violations violation(s)) — see $outdir/config-provenance.txt" >&2
  exit 1
fi

# --- inventory.txt — the tracked supabase/ file set, from the index: mode,
# blob SHA, path. The blob SHAs pin the exact bytes every claim in this
# directory is about.
{
  echo "\$ git ls-files -s -- supabase/"
  git ls-files -s -- supabase/
  count="$(git ls-files -- supabase/ | wc -l | tr -d ' ')"
  echo "--- tracked files under supabase/: $count (6 required: config.toml, .gitignore, four migrations) ---"
} > "$outdir/inventory.txt"
if [ "$(git ls-files -- supabase/ | wc -l | tr -d ' ')" != "6" ]; then
  echo "FAIL CLOSED: supabase/ inventory is not the expected six tracked files — see $outdir/inventory.txt (is the working tree staged? fixed-point discipline)" >&2
  exit 1
fi

# --- gates.txt — the four non-install CI steps at this head, plus the
# no-dependency-delta probe that justifies not rerunning npm ci here.
# Normalization: jest's Time line masked and per-suite duration suffixes
# stripped; lines starting "env: " dropped (Expo CLI prints them only when a
# local .env exists — machine state, not repo state).
{
  echo "# Four CI steps at this head. npm ci is deliberately NOT run here: this"
  echo "# unit's delta contains no dependency change (proven below), and 002d/003a"
  echo "# document the destructive npm-ci ENOTEMPTY transient under a live editor."
  echo "# The install step runs in CI itself when the PR opens."
  echo
  echo "\$ git diff $BASE --name-only -- package.json package-lock.json   # no dependency delta vs the dispatch base"
  dep_delta="$(git diff "$BASE" --name-only -- package.json package-lock.json)"
  echo "${dep_delta:-<none>}"
  echo "--- dependency files changed since base: $([ -z "$dep_delta" ] && echo 0 || printf '%s\n' "$dep_delta" | wc -l | tr -d ' ') ---"
  echo
  echo "\$ npx tsc --noEmit"
  if tc_out="$(npx tsc --noEmit 2>&1)"; then tc_exit=0; else tc_exit=$?; fi
  [ -n "$tc_out" ] && printf '%s\n' "$tc_out"
  echo "--- exit code: $tc_exit ---"
  echo
  echo "\$ npx expo lint"
  if lint_out="$(npx expo lint 2>&1)"; then lint_exit=0; else lint_exit=$?; fi
  lint_out="$(printf '%s\n' "$lint_out" | grep -v '^env: ')" || true
  [ -n "$lint_out" ] && printf '%s\n' "$lint_out"
  echo "--- exit code: $lint_exit ---"
  echo
  echo "\$ npx jest"
  if test_out="$(npx jest 2>&1)"; then test_exit=0; else test_exit=$?; fi
  printf '%s\n' "$test_out" | sed -E \
    -e 's/^Time:.*$/Time: <duration>/' \
    -e 's/ \([0-9.]+ m?s\)$//'
  echo "--- exit code: $test_exit ---"
  echo
  echo "\$ npx prettier --check ."
  if fmt_out="$(npx prettier --check . 2>&1)"; then fmt_exit=0; else fmt_exit=$?; fi
  printf '%s\n' "$fmt_out"
  echo "--- exit code: $fmt_exit ---"
} > "$outdir/gates.txt"

# --- secret-scan.txt — no credential shape exists anywhere in the index.
# The 003a patterns plus a connection-string shape (migrations are the new
# file class this unit adds; a DB URL with inline credentials is the leak
# shape native to them). Patterns are written defanged; each carries a
# runtime-assembled positive control.
p=p; s=s; DOT=.; COLON=:
scan_violations=0
{
  echo "\$ git grep --cached -I -l -E <pattern>   # over the full index"
  for row in \
    "publishable-key prefix|sb_[p]ublishable_|sb_${p}ublishable_SYNTHETIC00" \
    "secret-key prefix|sb_[s]ecret_|sb_${s}ecret_SYNTHETIC00" \
    "any concrete project host|[a-z0-9-]+[.]supabase[.]co|abcdefghij.supabase${DOT}co" \
    "access token with inline value|ACCESS_TOKEN=[A-Za-z0-9]|ACCESS_TOKEN=${p}synthetic" \
    "conn string with inline credentials|postgres(ql)?[:]//[^@ ]+[:][^@ ]+@|postgres${COLON}//u:pw@h.example"; do
    label="${row%%|*}"
    rest="${row#*|}"
    pat="${rest%%|*}"
    sample="${rest#*|}"
    files="$(git grep --cached -I -l -E "$pat" | wc -l | tr -d ' ')" || files=0
    if printf '%s' "$sample" | grep -qE "$pat"; then matches=yes; else matches=no; fi
    [ "$files" = "0" ] || scan_violations=$((scan_violations + 1))
    [ "$matches" = "yes" ] || scan_violations=$((scan_violations + 1))
    echo "$label: files with matches: $files (pattern matches its synthetic sample: $matches)"
  done
  echo "--- enforced: 0 files for every pattern and every synthetic sample matched, or capture.sh exits 1 (fail closed) ---"
} > "$outdir/secret-scan.txt"
if [ "$scan_violations" -ne 0 ]; then
  echo "FAIL CLOSED: secret scan matched a tracked file or a positive control is broken ($scan_violations violation(s)) — see $outdir/secret-scan.txt" >&2
  exit 1
fi

echo "wrote sql-assertions.txt, assertions-negative-control.txt, config-provenance.txt, inventory.txt, gates.txt, secret-scan.txt, environment.txt to $outdir"
