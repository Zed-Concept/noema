#!/usr/bin/env bash
#
# Runner for the Known-Issue witness (Unit E fix cycle 3, CTRL-006 —
# ruling 28). Runs `known-issue-witness.tsx` at the current HEAD in a
# disposable git worktree with this working copy's node_modules symlinked in.
#
# THE CONTRACT IS INVERTED relative to every other runner in this chain,
# because the instrument is an EXPECTED-RED witness of the two REVIEW-025
# Known Issues: this runner exits 0 ONLY when
#
#   1. every test titled "PRECONDITION" PASSED — the schedules genuinely
#      reproduce (refused rotation, durable demand, flag installed before
#      commit, the barrier refusing at its input), so the witness failures
#      below are attributable to the Known Issues and nothing else; and
#   2. every test titled "WITNESS (expected RED" FAILED — the withdrawn
#      invariant is asserted and the assertion fails exactly as REVIEW-025
#      recorded (expected signedOut, received signedIn).
#
# A witness that PASSES makes this runner exit 1: it means the Known Issue
# no longer reproduces at this head, and the instrument must be retired by
# the unit that fixed it — never left green in place.
#
# The probe file carries no `.test` suffix in this directory, so the ordinary
# `npm test` never executes it; this runner copies it into the worktree as
# `src/__tests__/known-issue-witness.test.tsx`, where the tree's own jest
# config picks it up. The probe IS typechecked at this head by the ordinary
# tsc gate (the tsconfig includes docs/), so the instrument itself is
# build-valid.
#
# OFFLINE: the probe injects a fake fetch and fake stores; no Supabase
# endpoint is contacted and no credential is read. This runner itself runs
# only git and jest, and it checks every git invocation's exit status.
#
# The transcript is written to known-issue-witness.txt (or into the directory
# given as the first positional argument — a parameter, not an environment
# variable, per learning 10). Worktree paths and durations are masked; the
# transcript is NOT in the byte-stable gated set — jest failure output orders
# some lines by timing — and its verdict block plus this runner's exit status
# are the facts the claims table cites.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006d-session-durability-fix3
OUT="${1:-$HERE}"

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "known-issue-witness.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

HEAD_SHA="$(git rev-parse HEAD)"; RP_STATUS=$?
if [ "$RP_STATUS" -ne 0 ] || [ -z "$HEAD_SHA" ]; then
  echo "known-issue-witness.sh: git rev-parse HEAD failed (exit $RP_STATUS) — refusing to run." >&2
  exit 1
fi

WT="$(mktemp -d)" || exit 90
JSON="$(mktemp)"
RAW="$(mktemp)"
trap 'git worktree remove --force "$WT/tree" > /dev/null 2>&1; rm -rf "$WT"; rm -f "$JSON" "$RAW"' EXIT

if ! git worktree add --detach "$WT/tree" "$HEAD_SHA" > /dev/null 2>&1; then
  echo "known-issue-witness.sh: git worktree add failed — refusing to run." >&2
  exit 91
fi
ln -s "$(pwd)/node_modules" "$WT/tree/node_modules"
cp "$HERE/known-issue-witness.tsx" "$WT/tree/src/__tests__/known-issue-witness.test.tsx"

(cd "$WT/tree" && npx jest --ci --runInBand --testPathPattern known-issue-witness \
  --json --outputFile "$JSON" 2>&1) |
  sed -E \
    -e "s|$WT/tree|<worktree>|g" \
    -e "s|$(pwd)|<repo>|g" \
    -e 's|(\.\./)+[^ :)]*node_modules|<node_modules>|g' \
    -e 's/ \([0-9]+(\.[0-9]+)? ?m?s\)//g' \
    -e 's/^(Time:[[:space:]]+).*$/\1<duration>/' \
    -e 's/, estimated [0-9.]+ s//' \
    > "$RAW"
JEST_STATUS=${PIPESTATUS[0]}

# Classify per test from jest's own JSON report: preconditions must pass,
# witnesses must fail, and both sets must be non-empty.
CLASSIFY="$(node -e '
  const fs = require("fs");
  const [file] = process.argv.slice(1);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    console.log("verdict: JSON-UNREADABLE");
    process.exit(0);
  }
  const results = (data.testResults || []).flatMap((suite) => suite.assertionResults || []);
  const preconditions = results.filter((t) => t.title.includes("PRECONDITION"));
  const witnesses = results.filter((t) => t.title.includes("WITNESS (expected RED"));
  const other = results.filter(
    (t) => !t.title.includes("PRECONDITION") && !t.title.includes("WITNESS (expected RED"),
  );
  for (const t of preconditions) console.log(`precondition ${t.status.padEnd(7)} ${t.title}`);
  for (const t of witnesses) console.log(`witness      ${t.status.padEnd(7)} ${t.title}`);
  for (const t of other) console.log(`UNCLASSIFIED ${t.status.padEnd(7)} ${t.title}`);
  const ok =
    preconditions.length > 0 &&
    witnesses.length > 0 &&
    other.length === 0 &&
    preconditions.every((t) => t.status === "passed") &&
    witnesses.every((t) => t.status === "failed");
  console.log(
    `counts: preconditions ${preconditions.filter((t) => t.status === "passed").length}/${preconditions.length} passed, ` +
      `witnesses ${witnesses.filter((t) => t.status === "failed").length}/${witnesses.length} failed-as-expected`,
  );
  console.log(`verdict: ${ok ? "WITNESS-HOLDS" : "WITNESS-BROKEN"}`);
' -- "$JSON")"
node_status=$?

{
  echo "# Known-Issue witness — REVIEW-025 finding 1's two schedules, EXPECTED RED."
  echo "# See known-issue-witness.tsx for what is asserted and"
  echo "# known-issue-witness.sh for the inverted contract: preconditions must"
  echo "# PASS, witnesses must FAIL (expected signedOut, received signedIn),"
  echo "# or this runner exits 1."
  echo "#"
  echo "# head: $HEAD_SHA (the commit the witness ran against. The commit that"
  echo "# adds this transcript necessarily post-dates it — the same"
  echo "# head-cannot-name-itself boundary as ci.txt.)"
  echo
  echo "=========================================================================="
  echo "## RUN — head $HEAD_SHA (jest exit: $JEST_STATUS; expected nonzero:"
  echo "## the witness tests are expected RED)"
  echo "=========================================================================="
  cat "$RAW"
  echo
  echo "=========================================================================="
  echo "## PER-TEST CLASSIFICATION (from jest --json)"
  echo "=========================================================================="
  printf '%s\n' "$CLASSIFY"
  echo
  echo "=========================================================================="
  echo "## VERDICT"
  echo "=========================================================================="
  if [ "$node_status" -eq 0 ] && printf '%s' "$CLASSIFY" | grep -q "verdict: WITNESS-HOLDS"; then
    echo "every PRECONDITION passed and every WITNESS failed exactly as expected:"
    echo "the two REVIEW-025 Known Issues reproduce at this head, and their"
    echo "reproduction is this committed record. runner exit: 0"
  else
    echo "FAILURE: the witness did not behave as its contract requires — either a"
    echo "precondition failed (the schedule no longer reproduces cleanly) or a"
    echo "witness PASSED (the Known Issue may be fixed; retire this instrument in"
    echo "the unit that fixed it). runner exit: 1"
    echo "runner exit: 1"
  fi
} > "$OUT/known-issue-witness.txt"

if [ "$node_status" -eq 0 ] && printf '%s' "$CLASSIFY" | grep -q "verdict: WITNESS-HOLDS"; then
  echo "known-issue-witness.sh: preconditions GREEN, witnesses RED as expected — see known-issue-witness.txt."
  exit 0
fi
echo "known-issue-witness.sh: witness contract NOT met — see known-issue-witness.txt." >&2
exit 1
