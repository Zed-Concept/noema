#!/usr/bin/env bash
# Proves the one runtime claim OPERATIONS.md is now allowed to make: the Expo
# dev server starts and serves the app's root route.
#
# What this is not. It is not a rendering check. The dev server's web target
# is server-rendered by Expo Router's static rendering, so the markup below is
# produced by Node, not by a browser laying it out or by React Native mounting
# on a device. Nobody has looked at a screen. That is what
# ../002c-owner-smoke/ exists to collect.
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
  echo "<title> element as served:                   $(grep -o '<title[^>]*>[^<]*</title>' "$BODY" | head -1)"
  echo
  echo "The app name is not on this page. Expo puts it in the web manifest"
  echo "embedded in the bundle (../002b-fix-loop/name-scan.txt section 3) and in"
  echo "the Expo Go project list, not in the served document title, which the"
  echo "skeleton leaves empty."
  echo
  echo "=== 3. what this does not show ==="
  echo "This markup came from Expo Router's static rendering, in Node. No"
  echo "browser, simulator or device rendered anything. Rendering is NOT RUN."
  echo "--- exit code: $([ "$CODE" = "200" ] && echo 0 || echo 1) ---"
} > "$OUT"
echo "wrote $OUT"
