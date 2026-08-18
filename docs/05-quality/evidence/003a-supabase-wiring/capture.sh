#!/usr/bin/env bash
# Regenerates this directory's artifacts. Gated (byte-stable at the committed
# head, normalization stated in README.md): gates.txt, deps.txt,
# secret-scan.txt. Run-varying (fields named in README.md): environment.txt,
# npm-audit.txt. connectivity.txt is NOT produced here — it needs owner-held
# credentials; see connectivity.sh.
#
# secret-scan.txt reads the index, so it follows the same fixed-point
# discipline as ../002b-fix-loop/tracked-files.sh: `git add -A`, run, and
# repeat until the output stops changing. At a committed head one run
# reproduces it.
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/003a-supabase-wiring/capture.sh [outdir]
set -u
cd "$(git rev-parse --show-toplevel)"
outdir="${1:-docs/05-quality/evidence/003a-supabase-wiring}"
mkdir -p "$outdir"

# --- environment.txt — run-varying: every line moves with the machine.
{
  echo "node: $(node --version)"
  echo "npm: $(npm --version)"
  echo "os: $(uname -sr)"
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

  echo "# .env hygiene"
  echo "\$ git check-ignore .env .env.local .env.staging"
  git check-ignore .env .env.local .env.staging
  echo "--- exit code: $? (0 = ignored) ---"
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

# --- secret-scan.txt — no staging credential shape exists anywhere in the
# index. Patterns are written defanged (bracketed characters) so the scanner
# and its own transcript can never match themselves. Each pattern carries a
# positive control: a synthetic sample assembled at run time (so it never
# exists contiguously in these bytes either) that the pattern must match —
# a scan whose patterns match nothing real must still prove they can match.
# Limitation stated in README.md: a bare project ref cannot be scanned for
# without embedding it.
p=p; s=s; DOT=.
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
    echo "$label: files with matches: $files (pattern matches its synthetic sample: $matches)"
  done
  echo "--- expected: 0 files for every pattern, every synthetic sample matched ---"
} > "$outdir/secret-scan.txt"

echo "wrote gates.txt, deps.txt, secret-scan.txt, environment.txt to $outdir"

# --- npm-audit.txt — run-varying: the advisory database is upstream state.
{
  echo "\$ npm audit  # summary line only; the full tree reorders run to run"
  if audit_out="$(npm audit 2>&1)"; then audit_exit=0; else audit_exit=$?; fi
  printf '%s\n' "$audit_out" | grep -E '^[0-9]+ vulnerabilities' || echo "<no summary line>"
  echo "--- exit code: $audit_exit (nonzero while advisories exist) ---"
} > "$outdir/npm-audit.txt"
