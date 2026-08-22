#!/usr/bin/env bash
# Regenerates this directory's OFFLINE artifacts. Gated (byte-stable at the
# committed head, normalization stated in README.md): types-shape.txt,
# redaction-control.txt, settings-preflight-control.txt, gates.txt,
# secret-scan.txt, inventory.txt.
# Run-varying (fields named in README.md): environment.txt. The three live
# artifacts (anon-probes.txt, auth-probes.txt, redaction-gate.txt) are NOT
# touched here — live-probes.sh produced them once against staging and the
# committed copies are the evidence boundary (003a connectivity precedent).
#
# Fail closed (house rule): this script exits 1 — after writing the
# transcript that shows why — on a types-shape extraction failure, a
# redaction positive control that fails to go red, an auth-settings preflight
# control whose cases do not behave exactly as pinned, any nonzero CI-step
# exit, a wrong inventory, a secret-scan match against the index, or a
# broken positive control. A green artifact set from a red run cannot
# exist.
#
# inventory.txt and secret-scan.txt read the index, so they follow the 003a
# fixed-point discipline: `git add -A`, run, and repeat until the output
# stops changing. At a committed head one run reproduces it.
#
# Usage, from the repo root:
#   bash docs/05-quality/evidence/004b-schema-rls-live/capture.sh [outdir]
set -u
export LC_ALL=C
export LANG=C
evdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(git rev-parse --show-toplevel)"
repo_root="$(pwd)"
outdir="${1:-docs/05-quality/evidence/004b-schema-rls-live}"
mkdir -p "$outdir"

BASE=7ebeb8bf59132961dab73cd5c1ee3692105cf11f # the dispatch-named origin tip (Phase B base)

# --- environment.txt — run-varying: node, npm, and OS move with the machine.
{
  echo "node: $(node --version)"
  echo "npm: $(npm --version)"
  echo "os: $(uname -sr)"
  echo "locale: LC_ALL=C LANG=C (pinned by capture.sh; see README normalization note)"
} > "$outdir/environment.txt"

# --- types-shape.txt — the declared table -> Row-column map, extracted
# deterministically from the committed src/lib/database.types.ts. The live
# probes compare REST row keys against exactly this output.
if node "$evdir/types-shape.mjs" > "$outdir/types-shape.txt" 2>&1; then shape_exit=0; else shape_exit=$?; fi
echo "--- exit code: $shape_exit (0 = extraction succeeded) ---" >> "$outdir/types-shape.txt"
if [ "$shape_exit" -ne 0 ]; then
  echo "FAIL CLOSED: types-shape extraction failed (exit $shape_exit) — see $outdir/types-shape.txt" >&2
  exit 1
fi

# --- redaction-control.txt — REVIEW-011 finding 3 positive control: the
# post-write file-byte gate (redaction-gate.mjs) goes red on a planted
# direct-child-stdout leak of a synthetic key and deletes the transcript.
# Runs the real live-probes.sh pipeline against synthetic values only
# (https://127.0.0.1:9 — instant refusal; no network, no DNS, nothing real
# contacted). Deterministic by construction, so it is gated.
if bash "$evdir/live-probes.sh" --control "$outdir" >/dev/null 2>&1; then rc_exit=0; else rc_exit=$?; fi
if [ "$rc_exit" -ne 0 ]; then
  echo "FAIL CLOSED: redaction positive control did not prove the red path (exit $rc_exit) — see $outdir/redaction-control.txt" >&2
  exit 1
fi

# --- settings-preflight-control.txt — the REVIEW-015 finding 2 and
# REVIEW-016 finding 2 controls, in two sections. Section 1: the auth-settings
# preflight in rls-probes.mjs must abort the run, before any probe, on every
# unusable /auth/v1/settings response — in BOTH production modes — and a
# well-formed response must still let the run continue into probes. Section 2:
# live-probes.sh must refuse to start, before anything is read or written, when
# a control variable is present in its inherited environment, in both of its
# modes, and must still admit a clean environment. Neither producer carries a
# test hook: every case drives a real entry point with no control variable set,
# against a loopback HTTP server (127.0.0.1, ephemeral port, synthetic key; no
# Supabase project, credential, or network host is contacted, and the children
# read their URL and key from the environment, never from .env). Deterministic
# by construction, so it is gated.
if node "$evdir/settings-control.mjs" > "$outdir/settings-preflight-control.txt" 2>&1; then
  sc_exit=0
else
  sc_exit=$?
fi
echo "--- exit code: $sc_exit (0 = every case behaved exactly as pinned) ---" >> "$outdir/settings-preflight-control.txt"
if [ "$sc_exit" -ne 0 ]; then
  echo "FAIL CLOSED: the auth-settings preflight control did not behave as pinned (exit $sc_exit) — see $outdir/settings-preflight-control.txt" >&2
  exit 1
fi

# --- gates.txt — the four non-install CI steps at this head, plus the
# no-dependency-delta probe that justifies not rerunning npm ci here (004a
# precedent: no dependency change in this unit's delta, and 002d/003a
# document the destructive npm-ci ENOTEMPTY transient under a live editor;
# CI runs the real install when the PR opens). Normalization: jest's Time
# line masked and per-suite duration suffixes stripped; lines starting
# "env: " dropped (Expo CLI prints them only when a local .env exists —
# machine state, not repo state).
gate_violations=0
{
  echo "# Four CI steps at this head. npm ci is deliberately NOT run here: this"
  echo "# unit's delta contains no dependency change (proven below), and 002d/003a"
  echo "# document the destructive npm-ci ENOTEMPTY transient under a live editor."
  echo "# The install step runs in CI itself when the PR opens."
  echo
  echo "\$ git diff $BASE --name-only -- package.json package-lock.json   # no dependency delta vs the dispatch base"
  dep_delta="$(git diff "$BASE" --name-only -- package.json package-lock.json)"
  echo "${dep_delta:-<none>}"
  echo "--- dependency files changed since base: $([ -z "$dep_delta" ] && echo 0 || printf '%s\n' "$dep_delta" | wc -l | tr -d ' ') ---"
  [ -z "$dep_delta" ] || gate_violations=$((gate_violations + 1))
  echo
  echo "\$ npx tsc --noEmit"
  if tc_out="$(npx tsc --noEmit 2>&1)"; then tc_exit=0; else tc_exit=$?; fi
  [ -n "$tc_out" ] && printf '%s\n' "$tc_out"
  echo "--- exit code: $tc_exit ---"
  [ "$tc_exit" -eq 0 ] || gate_violations=$((gate_violations + 1))
  echo
  echo "\$ npx expo lint"
  if lint_out="$(npx expo lint 2>&1)"; then lint_exit=0; else lint_exit=$?; fi
  lint_out="$(printf '%s\n' "$lint_out" | grep -v '^env: ')" || true
  [ -n "$lint_out" ] && printf '%s\n' "$lint_out"
  echo "--- exit code: $lint_exit ---"
  [ "$lint_exit" -eq 0 ] || gate_violations=$((gate_violations + 1))
  echo
  echo "\$ npx jest"
  if test_out="$(npx jest 2>&1)"; then test_exit=0; else test_exit=$?; fi
  printf '%s\n' "$test_out" | sed -E \
    -e 's/^Time:.*$/Time: <duration>/' \
    -e 's/ \([0-9.]+ m?s\)$//'
  echo "--- exit code: $test_exit ---"
  [ "$test_exit" -eq 0 ] || gate_violations=$((gate_violations + 1))
  echo
  echo "\$ prettier --check .   # pinned local binary, in a clean checkout-index of the staged tree"
  echo "# Normalization: the check runs against exactly the staged tree (git checkout-index"
  echo "# into scratch), because prettier walks untracked working-copy files and does not"
  echo "# read nested ignore rules — the owner's machine-local supabase/.temp CLI residue"
  echo "# (untracked, ignored by supabase/.gitignore) would otherwise be flagged. CI checks"
  echo "# out only the tracked tree, so this measures what the CI step measures."
  fmt_scratch="$(mktemp -d)"
  git checkout-index -a --prefix="$fmt_scratch/tree/"
  if fmt_out="$(cd "$fmt_scratch/tree" && "$repo_root/node_modules/.bin/prettier" --check . 2>&1)"; then fmt_exit=0; else fmt_exit=$?; fi
  rm -rf "$fmt_scratch"
  printf '%s\n' "$fmt_out"
  echo "--- exit code: $fmt_exit ---"
  [ "$fmt_exit" -eq 0 ] || gate_violations=$((gate_violations + 1))
  echo
  echo "--- enforced: zero dependency delta and all four steps exit 0, or capture.sh exits 1 (fail closed) ---"
} > "$outdir/gates.txt"
if [ "$gate_violations" -ne 0 ]; then
  echo "FAIL CLOSED: a repo gate failed or the dependency delta is nonzero ($gate_violations violation(s)) — see $outdir/gates.txt" >&2
  exit 1
fi

# --- inventory.txt — the exact bytes this phase's claims are about: the
# owner-regenerated types file and the applied migration set, pinned by
# index blob SHA (fixed-point discipline, like 003a/004a).
{
  echo "\$ git ls-files -s -- src/lib/database.types.ts supabase/"
  git ls-files -s -- src/lib/database.types.ts supabase/
  count="$(git ls-files -- src/lib/database.types.ts supabase/ | wc -l | tr -d ' ')"
  echo "--- tracked files listed: $count (7 required: the types file, config.toml, .gitignore, four migrations) ---"
} > "$outdir/inventory.txt"
if [ "$(git ls-files -- src/lib/database.types.ts supabase/ | wc -l | tr -d ' ')" != "7" ]; then
  echo "FAIL CLOSED: inventory is not the expected seven tracked files — see $outdir/inventory.txt (is the working tree staged? fixed-point discipline)" >&2
  exit 1
fi

# --- secret-scan.txt — no credential shape exists anywhere in the index.
# The five 004a patterns plus a JWT shape (live-probe transcripts are the
# new file class this phase adds; an unredacted access token is the leak
# shape native to them). Patterns are written defanged; each carries a
# runtime-assembled positive control.
p=p; s=s; DOT=.; COLON=:; E=e
scan_violations=0
{
  echo "\$ git grep --cached -I -l -E <pattern>   # over the full index"
  for row in \
    "publishable-key prefix|sb_[p]ublishable_|sb_${p}ublishable_SYNTHETIC00" \
    "secret-key prefix|sb_[s]ecret_|sb_${s}ecret_SYNTHETIC00" \
    "any concrete project host|[a-z0-9-]+[.]supabase[.]co|abcdefghij.supabase${DOT}co" \
    "access token with inline value|ACCESS_TOKEN=[A-Za-z0-9]|ACCESS_TOKEN=${p}synthetic" \
    "conn string with inline credentials|postgres(ql)?[:]//[^@ ]+[:][^@ ]+@|postgres${COLON}//u:pw@h.example" \
    "JWT shape (unredacted token)|[e]yJ[A-Za-z0-9_-]{8,}[.][A-Za-z0-9_-]{8,}[.]|${E}yJSYNTHETIC0AB.${E}yJSYNTHETIC0AB.sig"; do
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

echo "wrote types-shape.txt, redaction-control.txt, settings-preflight-control.txt, gates.txt, inventory.txt, secret-scan.txt, environment.txt to $outdir"
