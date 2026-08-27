# REVIEW-027 — Unit E session durability, subtraction correction 3b

**Date:** 2026-08-27
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the runtime harness does not expose model, reasoning-effort, or
prior-session identity metadata, so those attributes cannot be independently
confirmed
**Code target:** `feat/session-durability` correction head
`988e7ff3f4bce4767d8a0ad8dc107372b547a575`
**Review overlay:** `9d6056b8f68ee246b6e94c075f39f3f0aeb36db1` — controller
LOCK transition only
**REVIEW-026 candidate:** `9e90fdba7d3e828da5a716a8985957f85e166b82`
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** REVIEW-026 findings 1 and 2 are closed. The stale future/single-point
publication universal is deleted from both named publisher headers, the 006d
README names correction commit `811600fa`, and compensating control 1 now
states the measured purge-before-the-provider's-own-`getSession()` boundary
with ADR-009's construction-time-load qualifier. Both changed TypeScript files
are token- and emitted-JavaScript-identical to `9e90fdba`; all 18 test
assertions are identical. The four gates pass at the exact correction head,
the narrower `8b49f31` stability account is exact, all instruments are
unchanged, and governance is clean.

REVIEW-026 finding 3 is only partially closed. The direct 006c-to-006d limit-10
diff removes two substantive clauses: the web storage-key/ruling-26 provenance
and the statement that on web “no demand is recorded.” The new README and
HANDOFF itemisations name only the former. The dispatch requires every
subtraction in limits 2, 5, 10, and 11 to be named and explained, so acceptance
item 3 does not hold.

This is a prose provenance defect, not permission for code. No merge
recommendation or PROJECT-STATE copy block is supplied.

## Acceptance matrix

| # | Required result | REVIEW-027 result | Fresh basis |
|---|---|---|---|
| 1 | REVIEW-026 finding 1: delete the future/single-point universal at both named files; README names `811600fa` | **PASS.** The targeted headers no longer claim every possible or future publication is structurally enclosed. Whole-tree synonym hits outside immutable history are bounded to the current enumerated bytes or to the one barrier abstraction, while the same source expressly permits another state channel. | Direct two-file diff; whole-tree exact/synonym scan; source context; README SUPERSESSION text. |
| 2 | REVIEW-026 finding 2: control 1 states the measured ordering and ADR-009 qualifier; no “before any session load” in the register | **PASS.** Control 1 says observed purge precedes the provider's own `getSession()` and construction-time library loads can precede the consult, then be contained by the later purge, never prevented. The banned phrase is absent from the register. | 006d register, ADR-009, provider ordering comment, targeted phrase scan. |
| 3 | REVIEW-026 finding 3: itemised carry in README and HANDOFF; limits 2, 5, 10, 11 name every removal and why; classes match 006c bytes | **FAIL introduced by correction 3b.** Limits 2, 5, and 11 are accounted for. Limit 10 also loses “no demand is recorded,” but both itemisations name only the storage-key/ruling-26 clause. | Direct 006c/006d Known-limits comparison; README lines 361–364 and 402–404; HANDOFF lines 138–142. |
| 4 | Both source files executable-identical to `9e90fdba`; zero assertion changes | **PASS.** Publisher: 227 tokens, identical SHA-256 `67bb5c23…`, emitted JS `5fcaf4e4…`. Publisher test: 1,114 tokens, `fc318020…`, emitted JS `2567a452…`; 18/18 ordered assertion statements identical, `339ffce8…`. | Fresh TypeScript scanner over Git-object bytes; `transpileModule({ removeComments: true })`; AST assertion extraction. |
| 5 | Gates 4/4 at the head; exact `8b49f31` 9/9-pair, 7/9-committed stability account; instruments unchanged | **PASS.** Exact `988e7ff3` gates all exit 0: 11/11 suites, 196/196 tests. At `8b49f31`, both captures exit 0, all 9 pair-match, 7 match committed; only the predicted binding/red-lane deltas exist. All ten 006d producers/probes are blob-identical to `9e90fdba`. | Exact-head gates; two disposable exact-`8b49f31` captures; byte comparisons; Git blob OIDs. |
| 6 | Five-file builder touch set; BRANCH-NOTES and excluded paths untouched; ruling-6 nil | **PASS.** `591f025a..988e7ff3` is exactly five files. BRANCH-NOTES blob `2864b170…` is identical; no prohibited path changed; builder records say workflow/subagent fan-out was nil. | Git name/status, numstat, blob and pathspec checks; correction HANDOFF and 006d disclosure. |

## Review boundary and preflight

- The mandated sequence ran first: `git fetch origin`; checkout
  `9d6056b8f68ee246b6e94c075f39f3f0aeb36db1`; then
  `git diff --stat 988e7ff3..HEAD`. Only
  `docs/01-state/BRANCH-NOTES.md` appeared (`+14/-1`).
- At the overlay, the Unit E LOCK reads `Status: REVIEW`; its transition note
  says “correction-3b review, REVIEW-027.” The LOCK status line is untouched.
- `AGENTS.md` is exactly 5,378 bytes with SHA-256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`.
- The ancestry is linear at every dispatched boundary:
  `7caf23e1` → `9e90fdba` → `988e7ff3` → `9d6056b8`.
- Review work ran on local branch `review/review-027` in a dedicated worktree.
  It was clean before the two authorised records were written.
- Three supplementary read-only subagents covered documented standards,
  correction-spec prose, and evidence/governance. The reviewer of record
  independently inspected the relevant bytes and reran every verdict-driving
  comparison and gate. The fixed-boundary standards/spec procedure and the
  Supabase auth safety boundary were applied.
- No live Supabase endpoint, credential, secret, production system, device,
  native keychain, deployment, or outward-facing product action was used. The
  committed capture producer's non-gated `npm audit` step ran as part of each
  fresh capture; it contributes nothing to the stability verdict.
- GitHub Actions run `33013820445` was independently queried: completed
  success, pull-request event, exact `head_sha=988e7ff3…`, attempt 1.

## Directed verification

| Probe | Fresh result | Classification |
|---|---|---|
| Targeted universal deletion | The quoted `THE ONE`, every-publication, single-point, future-publisher, and every-publisher-inside-effect passages are deleted at both named files. | **PASS.** |
| Whole-tree synonym hunt | Remaining active statements describe current enumerated publishers, the input check on each call to `publish`, or one barrier abstraction; none restores future structural enclosure. Immutable REVIEW-026/HANDOFF quotations remain historical. | **PASS.** |
| README completion statement | Names `811600fa`, deletion rather than qualification, and every named site. | **PASS.** |
| Known-Issue control 1 | Purge before provider `getSession()`; construction loads may precede consult and are contained, never prevented. | **PASS.** |
| Banned control phrase | No “before any session load” in the Known-Issue register. Historical diagnosis remains in immutable REVIEW-026 and the correction HANDOFF's deletion account. | **PASS.** |
| Known-limit carry classes | Limits 2, 5, and 11 match their itemisations. Limit 10 loses an additional unitemised clause. | **FAIL item 3.** |
| Comment-free identity | Both touched TypeScript files have identical token streams and emitted JS against `9e90fdba`. | **PASS / no executable delta.** |
| Assertion identity | 18 ordered `expect()` statements are identical. | **PASS / zero assertion changes.** |
| Exact correction-head gates | Typecheck 0; lint 0; test 0, 11 suites/196 tests; format check 0. | **PASS.** |
| `8b49f31` capture account | Capture A 0; capture B 0; 9/9 A-vs-B; 7/9 A-vs-committed. | **PASS at the dispatched claim-16 boundary.** |
| `binding.txt` difference | Sole line: `src` OID `6824d091…` → `9dce1c5f…`. | **PASS / exactly predicted by comment deletion.** |
| `red-lane.txt` difference | 20→21 paths with only `docs/04-reviews/REVIEW-026.md` added; non-doc added-line count 2759→2753; no other line. | **PASS / exact account.** |
| Exact `stability.sh` wrapper | Not invoked because its committed-copy contract would intentionally fail the two differences above and overwrite `stability.txt`; its two underlying captures and every comparison were run directly in disposable paths. | **NOT RUN as a wrapper; required narrower account fully run.** |
| Instrument identity | Ten 006d producer/probe blobs, plus the carried 006a finding-3 runner, equal at `9e90fdba` and `988e7ff3`; committed `stability.txt` also unchanged. | **PASS.** |
| Live Supabase, native backend, physical restart/device | Outside this offline correction-review boundary. | **NOT RUN by boundary.** |

## Finding

### 1. MEDIUM — limit 10's itemisation omits one substantive subtraction

**Class:** FAIL introduced by correction 3b; evidence provenance and final
claims-table accuracy; verdict-driving for acceptance item 3.

**Files:**
`docs/05-quality/evidence/006d-session-durability-fix3/README.md:361-364,402-404`;
`docs/01-state/HANDOFF.md:138-142`.

The immutable 006c limit 10 says:

> On web no observer exists, no demand is recorded, nothing is claimed; web
> keeps `localStorage` and gains no observer, and the storage-key namespace
> change on web is accepted under ruling 26.

The final 006d body now says only that web keeps `localStorage`, gains no
observer, and is unclaimed. That removes both (a) “no demand is recorded” and
(b) the storage-key/ruling-26 provenance. The new limit-10 itemisation says
only “removed: the web storage-key/ruling-26 clause,” and the correction
HANDOFF repeats that one-clause account.

“No demand is recorded” is a distinct statement about the web mechanism. It
may be redundant with the observer sentence or outside this native evidence
boundary, but deleting it is still a substantive subtraction. The dispatch
does not permit an unrecorded substantive trim inside a class labelled as an
itemised carry.

## Standards

**PASS — zero documented-standard violations and zero baseline smells.** The
five-file range, immutable records, top-insert discipline, RED-lane exclusions,
comment-only source/test delta, and ruling-6 disclosure all conform to the
repository standards.

## Spec

**One finding.** Findings 1 and 2 are fully corrected, no behavioural scope
creep exists, and the executable/evidence/governance requirements pass. Finding
3 remains partial because limit 10's removal account omits one deleted clause.

**Axis summary:** Standards: 0 findings. Spec: 1 finding, worst MEDIUM. The
formal verdict remains FAIL because the dispatch makes all six items necessary.

## Governance and scope verification

**PASS by direct Git-object verification:**

- Builder commits are exactly `811600fa`, `8b49f31`, and `988e7ff3` above
  controller transition `591f025a`, touching HANDOFF, 006d README, 006d
  `ci.txt`, publisher test, and publisher source only.
- `docs/01-state/BRANCH-NOTES.md` is blob-identical at the builder boundaries.
  The controller overlay alone changes it.
- No correction commit changes `supabase/`, `.github/`, `app.json`, package
  manifests/lockfile, generated database types, ADRs, or prior review records.
- The builder's ruling-6 disclosure is nil. Git confirms the recorded tree;
  hidden session fan-out is not independently observable from repository
  bytes.
- No migration, RLS/authorization policy, payment path, secret, production
  query, deployment, publication, or other RED-lane/outward action occurred.

## Required subtraction

To close this verdict without changing behaviour, assertions, instruments, or
mechanism, update both the 006d limit-10 itemisation and the correction HANDOFF
itemisation to name the second removed clause — “no demand is recorded” — and
state why it was removed (for example: it is web mechanism detail outside this
native instrument-limit record, and this cycle claims nothing on web). Keep the
final limit body and all executable bytes unchanged.
