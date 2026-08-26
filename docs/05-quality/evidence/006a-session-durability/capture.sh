#!/usr/bin/env bash
#
# Evidence producer for 006a — session durability (Unit E, CTRL-006).
#
# Inherited from ../005d-auth-session-fix3/capture.sh (the 005d instruments the
# dispatch names), re-based and re-scoped for this unit.
#
# Writes every .txt artifact in this directory except README.md, mutants.txt,
# stability.txt, finding3-probe.txt, and ci.txt. FIVE exceptions, counted here
# rather than asserted (the 005c manifest miscount is why this sentence exists).
# ci.txt is ABSENT BY DESIGN until after the push — a head cannot be known
# before the commit that creates it (the REVIEW-022 claim-48a ruling); claim it
# NOT RUN. finding3-probe.txt is written by finding3-probe.sh, which runs jest
# in disposable worktrees and cannot live inside a same-tree capture.
# Fails closed: a scan whose positive control does not match, a
# gate that exits nonzero, a changed `expo.scheme`, or a RED-lane hit makes this
# script exit nonzero after writing the transcript that shows why. A green
# artifact set cannot come out of a red run.
#
# It takes an optional output directory as its FIRST POSITIONAL ARGUMENT
# (defaulting to this directory) — a parameter, deliberately not an environment
# variable, because learning 10 bans ambient flags that steer a shipped producer.
#
# No credential is read.
#
# THIS PRODUCER IS NOT OFFLINE BY CONSTRUCTION. One step DOES reach the network:
# `npm audit` posts the dependency manifest to the npm registry's advisory
# endpoint. That step is confined to npm-audit.txt, which is not gated. Nothing
# else here contacts a service, and no Supabase endpoint is touched at all.
# Stated this loudly because REVIEW-020 finding 7 found the cycle-1 README and
# HANDOFF describing this script as "offline by construction" while this header
# already said otherwise — the records disagreed with the producer they
# described, and with the artifact it produced. The Expo CLI loads a
# local .env of its own accord when one exists and echoes the variable NAMES it
# exported; those lines are machine state rather than repo state and are dropped
# from the transcripts (same treatment as ../005a-auth-session).
#
# Locale is pinned (learning 7): npm and other tools render output from the
# locale, so an unpinned run is not byte-comparable with a pinned one.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
OUT="${1:-docs/05-quality/evidence/006a-session-durability}"
FAILED=0

# The base this unit is measured against is the tip the dispatch names — the
# PR #15 merge plus the CTRL-006 opening state commit — so this range is
# exactly what Unit E contributes on top of it.
#
# PINNED LITERALLY, AND THEN CHECKED (inherited from 005d after REVIEW-021
# finding 6): deriving the base from `git merge-base main HEAD` would read a
# LOCAL ref that can be arbitrarily stale — this unit's own preflight found
# local main one merge behind origin — so the literal stays and the producer
# verifies it, failing closed rather than measuring the wrong range.
BASE=7caf23e10856601f17d52ae37ae59fbb9dbbac60

# Without this, a failed redirection skips each `{ ... } > "$OUT/x.txt"` group
# entirely, no note_failure ever runs, and the script reports success having
# measured nothing.
mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "capture.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

# Fail closed on a base that is not an ancestor of HEAD: a pin left behind by a
# later merge measures the wrong range, and every artifact downstream of it is
# then wrong in a way no individual artifact reveals. This runs BEFORE anything
# is written, because a stale-base run should produce no artifacts at all rather
# than a set that looks complete.
if [ "$(git merge-base "$BASE" HEAD 2>/dev/null)" != "$BASE" ]; then
  echo "capture.sh: BASE $BASE is not an ancestor of HEAD — the pin is stale." >&2
  echo "            Refusing to run: the measured range would not be this unit's." >&2
  exit 1
fi

note_failure() { FAILED=1; }

# Durations and machine-local env echoes are the only varying fields in the gate
# transcripts. Masked here so the artifacts are comparable run to run. Exactly
# two normalizations, plus dropping the Expo CLI's `env:` echo. There is
# deliberately NO general mid-line duration rule: `\b` means a word boundary to
# GNU sed and a literal `b` to BSD sed, so such a rule is inert on macOS and
# fires on CI's ubuntu-latest — the same head would produce two different gated
# transcripts, and it would mask real text (a test name containing "60s") rather
# than a duration field.
mask() {
  sed -E \
    -e '/^env: /d' \
    -e 's/ \([0-9]+(\.[0-9]+)? ?m?s\)[[:space:]]*$//' \
    -e 's/^(Time:[[:space:]]+).*$/\1<duration>/'
}

# Comment-blanking, used by every source scan below.
#
# These claims are about what the code DOES. A comment that names a banned API
# is a mention, not a use — the JSDoc on `sendOtp` states that it never passes
# `emailRedirectTo`, and a bare identifier scan reads that sentence as a hit.
# Blanking (not deleting) keeps reported line numbers true to the file.
#
# Two limits, stated rather than hidden: a `//` sequence inside a string literal
# truncates the rest of that line, and any line whose first non-space character
# is `*` is treated as a JSDoc continuation. Both would have to be abused
# deliberately to hide a real call, and the positive controls below run through
# this same pipeline, so the scan is proven to still match code that survives it.
strip_comments() {
  sed -E -e 's@^[[:space:]]*(//|\*|/\*).*$@@' -e 's@//.*$@@'
}

# Every source file Metro would bundle from src/, tests excluded. `.js`/`.jsx`
# are included because Metro bundles them too — restricting the scan to
# TypeScript would let a banned call ship in a plain `.js` file unseen.
scannable_sources() {
  find src \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
    -not -path '*__tests__*' | sort
}

# Scan tracked application source (excluding tests) for a pattern, in code only.
# $1 = grep flags, $2 = pattern. Prints file:line:text.
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
  # between runs without losing any line.
  #
  # `--runInBand` is the ONLY divergence from CI's own command, and it is here
  # for byte-comparability rather than speed: it removes jest's worker pool,
  # whose stderr under load is the one thing in this section that is neither
  # sorted nor masked. It is also the exact invocation REVIEW-019's own fresh
  # reviewer run used. Steps, order, and exit codes still match
  # `.github/workflows/ci.yml`; only the worker count differs.
  #
  # One stability run early in this cycle reported `gates.txt` DIFFERS and was
  # never reproduced or explained — disclosed in README.md rather than written
  # off. It is NOT the reordering that `adapter-properties.txt` suffered and
  # that is fixed below: this section prints one line per suite and sorts them.
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
# Verbose, so every asserted property is named in the artifact rather than
# summarised as a count. This is the per-claim instrument for the storage layer:
# the adapter, the platform split that decides where it is used, the keychain
# accessibility class ADR-005 fixes, and the client wiring REVIEW-019 finding 8
# showed was never measured.
{
  echo "# The storage layer's properties, one line per assertion: the chunked"
  echo "# adapter itself, the platform split that decides where it is used, the"
  echo "# keychain accessibility class, and the wiring into the Supabase client."
  echo "# Runs against in-memory doubles: no device, no native module, no"
  echo "# credentials. See README.md for what the doubles do and do not model."
  echo
  # ONE JEST INVOCATION PER SUITE, in the order named here.
  #
  # A single invocation covering all four was not byte-stable, and two stability
  # runs caught it. With `--verbose` jest prints each suite's whole assertion
  # tree as a block, and it orders the FILES by its own scheduling heuristic —
  # slowest-first from its timing cache — so the blocks change places between
  # runs as timings drift. `--runInBand` does not fix this: the ordering is
  # jest's file scheduler, not worker completion, and it survives a single
  # worker. The gate transcript escapes it only because it prints one line per
  # suite and sorts them; a multi-line block cannot be sorted without being
  # destroyed.
  #
  # So the order is taken away from jest rather than normalized afterwards.
  # Each suite runs alone, which leaves nothing to order, and the sequence below
  # is the producer's choice: the adapter first because it carries the bulk of
  # the claims, then the three surfaces around it.
  adapter_status=0
  # `token-opacity` is new this cycle and belongs here: it is a property of
  # the adapter module, just measured by reading its source instead of its
  # results. REVIEW-020 finding 3 is why it cannot be a behavioural test.
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
  echo "# device-local sign-out, and ADR-009's persistence guarantee — the"
  echo "# observed purge (read-back as the only proof), the durable"
  echo "# re-authentication demand and its bootstrap consult, and the"
  echo "# record-then-absorb write path."
  echo "#"
  echo "# TWO SUITES, and the split is deliberate. In auth-provider the supabase"
  echo "# client module is replaced by a double, which is what REVIEW-020 finding 1"
  echo "# said could never observe the property: method spies cannot see a storage"
  echo "# write. So foreground-refresh runs the REAL chunked adapter over a real"
  echo "# in-memory keychain and produces the refused write by actually refusing"
  echo "# one. The provider suite proves the wiring; the foreground-refresh suite"
  echo "# proves the behaviour."
  echo "#"
  echo "# No network call and no credential is involved in either."
  echo
  # `--runInBand` for the same reason as the gate above, and it matters more
  # here: with `--verbose`, jest prints each suite's whole assertion tree under
  # its own PASS line in COMPLETION order, which reorders under load. The gate
  # transcript can sort its one line per suite; a multi-line block cannot be
  # sorted without destroying it. One worker makes the order deterministic
  # instead. This is what a stability run caught, twice, before it was fixed.
  session_status=0
  for suite in auth-provider foreground-refresh reauth-demand; do
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
  # `--runInBand` for the same reason as the gate above, and it matters more
  # here: with `--verbose`, jest prints each suite's whole assertion tree under
  # its own PASS line in COMPLETION order, which reorders under load. The gate
  # transcript can sort its one line per suite; a multi-line block cannot be
  # sorted without destroying it. One worker makes the order deterministic
  # instead. This is what a stability run caught, twice, before it was fixed.
  npm test -- --ci --runInBand --verbose --testPathPattern 'route-guards' 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/route-guards.txt" 2>&1

# ------------------------------------------------------------ banned-API scan
# Every pattern carries a positive control assembled at run time, so a scan
# that finds nothing is proven to be a scan that still works.
{
  echo "# Banned authentication surfaces must not appear in application source."
  echo "# Scope: src/ (tracked application code). Each pattern is checked"
  echo "# against src/, then against a synthetic control file that DOES contain"
  echo "# it — a pattern that fails its control is reported and fails the run."
  echo

  CONTROL="$(mktemp)"
  # Assembled at run time so this scanner's own source does not contain the
  # very tokens it scans for.
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
    # Carries a trailing line comment, so the control exercises the blanking
    # branch instead of passing through strip_comments untouched.
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
    # The control goes through the same blanking, so a control match proves the
    # instrument still matches real code after stripping.
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
# REVIEW-019 established the client-only scope at the Git-object boundary by
# reviewer inspection. This makes it a producer artifact instead, so the
# property is re-measured on every capture rather than re-argued each review.
# Every negative scan carries a positive control (learning 14).
{
  echo "# RED-lane scope: the v1 CLIENT-SIDE auth surface only."
  echo "# No migration, RLS policy, database function, grant, or storage-bucket"
  echo "# policy. Measured against current main, which is this branch's merge base."
  echo "# base: $BASE"
  echo "#"
  echo "# The path and added-line scans compare the base against the WORKING TREE,"
  echo "# so uncommitted work is measured rather than a commit behind it. The three"
  echo "# object-identity comparisons are against committed HEAD, which is what the"
  echo "# Git-object boundary means; an uncommitted change under supabase/ would"
  echo "# still be caught by the path filter below, which reads the working tree."
  echo

  echo "## Whole-tree object identity — the strongest form of 'unchanged'"
  for path in supabase .github src/lib/database.types.ts; do
    base_oid=$(git rev-parse "$BASE:$path" 2>/dev/null)
    head_oid=$(git rev-parse "HEAD:$path" 2>/dev/null)
    if [ -n "$base_oid" ] && [ "$base_oid" = "$head_oid" ]; then
      printf '  %-28s IDENTICAL  %s\n' "$path" "$base_oid"
    else
      printf '  %-28s CHANGED    base=%s head=%s\n' "$path" "${base_oid:-<absent>}" "${head_oid:-<absent>}"
      note_failure
    fi
  done
  echo

  echo "## Paths in the range that would be database-layer changes (expect none)"
  changed=$(git diff --name-only "$BASE" --)
  echo "  paths in range: $(printf '%s\n' "$changed" | grep -c .)"
  db_paths=$(printf '%s\n' "$changed" | grep -E '(^supabase/|\.sql$|/migrations?/|/policies?/)' || true)
  db_hits=$(printf '%s' "$db_paths" | grep -c . | tr -d ' ')
  echo "  database-layer paths: $db_hits"
  # Positive control: the same pattern against a synthetic path list that DOES
  # contain such a path. A path filter that silently stopped matching would
  # otherwise report a clean range.
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
  echo

  echo "## Added lines in the range that would be database-layer operations"
  # `docs/` is excluded, and the exclusion is bounded and stated rather than
  # assumed safe. These claims are about what the CODE does. Two things under
  # docs/ name the operations this scan looks for without performing any:
  # REVIEW-019.md's prose describes the scan the reviewer ran, and this
  # directory's own transcript records the pattern list plus the synthetic
  # control that must match it. Both are records of scanning, not scanning
  # targets — the same mention-versus-use distinction `strip_comments` draws for
  # source comments. The first capture of this cycle reported exactly those
  # self-references as hits and exited 1, as designed.
  #
  # The exclusion cannot hide a real database change. The path filter above runs
  # over the WHOLE range with NO exclusion and catches `.sql` anywhere,
  # `supabase/` anywhere, and any `migrations/` or `policies/` directory; the
  # three object-identity comparisons cover the entire `supabase/` tree; and
  # nothing under `docs/` is applied to any database by any path in this repo.
  excluded=$(git diff --name-only "$BASE" -- 'docs/' | grep -c . | tr -d ' ')
  echo "  docs/ paths excluded from the added-line scan: $excluded"
  echo "  (records of scanning, not scanning targets — see the note in capture.sh)"
  added=$(git diff -U0 "$BASE" -- . ':(exclude)docs/' | grep -E '^\+' | grep -vE '^\+\+\+' || true)
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
  # One synthetic diff carrying every pattern, so each is proven still able to
  # match. Assembled at run time so this file is not itself a hit.
  DBCONTROL="$(mktemp)"
  # Every literal is assembled from fragments at run time, so this scanner's own
  # source never contains the tokens it scans for. 005a's banned-API controls
  # use the same technique for the same reason.
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
  base_scheme=$(git show "$BASE:app.json" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).expo.scheme)))')
  head_scheme=$(node -e 'console.log(JSON.stringify(require("./app.json").expo.scheme))')
  echo "base ($BASE): $base_scheme"
  echo "head:                                            $head_scheme"
  if [ "$base_scheme" = "$head_scheme" ]; then
    echo "result: UNCHANGED"
  else
    echo "result: CHANGED — scheme is frozen; this is a failure"
    note_failure
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
  echo "# Dependency delta against the base — this unit's whole range."
  echo "#"
  echo "# Authorized for this unit: ONE dependency if the durable demand's store"
  echo "# needs one (dispatch), and it does: expo-file-system, the R2 store that"
  echo "# does not share the keychain's lock-state failure mode. Added with"
  echo "# npx expo install. It was ALREADY in the lockfile as a dependency of"
  echo "# the expo package itself, so the delta is the direct-dependency line"
  echo "# plus a 57.0.4 -> 57.0.5 resolution bump — no new package enters the"
  echo "# tree. The audit delta is recorded in npm-audit.txt and the HANDOFF."
  echo
  echo "## git diff package.json (dependency lines only)"
  git diff "$BASE" -- package.json | grep -E '^[+-]\s+"' || echo "(no dependency lines changed)"
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
  echo "## auth-js is pinned through the lockfile, and this unit does not move it"
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
  echo "capture.sh: at least one gate, scan, or control FAILED — see the transcripts." >&2
  exit 1
fi
echo "capture.sh: all gates, scans, and controls passed."
