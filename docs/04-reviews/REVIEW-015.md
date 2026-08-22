# REVIEW-015: Unit C — Schema and RLS v1 fix-cycle-3 re-review

**Date:** 2026-08-22
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`4032af86385760375e8accb4e47c81c9c5ed7b04`
**Prior records:** REVIEW-011, REVIEW-012, REVIEW-013 (FAIL);
REVIEW-014 (advisory, SOUND, non-gating)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Per AGENTS.md, the repository governance preflight (AGENTS, current state,
LOCK, and HANDOFF mechanics) preceded the fetch. Before inspecting reviewed
code, evidence, or prior review content, I ran `git fetch origin` and pinned
both dispatch-supplied objects. Each resolves to a commit; freshly fetched
`origin/main` equals the supplied base; `origin/feat/schema-rls-v1`, local
HEAD, and the clean checked-out branch equal the supplied target; and the
base is an ancestor of the target. The range is thirteen linear commits,
46 files, +7370/-12.

The post-REVIEW-013 fix commit is exactly
`bac4c058b17ecf6acaf78861f39c727dae3dfed5`: 13 files, +761/-153. It does
not touch an applied migration, `src/lib/database.types.ts`, an ADR, a prior
REVIEW record, or either `roles-acl.*` file. The target commit
`4032af86385760375e8accb4e47c81c9c5ed7b04` has parent `bac4c05` and adds
exactly REVIEW-014 plus a 57-line HANDOFF insertion: two files, +198/-0.
Both deltas and the full range pass `git diff --check`. The LOCK remains
REVIEW.

I audited every fix-cycle hunk, the bounded oracle statement and its twelve
named classes, all 32 permanent controls, the corrected anon boundary, the
three live transcripts and their exact bindings, the advisory record, and
the state/immutability boundaries. In a detached plain-path exact-target
checkout I reran 004a's six gated artifacts twice and 004b's five gated
artifacts twice. All twenty-two comparisons reproduced committed bytes and
both stability processes returned 0. Counterfactuals ran only against
disposable migration copies with the exact pinned `libpg-query@17.7.4`
parser. No counterfactual was applied to a database.

No Supabase project was queried. I did not read a credential, inspect or
change live auth state, create/delete a user, run `db push`, regenerate
types, edit an applied migration, open a PR, push, merge, or deploy. The
post-run toggle and user-deletion events remain controller-restated
owner/builder records; fresh reviewer verification is NOT RUN. Fresh GitHub
queries found zero pull requests for the branch and zero workflow runs at
the target SHA.

The disclosed Opus 5 [1m] / Max substitution is accepted under the owner
ruling. The harness-fixed Fable 5 trailer is the dispatched cosmetic artifact
and is not a finding. REVIEW-013 finding 4 is controller-owned and excluded
by the dispatch. REVIEW-014's SOUND advisory verdict, claim-6 disposition,
standing rulings, and backlog items are accepted and not re-litigated.

**Disclosure (ruling 6):** one review workflow ran:
`standards-spec-review`, with separate read-only Standards and Spec axes.
Three read-only subagents covered F1/live bindings, F2/oracle controls, and
F3/scope/count mechanics; two of those agents then supplied the independent
Standards and Spec reports. No subagent edited the repository. Main-lane
methods were fixed-range Noema governance review and Supabase/PostgreSQL
authorization plus evidence-boundary verification.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
| --- | --- | --- | --- | --- |
| 1 | medium | FAIL introduced by Unit C and retained after fix cycle 3 | yes | The bounded oracle still returns green for material neighbors **inside** named classes, including a storage RLS predicate that reverses owner scoping. |
| 2 | medium | FAIL introduced in fix-cycle-3 evidence; producer weakness pre-existing | yes | The authenticated transcript's auth-settings request failed, but the producer and prose still classify the run as having recorded `mailer_autoconfirm=true`; no committed artifact proves the post-run `false` measurement. |
| 3 | low | FAIL introduced by fix-cycle-3 prose | no | Two literal evidence-history statements are false: the deprecated phrases still occur in negating/history text, and the current namespace is listed as a previously deleted namespace. |

### 1. The bounded oracle has false greens inside its named classes

The new [004a coverage statement](../05-quality/evidence/004a-schema-rls/README.md#what-the-oracle-proves--and-what-it-does-not)
honestly disclaims exhaustive schema equivalence and says out-of-class
parse-valid neighbors may pass. That bound is accepted. The problem is
narrower and is exactly the controller's driving question: properties the
twelve named classes say they pin still pass green when changed.

Baseline at the exact target returned process 0, `78 assertions, 78 PASS`.
Each row below then changed only the named property in a fresh migration
copy; each parsed successfully and again returned process 0 and 78/78:

| Named class and stated property | One-change neighbor accepted green |
| --- | --- |
| RLS — exact USING/WITH CHECK predicate shape | First storage SELECT folder predicate: `(storage.foldername(name))[1] = (select auth.uid()::text)` → `IS DISTINCT FROM` |
| RLS — exact USING/WITH CHECK predicate shape | First storage SELECT bucket predicate: `bucket_id = 'captures-audio'` → `IS DISTINCT FROM` |
| RLS — per-policy permissiveness | Provisioning policy changed from permissive to `AS RESTRICTIVE` |
| Functions — `search_path` pinned to exactly empty | `set search_path = ''` → `set search_path = '', public` |
| Set shape — four filenames | Core migration timestamp prefix renamed while retaining the accepted suffix and apply order |
| Entity inventory — exact column list/order | A `LIKE pg_catalog.pg_class EXCLUDING ALL` table element added to `public.profiles` |

The first control is decisive by itself. For another user's folder,
`folder IS DISTINCT FROM current_uid` is true; it is also true for a null
folder versus a non-null uid. The mutated SELECT policy therefore inverts
the owner predicate while
[`verify-migrations.mjs`](../05-quality/evidence/004a-schema-rls/verify-migrations.mjs)
still prints `PASS storage.objects select: ... {user_id}/-scoped`.
Independent main and oracle lanes reproduced the defect.

The AST cause is direct. `isOwnPredicate()` requires
`A_Expr.kind === 'AEXPR_OP'`, but `isBucketEq()` and `isFolderEq()` compare
only the operator-name field. PostgreSQL's parser represents `IS DISTINCT
FROM` as `AEXPR_DISTINCT` while retaining the operator name `=`, so both
helpers accept the opposite operator. The other controls expose analogous
named-property omissions: only the first `search_path` argument is checked;
the provisioning policy's `permissive` field is not; filenames use suffix
tests; and column extraction ignores non-`ColumnDef` table elements.

The committed migrations themselves retain the intended equality predicates
and no actual RLS bypass was found. This is a proof-artifact failure, not a
claim that staging currently contains the counterfactual. But it is inside
the enumerated RLS/function/set/entity classes, so the controller ruling
makes it a real, verdict-driving finding. The 32-scenario battery proves the
32 cases it runs; one scenario per broad class does not prove every property
listed for that class.

### 2. The authenticated auth-settings measurement false-greens

The corrected [anon transcript](../05-quality/evidence/004b-schema-rls-live/anon-probes.txt)
does prove the pre-run setting: HTTP 200 and
`mailer_autoconfirm=true`. The new
[authenticated transcript](../05-quality/evidence/004b-schema-rls-live/auth-probes.txt),
however, records:

`auth settings: HTTP 0 disable_signup=undefined mailer_autoconfirm=undefined external.email=undefined`

That contradicts the [004b README](../05-quality/evidence/004b-schema-rls-live/README.md)
statement that each committed transcript records the state it ran under and
the fix-cycle HANDOFF statement that both transcripts record `true`.
`readAuthSettings()` converts a request failure to status 0/undefined;
`authMode()` does not count readability as a probe failure and stops only if
`disable_signup === true`. The complete run can therefore report 46 PASS,
zero FAIL, and exit 0 while this measurement failed. The transcript also
drops the request error body, so the exact cause is not recoverable.

The 46 authenticated behavioral probes remain valid: signup returned sessions
and the owner/RLS/storage operations passed. The anon transcript independently
proves the immediately preceding pre-run value. The post-re-enable `false`
measurement and the two user deletions are controller-restated owner/builder
facts, but no `docs/05-quality/evidence/` artifact binds the post measurement;
fresh external verification was not authorized or run. This finding is about
the explicit measurement/PASS claim and its fail-closed producer path, not a
demonstrated wrong current toggle state.

### 3. Two literal fix-cycle statements are inaccurate

The new builder [HANDOFF](../01-state/HANDOFF.md) says the deprecated anon
phrases no longer occur anywhere under `docs/05-quality/evidence/` and calls
that grep-verified. They remain in the 004b README's fix-cycle history as the
quoted former wording and in claim 4 under explicit negation. The operative
claim is correctly narrowed, so REVIEW-013 F1 is not reopened semantically;
only the literal zero-occurrence assertion is false.

Separately, the new comment above `USERS` in
[`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs)
says the fresh `ctrl004e-*` pair is distinct from deleted
`ctrl004b-*`/`ctrl004c-*`/**`ctrl004e-*`** pairs. The last historical
namespace should be `ctrl004d-*`. The actual two-user array and committed
signup identifiers are correctly `ctrl004e-*`; this is evidence-history
prose, not runtime behavior.

## REVIEW-013 disposition

| Prior item | Re-review status | Evidence boundary |
| --- | --- | --- |
| F1 — residual anon no-grants claim | **cleared at the substantive measured boundary** | Current producer/transcript/claim 4 say no current table-level CRUD and name the non-CRUD entries plus column-ACL NOT RUN boundary. Finding 3 is literal history/prose only. |
| F2 — six false-green classes and bounded claim | **not cleared** | The six REVIEW-013 controls now reject, and the non-exhaustive bound is honest, but new false greens occur inside properties the named classes expressly claim to pin. Finding 1. |
| F3 — unsupported/miscounted scratch battery | **cleared** | 32 permanent scenarios, 32 exit-1 results with named FAIL, derived run count, artifact enumeration cross-check, fresh byte reproduction. |
| Finding 4 — historical LOCK `11/11 denial` | **excluded by controller ruling** | Deliberately untouched; superseding close-out note remains controller-owned. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
| --- | --- | --- |
| Exact refs, ancestry, and sequence | PASS | Fresh fetch; both supplied objects are commits; remote/local refs equal the supplied SHAs; base is an ancestor; thirteen linear commits. |
| Full range and two post-review deltas | PASS | Full: 46 files, +7370/-12. Fix cycle 3: 13 files, +761/-153. Advisory commit: two files, +198/-0. |
| Protected and immutable boundaries | PASS | Fix cycle 3 has no migration, generated-type, ADR, prior-REVIEW, or `roles-acl.*` delta. REVIEW-014 adds only itself and an insertion-only HANDOFF block. LOCK remains REVIEW. |
| Actual migration/RLS source | PASS on direct inspection | Applied migration bytes are unchanged and retain the intended authenticated owner predicates, UPDATE USING+WITH CHECK pairs, private bucket row, and storage equality predicates. No actual bypass was found. |
| Bounded-claim honesty | PASS | README and producer explicitly disclaim exhaustive equivalence and limit green to named classes. |
| Named-class discrimination | FAIL introduced by Unit C; retained | Multiple in-class neighbors return process 0 and 78/78; finding 1. |
| Exact-target 004a baseline | PASS | Fresh pinned-parser run: 78 assertions, 78 PASS, zero FAIL, zero parse failures, process 0; reproduced `sql-assertions.txt`. |
| Permanent neighbor battery/count | PASS | Fresh exact-target capture reproduced blob `04f3224afc3f1c71c038a5106f69b50a953e4527`; 32 `run_scenario` calls, 32 `scenario:` lines, 32 exit-1/named-FAIL results, computed `scenarios run: 32`, process 0. Finding 1 limits coverage beyond those cases. |
| 004a stability | PASS | Six gated artifacts × two runs; all twelve comparisons identical; differing 0; process 0. |
| F1 current anon privilege boundary | PASS | `roles-acl.txt` records anon table CRUD `ffff`, the four non-CRUD raw entries, and the README retains column ACLs NOT RUN. Current producer/transcript wording is scoped accordingly. |
| Live file-byte bindings and probe counts | PASS | Independent hashes match both GREEN bindings: anon 3756 B, `9ba3c2b58ac469d8bd8827bceb6dbf7821fbb7bade3a0f97ede2d2a41d0d643f`; auth 12429 B, `059edefac0eb3edbe2e2dd4d8b495973c8d55251cb1281edae8ebcc5d3ff0e34`. Anon 11 PASS; auth 46 PASS; zero FAIL. |
| Auth-settings transcript/PASS claim | FAIL introduced in fix-cycle-3 evidence | Auth transcript records HTTP 0/undefined while prose says it recorded true; producer does not fail that measurement. Finding 2. |
| Post-run toggle and `ctrl004e-*` deletion | Controller-restated record / fresh external verification NOT RUN | The dispatch and HANDOFF record measured false after re-enable and owner-confirmed deletion. Reviewer held no secret-class credential and made no live query. |
| 004b offline stability | PASS | Five gated artifacts × two runs; all ten comparisons identical; differing 0; process 0. Live artifacts are run-varying and were hash-checked, not regenerated. |
| Four non-install repository gates | PASS from fresh exact-target captures | Both suites reproduced typecheck, lint, Jest, and format-check exit-0 transcripts byte-for-byte. |
| Secret-shape scans | PASS | Both positive-controlled full-index scans reproduced committed bytes. No credential value was read or printed. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta; the committed captures prove the no-dependency-delta premise. |
| Branch CI | NOT RUN | Fresh GitHub queries returned zero pull requests for the branch and zero workflow runs at the target SHA. |
| Owner apply/types generation, ACL probe, live auth run, toggle, and deletions | NOT RUN by reviewer | Owner/builder-executed under the supplied rulings. Outputs and controller record were reviewed; actions were not repeated. |
| `supabase db lint` / local stack | NOT RUN | Docker/database boundary unchanged and outside this re-review. |
| Advisory outcome | PASS as record / not a substitute for RoR | Immutable REVIEW-014 says SOUND; its source-backed BYPASSRLS resolution and controller dispositions are accepted. |
| Delta whitespace | PASS | Full-range and both post-review delta `git diff --check` probes returned 0 without diagnostics. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deploy, or outward-facing action occurred. |

## Standards

Standards: **four hard findings; worst severity medium.** The oracle's
in-class false green breaches AGENTS.md's artifact/PASS rule. The auth-settings
measurement, literal grep statement, and namespace history are evidence-
accuracy failures. No other documented-standard breach was found: migrations
and prior reviews remain immutable, HANDOFF changes are insertion-only,
PROJECT-STATE is limited to Active work, protected exclusions hold, the LOCK
stays REVIEW, and whitespace is clean.

Judgement-call smell: possible **Duplicated Code** in the three equality
recognizers. `isOwnPredicate()` checks both operator kind and name, while the
duplicated storage helpers omit the kind check. A shared exact-operator helper
would prevent this asymmetric blind spot. No other baseline smell materially
appears in the scoped delta.

## Spec

Spec: **three findings; worst severity medium.** First, the dispatch says an
inside-class false green is real; finding 1 demonstrates exactly that in the
named RLS class. Second, the dispatched before/after auth-settings measurement
is only partly artifact-backed: anon proves pre-run true, authenticated records
HTTP 0/undefined, and no committed evidence file binds post-run false. Third,
the literal no-occurrence statement fails although the surviving mentions are
historical/negating and the privilege boundary itself is correct. F3 and the
commit/write scope match the dispatch; no unrelated scope creep was found.

Standards: 4 findings, worst medium. Spec: 3 findings, worst medium.

## Carried and adjacent items

The actual applied migrations, committed live responses, role/ACL grid, and
REVIEW-014 authorization conclusion remain sound at their measured boundaries.
No current authenticated-user RLS bypass, public bucket in the applied SQL, or
credential leak was found. REVIEW-014's claim-6 pairing, S1-S3, and four backlog
items remain controller close-out work. REVIEW-013 finding 4 remains excluded
and controller-owned. New out-of-class neighbors were deliberately not sought
or reported as findings; every counterfactual above maps to a property the
named classes expressly say is pinned.

Findings 1 and 2 prevent PASS. The LOCK remains
`Status: REVIEW — fix cycle 3 complete, awaiting re-review`; MERGED is
controller-only.
