#!/usr/bin/env bash
# Produces anon-probes.txt, auth-probes.txt, and redaction-gate.txt — all
# run-varying (live staging state, network, generated ids and timestamps;
# varying fields named in README.md), captured once per phase/cycle: the
# committed transcripts are the evidence boundary (003a connectivity
# precedent). Re-running the --auth mode needs the owner-class cleanup
# documented in README.md.
#
# Redaction is enforced in two layers (REVIEW-011 finding 3 rebuilt the
# outer one): rls-probes.mjs redacts at source and gates its own buffered
# output — but this script commits the child's ENTIRE stdout/stderr to the
# transcript file, a stream a stray direct write could reach without passing
# through that buffer. So after each transcript file is complete (header +
# child output + exit trailer — the exact bytes a commit would record),
# redaction-gate.mjs scans those file bytes against every value the child
# registered in the run ledger, plus the JWT shape. Gate exit 1 fails this
# script on every red path; the transcript file is deleted exactly on the
# residual-match path (secret bytes found in the scanned file), while the
# fail-closed paths — ledger missing, unreadable, or implausibly small;
# transcript unreadable — return 1 without deleting, because nothing was
# scanned (REVIEW-012 finding 3: the exit status, not deletion, is the
# fail-closed contract). redaction-gate.txt records each file's sha256 so
# the committed bytes are provably the scanned bytes. The ledger lives in a
# 0700 scratch directory outside the repo and is removed on exit.
#
# Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
# either already exported (the Unit B pattern), or present in the repo-root
# .env (gitignored; the OPERATIONS.md pattern), from which exactly these two
# names are extracted below — the file is never sourced, and no value is ever
# echoed.
#
# --control mode (the finding 3 positive control, run by capture.sh): the
# same run_mode + gate pipeline against synthetic values only — the URL is
# https://127.0.0.1:9 (instant refusal; no network, no DNS) and the key is
# runtime-assembled with a SYNTHETIC marker — with the leak hook in
# rls-probes.mjs enabled, into scratch. Proves the gate goes red on
# direct-child-stdout leakage and deletes the file. Writes
# redaction-control.txt (deterministic by construction, so it is gated).
#
# Exit (default mode): the worst child/gate status — 0 all probes passed and
# both gates green; 1 any probe failure, redaction trip, or gate red; 2 not
# configured; 3 authenticated path NOT RUN (reason recorded in the
# transcript; the anon evidence stands separately). --control mode: 0 the
# control proved the red path exactly; 1 otherwise.
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/004b-schema-rls-live/live-probes.sh
#   bash docs/05-quality/evidence/004b-schema-rls-live/live-probes.sh --control [outdir]
set -u
export LC_ALL=C
export LANG=C
evdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(git rev-parse --show-toplevel)"

scratch="$(mktemp -d)"
chmod 700 "$scratch"
trap 'rm -rf "$scratch"' EXIT
REDACTION_LEDGER="$scratch/ledger"
export REDACTION_LEDGER
: > "$REDACTION_LEDGER"
chmod 600 "$REDACTION_LEDGER"

worst=0
bump() {
  [ "$1" -gt "$worst" ] && worst="$1"
  return 0
}

target_dir="" # set below before run_mode is called
run_mode() {
  # $1 = --anon | --auth; $2 = outfile, written into $target_dir. The file
  # gets the child's complete stdout+stderr; the gate scans it afterwards.
  mode="$1"
  outfile="$2"
  child=0
  {
    echo "# ${outfile%.txt} — rls-probes.mjs $mode (redacted at source; file bytes gated post-write)"
    echo "# run date (UTC): $(date -u +%Y-%m-%d)"
    if node "$evdir/rls-probes.mjs" "$mode" 2>&1; then child=0; else child=$?; fi
    echo "--- exit code: $child (0 pass; 1 fail/redaction-trip; 2 unconfigured; 3 auth path NOT RUN) ---"
  } > "$target_dir/$outfile"
  bump "$child"
}

if [ "${1:-}" = "--control" ]; then
  outdir="${2:-docs/05-quality/evidence/004b-schema-rls-live}"
  mkdir -p "$outdir"
  target_dir="$scratch"
  # Synthetic values only, assembled at runtime so no committed byte carries
  # a credential shape. The leak hook fires only on the SYNTHETIC marker.
  P=p
  SYN_KEY="sb_${P}ublishable_REDACTIONCONTROLSYNTHETIC00"
  export EXPO_PUBLIC_SUPABASE_URL="https://127.0.0.1:9"
  export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$SYN_KEY"
  export REDACTION_CONTROL_LEAK=1
  run_mode --anon control-probe.txt
  child_exit="$worst"
  leak_lines="$(grep -cF "$SYN_KEY" "$scratch/control-probe.txt")" || true
  if gate_out="$(node "$evdir/redaction-gate.mjs" "$scratch/control-probe.txt" 2>&1)"; then
    gate_exit=0
  else
    gate_exit=$?
  fi
  if [ -f "$scratch/control-probe.txt" ]; then still=yes; else still=no; fi
  control_violations=0
  [ "$child_exit" -eq 1 ] || control_violations=$((control_violations + 1))
  [ "${leak_lines:-0}" -ge 1 ] || control_violations=$((control_violations + 1))
  [ "$gate_exit" -eq 1 ] || control_violations=$((control_violations + 1))
  [ "$still" = "no" ] || control_violations=$((control_violations + 1))
  {
    echo "# Redaction file-byte gate — positive control (REVIEW-011 finding 3)."
    echo "# A synthetic publishable-shaped key (runtime-assembled; defanged here as"
    echo "# sb_[p]ublishable_REDACTIONCONTROLSYNTHETIC00) is leaked by rls-probes.mjs"
    echo "# straight to stdout — bypassing out()/redact() and the in-process buffer"
    echo "# gate — through the real run_mode pipeline into a scratch transcript"
    echo "# (header + complete child stdout/stderr + exit trailer), which"
    echo "# redaction-gate.mjs then scans on exact file bytes. Synthetic env only:"
    echo "# the URL is https://127.0.0.1:9 (instant refusal — no network, no DNS),"
    echo "# so every probe fails and nothing real is contacted or registered."
    echo
    echo "child exit code: $child_exit (1 required: probes red under synthetic env; the in-process gate stays green — the leak bypassed its buffer, which is the defect class under test)"
    echo "raw synthetic key lines in the pre-gate transcript bytes: $leak_lines (>= 1 required — the leak really reached the committed stream)"
    echo "gate report (bytes/sha256 lines omitted — scratch content varies run to run):"
    printf '%s\n' "$gate_out" |
      grep -E '^(file|registered values scanned|jwt-shape sweep|residual registered-value classes|verdict):' |
      sed 's/^file: .*/file: <scratch control transcript>/'
    echo "post-gate scratch transcript still exists: $still (no required — the residual-match red path deletes the file)"
    echo
    echo "--- enforced: child exit 1, leak present pre-gate, gate RED (exit 1), transcript deleted — or this control exits 1 ---"
  } > "$outdir/redaction-control.txt"
  echo "wrote $outdir/redaction-control.txt (violations: $control_violations)"
  [ "$control_violations" -eq 0 ] || exit 1
  exit 0
fi

outdir="${1:-docs/05-quality/evidence/004b-schema-rls-live}"
mkdir -p "$outdir"
target_dir="$outdir"

extract_env() {
  # $1 = variable name. First NAME=value line from .env; strips one layer of
  # surrounding quotes and a trailing CR. Never echoed by any caller.
  sed -n "s/^$1=//p" .env | head -1 |
    sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//" -e 's/\r$//'
}
if [ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] && [ -f .env ]; then
  EXPO_PUBLIC_SUPABASE_URL="$(extract_env EXPO_PUBLIC_SUPABASE_URL)"
  export EXPO_PUBLIC_SUPABASE_URL
fi
if [ -z "${EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" ] && [ -f .env ]; then
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(extract_env EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
  export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
fi

run_mode --anon anon-probes.txt
echo "wrote $outdir/anon-probes.txt"
run_mode --auth auth-probes.txt
echo "wrote $outdir/auth-probes.txt"

# Both transcripts are complete; gate each on its exact final bytes, against
# the full both-mode ledger (a strict superset of either mode's own set).
{
  echo "# redaction-gate — exact-file-byte scan of each live transcript (post-write,"
  echo "# pre-commit) against every value registered in this run's ledger, plus the"
  echo "# JWT shape. The sha256 lines bind the committed bytes to the scanned bytes."
  echo "# Exit 1 fails the run on every red path; the transcript is deleted exactly"
  echo "# on the residual-match path, while ledger-failure paths (missing, unreadable,"
  echo "# implausibly small) return 1 without deleting — nothing was scanned"
  echo "# (REVIEW-011 finding 3 rebuild, exactness per REVIEW-012 finding 3; the"
  echo "# planted-leak positive control is redaction-control.txt)."
  echo "# run date (UTC): $(date -u +%Y-%m-%d)"
  for f in anon-probes.txt auth-probes.txt; do
    echo
    if gate_out="$(node "$evdir/redaction-gate.mjs" "$outdir/$f" 2>&1)"; then g=0; else g=$?; fi
    printf '%s\n' "$gate_out"
    echo "--- gate exit: $g (0 green; 1 red — residual match deletes the transcript, ledger-failure returns 1 without deleting) ---"
    bump "$g"
  done
} > "$outdir/redaction-gate.txt"
echo "wrote $outdir/redaction-gate.txt"
exit "$worst"
