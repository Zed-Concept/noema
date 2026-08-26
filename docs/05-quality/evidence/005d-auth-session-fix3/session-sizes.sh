#!/usr/bin/env bash
#
# Session-size measurement for 005d — auth and session v1, fix cycle 3.
#
# WHY THIS EXISTS
#
# REVIEW-020 finding 2 rejected the justification for lowering MAX_CHUNKS from
# 256 to 64. The justification was that 96 KiB is "far beyond any session
# payload". That was ASSERTED, never measured, and it was false: auth-js
# persists the whole `Session.user` when no separate `userStorage` is
# configured — as here — and `UserMetadata`/`UserAppMetadata` carry open-ended
# index signatures, so a structurally valid session with a 100,000-character
# metadata value needs more chunks than the ceiling allowed. The ceiling refused
# a session the pinned client can hand the adapter.
#
# The finding's instruction was to justify the final ceiling by MEASUREMENT or a
# server-side bound. This is the measurement. It is deterministic, offline, and
# derives its two constants from the shipped module rather than restating them.
#
# WHAT IT DOES NOT ESTABLISH
#
# No server-side bound. Phase A makes no live auth call, so what the Noema
# Supabase project would actually return is NOT RUN here and is not assumed.
# The chunk counts below are what the adapter would need for sessions of the
# shapes named; they are not a claim that any particular shape occurs.
#
# EVERY ROW BELOW IS SYNTHETIC. The cycle-2 version of this script labelled its
# first row "what Noema v1 email OTP actually creates" and printed a headroom
# multiple "over the session this product actually creates", while this same
# header said a live session was NOT RUN. REVIEW-021 finding 5 held that
# contradiction against the record, correctly: no session issued by the Noema
# Supabase project has ever been measured, so nothing here can be called what
# the product actually creates. The rows are CONSTRUCTED session-shaped
# fixtures. The labels now say so, and the headroom line names the fixture it is
# measured against rather than a product session.
#
# No network service is contacted and no credential is read.
# Locale is pinned (learning 7).
set -uo pipefail
export LC_ALL=C LANG=C

cd "$(dirname "$0")/../../../.." || exit 1
OUT="${1:-docs/05-quality/evidence/005d-auth-session-fix3}"

mkdir -p "$OUT" 2>/dev/null
if [ ! -d "$OUT" ] || [ ! -w "$OUT" ]; then
  echo "session-sizes.sh: output directory '$OUT' is not writable — refusing to run." >&2
  exit 1
fi

{
  echo "# Session size versus the chunk ceiling — the measurement REVIEW-020 finding 2 asked for."
  echo "#"
  echo "# CHUNK_BUDGET_BYTES and MAX_CHUNKS are READ FROM THE SHIPPED MODULE below,"
  echo "# not restated here: a measurement that hard-coded them would keep agreeing"
  echo "# with itself after the constants changed."
  echo "#"
  echo "# The session shape is the full GoTrue session — JWT-sized access token,"
  echo "# refresh token, and the complete user object including timestamps and the"
  echo "# identities array. Serialized exactly as auth-js persists it:"
  echo "# _saveSession -> setItemAsync(storage, key, data) -> storage.setItem(key,"
  echo "# JSON.stringify(data))  (lib/helpers.js:132-134)."
  echo

  node -e '
    const fs = require("fs");
    const src = fs.readFileSync("src/lib/auth/secure-store-adapter.ts", "utf8");
    const read = (name) => {
      const m = src.match(new RegExp("export const " + name + " = ([0-9]+);"));
      if (!m) { console.error("could not read " + name + " from the module"); process.exit(1); }
      return Number(m[1]);
    };
    const BUDGET = read("CHUNK_BUDGET_BYTES");
    const MAX = read("MAX_CHUNKS");

    const utf8 = (cp) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);
    // The same walk splitByUtf8Budget performs, by code point so a surrogate
    // pair is never split across a boundary.
    function chunkCount(v) {
      if (!v.length) return 0;
      let n = 1, b = 0;
      for (let i = 0; i < v.length; ) {
        const cp = v.codePointAt(i);
        const units = cp > 0xffff ? 2 : 1;
        const w = utf8(cp);
        if (b + w > BUDGET) { n++; b = 0; }
        b += w; i += units;
      }
      return n;
    }
    const session = (meta) => JSON.stringify({
      access_token: "e".repeat(1000), token_type: "bearer", expires_in: 3600,
      expires_at: 4102444800, refresh_token: "v1." + "a".repeat(48),
      user: {
        id: "00000000-0000-0000-0000-000000000000", aud: "authenticated",
        role: "authenticated", email: "someone@example.test", phone: "",
        created_at: "2026-08-24T00:00:00.000Z", updated_at: "2026-08-24T00:00:00.000Z",
        email_confirmed_at: "2026-08-24T00:00:00.000Z",
        last_sign_in_at: "2026-08-24T00:00:00.000Z",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: meta,
        identities: [{
          identity_id: "00000000-0000-0000-0000-000000000001",
          id: "00000000-0000-0000-0000-000000000000",
          user_id: "00000000-0000-0000-0000-000000000000",
          identity_data: { email: "someone@example.test", email_verified: true,
            phone_verified: false, sub: "00000000-0000-0000-0000-000000000000" },
          provider: "email", last_sign_in_at: "2026-08-24T00:00:00.000Z",
          created_at: "2026-08-24T00:00:00.000Z", updated_at: "2026-08-24T00:00:00.000Z",
        }],
        is_anonymous: false,
      },
    });

    console.log("CHUNK_BUDGET_BYTES = " + BUDGET + "   (read from secure-store-adapter.ts)");
    console.log("MAX_CHUNKS         = " + MAX + "   (read from secure-store-adapter.ts)");
    console.log("ceiling            = " + (BUDGET * MAX) + " bytes (" + ((BUDGET * MAX) / 1024) + " KiB)");
    console.log("removal cost       = " + (2 * MAX + 1) + " backend deletes PER LOGICAL removeItem");
    console.log("                     (index + 2 * MAX_CHUNKS, swept unconditionally)");
    console.log("");
    console.log("chunks    chars  admitted  session shape");
    console.log("------  -------  --------  -------------");
    const cases = [
      [{}, "SYNTHETIC: session-shaped fixture, empty user_metadata"],
      [{ full_name: "A Name", avatar_url: "https://example.test/a.png", locale: "en-GB" }, "small profile (full_name, avatar_url, locale)"],
      [{ blob: "x".repeat(1024) }, "1 KiB metadata"],
      [{ blob: "x".repeat(10 * 1024) }, "10 KiB metadata"],
      [{ blob: "x".repeat(64 * 1024) }, "64 KiB metadata"],
      [{ blob: "x".repeat(100000) }, "REVIEW-020 finding 2 counterexample: 100,000-char metadata value"],
      [{ blob: "x".repeat(256 * 1024) }, "256 KiB metadata"],
      [{ blob: "x".repeat(1024 * 1024) }, "1 MiB metadata"],
    ];
    let baseline = null;
    for (const [meta, label] of cases) {
      const s = session(meta);
      const n = chunkCount(s);
      if (baseline === null) baseline = n;
      console.log(
        String(n).padStart(6) + "  " + String(s.length).padStart(7) + "  " +
        (n <= MAX ? "yes     " : "NO      ") + "  " + label
      );
    }
    console.log("");
    console.log("headroom over the empty-metadata FIXTURE above: " + (MAX / baseline) + "x");
    console.log("(over a fixture, not over a measured product session — see the header)");
    console.log("");
    console.log("# WHAT A SIGN-OUT ACTUALLY COSTS — derived by reading, not measured here.");
    console.log("#");
    console.log("# " + (2 * MAX + 1) + " is the cost of ONE logical removeItem. A sign-out is not one");
    console.log("# logical removal. Pinned auth-js 2.112.3 `_removeSession()`");
    console.log("# (GoTrueClient.js:4389-4405) issues, through THIS adapter:");
    console.log("#   1        removeItemAsync(storage, storageKey)");
    console.log("#   0..5     removeAllPKCEVerifiers -> one per indexed PKCE flow");
    console.log("#            (PKCE_MAX_CONCURRENT_FLOWS = 5, constants.js:50)");
    console.log("#   1        the PKCE flow index key");
    console.log("#   1        the legacy `-code-verifier` key");
    console.log("#   1        `${storageKey}-user`");
    console.log("# `userStorage` is not configured here, so its branch does not run.");
    console.log("# That is 4 to 9 logical removals, and this adapter sweeps the full key");
    console.log("# space on EVERY one of them regardless of what is stored there");
    console.log("# (INVARIANT 3, removeItemBody) — so a sign-out costs");
    console.log("#   " + (4 * (2 * MAX + 1)) + " to " + (9 * (2 * MAX + 1)) + " backend deletes, not " + (2 * MAX + 1) + ".");
    console.log("#");
    console.log("# The cycle-2 record said " + (2 * MAX + 1) + " was `paid once per sign-out`. REVIEW-021");
    console.log("# finding 5 caught it and it was wrong by roughly an order of magnitude.");
    console.log("# This block is DERIVED FROM LIBRARY SOURCE at a pinned version, not");
    console.log("# observed: no sign-out has been executed against a real store. It is");
    console.log("# stated as a derivation so it can be checked by reading the same lines.");
    console.log("");
    console.log("# WHAT THIS DOES NOT SHOW.");
    console.log("# There is no finite ceiling that is provably unreachable: UserMetadata is an");
    console.log("# open-ended index signature, so for ANY bound a structurally valid session");
    console.log("# above it exists — the 1 MiB row is one. MAX_CHUNKS is a RESOURCE BOUND ON");
    console.log("# REMOVAL, not a safety property, and the refusal above it is a disclosed");
    console.log("# functional limit. What makes that limit safe rather than merely bounded is");
    console.log("# that exceeding it throws BEFORE any backend write: zero writes, a byte-stable");
    console.log("# key set, and the previous value still readable. It never truncates.");
    console.log("#");
    console.log("# Whether the Noema Supabase project would ever return metadata approaching");
    console.log("# this size is NOT RUN — Phase A makes no live auth call. ADR-007 Phase B is");
    console.log("# where a real session is first measured.");
  '
} > "$OUT/session-sizes.txt" 2>&1

status=$?
if [ "$status" -ne 0 ]; then
  echo "session-sizes.sh: measurement failed — see session-sizes.txt." >&2
  exit 1
fi
echo "session-sizes.sh: wrote $OUT/session-sizes.txt"
