#!/usr/bin/env bash
# Records where the uncleared product name appears, and classifies each name
# field as user-visible or internal — REVIEW-003 finding 1 and the controller
# ruling that resolves it.
#
# Four sections, weakest evidence first:
#   1. app.json as written
#   2. the config Expo resolves from it (`expo config --type public`)
#   3. the manifest actually embedded in the exported web bundle, which is where
#      Expo's *derived* display names (web.name, web.shortName) become visible
#   4. every tracked occurrence of the name, in and outside governance prose
#
# Section 3 needs `dist/` from capture.sh; it reports itself skipped if absent.
# It masks the web bundle's content hash in the filename it echoes — see the
# comment at that section for why the hash cannot be reproduced.
#
# Section 4 reads the *index* (`git grep --cached`), not the working tree
# (REVIEW-004 finding 1). The first version read the working tree, which counts
# whatever happens to be on disk at the moment of the run, including files not
# yet staged; it recorded 14 governance files for a commit that contains 21.
# Reading the index makes the section describe the tree that is about to be
# committed, and at any committed head the index equals HEAD, so a rerun there
# reproduces the transcript byte for byte.
#
# While building, that means the same fixed-point discipline tracked-files.sh
# uses: `git add -A`, run this script, `git add -A`, run it again, and repeat
# until the output stops changing. Two passes normally suffice — this file's own
# output is one of the tracked files section 4 counts.
#
# Run from the repo root.

set -u
OUT="docs/05-quality/evidence/002b-fix-loop/name-scan.txt"

{
  echo "=== 1. app.json as written ==="
  echo "\$ node -e '<classify app.json fields>'"
  node -e "
    const e = require('./app.json').expo;
    // Keys are written with their 'expo.' prefix for readability; the config
    // object above is already that prefix, so strip it before walking.
    const get = (p) =>
      p.replace(/^expo\./, '').split('.').reduce((o, k) => (o == null ? o : o[k]), e);
    const rows = [
      ['expo.name', 'user-visible', 'Expo Go list and installed home-screen label'],
      ['expo.web.name', 'user-visible', 'web manifest name; unset here, derived at export'],
      ['expo.web.shortName', 'user-visible', 'web manifest short label; unset here, derived'],
      ['expo.slug', 'internal', 'project identifier for Expo/EAS, like the repo name'],
      ['expo.scheme', 'internal', 'deep-link URI scheme, not a display string'],
      ['expo.version', 'user-visible', 'store version string; carries no name'],
    ];
    for (const [key, cls, note] of rows) {
      console.log(
        key.padEnd(20) + cls.padEnd(14) + JSON.stringify(get(key) ?? null).padEnd(18) + note
      );
    }
    const bad = rows.filter(
      ([key, cls]) => cls === 'user-visible' && /noema/i.test(String(get(key) ?? ''))
    );
    console.log('');
    console.log('user-visible app.json fields matching /noema/i: ' + bad.length);
    if (bad.length) {
      console.log('OFFENDING: ' + bad.map(([k]) => k).join(', '));
      process.exit(1);
    }
  "
  echo "--- exit code: $? ---"
  echo

  echo "=== 2. the config Expo resolves ==="
  echo "\$ npx expo config --type public --json"
  npx expo config --type public --json 2>/dev/null | node -e "
    let d = '';
    process.stdin.on('data', (c) => (d += c)).on('end', () => {
      const c = JSON.parse(d);
      for (const k of ['name', 'slug', 'scheme', 'version', 'sdkVersion']) {
        console.log(k.padEnd(12) + JSON.stringify(c[k] ?? null));
      }
      console.log('');
      console.log('resolved name matches /noema/i: ' + /noema/i.test(String(c.name)));
    });
  "
  echo "--- exit code: $? ---"
  echo

  echo "=== 3. the manifest embedded in the exported web bundle ==="
  BUNDLE=$(ls dist/_expo/static/js/web/entry-*.js 2>/dev/null | head -1)
  if [ -z "$BUNDLE" ]; then
    echo "SKIPPED — no dist/ export present. Run capture.sh first."
  else
    # The web bundle's filename carries its content hash, and that hash is not
    # reproducible: `expo export --platform all` bundles the platforms
    # concurrently and assigns module ids in completion order, so the web
    # bundle's bytes differ between runs. The manifest read out of it does not.
    # Print the path with the hash masked, and keep the result exact.
    echo "\$ <extract the embedded manifest from ${BUNDLE%/*}/entry-<hash>.js>"
    node -e "
      const fs = require('fs');
      const s = fs.readFileSync(process.argv[1], 'utf8');
      // The manifest ships as a JSON string inside a JS string literal.
      const m = s.match(/get manifest\(\)\{return(\"(?:\\\\.|[^\"])*\")/);
      if (!m) { console.log('manifest literal not found in bundle'); process.exit(1); }
      const c = JSON.parse(JSON.parse(m[1]));
      const rows = [
        ['name', 'user-visible', c.name],
        ['web.name', 'user-visible', c.web && c.web.name],
        ['web.shortName', 'user-visible', c.web && c.web.shortName],
        ['slug', 'internal', c.slug],
        ['scheme', 'internal', c.scheme],
      ];
      for (const [k, cls, v] of rows) {
        console.log(k.padEnd(16) + cls.padEnd(14) + JSON.stringify(v ?? null));
      }
      const bad = rows.filter(([k, cls, v]) => cls === 'user-visible' && /noema/i.test(String(v ?? '')));
      console.log('');
      console.log('user-visible shipped fields matching /noema/i: ' + bad.length);
      if (bad.length) { console.log('OFFENDING: ' + bad.map(([k]) => k).join(', ')); process.exit(1); }
    " "$BUNDLE"
    echo "--- exit code: $? ---"
  fi
  echo

  echo "=== 4. tracked occurrences of the name (read from the index) ==="
  echo "\$ git grep --cached -n -i noema -- ':!docs/'   # outside governance prose"
  git grep --cached -n -i noema -- ':!docs/'
  echo "--- exit code: $? ---"
  echo
  echo "\$ git grep --cached -l -i noema -- 'docs/' | wc -l   # governance files naming the project"
  git grep --cached -l -i noema -- 'docs/' | wc -l
  echo "--- exit code: 0 ---"
} > "$OUT" 2>&1
echo "wrote $OUT"
