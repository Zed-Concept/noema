#!/usr/bin/env bash
#
# Mutation harness for 005b — auth and session v1, fix cycle 1 (Unit D, CTRL-005).
#
# WHY THIS EXISTS
#
# REVIEW-019 findings 7 and 8 proved that three of this unit's claims survived
# deletion of the behaviour they named: removing `storage: authSessionStorage`
# from the Supabase client, letting a chunk-read rejection escape, and inserting
# `JSON.parse(value)` into `setItem` all stayed green through 57 tests and four
# gates. A claim whose instrument cannot fail is not evidence, and a green run
# that was never red proves only that the assertions execute.
#
# So every claim re-instrumented in this cycle ships a MUTANT: a named, exact
# edit to the shipped source that breaks the behaviour the claim names, plus a
# recorded observation that the claim's own instrument turns RED under it. This
# generalises the run-time positive controls that `banned-apis.txt` already
# applies to its absence scans — that technique was promoted to learning 14 and
# then not applied to the claims table.
#
# Each mutant is checked BOTH ways, which is what makes a RED result mean
# something:
#
#   baseline  the instrument runs against the unmutated tree and must be GREEN
#             with at least one test actually executed. This is what catches a
#             mistyped test-name filter, which would otherwise select nothing
#             and be reported as a passing control.
#   mutant    the same instrument must be RED, and RED with at least one FAILED
#             ASSERTION — not merely a nonzero exit. A mutant that made the file
#             unparseable would also exit nonzero, and would prove nothing.
#
# SAFETY
#
# This script rewrites tracked source in place and restores it. Every edited
# file is copied to a temporary directory before its first edit, restored after
# each mutant, and byte-compared against that copy at the end; a restore that
# does not reproduce the original byte-for-byte fails the run loudly. An EXIT /
# INT / TERM trap restores as well, so an interrupted run leaves the tree clean.
# The backup directory is printed at the top of the transcript so a hard kill
# (-9, which no trap can catch) is recoverable by hand.
#
# No network service is contacted and no credential is read.
#
# Locale is pinned (learning 7).
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
OUT="${1:-docs/05-quality/evidence/005b-auth-session-fix1}"

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
  # `node -e` puts the first script argument at argv[1], not argv[2]: there is no
  # script path in argv when the program came from -e. Getting this wrong is how
  # the first run of this harness reported all twenty mutants as SURVIVED — the
  # mutation was never applied, node exited nonzero, and nothing consulted it.
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

# Run one instrument. $1 = --testPathPattern, $2 = -t (exact test name).
# Echoes "<verdict>|<passed>|<failed>", verdict in
# passed | failed | none | suite-error.
#
# Classified from jest's own JSON report rather than from its exit status. An
# exit status cannot tell "the claim failed" from "the mutated file would not
# parse", and it cannot tell "green" from "the name filter selected nothing" —
# both of which would otherwise be recorded as evidence.
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

# One complete mutant: baseline GREEN, then the edits, then mutant RED.
# Usage: check_mutant <name> <claim> <pattern> <test name> ; edits applied by
# the caller between `begin_mutant` and `check_mutant`.
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
CLIENT=src/lib/supabase.ts

{
  echo "# Mutation sensitivity — every re-instrumented claim, checked both ways."
  echo "#"
  echo "# baseline GREEN (>=1 test executed) then mutant RED (>=1 failed assertion)."
  echo "# Anything else fails this run. See the header of mutants.sh for why."
  echo "# Backups for this run: $BACKUP_DIR"

  # ------------------------------------------------------------ INVARIANT 2
  begin_mutant "serialization-removed--concurrent-writers" \
    "public operations no longer queue; two writers can interleave" \
    "M1 / claim 13a — two writers never commit a payload belonging to neither"
  if baseline 'secure-store-adapter' 'does not let two writers commit a payload belonging to neither'; then
    edit "$ADAPTER" \
      '    const result = queue.then(operation, operation);' \
      '    const result = operation();'
    verdict 'secure-store-adapter' 'does not let two writers commit a payload belonging to neither'
  fi

  begin_mutant "serialization-removed--stale-reader" \
    "public operations no longer queue; a reader can be overtaken mid-payload" \
    "M2 / claim 13b — a reader a writer overtakes is never shown null"
  if baseline 'secure-store-adapter' 'never exposes null to a reader that a writer overtakes'; then
    edit "$ADAPTER" \
      '    const result = queue.then(operation, operation);' \
      '    const result = operation();'
    verdict 'secure-store-adapter' 'never exposes null to a reader that a writer overtakes'
  fi

  begin_mutant "serialization-removed--read-interleaving" \
    "public operations no longer queue; a write can land between chunk reads" \
    "M3 / claim 13c — no write lands between a reader chunk read and the next"
  if baseline 'secure-store-adapter' 'lets no write land between a reader chunk read and the next'; then
    edit "$ADAPTER" \
      '    const result = queue.then(operation, operation);' \
      '    const result = operation();'
    verdict 'secure-store-adapter' 'lets no write land between a reader chunk read and the next'
  fi

  # ------------------------------------------------------------ INVARIANT 1
  begin_mutant "index-read-refusal-laundered" \
    "setItem treats a refused index read as an absent index again" \
    "M4 / claim 14a — a refused index read blocks the write and preserves the session"
  if baseline 'secure-store-adapter' 'refuses to write, and preserves the live session, when the index read is refused'; then
    edit "$ADAPTER" '    if (!indexRead.ok) {' '    if (!indexRead.ok && false) {'
    verdict 'secure-store-adapter' 'refuses to write, and preserves the live session, when the index read is refused'
  fi

  begin_mutant "index-delete-failure-swallowed" \
    "removeItem stops consulting whether the index delete succeeded" \
    "M5 / claim 15a — removal reports failure when the index survives"
  if baseline 'secure-store-adapter' 'reports failure when only the index delete is refused'; then
    edit "$ADAPTER" \
      '    let complete = await deleteBackend(key);' \
      '    let complete = (await deleteBackend(key)) || true;'
    verdict 'secure-store-adapter' 'reports failure when only the index delete is refused'
  fi

  # The first run of this harness pointed the mutant above at the every-delete
  # test, and it SURVIVED: that test refuses the index delete AND the sweep, so
  # the sweep's own check still failed the removal and masked the mutation. The
  # instrument was split rather than the result explained away. This mutant is
  # the whole-report version, and it takes both checks to reach it.
  begin_mutant "removal-failure-swallowed-entirely" \
    "removeItem stops consulting either half of its completeness report" \
    "M6 / claim 15 — removal never reports success while the session survives"
  if baseline 'secure-store-adapter' 'reports failure with the session still readable when every delete is refused'; then
    edit "$ADAPTER" \
      '    let complete = await deleteBackend(key);' \
      '    let complete = (await deleteBackend(key)) || true;'
    edit "$ADAPTER" \
      '      if (!(await purgeRange(key, generation, MAX_CHUNKS))) complete = false;' \
      '      await purgeRange(key, generation, MAX_CHUNKS);'
    verdict 'secure-store-adapter' 'reports failure with the session still readable when every delete is refused'
  fi

  begin_mutant "chunk-delete-failure-swallowed" \
    "removeItem stops consulting whether the chunk sweep succeeded" \
    "M7 / claim 15b — removal reports failure when a chunk survives"
  if baseline 'secure-store-adapter' 'reports failure when only a chunk delete is refused, after finishing the sweep'; then
    edit "$ADAPTER" \
      '      if (!(await purgeRange(key, generation, MAX_CHUNKS))) complete = false;' \
      '      await purgeRange(key, generation, MAX_CHUNKS);'
    verdict 'secure-store-adapter' 'reports failure when only a chunk delete is refused, after finishing the sweep'
  fi

  # ------------------------------------------------------------ INVARIANT 3
  begin_mutant "sweep-stops-at-first-gap" \
    "the cleanup sweep breaks at the first absent key, as it did before" \
    "M8 / claim 16a — a fragment behind an adapter-created gap is still cleared"
  if baseline 'secure-store-adapter' 'clears a fragment stranded behind a gap the adapter created itself'; then
    edit "$ADAPTER" \
      '      if (!(await deleteBackend(chunkKeyFor(key, generation, i)))) complete = false;' \
      '      if ((await backend.getItemAsync(chunkKeyFor(key, generation, i)).catch(() => null)) === null) break; if (!(await deleteBackend(chunkKeyFor(key, generation, i)))) complete = false;'
    verdict 'secure-store-adapter' 'clears a fragment stranded behind a gap the adapter created itself'
  fi

  begin_mutant "sweep-bounded-to-occupied-range" \
    "removal sweeps only what the store currently holds" \
    "M9 / claim 16b — removal sweeps the complete enumerable key space"
  if baseline 'secure-store-adapter' 'sweeps the complete enumerable key space, not just the occupied part'; then
    edit "$ADAPTER" \
      '      if (!(await purgeRange(key, generation, MAX_CHUNKS))) complete = false;' \
      '      if (!(await purgeRange(key, generation, 1))) complete = false;'
    verdict 'secure-store-adapter' 'sweeps the complete enumerable key space, not just the occupied part'
  fi

  # ----------------------------------------------------------- ADR-006 / B
  begin_mutant "checksum-not-verified" \
    "the read no longer compares the recorded checksum" \
    "M10 / claim 6a — same-length corruption fails closed to null"
  if baseline 'secure-store-adapter' 'returns null for corruption that preserves the total length'; then
    edit "$ADAPTER" \
      '      if (payloadChecksum(value) !== index.c) return null;' \
      '      if (false) return null;'
    verdict 'secure-store-adapter' 'returns null for corruption that preserves the total length'
  fi

  begin_mutant "checksum-not-verified--forged-index" \
    "the read no longer compares the recorded checksum" \
    "M11 / claim 6b — a self-consistent shortened index fails closed to null"
  if baseline 'secure-store-adapter' 'returns null for a self-consistent index that describes a shorter payload'; then
    edit "$ADAPTER" \
      '      if (payloadChecksum(value) !== index.c) return null;' \
      '      if (false) return null;'
    verdict 'secure-store-adapter' 'returns null for a self-consistent index that describes a shorter payload'
  fi

  # NOT ISOLABLE, and recorded as such rather than dropped. The first run of
  # this harness removed only the length comparison and the claim stayed GREEN —
  # correctly, because the checksum catches the same corruption. The length
  # check is a redundant second guard, kept because it is exact where a 32-bit
  # checksum is probabilistic, and no mutation can separate the two against a
  # corruption both detect. The mutant is therefore the pair, and the claim is
  # stated as the pair. README.md carries the same disclosure.
  begin_mutant "payload-verification-removed" \
    "the read no longer checks the reassembled payload against the index at all" \
    "M12 / claim 5 — a payload that disagrees with its index fails closed to null"
  if baseline 'secure-store-adapter' 'returns null when the reassembled length disagrees with the index'; then
    edit "$ADAPTER" \
      '      if (value.length !== index.len) return null;' \
      '      if (false) return null;'
    edit "$ADAPTER" \
      '      if (payloadChecksum(value) !== index.c) return null;' \
      '      if (false) return null;'
    verdict 'secure-store-adapter' 'returns null when the reassembled length disagrees with the index'
  fi

  # ------------------------------------------------------- REVIEW-019 F7/F8
  begin_mutant "chunk-read-rejection-escapes" \
    "a rejected CHUNK read propagates out of getItem — both guards removed" \
    "M13 / claim 7 — getItem resolves null rather than rejecting on any backend throw"
  if baseline 'secure-store-adapter' 'resolves null instead of rejecting when a CHUNK read throws'; then
    edit "$ADAPTER" \
      '        const chunk = await readBackend(chunkKeyFor(key, index.g, i));' \
      '        const chunk = { ok: true, value: await backend.getItemAsync(chunkKeyFor(key, index.g, i)) };'
    edit "$ADAPTER" \
      "$(printf '    } catch {\n      // auth-js reads storage outside its try/catch')" \
      "$(printf '    } catch (escaped) {\n      throw escaped;\n      // auth-js reads storage outside its try/catch')"
    verdict 'secure-store-adapter' 'resolves null instead of rejecting when a CHUNK read throws'
  fi

  begin_mutant "payload-parsed-on-write" \
    "setItem parses the payload it is supposed to treat as opaque" \
    "M14 / claim 1a — a payload that is not valid JSON round-trips"
  if baseline 'secure-store-adapter' 'stores and returns a payload that is not valid JSON'; then
    edit "$ADAPTER" \
      '    const chunks = splitByUtf8Budget(value, CHUNK_BUDGET_BYTES);' \
      "$(printf '    JSON.parse(value);\n    const chunks = splitByUtf8Budget(value, CHUNK_BUDGET_BYTES);')"
    verdict 'secure-store-adapter' 'stores and returns a payload that is not valid JSON'
  fi

  begin_mutant "payload-reserialised-on-write" \
    "setItem re-serialises the payload instead of storing it verbatim" \
    "M15 / claim 1b — the stored chunks concatenate to exactly the input"
  if baseline 'secure-store-adapter' 'stores the payload verbatim, so nothing re-serialises it'; then
    edit "$ADAPTER" \
      '    const chunks = splitByUtf8Budget(value, CHUNK_BUDGET_BYTES);' \
      '    const chunks = splitByUtf8Budget(JSON.stringify(JSON.parse(value)), CHUNK_BUDGET_BYTES);'
    verdict 'secure-store-adapter' 'stores the payload verbatim, so nothing re-serialises it'
  fi

  begin_mutant "payload-bytes-leak-into-index" \
    "the index carries a slice of the payload alongside its own metadata" \
    "M16 / claim 1c — the index holds adapter metadata only"
  if baseline 'secure-store-adapter' 'writes an index of its own metadata only, with no field off the payload'; then
    edit "$ADAPTER" \
      '      c: payloadChecksum(value),' \
      "$(printf '      c: payloadChecksum(value),\n      head: value.slice(0, 32),')"
    verdict 'secure-store-adapter' 'writes an index of its own metadata only, with no field off the payload'
  fi

  begin_mutant "client-storage-option-deleted" \
    "the Supabase client is built without the platform session storage" \
    "M17 / claim 13 — the platform storage reaches createClient"
  if baseline 'supabase-client' 'passes the platform session storage to createClient'; then
    edit "$CLIENT" "$(printf '    storage: authSessionStorage,\n')" ''
    verdict 'supabase-client' 'passes the platform session storage to createClient'
  fi

  # ------------------------------------------------------------- ADR-005 / C
  begin_mutant "signout-scope-reverted-to-global" \
    "signOut falls back to auth-js's global scope" \
    "M18 / claim 21b — sign-out is device-local"
  if baseline 'auth-provider' 'ends the session through signOut, device-locally'; then
    edit "$PROVIDER" \
      "      const { error } = await supabase.auth.signOut({ scope: 'local' });" \
      '      const { error } = await supabase.auth.signOut();'
    verdict 'auth-provider' 'ends the session through signOut, device-locally'
  fi

  begin_mutant "appstate-gate-always-starts" \
    "the refresh ticker runs regardless of AppState" \
    "M19 / claim 22 — the ticker stops on background and inactive"
  if baseline 'auth-provider' 'stops the ticker on background and on inactive, and restarts on active'; then
    edit "$PROVIDER" \
      "$(printf '      const gate =\n        status === %s ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();' "'active'")" \
      '      const gate = supabase.auth.startAutoRefresh();'
    verdict 'auth-provider' 'stops the ticker on background and on inactive, and restarts on active'
  fi

  begin_mutant "appstate-gate-ignores-mount-state" \
    "the gate stops reading the state the app is actually in at mount" \
    "M20 / claim 22a — a provider mounted while backgrounded starts no ticker"
  if baseline 'auth-provider' 'does not start a ticker when mounted while the app is backgrounded'; then
    edit "$PROVIDER" '    apply(AppState.currentState);' "    apply('active');"
    verdict 'auth-provider' 'does not start a ticker when mounted while the app is backgrounded'
  fi

  begin_mutant "keychain-accessibility-inherited" \
    "SecureStore writes stop stating their accessibility class" \
    "M21 / claim 23 — every write is WHEN_UNLOCKED"
  if baseline 'secure-store-accessibility' 'writes every key as WHEN_UNLOCKED, never a weaker class'; then
    edit "$ADAPTER" \
      '    SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED }),' \
      '    SecureStore.setItemAsync(key, value),'
    verdict 'secure-store-accessibility' 'writes every key as WHEN_UNLOCKED, never a weaker class'
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
  echo "mutants:   $MUTANT_COUNT"
  echo "sensitive: $SENSITIVE_COUNT"
  echo "exit:      $FAILED"
} > "$OUT/mutants.txt" 2>&1

if [ "$FAILED" -ne 0 ]; then
  echo "mutants.sh: a mutant SURVIVED, was INCONCLUSIVE, a baseline was not green," >&2
  echo "            or a file was not restored — see mutants.txt." >&2
  exit 1
fi
echo "mutants.sh: $SENSITIVE_COUNT/$MUTANT_COUNT mutants turned their claim red; tree restored."
