#!/usr/bin/env bash
# Regenerates the gate transcripts in this directory. Same shape as the Unit A
# script (../002a-app-skeleton/capture.sh); only the output directory differs,
# so the fix-loop results are comparable line for line with the originals.
# `git-ls-files.txt` comes from tracked-files.sh and `name-scan.txt` from
# name-scan.sh. Run from the repo root.
#
# Determinism (REVIEW-004 finding 1). Some tool output carries fields that
# change on every run without the thing being measured changing: wall-clock
# durations, and Metro's cold-cache warning. Those fields are replaced with a
# fixed `<duration>` placeholder, or dropped, by the per-file normalisers
# below, so that rerunning this script at the commit an artifact was captured
# at reproduces it byte for byte. Nothing that carries signal is touched:
# exit codes, pass/fail counts, module counts, bundle sizes, and bundle content
# hashes all pass through unchanged.
#
# Three outputs here are *not* byte-stable and are not meant to be —
# environment.txt (machine-local versions), expo-doctor.txt (resolves
# `@latest` from the registry) and npm-audit.txt (upstream advisory database).
# They are classified run-varying in README.md and excluded from the gate that
# ../002c-fix-loop-2/stability.sh enforces.

set -u
OUT="docs/05-quality/evidence/002b-fix-loop"

# --- normalisers -----------------------------------------------------------

norm_none() { cat; }

# Jest prints a per-test duration, a total wall-clock line, and — only when a
# suite takes longer than five seconds — a duration appended to its PASS line.
# None of the three is a property of the code under test, and the third is
# doubly volatile because whether it appears at all depends on the machine.
norm_test() {
  sed -E \
    -e 's/^(PASS|FAIL) (.*) \([0-9]+(\.[0-9]+)? s\)$/\1 \2/' \
    -e 's/\(([0-9]+(\.[0-9]+)?) ms\)/(<duration> ms)/g' \
    -e 's/^Time:.*$/Time:        <duration>/'
}

# Metro prints per-platform bundling durations, and a cold-cache warning that
# only appears when no Metro cache is present on the machine.
norm_export() {
  sed -E \
    -e 's/Bundled [0-9]+ms/Bundled <duration>ms/' \
    -e '/^warning: Bundler cache is empty, rebuilding/d'
}

# --- capture ---------------------------------------------------------------

capture() {
  # $1 = output filename, $2 = normaliser, rest = command
  local file="$OUT/$1"
  shift
  local norm="$1"
  shift
  {
    echo "\$ $*"
    "$@" 2>&1
    echo "--- exit code: $? ---"
  } | "$norm" > "$file"
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

capture typecheck.txt norm_none npm run typecheck
capture lint.txt norm_none npm run lint

# `expo lint` is silent on success, so a zero exit alone cannot distinguish
# "linted everything, found nothing" from "matched no files at all". This
# records which files ESLint actually inspected, and their message counts.
#
# Only *tracked* files are listed (REVIEW-004 finding 1). ESLint also inspects
# generated files when they happen to be on disk: `expo-env.d.ts` is written by
# any `expo` command and is gitignored, so it is absent in a fresh clone and
# present after an export. A raw listing therefore reports whether an expo
# command has run in this working tree, which is not what the claim is about.
# Problems found in those files are not dropped — they are counted on the last
# line — and the gate itself is `lint.txt`, which sees everything ESLint sees.
{
  echo "\$ npx eslint . --max-warnings=0 --format json  (summarised)"
  npx eslint . --max-warnings=0 --format json 2>/dev/null | node -e "
    const { execSync } = require('child_process');
    const tracked = new Set(
      execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
    );
    let d = '';
    process.stdin.on('data', (c) => (d += c)).on('end', () => {
      const results = JSON.parse(d);
      let listed = 0;
      let untrackedProblems = 0;
      for (const r of results) {
        const p = r.filePath.replace(process.cwd() + '/', '');
        if (tracked.has(p)) {
          listed++;
          console.log(p + '  errors=' + r.errorCount + ' warnings=' + r.warningCount);
        } else {
          untrackedProblems += r.errorCount + r.warningCount;
        }
      }
      console.log('tracked files linted: ' + listed);
      console.log(
        'problems in untracked files ESLint also inspected: ' + untrackedProblems
      );
    });
  "
  echo "--- exit code: $? ---"
} > "$OUT/lint-file-list.txt"
echo "wrote $OUT/lint-file-list.txt"

capture test.txt norm_test npm test
capture prettier-check.txt norm_none npx prettier --check .
capture expo-doctor.txt norm_none npx expo-doctor@latest
capture expo-export.txt norm_export npx expo export --platform all --output-dir dist --clear
capture npm-audit.txt norm_none npm audit
