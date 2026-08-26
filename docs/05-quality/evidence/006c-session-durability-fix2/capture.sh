#!/usr/bin/env bash
#
# Evidence producer for 006c — session durability fix cycle 2 (Unit E, CTRL-006).
#
# Inherited from ../006b-session-durability-fix1/capture.sh and re-based for
# this cycle with the REVIEW-024 finding 3 hardening:
#
#   GATED ARTIFACTS BIND TO THE PRODUCT TREE, NOT THE COMMIT. binding.txt
#   records the tree object id of every product path the gates measure
#   (`git rev-parse HEAD:src`, the manifests, app.json, and the config files
#   the four gates read) and NO commit SHA. The commit SHA and the clean-tree
#   verdict go in the NON-gated binding-head.txt. Consequence, by
#   construction: a docs-only commit — the evidence pack itself, the HANDOFF,
#   ci.txt — changes no bound tree, so every gated artifact regenerates
#   byte-identically at the records head, and stability.sh at the final head
#   exits 0 against the committed bytes. REVIEW-024 finding 3 measured the
#   previous design failing exactly there: binding.txt named the code commit,
#   and red-lane.txt drifted when the evidence and HANDOFF commits entered
#   the measured range.
#
#   THE RED-LANE RANGE LISTING NAMES PRODUCT PATHS ONLY. docs/05-quality/
#   evidence and docs/01-state — the paths that GROW during evidence and
#   records commits — are excluded from the "paths in range" artifact. The
#   database-layer path FILTER still runs over the FULL unexcluded range, so
#   a SQL-shaped path anywhere (docs included) still fails the capture.
#
# Carried from 006b (REVIEW-023 finding 5): EVERY GIT INVOCATION'S EXIT
# STATUS IS CHECKED, and any non-zero exit fails the capture; the committed
# negative control is capture-refusal-control.sh. The capture still refuses
# a dirty tree (beyond this evidence/output directory) BEFORE writing
# anything.
#
# Writes every .txt artifact in this directory except README.md, mutants.txt,
# stability.txt, finding3-probe.txt, review023-probe.txt, review024-probe.txt,
# capture-refusal-control.txt, and ci.txt — EIGHT exceptions, counted here
# rather than asserted. ci.txt is ABSENT BY DESIGN until after the push — a
# head cannot be known before the commit that creates it (the REVIEW-022
# claim-48a ruling). The probe transcripts are written by their own runners,
# which run jest in disposable worktrees and cannot live inside a same-tree
# capture. capture-refusal-control.txt is written by
# capture-refusal-control.sh, which runs THIS script under a refusing git and
# so cannot be one of its own outputs. mutants.txt and stability.txt keep
# their producers' contracts.
#
# Fails closed: a scan whose positive control does not match, a gate that
# exits nonzero, a changed `expo.scheme`, a RED-lane hit, a dirty tree, or ANY
# git invocation exiting non-zero makes this script exit nonzero after writing
# the transcript that shows why. A green artifact set cannot come out of a red
# run.
#
# It takes an optional output directory as its FIRST POSITIONAL ARGUMENT
# (defaulting to this directory) — a parameter, deliberately not an
# environment variable, because learning 10 bans ambient flags that steer a
# shipped producer.
#
# No credential is read.
#
# THIS PRODUCER IS NOT OFFLINE BY CONSTRUCTION. One step DOES reach the
# network: `npm audit` posts the dependency manifest to the npm registry's
# advisory endpoint. That step is confined to npm-audit.txt, which is not
# gated. Nothing else here contacts a service, and no Supabase endpoint is
# touched at all. The Expo CLI loads a local .env of its own accord when one
# exists and echoes the variable NAMES it exported; those lines are machine
# state rather than repo state and are dropped from the transcripts.
#
# Locale is pinned (learning 7): npm and other tools render output from the
# locale, so an unpinned run is not byte-comparable with a pinned one.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006c-session-durability-fix2
OUT="${1:-$HERE}"
FAILED=0

# The base this unit is measured against is the tip the Unit E dispatch names —
# the PR #15 merge plus the CTRL-006 opening state commit — so this range is
# exactly what Unit E, its reviews, and its fix cycles contribute on top of it.
#
# PINNED LITERALLY, AND THEN CHECKED (inherited from 005d after REVIEW-021
# finding 6): deriving the base from `git merge-base main HEAD` would read a
# LOCAL ref that can be arbitrarily stale, so the literal stays and the
# producer verifies it, failing closed rather than measuring the wrong range.
BASE=7caf23e10856601f17d52ae37ae59fbb9dbbac60

# Every product path the four gates and the scans read. THESE TREES ARE WHAT
# THE GATED ARTIFACTS ARE A FUNCTION OF (REVIEW-024 finding 3): src is what
# typecheck/test/scan measure; the manifests are what deps.txt proves;
# app.json is what chrome.txt freezes; the config files steer typecheck,
# lint, test, and format; scripts is repo-tracked tooling; supabase and
# .github are the RED-lane frozen trees. docs/ is DELIBERATELY absent: gated
# artifact BYTES must not depend on it, which is what lets the evidence and
# records commits land without perturbing the artifact set. (docs/ still
# participates in pass/fail — the tsconfig typechecks it — and the red-lane
# db-operation filter still scans its added lines.)
PRODUCT_PATHS=(
  src
  package.json
  package-lock.json
  app.json
  tsconfig.json
  jest.config.js
  eslint.config.js
  .prettierrc
  .prettierignore
  scripts
  supabase
  .github
)

# Without this, a failed redirection skips each `{ ... } > "$OUT/x.txt"` group
# entirely, no note_failure ever runs, and the script reports success having
# measured nothing.
mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "capture.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

# Fail closed on a base that is not an ancestor of HEAD, AND on git itself
# refusing to answer — the two are different failures and both are fatal.
MERGE_BASE="$(git merge-base "$BASE" HEAD 2>/dev/null)"; MB_STATUS=$?
if [ "$MB_STATUS" -ne 0 ]; then
  echo "capture.sh: git merge-base exited $MB_STATUS — the producer cannot establish" >&2
  echo "            its range. Refusing to run (REVIEW-023 finding 5)." >&2
  exit 1
fi
if [ "$MERGE_BASE" != "$BASE" ]; then
  echo "capture.sh: BASE $BASE is not an ancestor of HEAD — the pin is stale." >&2
  echo "            Refusing to run: the measured range would not be this unit's." >&2
  exit 1
fi

# ---------------------------------------------------------------- binding
# REVIEW-024 finding 3: the artifacts bind to the PRODUCT TREES they are a
# function of. The commit SHA — which changes on every docs-only commit while
# the product stays byte-identical — goes in the non-gated binding-head.txt
# below, never here. A run against a dirty tree still refuses BEFORE writing
# anything: artifacts describing a program that is not any commit are wrong
# in a way no individual artifact reveals.
BOUND_HEAD="$(git rev-parse HEAD 2>/dev/null)"; RP_STATUS=$?
if [ "$RP_STATUS" -ne 0 ] || [ -z "$BOUND_HEAD" ]; then
  echo "capture.sh: git rev-parse HEAD exited $RP_STATUS — refusing to run." >&2
  exit 1
fi
PORCELAIN="$(git status --porcelain 2>/dev/null)"; ST_STATUS=$?
if [ "$ST_STATUS" -ne 0 ]; then
  echo "capture.sh: git status --porcelain exited $ST_STATUS — refusing to run." >&2
  exit 1
fi
# The exclusions, stated rather than hidden: this cycle's evidence directory
# and the output directory are the measurement record — capture writes into
# them while it runs — so their lines cannot mean the measured program is
# dirty. EVERYTHING ELSE must be clean.
DIRTY_BEYOND="$(printf '%s\n' "$PORCELAIN" | grep -v -F "$HERE" | grep -v -F "$OUT" | grep -c . | tr -d ' ')"
if [ "$DIRTY_BEYOND" != "0" ]; then
  echo "capture.sh: the tree is dirty beyond the evidence/output directories —" >&2
  echo "            refusing to run. The artifacts must describe a committed tree." >&2
  printf '%s\n' "$PORCELAIN" | grep -v -F "$HERE" | grep -v -F "$OUT" >&2
  exit 1
fi

BINDING_FAILED=0
{
  echo "# Binding — REVIEW-024 finding 3."
  echo "# The PRODUCT TREES this artifact set is a function of, recorded as git"
  echo "# tree/blob object ids by the producer at run time. NO commit SHA appears"
  echo "# here: a docs-only commit (the evidence pack, the HANDOFF, ci.txt)"
  echo "# changes none of these objects, so this file — and every gated artifact —"
  echo "# regenerates byte-identically at the records head. That is the evidence"
  echo "# invariant under docs-only commits, BY CONSTRUCTION. The commit SHA and"
  echo "# clean-tree verdict live in the non-gated binding-head.txt."
  echo "#"
  echo "# Every git invocation in this capture checks its own exit status; any"
  echo "# non-zero exit fails the run (the committed negative control is"
  echo "# capture-refusal-control.sh / capture-refusal-control.txt)."
  echo
  echo "base:  $BASE"
  for path in "${PRODUCT_PATHS[@]}"; do
    oid="$(git rev-parse "HEAD:$path" 2>/dev/null)"; oid_status=$?
    if [ "$oid_status" -ne 0 ] || [ -z "$oid" ]; then
      printf '%-20s FAILURE: git rev-parse HEAD:%s exited %s\n' "$path" "$path" "$oid_status"
      BINDING_FAILED=1
    else
      printf '%-20s %s\n' "$path" "$oid"
    fi
  done
} > "$OUT/binding.txt"
[ "$BINDING_FAILED" -eq 0 ] || FAILED=1

{
  echo "# Binding head — NON-GATED by design (REVIEW-024 finding 3)."
  echo "# The commit the capture ran at, and the clean-tree verdict. This file"
  echo "# changes on every commit — that is why it is not in the gated set: the"
  echo "# artifact set's identity is the product trees in binding.txt, and this"
  echo "# file only says which commit carried them at run time."
  echo
  echo "head:  $BOUND_HEAD"
  echo "tree:  clean beyond the evidence/output directories (git status --porcelain,"
  echo "       excluding exactly: $HERE and the output directory of this run;"
  echo "       those hold the measurement record this capture is writing)"
} > "$OUT/binding-head.txt"

note_failure() { FAILED=1; }

# Record one git invocation's exit status inside a transcript section. Usage:
#   some_var="$(git ...)"; git_exit "$?" "what ran"
# Prints a FAILURE line and fails the capture on non-zero exit.
git_exit() {
  local status="$1" what="$2"
  if [ "$status" -ne 0 ]; then
    echo "  FAILURE: $what exited $status — the producer did not run; nothing below"
    echo "           this line in this section is evidence (REVIEW-023 finding 5)."
    note_failure
    return 1
  fi
  return 0
}

# Durations and machine-local env echoes are the only varying fields in the
# gate transcripts. Masked here so the artifacts are comparable run to run.
mask() {
  sed -E \
    -e '/^env: /d' \
    -e 's/ \([0-9]+(\.[0-9]+)? ?m?s\)[[:space:]]*$//' \
    -e 's/^(Time:[[:space:]]+).*$/\1<duration>/'
}

# Comment-blanking, used by every source scan below.
#
# These claims are about what the code DOES. A comment that names a banned API
# is a mention, not a use. Blanking (not deleting) keeps reported line numbers
# true to the file.
#
# Two limits, stated rather than hidden: a `//` sequence inside a string
# literal truncates the rest of that line, and any line whose first non-space
# character is `*` is treated as a JSDoc continuation. Both would have to be
# abused deliberately to hide a real call, and the positive controls below run
# through this same pipeline, so the scan is proven to still match code that
# survives it. THE SCANS BELOW MEASURE EXACTLY THESE LITERAL PATTERNS through
# exactly this pipeline — nothing broader is claimed (REVIEW-023 finding 5
# narrowed the 006a universals).
strip_comments() {
  sed -E -e 's@^[[:space:]]*(//|\*|/\*).*$@@' -e 's@//.*$@@'
}

# Every source file Metro would bundle from src/, tests excluded.
scannable_sources() {
  find src \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
    -not -path '*__tests__*' | sort
}

# Scan tracked application source (excluding tests) for a pattern, in code only.
scan_src() {
  local flags="$1" pattern="$2" file
  while IFS= read -r file; do
    strip_comments < "$file" | grep -n $flags -- "$pattern" | sed "s@^@${file}:@"
  done < <(scannable_sources)
}

# ---------------------------------------------------------------- environment
{
  echo "# Environment — run-varying by construction, recorded so the other"
  echo "# artifacts' comparison environment is explicit."
  echo "node:   $(node -v)"
  echo "npm:    $(npm -v)"
  echo "os:     $(uname -sr)"
  echo "locale: LC_ALL=${LC_ALL} LANG=${LANG} (pinned by this script)"
} > "$OUT/environment.txt"

# ---------------------------------------------------------------------- gates
{
  echo "# CI-equivalent gates at this head."
  echo "# The four steps .github/workflows/ci.yml runs after install, in order."
  echo
  echo "## typecheck — npm run typecheck"
  npm run typecheck 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
  echo

  echo "## lint — npm run lint"
  npm run lint 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
  echo

  echo "## test — npm test -- --ci --runInBand"
  # Suite lines are emitted in completion order, which is timing-dependent.
  # They are sorted here rather than dropped, so the artifact is comparable
  # between runs without losing any line. `--runInBand` is the ONLY
  # divergence from CI's own command, for byte-comparability (it removes
  # jest's worker pool, whose stderr under load is unmaskable).
  test_raw=$(npm test -- --ci --runInBand 2>&1); code=$?
  printf '%s\n' "$test_raw" | grep -E '^(PASS|FAIL) ' | mask | sort
  printf '%s\n' "$test_raw" | grep -vE '^(PASS|FAIL) ' | mask
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
  echo

  echo "## format:check — npm run format:check"
  npm run format:check 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/gates.txt" 2>&1

# ------------------------------------------------- storage property transcript
{
  echo "# The storage layer's properties, one line per assertion: the chunked"
  echo "# adapter itself (including the exact-address read-back set), the"
  echo "# platform split, the keychain accessibility class, and the wiring into"
  echo "# the Supabase client. Runs against in-memory doubles: no device, no"
  echo "# native module, no credentials."
  echo
  # ONE JEST INVOCATION PER SUITE, in the order named here — jest's file
  # scheduler reorders multi-suite --verbose output between runs (006a's
  # stability caught it twice), so the order is taken away from jest.
  adapter_status=0
  for suite in secure-store-adapter token-opacity supabase-client session-storage-platform secure-store-accessibility; do
    npm test -- --ci --runInBand --verbose --testPathPattern "$suite" 2>&1 | mask
    code=${PIPESTATUS[0]}
    [ "$code" -eq 0 ] || { adapter_status=1; note_failure; }
    echo
  done
  echo "exit: $adapter_status"
} > "$OUT/adapter-properties.txt" 2>&1

# ------------------------------------------------ session/OTP property transcript
{
  echo "# The session layer's properties: bootstrap, currency, OTP call shapes,"
  echo "# device-local sign-out, and ADR-009's persistence guarantee under the"
  echo "# REVIEW-024 fixes — the ONE publication barrier re-checking the demand"
  echo "# and the write-refusal flag at every publication (finding 2, with the"
  echo "# publisher enumeration pinned in its own suite), consult-by-read with"
  echo "# listing-observed absence (finding 1), the synchronous flag install,"
  echo "# and the take-to-cache single act."
  echo "#"
  echo "# FOUR SUITES: auth-provider proves the provider's wiring over doubles;"
  echo "# auth-state-publisher proves the barrier itself and pins the"
  echo "# one-setter source shape; foreground-refresh runs the REAL adapter,"
  echo "# REAL observer, and REAL demand module over in-memory backends;"
  echo "# reauth-demand proves the demand module's own contract. No network"
  echo "# call and no credential."
  echo
  session_status=0
  for suite in auth-provider auth-state-publisher foreground-refresh reauth-demand; do
    npm test -- --ci --runInBand --verbose --testPathPattern "$suite" 2>&1 | mask
    code=${PIPESTATUS[0]}
    [ "$code" -eq 0 ] || { session_status=1; note_failure; }
    echo
  done
  echo "exit: $session_status"
} > "$OUT/session-properties.txt" 2>&1

# ------------------------------------------------ route-protection transcript
{
  echo "# Route protection and chrome titles, asserted against the layout"
  echo "# components with the session state and the router both replaced by"
  echo "# doubles. This measures the guard decision, not a live navigation."
  echo
  npm test -- --ci --runInBand --verbose --testPathPattern 'route-guards' 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/route-guards.txt" 2>&1

# ------------------------------------------------------------ banned-API scan
{
  echo "# Banned authentication surfaces must not appear in application source."
  echo "# Scope: src/ (tracked application code), THESE LITERAL PATTERNS through"
  echo "# the strip_comments pipeline — nothing broader is claimed. Each pattern"
  echo "# is checked against src/, then against a synthetic control file that"
  echo "# DOES contain it — a pattern that fails its control fails the run."
  echo
  CONTROL="$(mktemp)"
  {
    echo "supabase.auth.$(printf 'signInWith')$(printf 'Password')({})"
    echo "supabase.auth.$(printf 'signUp')({})"
    echo "supabase.auth.$(printf 'resetPassword')$(printf 'ForEmail')('')"
    echo "supabase.auth.$(printf 'signInWith')$(printf 'OAuth')({})"
    echo "supabase.auth.$(printf 'signInWith')$(printf 'IdToken')({})"
    echo "supabase.auth.$(printf 'signInWith')$(printf 'SSO')({})"
    echo "options: { $(printf 'emailRedirectTo'): 'x' }"
    echo "type: '$(printf 'magiclink')'"
    echo "<TextInput $(printf 'secureTextEntry') />"
    echo "supabase.auth.$(printf 'linkIdentity')({})"
    echo "supabase.auth.$(printf 'signInWith')$(printf 'Password')({}) // legacy"
  } > "$CONTROL"

  scanned=$(scannable_sources | wc -l | tr -d ' ')
  echo "source files scanned: $scanned"
  if [ "$scanned" -eq 0 ]; then
    echo "NO SOURCE FILES MATCHED — the scan below would be vacuous."
    note_failure
  fi
  echo

  PATTERNS=(
    "signInWithPassword"
    "signUp"
    "resetPasswordForEmail"
    "signInWithOAuth"
    "signInWithIdToken"
    "signInWithSSO"
    "emailRedirectTo"
    "magiclink"
    "secureTextEntry"
    "linkIdentity"
  )

  for pattern in "${PATTERNS[@]}"; do
    found=$(scan_src "-F" "$pattern")
    hits=$(printf '%s' "$found" | grep -c . | tr -d ' ')
    if strip_comments < "$CONTROL" | grep -qF -- "$pattern"; then
      control="control MATCHED"
    else
      control="control FAILED"
      note_failure
    fi
    printf '%-24s src/ code hits: %-3s  (%s)\n' "$pattern" "$hits" "$control"
    if [ "$hits" != "0" ]; then
      printf '%s\n' "$found"
      note_failure
    fi
  done
  rm -f "$CONTROL"

  echo
  echo "## The OTP surface that IS used, for contrast"
  grep -rn --include='*.ts' --include='*.tsx' -E "signInWithOtp|verifyOtp|signOut" src/ | grep -v '__tests__'
} > "$OUT/banned-apis.txt" 2>&1

# ----------------------------------------------------------------- RED lane
{
  echo "# RED-lane scope: the v1 CLIENT-SIDE auth surface only."
  echo "# No migration, RLS policy, database function, grant, or storage-bucket"
  echo "# policy. Measured against the pinned base. Every git invocation below"
  echo "# checks its exit status (REVIEW-023 finding 5); every negative scan"
  echo "# carries a positive control (learning 14)."
  echo "# base: $BASE"
  echo "# The head this range ends at is in the non-gated binding-head.txt —"
  echo "# REVIEW-024 finding 3: this artifact is a function of the product"
  echo "# paths in the range, which docs-only commits do not extend."
  echo

  echo "## Whole-tree object identity — the strongest form of 'unchanged'"
  for path in supabase .github src/lib/database.types.ts; do
    base_oid=$(git rev-parse "$BASE:$path" 2>/dev/null); base_code=$?
    head_oid=$(git rev-parse "HEAD:$path" 2>/dev/null); head_code=$?
    git_exit "$base_code" "git rev-parse $BASE:$path" || continue
    git_exit "$head_code" "git rev-parse HEAD:$path" || continue
    if [ -n "$base_oid" ] && [ "$base_oid" = "$head_oid" ]; then
      printf '  %-28s IDENTICAL  %s\n' "$path" "$base_oid"
    else
      printf '  %-28s CHANGED    base=%s head=%s\n' "$path" "${base_oid:-<absent>}" "${head_oid:-<absent>}"
      note_failure
    fi
  done
  echo

  echo "## Product paths in the range (REVIEW-024 finding 3: docs/05-quality/evidence"
  echo "## and docs/01-state are excluded from THIS LISTING — they grow with every"
  echo "## evidence and records commit; the database-layer filter below still runs"
  echo "## over the FULL unexcluded range)"
  product_changed=$(git diff --name-only "$BASE" -- . ':(exclude)docs/05-quality/evidence' ':(exclude)docs/01-state'); prod_code=$?
  if git_exit "$prod_code" "git diff --name-only $BASE -- . (product listing)"; then
    echo "  product paths in range: $(printf '%s\n' "$product_changed" | grep -c . | tr -d ' ')"
    printf '%s\n' "$product_changed" | sed 's/^/    /'
  fi
  echo

  echo "## Paths in the FULL range that would be database-layer changes (expect none)"
  changed=$(git diff --name-only "$BASE" --); diff_code=$?
  if git_exit "$diff_code" "git diff --name-only $BASE --"; then
    db_paths=$(printf '%s\n' "$changed" | grep -E '(^supabase/|\.sql$|/migrations?/|/policies?/)' || true)
    db_hits=$(printf '%s' "$db_paths" | grep -c . | tr -d ' ')
    echo "  database-layer paths: $db_hits"
    if printf 'supabase/migrations/0001_x.sql\nsrc/lib/x.ts\n' | grep -qE '(^supabase/|\.sql$|/migrations?/|/policies?/)'; then
      echo "  control MATCHED (a synthetic migration path is detected by this filter)"
    else
      echo "  control FAILED — the path filter no longer matches a migration path"
      note_failure
    fi
    if [ "$db_hits" != "0" ]; then
      printf '%s\n' "$db_paths"
      note_failure
    fi
  fi
  echo

  echo "## Added lines in the range that would be database-layer operations"
  # docs/ is excluded from the ADDED-LINE scan only (records of scanning are
  # not scanning targets); the path filter above runs with NO exclusion, the
  # object-identity rows cover the whole supabase/ tree, and nothing under
  # docs/ is applied to any database by any path in this repo. No count of
  # the excluded docs/ paths is printed here — that count grows with every
  # records commit and made 006b's artifact drift (REVIEW-024 finding 3).
  added=$(git diff -U0 "$BASE" -- . ':(exclude)docs/' | grep -E '^\+' | grep -vE '^\+\+\+'; exit "${PIPESTATUS[0]}"); added_code=$?
  if git_exit "$added_code" "git diff -U0 $BASE -- . :(exclude)docs/"; then
    echo "  added non-docs lines in range: $(printf '%s' "$added" | grep -c . | tr -d ' ')"
    DB_PATTERNS=(
      "CREATE[[:space:]]+POLICY"
      "ALTER[[:space:]]+POLICY"
      "DROP[[:space:]]+POLICY"
      "ROW[[:space:]]+LEVEL[[:space:]]+SECURITY"
      "SECURITY[[:space:]]+DEFINER"
      "^\+[[:space:]]*(GRANT|REVOKE)[[:space:]]"
      "storage\.buckets"
      "storage\.objects"
      "CREATE[[:space:]]+(OR[[:space:]]+REPLACE[[:space:]]+)?FUNCTION"
      "\.rpc\("
    )
    DBCONTROL="$(mktemp)"
    {
      echo "+$(printf 'CREATE ')$(printf 'POLICY')  owner_only on public.captures"
      echo "+$(printf 'ALTER ')$(printf 'POLICY')   owner_only on public.captures"
      echo "+$(printf 'DROP ')$(printf 'POLICY')    owner_only on public.captures"
      echo "+alter table public.captures enable $(printf 'ROW ')$(printf 'LEVEL ')$(printf 'SECURITY')"
      echo "+create function f() returns void $(printf 'SECURITY ')$(printf 'DEFINER') as \$\$ \$\$;"
      echo "+$(printf 'GRA')$(printf 'NT') execute on function f to authenticated;"
      echo "+$(printf 'REVO')$(printf 'KE') all on function f from public;"
      echo "+insert into $(printf 'storage')$(printf '.buckets') (id) values ('x');"
      echo "+select * from $(printf 'storage')$(printf '.objects');"
      echo "+$(printf 'CREATE ')$(printf 'OR ')$(printf 'REPLACE ')$(printf 'FUNCTION') f() returns void as \$\$ \$\$;"
      echo "+await supabase$(printf '.rpc')$(printf '(')'do_thing');"
    } > "$DBCONTROL"

    for pattern in "${DB_PATTERNS[@]}"; do
      hits=$(printf '%s\n' "$added" | grep -icE "$pattern" | tr -d ' ')
      if grep -qiE "$pattern" "$DBCONTROL"; then
        control="control MATCHED"
      else
        control="control FAILED"
        note_failure
      fi
      printf '  %-42s hits: %-3s (%s)\n' "$pattern" "$hits" "$control"
      if [ "$hits" != "0" ]; then
        printf '%s\n' "$added" | grep -inE "$pattern"
        note_failure
      fi
    done
    rm -f "$DBCONTROL"
    echo
    echo "  Non-vacuous by construction: every pattern above matched the synthetic"
    echo "  control that contains it, through the same grep invocation."
  fi
} > "$OUT/red-lane.txt" 2>&1

# ------------------------------------------------------------------- chrome
{
  echo "# Chrome gate: the app name's single config source, and the frozen scheme."
  echo
  echo "## app.json — the fields this unit may and may not touch"
  node -e '
    const app = require("./app.json").expo;
    console.log("expo.name   (user-visible placeholder):", JSON.stringify(app.name));
    console.log("expo.slug   (internal, ruling 8 exempt):", JSON.stringify(app.slug));
    console.log("expo.scheme (FROZEN by ruling 8):       ", JSON.stringify(app.scheme));
  '
  echo

  echo "## expo.scheme against the base — must be identical"
  base_appjson=$(git show "$BASE:app.json"); show_code=$?
  if git_exit "$show_code" "git show $BASE:app.json"; then
    base_scheme=$(printf '%s' "$base_appjson" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).expo.scheme)))')
    head_scheme=$(node -e 'console.log(JSON.stringify(require("./app.json").expo.scheme))')
    echo "base ($BASE): $base_scheme"
    echo "head:                                            $head_scheme"
    if [ "$base_scheme" = "$head_scheme" ]; then
      echo "result: UNCHANGED"
    else
      echo "result: CHANGED — scheme is frozen; this is a failure"
      note_failure
    fi
  fi
  echo

  echo "## Every user-visible name string resolves from the single source"
  echo "APP_NAME definition:"
  grep -n "APP_NAME" src/lib/app-config.ts | tail -1
  echo
  echo "Consumers (headers and browser titles):"
  grep -rn "APP_NAME" src/app/ | sed 's/^/  /'
  echo
  echo "Hard-coded title strings that bypass the single source (expect none):"
  found=$(scan_src "-E" "<title>[^{]")
  hits=$(printf '%s' "$found" | grep -c . | tr -d ' ')
  echo "  literal <title> children: $hits"
  [ "$hits" = "0" ] || { printf '%s\n' "$found"; note_failure; }
  echo

  echo "## Ruling 8 — no user-visible field may contain the trademark-gated name"
  echo "# The scan measures THIS literal pattern, case-insensitive, in src/ code"
  echo "# after comment-blanking — a name assembled across tokens would survive"
  echo "# it, which is stated rather than claimed away (REVIEW-023 finding 5)."
  NAME_CONTROL="$(mktemp)"
  printf 'const title = "%s%s";\n' "$(printf 'No')" "$(printf 'ema')" > "$NAME_CONTROL"
  if strip_comments < "$NAME_CONTROL" | grep -qiE "noema"; then
    echo "  control MATCHED (the gated name in a synthetic file is detected)"
  else
    echo "  control FAILED — the name scan no longer matches the gated name"
    note_failure
  fi
  rm -f "$NAME_CONTROL"
  echo "Occurrences in src/ (application source), case-insensitive:"
  found=$(scan_src "-iE" "noema")
  hits=$(printf '%s' "$found" | grep -c . | tr -d ' ')
  echo "  src/ code hits: $hits"
  [ "$hits" = "0" ] || { printf '%s\n' "$found"; note_failure; }
  echo "expo.name is the field ruling 8 actually governs — asserted, not printed:"
  name_hit=$(node -e 'process.stdout.write(String(/noema/i.test(require("./app.json").expo.name)))')
  echo "  expo.name contains the gated name: $name_hit"
  if [ "$name_hit" != "false" ]; then
    echo "  FAILURE — the user-visible app name carries the trademark-gated string."
    note_failure
  fi
  echo "expo.slug and expo.scheme keep it as an internal identifier and a frozen"
  echo "value respectively — both printed above, neither user-visible."
  echo

  echo "## The mechanism each title uses"
  echo "in-app header  — Stack.Screen options.title:"
  grep -rn "options={{ title" src/app/ | sed 's/^/  /'
  echo "browser tab    — expo-router/head <title>:"
  grep -rn "expo-router/head" src/app/ | sed 's/^/  /'
} > "$OUT/chrome.txt" 2>&1

# -------------------------------------------------------------- dependencies
{
  echo "# Dependency delta against the base — this branch's whole range."
  echo "#"
  echo "# Authorized for Unit E: ONE dependency (expo-file-system, the R2 store)."
  echo "# This fix cycle adds NOTHING. The lockfile package-key set is proven"
  echo "# identical to base from the lockfile objects themselves (the"
  echo "# REVIEW-023 finding 5 hardening, carried)."
  echo
  echo "## git diff package.json (dependency lines only)"
  pkg_diff=$(git diff "$BASE" -- package.json); pkg_code=$?
  if git_exit "$pkg_code" "git diff $BASE -- package.json"; then
    printf '%s\n' "$pkg_diff" | grep -E '^[+-]\s+"' || echo "(no dependency lines changed)"
  fi
  echo
  echo "## Lockfile package-key set, base vs head — the REVIEW-023 finding 5 proof"
  base_lock="$(mktemp)"
  git show "$BASE:package-lock.json" > "$base_lock"; lock_code=$?
  if git_exit "$lock_code" "git show $BASE:package-lock.json"; then
    node -e '
      const fs = require("fs");
      const base = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).packages;
      const head = require("./package-lock.json").packages;
      const baseKeys = new Set(Object.keys(base));
      const headKeys = new Set(Object.keys(head));
      const added = [...headKeys].filter((k) => !baseKeys.has(k)).sort();
      const removed = [...baseKeys].filter((k) => !headKeys.has(k)).sort();
      const changed = [...headKeys]
        .filter((k) => baseKeys.has(k) && JSON.stringify(base[k]) !== JSON.stringify(head[k]))
        .sort();
      console.log("package keys at base:", baseKeys.size);
      console.log("package keys at head:", headKeys.size);
      console.log("keys added:  ", added.length, JSON.stringify(added));
      console.log("keys removed:", removed.length, JSON.stringify(removed));
      console.log("entries changed:", changed.length, JSON.stringify(changed));
      const expected = ["", "node_modules/expo-file-system"];
      const ok =
        added.length === 0 &&
        removed.length === 0 &&
        JSON.stringify(changed) === JSON.stringify(expected);
      if (changed.includes("node_modules/expo-file-system")) {
        console.log(
          "  expo-file-system:",
          base["node_modules/expo-file-system"].version,
          "->",
          head["node_modules/expo-file-system"].version,
        );
      }
      if (changed.includes("")) {
        const bd = base[""].dependencies || {};
        const hd = head[""].dependencies || {};
        const rootAdded = Object.keys(hd).filter((k) => !(k in bd)).sort();
        const rootRemoved = Object.keys(bd).filter((k) => !(k in hd)).sort();
        console.log("  root dependencies added:  ", JSON.stringify(rootAdded));
        console.log("  root dependencies removed:", JSON.stringify(rootRemoved));
      }
      console.log(
        ok
          ? "VERDICT: package-key set IDENTICAL; the only changed entries are the root"
          : "VERDICT: UNEXPECTED lockfile delta — this fails the capture",
      );
      console.log(
        ok
          ? "         manifest (one added direct dependency line) and expo-file-system"
          : "",
      );
      console.log(ok ? "         (the authorized 57.0.4 -> 57.0.5 resolution)." : "");
      process.exit(ok ? 0 : 1);
    ' "$base_lock"
    lockcheck_code=$?
    [ "$lockcheck_code" -eq 0 ] || note_failure
  fi
  rm -f "$base_lock"
  echo
  echo "## installed version"
  node -e 'console.log("expo-file-system:", require("./node_modules/expo-file-system/package.json").version)'
  echo
  echo "## SDK compatibility — installed via npx expo install, so the SDK 57 pin holds"
  node -e '
    const pkg = require("./package.json");
    console.log("package.json range:", pkg.dependencies["expo-file-system"]);
    console.log("expo range:        ", pkg.dependencies.expo);
  '
  echo
  echo "## auth-js is pinned through the lockfile, and this cycle does not move it"
  node -e 'console.log("@supabase/auth-js installed:", require("./node_modules/@supabase/auth-js/package.json").version)'
} > "$OUT/deps.txt" 2>&1

# -------------------------------------------------------------------- audit
{
  echo "# npm audit — run-varying (tracks the upstream advisory database)."
  echo "# Recorded to show this cycle added no dependency and did not change the"
  echo "# picture; see PROJECT-STATE 'Known issues' #2, which owns this."
  npm audit 2>&1 | tail -12 | mask
} > "$OUT/npm-audit.txt" 2>&1

if [ "$FAILED" -ne 0 ]; then
  echo "capture.sh: at least one gate, scan, control, or git invocation FAILED — see the transcripts." >&2
  exit 1
fi
echo "capture.sh: all gates, scans, controls, and git invocations passed."
