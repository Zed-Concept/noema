#!/usr/bin/env bash
# Negative control for the three CI gates.
#
# A green check only means something if the same check goes red on a real
# violation. This script injects one deliberate fault per gate, records the
# exit code, removes the fault, and confirms the gate returns to green.
#
# Run from the repo root:  bash docs/05-quality/evidence/002a-app-skeleton/negative-control.sh
#
# Expected: every INJECTED line is non-zero, every CLEAN line is zero.

set -u

BAD_SRC="src/__negative_control__.ts"
BAD_TEST="src/__tests__/__negative_control__.test.ts"

cleanup() {
  rm -f "$BAD_SRC" "$BAD_TEST"
}
trap cleanup EXIT

run() {
  # $1 = label, rest = command
  local label="$1"
  shift
  "$@" >/dev/null 2>&1
  echo "$label exit=$?"
}

echo "== baseline (no faults injected) =="
run "typecheck CLEAN" npx tsc --noEmit
run "lint      CLEAN" npx eslint . --max-warnings=0
run "test      CLEAN" npx jest --ci

echo
echo "== typecheck gate =="
printf 'export const wrong: number = "not a number";\n' > "$BAD_SRC"
run "typecheck INJECTED" npx tsc --noEmit
rm -f "$BAD_SRC"

echo
echo "== lint gate =="
# Unused local: caught by lint, and deliberately type-correct so this isolates
# the lint gate rather than tripping the typecheck gate as well.
printf 'export function control(): void {\n  const unusedOnPurpose = 1;\n}\n' > "$BAD_SRC"
run "lint      INJECTED" npx eslint . --max-warnings=0
rm -f "$BAD_SRC"

echo
echo "== test gate =="
printf "it('fails on purpose', () => {\n  expect(true).toBe(false);\n});\n" > "$BAD_TEST"
run "test      INJECTED" npx jest --ci
rm -f "$BAD_TEST"

echo
echo "== back to baseline =="
run "typecheck CLEAN" npx tsc --noEmit
run "lint      CLEAN" npx eslint . --max-warnings=0
run "test      CLEAN" npx jest --ci
