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
repo_root="$(pwd)" # for the pinned prettier binary used by the format gate
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

# --- assertions-negative-control.txt — the permanent neighbor battery, and
# the source of truth for what README.md is allowed to claim. Each scenario
# makes one mutation on a fresh scratch copy, tags the enumerated class whose
# pinning it demonstrates, and must produce the named FAIL and exit 1.
#
# Three independent cross-checks, all fail-closed (REVIEW-013 finding 3 gave
# the first; REVIEW-015 finding 1 gave the third):
#   * the scenario count is computed from the run counter and compared to the
#     enumerated `scenario:` lines actually written;
#   * every scenario must carry a class tag;
#   * the SET OF CLASSES demonstrated here is compared to the set README.md
#     enumerates under "What the oracle proves", and README's claimed list is
#     required to be duplicate-free so the set comparison cannot be satisfied
#     by two names collapsing into one (REVIEW-016 finding 1 boundary). A
#     class README claims but no
#     scenario demonstrates fails this script, and so does a class
#     demonstrated here but missing from README. The claim is therefore
#     derived from the battery rather than asserted alongside it: a class that
#     cannot be demonstrated gets removed from the claim, not defended in
#     prose.
# Mutations happen on scratch copies only; the repo is never touched.
control_violations=0
control_scenarios=0
control_classes=""
{
  echo "# Permanent neighbor battery / negative control: verify-migrations.mjs must"
  echo "# go red on each tampered copy. Each scenario: fresh copy of"
  echo "# supabase/migrations into scratch, one mutation, one run. Expected: exit 1"
  echo "# and the named assertion FAILs. This is the complete battery — every"
  echo "# neighbor class the 004a claims name is enumerated below and run here,"
  echo "# and the class cross-check at the end is what entitles README.md to name"
  echo "# a class at all."
  run_scenario() {
    class="$1"; label="$2"; expect_fail_on="$3"
    if out="$(SQLPARSE_NODE_MODULES="$scratch/parser" MIGRATIONS_DIR="$scratch/tamper" \
      node "$evdir/verify-migrations.mjs" 2>&1)"; then t_exit=0; else t_exit=$?; fi
    if printf '%s\n' "$out" | grep -qF "FAIL $expect_fail_on"; then hit=yes; else hit=no; fi
    [ "$t_exit" -eq 1 ] || control_violations=$((control_violations + 1))
    [ "$hit" = "yes" ] || control_violations=$((control_violations + 1))
    control_scenarios=$((control_scenarios + 1))
    control_classes="$control_classes$class
"
    echo
    echo "scenario: $label"
    echo "pinned class: $class"
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
  run_scenario "RLS" "FORCE ROW LEVEL SECURITY removed from captures" \
    "public.captures: FORCE ROW LEVEL SECURITY"

  fresh
  awk '/create policy transcripts_delete_own/{skip=3} skip>0{skip--; next} {print}' "$RLS" \
    > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "RLS" "transcripts DELETE policy deleted" \
    "public.transcripts delete: one permissive policy TO authenticated, (select auth.uid()) = user_id"

  fresh
  sed 's/for insert to authenticated/for insert to anon/' "$STOR" > "$scratch/t" \
    && mv "$scratch/t" "$STOR"
  run_scenario "RLS" "storage INSERT policy widened to anon" \
    "storage.objects insert: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on WITH CHECK"

  fresh
  sed 's/references public.captures (id, user_id) on delete cascade/references public.captures (id) on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "composite FK narrowed to capture_id only (user_id consistency lost)" \
    "user_id-consistency guarantee: composite FK (capture_id, user_id) -> public.captures (id, user_id) ON DELETE CASCADE"

  fresh
  sed "s/security definer/security invoker/" "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "Functions" "provisioning function demoted to SECURITY INVOKER" \
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''"

  echo
  echo "== group 2: append-class mutations (audit workflow findings) =="

  fresh
  printf '\nalter table public.captures disable row level security;\n' >> "$RLS"
  run_scenario "RLS" "DISABLE ROW LEVEL SECURITY appended after the enable/force block" \
    "public.captures: ENABLE ROW LEVEL SECURITY"

  fresh
  printf '\ncreate policy captures_extra on captures for select to authenticated using (true);\n' >> "$RLS"
  run_scenario "RLS" "schema-unqualified USING (true) policy appended" \
    "every policy names its schema explicitly (public or storage) and the total is exactly 17 — an unqualified or extra policy cannot hide"

  echo
  echo "== group 3: exact-value neighbor (REVIEW-011 finding 2) =="

  fresh
  sed 's/check (duration_ms >= 0)/check (duration_ms >= -1)/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Constraint values and operators" "duration_ms CHECK value shifted to its neighbor (>= -1)" \
    "captures.duration_ms integer, nullable, CHECK (duration_ms >= 0)"

  echo
  echo "== group 4: absence classes (REVIEW-012 finding 2) =="

  fresh
  sed 's/  duration_ms integer/  duration_ms integer default 0/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "DEFAULT 0 added to captures.duration_ms (declared default-free; REVIEW-012 finding 2 reproduction)" \
    "public.captures: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  sed '/create table public.captures (/,/^);/ s/id uuid primary key default gen_random_uuid()/id uuid primary key default gen_random_uuid(null)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint values and operators" "captures.id default mutated to gen_random_uuid(null) — same function name, argument added" \
    "captures.id uuid PRIMARY KEY DEFAULT gen_random_uuid()"

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id)/constraint captures_user_id_fkey references auth.users (email)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "captures.user_id FK referenced-attribute list mutated to (email)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false) on conflict (id) do nothing;/" \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "Storage bucket row" "ON CONFLICT DO NOTHING appended to the bucket insert (idempotency neighbor)" \
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — exactly one VALUES row of exactly three values, plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING"

  echo
  echo "== group 5: the remaining fix-cycle-2 absence classes, made permanent"
  echo "== (REVIEW-013 finding 3 — these were previously run in scratch only) =="

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id) on delete cascade/constraint captures_user_id_fkey references auth.users (id) on update cascade on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "captures.user_id FK given ON UPDATE CASCADE (declared NO ACTION)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/constraint captures_user_id_fkey references auth.users (id) on delete cascade/constraint captures_user_id_fkey references auth.users (id) match full on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "captures.user_id FK match type changed to MATCH FULL (declared MATCH SIMPLE)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/constraint captures_user_id_fkey/constraint captures_user_id_fk/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "captures.user_id FK constraint renamed (Phase B evidence keys off the name)" \
    "captures.user_id uuid NOT NULL FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  sed 's/on table public.profiles to authenticated;/on table public.profiles to authenticated with grant option;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "Grants" "profiles grant given WITH GRANT OPTION (re-grantable)" \
    "each of the three tables is granted exactly select,insert,update,delete — table-object grants, no per-column privilege list, no WITH GRANT OPTION"

  fresh
  sed 's/create index captures_user_id_idx/create unique index captures_user_id_idx/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Indexes" "captures_user_id_idx made UNIQUE (one capture per user)" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  fresh
  sed 's/create index captures_user_id_idx on public.captures (user_id);/create index captures_user_id_idx on public.captures (user_id) where user_id is not null;/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Indexes" "captures_user_id_idx made partial (WHERE user_id is not null)" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  fresh
  perl -0777 -pi -e 's/create trigger profiles_set_updated_at\n  before update on public\.profiles\n  for each row execute/create trigger profiles_set_updated_at\n  before update on public.profiles\n  for each row when (old.* is distinct from new.*) execute/' \
    "$CORE"
  run_scenario "Triggers" "profiles updated_at trigger given a WHEN clause (conditional maintenance)" \
    "BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at) — unconditional: no WHEN clause and no UPDATE OF column list"

  fresh
  perl -0777 -pi -e 's/create function public\.set_updated_at\(\)\nreturns trigger\nlanguage plpgsql\nset search_path = \x27\x27/create function public.set_updated_at()\nreturns trigger\nlanguage plpgsql\nset search_path = \x27\x27\nset statement_timeout = \x275s\x27/' \
    "$CORE"
  run_scenario "Functions" "set_updated_at given an extra SET (statement_timeout) beyond the pinned search_path" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  perl -0777 -pi -e 's/create function public\.set_updated_at\(\)\nreturns trigger\nlanguage plpgsql\n/create function public.set_updated_at()\nreturns trigger\nlanguage plpgsql\nstrict\n/' \
    "$CORE"
  run_scenario "Functions" "set_updated_at declared STRICT (null-input behavior changed)" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  perl -0777 -pi -e 's/  created_at timestamptz not null default now\(\),\n  updated_at timestamptz not null default now\(\)\n\);/  created_at timestamptz(3) not null default now(),\n  updated_at timestamptz not null default now()\n);/' \
    "$CORE"
  run_scenario "Column types" "profiles.created_at given a typmod (timestamptz(3) — precision truncated)" \
    "profiles.created_at timestamptz NOT NULL DEFAULT now()"

  fresh
  sed "s/constraint profiles_locale_check check (locale in ('en', 'ar'))/constraint profiles_locale_check check (locale in ('en', 'ar')) constraint profiles_locale_check2 check (locale <> '')/" \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "second CHECK added to profiles.locale" \
    "public.profiles: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  sed 's/  display_name text,/  display_name text unique,/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "column UNIQUE added to profiles.display_name" \
    "public.profiles: per-column constraint-type multiset is exactly the declared set — no default, check, unique, or other constraint is added to or missing from any column"

  fresh
  perl -0777 -pi -e 's/  created_at timestamptz not null default now\(\),\n  updated_at timestamptz not null default now\(\)\n\);/  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now(),\n  constraint profiles_extra_check check (locale is not null)\n);/' \
    "$CORE"
  run_scenario "Constraint presence and absence" "table-level CHECK added to profiles" \
    "public.profiles: table-level constraints are exactly [none] and no INHERITS/PARTITION BY/OF type/tablespace/IF NOT EXISTS clause exists"

  fresh
  sed 's/constraint captures_id_user_id_key unique (id, user_id)/constraint captures_id_user_id_key unique nulls not distinct (id, user_id)/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "captures UNIQUE (id, user_id) given NULLS NOT DISTINCT" \
    "captures UNIQUE (id, user_id) — the referenced key for the composite FK"

  echo
  echo "== group 6: the REVIEW-013 finding 2 classes — parse-valid neighbors the"
  echo "== oracle accepted green before this fix cycle =="

  fresh
  sed "s/check (status in ('recorded', 'transcribing', 'ready', 'failed'))/check (status not in ('recorded', 'transcribing', 'ready', 'failed'))/" \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint values and operators" "captures.status CHECK inverted to NOT IN (same value list, opposite meaning)" \
    "captures.status CHECK (status IN ('recorded','transcribing','ready','failed'))"

  fresh
  perl -0777 -pi -e 's/create policy captures_select_own on public\.captures\n  for select to authenticated\n  using \(\(select auth\.uid\(\)\) = user_id\);/create policy captures_select_own on public.captures\n  for select to authenticated\n  using ((select auth.uid() where false) = user_id);/' \
    "$RLS"
  run_scenario "RLS" "captures SELECT policy subquery given WHERE false (predicate never matches)" \
    "public.captures select: one permissive policy TO authenticated, (select auth.uid()) = user_id"

  fresh
  sed 's/grant select, insert, update, delete on table public.profiles to authenticated;/grant select(id), insert, update, delete on table public.profiles to authenticated;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "Grants" "profiles SELECT narrowed to a column-only grant, SELECT(id)" \
    "each of the three tables is granted exactly select,insert,update,delete — table-object grants, no per-column privilege list, no WITH GRANT OPTION"

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false), ('neighbor-public', 'neighbor-public', true);/" \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "Storage bucket row" "second VALUES row appended to the bucket insert, creating a public bucket" \
    "bucket captures-audio created private: INSERT storage.buckets (id, name, public) VALUES ('captures-audio', 'captures-audio', false) — exactly one VALUES row of exactly three values, plain insert, no ON CONFLICT (deliberately non-idempotent), no RETURNING"

  fresh
  sed 's/  before update on public.profiles/  before update of display_name on public.profiles/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Triggers" "profiles updated_at trigger narrowed to UPDATE OF display_name" \
    "BEFORE UPDATE row triggers run set_updated_at on exactly profiles and captures (transcripts has no updated_at) — unconditional: no WHEN clause and no UPDATE OF column list"

  fresh
  sed 's/create index captures_user_id_idx on public.captures (user_id);/create index captures_user_id_idx on public.captures (user_id) include (id);/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Indexes" "INCLUDE (id) added to captures_user_id_idx" \
    "FK-supporting indexes: captures(user_id), transcripts(capture_id,user_id), transcripts(user_id) — each plain btree, non-unique, unpredicated, no INCLUDE list, expected name"

  echo
  echo "== group 7: the REVIEW-015 finding 1 classes — parse-valid neighbors that"
  echo "== changed a property a named class SAYS it pins, and still ran green. Two"
  echo "== defect shapes: an operator whose AST kind differs while its name does"
  echo "== not (IS DISTINCT FROM / IS NOT DISTINCT FROM / ANY / ALL are all named"
  echo "== '='), and a grammar clause riding on a node whose shape went unread =="

  fresh
  mv "$scratch/tamper/20260820100000_v1_core_schema.sql" \
    "$scratch/tamper/20250101000000_v1_core_schema.sql"
  run_scenario "Set shape" "core migration timestamp prefix renamed (accepted suffix kept)" \
    "migration files are exactly the four v1 files, whole filenames, in apply order"

  fresh
  printf 'select 1;\n' > "$scratch/tamper/20260820100400_v1_extra.txt"
  run_scenario "Set shape" "fifth non-.sql file added to the migrations directory" \
    "the migrations directory holds exactly those four files and nothing else"

  fresh
  perl -0777 -pi -e 's/  updated_at timestamptz not null default now\(\)\n\);/  updated_at timestamptz not null default now(),\n  like pg_catalog.pg_class excluding all\n);/' \
    "$CORE"
  run_scenario "Entity inventory" "LIKE pg_catalog.pg_class EXCLUDING ALL added to profiles (columns arrive from a source table, not the compared list)" \
    "every table element is a ColumnDef or a Constraint"

  fresh
  sed 's/create trigger profiles_set_updated_at/create trigger zzz_renamed_trigger/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Entity inventory" "profiles updated_at trigger renamed" \
    "the three trigger names are exactly profiles_set_updated_at, captures_set_updated_at, on_auth_user_created"

  fresh
  sed 's/  display_name text,/  display_name text collate "C",/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Column types" "profiles.display_name given COLLATE \"C\" (comparison semantics changed beside an unchanged type name)" \
    "every ColumnDef carries only colname/typeName/is_local/constraints"

  fresh
  sed 's/  audio_path text,/  audio_path text storage external,/' "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Column types" "captures.audio_path given STORAGE EXTERNAL" \
    "every ColumnDef carries only colname/typeName/is_local/constraints"

  fresh
  sed 's/^create table public.profiles (/create unlogged table public.profiles (/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "profiles created UNLOGGED (not crash-safe, not replicated)" \
    "CREATE TABLE nodes carry only relation/tableElts/oncommit"

  fresh
  sed "s/check (locale in ('en', 'ar'))/check (locale in ('en', 'ar')) no inherit/" "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint presence and absence" "profiles.locale CHECK given NO INHERIT" \
    "every column and table constraint carries only its declared fields"

  fresh
  sed 's/check (duration_ms >= 0)/check (duration_ms >= any (array[0]))/' "$CORE" \
    > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Constraint values and operators" "duration_ms CHECK operator changed to >= ANY (array[0]) — same operator NAME, different AST kind" \
    "captures.duration_ms integer, nullable, CHECK (duration_ms >= 0)"

  fresh
  sed 's/create index captures_user_id_idx on public.captures (user_id);/create index captures_user_id_idx on public.captures (user_id desc);/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Indexes" "captures_user_id_idx key column given DESC ordering" \
    "every index key is a plain column in default sort order"

  fresh
  sed 's/create index captures_user_id_idx/create index concurrently captures_user_id_idx/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Indexes" "captures_user_id_idx made CONCURRENTLY" \
    "every CREATE INDEX carries only idxname/relation/accessMethod/indexParams"

  fresh
  sed 's/  after insert on auth.users/  after insert on auth.users\n  referencing new table as nt/' \
    "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "Triggers" "provisioning trigger given REFERENCING NEW TABLE AS nt" \
    "the three trigger names are exactly profiles_set_updated_at, captures_set_updated_at, on_auth_user_created"

  fresh
  sed 's/create trigger on_auth_user_created/create or replace trigger on_auth_user_created/' \
    "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "Triggers" "provisioning trigger made CREATE OR REPLACE" \
    "the three trigger names are exactly profiles_set_updated_at, captures_set_updated_at, on_auth_user_created"

  fresh
  sed "s/set search_path = ''/set search_path = '', public/" "$CORE" > "$scratch/t" \
    && mv "$scratch/t" "$CORE"
  run_scenario "Functions" "set_updated_at search_path widened to '', public (only the first argument was compared)" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  sed "s/set search_path = ''/set search_path = '', public/" "$PROV" > "$scratch/t" \
    && mv "$scratch/t" "$PROV"
  run_scenario "Functions" "handle_new_user search_path widened to '', public — public resolvable again inside the SECURITY DEFINER body" \
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''"

  fresh
  sed 's/create function public.handle_new_user()/create or replace function public.handle_new_user()/' \
    "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "Functions" "handle_new_user made CREATE OR REPLACE (silently redefines an existing definer function)" \
    "every CREATE FUNCTION carries only funcname/returnType/options"

  fresh
  sed 's/on table public.profiles to authenticated;/on table public.profiles to authenticated granted by postgres;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "Grants" "profiles grant given GRANTED BY postgres (grantor changed)" \
    "every GRANT is an object-level, RESTRICT-behaviour grant of whole-table privileges"

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)\(storage\.foldername\(name\)\)\[1\] = /$1(storage.foldername(name))[1] is distinct from /s' \
    "$STOR"
  run_scenario "RLS" "storage SELECT folder-owner equality reversed to IS DISTINCT FROM — the confidentiality predicate inverted (REVIEW-015 finding 1, decisive case)" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)bucket_id = /$1bucket_id is distinct from /s' \
    "$STOR"
  run_scenario "RLS" "storage SELECT bucket equality reversed to IS DISTINCT FROM (policy now matches every OTHER bucket)" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_update_own.*?)\(storage\.foldername\(name\)\)\[1\] = /$1(storage.foldername(name))[1] is not distinct from /s' \
    "$STOR"
  run_scenario "RLS" "storage UPDATE folder predicate changed to IS NOT DISTINCT FROM (null folder stops failing closed)" \
    "storage.objects update: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on USING and WITH CHECK"

  fresh
  sed 's/create policy profiles_provisioning_insert on public.profiles/create policy profiles_provisioning_insert on public.profiles as restrictive/' \
    "$PROV" > "$scratch/t" && mv "$scratch/t" "$PROV"
  run_scenario "RLS" "provisioning policy made AS RESTRICTIVE (the one policy whose permissiveness was never compared)" \
    "every policy carries only its name/table/command/permissiveness/roles/predicates, and all 17 are PERMISSIVE"

  fresh
  sed 's/alter table public.profiles force row level security;/alter table only public.profiles force row level security;/' \
    "$RLS" > "$scratch/t" && mv "$scratch/t" "$RLS"
  run_scenario "RLS" "profiles FORCE ROW LEVEL SECURITY given ONLY" \
    "every ALTER TABLE targets a plain table by name — no ONLY, no IF EXISTS, no non-table objtype"

  fresh
  sed 's/insert into storage.buckets (id, name, public)/insert into storage.buckets (id, name, public) overriding user value/' \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "Storage bucket row" "bucket insert given OVERRIDING USER VALUE" \
    "the bucket INSERT carries only relation/cols/selectStmt/override"

  echo
  echo "== group 8: the REVIEW-016 finding 1 classes — the audit of EVERY named"
  echo "== class for the defect shape REVIEW-016 found in one of them: a class"
  echo "== claims exactness while the assertion reads only PART of a node's"
  echo "== structure. Twenty-five accepted in-class neighbors across four classes,"
  echo "== closed at three structural causes: a subscript list read by position"
  echo "== instead of whole; a function-call shape test that existed for column"
  echo "== defaults but was not shared with the predicate call sites; and named"
  echo "== things compared without the helper that marks their neighbors =="

  for pol in select insert update delete; do
    case "$pol" in
      select) expect="storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped" ;;
      insert) expect="storage.objects insert: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on WITH CHECK" ;;
      update) expect="storage.objects update: one policy TO authenticated, bucket-pinned and {user_id}/-scoped on USING and WITH CHECK" ;;
      delete) expect="storage.objects delete: one policy TO authenticated, bucket-pinned and {user_id}/-scoped" ;;
    esac
    fresh
    perl -0777 -pi -e "s/(create policy captures_audio_${pol}_own.*?)\(storage\.foldername\(name\)\)\[1\]/\$1(storage.foldername(name))[1][2]/s" "$STOR"
    run_scenario "RLS" "storage $pol folder lookup given a second subscript: (storage.foldername(name))[1][2] — apply-valid (PostgreSQL returns NULL for the wrong number of subscripts), so the owner predicate is UNKNOWN for every row and owners are denied (REVIEW-016 finding 1, decisive case)" \
      "$expect"
  done

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)\(storage\.foldername\(name\)\)\[1\]/$1(storage.foldername(name))[1:1]/s' "$STOR"
  run_scenario "RLS" "storage SELECT folder subscript made the slice [1:1] (uidx still 1; is_slice and lidx went unread)" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  for arg in "variadic name" "distinct name" "name order by 1"; do
    fresh
    perl -0777 -pi -e "s/(create policy captures_audio_select_own.*?)storage\.foldername\(name\)/\$1storage.foldername($arg)/s" "$STOR"
    run_scenario "RLS" "storage SELECT folder call given an aggregate clause: storage.foldername($arg)" \
      "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"
  done

  for clause in "filter (where true)" "over ()"; do
    fresh
    perl -0777 -pi -e "s/(create policy captures_audio_select_own.*?)(storage\.foldername\(name\))/\$1\$2 $clause/s" "$STOR"
    run_scenario "RLS" "storage SELECT folder call given $clause" \
      "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"
  done

  for cast in "text[]" "pg_catalog.text[]"; do
    fresh
    perl -0777 -pi -e "s/(create policy captures_audio_select_own.*?)auth\.uid\(\)::text/\$1auth.uid()::$cast/s" "$STOR"
    run_scenario "RLS" "storage SELECT owner cast widened to ::$cast (array neighbor of the pinned scalar cast; the schema qualifier must not erase the array marker)" \
      "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"
  done

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)auth\.uid\(\)::text/$1auth.uid(*)::text/s' "$STOR"
  run_scenario "RLS" "storage SELECT initplan call given a star argument: auth.uid(*)" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)(auth\.uid\(\))/$1$2 over ()/s' "$STOR"
  run_scenario "RLS" "storage SELECT initplan call given OVER ()" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  fresh
  perl -0777 -pi -e 's/(create policy captures_audio_select_own.*?)\(select (auth\.uid\(\)::text)\)/$1(select $2 as t)/s' "$STOR"
  run_scenario "RLS" "storage SELECT initplan target given an output alias: (select auth.uid()::text as t)" \
    "storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped"

  fresh
  perl -0777 -pi -e 's/(create policy profiles_select_own.*?)\(select auth\.uid\(\)\)/$1(select auth.uid() as u)/s' "$RLS"
  run_scenario "RLS" "profiles SELECT initplan target given an output alias: (select auth.uid() as u)" \
    "public.profiles select: one permissive policy TO authenticated, (select auth.uid()) = id"

  fresh
  perl -0777 -pi -e 's/(create policy profiles_select_own.*?)auth\.uid\(\)/$1auth.uid(*)/s' "$RLS"
  run_scenario "RLS" "profiles SELECT initplan call given a star argument: auth.uid(*)" \
    "public.profiles select: one permissive policy TO authenticated, (select auth.uid()) = id"

  for clause in "over ()" "filter (where true)"; do
    fresh
    perl -0777 -pi -e "s/(create policy profiles_select_own.*?)(auth\.uid\(\))/\$1\$2 $clause/s" "$RLS"
    run_scenario "RLS" "profiles SELECT initplan call given $clause" \
      "public.profiles select: one permissive policy TO authenticated, (select auth.uid()) = id"
  done

  fresh
  sed "s/values ('captures-audio', 'captures-audio', false);/values ('captures-audio', 'captures-audio', false, true);/" \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "Storage bucket row" "bucket INSERT VALUES row given a fourth expression (the row COUNT was pinned; the row's item count was not)" \
    "bucket captures-audio created private"

  fresh
  sed 's/insert into storage.buckets (id, name, public)/insert into storage.buckets (id, name, public[1])/' \
    "$STOR" > "$scratch/t" && mv "$scratch/t" "$STOR"
  run_scenario "Storage bucket row" "bucket INSERT target column given subscript indirection: public[1] (the compared name list prints \"public\" either way)" \
    "the bucket INSERT carries only relation/cols/selectStmt/override"

  fresh
  perl -0777 -pi -e 's/create function public\.set_updated_at\(\)\nreturns trigger/create function public.set_updated_at()\nreturns trigger[]/s' "$CORE"
  run_scenario "Functions" "set_updated_at return type made the array neighbor trigger[] (the return type was joined without the typmod/array marking every column type already gets)" \
    "set_updated_at: returns trigger, plpgsql, SECURITY INVOKER, search_path pinned to ''"

  fresh
  perl -0777 -pi -e 's/create function public\.handle_new_user\(\)\nreturns trigger/create function public.handle_new_user()\nreturns trigger[]/s' "$PROV"
  run_scenario "Functions" "handle_new_user return type made the array neighbor trigger[]" \
    "handle_new_user: returns trigger, plpgsql, SECURITY DEFINER, search_path pinned to ''"

  fresh
  sed 's/references auth.users (id) on delete cascade/references somedb.auth.users (id) on delete cascade/' \
    "$CORE" > "$scratch/t" && mv "$scratch/t" "$CORE"
  run_scenario "Foreign keys" "auth.users FKs given a catalog qualifier: references somedb.auth.users (id) — the one relation reference that did not go through isPlainRel, and the compared name drops catalogname" \
    "profiles.id FK -> auth.users(id) ON DELETE CASCADE"

  fresh
  perl -0777 -pi -e 's/references public\.captures \(id, user_id\)/references somedb.public.captures (id, user_id)/s' "$CORE"
  run_scenario "Foreign keys" "composite FK referenced table given a catalog qualifier: references somedb.public.captures (id, user_id)" \
    "user_id-consistency guarantee: composite FK (capture_id, user_id) -> public.captures (id, user_id) ON DELETE CASCADE"

  # --- the claim is derived from the battery above, not asserted beside it.
  # README.md may name a class in "What the oracle proves" only if some
  # scenario here demonstrates the oracle rejects a neighbor changing it. Both
  # lists are computed independently and compared; a difference in either
  # direction fails this script (REVIEW-015 finding 1).
  readme_raw="$(sed -n '/^\*\*Enumerated classes/,/^\*\*What it does not prove/p' \
    "$evdir/README.md" | sed -n 's/^[0-9][0-9]*\. \*\*\([^*]*\)\*\*.*/\1/p')"
  readme_classes="$(printf '%s' "$readme_raw" | grep -v '^$' | sort -u)"
  battery_classes="$(printf '%s' "$control_classes" | grep -v '^$' | sort -u)"
  # `sort -u` collapses duplicates on BOTH sides, so a README that names one
  # class twice would still compare equal to a battery that tags one scenario
  # twice — a boundary REVIEW-016 finding 1 demonstrated on a disposable
  # countercontrol. The claimed list is the side a claim is read off, so it is
  # required to be duplicate-free before the comparison.
  readme_dupes="$(printf '%s' "$readme_raw" | grep -v '^$' | sort | uniq -d | paste -sd'; ' -)"
  only_readme="$(comm -23 <(printf '%s\n' "$readme_classes") <(printf '%s\n' "$battery_classes") | grep -v '^$' | paste -sd'; ' -)"
  only_battery="$(comm -13 <(printf '%s\n' "$readme_classes") <(printf '%s\n' "$battery_classes") | grep -v '^$' | paste -sd'; ' -)"
  if [ "$readme_classes" = "$battery_classes" ] && [ -z "$readme_dupes" ]; then
    classes_match=yes
  else
    classes_match=no
    control_violations=$((control_violations + 1))
  fi
  echo
  echo "== class coverage cross-check: what entitles README.md to name a class =="
  echo "# The left list is derived from the class tag on every scenario actually run"
  echo "# above; the right list is parsed from README.md's own enumerated list under"
  echo "# \"What the oracle proves\". capture.sh exits 1 unless they are identical, so"
  echo "# a class cannot be claimed without a permanent control demonstrating it, and"
  echo "# a control cannot silently drop out of the claim."
  echo
  echo "classes demonstrated by this battery ($(printf '%s\n' "$battery_classes" | grep -c .)):"
  printf '%s\n' "$battery_classes" | sed 's/^/  - /'
  echo
  echo "classes claimed by README.md ($(printf '%s\n' "$readme_classes" | grep -c .)):"
  printf '%s\n' "$readme_classes" | sed 's/^/  - /'
  echo
  echo "claimed but not demonstrated: ${only_readme:-<none>} (must be <none>)"
  echo "demonstrated but not claimed: ${only_battery:-<none>} (must be <none>)"
  echo "duplicate class names in README's claimed list: ${readme_dupes:-<none>} (must be <none>)"
  echo "class lists identical: $classes_match (yes required)"

  echo
  echo "scenarios run: $control_scenarios"
  echo "--- enforced: every scenario exits 1 with its named FAIL line; every scenario"
  echo "--- carries a class tag; the run count equals the enumerated scenario lines;"
  echo "--- and the demonstrated class set equals README's claimed set — or"
  echo "--- capture.sh exits 1 ---"
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
# Every scenario must carry a class tag, or the class cross-check above would
# be computed over a subset of the battery and still report a match.
tagged="$(grep -c '^pinned class: ' "$outdir/assertions-negative-control.txt")"
if [ "$tagged" -ne "$control_scenarios" ]; then
  echo "FAIL CLOSED: $control_scenarios scenarios ran but only $tagged carry a class tag" >&2
  control_violations=$((control_violations + 1))
fi
if [ "$classes_match" != "yes" ]; then
  echo "FAIL CLOSED: the classes README.md claims and the classes this battery demonstrates do not correspond — claimed-not-demonstrated: ${only_readme:-<none>}; demonstrated-not-claimed: ${only_battery:-<none>}; duplicate claimed names: ${readme_dupes:-<none>}" >&2
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
  echo "\$ prettier --check .   # pinned local binary, in a clean checkout-index of the staged tree"
  echo "# Normalization (adopted from ../004b-schema-rls-live/capture.sh, which already"
  echo "# measured it this way): the check runs against exactly the staged tree (git"
  echo "# checkout-index into scratch), because prettier walks untracked working-copy"
  echo "# files and does not read nested ignore rules — the owner's machine-local"
  echo "# supabase/.temp CLI residue (untracked, ignored by supabase/.gitignore, and"
  echo "# left by the 2026-08-20 owner apply session) is otherwise flagged, reddening"
  echo "# this step over machine state rather than repo state. CI checks out only the"
  echo "# tracked tree, so this measures what the CI step measures."
  fmt_scratch="$(mktemp -d)"
  git checkout-index -a --prefix="$fmt_scratch/tree/"
  if fmt_out="$(cd "$fmt_scratch/tree" && "$repo_root/node_modules/.bin/prettier" --check . 2>&1)"; then fmt_exit=0; else fmt_exit=$?; fi
  rm -rf "$fmt_scratch"
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
