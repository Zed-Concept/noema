#!/usr/bin/env bash
# Regenerates this directory's artifacts. Gated (byte-stable at the committed
# head, normalization stated in README.md): gates.txt, deps.txt,
# types-plumbing.txt, redaction-control.txt, secret-scan.txt. Run-varying
# (fields named in README.md): environment.txt, npm-audit.txt.
# connectivity.txt is NOT produced here — it needs owner-held credentials;
# see connectivity.sh.
#
# Fail closed (REVIEW-008 adjudication): this script exits 1 — after writing
# the transcript that shows why — if the secret scan matches any tracked file,
# if any scan positive control fails to match, or if the redaction control is
# broken. A green artifact set from a red run cannot exist.
#
# secret-scan.txt reads the index, so it follows the same fixed-point
# discipline as ../002b-fix-loop/tracked-files.sh: `git add -A`, run, and
# repeat until the output stops changing. At a committed head one run
# reproduces it.
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/003a-supabase-wiring/capture.sh [outdir]
set -u
# Locale pin (REVIEW-008 finding 1, learning 7): npm renders its dependency
# tree from the locale — UTF-8 locales draw its glyphs as `└──` where C draws
# `` `-- `` — so an unpinned producer makes deps.txt locale-variant. Every
# producer below runs under LC_ALL=C (LANG pinned too for completeness);
# environment.txt records the pinned value.
export LC_ALL=C
export LANG=C
cd "$(git rev-parse --show-toplevel)"
outdir="${1:-docs/05-quality/evidence/003a-supabase-wiring}"
mkdir -p "$outdir"

# --- environment.txt — run-varying: node, npm, and OS move with the machine.
# The locale line is the exception: it records the value this script pins, so
# it is fixed by construction, not machine state.
{
  echo "node: $(node --version)"
  echo "npm: $(npm --version)"
  echo "os: $(uname -sr)"
  echo "locale: LC_ALL=C LANG=C (pinned by capture.sh; see README normalization note)"
} > "$outdir/environment.txt"

# --- gates.txt — the five CI steps, run locally at this head.
# Normalization: npm ci's summary is reduced to its added-package count with
# the duration masked (the audited clause and advisory/funding footers are
# registry-shaped and excluded; npm-audit.txt owns advisories); jest's Time
# line is masked and any slow-suite duration suffix on the PASS line is
# stripped; lines starting "env: " are dropped (the Expo CLI prints them only
# when a local .env exists, which is machine state, not repo state).
{
  echo "# Five CI steps at this head. Produced by capture.sh; normalization in README.md."
  echo

  echo "\$ npm ci"
  if ci_out="$(npm ci 2>&1)"; then ci_exit=0; else ci_exit=$?; fi
  added="$(printf '%s\n' "$ci_out" | grep -E '^added [0-9]+ packages' | head -1 | sed -E 's/^(added [0-9]+ packages).*$/\1/')" || added=""
  echo "${added:-<no added-packages line>} in <duration>"
  echo "--- exit code: $ci_exit ---"
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
  echo

  echo "# fail-loudly: importing the shared client with neither env var set must throw"
  echo "\$ env -u EXPO_PUBLIC_SUPABASE_URL -u EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY node -e \"import('./src/lib/supabase.ts')...\""
  env -u EXPO_PUBLIC_SUPABASE_URL -u EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON -e "
      import('./src/lib/supabase.ts').then(
        () => { console.log('unexpected: module loaded without env'); process.exit(1); },
        (e) => { console.log('throws as designed: ' + e.message); process.exit(0); },
      );"
  echo "--- exit code: $? (0 = threw as designed) ---"
  echo

  # REVIEW-008 finding 4: each single-missing case must be proven, not just
  # both-missing. The set values are synthetic non-credentials; the module
  # checks presence only and never uses them (it throws before createClient).
  echo "# fail-loudly: URL set but key missing must throw the same way"
  echo "\$ env -u EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_SUPABASE_URL=<synthetic> node -e \"import('./src/lib/supabase.ts')...\""
  env -u EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY EXPO_PUBLIC_SUPABASE_URL="https://synthetic.example.invalid" \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON -e "
      import('./src/lib/supabase.ts').then(
        () => { console.log('unexpected: module loaded with key missing'); process.exit(1); },
        (e) => { console.log('throws as designed: ' + e.message); process.exit(0); },
      );"
  echo "--- exit code: $? (0 = threw as designed) ---"
  echo

  echo "# fail-loudly: key set but URL missing must throw the same way"
  echo "\$ env -u EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<synthetic> node -e \"import('./src/lib/supabase.ts')...\""
  env -u EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="synthetic-key-value" \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON -e "
      import('./src/lib/supabase.ts').then(
        () => { console.log('unexpected: module loaded with URL missing'); process.exit(1); },
        (e) => { console.log('throws as designed: ' + e.message); process.exit(0); },
      );"
  echo "--- exit code: $? (0 = threw as designed) ---"
  echo

  echo "# .env hygiene — literal .env* is ignored; .env.example alone is negated back"
  echo "\$ git check-ignore .env .env.local .env.staging .envrc .envfoo"
  git check-ignore .env .env.local .env.staging .envrc .envfoo
  echo "--- exit code: $? (0 = ignored; every probed name must be echoed above) ---"
  echo "\$ git check-ignore .env.example   # negative probe: must NOT be ignored"
  if git check-ignore .env.example; then example_ignored=0; else example_ignored=$?; fi
  echo "--- exit code: $example_ignored (1 = not ignored, as required) ---"
  echo "\$ git ls-files --error-unmatch .env.example >/dev/null && echo tracked"
  git ls-files --error-unmatch .env.example >/dev/null 2>&1 && echo "tracked"
  echo "--- exit code: $? ---"
  echo "\$ grep -E '^[A-Z_]+=' .env.example   # exactly the two variables, values blank"
  grep -E '^[A-Z_]+=' .env.example
  echo "--- exit code: $? ---"
} > "$outdir/gates.txt"

# --- deps.txt — the dependency this unit adds, as the lockfile resolves it.
# Normalization: the repo's absolute path is masked to <repo-root>, and the
# npm package name to <package-name> — it is an internal identifier (ruling 8)
# and leaving it here would put this docs/ file into the name-scan count that
# ../002b-fix-loop/name-scan.txt gates, changing Unit A evidence for no signal.
{
  echo "\$ npm ls @supabase/supabase-js"
  npm ls @supabase/supabase-js 2>&1 | sed -e "s|$PWD|<repo-root>|" -e 's/^[a-z-]*@0\.1\.0/<package-name>@0.1.0/'
  echo "--- exit code: $? ---"
  echo
  echo "\$ grep -c '\"node_modules/@supabase/supabase-js\"' package-lock.json"
  grep -c '"node_modules/@supabase/supabase-js"' package-lock.json
  echo "--- exit code: $? ---"
} > "$outdir/deps.txt"

# --- types-plumbing.txt — generated-types plumbing proven by a committed
# artifact (REVIEW-008 finding 4): the npm script reaches the executable
# script; the script parses; it refuses to run without SUPABASE_PROJECT_REF —
# before any CLI invocation, so no network is involved; the CLI version is
# pinned exact (REVIEW-008 adjudication); and the committed placeholder is
# imported as the client's generic and typechecks. The generation run itself
# stays owner-executed and NOT RUN — it needs SUPABASE_ACCESS_TOKEN, which
# builders do not hold.
{
  echo "# Generated-types plumbing at this head. Produced by capture.sh; the"
  echo "# authenticated generation run is owner-executed and NOT RUN here."
  echo
  echo "\$ grep -n '\"types:gen\"' package.json   # the npm script reaches the executable script"
  grep -n '"types:gen"' package.json
  echo "--- exit code: $? ---"
  echo
  echo "\$ bash -n scripts/gen-types.sh   # shell syntax check"
  bash -n scripts/gen-types.sh
  echo "--- exit code: $? ---"
  echo
  echo "\$ grep -n 'supabase@' scripts/gen-types.sh   # CLI version pinned exact, not floating"
  grep -n 'supabase@' scripts/gen-types.sh
  echo "--- exit code: $? ---"
  echo
  echo "\$ env -u SUPABASE_PROJECT_REF bash scripts/gen-types.sh   # missing-ref refusal"
  if ref_out="$(env -u SUPABASE_PROJECT_REF bash scripts/gen-types.sh 2>&1)"; then ref_exit=0; else ref_exit=$?; fi
  printf '%s\n' "$ref_out"
  echo "--- exit code: $ref_exit (nonzero = refused before any CLI invocation) ---"
  echo
  echo "\$ grep -n 'database.types\\|createClient<Database>' src/lib/supabase.ts   # placeholder wired as the client generic"
  grep -n 'database.types\|createClient<Database>' src/lib/supabase.ts
  echo "--- exit code: $? ---"
  echo
  echo "\$ grep -c 'export type Database' src/lib/database.types.ts   # the committed placeholder exports Database"
  grep -c 'export type Database' src/lib/database.types.ts
  echo "--- exit code: $? ---"
  echo
  echo "\$ npx tsc --noEmit   # the placeholder import typechecks"
  if tp_out="$(npx tsc --noEmit 2>&1)"; then tp_exit=0; else tp_exit=$?; fi
  [ -n "$tp_out" ] && printf '%s\n' "$tp_out"
  echo "--- exit code: $tp_exit ---"
} > "$outdir/types-plumbing.txt"

# --- redaction-control.txt — the malformed-URL failure path retains no raw
# value (REVIEW-008 finding 4; previously proven only in an uncommitted
# repro). Both set values are synthetic non-credentials that match no scan
# pattern; the malformed URL makes the client constructor throw inside the
# lazy import, so the script's last-resort FATAL path runs and no network
# request is ever attempted. The transcript shows the full output and asserts
# zero raw occurrences of either value.
mal_url="synthetic-malformed-url-not-a-url"
syn_key="synthetic-key-value-for-redaction-control"
{
  echo "# Malformed-URL redaction control: run the connectivity script with a"
  echo "# non-URL value; it must fail loudly printing only redacted output."
  echo "\$ EXPO_PUBLIC_SUPABASE_URL=<synthetic malformed non-URL value> EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<synthetic> \\"
  echo "    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-supabase-connectivity.ts"
  if ctl_out="$(EXPO_PUBLIC_SUPABASE_URL="$mal_url" EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$syn_key" \
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-supabase-connectivity.ts 2>&1)"; then ctl_exit=0; else ctl_exit=$?; fi
  printf '%s\n' "$ctl_out"
  echo "--- exit code: $ctl_exit (1 = failed loudly on the malformed value, as designed) ---"
  raw_url_count="$(printf '%s' "$ctl_out" | grep -cF "$mal_url")" || true
  raw_key_count="$(printf '%s' "$ctl_out" | grep -cF "$syn_key")" || true
  echo "raw malformed-URL-value occurrences in that output: $raw_url_count (0 required)"
  echo "raw synthetic-key occurrences in that output: $raw_key_count (0 required)"
  echo "--- enforced: exit 1 with zero raw occurrences, or capture.sh exits 1 (fail closed) ---"
} > "$outdir/redaction-control.txt"

if [ "$ctl_exit" -ne 1 ] || [ "$raw_url_count" != "0" ] || [ "$raw_key_count" != "0" ]; then
  echo "FAIL CLOSED: redaction control broken (exit $ctl_exit, raw URL $raw_url_count, raw key $raw_key_count) — see $outdir/redaction-control.txt" >&2
  exit 1
fi

# --- secret-scan.txt — no staging credential shape exists anywhere in the
# index. Patterns are written defanged (bracketed characters) so the scanner
# and its own transcript can never match themselves. Each pattern carries a
# positive control: a synthetic sample assembled at run time (so it never
# exists contiguously in these bytes either) that the pattern must match —
# a scan whose patterns match nothing real must still prove they can match.
# Limitation stated in README.md: a bare project ref cannot be scanned for
# without embedding it.
p=p; s=s; DOT=.
scan_violations=0
{
  echo "\$ git grep --cached -I -l -E <pattern>   # over the full index"
  for row in \
    "publishable-key prefix|sb_[p]ublishable_|sb_${p}ublishable_SYNTHETIC00" \
    "secret-key prefix|sb_[s]ecret_|sb_${s}ecret_SYNTHETIC00" \
    "any concrete project host|[a-z0-9-]+[.]supabase[.]co|abcdefghij.supabase${DOT}co" \
    "access token with inline value|ACCESS_TOKEN=[A-Za-z0-9]|ACCESS_TOKEN=${p}synthetic"; do
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

echo "wrote gates.txt, deps.txt, types-plumbing.txt, redaction-control.txt, secret-scan.txt, environment.txt to $outdir"

# --- npm-audit.txt — run-varying: the advisory database is upstream state.
{
  echo "\$ npm audit  # summary line only; the full tree reorders run to run"
  if audit_out="$(npm audit 2>&1)"; then audit_exit=0; else audit_exit=$?; fi
  printf '%s\n' "$audit_out" | grep -E '^[0-9]+ vulnerabilities' || echo "<no summary line>"
  echo "--- exit code: $audit_exit (nonzero while advisories exist) ---"
} > "$outdir/npm-audit.txt"
