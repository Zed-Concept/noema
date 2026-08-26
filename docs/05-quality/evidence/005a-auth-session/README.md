# Evidence — 005a Auth and session v1 (Unit D, CTRL-005)

> **Superseded for the code, retained for the record (2026-08-24, fix cycle 1).**
> REVIEW-019 returned **FAIL** against the head this directory measures
> (`d6dc677`), and fix cycle 1 replaced the storage layer these artifacts
> describe. **Do not read anything here as a current claim about the adapter.**
> The current evidence is `../005b-auth-session-fix1/`, whose claims table is
> re-derived from a rebuilt battery and whose every claim ships a mutant that
> turns it red. This directory is kept, unregenerated, because it is the record
> of what the build cycle measured and of what REVIEW-019 reviewed — regenerating
> it against replaced code would destroy that. One factual correction has been
> made in place, marked inline: the storage-assertion count in the producer table
> (REVIEW-019 finding 9).

Branch `feat/auth-session-v1`, cut from `main` at
`07ad5a51ed597f67bac523e681525c4e87fe644d` (the tip the dispatch named).
Phase A, offline: **no Supabase call, no credential read, no signup, no user
creation, no types regeneration, no migration** was performed. This directory
backs every PASS claim the Unit D handoff makes.

Every claim below is derived from the battery, not the other way round: the
instrument was written first, and a property with no instrument is recorded as
NOT RUN rather than asserted (learning 12).

## What this unit does NOT claim

**Nothing here is evidence about the database, RLS, policies, grants, or
storage buckets.** That is Unit C's record (`../004a-schema-rls`,
`../004b-schema-rls-live`) and this unit neither re-measured nor re-states it.
This unit created no table and no function; standing rulings S1 and S3 are inert
by construction, and S2 is inert because no `service_role` grant exists or was
created.

## Producers and artifacts

`capture.sh` writes every artifact except `README.md` and `stability.txt`. It
takes an optional output directory as its **first positional argument**
(defaulting to this directory) — a parameter, deliberately not an environment
variable, because learning 10 bans ambient flags that steer a shipped producer.
`stability.sh` uses that argument to capture into temp directories.

`capture.sh` **fails closed**: a failing gate, a banned-API hit in source, a
broken positive control, or a changed `expo.scheme` makes it exit 1 after
writing the transcript that shows why. This was observed, not assumed — the
first run exited 1 on a real hit (see *Instrument corrections* below).

Locale is pinned `LC_ALL=C LANG=C` (learning 7). The Expo CLI loads a local
`.env` of its own accord and echoes the variable **names** it exported; those
lines are dropped by `mask()` as machine state, and no value is ever printed —
same treatment as `../003a-supabase-wiring`.

| Artifact | Producer | Class | Varying fields / notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | the four CI steps. Normalization, and there are exactly three: `env:` lines dropped; trailing `(N s)`/`(N ms)` suffixes removed entirely rather than masked — jest prints a suite duration only above a threshold, so a masked-but-optional field is not presence-invariant; `Time:` masked. No general mid-line duration rule exists, deliberately — see **Instrument corrections**. Jest emits one `PASS`/`FAIL` line per suite in **completion order**, which is timing-dependent, so those lines are sorted — sorted, not dropped |
| `adapter-properties.txt` | `capture.sh` | gated | `--verbose`, so all **31** storage-layer assertions are named individually — 28 adapter cases plus 3 platform cases, which is what the committed transcript's own `Tests: 31 passed` line reports. Corrected 2026-08-24 in fix cycle 1; the figure previously read 25, which REVIEW-019 finding 9 recorded as a miscount of this directory's own artifact. Same duration normalization |
| `session-properties.txt` | `capture.sh` | gated | `--verbose`, 13 session/OTP assertions named individually |
| `route-guards.txt` | `capture.sh` | gated | `--verbose`, 9 guard and chrome assertions named individually |
| `banned-apis.txt` | `capture.sh` | gated | ten banned identifiers scanned across `src/` excluding tests, each with a run-time-assembled positive control |
| `chrome.txt` | `capture.sh` | gated | app-name source, `expo.scheme` compared against the base commit, ruling-8 name scan, title mechanisms |
| `deps.txt` | `capture.sh` | gated | dependency delta against the base commit |
| `environment.txt` | `capture.sh` | run-varying | node, npm, and OS of the machine; the locale line is pinned by construction |
| `npm-audit.txt` | `capture.sh` | run-varying | tracks the upstream advisory database |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself (house precedent: `../002d-fix-loop-3/negative-control.txt`). Its exit status is its contract: 0 all-match, 1 otherwise |

## The battery

57 assertions across five suites, all passing:

| Suite | Count | What it instruments |
|---|---|---|
| `secure-store-adapter.test.ts` | 28 | round trip, fail-closed, atomic replacement, teardown, key derivation |
| `session-storage-platform.test.ts` | 3 | the web/native split, both branches |
| `auth-provider.test.tsx` | 15 | bootstrap (including non-settlement), currency, OTP call shapes |
| `route-guards.test.tsx` | 9 | redirect decisions, bootstrap gating, screen titles |
| `home-screen.test.tsx` | 2 | harness smoke, signed-in identity |

### What the storage double does and does not model

The adapter is exercised against an in-memory double, which is what makes these
properties provable with no device, no native module, and no credentials.

The double is **strict** where `expo-secure-store` 57.0.1 is strict: it enforces
the same key regex (`/^[\w.-]+$/`) and the same string-only value rule, so an
illegally-derived key fails in the test rather than on a device. It is
**faithful** where the real module is lenient: a missing key reads back `null`
and deleting an absent key is a no-op. Those four behaviours were read out of
the installed package's JS, Swift, and Kotlin sources.

It does **not** model the real keychain. Concurrency, OS-level failures,
biometric gating, and the platform's actual per-value ceiling are outside it —
see NOT RUN below.

## Claims

| # | Claim | Class | Instrument |
|---|---|---|---|
| 1 | A payload past the chunk threshold round-trips **byte-for-byte identical** (asserted as UTF-8 byte equality, not merely string equality) | PASS | `adapter-properties.txt` — "returns a payload past the chunk threshold byte-for-byte identical" |
| 2 | That payload is genuinely split across more than one chunk key, and the stored chunk keys are exactly the deterministic derivations of the base key | PASS | `adapter-properties.txt` — "actually splits that payload across multiple chunk keys" |
| 3 | Every stored chunk is within the byte budget | PASS | `adapter-properties.txt` — "keeps every stored chunk within the byte budget" |
| 4 | Multi-byte text (Arabic) and non-BMP characters round-trip uncorrupted, and no chunk ever contains a lone surrogate | PASS | `adapter-properties.txt` — two assertions; the surrogate check is a UTF-8 encode/decode identity, which a torn pair fails |
| 5 | A read whose middle chunk is gone returns **null, not a truncated prefix** | PASS | `adapter-properties.txt` — "returns null, not a truncated prefix, when a middle chunk is gone" |
| 6 | A missing final chunk, a corrupt index, a foreign value at the base key, and a length disagreement each fail closed to null | PASS | `adapter-properties.txt` — four separate assertions |
| 7 | `getItem` **resolves null rather than rejecting** when the backend throws | PASS | `adapter-properties.txt` — "resolves null instead of rejecting when the backend throws". This is load-bearing: auth-js awaits `getItem` outside its own try/catch, so a rejection would propagate out of `supabase.auth.getSession()` |
| 8 | The index is written **last**, and a write interrupted before it lands is unreadable | PASS | `adapter-properties.txt` — two assertions, one on backend call order |
| 9 | After `removeItem`, **zero keys survive** — including when the index was corrupted first, and when a chunk was deleted before sign-out | PASS | `adapter-properties.txt` — three assertions, each asserting the exact surviving key set is empty |
| 10 | Replacing a longer value with a shorter one orphans no chunk | PASS | `adapter-properties.txt` — "orphans no chunk when a longer value is replaced by a shorter one" |
| 11 | `removeItem` touches no sibling key that auth-js derives off the same base key | PASS | `adapter-properties.txt` — "touches no other key while removing its own"; scope limit stated under **Known limits** |
| 12 | Chunk keys are derived deterministically from the base key and generation, are accepted by SecureStore's key rule, and cannot collide with auth-js's own sibling keys. Because exactly two generations exist, the complete chunk-key space for a base key stays enumerable from the base key alone — which is what makes a complete teardown possible against a store with no key enumeration | PASS | `adapter-properties.txt` — three assertions; auth-js's derived keys avoid dots by design, and `.` is exactly this adapter's namespace |
| 13 | Web receives **no** adapter, so `supabase-js` falls back to its `localStorage` default; iOS and Android receive the chunked adapter | PASS | `adapter-properties.txt` — three platform assertions re-importing the module under each mocked `Platform.OS` |
| 13a | A replacement is **atomic to a reader**: at every point during a `setItem` that overwrites an existing value, a concurrent `getItem` returns either the old payload or the new one, and **never null** | PASS | `adapter-properties.txt` — "exposes the old value or the new one at every point of a replacement, never null". The write is interleaved at each backend call; the assertion is over every observation, and the observation count is itself asserted so the test cannot pass vacuously |
| 13b | Successive writes alternate generation, so a write never mutates the generation a reader is reading, and only one generation survives a replacement | PASS | `adapter-properties.txt` — "alternates generations so a write never touches the one being read", "leaves only one generation behind after a replacement" |
| 13c | `removeItem` **resolves rather than rejecting** when the backend fails, and `setItem` still commits when only its cleanup reads and deletes fail | PASS | `adapter-properties.txt` — two assertions against a backend whose reads and deletes reject the way a locked keychain does. auth-js awaits `removeItem` *before* it emits `SIGNED_OUT`, so a rejection there would strand sign-out entirely |
| 13d | `removeItem` purges chunks stranded in **either** generation | PASS | `adapter-properties.txt` — "purges chunks left in either generation", asserting the surviving key set is empty |
| 14 | `bootstrapping` is a state distinct from `signedOut`, observable before the stored session resolves | PASS | `session-properties.txt` — "starts in bootstrapping, which is not signed out" |
| 15 | Cold start resolves to `signedOut` with no stored session, to `signedIn` carrying the session when one exists, and **resolves rather than hanging** when the read fails | PASS | `session-properties.txt` — three assertions |
| 15a | Bootstrapping ends even when the cold-start read **never settles** — not rejects, never settles, which no `.catch()` can see | PASS | `session-properties.txt` — "stops waiting on a cold-start read that never settles", driving a promise that never resolves past the timeout |
| 16 | The provider subscribes to `onAuthStateChange` **before** reading, so an event in flight is not missed | PASS | `session-properties.txt` — asserted on jest invocation call order |
| 17 | Session state follows `onAuthStateChange` in, through a token refresh, and out | PASS | `session-properties.txt` — "follows onAuthStateChange into and out of a session" |
| 18 | A late cold-start read cannot overwrite a newer auth event | PASS | `session-properties.txt` — "does not let a late cold-start read overwrite a newer event" |
| 19 | The subscription is released on unmount | PASS | `session-properties.txt` — "unsubscribes on unmount" |
| 20 | Sign-in requests a code with `shouldCreateUser: true` **and never `emailRedirectTo`** (its presence is what makes a magic link) | PASS | `session-properties.txt` — asserts the exact call object, then asserts the absence of the property |
| 21 | Verification calls `verifyOtp` with `type: 'email'`; `signOut` ends the session; errors are returned, never thrown | PASS | `session-properties.txt` — three assertions |
| 21a | The actions return an error even when auth-js **throws** rather than returning one — which it does for anything that is not an `AuthError`, such as a keychain failure | PASS | `session-properties.txt` — "returns an error rather than throwing when auth-js throws". Every screen disables its controls until these resolve, so an escaping rejection would strand the UI permanently |
| 22 | During bootstrap the root mounts **no navigator at all**, so protected content cannot flash | PASS | `route-guards.txt` — "mounts no navigator at the root, so protected content cannot flash", asserting neither navigator nor redirect is present |
| 23 | A signed-out visitor to the protected group is redirected to `/sign-in`; a signed-in user is redirected out of the sign-in group to `/`; each group renders for its own audience | PASS | `route-guards.txt` — four assertions |
| 24 | Screen titles are set explicitly and resolve from the single config source — the header does not read the route name `index` | PASS | `route-guards.txt` — two assertions, comparing against `APP_NAME` itself rather than a copied literal |
| 25 | Ten banned authentication surfaces appear **nowhere in application code** (`.ts`, `.tsx`, `.js`, `.jsx` under `src/`, tests excluded): `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `signInWithOAuth`, `signInWithIdToken`, `signInWithSSO`, `emailRedirectTo`, `magiclink`, `secureTextEntry`, `linkIdentity` | PASS | `banned-apis.txt` — 0 code hits each, every positive control MATCHED through the same pipeline, and the file count actually scanned is printed and asserted non-zero so the scan cannot pass vacuously. Evasion limits stated under **Known limits** |
| 26 | `expo.scheme` is byte-identical to the dispatch base commit | PASS | `chrome.txt` — base and head compared directly, `result: UNCHANGED` |
| 27 | The user-visible app name resolves from one config source (`app.json` → `expo.name` via `expo-constants`); every consumer reads `APP_NAME`; no literal `<title>` bypasses it | PASS | `chrome.txt` — consumer list plus a zero-hit literal-title scan |
| 28 | Ruling 8: no occurrence of the gated name in `src/` application code, **and `expo.name` — the field ruling 8 actually governs — does not contain it** | PASS | `chrome.txt` — 0 code hits, plus a direct assertion on `app.json`'s `expo.name` that fails the run if it matches. In `app.json` the string remains only in `expo.slug` (internal, exempt) and the frozen `expo.scheme` |
| 29 | The four CI-equivalent gates pass at this head: typecheck, lint, test (57), format:check — all exit 0 | PASS | `gates.txt` |
| 30 | Exactly one dependency was added — `expo-secure-store` `~57.0.1`, installed via `npx expo install` so the SDK 57 pin holds | PASS | `deps.txt` — the dependency-line diff against the base contains a single `+` line |
| 31 | The seven gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, **and both runs exited 0** | PASS | `stability.txt` — 7 gated, 0 differing-or-failing, both capture statuses recorded, exit 0 |

## NOT RUN — and why

| Property | Why not run |
|---|---|
| Any live Supabase behaviour: a real OTP email, a real sign-in, a real session written to a real keychain | Phase A is offline by dispatch. Phase B carries all of it, owner-executed |
| The adapter against a **real** iOS/Android keychain | Needs a device or simulator build; none was made. Every adapter claim above is against the in-memory double described earlier |
| The platform's actual per-value size ceiling | The installed `expo-secure-store` 57.0.1 enforces **no** limit — the iOS-only oversize warning was deleted in 55.0.0, and no JS, Swift, or Kotlin path inspects value length. The chunk budget is therefore a chosen safety margin, not a measured or library-enforced threshold. What the OS would do with an oversized item was not measured |
| True OS-level concurrent access to one key from two processes or threads | Claim 13a instruments interleaving the only way a single-threaded runtime can: a concurrent read is driven at **every** backend call of a write, which is exactly where a JS runtime can interleave. What is NOT covered is a second process or a native-thread race below the JS layer. **Correction on the record:** an earlier version of this row said "auth-js holds a lock around its own session writes." That is wrong for this client. auth-js installs a lock only when passed a `lock` option, and `src/lib/supabase.ts` passes none — every `_acquireLock` branch is skipped, and `_useSession` states outright that no serialization happens at that layer. The absence of that lock is precisely why the adapter must make replacement atomic itself, which is what claim 13a now measures |
| That the web build actually uses `localStorage` at runtime | Claim 13 measures which value the module exports per platform, which is the branch this unit owns. The `localStorage` fallback itself is `supabase-js` behaviour, read from `GoTrueClient.ts` (`if (settings.storage) {...} else {...}`), not executed in a browser |
| The rendered browser tab title in a real static export | The mechanism is instrumented only as far as the screens rendering `<Head><title>`. No web export was built or served. See the note below — this correction matters |
| Route protection under real expo-router navigation | Claim 22–23 measure each layout's guard decision with the router replaced by a double. No navigator was actually driven |
| CI on this branch | No PR was opened; the dispatch forbids it. `.github/workflows/ci.yml` is untouched |

### The document-title correction, stated plainly

An earlier version of the code comment in `src/app/(app)/_layout.tsx` attributed
the browser tab title to expo-router's `useDocumentTitle` formatter
(`options?.title ?? route?.name`). **That is wrong for this installed version**
and was corrected before commit. `ExpoRoot` hard-codes
`documentTitle = { enabled: false }`, so that formatter never runs and
`options.title` never reaches `document.title`. The `options.title ?? route.name`
fallback that *does* apply is `getHeaderTitle`, which is the in-app **header** —
that is the real source of the `index` leak in the header.

The browser tab is driven solely by `expo-router/head` (react-helmet-async).
The repository's own previously-built static export shows
`<title data-rh="true"></title>` — empty, which is the "web document title is
unset" half of the backlog item. Both halves are now addressed by two distinct
mechanisms: `options.title` for the header, `<Head><title>` for the tab.

## Known limits of the instruments

- **The banned-API scan blanks comments before scanning.** A comment that names
  a banned API is a mention, not a use — the JSDoc on `sendOtp` states that it
  never passes `emailRedirectTo`, which a bare identifier scan reads as a hit.
  Two consequences, stated rather than hidden: a `//` sequence inside a string
  literal truncates the rest of that line, and a line whose first non-space
  character is `*` is treated as a JSDoc continuation. Either could be abused
  deliberately to hide a call. The positive controls run through the same
  blanking, so the scan is proven to still match code that survives it.
- **The completeness oracle is chunk presence plus total length.** That is what
  the fail-closed claims rest on, and it is exactly what detects truncation: a
  missing chunk, or a short one. It does **not** detect a tamper that preserves
  the total length, and it is not an integrity check — the adapter stores an
  opaque string and authenticates nothing. Defending against an attacker who can
  already write arbitrary values into the keychain is not this component's job,
  and no claim here implies otherwise.
- **The scan covers `src/` and excludes `src/__tests__/`.** Test files
  deliberately contain banned tokens (asserting their absence), so including
  them would make the scan permanently red. A banned call introduced *in a test
  file* would not be caught.
- **Claim 11 is bounded to the sibling keys auth-js actually derives.** The
  chunk namespace is `<key>.<n>`; a *different* stored key literally named
  `<key>.0` would collide. auth-js's derived keys avoid dots by design, so this
  cannot arise from the library, but the adapter does not defend against a
  caller that chooses such a key itself.
- **`MAX_CHUNKS` (256) bounds the orphan sweep.** The sweep stops at the first
  gap after the run the index claims. Chunks are always written contiguously
  from 0, so a gap cannot arise from this adapter's own writes; a gap introduced
  by external tampering could strand a chunk beyond it.
- **The stability gate proves determinism of the committed artifacts on this
  machine**, across two runs at one head, and now also that both captures exited
  0. It is not a claim about other machines; `environment.txt` records the
  environment it held for.
- **The two chrome title assertions compare the rendered title against
  `APP_NAME` itself.** That catches the defect actually being closed — a header
  reading the route name `index` — and it catches a wrong or empty title. It
  does **not** distinguish "reads the single config source" from "hard-codes the
  string `APP_NAME` currently evaluates to", because both sides of the
  comparison would then be the same literal. The single-source property is
  carried by `chrome.txt`'s consumer list and the zero-hit literal-title scan,
  not by these two assertions; claim 24 should be read as bounded to the title
  values, not to the mechanism.
- **The banned-API scan reads source, not the bundle.** It covers `.ts`,
  `.tsx`, `.js`, and `.jsx` under `src/`, which is what Metro bundles from
  there, and fails the run if it matched no files at all. It does not inspect
  `node_modules`, generated output, or anything outside `src/`.

## Instrument corrections made during this unit

Recorded because a green artifact set that was never red proves less than one
that was.

1. The banned-API scan and two chrome scans first reported hits that were
   **comment prose**, not code — `emailRedirectTo` inside a JSDoc line saying it
   is never passed, the gated name inside a ruling-8 explanation, and a
   `<title>` token inside an explanatory JSX comment. `capture.sh` exited 1, as
   designed. The remedy was to make the scans measure code rather than to
   special-case three patterns.
2. One of those three — a `<title>` inside a JSX block comment — survived the
   comment blanking, because `{/* ... */}` continuation lines start with neither
   `//` nor `*`. That was remedied by **rewording the comment**, not by growing
   the stripper into a comment parser: extending an instrument to chase one more
   case is the failure mode learning 12 names.
3. The first stability run **failed**, 4 of 12 comparisons differing, and caught
   two real defects in the producer: the sorted suite lines bypassed `mask()`
   entirely, and jest prints a suite duration only above a threshold, so masking
   a value that may be absent is not presence-invariant. Both fixed; the gate
   then passed 14/14 comparisons across 7 artifacts.
4. `npm run lint` failed on the guard tests (`react/display-name`, plus
   `require()` warnings). Fixed with named function declarations and a
   line-scoped disable carrying its reason — a jest.mock factory is hoisted
   above the import block, so `require` is the only way to reach the registry.

### Fix cycle 1 — an adversarial review round, before any external review

Five independent reviewers were run against this unit under distinct lenses
(fail-closed, chunking correctness, scope compliance, evidence discipline, and
the auth-js contract). Two returned SOUND; three found defects. What they found
is recorded here because the corrections changed both the code and these
instruments, and because a claims table that never moved under attack is
weaker evidence than one that did.

**Code defects found and fixed** (each now carries an instrument, listed in the
claims table above):

5. **`setItem` cleared the live value before writing its replacement**, so a
   concurrent `getItem` returned `null` for most of a write. This is the defect
   with the worst consequence found in the whole unit: a `supabase.from(...)`
   call landing in that window resolves its token through `getSession()`, gets
   `null`, and falls back to the publishable key — the request goes out
   **anonymously** and RLS denies it, while the user is signed in and the
   session on disk is valid. The same `null` flips the provider to `signedOut`
   and bounces the user to sign-in. Fixed by the two-generation design: a write
   lays down the generation nobody is reading, then swaps the index in a single
   call. Claim 13a is the instrument.
6. **`removeItem` could reject**, and `setItem` inherited it, because only the
   index read was guarded — the orphan-sweep read and every delete were not. A
   locked iOS keychain or an undecryptable Android entry made sign-out reject
   *before* auth-js emits `SIGNED_OUT`, leaving the button stuck on "Signing
   out…" forever with the session still on disk. Fixed: teardown reads and
   deletes are quiet, writes still propagate. Claim 13c is the instrument.
7. **The provider could stay in `bootstrapping` forever.** `getSession()`
   awaits a network refresh with no timeout in React Native, so a captive
   portal that completes the handshake and drops packets leaves a promise that
   never settles — which `.catch()` cannot see. Since the root layout mounts no
   navigator in that state by design, the app had no screen to fall back to.
   Fixed with a bootstrap deadline. Claim 15a is the instrument.
8. **Failure was silently discarded on sign-out.** auth-js returns early — before
   clearing storage — when it cannot reach the network to revoke, and both the
   provider and the screen dropped that error, so the user was told nothing and
   believed they had signed out. The provider now converts thrown errors into
   returned ones (claim 21a) and the screen shows the failure.

**Instrument defects found and fixed:**

9. `capture.sh` **exited 0 having measured nothing** if the output directory was
   not writable: with no `set -e`, a failed redirection skips the whole
   `{ ... } > file` group, so no check ever ran and nothing set the failure
   flag. It now refuses to start unless the directory exists and is writable.
10. `stability.sh` **discarded `capture.sh`'s exit status**, so a consistently
    red capture would have compared clean and reported a green gate. Both
    statuses are now recorded and counted.
11. The banned-API scan covered only `.ts`/`.tsx`, so a banned call in a plain
    `.js` file — which Metro bundles just the same — was invisible. Now covers
    `.js`/`.jsx` too, and fails if it matched no files at all.
12. The ruling-8 scan covered only `src/`, which cannot see `app.json` — so
    renaming `expo.name` to the gated string would have shipped under a fully
    green evidence set. `expo.name` is now asserted directly.
13. The positive controls were a **fixed point** of the comment-blanking they
    were supposed to exercise: none contained a comment marker, so "control
    MATCHED" proved only that `grep` works. One control now carries a trailing
    comment.
14. `mask()` carried a fourth rule using `\b`, which BSD sed treats as a literal
    `b` and GNU sed as a word boundary — inert on this machine, and on CI it
    would have masked real text (a test name containing "60s") rather than a
    duration. **Removed rather than repaired**: the two remaining rules already
    cover every duration these transcripts contain.
15. `capture.sh`'s header claimed "no network service is contacted" while
    running `npm audit`, which posts the dependency manifest to the registry.
    The header now says so, and that step is confined to a non-gated artifact.
