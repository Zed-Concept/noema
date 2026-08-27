#!/usr/bin/env bash
#
# Mutation harness for 006b — session durability fix cycle 1 (Unit E, CTRL-006).
#
# The harness mechanism is inherited from ../006a-session-durability/mutants.sh
# unchanged; the battery is this cycle's own. It re-bases the 006a mutants that
# still apply to the fixed code (M1–M12, M14 — anchors updated where the fix
# moved them), REPLACES the withdrawn-fallback mutant (old M13 restored a
# rethrow that no longer exists; ruling 25 withdrew the behaviour it broke),
# and adds mutants for every behaviour this cycle introduced: the ruling-25
# memory hold and retry (F1), the pre-purge signedOut and the listener gate
# (F2), and the advisory leads A–C.
#
# Each mutant is checked THREE ways:
#
#   baseline  the instrument runs against the unmutated tree and must be GREEN
#             with at least one test actually executed.
#   build     the MUTATED TREE MUST TYPECHECK (learning 16). BUILD-INVALID
#             mutants fail the run and are never counted.
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
OUT="${1:-docs/05-quality/evidence/006b-session-durability-fix1}"

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

# Apply one exact edit. The anchor must occur EXACTLY once.
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

# Run one instrument; classified from jest's own JSON report.
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
    echo "           not land."
    note_failure
    restore_all
    return
  fi
  if typechecks; then
    echo "build:     TYPECHECKS — the mutated tree is a program this project could ship"
  else
    echo "build:     BUILD-INVALID — the mutated tree does not typecheck"
    echo "result:    NOT COUNTED — learning 16."
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
      echo "result:    INCONCLUSIVE — the mutated file did not run at all"
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
  echo "# Mutation sensitivity — every 006b claim with an instrument, checked both ways."
  echo "#"
  echo "# baseline GREEN (>=1 test executed), mutated tree TYPECHECKS, mutant RED"
  echo "# (>=1 failed assertion). Anything else fails this run."
  echo "# Backups for this run: $BACKUP_DIR"

  # ------------------------------------------------- R1: the observed purge
  begin_mutant "readback-blind-to-stranded-material" \
    "confirmRemoved stops treating a present chunk as disproof, so fragments read as empty" \
    "M1 — the read-back detects material getItem would never return"
  if baseline 'secure-store-adapter' 'detects stranded chunk material that getItem would never return'; then
    edit "$ADAPTER" \
      '        if (!chunk.ok || chunk.value !== null) return false;' \
      '        if (!chunk.ok) return false;'
    verdict 'secure-store-adapter' 'detects stranded chunk material that getItem would never return'
  fi

  begin_mutant "readback-launders-a-refused-chunk-read" \
    "a refused chunk read no longer withholds the proof, so refusal reads as emptiness" \
    "M2 — a refused read is never proof of absence"
  if baseline 'secure-store-adapter' 'refuses to call the space empty when any single chunk read is refused'; then
    edit "$ADAPTER" \
      '        if (!chunk.ok || chunk.value !== null) return false;' \
      '        if (chunk.ok && chunk.value !== null) return false;'
    verdict 'secure-store-adapter' 'refuses to call the space empty when any single chunk read is refused'
  fi

  begin_mutant "readback-launders-a-refused-index-read" \
    "a refused index read no longer withholds the proof" \
    "M3 — a refused index read is never proof of absence"
  if baseline 'secure-store-adapter' 'refuses to call the space empty when the index read is refused'; then
    edit "$ADAPTER" \
      '    if (!indexRead.ok || indexRead.value !== null) return false;' \
      '    if (indexRead.ok && indexRead.value !== null) return false;'
    verdict 'secure-store-adapter' 'refuses to call the space empty when the index read is refused'
  fi

  begin_mutant "readback-skips-part-of-the-address-set" \
    "the sweep stops one generation short, so the exact enumerable address set is no longer read" \
    "M24 — the read-back reads exactly the ordered 513-address set (the REVIEW-023 exact-address upgrade)"
  if baseline 'secure-store-adapter' 'proves an untouched key space empty by reading exactly the enumerable address set, in order'; then
    edit "$ADAPTER" \
      '    for (const generation of GENERATIONS) {
      for (let i = 0; i < MAX_CHUNKS; i += 1) {
        const chunk = await readBackend(chunkKeyFor(key, generation, i));' \
      '    for (const generation of GENERATIONS.slice(0, 1)) {
      for (let i = 0; i < MAX_CHUNKS; i += 1) {
        const chunk = await readBackend(chunkKeyFor(key, generation, i));'
    verdict 'secure-store-adapter' 'proves an untouched key space empty by reading exactly the enumerable address set, in order'
  fi

  begin_mutant "purge-verdict-decoupled-from-readback" \
    "the provider believes the purge regardless of what the read-back found — the REVIEW-022 inference, re-created" \
    "M4 — the read-back is the only proof the provider accepts"
  if baseline 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'; then
    edit "$PROVIDER" \
      '      const empty = await confirmSessionPurged();' \
      '      const empty = (await confirmSessionPurged()) || true;'
    verdict 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'
  fi

  begin_mutant "demand-cleared-without-proof" \
    "the demand clears whether or not the read-back proved the space empty" \
    "M5 — the demand clears only on proof (same instrument as M4, different failing assertion)"
  if baseline 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'; then
    edit "$PROVIDER" \
      '      if (empty) {' \
      '      if (empty || true) {'
    verdict 'auth-provider' 'treats a signOut rejection with a populated key space as NOT purged, and retries'
  fi

  # ------------------------------------------ R2: the durable demand
  begin_mutant "purge-no-longer-precedes-getSession" \
    "at mount the demand branch defers to the bootstrap, so the provider reads before it purges — the REVIEW-022 order, re-created" \
    "M6 — the observed purge comes before the provider's own getSession"
  if baseline 'auth-provider' 'purges before its own getSession when a demand is outstanding at mount'; then
    edit "$PROVIDER" \
      "$(printf '        if (demandOutstanding) {\n          // With a demand outstanding')" \
      "$(printf '        if (demandOutstanding && bootstrapStarted) {\n          // With a demand outstanding')"
    verdict 'auth-provider' 'purges before its own getSession when a demand is outstanding at mount'
  fi

  begin_mutant "bootstrap-consult-skipped" \
    "the provider never asks the durable store, so a restart forgets the demand" \
    "M7 — the demand is consulted before any session is exposed"
  if baseline 'auth-provider' 'exposes no session and reads nothing while the demand is unmet'; then
    edit "$PROVIDER" \
      '            demandOutstanding = await isReauthDemandOutstanding();' \
      '            demandOutstanding = Boolean(await isReauthDemandOutstanding()) && false;'
    verdict 'auth-provider' 'exposes no session and reads nothing while the demand is unmet'
  fi

  begin_mutant "consult-refusal-read-as-absence" \
    "a demand store that cannot answer is treated as having answered no" \
    "M8 — refusal to answer is never absence"
  if baseline 'auth-provider' 'treats a demand store that will not answer as an outstanding demand'; then
    edit "$PROVIDER" \
      '            demandOutstanding = true;' \
      '            demandOutstanding = false;'
    verdict 'auth-provider' 'treats a demand store that will not answer as an outstanding demand'
  fi

  begin_mutant "flag-path-demand-not-durable" \
    "requireReauthentication keeps the demand in memory only, so a crash mid-purge loses it" \
    "M9 — the demand is recorded durably before the purge is attempted"
  if baseline 'auth-provider' 'records the durable demand BEFORE attempting the purge'; then
    edit "$PROVIDER" \
      "        await recordReauthDemand('session-purge-pending');" \
      "        await Promise.resolve('session-purge-pending');"
    verdict 'auth-provider' 'records the durable demand BEFORE attempting the purge'
  fi

  begin_mutant "demand-not-restart-visible" \
    "isOutstanding inverts its backend read, so a recorded demand reads as absent to the next process" \
    "M10 — a fresh handle over the same backend still sees the demand"
  if baseline 'reauth-demand' 'survives what a restart resets: a fresh handle over the same backend still sees it'; then
    edit "$DEMAND" \
      '    isOutstanding: async () => held !== null || (await backend.read()) !== null,' \
      '    isOutstanding: async () => held !== null || (await backend.read()) === null,'
    verdict 'reauth-demand' 'survives what a restart resets: a fresh handle over the same backend still sees it'
  fi

  # ------------------------------------------ R3: recorded, then absorbed
  begin_mutant "refused-write-rethrown" \
    "the session-key refusal is rethrown, re-entering the pinned client's throw-and-reject path" \
    "M11 — a refused session write is recorded and absorbed (also the double-refusal absorb of the ruling-25 claim)"
  if baseline 'foreground-refresh' 'resolves a refused SESSION write instead of rethrowing it'; then
    edit "$STORAGE" \
      "$(printf '          lastPersistenceFailure = { key, cause };\n          return;')" \
      "$(printf '          lastPersistenceFailure = { key, cause };\n          throw cause;')"
    verdict 'foreground-refresh' 'resolves a refused SESSION write instead of rethrowing it'
  fi

  begin_mutant "durable-record-skipped-at-the-write" \
    "the refused write is absorbed WITHOUT the durable record — silence instead of durability" \
    "M12 — the demand is recorded before the write resolves"
  if baseline 'foreground-refresh' 'records the durable demand BEFORE it resolves, and before the flag is readable'; then
    edit "$STORAGE" \
      "            await demand.record('session-write-refused');" \
      "            await Promise.resolve('session-write-refused');"
    verdict 'foreground-refresh' 'records the durable demand BEFORE it resolves, and before the flag is readable'
  fi

  begin_mutant "refused-record-lost-not-held" \
    "record() rejects on a refused backend write instead of holding the demand in memory — the withdrawn pre-ruling-25 contract, re-created" \
    "M13 — a refused record is held, not lost (ruling 25)"
  if baseline 'reauth-demand' 'holds the demand in memory when the store refuses the write'; then
    edit "$DEMAND" \
      "$(printf '    } catch {\n      held = demand;\n      return %s;\n    }' "'held'")" \
      "$(printf '    } catch (cause) {\n      throw cause;\n    }')"
    verdict 'reauth-demand' 'holds the demand in memory when the store refuses the write'
  fi

  begin_mutant "demand-erased-by-a-later-success" \
    "a successful session write clears the demand again — the adversarial-review HIGH re-created" \
    "M14 — the demand outlives a successful write; only read-back proof ends it. Sensitivity measured at the observer boundary by a generic later write; the real-client signOut internal-refresh schedule is the review023 probe's finding-2 test (REVIEW-023 finding 5 narrowed the attribution)"
  if baseline 'foreground-refresh' 'keeps the demand outstanding when a later session write succeeds'; then
    edit "$STORAGE" \
      "$(printf '      // The demand is NOT cleared on success — see the header. Only the\n      // observed purge%s read-back proof ends it.' "'"'s')" \
      '      if (key === AUTH_SESSION_STORAGE_KEY) await demand.clear();'
    verdict 'foreground-refresh' 'keeps the demand outstanding when a later session write succeeds'
  fi

  # -------------------------------- Ruling 25: the hold and its retries (F1)
  begin_mutant "held-record-never-flushed" \
    "retryHeldRecord becomes a no-op reporting success, so a held demand never goes durable" \
    "M15 — the retry flushes a held demand once a medium answers"
  if baseline 'reauth-demand' 'retryHeldRecord flushes a held demand once the store recovers'; then
    edit "$DEMAND" \
      "$(printf '    retryHeldRecord: async () => {\n      if (held === null) return true;\n      return (await writeDurably(held)) === %s;\n    },' "'durable'")" \
      "$(printf '    retryHeldRecord: async () => {\n      return true;\n    },')"
    verdict 'reauth-demand' 'retryHeldRecord flushes a held demand once the store recovers'
  fi

  begin_mutant "next-write-opportunity-deleted" \
    "the observer stops retrying the held record at its next-write opportunity" \
    "M16 — the next write through the observer retries the held record"
  if baseline 'foreground-refresh' 'retries the held record on the next write once the demand store recovers'; then
    edit "$STORAGE" \
      '      await demand.retryHeldRecord();' \
      '      await Promise.resolve();'
    verdict 'foreground-refresh' 'retries the held record on the next write once the demand store recovers'
  fi

  begin_mutant "foreground-retry-opportunity-deleted" \
    "the outstanding branch stops retrying the durable record on foreground evaluations" \
    "M17 — the foreground/purge-retry opportunity retries the durable record"
  if baseline 'auth-provider' 'retries the durable record on every foreground while the demand is outstanding'; then
    edit "$PROVIDER" \
      '          await retryReauthDemandRecord();' \
      '          void retryReauthDemandRecord;'
    verdict 'auth-provider' 'retries the durable record on every foreground while the demand is outstanding'
  fi

  # ------------------------- Finding 2: exposure ends before the purge await
  begin_mutant "signedout-deferred-to-purge-settle" \
    "requireReauthentication stops setting signedOut before its awaits — the REVIEW-023 finding-2 exposure, re-created" \
    "M18 — signedOut is set while the purge is still pending"
  if baseline 'auth-provider' 'sets signedOut while the purge is still pending'; then
    edit "$PROVIDER" \
      "$(printf '      // could not vouch for — from this moment.\n      if (active) setState({ status: %s });' "'signedOut'")" \
      "$(printf '      // could not vouch for — from this moment.\n      void active;')"
    verdict 'auth-provider' 'sets signedOut while the purge is still pending'
  fi

  begin_mutant "listener-demand-gate-deleted" \
    "the listener stops gating on the consulted demand, so a mid-purge TOKEN_REFRESHED re-exposes the purged session" \
    "M19 — the demand half of the listener gate"
  if baseline 'auth-provider' 'drops a mid-purge TOKEN_REFRESHED instead of re-exposing the session'; then
    edit "$PROVIDER" \
      '        if (demandOutstanding || peekSessionPersistenceFailure() !== null) return;' \
      '        if (peekSessionPersistenceFailure() !== null) return;'
    verdict 'auth-provider' 'drops a mid-purge TOKEN_REFRESHED instead of re-exposing the session'
  fi

  begin_mutant "demand-not-outstanding-during-purge" \
    "requireReauthentication no longer marks the demand outstanding before purging, so the listener gate has no signal" \
    "M20 — the in-memory outstanding mark that feeds the gate (shares M19's instrument; different mechanism — M19 removes the door, this removes the signal)"
  if baseline 'auth-provider' 'drops a mid-purge TOKEN_REFRESHED instead of re-exposing the session'; then
    edit "$PROVIDER" \
      "$(printf '      demandConsulted = true;\n      demandOutstanding = true;')" \
      "$(printf '      demandConsulted = true;')"
    verdict 'auth-provider' 'drops a mid-purge TOKEN_REFRESHED instead of re-exposing the session'
  fi

  # --------------------------------------- Advisory leads A–C (the addendum)
  begin_mutant "listener-flag-gate-deleted" \
    "the listener stops gating on the unconsumed write-refusal flag — the advisory A2/A3 window, re-opened" \
    "M21 — the flag half of the listener gate (advisory lead A)"
  if baseline 'auth-provider' 'drops a session event arriving under an unconsumed persistence failure'; then
    edit "$PROVIDER" \
      '        if (demandOutstanding || peekSessionPersistenceFailure() !== null) return;' \
      '        if (demandOutstanding) return;'
    verdict 'auth-provider' 'drops a session event arriving under an unconsumed persistence failure'
  fi

  begin_mutant "consult-gates-on-exists-alone" \
    "the file backend goes back to gating its read on the exists boolean — the advisory E1 lie, believed again" \
    "M22 — the consult reads content first (advisory lead B)"
  if baseline 'reauth-demand' 'reads the record even when'; then
    edit "$DEMAND" \
      "$(printf '    try {\n      return file.textSync();\n    } catch (cause) {\n      if (!file.exists) return null;\n      throw cause;\n    }')" \
      "$(printf '    if (!file.exists) return null;\n    return file.textSync();')"
    verdict 'reauth-demand' 'reads the record even when'
  fi

  begin_mutant "resolution-skips-the-read-back" \
    "a fresh sign-in resolves the demand without the stored session reading back" \
    "M23 — resolution requires the read-back (advisory lead C)"
  if baseline 'auth-provider' 'does not resolve the demand when nothing reads back'; then
    edit "$PROVIDER" \
      "$(printf '        const storedSession = await readBackStoredSession();\n        if (storedSession === null) return;')" \
      "$(printf '        const storedSession = await readBackStoredSession();\n        void storedSession;')"
    verdict 'auth-provider' 'does not resolve the demand when nothing reads back'
  fi

  begin_mutant "resolution-ignores-a-refused-persist" \
    "a fresh sign-in resolves the demand even though its own persist was refused" \
    "M25 — resolution requires no unconsumed refusal (advisory lead C)"
  if baseline 'auth-provider' 'does not resolve the demand when the sign-in persist was refused'; then
    edit "$PROVIDER" \
      '        if (peekSessionPersistenceFailure() !== null) return;' \
      '        void peekSessionPersistenceFailure;'
    verdict 'auth-provider' 'does not resolve the demand when the sign-in persist was refused'
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
