#!/usr/bin/env bash
#
# Mutation harness for 006a — session durability (Unit E, CTRL-006).
#
# The harness is inherited from ../005d-auth-session-fix3/mutants.sh unchanged
# in mechanism; the battery is this unit's own. Every claim this unit makes
# about ADR-009's three requirements ships a MUTANT: a named, exact edit to
# shipped source that breaks the behaviour the claim names, plus a recorded
# observation that the claim's own instrument turns RED under it.
#
# Each mutant is checked THREE ways:
#
#   baseline  the instrument runs against the unmutated tree and must be GREEN
#             with at least one test actually executed — a mistyped name filter
#             selects nothing and must not be reported as a passing control.
#   build     the MUTATED TREE MUST TYPECHECK (learning 16). A mutation that
#             fails typecheck is not a counterfactual: Jest's Babel path would
#             execute it anyway and score it red for the wrong reason
#             (REVIEW-020 finding 5). BUILD-INVALID mutants fail the run and
#             are never counted.
#   mutant    the same instrument must be RED with at least one FAILED
#             ASSERTION — not merely a nonzero exit.
#
# `n/n SENSITIVE` is an EXECUTION FACT, never a semantic one, and never a
# coverage measure (learning 16). Rows of the claims table without a mutant ID
# are exactly the rows that have none.
#
# SAFETY: this script rewrites tracked source in place and restores it. Every
# edited file is backed up before its first edit, restored after each mutant,
# and byte-compared against the backup at the end; EXIT/INT/TERM traps restore
# too. The backup directory is printed at the top of the transcript so a hard
# kill is recoverable by hand.
#
# No network service is contacted and no credential is read. Locale pinned
# (learning 7).
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
OUT="${1:-docs/05-quality/evidence/006a-session-durability}"

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "mutants.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

BACKUP_DIR="$(mktemp -d)"
FAILED=0
TOUCHED=()
MUTANT_NAME=""
MUTANT_COUNT=0
EDIT_OK=1
SENSITIVE_COUNT=0
BUILD_INVALID_COUNT=0

backup_path() { printf '%s/%s' "$BACKUP_DIR" "$(printf '%s' "$1" | tr '/' '_')"; }

restore_all() {
  local file backup
  for file in ${TOUCHED[@]+"${TOUCHED[@]}"}; do
    backup="$(backup_path "$file")"
    [ -f "$backup" ] && cp "$backup" "$file"
  done
}

trap restore_all EXIT INT TERM

note_failure() { FAILED=1; }

# Apply one exact edit. The anchor must occur EXACTLY once: a mutation that
# silently matched zero times would be reported as a surviving mutant, and one
# that matched twice would not be the edit it claims to be.
edit() {
  local file="$1" from="$2" to="$3" backup
  backup="$(backup_path "$file")"
  if [ ! -f "$backup" ]; then
    if ! cp "$file" "$backup"; then
      echo "edit:      COULD NOT BACK UP $file — refusing to mutate it"
      EDIT_OK=0
      return 1
    fi
    TOUCHED+=("$file")
  fi
  if node -e '
    const fs = require("fs");
    const [file, from, to] = process.argv.slice(1);
    const src = fs.readFileSync(file, "utf8");
    const parts = src.split(from);
    if (parts.length !== 2) {
      console.error("anchor matched " + (parts.length - 1) + " times in " + file);
      process.exit(3);
    }
    fs.writeFileSync(file, parts.join(to));
  ' -- "$file" "$from" "$to"; then
    echo "edit:      applied to $file"
    return 0
  fi
  echo "edit:      FAILED on $file — the anchor did not match exactly once"
  EDIT_OK=0
  return 1
}

# Run one instrument; classified from jest's own JSON report, because an exit
# status cannot tell "the claim failed" from "the file would not parse", nor
# "green" from "the filter selected nothing".
run_instrument() {
  local pattern="$1" name="$2" json result
  json="$(mktemp)"
  npx jest --ci --runInBand --testPathPattern "$pattern" -t "$name" \
    --json --outputFile "$json" >/dev/null 2>&1
  result=$(node -e '
    const fs = require("fs");
    const [file] = process.argv.slice(1);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      console.log("suite-error|0|0");
      process.exit(0);
    }
    const passed = data.numPassedTests || 0;
    const failed = data.numFailedTests || 0;
    if ((data.numRuntimeErrorTestSuites || 0) > 0) console.log("suite-error|" + passed + "|" + failed);
    else if (failed > 0) console.log("failed|" + passed + "|" + failed);
    else if (passed > 0) console.log("passed|" + passed + "|" + failed);
    else console.log("none|0|0");
  ' -- "$json")
  rm -f "$json"
  printf '%s' "$result"
}

begin_mutant() {
  MUTANT_NAME="$1"
  MUTANT_COUNT=$((MUTANT_COUNT + 1))
  EDIT_OK=1
  echo
  echo "## $MUTANT_NAME"
  echo "breaks:    $2"
  echo "claim:     $3"
}

baseline() {
  local pattern="$1" name="$2" result state passed
  result=$(run_instrument "$pattern" "$name")
  state=${result%%|*}
  passed=$(printf '%s' "$result" | cut -d'|' -f2)
  if [ "$state" = "passed" ]; then
    echo "baseline:  GREEN ($passed passed)"
    return 0
  fi
  echo "baseline:  NOT GREEN ($state, $passed passed) — the instrument does not select"
  echo "           a passing test on the unmutated tree, so a RED result below would"
  echo "           not be attributable to the mutation."
  note_failure
  return 1
}

typechecks() {
  npx tsc --noEmit >/dev/null 2>&1
}

verdict() {
  local pattern="$1" name="$2" result state passed failed
  if [ "$EDIT_OK" -ne 1 ]; then
    echo "mutant:    NOT APPLIED"
    echo "result:    BROKEN MUTANT — no result is recorded for a mutation that did"
    echo "           not land. An unapplied mutation looks exactly like a"
    echo "           surviving one, so it is never counted as either."
    note_failure
    restore_all
    return
  fi
  if typechecks; then
    echo "build:     TYPECHECKS — the mutated tree is a program this project could ship"
  else
    echo "build:     BUILD-INVALID — the mutated tree does not typecheck"
    echo "result:    NOT COUNTED — learning 16. A mutation that fails typecheck is not"
    echo "           a counterfactual."
    BUILD_INVALID_COUNT=$((BUILD_INVALID_COUNT + 1))
    note_failure
    restore_all
    return
  fi
  result=$(run_instrument "$pattern" "$name")
  state=${result%%|*}
  passed=$(printf '%s' "$result" | cut -d'|' -f2)
  failed=$(printf '%s' "$result" | cut -d'|' -f3)
  case "$state" in
    failed)
      echo "mutant:    RED ($failed failed, $passed passed)"
      echo "result:    SENSITIVE — the claim fails when the behaviour it names is removed"
      SENSITIVE_COUNT=$((SENSITIVE_COUNT + 1))
      ;;
    passed)
      echo "mutant:    GREEN ($passed passed)"
      echo "result:    SURVIVED — the claim does not measure what it says it measures"
      note_failure
      ;;
    suite-error)
      echo "mutant:    SUITE ERROR"
      echo "result:    INCONCLUSIVE — the mutated file did not run at all, which is a"
      echo "           broken mutant rather than a failing claim"
      note_failure
      ;;
    *)
      echo "mutant:    NO TEST SELECTED"
      echo "result:    INCONCLUSIVE — the name filter matched nothing under the mutation"
      note_failure
      ;;
  esac
  restore_all
}

ADAPTER=src/lib/auth/secure-store-adapter.ts
PROVIDER=src/lib/auth/auth-provider.tsx
STORAGE=src/lib/auth/session-storage.ts
DEMAND=src/lib/auth/reauth-demand.ts

{
  echo "# Mutation sensitivity — every 006a claim with an instrument, checked both ways."
  echo "#"
  echo "# baseline GREEN (>=1 test executed), mutated tree TYPECHECKS, mutant RED"
  echo "# (>=1 failed assertion). Anything else fails this run."
  echo "# Backups for this run: $BACKUP_DIR"

  # ------------------------------------------------- R1: the observed purge
  begin_mutant "readback-blind-to-stranded-material" \
    "confirmRemoved stops treating a present chunk as disproof, so fragments read as empty" \
    "M1 / claim 3 — the read-back detects material getItem would never return"
  if baseline 'secure-store-adapter' 'detects stranded chunk material that getItem would never return'; then
    edit "$ADAPTER" \
      '        if (!chunk.ok || chunk.value !== null) return false;' \
      '        if (!chunk.ok) return false;'
    verdict 'secure-store-adapter' 'detects stranded chunk material that getItem would never return'
  fi

  begin_mutant "readback-launders-a-refused-chunk-read" \
    "a refused chunk read no longer withholds the proof, so refusal reads as emptiness" \
    "M2 / claim 4a — a refused read is never proof of absence"
  if baseline 'secure-store-adapter' 'refuses to call the space empty when any single chunk read is refused'; then
    edit "$ADAPTER" \
      '        if (!chunk.ok || chunk.value !== null) return false;' \
      '        if (chunk.ok && chunk.value !== null) return false;'
    verdict 'secure-store-adapter' 'refuses to call the space empty when any single chunk read is refused'
  fi

  begin_mutant "readback-launders-a-refused-index-read" \
    "a refused index read no longer withholds the proof" \
    "M3 / claim 4b — a refused index read is never proof of absence"
  if baseline 'secure-store-adapter' 'refuses to call the space empty when the index read is refused'; then
    edit "$ADAPTER" \
      '    if (!indexRead.ok || indexRead.value !== null) return false;' \
      '    if (indexRead.ok && indexRead.value !== null) return false;'
    verdict 'secure-store-adapter' 'refuses to call the space empty when the index read is refused'
  fi

  begin_mutant "purge-verdict-decoupled-from-readback" \
    "the provider believes the purge regardless of what the read-back found — the REVIEW-022 inference, re-created" \
    "M4 / claim 5 — the read-back is the only proof the provider accepts"
  if baseline 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'; then
    edit "$PROVIDER" \
      '      const empty = await confirmSessionPurged();' \
      '      const empty = (await confirmSessionPurged()) || true;'
    verdict 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'
  fi

  begin_mutant "demand-cleared-without-proof" \
    "the demand clears whether or not the read-back proved the space empty" \
    "M5 / claim 6 — the demand clears only on proof (same instrument as M4, different failing assertion: the clear fires, the retry still runs)"
  if baseline 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'; then
    edit "$PROVIDER" \
      '      if (empty) {' \
      '      if (empty || true) {'
    verdict 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'
  fi

  # ------------------------------------------ R2: the durable demand
  begin_mutant "purge-no-longer-precedes-getSession" \
    "at mount the demand branch defers to the bootstrap, so the provider reads before it purges — the REVIEW-022 order, re-created" \
    "M6 / claim 8 — the observed purge comes before the provider's own getSession"
  if baseline 'auth-provider' 'purges before its own getSession when a demand is outstanding at mount'; then
    edit "$PROVIDER" \
      "$(printf '        if (demandOutstanding) {\n          // The observed purge comes BEFORE')" \
      "$(printf '        if (demandOutstanding && bootstrapStarted) {\n          // The observed purge comes BEFORE')"
    verdict 'auth-provider' 'purges before its own getSession when a demand is outstanding at mount'
  fi

  begin_mutant "bootstrap-consult-skipped" \
    "the provider never asks the durable store, so a restart forgets the demand" \
    "M7 / claim 7 — the demand is consulted before any session is exposed"
  if baseline 'auth-provider' 'exposes no session and reads nothing while the demand is unmet'; then
    edit "$PROVIDER" \
      '            demandOutstanding = await isReauthDemandOutstanding();' \
      '            demandOutstanding = Boolean(await isReauthDemandOutstanding()) && false;'
    verdict 'auth-provider' 'exposes no session and reads nothing while the demand is unmet'
  fi

  begin_mutant "consult-refusal-read-as-absence" \
    "a demand store that cannot answer is treated as having answered no" \
    "M8 / claim 9 — refusal to answer is never absence"
  if baseline 'auth-provider' 'treats a demand store that will not answer as an outstanding demand'; then
    edit "$PROVIDER" \
      '            demandOutstanding = true;' \
      '            demandOutstanding = false;'
    verdict 'auth-provider' 'treats a demand store that will not answer as an outstanding demand'
  fi

  begin_mutant "flag-path-demand-not-durable" \
    "requireReauthentication keeps the demand in memory only, so a crash mid-purge loses it" \
    "M9 / claim 10 — the demand is recorded durably before the purge is attempted"
  if baseline 'auth-provider' 'records the durable demand BEFORE attempting the purge'; then
    edit "$PROVIDER" \
      "        await recordReauthDemand('session-purge-pending');" \
      "        await Promise.resolve('session-purge-pending');"
    verdict 'auth-provider' 'records the durable demand BEFORE attempting the purge'
  fi

  begin_mutant "demand-not-restart-visible" \
    "isOutstanding inverts, so a recorded demand reads as absent to the next process" \
    "M10 / claim 11 — a fresh handle over the same backend still sees the demand"
  if baseline 'reauth-demand' 'survives what a restart resets: a fresh handle over the same backend still sees it'; then
    edit "$DEMAND" \
      '    isOutstanding: async () => (await backend.read()) !== null,' \
      '    isOutstanding: async () => (await backend.read()) === null,'
    verdict 'reauth-demand' 'survives what a restart resets: a fresh handle over the same backend still sees it'
  fi

  # ------------------------------------------ R3: recorded, then absorbed
  begin_mutant "refused-write-rethrown" \
    "the session-key refusal is rethrown, re-entering the pinned client's throw-and-reject path" \
    "M11 / claim 13 — a refused session write is recorded and absorbed"
  if baseline 'foreground-refresh' 'resolves a refused SESSION write instead of rethrowing it'; then
    edit "$STORAGE" \
      "$(printf '          lastPersistenceFailure = { key, cause };\n          return;')" \
      "$(printf '          lastPersistenceFailure = { key, cause };\n          throw cause;')"
    verdict 'foreground-refresh' 'resolves a refused SESSION write instead of rethrowing it'
  fi

  begin_mutant "durable-record-skipped-at-the-write" \
    "the refused write is absorbed WITHOUT the durable record — silence instead of durability" \
    "M12 / claim 14 — the durable demand is recorded before the write resolves"
  if baseline 'foreground-refresh' 'records the durable demand BEFORE it resolves, and before the flag is readable'; then
    edit "$STORAGE" \
      "            await demand.record('session-write-refused');" \
      "            await Promise.resolve('session-write-refused');"
    verdict 'foreground-refresh' 'records the durable demand BEFORE it resolves, and before the flag is readable'
  fi

  begin_mutant "demand-failure-fails-open" \
    "when the demand cannot be recorded the write resolves anyway, and durability is silently lost" \
    "M13 / claim 15 — no durable record means the refusal must reach the caller"
  if baseline 'foreground-refresh' 'rejects with the ORIGINAL cause when the demand store also refuses'; then
    edit "$STORAGE" \
      "$(printf '            lastPersistenceFailure = { key, cause };\n            throw cause;')" \
      "$(printf '            lastPersistenceFailure = { key, cause };\n            return;')"
    verdict 'foreground-refresh' 'rejects with the ORIGINAL cause when the demand store also refuses'
  fi

  begin_mutant "demand-outlives-a-successful-write" \
    "a completed session write no longer clears the demand, so a proven-fresh disk still gets purged" \
    "M14 / claim 16 — a successful observed session write ends the demand"
  if baseline 'foreground-refresh' 'clears the durable demand when a session write later SUCCEEDS'; then
    edit "$STORAGE" \
      '          await demand.clear();' \
      '          await Promise.resolve();'
    verdict 'foreground-refresh' 'clears the durable demand when a session write later SUCCEEDS'
  fi

  # ------------------------------------------------------------ restoration
  echo
  echo "## Tree restored"
  restore_all
  restored_ok=1
  for file in ${TOUCHED[@]+"${TOUCHED[@]}"}; do
    if cmp -s "$(backup_path "$file")" "$file"; then
      echo "  byte-identical to its pre-run copy: $file"
    else
      echo "  NOT RESTORED — differs from its pre-run copy: $file"
      restored_ok=0
      note_failure
    fi
  done
  [ "$restored_ok" -eq 1 ] && echo "  all mutated files restored"

  echo
  echo "## Summary"
  echo "mutants:       $MUTANT_COUNT"
  echo "sensitive:     $SENSITIVE_COUNT"
  echo "build-invalid: $BUILD_INVALID_COUNT"
  echo
  echo "# 'sensitive' is an EXECUTION FACT — each edit landed, the mutated tree"
  echo "# typechecked, and the named instrument turned red. It is not a coverage"
  echo "# measure and not a claim that every behaviour has a mutant. Learning 16."
  echo "exit:      $FAILED"
} > "$OUT/mutants.txt" 2>&1

if [ "$FAILED" -ne 0 ]; then
  echo "mutants.sh: a mutant SURVIVED, was INCONCLUSIVE, a baseline was not green," >&2
  echo "            or a file was not restored — see mutants.txt." >&2
  exit 1
fi
echo "mutants.sh: $SENSITIVE_COUNT/$MUTANT_COUNT mutants turned their claim red; tree restored."
