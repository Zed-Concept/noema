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

# --- assertions-negative-control.txt — the permanent neighbor battery. Every
# neighbor class this directory claims verify-migrations.mjs rejects has a
# scenario here: no claim rests on a scratch-only run (REVIEW-013 finding 3).
# Each scenario makes one mutation on a fresh scratch copy and must produce
# the named FAIL and exit 1. The scenario count is computed from the run
# counter and cross-checked against the enumerated `scenario:` lines in the
# written artifact, so the stated count cannot drift from the enumeration.
# Mutations happen on scratch copies only; the repo is never touched.
control_violations=0
control_scenarios=0
{
  echo "# Permanent neighbor battery / negative control: verify-migrations.mjs must"
  echo "# go red on each tampered copy. Each scenario: fresh copy of"
  echo "# supabase/migrations into scratch, one mutation, one run. Expected: exit 1"
  echo "# and the named assertion FAILs. This is the complete battery — every"
  echo "# neighbor class the 004a claims name is enumerated below and run here."
  run_scenario() {
    label="$1"; expect_fail_on="$2"
    if out="$(SQLPARSE_NODE_MODULES="$scratch/parser" MIGRATIONS_DIR="$scratch/tamper" \
      node "$evdir/verify-migrations.mjs" 2>&1)"; then t_exit=0; else t_exit=$?; fi
    if printf '%s\n' "$out" | grep -qF "FAIL $expect_fail_on"; then hit=yes; else hit=no; fi
    [ "$t_exit" -eq 1 ] || control_violations=$((control_violations + 1))
    [ "$hit" = "yes" ] || control_violations=$((control_violations + 1))
    control_scenarios=$((control_scenarios + 1))
    echo
    echo "scenario: $label"
    echo "expected failing assertion: $expect_fail_on"
    echo "exit code: $t_exit (1 required); named FAIL line present: $hit (yes required)"
  }
  fresh() { rm -rf "$scratch/tamper"; mkdir -p "$scratch/tamper"; cp supabase/migrations/*.sql "$scratch/tamper/"; }
  CORE="$scratch/tamper/20260820100000_v1_core_schema.sql"
  RLS="$scratch/tamper/20260820100100_v1_rls_policies.sql"
  PROV="$scratch/tamper/20260820100200_v1_profile_provisioning.sql"
  STOR="$scratch/tamper/20260820100300_v1_storage_captures_audio.sql"

  echo
  echo "== group 1: removals and narrowings =="

  fresh
  grep -v 'alter table public.captures force row level security;' "$RLS" > "$scratch/t" \
    && mv "$scratch/t" "$RLS"
  run_scenario "FORCE ROW LEVEL SECURITY removed from captures" \
    "public.captures: FORCE ROW LEVEL SECURITY"

  fresh
  awk '/create policy transcripts_delete_own/{skip=3} skip>0{skip--; next} {print}' "$RLS" \
    > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "transcripts DELETE policy deleted" \
    "public.transcripts delete: one permissive policy TO authenticated, (select auth.uid()) = user_id"

  fresh
  sed 's/for insert to authenticated/for insert to anon/' "$STOR" > "$scratch/t" \
    && mv "$scratch/t" "$STOR"
  run_scenario "storage INSERT policy widened to anon" \
    "storage.objects insert: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on WITH CHECK"

  fresh
  sed 's/references public.captures (id, user_id) on delete cascade/references public.captures (id) on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "composite FK narrowed to capture_id only (user_id consistency lost)" \
    "user_id-consistency guarantee: composite FK (capture_id, user_id) -> public.captures (id, user_id) ON DELETE CASCADE"

  fresh
  sed "s/security definer/security invoker/" "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "provisioning function demoted to SECURITY INVOKER" \
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''"

  echo
  echo "== group 2: append-class mutations (audit workflow findings) =="

  fresh
  printf '\nalter table public.captures disable row level security;\n' >> "$RLS"
  run_scenario "DISABLE ROW LEVEL SECURITY appended after the enable/force block" \
    "public.captures: ENABLE ROW LEVEL SECURITY"

  fresh
  printf '\ncreate policy captures_extra on captures for select to authenticated using (true);\n' >> "$RLS"
  run_scenario "schema-unqualified USING (true) policy appended" \
    "every policy names its schema explicitly (public or storage) and the total is exactly 17 — an unqualified or extra policy cannot hide"

  echo
  echo "== group 3: exact-value neighbor (REVIEW-011 finding 2) =="

  fresh
  sed 's/check (duration_ms >= 0)/check (duration_ms >= -1)/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "duration_ms CHECK value shifted to its neighbor (>= -1)" \
    "captures.duration_ms integer, nullable, CHECK (duration_ms >= 0)"

  echo
  echo "== group 4: absence classes (REVIEW-012 finding 2) =="

  fresh
  sed 's/  duration_ms integer/  duration_ms integer default 0/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "DEFAULT 0 added to captures.duration_ms (declared default-free; REVIEW-012 finding 2 reproduction)" \
    "public.captures: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  sed '/create table public.captures (/,/^);/ s/id uuid primary key default gen_random_uuid()/id uuid primary key default gen_random_uuid(null)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures.id default mutated to gen_random_uuid(null) — same function name, argument added" \
    "captures.id uuid PRIMARY KEY DEFAULT gen_random_uuid()"

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id)/constraint captures_user_id_fkey references auth.users (email)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures.user_id FK referenced-attribute list mutated to (email)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false) on conflict (id) do nothing;/" \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "ON CONFLICT DO NOTHING appended to the bucket insert (idempotency neighbor)" \
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — exactly one VALUES row, plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING"

  echo
  echo "== group 5: the remaining fix-cycle-2 absence classes, made permanent"
  echo "== (REVIEW-013 finding 3 — these were previously run in scratch only) =="

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id) on delete cascade/constraint captures_user_id_fkey references auth.users (id) on update cascade on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures.user_id FK given ON UPDATE CASCADE (declared NO ACTION)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id) on delete cascade/constraint captures_user_id_fkey references auth.users (id) match full on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures.user_id FK match type changed to MATCH FULL (declared MATCH SIMPLE)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/constraint captures_user_id_fkey/constraint captures_user_id_fk/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "captures.user_id FK constraint renamed (Phase B evidence keys off the name)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/on table public.profiles to authenticated;/on table public.profiles to authenticated with grant option;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "profiles grant given WITH GRANT OPTION (re-grantable)" \
    "each of the three tables is granted exactly select,insert,update,delete — table-object grants, no per-column privilege list, no WITH GRANT OPTION"

  fresh
  sed 's/create index captures_user_id_idx/create unique index captures_user_id_idx/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures_user_id_idx made UNIQUE (one capture per user)" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  fresh
  sed 's/create index captures_user_id_idx on public.captures (user_id);/create index captures_user_id_idx on public.captures (user_id) where user_id is not null;/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures_user_id_idx made partial (WHERE user_id is not null)" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  fresh
  perl -0777 -pi -e 's/create trigger profiles_set_updated_at\n  before update on public\.profiles\n  for each row execute/create trigger profiles_set_updated_at\n  before update on public.profiles\n  for each row when (old.* is distinct from new.*) execute/' \
    "$CORE"
  run_scenario "profiles updated_at trigger given a WHEN clause (conditional maintenance)" \
    "BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at) — unconditional: no WHEN clause and no UPDATE OF column list"

  fresh
  perl -0777 -pi -e 's/create function public\.set_updated_at\(\)\nreturns trigger\nlanguage plpgsql\nset search_path = \x27\x27/create function public.set_updated_at()\nreturns trigger\nlanguage plpgsql\nset search_path = \x27\x27\nset statement_timeout = \x275s\x27/' \
    "$CORE"
  run_scenario "set_updated_at given an extra SET (statement_timeout) beyond the pinned search_path" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  perl -0777 -pi -e 's/create function public\.set_updated_at\(\)\nreturns trigger\nlanguage plpgsql\n/create function public.set_updated_at()\nreturns trigger\nlanguage plpgsql\nstrict\n/' \
    "$CORE"
  run_scenario "set_updated_at declared STRICT (null-input behavior changed)" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  perl -0777 -pi -e 's/  created_at timestamptz not null default now\(\),\n  updated_at timestamptz not null default now\(\)\n\);/  created_at timestamptz(3) not null default now(),\n  updated_at timestamptz not null default now()\n);/' \
    "$CORE"
  run_scenario "profiles.created_at given a typmod (timestamptz(3) — precision truncated)" \
    "profiles.created_at timestamptz NOT NULL DEFAULT now()"

  fresh
  sed "s/constraint profiles_locale_check check (locale in ('en', 'ar'))/constraint profiles_locale_check check (locale in ('en', 'ar')) constraint profiles_locale_check2 check (locale <> '')/" \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "second CHECK added to profiles.locale" \
    "public.profiles: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  sed 's/  display_name text,/  display_name text unique,/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "column UNIQUE added to profiles.display_name" \
    "public.profiles: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  perl -0777 -pi -e 's/  created_at timestamptz not null default now\(\),\n  updated_at timestamptz not null default now\(\)\n\);/  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  constraint profiles_extra_check check (locale is not null)\n);/' \
    "$CORE"
  run_scenario "table-level CHECK added to profiles" \
    "public.profiles: table-level constraints are exactly [none] and no INHERITS/PARTITION BY/OF type/tablespace/IF NOT EXISTS clause exists"

  fresh
  sed 's/constraint captures_id_user_id_key unique (id, user_id)/constraint captures_id_user_id_key unique nulls not distinct (id, user_id)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures UNIQUE (id, user_id) given NULLS NOT DISTINCT" \
    "captures UNIQUE (id, user_id) — the referenced key for the composite FK"

  echo
  echo "== group 6: the REVIEW-013 finding 2 classes — parse-valid neighbors the"
  echo "== oracle accepted green before this fix cycle =="

  fresh
  sed "s/check (status in ('recorded', 'transcribing', 'ready', 'failed'))/check (status not in ('recorded', 'transcribing', 'ready', 'failed'))/" \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "captures.status CHECK inverted to NOT IN (same value list, opposite meaning)" \
    "captures.status CHECK (status IN ('recorded','transcribing','ready','failed'))"

  fresh
  perl -0777 -pi -e 's/create policy captures_select_own on public\.captures\n  for select to authenticated\n  using \(\(select auth\.uid\(\)\) = user_id\);/create policy captures_select_own on public.captures\n  for select to authenticated\n  using ((select auth.uid() where false) = user_id);/' \
    "$RLS"
  run_scenario "captures SELECT policy subquery given WHERE false (predicate never matches)" \
    "public.captures select: one permissive policy TO authenticated, (select auth.uid()) = user_id"

  fresh
  sed 's/grant select, insert, update, delete on table public.profiles to authenticated;/grant select(id), insert, update, delete on table public.profiles to authenticated;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "profiles SELECT narrowed to a column-only grant, SELECT(id)" \
    "each of the three tables is granted exactly select,insert,update,delete — table-object grants, no per-column privilege list, no WITH GRANT OPTION"

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false), ('neighbor-public', 'neighbor-public', true);/" \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "second VALUES row appended to the bucket insert, creating a public bucket" \
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — exactly one VALUES row, plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING"

  fresh
  sed 's/  before update on public.profiles/  before update of display_name on public.profiles/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "profiles updated_at trigger narrowed to UPDATE OF display_name" \
    "BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at) — unconditional: no WHEN clause and no UPDATE OF column list"

  fresh
  sed 's/create index captures_user_id_idx on public.captures (user_id);/create index captures_user_id_idx on public.captures (user_id) include (id);/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "INCLUDE (id) added to captures_user_id_idx" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  echo
  echo "scenarios run: $control_scenarios"
  echo "--- enforced: every scenario exits 1 with its named FAIL line, and the run"
  echo "--- count equals the enumerated scenario lines, or capture.sh exits 1 ---"
} > "$outdir/assertions-negative-control.txt"
rm -rf "$scratch/tamper"
# The count is cross-checked against the artifact's own enumeration, so the
# stated total cannot drift from the scenarios actually written (REVIEW-013
# finding 3: a claimed battery size that no artifact enumerates).
enumerated="$(grep -c '^scenario: ' "$outdir/assertions-negative-control.txt")"
if [ "$enumerated" -ne "$control_scenarios" ]; then
  echo "FAIL CLOSED: battery count mismatch — ran $control_scenarios, artifact enumerates $enumerated" >&2
  control_violations=$((control_violations + 1))
fi
if [ "$control_violations" -ne 0 ]; then
  echo "FAIL CLOSED: neighbor battery failed to discriminate ($control_violations violation(s)) — see $outdir/assertions-negative-control.txt" >&2
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
