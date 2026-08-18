#!/usr/bin/env bash
# Proves the one runtime claim OPERATIONS.md is now allowed to make: the Expo
# dev server starts and serves the app's root route.
#
# What this is not. It is not a rendering check. The dev server's web target
# is server-rendered by Expo Router's static rendering, so the markup below is
# produced by Node, not by a browser laying it out or by React Native mounting
# on a device. The rendering itself is attested separately, by a human, in
# ../002c-owner-smoke/attestation.md — and that attestation corrected two
# descriptions of this page that the loop's surrounding prose had gotten
# wrong. The checks this script makes on the served markup were accurate
# throughout; the errors lived in the documentation written around them.
# (REVIEW-005 finding 4 corrected this comment and the transcript note below,
# both of which misattributed those errors to an earlier version of this
# script.) That prose could be wrong while the checks were right is still a
# fair summary of how far a server-side capture can be trusted to describe a
# screen.
#
# Determinism. The transcript records the HTTP status, whether the placeholder
# screen's own strings are present in the served markup, and the server's
# startup lines up to the point where it says it is listening. Metro's
# per-request bundle log is deliberately excluded: how many times the SSR
# bundle is rebuilt, and its module count, depend on cache state and on how
# many requests arrive, so those lines cannot be byte-stable. The absolute
# repository path Metro prints is replaced with <repo-root>.
#
# The port is fixed. If something already holds it, the script stops rather
# than letting Expo pick a different one and vary the transcript.
#
# Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002c-fix-loop-2/dev-server.txt"
PORT=8081
LOG=$(mktemp)
BODY=$(mktemp)
trap 'rm -f "$LOG" "$BODY"' EXIT

if lsof -ti ":$PORT" > /dev/null 2>&1; then
  echo "port $PORT is already in use — free it and rerun" >&2
  exit 2
fi

CI=1 npx expo start --web --port "$PORT" > "$LOG" 2>&1 &
SERVER=$!

# --retry-connrefused waits for the bundler instead of racing it.
CODE=$(curl -s -o "$BODY" -w '%{http_code}' \
  --retry 60 --retry-delay 5 --retry-connrefused --retry-all-errors \
  --max-time 60 "http://localhost:$PORT/" || echo "no-response")

kill "$SERVER" 2>/dev/null
wait "$SERVER" 2>/dev/null
lsof -ti ":$PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null

has() {
  if grep -qF "$1" "$BODY"; then echo yes; else echo no; fi
}

{
  echo "\$ CI=1 npx expo start --web --port $PORT   # backgrounded, then killed"
  echo
  echo "=== 1. the server's own startup output ==="
  sed -e "s#$(pwd)#<repo-root>#g" "$LOG" | sed -n '1,/^Waiting on /p'
  echo
  echo "=== 2. what it served on / ==="
  echo "\$ curl -s -o body.html -w '%{http_code}' http://localhost:$PORT/"
  echo "http status:                                 $CODE"
  echo "body contains 'Placeholder home screen':     $(has 'Placeholder home screen')"
  echo "body contains 'Edit src/app/index.tsx':      $(has 'Edit src/app/index.tsx')"
  echo "body contains 'ZC App (dev)':                $(has 'ZC App (dev)')"
  echo "body contains the Stack header '>index<':    $(has '>index<')"
  echo "<title> element as served:                   $(grep -o '<title[^>]*>[^<]*</title>' "$BODY" | head -1)"
  echo
  echo "Two notes about what is on the page, both corrected by the owner's smoke"
  echo "test (../002c-owner-smoke/attestation.md) after the prose written around"
  echo "this artifact — not this script's checks, which were accurate throughout"
  echo "— described the page wrongly:"
  echo
  echo "  1. The root <Stack /> renders a header bar, and its title is the route"
  echo "     name, so the page shows 'index' above the placeholder text. It is"
  echo "     in the markup above and always was."
  echo "  2. The <title> is empty *as served*. Expo Router sets it on the client"
  echo "     after hydration, to the same route name, so a real browser tab"
  echo "     reads 'index'. A server-side capture cannot see that; the owner"
  echo "     observed it directly."
  echo
  echo "Neither says 'ZC App (dev)'. The app name reaches a user through the web"
  echo "manifest embedded in the bundle (../002b-fix-loop/name-scan.txt section"
  echo "3) and through the Expo Go project list — not through anything drawn on"
  echo "this page."
  echo
  echo "=== 3. what this does not show ==="
  echo "This markup came from Expo Router's static rendering, in Node. Nothing"
  echo "here is a browser, a simulator or a device rendering anything, and no"
  echo "rendering claim rests on this file. The browser is attested separately"
  echo "by a person, in ../002c-owner-smoke/attestation.md (web, PASS,"
  echo "2026-08-18); simulator, emulator and device remain NOT RUN."
  echo "--- exit code: $([ "$CODE" = "200" ] && echo 0 || echo 1) ---"
} > "$OUT"
echo "wrote $OUT"
