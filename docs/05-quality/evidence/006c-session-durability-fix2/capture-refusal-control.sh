#!/usr/bin/env bash
#
# Negative control for capture.sh's git-failure discipline — REVIEW-023
# finding 5, committed as an instrument; carried into 006c unchanged apart
# from this directory's paths (the 006c capture adds tree-binding per
# REVIEW-024 finding 3 and must still fail closed under a refusing git).
#
# The reviewer's control: a PATH-prepended `git` wrapper returning exit 77
# for every `git diff` made the 006a producer exit 0 while reporting an empty
# range with all its regex controls matched — a false green. This script
# commits that exact control against THIS directory's capture.sh:
#
#   1. WRAPPER SELF-TEST (the control's own positive control): through the
#      wrapper, `git diff` must exit 77 while `git rev-parse HEAD` passes
#      through — proving the wrapper refuses exactly what it claims to, so a
#      capture failure below is attributable to the refusal and nothing else.
#   2. THE CONTROL: capture.sh runs into a scratch directory with the wrapper
#      first in PATH. It MUST exit non-zero, and its transcripts must carry
#      the git-failure lines.
#
# ITS EXIT STATUS IS ITS CONTRACT: 0 only when the wrapper self-test passes
# AND the wrapped capture exits non-zero. A wrapped capture exiting 0 is the
# false green this control exists to catch, and exits 1 here.
#
# The transcript is written to capture-refusal-control.txt (or into the
# directory given as the first positional argument — a parameter, not an
# environment variable, per learning 10). The full wrapped capture runs the
# real gates, so this control costs one complete capture run; fidelity over
# speed, deliberately — a shortcut capture would prove a shortcut.
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
HERE=docs/05-quality/evidence/006c-session-durability-fix2
OUT="${1:-$HERE}"

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "capture-refusal-control.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

REAL_GIT="$(command -v git)"
WRAP_DIR="$(mktemp -d)"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$WRAP_DIR" "$SCRATCH"' EXIT

cat > "$WRAP_DIR/git" <<WRAPPER
#!/bin/sh
# The reviewer's refusal: every \`git diff\` exits 77; everything else passes
# through to the real git, so the failure the wrapped capture must report is
# attributable to the diff refusal alone.
if [ "\$1" = "diff" ]; then
  exit 77
fi
exec "$REAL_GIT" "\$@"
WRAPPER
chmod +x "$WRAP_DIR/git"

VERDICT_FAIL=0
{
  echo "# capture.sh git-refusal negative control — REVIEW-023 finding 5."
  echo "# A PATH-prepended git returns 77 for every 'git diff'; the producer"
  echo "# must exit non-zero. The 006a producer exited 0 under exactly this"
  echo "# refusal; this transcript is the committed proof the 006c producer"
  echo "# does not."
  echo
  echo "## 1. Wrapper self-test (the control's positive control)"
  PATH="$WRAP_DIR:$PATH" git diff HEAD~1 HEAD >/dev/null 2>&1
  DIFF_EXIT=$?
  echo "  wrapped 'git diff HEAD~1 HEAD' exit: $DIFF_EXIT (must be 77)"
  WRAPPED_HEAD="$(PATH="$WRAP_DIR:$PATH" git rev-parse HEAD 2>/dev/null)"
  RP_EXIT=$?
  echo "  wrapped 'git rev-parse HEAD' exit:   $RP_EXIT (must be 0; passthrough)"
  if [ "$DIFF_EXIT" -ne 77 ] || [ "$RP_EXIT" -ne 0 ] || [ -z "$WRAPPED_HEAD" ]; then
    echo "  SELF-TEST FAILED — the wrapper does not refuse what it claims to;"
    echo "  nothing below would be attributable."
    VERDICT_FAIL=1
  else
    echo "  self-test passed: the wrapper refuses diffs and only diffs."
  fi
  echo

  echo "## 2. capture.sh under the refusing git (must exit non-zero)"
  if [ "$VERDICT_FAIL" -eq 0 ]; then
    PATH="$WRAP_DIR:$PATH" bash "$HERE/capture.sh" "$SCRATCH" > "$SCRATCH/.stdout" 2>&1
    CAPTURE_EXIT=$?
    echo "  capture.sh exit: $CAPTURE_EXIT"
    echo
    echo "  capture stdout/stderr:"
    sed 's/^/    /' "$SCRATCH/.stdout"
    echo
    echo "  git-failure lines in the produced transcripts:"
    grep -rn "FAILURE: git" "$SCRATCH" --include='*.txt' 2>/dev/null | sed 's/^/    /' || echo "    (none found)"
    echo
    if [ "$CAPTURE_EXIT" -eq 0 ]; then
      echo "  VERDICT: FALSE GREEN — capture.sh exited 0 under refused git diffs."
      echo "  This is the 006a defect, reproduced; the control FAILS."
      VERDICT_FAIL=1
    else
      echo "  VERDICT: capture.sh refused (exit $CAPTURE_EXIT) under refused git"
      echo "  diffs — the producer fails closed. Control PASSES."
    fi
  else
    echo "  SKIPPED — the wrapper self-test failed."
  fi
} > "$OUT/capture-refusal-control.txt"

if [ "$VERDICT_FAIL" -ne 0 ]; then
  echo "capture-refusal-control.sh: control FAILED — see capture-refusal-control.txt." >&2
  exit 1
fi
echo "capture-refusal-control.sh: wrapper proven, capture fails closed — see capture-refusal-control.txt."
