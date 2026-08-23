#!/usr/bin/env bash
#
# Evidence producer for 005a — auth and session v1 (Unit D, CTRL-005).
#
# Writes every artifact in this directory except README.md and stability.sh.
# Fails closed: a scan whose positive control does not match, or a gate that
# exits nonzero, makes this script exit nonzero after writing the transcript
# that shows why. A green artifact set cannot come out of a red run.
#
# No credential is read. One step DOES reach the network — `npm audit` posts the
# dependency manifest to the npm registry's advisory endpoint — and that step is
# confined to npm-audit.txt, which is not gated. Nothing else here contacts a
# service, and no Supabase endpoint is touched at all. The Expo CLI loads
# a local .env of its own accord when one exists and echoes the variable NAMES
# it exported; those lines are machine state rather than repo state and are
# dropped from the transcripts (same treatment as ../003a-supabase-wiring).
#
# Locale is pinned (learning 7): npm and other tools render output from the
# locale, so an unpinned run is not byte-comparable with a pinned one.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
OUT="${1:-docs/05-quality/evidence/005a-auth-session}"
FAILED=0

# Without this, a failed redirection skips each `{ ... } > "$OUT/x.txt"` group
# entirely, no note_failure ever runs, and the script reports success having
# measured nothing.
mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "capture.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

note_failure() { FAILED=1; }

# Durations and machine-local env echoes are the only varying fields in the
# gate transcripts. Masked here so the artifacts are comparable run to run.
# Exactly two normalizations, plus dropping the Expo CLI's `env:` echo. There is
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

# Scan tracked application source (excluding tests) for a pattern, in code only.
# $1 = grep flags, $2 = pattern. Prints file:line:text.
scan_src() {
  local flags="$1" pattern="$2" file
  while IFS= read -r file; do
    strip_comments < "$file" | grep -n $flags -- "$pattern" | sed "s@^@${file}:@"
  done < <(scannable_sources)
}

# Every source file Metro would bundle from src/, tests excluded. `.js`/`.jsx`
# are included because Metro bundles them too — restricting the scan to
# TypeScript would let a banned call ship in a plain `.js` file unseen.
scannable_sources() {
  find src \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) \
    -not -path '*__tests__*' | sort
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

  echo "## test — npm test -- --ci"
  # Suite lines are emitted in completion order, which is timing-dependent.
  # They are sorted here rather than dropped, so the artifact is comparable
  # between runs without losing any line.
  test_raw=$(npm test -- --ci 2>&1); code=$?
  printf '%s\n' "$test_raw" | grep -E '^(PASS|FAIL) ' | mask | sort
  printf '%s\n' "$test_raw" | grep -vE '^(PASS|FAIL) ' | mask
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
  echo

  echo "## format:check — npm run format:check"
  npm run format:check 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/gates.txt" 2>&1

# ------------------------------------------------- adapter property transcript
# Verbose, so every asserted property is named in the artifact rather than
# summarised as a count. This is the per-claim instrument for the adapter.
{
  echo "# The storage layer's properties, one line per assertion: the chunked"
  echo "# adapter itself, then the platform split that decides where it is used."
  echo "# Runs against an in-memory double: no device, no native module, no"
  echo "# credentials. See README.md for what the double does and does not model."
  echo
  npm test -- --ci --verbose --testPathPattern 'secure-store-adapter|session-storage-platform' 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/adapter-properties.txt" 2>&1

# ------------------------------------------------ session/OTP property transcript
{
  echo "# The auth provider's properties: bootstrap, currency, OTP call shapes."
  echo "# The supabase client module is replaced by a double, so no network"
  echo "# call and no credential is involved."
  echo
  npm test -- --ci --verbose --testPathPattern 'auth-provider' 2>&1 | mask
  code=${PIPESTATUS[0]}
  echo "exit: $code"; [ "$code" -eq 0 ] || note_failure
} > "$OUT/session-properties.txt" 2>&1

# ------------------------------------------------ route-protection transcript
{
  echo "# Route protection and chrome titles, asserted against the layout"
  echo "# components with the session state and the router both replaced by"
  echo "# doubles. This measures the guard decision, not a live navigation."
  echo
  npm test -- --ci --verbose --testPathPattern 'route-guards' 2>&1 | mask
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

  echo "## expo.scheme against the dispatch base — must be identical"
  BASE=07ad5a51ed597f67bac523e681525c4e87fe644d
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
  echo "# Dependency delta against the dispatch base."
  echo "# Authorized: expo-secure-store, and nothing else."
  echo
  BASE=07ad5a51ed597f67bac523e681525c4e87fe644d
  echo "## git diff package.json (dependency lines only)"
  git diff "$BASE" -- package.json | grep -E '^[+-]\s+"' || echo "(no dependency lines changed)"
  echo
  echo "## installed version"
  node -e 'console.log("expo-secure-store:", require("./node_modules/expo-secure-store/package.json").version)'
  echo
  echo "## SDK compatibility — installed via npx expo install, so the SDK 57 pin holds"
  node -e '
    const pkg = require("./package.json");
    console.log("package.json range:", pkg.dependencies["expo-secure-store"]);
    console.log("expo range:        ", pkg.dependencies.expo);
  '
} > "$OUT/deps.txt" 2>&1

# -------------------------------------------------------------------- audit
{
  echo "# npm audit — run-varying (tracks the upstream advisory database)."
  echo "# Recorded to show this unit's one dependency did not change the picture;"
  echo "# see PROJECT-STATE 'Known issues' #2, which owns this."
  npm audit 2>&1 | tail -12 | mask
} > "$OUT/npm-audit.txt" 2>&1

if [ "$FAILED" -ne 0 ]; then
  echo "capture.sh: at least one gate, scan, or control FAILED — see the transcripts." >&2
  exit 1
fi
echo "capture.sh: all gates, scans, and controls passed."
