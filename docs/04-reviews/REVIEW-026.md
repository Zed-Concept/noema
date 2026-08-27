# REVIEW-026 — Unit E session durability, fix cycle 3 (subtraction)

**Date:** 2026-08-27
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the runtime harness does not expose model, reasoning-effort, or
prior-session identity metadata, so those attributes cannot be independently
confirmed
**Code target:** `feat/session-durability` subtraction head
`9e90fdba7d3e828da5a716a8985957f85e166b82`
**Review overlay:** `f15199e4b561031f5b68dce335b7f25d727e619f` — controller
LOCK transition only
**Cycle-2 candidate:** `2620802a208981a34a88690d4eba5ad10b096b61`
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Pull request:** #17; draft; exact-code-head CI passed
**Verdict:** **FAIL**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**FAIL.** Ruling 28's behaviour freeze is honoured. Comment-free lexical token
streams and emitted JavaScript are identical for both changed auth source
files between `2620802a` and `9e90fdba`; the ESLint configuration is likewise
token-identical. All 163 assertion-bearing statements in the two changed test
files are token-identical. The Known-Issue witness reproduces both REVIEW-025
schedules at the exact head with its inverted contract satisfied, and
`stability.sh` exits 0 with 9/9 artifacts identical at both named heads.

The subtraction is nevertheless incomplete:

1. The `auth-state-publisher.ts` header still says the barrier is the single
   point every publication must pass and that a publisher added tomorrow is
   automatically gated. That is the structural universal REVIEW-025's alias
   mutation disproved. The new narrowing immediately below contradicts it; it
   does not withdraw it. An unqualified copy also survives in the publisher
   test header.
2. The final Known-Issues register overstates compensating control 1: it says
   the durable demand is consulted before **any session load**. ADR-009 and the
   shipped provider's own comment record that the pinned client's constructor
   can load and refresh a session before any provider code, and therefore
   before that consult. Only purge-before-the-provider's-own `getSession()` is
   established.
3. The 006d README and HANDOFF say the 006c Known limits carry forward
   **unchanged**, but their bodies are substantively rewritten. Some narrowing
   is necessary and honest under ruling 28, especially limit 11; calling the
   result unchanged is not.

The dispatch makes every acceptance item necessary for PASS. These are
claim/subtraction defects, not permission for code. No fix cycles remain;
under ruling 28 the controller may correct them only by further subtraction.
This review makes no merge recommendation and supplies no PROJECT-STATE copy
block.

## Acceptance matrix

| # | Required result | REVIEW-026 result | Probe that established it |
|---|---|---|---|
| 1 | No behaviour change; no assertion change | **PASS.** Both auth sources and `eslint.config.js` have identical comment-free token streams and emitted JS. Provider tests: 145/145 assertion statements identical. Publisher tests: 18/18 identical. The diff contains comments and two `describe` strings only. | TypeScript scanner with trivia skipped over Git-object bytes; `transpileModule({ removeComments: true })`; AST extraction of the nearest assertion-bearing statement for every `expect()` call; direct five-file diff. |
| 2 | General invariant withdrawn, not reworded | **FAIL.** The enumerated-schedule wording and “NOT established in general” exist, but `auth-state-publisher.ts:25-40` retains the stale single-point/future-publisher universal; `auth-state-publisher.test.ts:15-21` repeats the unqualified every-publication statement. | Synonym hunt across source, tests, ESLint, 006d, HANDOFF, and PROJECT-STATE; direct comparison with REVIEW-025 finding 1 and the new narrowing at `auth-state-publisher.ts:42-65`. |
| 3 | Exact Known Issues, controls, expected-RED witnesses | **FAIL overall.** Both schedules are verbatim, HIGH, class session exposure; all four named controls are present; the exact-head runner exits 0 with 3/3 preconditions passed and 3/3 witnesses failed as expected (`expected signedOut`, `received signedIn`). The added “before any session load” explanation is false, so the compensating-control record is not honest. | Normalized quote hashes against REVIEW-025; exact-head `known-issue-witness.sh`; ADR-009 and `auth-provider.tsx:108-123` ordering comparison. |
| 4 | Lint claim narrowed to named import plus enumeration | **FAIL overall.** The rule is effect-identical, the alias bypass is documented beside it and in 006d, and every test assertion is unchanged. The stale future “every publication” comment keeps the structural claim alive, contradicting the accepted enumeration-only scope. | ESLint-config token identity; assertion fingerprints; `eslint.config.js:14-26`; `README.md:48-64,219`; stale publisher header. |
| 5 | Evidence claim narrowed; stability at both named heads | **PASS.** `afef2b2a` and `9e90fdba`: runner 0, captures A/B 0, 9/9 pair-identical and committed-identical. Both regenerate committed `stability.txt` SHA-256 `c0d22c8121fd9ed8a66163a3aa3c01f5bbb72f0f596c650e96666ad3b29fec8d`. `binding.txt` names its one base SHA; `red-lane.txt` names its exact exclusions, lists 20 paths, and includes REVIEW-025. Scan pathspecs are unchanged from 006c. | Two disposable exact-head worktrees running the committed `stability.sh`; producer diff; direct binding/red-lane inspection. |
| 6 | Claims table instrument-bound; 006c limits carried; 006a/b/c immutable | **FAIL overall.** The numbered claims are bounded to named instruments and the three old evidence trees match the dispatched OIDs exactly. All eleven limit headings survive, but material explanatory clauses in limits 2, 5, 10, and 11 change or disappear while README/HANDOFF call them “unchanged.” | Claims-to-transcript search; direct 006c/006d Known-limits diff; Git tree-object recomputation. |
| 7 | Governance and excluded-path boundary | **PASS.** Builder range is 38 files, `+6390/-43`; BRANCH-NOTES is blob-identical; ruling-6 disclosure is nil; `reauth-demand.ts` is blob-identical to cycle 2; prohibited trees and manifests are untouched. | Git logs, blob/tree OIDs, per-commit stats, pathspec scans, and direct HANDOFF disclosure read. |

## Review boundary and preflight

- The required sequence ran before repository analysis: `git fetch origin`;
  checkout `f15199e4b561031f5b68dce335b7f25d727e619f`; then
  `git diff --stat 9e90fdba..HEAD`. The result named only
  `docs/01-state/BRANCH-NOTES.md`, 21 changed lines (`+20/-1`).
- At the overlay, the Unit E LOCK reads `Status: REVIEW` and its transition
  note says “cycle-3 review, REVIEW-026.” The LOCK status line is not edited by
  this review.
- `AGENTS.md` was 5378 bytes with SHA-256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`
  before it was trusted.
- `7caf23e1` is an ancestor of `2620802a`, which is an ancestor of
  `9e90fdba`. The base-to-code-head range is 27 commits, 125 files,
  `+24522/-538`. The cycle-3 builder range `f72e63fa..9e90fdba` is three
  commits, 38 files, `+6390/-43`; `git diff --check` is clean.
- Product/evidence probes ran in disposable worktrees pinned to exact
  `afef2b2a544a84b562f068bc6a653925518033d5` and
  `9e90fdba7d3e828da5a716a8985957f85e166b82`. The branch checkout remained
  clean until the two authorised review records were written.
- Three supplementary read-only subagents covered the documented-standards
  axis, ruling-28 spec/prose, and evidence/producers. The reviewer of record
  independently inspected the instruments and reran every verdict-driving
  command. The local Noema governance procedure, standards/spec review, and
  Supabase safety boundary were applied.
- No live Supabase endpoint, credential, secret, device, native keychain,
  production system, deployment, or other outward-facing system was accessed.
  Fake stores/fetch only were used by the witness.
- Reviewer-environment controls were separated from candidate results. The
  sandbox initially blocked the witness runner's nested Git-worktree write
  (exit 91); the authorised exact script was rerun outside that restriction
  and exited 0. A first stability setup exposed a top-level `node_modules`
  symlink as untracked, so both captures correctly refused the dirty tree;
  clean ignored-directory layouts were then used for the two reported exact-
  head runs. No tracked candidate byte was changed by either setup.

## Directed probe results

| Probe | Fresh result | Classification |
|---|---|---|
| Comment-free token identity | `auth-provider.tsx`: 1424 tokens, identical SHA-256 `e31dc154…`; `auth-state-publisher.ts`: 227, `67bb5c23…`; ESLint: 99, `79b85521…`. Emitted JS hashes match per pair. | **PASS / no executable delta.** |
| Assertion identity | Provider: 145 ordered assertion-bearing statements per tree, identical hash `536c7a02…`; publisher: 18, identical hash `fdc21fd…`. | **PASS / zero assertion changes.** |
| Narrowed invariant sites | 006d README and provider named-schedule block enumerate REVIEW-023/024 schedules and say “NOT established in general”; Known Issues name both failures. | **PASS at those sites.** |
| Stale universal hunt | Publisher header still says “single point every publication must pass” and “publisher added tomorrow is gated”; test header still says every publication flows through it. | **FAIL items 2/4.** |
| REVIEW-025 schedule quotation | Normalized schedule 1: 81 words, identical SHA `c1b3caae…`; schedule 2: 52 words, `5e2fc5b8…`. | **PASS / verbatim.** |
| Exact-head Known-Issue witness | Jest 1 as expected; 3/3 preconditions pass; three witnesses fail with expected `signedOut`, received `signedIn`; runner 0; `WITNESS-HOLDS`. | **PASS the witness contract; the witnessed defects remain OPEN.** |
| Compensating controls | Four required labels present. Control 1 adds “before any session load.” ADR-009 and shipped source say constructor/internal loads can precede the consult. | **FAIL the expanded control claim.** |
| Lint/test effect | ESLint executable tokens identical; exact direct-import restriction retained; alias bypass beside rule and in README; assertion streams identical. | **PASS the bounded mechanism; FAIL the surviving universal prose.** |
| Stability at `afef2b2a` | Both captures 0; 9/9 pair- and committed-identical; stability 0. | **PASS at the named evidence head.** |
| Stability at `9e90fdba` | Same result and same committed transcript hash. | **PASS at the named records head.** |
| Evidence inputs/exclusions | One SHA honestly identified in binding; docs TypeScript and docs/04 range input named; red-lane heading/list correct; 006c/006d scan pathspecs identical. | **PASS.** |
| 006a/b/c evidence trees | `be85ba58558cd167f72ca88572f1aa687d4e7c15`; `67d57d138cc5c99cfc5705cc312761f2408b818a`; `6fbba42b97497065d4cb3972aaf3be0c58a90192`, equal at `f72e63fa` and `9e90fdba`. | **PASS / byte-identical.** |
| Known-limits carry | Eleven numbered subjects remain, but direct bodies differ materially while 006d/HANDOFF say “unchanged.” | **FAIL record accuracy.** |
| Ambient-scanner restoration | `reauth-demand.ts` blob is `cc3a6237e5781a3660e05d949b808e1723d3b348` at both `2620802a` and `9e90fdba`; mutation transcript says all five files restored. | **PASS.** |
| Exact-code-head CI | Run 33003500621: completed/success, `head_sha=9e90fdba…`, pull_request event. | **PASS, independently queried.** |

## Findings

### 1. MEDIUM — the structural publication universal was not fully subtracted

**Class:** FAIL pre-existing / left open by this cycle; claim calibration and
lint-scope documentation; verdict-driving for acceptance items 2 and 4.
**Files:** `src/lib/auth/auth-state-publisher.ts:25-40,86-88`;
`src/__tests__/auth-state-publisher.test.ts:15-21`;
`docs/05-quality/evidence/006d-session-durability-fix3/README.md:43-47`.

The new text at publisher lines 42-65 correctly says the check samples input,
cannot retract queued or standing state, and does not prevent another state
channel. The older paragraph above it still calls this the single point every
publication must pass and claims a publisher added tomorrow is gated on the
day it is written. That is the exact future structural guarantee REVIEW-025's
default-import/destructured-alias counterexample defeated. The test header
repeats the unqualified “every publication” form.

Putting the narrowing beside the universal makes the header contradictory; it
does not withdraw the old claim. The 006d README additionally says the header
was narrowed everywhere, which is false at these lines. Under ruling 28 this
is corrected only by deleting or current-byte-qualifying the stale prose. No
lint, test, source mechanism, or behaviour change is authorised.

### 2. HIGH — the Known-Issue register overstates restart containment

**Class:** FAIL introduced by cycle 3; HIGH session-exposure risk register and
merge-control accuracy; verdict-driving for acceptance item 3.
**File:**
`docs/05-quality/evidence/006d-session-durability-fix3/README.md:165-170`.
**Contradicting records:** `src/lib/auth/auth-provider.tsx:108-123`;
`docs/03-decisions/ADR-009-refresh-lifecycle-supersession.md:39-45,62-66`.

The first compensating control is correctly titled “Any restart purges through
the bootstrap path,” and the instrument establishes the observed purge before
the provider's own `getSession()`. Its explanation adds that the durable
demand is consulted “before any session load.” That stronger temporal claim is
false under the governing architecture: the pinned client registers its own
listener during construction and can load/refresh a stored session before any
code in the provider runs. The shipped provider says those loads precede the
demand consult.

This does not invalidate the expected-RED witness or the eventual bootstrap
purge. It overstates one of the four controls offered to contain two HIGH open
issues and therefore cannot be copied into PROJECT-STATE as written. Ruling 28
permits subtraction to the measured “before the provider's own getSession”
boundary, not a code change.

### 3. MEDIUM — the final record calls changed Known limits “unchanged”

**Class:** FAIL introduced by cycle 3; evidence provenance and claims-table
accuracy; verdict-driving for acceptance item 6.
**Files:**
`docs/05-quality/evidence/006d-session-durability-fix3/README.md:108-113,321-366`;
the cycle-3 HANDOFF block's S4 paragraph.

All eleven numbered subjects remain, but the bodies are not unchanged:

- limit 2 deletes the claim that the flag-order fix narrows the in-process
  ungated interval to nothing;
- limit 5 compresses away the observed sign-in-success/resolution and
  persistence-failure explanation;
- limit 10 drops the web storage-key/ruling-26 clause; and
- limit 11 replaces “the flag and barrier gate its exposure, and the
  divergence ends at the next evaluation” with the narrower NEXT-publication
  boundary plus Known Issue 2.

The limit-11 correction is necessary and honest under REVIEW-025/ruling 28;
the old sentence is no longer defensible. The defect is calling that narrowed
record unchanged and saying REVIEW-025 narrowed none of it. The honest record
must distinguish limits carried verbatim from limits carried with ruling-28
subtraction. No instrument or behaviour change follows.

## Standards

The standards axis found **zero hard violations**. One non-driving judgement-
call smell, duplicated fake-client/process harness code across the three probe
sources, is overridden here by immutable evidence practice and ruling 28's
unchanged-instrument boundary. No corrective action is recommended in this
cycle.

## Spec

The spec axis found the same three verdict-driving defects recorded above:
the stale future publication universal; the false “before any session load”
control expansion; and the inaccurate “Known limits unchanged” claim. No
behavioural scope creep was found. Worst issue within this axis is the HIGH
overstatement of the compensating control for two HIGH session-exposure Known
Issues.

**Axis summary:** Standards: 0 hard findings, 1 overridden non-driving smell.
Spec: 3 findings, worst HIGH. The axes remain separate; the formal verdict is
set by the dispatch's all-items-required acceptance rule.

## Passing checks and evidence classifications

| Check | Classification | Fresh result |
|---|---|---|
| Ruling-28 behaviour freeze | **PASS** | Both product files and ESLint config token-/emit-identical; tests assertion-identical. |
| Enumerated-schedule narrowing | **PASS at named sites/schedules** | README and provider schedule block enumerate REVIEW-023/024 and say not general. |
| General/structural withdrawal | **FAIL pre-existing / not fully subtracted** | Future every-publication claim remains. |
| Known-Issue schedule text | **PASS** | Both quotations verbatim; severity/class exact. |
| Known-Issue executable witness | **PASS** | Runner 0; preconditions 3/3; expected-RED witnesses 3/3. |
| Known-Issue controls | **FAIL introduced** | Four labels present; control 1 contains one false stronger ordering sentence. |
| Named-import rule and alias disclosure | **PASS, bounded** | Rule unchanged; alias documented; current-source enumeration unchanged. |
| Two named-head stability runs | **PASS** | Each 0, each 9/9 pair-/committed-identical. |
| Binding/red-lane narrowing | **PASS** | Inputs and exclusions stated honestly; 20 paths include REVIEW-025; no scan exclusion added. |
| 006d numbered claims/instruments | **PASS except Known-limits provenance** | Named outputs present and bounded; the carry-forward description is false. |
| 006a/b/c immutability | **PASS** | Exact dispatched tree OIDs recomputed at both boundaries. |
| GitHub CI at code head | **PASS** | Exact `head_sha`, completed success. |
| Live Supabase / physical device / real OS restart / native File backend | **NOT RUN by boundary** | Offline synthetic stores/fetch only; Unit F retains the live/device gates. |

## Governance and scope verification

**PASS by direct Git-object verification:**

- `git log f72e63fa..9e90fdba -- docs/01-state/BRANCH-NOTES.md` is empty,
  and its blob is identical at both boundaries. The controller overlay alone
  changes the LOCK record.
- Builder commits are exact: `5e787a6` (5 files, `+90/-42`), `afef2b2`
  (30 files, `+6068/-0`), and `9e90fdb` (3 files, `+232/-1`). The builder
  HANDOFF touch set matches Git.
- The builder's ruling-6 disclosure is nil: no workflow and no subagent. The
  disclosed ambient scanner read occurred during M10; committed
  `reauth-demand.ts` is byte-identical to cycle 2, and no scanner suggestion
  entered the tree.
- No cycle commit changes `supabase/`, `.github/`, `app.json`, package
  manifests/lockfiles, generated database types, ADRs, prior review records,
  or `BRANCH-NOTES.md`.
- No migration, RLS/authorization policy, payment path, secret, production
  query, deployment, publication, or other RED-lane/outward action occurred.

## Conclusion

The no-behaviour-change, expected-RED witness, named-head stability, exact-tree,
and governance requirements all pass. The subtraction itself does not: a
withdrawn structural universal remains, a HIGH Known-Issue control is expanded
beyond ADR-009 and the instrument, and changed Known-limit prose is called
unchanged.

The verdict is **FAIL**. No merge recommendation is made. Per ruling 28 and
the dispatch, correction is further subtraction only; no behaviour change is
authorised. No product code, test assertion, evidence artifact, ADR, LOCK
status, BRANCH-NOTES content, migration, or outward-facing system was changed
by this review.
