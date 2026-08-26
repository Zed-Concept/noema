# Evidence — Unit D, auth and session v1, fix cycle 3 (005d)

**Controller:** CTRL-005 · **Branch:** `feat/auth-session-v1` · **Base:** `main`
at `6c925d1` (the PR #14 merge commit), merged into this branch at `b5c9cee`.

**Model+Effort:** Opus 5 [1m] / Max / fresh session. The dispatch named **Fable
5**; Fable 5 quota was unavailable, and the dispatch authorises the owner-set
substitution to Opus 5 [1m] provided it is RECORDED rather than passed over.
This is that record, and it is repeated in the LOCK and the HANDOFF. No other
dispatch term was substituted.

**This is the final fix cycle. There is no cycle 4.** The stop rule has fired:
the recurring class across REVIEW-019, REVIEW-020 and REVIEW-021 is *claims
exceeding their instruments*, and the remedy this cycle is **subtraction**, not
another instrument.

So the honest summary of this directory is: **it is smaller than 005c, and the
sentences that remain are ones the artifacts underneath them actually support.**
Two findings closed by writing code. Five closed by deleting or narrowing what
was written about code. Where a claim could not be instrumented without building
a sixth instrument to rescue it, the claim was deleted and this record says so.

---

## What this cycle changed

### A1. The ungated entrances — closed by implementation (RoR finding 1; advisory finding 1)

Two reviewers in different families converged on this independently, which is
the strongest signal either review produced.

Cycle 2 removed self-scheduling, and that genuinely eliminated probe 1. It did
not eliminate probe 2 — it **relocated** it. The app's own `onAuthStateChange`
registration re-entered auth-js's margin refresh through
`_emitInitialSession` (`GoTrueClient.js:3640`) → `_useSession` (`:2477`) →
`__loadSession` (`:2496`), which calls `_callRefreshToken` whenever the stored
access token is inside the 90s `EXPIRY_MARGIN_MS` (`:2521-2547`). **Nothing on
that path consults `autoRefreshToken`** — the flag gates `_recoverAndRefresh`
(`:4104`) and the ticker (`:4693`) only. The cold-start `getSession()` was a
second ungated entrance into the same function.

The advisory corrected the reviewer of record on the mechanism, and the
correction is load-bearing enough to restate so it is not re-introduced later:
**`supabase-js` registers no auth listener of its own.** This app's registration
at mount was the trigger. That is precisely why the defect is fixable in app
code instead of requiring a library change.

**The fix.** `auth-provider.tsx` now defers **both** the listener registration
and the bootstrap `getSession()` behind the same `AppState === 'active'` gate
that already stood in front of the refresh evaluation. One effect, one
subscription, one gate, two entrances behind it.

The consequence is what the dispatch asked for: the claims at `supabase.ts:46`
and `foreground-refresh.ts:17` are now **true as written**. Before this cycle
they were false as written, not merely unproven — a distinction worth keeping,
because the two failure modes need different remedies and only one of them is
fixed by adding evidence.

ADR-007 was **not** narrowed to avoid this. Learning 17 governs unverifiable
properties; this one is verifiable and enforceable in app code with no device,
so narrowing would have been the wrong instrument.

### A2. Durable re-authentication — closed by implementation (RoR finding 2)

The observer fires. The advisory confirmed **why** detection is sound, and that
part is preserved rather than re-litigated: detection sits **at the write, not
at the initiator**, so every failing `setItem` sets the flag before rethrowing,
whatever initiated it, and the flag survives auth-js's own error handling.

The gap was therefore never detection. It was **what happens after** detection.
A single best-effort removal that the store refuses leaves the superseded
session readable on the next cold start, and `signOut()` rejecting says nothing
about whether the delete happened — it can reject upstream of the store
entirely. REVIEW-021 reproduced exactly that.

Three changes make the resulting re-auth durable:

1. **A separate purge observer** (`lastPurgeFailure`) records whether the STORE
   removed the session, which is a different question from whether `signOut()`
   rejected. Kept deliberately separate from the write flag — learning 12 binds
   a claim to its instrument, and merging the two would widen both.
2. **The write flag is sticky until taken.** A later successful write no longer
   erases an outstanding refusal before the foreground consumer has read it.
   A write succeeding does not un-lose the token an earlier one dropped.
3. **The demand outlives its first attempt.** `purgeOutstanding` survives a
   refused removal and every later foreground evaluation retries it until the
   store accepts. The residual stops **existing**, rather than being disclosed
   and left on disk.

### B1–B5. Five findings closed by subtraction

The reviewer of record framed findings 3 through 7 as "delete or narrow" itself
— arriving independently at the stop rule's remedy. They are deleted or
narrowed. **No new instrument was built to rescue any of them.** See
**Subtractions** below, which is the substantive section of this record.

---

## The mutation standard

Unchanged from 005c and still the thing that makes a green claim mean anything.
Every claim carrying a mutant ID ships a named, exact edit to shipped source
that breaks the behaviour the claim names, plus a recorded observation that the
claim's own instrument turns RED under it. Each mutant is checked three ways:
**baseline GREEN** (≥1 test actually executed), **build TYPECHECKS** (learning
16 — a mutant that does not compile is not a counterfactual), **mutant RED**
(≥1 failed assertion, not merely a nonzero exit).

This cycle: **31 mutants, 31 SENSITIVE, 0 build-invalid**, tree restored
byte-identical. Four are new (M30–M33) and cover the A-class fixes.

`31/31` is an **execution fact**, not a coverage measure. Rows in the claims
table without a mutant ID are exactly the rows that have none.

---

## Claims

Claims carried unchanged from `../005b-auth-session-fix1/README.md` and
`../005c-auth-session-fix2/README.md` are not restated; those records stand
except where **Subtractions** and **Record corrections** say otherwise.

| # | Claim | Result | Instrument | Mutant |
|---|---|---|---|---|
| 51 | **No app-initiated refresh can occur before the first foreground.** Both entrances — the `onAuthStateChange` registration and the cold-start `getSession()` — are deferred until `AppState === 'active'` | PASS | `auth-provider.test.tsx`: mounted while backgrounded, asserts the listener is never registered AND the read never issued; a separate test asserts both open on the first transition to active and only then | M30 |
| 52 | The listener is registered **exactly once** across repeated foregrounds | PASS | `auth-provider.test.tsx` | M30 (shared — see the note below) |
| 53 | An outstanding refused write is **sticky until taken**: a later successful write does not erase it | PASS | `foreground-refresh.test.ts`, over the real adapter and a real in-memory keychain | M31 |
| 54 | A refused **removal** is recorded as its own fact, and rethrown rather than absorbed | PASS | `foreground-refresh.test.ts` | M32 |
| 55 | Re-authentication is **durable**: a refused removal keeps the demand outstanding and every later foreground retries it until the store accepts | PASS | `auth-provider.test.tsx`, five tests covering retry, stop-on-accept, no-retry-when-accepted-first-time, reading the store rather than the rejection, and per-attempt flag clearing | M33 |
| 11 | **NARROWED.** The ceiling admits every session shape **measured here**, including REVIEW-020 finding 2's counterexample, and fails closed above itself with zero writes | PASS | `secure-store-adapter.test.ts`, `session-sizes.txt` | M29 |
| 12 | **NARROWED.** The adapter contains no **directly-spelled** parse or inspection of token material — by AST source scan | PASS | `token-opacity.test.ts`, incl. two executable records of what the scan does NOT detect | M28 |
| 47 | **This fix cycle adds no dependency.** Range-scoped deliberately: `deps.txt` measures the WHOLE UNIT against main, where `expo-secure-store` correctly appears as added by Phase A | PASS | `deps.txt` + its scope header | — |
| 48 | The four CI-equivalent gates pass at this head: typecheck, lint, test, format:check — all exit 0 | PASS | `gates.txt`; 9 suites, **130 tests** | — |
| 48a | GitHub CI passes on the exact pushed head | **NOT RUN at the time of writing** | see **NOT RUN** 1 — the head cannot be known before the push that creates it | — |
| 49 | Every mutant is build-valid and every claim carrying a mutant ID has one that turns its instrument red. The battery does **not** cover every row | PASS | `mutants.txt` — 31 mutants, 31 SENSITIVE, 0 build-invalid | this row IS the mutation record |
| 50 | **REPAIRED.** The gated artifacts regenerate byte-for-byte across two fresh `capture.sh` runs, both runs exited 0, and both match the committed copies | PASS | `stability.txt` — 8/8 identical, both captures exit 0 | — |

**On claims 51 and 52 sharing M30.** The deferral is one decision on one line,
so one edit is the honest counterfactual for it; two mutants with identical
edits would inflate the battery without adding information. Both claims are
bounded by that single mutant and the table says so, following the convention
claim 6 already uses behind claim 5's mutant. Stating this because an
unexplained shared ID is the kind of thing that reads as a coverage gap.

---

## Subtractions

**This is the section that matters this cycle.** Each item below was closed by
removing a sentence, not by adding an instrument.

### B1. The universal token-opacity claim is deleted (RoR finding 3)

The AST scan detects `JSON.parse` **spelled directly**. It does not detect an
aliased parser — `const p = JSON.parse; p(value)` — and REVIEW-021 finding 3
demonstrated that survivor. This was the third consecutive review to land on
this instrument (REVIEW-019 finding 7, REVIEW-020 finding 3, now this).

The claim is narrowed to **exactly what the scan detects**: *no
directly-spelled parse or inspection of token material.* The universal
statement — "never parses or inspects the payload" — is **deleted**.

Two tests were added, and it is worth being precise about what they are, because
they are the one place this cycle adds tests while claiming to subtract: they
are **executable records of the limit**, asserting the scan does **NOT** detect
an aliased parse and does **NOT** detect an aliased content inspection. They
instrument the boundary, not the deleted claim. Building an alias-resolving
scanner is exactly the "instrument to save a claim" the dispatch names as the
signal to delete instead — so it was not built, and the residual risk is
disclosed rather than closed. Nothing in the shipped adapter aliases a parser
today; the point is that the scan would not tell you if it did.

### B2. The stalled-reader schedule claim is deleted (RoR finding 4)

The ninth schedule claimed to construct a stalled-reader/removal interleaving
under the remove-only queue bypass. It does not. REVIEW-021 finding 4 ran the
bypass and found the FIRST failure is `expect(stalled).toBe(true)` — an
unqueued removal overtakes the reader before it reaches its first chunk, so the
schedule is never built and jest stops before the value and interleaving
assertions are reached.

**Deleted, not repaired.** The test's comment now states what it actually
detects: the sequencing fact one step earlier. That is a real and sufficient
signal for M27, and it is a different statement from the one the test used to
make. A corrected schedule was not added — per the stop rule, the claim was cut
to fit the instrument.

### B3. Two figures in the ceiling record are corrected (RoR finding 5)

Both halves of this finding were correct.

**Synthetic described as actual.** The row labelled *"empty user_metadata — what
Noema v1 actually creates"* was a constructed fixture, while the same record
classified a real OTP/live session as NOT RUN. No session issued by the Noema
Supabase project has ever been measured. Every row is now labelled **SYNTHETIC**,
and the headroom line names the **fixture** it is measured against rather than a
product session. Corrected in `session-sizes.sh`, in the module doc comment, and
in the test title that carried the same phrase.

**513 deletes is per logical removal, not per sign-out.** Corrected, and the true
figure derived from pinned auth-js 2.112.3 rather than asserted.
`_removeSession()` (`GoTrueClient.js:4389-4405`) issues, through this adapter:
the session key (1); `removeAllPKCEVerifiers` — one per indexed PKCE flow, up to
`PKCE_MAX_CONCURRENT_FLOWS = 5` (`constants.js:50`), plus the flow index and the
legacy `-code-verifier` key; and `${storageKey}-user` (1). `userStorage` is not
configured, so its branch does not run. That is **4 to 9 logical removals**, and
INVARIANT 3 makes this adapter sweep the full key space on **every** one of them
regardless of what is stored there — so a sign-out costs **2052 to 4617 backend
deletes, not 513**. The old figure was wrong by roughly an order of magnitude.

This derivation is **DERIVED BY READING at a pinned version, not observed** — no
sign-out has been executed against a real store — and `session-sizes.txt` states
that inline so the bound cannot be read as a measurement.

### B4. The stability producer is corrected (RoR finding 6)

`capture.sh` held cycle 1's `BASE` while main had moved twice underneath it. The
range therefore included commits that were main's, and a rerun did not reproduce
the committed artifacts.

The base is repinned to `6c925d1`, **and the producer now verifies its own pin**:
if `BASE` is not an ancestor of `HEAD` it exits 1 before writing anything, so a
stale-base run produces no artifacts at all rather than a complete-looking set
that is quietly wrong.

Deriving the base from `git merge-base main HEAD` was considered and rejected: it
reads a LOCAL ref that can be arbitrarily stale. This cycle's own preflight is
the counterexample — local `main` was two commits behind and ADR-008 appeared
missing from main when it was present on `origin/main`. A pinned literal that is
checked beats a derived value that is trusted.

Claim 50 is repaired rather than deleted, because after the fix the producer does
reproduce committed evidence: `stability.txt` shows 8/8 identical across two
fresh runs, both exiting 0, all matching the committed copies.

### B5. Record inconsistencies corrected (RoR finding 7)

All five sub-items, each verified rather than asserted:

- **Manifest count.** `capture.sh`'s header said four exceptions; the directory
  had five. It now names all five — `README.md`, `mutants.txt`, `stability.txt`,
  `session-sizes.txt`, `ci.txt` — and says why the miscount recurred.
- **`deps.txt` vs claim 47.** Two true statements about two different ranges,
  printed as one. The artifact header now states its scope is the WHOLE UNIT
  against main; the per-cycle statement lives beside claim 47 where its range is
  legible.
- **53 vs 54 adapter tests.** The committed artifact and a fresh run both show
  **54**. The HANDOFF said 53. 54 is correct and is what this cycle records.
- **Trailing whitespace at `mutants.sh:637`.** Removed. `git diff --check` is
  clean across the working tree.
- **LOCK vs PROJECT-STATE.** Reconciled — see **Record corrections** 1.

### Carried subtraction: the checksum claim

005c's deletion of the same-length-distinguishing claim stands, with its
collision pair kept as an executable record. Ruling 15's bar on
tamper-resistance claims stands and nothing here re-crosses it.

### ADR-008: surfacing is native-only

ADR-008 makes the surfacing guarantee **NATIVE-ONLY**. Every unqualified
cross-platform surfacing claim in scope was found and qualified: the
`foreground-refresh.test.ts` describe block, the M24 mutant label, and the
`session-properties.txt` line that echoes the block name. On web, storage is
`localStorage` through the supabase-js default, which never reaches the adapter,
so no observer exists and **nothing is claimed**.

A web write observer is **out of scope** here and is a named backlog unit in
ADR-008 — deliberately deferred, not overlooked.

---

## Producers and artifacts

`capture.sh` writes every artifact in this directory **except** `README.md`,
`mutants.txt`, `stability.txt`, `session-sizes.txt`, and `ci.txt`. **Five
exceptions, listed exhaustively**, and the producer's own header now lists the
same five.

`capture.sh` takes an optional output directory as its **first positional
argument** — a parameter, not an environment variable (learning 10). It **fails
closed**: a failing gate, a banned-API hit, a broken positive control, a RED-lane
hit, a changed `expo.scheme`, or a stale `BASE` pin makes it exit nonzero.

**This producer is not offline by construction.** `npm audit` reaches the npm
registry. That step is confined to the non-gated `npm-audit.txt`. No Supabase
endpoint is contacted and no credential is read.

| Artifact | Producer | Class | Notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | the four CI steps; 9 suites, 130 tests |
| `adapter-properties.txt` | `capture.sh` | gated | `--verbose`, one jest invocation per suite |
| `session-properties.txt` | `capture.sh` | gated | `--verbose`, provider + foreground-refresh; the latter runs the real adapter over a real in-memory keychain |
| `route-guards.txt` | `capture.sh` | gated | guard and chrome assertions |
| `banned-apis.txt` | `capture.sh` | gated | banned identifiers across `src/` excluding tests, each with a run-time positive control |
| `red-lane.txt` | `capture.sh` | gated | object identity for `supabase/`, `.github/`, generated types; path filter; database-operation scans with positive controls |
| `chrome.txt` | `capture.sh` | gated | app-name source, `expo.scheme` against base, ruling-8 scan |
| `deps.txt` | `capture.sh` | gated | WHOLE-UNIT dependency delta against main — scope stated in its header |
| `environment.txt` | `capture.sh` | run-varying | machine node/npm/OS |
| `npm-audit.txt` | `capture.sh` | run-varying | **reaches the network.** Upstream advisories only — out of scope per dispatch |
| `session-sizes.txt` | `session-sizes.sh` | not gated | deterministic by construction: reads two constants from the shipped module and does arithmetic. Not compared by `stability.sh`, which would compare a pure function against itself |
| `mutants.txt` | `mutants.sh` | not gated | its exit status is its contract; verifies its own restoration byte for byte |
| `ci.txt` | one-off `gh run view` | not gated | **ABSENT from this directory as committed** — see **NOT RUN** 1. It is named in `capture.sh`'s five exceptions because `capture.sh` does not write it; that is a statement about the producer, not a claim that the file is here |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself |

---

## Record corrections

REVIEW-019, 020, 021 and 021-ADVISORY are immutable and are **not edited** —
this cycle made no change to any of them. Corrections live here.

**1. LOCK / PROJECT-STATE reconciliation.** REVIEW-021 finding 7 caught the
authoritative LOCK reading `REVIEW` while `PROJECT-STATE.md` read `BUILD`. The
LOCK was reconciled to `BUILD` at `c33de65` for this cycle and
`PROJECT-STATE.md` is reconciled to match in this cycle's commit. Learning 18's
repo-state reconciliation had drifted twice; both records now agree.

**2. The cycle-2 HANDOFF's adapter test count was 53; it is 54.** Verified
against both the committed artifact and a fresh run.

**3. Provenance of `c33de65`.** That commit was made in the owner's working tree
rather than through the GitHub API, because the controller's Composio key was
revoked mid-session. Preflight verified it touches `BRANCH-NOTES.md` **only**.

---

## NOT RUN — and why

1. **GitHub CI on this cycle's pushed head (claim 48a).** The head cannot be
   known before the push that creates it, so **there is no `ci.txt` in this
   directory at all.** Cycle 2's `ci.txt` was deliberately NOT copied forward: it
   is bound to SHA `97f1b7d5` and to nothing else, and carrying it here would put
   a green CI artifact next to a different head — the precise overextension
   REVIEW-020 finding 7 caught. An absent artifact is honest; a stale one is not.
   It must be added in a follow-up commit after the push, bound to the pushed
   SHA. Named here rather than left as a gap for the reviewer to find.
2. **Any live Supabase auth call.** Phase A makes none. No OTP send, no verify,
   no real session issued or measured. Every session shape in
   `session-sizes.txt` is synthetic.
3. **Locked-device behaviour.** ADR-007 classifies this NOT RUN / NOT CLAIMED in
   Phase A with a named physical-device test in Phase B. Nothing here observes a
   keychain under lock.
4. **Web persistence-failure surfacing.** ADR-008: native-only. Not claimed, not
   instrumented, named as backlog.
5. **A real sign-out's delete count.** The 2052–4617 figure is derived from
   pinned library source, not observed.

---

## Known limits of the instruments

1. **The token-opacity scan is alias-blind.** Stated as a claim boundary (B1) and
   kept as two executable records. An aliased parser would pass.
2. **The ninth schedule detects sequencing, not the interleaving it once
   claimed.** (B2.)
3. **`session-sizes.txt` bounds nothing server-side.** There is no finite ceiling
   provably unreachable: `UserMetadata` is an open-ended index signature, so for
   any bound a structurally valid session above it exists. `MAX_CHUNKS` is a
   RESOURCE BOUND ON REMOVAL, not a safety property; what makes the disclosed
   functional limit safe is that exceeding it throws BEFORE any backend write —
   zero writes, byte-stable key set, previous value still readable, never
   truncated.
4. **The mutation battery is not coverage.** 31/31 is an execution fact.
5. **Re-authentication cannot force a refusing store.** Claim 55 makes the demand
   durable — it retries until accepted — but a store that refuses forever keeps
   a superseded session on disk. This layer can refuse to USE it, and does; it
   cannot delete what the OS will not delete. Disclosed, not closed.

---

## Disclosures — ruling 6

1. **The early `gates.txt` anomaly remains DISCLOSED and UNEXPLAINED.** It has
   now survived three cycles. The reviewer of record ruled it non-dispositive
   twice, and this cycle does **not** write it off: it is carried forward,
   unexplained, as an open item. Per dispatch it stays disclosed. It is recorded
   here so that "non-dispositive twice" is never silently promoted to "resolved".
2. **The Model+Effort substitution.** Fable 5 → Opus 5 [1m], owner-set,
   authorised by dispatch, recorded here and in the LOCK and HANDOFF.
3. **`c33de65` provenance** — owner's working tree, not the API. See **Record
   corrections** 3.
4. **`npm audit` reaches the network.** Its advisories are upstream and out of
   scope per dispatch.
5. **There is no `ci.txt` in this directory.** Cycle 2's was not copied
   forward, on purpose. See **NOT RUN** 1.
6. **Two tests were ADDED while this cycle claims to subtract** — the B1
   survivor records. They instrument a limit rather than rescue a claim, and the
   distinction is argued in B1 rather than assumed.
7. **The duplicated `Sign in · ${APP_NAME}` expression** is untouched — out of
   scope per dispatch.
