#!/usr/bin/env bash
# Regenerates every transcript in this directory except git-ls-files.txt
# (which is captured after staging) and gate-negative-control.txt (see
# negative-control.sh). Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002a-app-skeleton"

capture() {
  # $1 = output filename, rest = command
  local file="$OUT/$1"
  shift
  {
    echo "\$ $*"
    "$@" 2>&1
    echo "--- exit code: $? ---"
  } > "$file"
  echo "wrote $file"
}

{
  echo "\$ node -v && npm -v && npx tsc -v"
  echo "node    $(node -v)"
  echo "npm     $(npm -v)"
  echo "tsc     $(npx tsc -v)"
  echo "expo    $(node -p "require('./node_modules/expo/package.json').version")"
  echo "os      $(uname -sr)"
  echo "--- exit code: 0 ---"
} > "$OUT/environment.txt"
echo "wrote $OUT/environment.txt"

capture typecheck.txt npm run typecheck
capture lint.txt npm run lint

# `expo lint` is silent on success, so a zero exit alone cannot distinguish
# "linted everything, found nothing" from "matched no files at all". This
# records which files ESLint actually inspected, and their message counts.
{
  echo "\$ npx eslint . --max-warnings=0 --format json  (summarised)"
  npx eslint . --max-warnings=0 --format json 2>/dev/null | node -e "
    let d = '';
    process.stdin.on('data', (c) => (d += c)).on('end', () => {
      const results = JSON.parse(d);
      for (const r of results) {
        console.log(
          r.filePath.replace(process.cwd() + '/', '') +
            '  errors=' + r.errorCount + ' warnings=' + r.warningCount
        );
      }
      console.log('files linted: ' + results.length);
    });
  "
  echo "--- exit code: $? ---"
} > "$OUT/lint-file-list.txt"
echo "wrote $OUT/lint-file-list.txt"
capture test.txt npm test
capture prettier-check.txt npx prettier --check .
capture expo-doctor.txt npx expo-doctor@latest
capture expo-export.txt npx expo export --platform all --output-dir dist --clear
capture npm-audit.txt npm audit
