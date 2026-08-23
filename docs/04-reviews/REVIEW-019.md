# REVIEW-019 — Unit D auth and session v1

**Date:** 2026-08-24
**Reviewer of record:** Codex Sol, Ultra effort, fresh session; did not build
the unit and did not open the builder's session
**Review target:** `feat/auth-session-v1` at
`d6dc677953148def3cb6d4b898ac177308eab990`
**Review merge base:**
`07ad5a51ed597f67bac523e681525c4e87fe644d`
**Current main consulted for governing records:**
`8ab17821f2dbc3d46ae77c75090cf8d7bbeca96b`
**Pull request:** #11, exact target head and current-main base
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** Six introduced implementation defects break the auth-path storage
properties that ADR-004 and the candidate's own claims require. Two introduced
evidence defects allow meaningful violations to stay green. Two low record
accuracy defects do not drive the verdict.

The sharpest defect is the one this candidate says its two-generation design
removed: a reader can still obtain `null` while a valid session replacement is
in progress. The committed test serializes every observer read to completion,
so it never exercises the stale-reader schedule. Independent review-only
interleavings also produced a valid-JSON hybrid session from two writers,
reported sign-out success while the complete session remained readable, and
left token fragments behind after removal.

Ruling 14 applies. The builder's pre-submission adversarial pass is recorded but
does not consume the external fix budget. **Three of three fix cycles remain; a
response to this review is fix cycle 1.**

## Review boundary

- `HEAD` and `origin/feat/auth-session-v1` were both pinned to
  `d6dc677953148def3cb6d4b898ac177308eab990` before substantive inspection.
- The target has the sole parent and exact merge base
  `07ad5a51ed597f67bac523e681525c4e87fe644d`. The reviewed range is that base
  through the target, not current main.
- The range is one commit: 36 paths, 25 added / 10 modified / 1 deleted,
  `3134` insertions and `27` deletions. `git diff --check` passed.
- Current main at `8ab17821f2dbc3d46ae77c75090cf8d7bbeca96b`
  is two commits ahead of the merge base and contains ADR-004, ADR-005, and the
  CTRL-005 state record. Those records govern this review but are not attributed
  to Unit D's diff.
- PR #11 was opened after the build. At the final live check
  (`2026-08-23T17:42:42Z`) it had exact head
  `d6dc677953148def3cb6d4b898ac177308eab990`, exact base
  `8ab17821f2dbc3d46ae77c75090cf8d7bbeca96b`, and no check runs or commit
  statuses. CI is therefore `NOT RUN`, not pending evidence of a PASS.
- The builder-authored LOCK, the missing ADR at dispatch time, the accepted
  `.prettierignore` comment convention, and the additive current-main
  `BRANCH-NOTES.md` conflict are accepted controller-sequencing facts named in
  the dispatch. They are not findings here.
- ADR-005's device-local sign-out and AppState-gated auto-refresh are explicitly
  ruled pending for the post-review cycle. They are `NOT RUN` in this candidate
  and are not findings. I do not dissent from either ruling.

## RED-lane scope

**PASS, artifact-backed at the Git-object boundary.** The RED authorization was
limited to the v1 client-side auth surface, and the target stayed inside it.

- The complete `supabase/` tree is identical at base and target:
  `2b13461b9abd40f1c00afd316e3321d0931ef2fc`.
- `.github/` is identical:
  `173fa30fae4f5f83a35a88ef29914fbf8016c39a`.
- `src/lib/database.types.ts` is the same blob:
  `8c7fc943ffbadaf5a080999c34071a3b7cf3cbcc`.
- The 36-path object diff contains no `supabase/` path, migration, SQL file,
  policy directory, database function, grant, or storage-bucket policy.
- An added-line scan found no `CREATE/ALTER POLICY`, RLS enablement,
  `SECURITY DEFINER`, grant/revoke, `storage.buckets`, or database RPC operation.
  Matching synthetic SQL/policy paths and added lines were detected by the same
  scans, so the negative results were non-vacuous.
- No payment, billing, outward-deployment, secret, `.env`, key/certificate, or
  generated machine-local artifact is in the range. `expo.scheme` is unchanged,
  and the only dependency addition is `expo-secure-store`.

The repository can establish the committed scope. It cannot prove the
historical claim that no credential was read and no live service was contacted;
that external-action testimony remains **unverifiable from Git**, not promoted
to PASS.

## Findings

### 1. HIGH — `secure-store-adapter.ts` still exposes `null` to an in-flight reader

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:252-278,304-317`;
`src/__tests__/secure-store-adapter.test.ts:421-452`;
`docs/05-quality/evidence/005a-auth-session/README.md:98-99,239-248`.

`getItem` reads the live index and then awaits its chunks individually. After a
replacement writes the new index, `setItem` immediately purges the old
generation. This schedule is legal in the lockless client:

1. Reader R reads the old-generation index and pauses before reading chunk 0.
2. Writer W writes the spare generation, commits its new index, and purges the
   old generation.
3. R resumes against the old index, finds a deleted chunk, and returns `null`.

The review-only deterministic probe observed exactly `null`, while a subsequent
read returned the complete new value. This recreates the anonymous-request/RLS
denial and signed-out redirect that the two-generation change claims to remove.

The committed claim-13a test pauses the writer at a backend operation, then
runs each observer read all the way to completion before allowing the writer to
continue. It never pauses a reader after the reader captured the old index.
Its green result therefore does not measure “at every point” or the schedule
above. Claims 13a and the causal half of 13b are false.

### 2. HIGH — concurrent writers can commit a syntactically valid hybrid session

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:282-317`;
`src/lib/supabase.ts:19-37`;
`src/__tests__/secure-store-adapter.test.ts:471-480`.

Two `setItem` calls can read the same current index and select the same spare
generation. Their chunk writes and index commits then overwrite one another.
The adapter has no writer serialization, and this client passes no `lock`
option to the lockfile-pinned `@supabase/auth-js` 2.112.3 client. That version's
session predicate checks only that the parsed object has `access_token`,
`refresh_token`, and `expires_at` fields.

A deterministic review interleave paused writer A after its first target
chunk, let writer B finish, then resumed A. With equal-length session-shaped
JSON payloads, the final read was neither input but still parsed as JSON and
retained `access_token`, `refresh_token`, and `expires_at`; the access token
began with B's bytes and ended with A's bytes. A consumer can therefore receive
a structurally plausible session whose token material belongs to neither write.

The committed test proves only that two sequential writes select different
generations. It does not cover two writers that both select a target before
either commits.

### 3. HIGH — `removeItem` reports success while the complete durable session survives

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:205-211,236-249`;
`src/__tests__/secure-store-adapter.test.ts:484-500`;
`src/app/(app)/index.tsx:15-30`.

`deleteQuietly` swallows deletion failure for the base index and every chunk,
and `removeItem` always resolves. Against a fully seeded multi-key session whose
deletes rejected, the review probe observed:

- `removeItem` resolved;
- every session key, including the live index, survived; and
- a later `getItem` returned the complete original session.

The lockfile-pinned auth-js 2.112.3 implementation awaits storage removal before emitting
`SIGNED_OUT`. Because this adapter converts removal failure to success, auth-js
can emit that event and the UI can report no error even though the durable
session restores on the next read or launch. This is the false-success outcome
the screen says it must never produce.

The committed hostile-backend test starts with no observable stored value and
asserts only non-rejection. It proves liveness by discarding the required
postcondition. ADR-004 requires removal to clear every chunk and the index; the
candidate does not satisfy both requirements on its claimed rejection path.

### 4. HIGH — a transient index-read failure lets a failed replacement destroy the old session

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:196-217,282-301`;
`src/__tests__/secure-store-adapter.test.ts:502-514`.

`setItem` obtains its load-bearing current generation through `readQuietly`.
A backend rejection is collapsed to “no current index,” so the method chooses
generation 0 and purges it. If generation 0 was actually live and the first
replacement chunk write then rejects, the old base index remains but its
chunks are gone.

The deterministic probe seeded a valid generation-0 value, rejected the next
base-index read once, and rejected the first replacement chunk write once.
`setItem` rejected as expected, but the subsequent read returned `null` while
the old index still existed. A failed replacement had destroyed the last good
value.

Claim 13c's `setItem` test uses an empty store. Its rejecting index read cannot
hide a live generation, so it does not challenge this path. The initial index
read is state discovery, not cleanup, and must not be silently treated as
absence.

### 5. MEDIUM — the completeness oracle accepts a corrupt index and returns a truncated prefix

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:157-175,259-273`;
`docs/05-quality/evidence/005a-auth-session/README.md:90,163-169`.

The index parser checks marker, types, and ranges, while `getItem` trusts `n`
and `len` from that same index. After a normal multi-chunk write, changing the
index to a syntactically valid `{ __scs: 1, g, n: 1, len: chunk0.length }`
made `getItem` return chunk 0 as a non-null truncated prefix. Separately,
changing a chunk without changing total length returned the corrupted string.

The README discloses that length is not integrity, but ADR-004's governing
requirement is unqualified: a partial or corrupt read fails closed to `null`
and never returns a truncated string. A disclosure that the implementation
does less does not narrow the accepted ADR. The candidate violates that
requirement and overstates claim 6's “corrupt index” coverage.

### 6. MEDIUM — the first-gap sweep strands adapter-created token fragments

**Class:** FAIL introduced by this work; verdict-driving.
**Files:** `src/lib/auth/secure-store-adapter.ts:205-211,225-233`;
`src/__tests__/secure-store-adapter.test.ts:516-529`;
`docs/05-quality/evidence/005a-auth-session/README.md:93,101,179-182`.

`purgeGeneration` stops at the first absent key. The adapter can create that
gap itself: `deleteQuietly` may swallow one failed cleanup delete while later
deletes succeed. A later removal starts its unclaimed-generation sweep at
chunk 0, sees the earlier gap, and never reaches the stranded later fragment.

The deterministic review schedule used one selectively rejected cleanup delete,
then a shorter replacement and `removeItem`. The surviving key set was exactly
the stranded later chunk. No corrupt index or external tampering was involved.

This falsifies claims 9 and 13d and ADR-004's no-orphans requirement. It also
falsifies the README statement that a gap cannot arise from the adapter's own
writes. The committed test seeds only chunk 0 in the inactive generation, so a
first-gap algorithm necessarily finds it and passes.

### 7. MEDIUM — the required token-opacity property has no evidence instrument

**Class:** FAIL introduced in evidence; verdict-driving.
**File:** `docs/05-quality/evidence/005a-auth-session/README.md:9-11,81-121`.

ADR-004 requires the adapter never to mint, parse, validate, or refresh a
token. The claims table contains no claim or instrument for that property and
does not list it as `NOT RUN`, despite saying that every uninstrumented property
is recorded that way.

Direct source and call-expression inspection found no present token-field access
or token operation; the adapter currently treats the payload as an opaque
string, and its only JSON parsing is index metadata. That inspection is not a
committed behavioral artifact, so the property is **NOT RUN as an artifact-backed
PASS**. Sensitivity was tested: inserting a behavior-preserving
`JSON.parse(value)` into `setItem` left all 31 adapter/platform tests and all
four gates green. The required regression boundary is therefore absent.

### 8. MEDIUM — three claims are mapped to instruments that do not reach the named behavior

**Class:** FAIL introduced in evidence; verdict-driving.
**Files:** `docs/05-quality/evidence/005a-auth-session/README.md:91,97,100`;
`src/__tests__/secure-store-adapter.test.ts:484-514`;
`src/__tests__/session-storage-platform.test.ts`.

The claims table exceeds the probes in three independently mutable places:

1. Claim 7 says any backend throw becomes `null`; its test rejects the base
   index read, so it returns before a chunk read. A mutant allowing a chunk-read
   rejection to escape stayed green.
2. Claim 13 says the platform storage reaches the Supabase client; its tests
   inspect only the exported platform value. Removing
   `storage: authSessionStorage` and its import from `src/lib/supabase.ts` stayed
   green.
3. Claim 13c says cleanup reads and deletes fail. Its rejecting sweep read
   stops the sweep before any delete is called, so the “cleanup delete” half is
   not exercised.

A combined disposable mutation containing the escaping chunk read, missing
client wiring, and payload parsing still passed typecheck, lint, all 57 tests,
and format checking. The artifacts are reproducible, but these PASS boundaries
are not sensitive to the named behavior.

### 9. LOW — the evidence manifest miscounts its own storage tests

**Class:** FAIL introduced in documentation; not verdict-driving.
**Files:** `docs/05-quality/evidence/005a-auth-session/README.md:43`;
`docs/05-quality/evidence/005a-auth-session/adapter-properties.txt:10-53`.

The producer table says all 25 storage-layer assertions are named. The committed
transcript contains 28 adapter test cases and 3 platform test cases, 31 total.
The overall 57-test gate count is correct; this local manifest count is not.

### 10. LOW — the HANDOFF touch-set silently excludes the HANDOFF itself

**Class:** FAIL introduced in documentation; not verdict-driving.
**File:** `docs/01-state/HANDOFF.md:202-203`.

The HANDOFF reports 10 existing-file changes at `+138/-27`, plus 25 new files
at 2785 lines. Those figures are the range with the HANDOFF's own 211 inserted
lines omitted, but the stated “recordable deltas only” boundary does not
disclose that exclusion. The full immutable range is 36 files,
`+3134/-27`; excluding only the HANDOFF it is 35 files, `+2923/-27`.

## Adversarial verification record

The committed suite and the review-only harness answer different questions.
Both results are recorded so a green baseline is not mistaken for semantic
clearance.

| Check | Result | Classification |
|---|---|---|
| Committed adapter suite | 28/28 test cases passed | PASS only for its named schedules |
| Committed adapter + platform artifact | 31/31 passed | PASS only for the recorded module-level probes |
| Review-only secure-store counterexamples | 8/8 counterexamples reproduced | FAIL introduced; findings 1-6 |
| Stale reader | old index captured; writer completes; read is `null` | FAIL introduced |
| Same-target writers | final value is valid JSON but neither input | FAIL introduced |
| Same-length corruption | altered value returned non-null | FAIL introduced |
| Self-consistent corrupt index | truncated chunk 0 returned non-null | FAIL introduced |
| Corrupt index plus gap | later chunk survives removal | FAIL introduced |
| Adapter-created gap | selectively undeleted later chunk survives removal | FAIL introduced |
| Rejected deletes | removal resolves and complete session remains readable | FAIL introduced |
| Failed current-index read + failed write | old session becomes unreadable | FAIL introduced |

The review harness was intentionally disposable and was not added to the unit.
The schedules and observed postconditions above are the immutable review record;
no product or test remediation was performed.

## Evidence classifications

| Boundary / check | Classification | Artifact or reason |
|---|---|---|
| Exact target, parent, merge base, and 36-path range | PASS | immutable Git object IDs and object diff recorded above |
| Supplied `AGENTS.md` hash and size | PASS | SHA-256 `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`, 5378 bytes |
| Authorized client-only RED scope; no database auth delta | PASS | identical `supabase/` and database-types objects plus controlled path/added-line scans |
| `npm run typecheck` | PASS | fresh reviewer run, exit 0 |
| `npm run lint` | PASS | fresh reviewer run, exit 0 |
| `npm test -- --ci --runInBand` | PASS | fresh reviewer run, 5 suites / 57 tests / exit 0 |
| `npm run format:check` | PASS | fresh reviewer run, exit 0 |
| Seven evidence artifacts, two fresh captures | PASS for reproducibility only | offline `stability.sh`: capture statuses 0/0, 7/7 byte-identical, exit 0 |
| Deterministic chunk keys | PASS | claim 12 and named adapter tests; implementation at `secure-store-adapter.ts:111-113` |
| Named missing-chunk/length cases | PASS within their exact cases | claims 5-6 artifacts; does not override finding 5 |
| Atomic replacement and concurrent storage safety | FAIL introduced | findings 1, 2, and 4 |
| Partial/corrupt read always fails closed | FAIL introduced | finding 5 |
| Removal clears every chunk and the index | FAIL introduced | findings 3 and 6 |
| Token payload remains opaque | NOT RUN as an artifact-backed property | direct source inspection found no current violation; finding 7 shows the missing instrument |
| OTP/provider/route/chrome properties | PASS within committed instrument boundaries | `session-properties.txt`, `route-guards.txt`, `banned-apis.txt`, and `chrome.txt` |
| `npm audit` | FAIL pre-existing | committed capture reports 21 upstream advisories; dependency artifact adds only `expo-secure-store` |
| GitHub CI for exact target | NOT RUN | PR #11 has 0 check runs, 0 statuses, and an empty check rollup |
| Live Supabase, real OTP, real session, credential use | NOT RUN | Phase A is offline; owner-executed Phase B |
| Real iOS/Android keychain, OS limit, OS/process concurrency | NOT RUN | no device/simulator or native concurrency run |
| Browser `localStorage`, rendered title, real router navigation | NOT RUN | module/components tested with doubles; no served browser flow |
| ADR-005 local sign-out and AppState gating | NOT RUN, ruled pending | explicitly excluded from findings by dispatch and ADR-005 |
| Advisory-reviewer result | NOT RUN in this record | no advisory result was provided; controller owns that seat |

Fresh stability confirms that the committed outputs reproduce. It does not
clear the semantic counterexamples: a stable false-green instrument is still
false-green.

## Standards

- **Hard, high:** broad catch-and-ignore handling declares removal success while
  preserving the security-sensitive state it was required to delete (findings
  3 and 6).
- **Hard, high:** the concurrency suite serializes observer completion and does
  not model the interleavings named by claims 13a/13b (findings 1 and 2).
- **Hard, high:** a state-critical index-read failure is treated as absence,
  allowing a failed update to destroy the previous committed value (finding 4).
- **Hard, medium:** the evidence map omits a required property and three
  meaningful mutants survive every gate (findings 7 and 8).
- **Hard, low:** two review-facing records state inaccurate counts or an
  undisclosed counting boundary (findings 9 and 10).
- **Judgment-call smell, non-blocking:** the exact title expression
  ``Sign in · ${APP_NAME}`` is duplicated in `(auth)/_layout.tsx` and
  `(auth)/sign-in.tsx`; changing it requires two edits. No action was taken.

No additional hard AGENTS.md violation was found after applying the dispatch's
accepted LOCK and `.prettierignore` exceptions.

## Spec

- **ADR-004 deterministic keys:** PASS, artifact-backed.
- **ADR-004 opaque token handling:** no current source violation found;
  artifact classification NOT RUN, finding 7.
- **ADR-004 partial/corrupt read fails closed:** FAIL introduced, finding 5;
  findings 1-2 also expose absent or hybrid reads during legitimate writes.
- **ADR-004 removal clears every chunk and index:** FAIL introduced, findings 3
  and 6.
- **Directed two-generation replacement property:** FAIL introduced, findings
  1, 2, and 4.
- **Email OTP, platform split, provider states, route protection, and chrome
  gate:** PASS within the exact committed instruments, subject to finding 8's
  missing client-wiring boundary.
- **No database-layer auth change:** PASS at the complete Git-object boundary.
- **ADR-005 local sign-out and AppState gating:** deliberately not implemented,
  NOT RUN, and not findings. No dissent recorded.

Standards: 5 hard finding groups, worst high, plus one non-blocking judgment
call. Spec: 4 failed or unsupported governing properties, worst high.

## Conclusion

The client-only scope, deterministic key derivation, OTP/provider surface,
route guards, four local gates, and artifact reproducibility are bounded and
honestly classifiable. They do not compensate for the six surviving storage
counterexamples or the evidence suite's false-green boundaries.

**Verdict: FAIL.** Return the same branch to the same builder for external fix
cycle 1 of 3. This record changes no product code, test, evidence producer,
claim, ADR, state ruling, or LOCK. The target LOCK remains `Status: BUILD`;
status reconciliation and the known additive `BRANCH-NOTES.md` conflict remain
controller-owned.
