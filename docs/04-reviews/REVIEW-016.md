# REVIEW-016: Unit C — Schema and RLS v1 fix-cycle-4 re-review

**Date:** 2026-08-23
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`1a090bab654565be79bef57504038d5822717e3e`
**Prior records:** REVIEW-011, REVIEW-012, REVIEW-013, REVIEW-015 (FAIL);
REVIEW-014 (advisory, SOUND, non-gating)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Per AGENTS.md, I read the current state, authoritative LOCK, and repository
rules first. Before reading reviewed code, evidence, or prior review content,
I ran `git fetch origin` and pinned both dispatch-supplied objects. Each
resolves to a commit; freshly fetched `origin/main` and local `main` equal the
supplied base; `origin/feat/schema-rls-v1`, local HEAD, and the clean checked-
out branch equal the supplied target; the base is an ancestor of the target.
The full range is fifteen linear commits, 49 files, +9103/-12.

The one post-REVIEW-015 commit is
`1a090bab654565be79bef57504038d5822717e3e`, with parent
`f994f8daf183d4f1dfa804cca810435a3934ade3`: 20 files, +1523/-144. It has
an empty diff for the four applied migrations, `src/lib/database.types.ts`,
ADRs, prior REVIEW records, both `roles-acl.*` files, and all three live
transcripts. The full range and fix-cycle delta pass `git diff --check`. The
LOCK remains REVIEW.

I audited the complete fix-cycle delta, the 91-assertion oracle, all 55
permanent neighbor scenarios, the twelve-class derivation, the settings
preflight producer and control, the unchanged live transcripts and their
bindings, and the state/write boundaries. I reran both committed stability
suites. 004a reproduced six gated artifacts across two fresh captures; 004b
reproduced six gated artifacts across two fresh captures. All 24 comparisons
were byte-identical and both processes returned 0. Adversarial checks changed
only in-memory or disposable scratch copies. No counterfactual was applied to
a database.

No Supabase project was queried. I did not read a credential, run the default
live producer, inspect or change live auth state, create/delete a user, run
`db push`, regenerate types, edit an applied migration, open a PR, push,
merge, or deploy. Live transcripts were deliberately not regenerated. Fresh
GitHub queries found zero pull requests for the branch and zero workflow runs
at the target SHA.

The dispatched Opus 5 / `max` substitution is accepted. The harness-fixed
Fable 5 trailer is the known cosmetic artifact and is not a finding. The
authorized 004a `.temp` normalization and two disclosed transcript
divergences are accepted. 004a's pre-existing nonzero-gate machinery chore is
not widened here. REVIEW-015 finding 3 and REVIEW-013 finding 4 are excluded
and are not treated as open builder findings.

**Disclosure (ruling 6):** one review workflow ran:
`standards-spec-review`, with separate read-only Standards and Spec axes.
Five read-only subagents covered those two axes, an independent oracle-
adversary lane, and the first 004a/004b stability attempts. The main lane
reran both stability suites successfully with the network or loopback
permission each required. No subagent edited the repository. Main-lane
methods were fixed-range Noema governance review and Supabase/PostgreSQL
authorization plus evidence-boundary verification. A final `docs-guard`
pass source-checked the review's symbols, paths, commands, counts, samples,
and internal/external links; it made the external behavior citations more
precise but did not change the verdict.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
| --- | --- | --- | --- | --- |
| 1 | medium | FAIL introduced by Unit C and retained after fix cycle 4 | yes | The oracle still returns green for an apply-valid storage RLS mutation inside the expressly claimed exact-predicate class; the twelve-class derivation therefore does not establish genuine in-class pinning. |
| 2 | medium | FAIL introduced by fix cycle 4 | yes | The positive-control seam is inherited by the real live wrapper and can return anon exit 0 with zero probes; the permanent control also does not exercise auth mode or isolate `mailer_autoconfirm`. |
| 3 | low | FAIL introduced by fix-cycle-4 HANDOFF prose | no | The HANDOFF says the fix delta is +1516/-144; the exact commit is +1523/-144. |

### 1. A material RLS neighbor remains green inside the named class

The target baseline returned process 0, `91 assertions, 91 PASS, 0 FAIL,
parse failures 0`. The 55 committed permanent scenarios also each returned
1 with the named FAIL, and their twelve unique class labels match the twelve
README labels in both directions. The reported prior neighbors, including
the six in REVIEW-015, now reject. Those are real improvements.

They do not prove the class-level claim. In a disposable exact-target
migration copy I changed only the first storage SELECT owner term:

```sql
(storage.foldername(name))[1] = (select auth.uid()::text)
```

to:

```sql
(storage.foldername(name))[1][2] = (select auth.uid()::text)
```

With the exact pinned `libpg-query@17.7.4` parser, all four migrations parsed
and the committed verifier returned process 0, including:

```text
PASS storage.objects select: one policy TO authenticated, bucket-pinned and {user_id}/-scoped
RESULT: 91 assertions, 91 PASS, 0 FAIL, parse failures 0
```

This is not a parse-only curiosity. [Supabase Storage's source at a pinned
commit](https://github.com/supabase/storage/blob/4fa61fba9371c4bd40cbb81509f07bcb3af21683/migrations/tenant/0002-storage-schema.sql#L85-L94)
defines `storage.foldername(text)` as returning `text[]`, and PostgreSQL 17
documents that using the wrong number of array subscripts
[returns `NULL` rather than raising an error](https://www.postgresql.org/docs/17/arrays.html).
The added second scalar subscript is therefore apply-valid and makes the
folder equality UNKNOWN for every row. PostgreSQL's RLS documentation says
that [rows whose policy expression does not return true are not
processed](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), so owners
are denied alongside everyone else.

The AST cause is direct. `isFolderEq()` reads only
`indirection[0]` and requires its upper index to be 1; it never requires the
indirection array to contain exactly one entry. The new `onlyKeys()` helper
does not repair that node and, despite its comments saying "exact key set",
implements only `actual keys` as a subset of `allowed keys`. The README's RLS
class expressly claims exact USING/WITH CHECK predicate shape, including the
folder ordinal. This counterexample changes exactly that property.

The class construction is mechanically bidirectional only as a set of
author-supplied labels. One rejecting scenario tagged `RLS` entitles the
README to name the broad class even when another expressly named RLS property
survives. The `sort -u` comparison also erases duplicates: a disposable
countercontrol with a duplicate README class and duplicate same-labelled
scenario still exited 0 with 12 unique classes and matching lists. The
current artifact has unique labels, so duplicate handling is not an
independent finding; it is another boundary on what the derivation proves.

The committed migrations retain the intended single `[1]` lookup and no
actual RLS bypass was found. This is a proof-oracle failure, not a claim that
the counterfactual is applied. It is nevertheless in the controller's
driving class and prevents PASS.

### 2. The settings control can escape into a live run and its proof is partial

The target's red-path implementation is correct on direct inspection.
`readAuthSettings()` requires HTTP 200, parseable JSON, and boolean
`disable_signup` plus `mailer_autoconfirm`; `requireUsableAuthSettings()`
exits 4; both anon and auth modes call it before their first probe. The
committed six-case control returns 0: HTTP 0, HTTP 503, unparseable, `{}`,
and null flags abort at 4 with zero probe PASS lines, while a well-formed
response is accepted. Claim 22 now rejects the authenticated transcript's
HTTP-0 line as evidence. Those parts clear REVIEW-015's original defect.

The new positive-control mechanism creates another fail-open path.
`rls-probes.mjs` checks inherited `SETTINGS_PREFLIGHT_CONTROL=1` immediately
after a usable anon preflight and calls `finish(0)` with zero probes. Unlike
the redaction control, it has no synthetic-key or loopback guard. The comment
says it is set only by `live-probes.sh --settings-control`, but that mode does
not exist. The real default `live-probes.sh` inherits the caller environment,
does not clear or reject the variable, treats child 0 as success, and later
gates only transcript redaction rather than probe counts. Therefore a caller
with that ambient variable can skip every anon denial probe; if the auth child
passes, the whole live wrapper still exits 0. The committed positive control
itself executes the critical child behavior: exit 0 and zero PASS lines.

The cited permanent control also proves less than claim 23 states. It always
spawns `rls-probes.mjs --anon`, so removing the auth-mode preflight left all
six cases green in a disposable source copy. Its `{}` and null cases fail on
`disable_signup` before reaching `mailer_autoconfirm`; removing only the
`mailer_autoconfirm` boolean guard and reason likewise left all six cases
green. Both countercontrols returned process 0 with every case "as pinned".
Thus "in both modes" and either non-boolean flag are currently true in source,
but the artifact cited for PASS is not mutation-sensitive to either claim.

Claim 22 itself is cleared at its stated boundary. `auth-probes.txt` records
two signups with `session=yes` followed by 46 authenticated PASS results, and
the target stops at exit 3 before authenticated probes when it cannot obtain
both sessions. Supabase's current official configuration documentation says
that with [Confirm Email enabled, users must confirm before signing in for
the first time](https://supabase.com/docs/guides/auth/general-configuration).
The resulting inference is correctly labelled, bounded to that run, and says
nothing about current toggle state. Finding 2 concerns the new producer seam
and over-broad claim-23 control, not the old HTTP-0 line.

### 3. The fix-cycle touch-set total is inaccurate

The top HANDOFF block says `20 files, +1516/-144`. Fresh
`git diff --numstat f994f8d..1a090ba` totals 20 files, +1523/-144, matching
the dispatch. The file list and protected-path boundary are otherwise
correct. This seven-insertion discrepancy is an evidence-accuracy failure,
not a scope violation, and does not drive the verdict.

## REVIEW-015 disposition

| Prior item | Re-review status | Evidence boundary |
| --- | --- | --- |
| F1 — false greens inside named classes | **not cleared** | The reported old neighbors now reject, the 55 controls pass, and the label sets match; the apply-valid `[1][2]` RLS neighbor still returns 91/91. Finding 1. |
| F2 — failed auth-settings measurement/probe preflight | **partly corrected, not cleared** | The source now fails unusable settings at exit 4 in both modes and claim 22 correctly moves off the HTTP-0 line. The uncontained positive-control seam can skip all anon probes at exit 0, and the cited control does not prove both modes/both boolean fields. Finding 2. |
| F3 — evidence-history prose | **excluded by controller ruling** | Not reviewed as an open builder finding and not re-litigated. |
| REVIEW-013 F4 — historical LOCK denial label | **excluded by controller ruling** | Superseding close-out note remains controller-owned. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
| --- | --- | --- |
| Exact refs, ancestry, and sequence | PASS | Fresh fetch; both supplied objects are commits; remote/local refs equal the supplied SHAs; base is an ancestor; fifteen linear commits. |
| Full range and fix-cycle delta | PASS, with finding 3 on HANDOFF prose | Full: 49 files, +9103/-12. Fix cycle 4: 20 files, +1523/-144. |
| Protected and immutable boundaries | PASS | Empty fix-cycle diff for migrations, generated types, ADRs, prior reviews, `roles-acl.*`, and all three live transcripts. HANDOFF is top-inserted; LOCK remains REVIEW. |
| Actual migration/RLS source | PASS on direct inspection | Applied bytes are unchanged and retain the intended authenticated owner predicates, UPDATE USING+WITH CHECK pairs, private bucket row, and single `[1]` storage folder lookup. No applied bypass found. |
| Exact-target 004a baseline | PASS | [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt): 91 PASS, zero FAIL, zero parse failures, process 0. |
| Reported-neighbor controls | PASS at their enumerated boundary | [`assertions-negative-control.txt`](../05-quality/evidence/004a-schema-rls/assertions-negative-control.txt): 55 scenarios, 55 class tags, 55 exit-1/named-FAIL results, twelve matching unique class labels. |
| Genuine named-class discrimination | FAIL introduced by Unit C; retained | Apply-valid RLS neighbor returns process 0 and 91/91. Finding 1. |
| Class-list derivation | PASS as unique-label set equality; FAIL as support for the semantic class claim | Current two-way set comparison is reproducible. It cannot establish all named properties within a broad tag and erases duplicates. Finding 1. |
| 004a stability | PASS | [`stability.txt`](../05-quality/evidence/004a-schema-rls/stability.txt) and fresh run: six gated artifacts x two captures; 12 identical; differing 0; process 0. |
| Current settings red-path source | PASS on direct inspection | [`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs) validates status/body/both flags and invokes exit-4 preflight before probes in both modes. |
| Six committed settings cases | PASS at their exact bounded inputs | [`settings-preflight-control.txt`](../05-quality/evidence/004b-schema-rls-live/settings-preflight-control.txt): five aborts, one accepted positive, six as pinned, zero violations, process 0. |
| Claim-23 both-mode/both-flag proof and live-run containment | FAIL introduced by fix cycle 4 | Auth-call and mailer-guard removal countercontrols stay green; inherited positive-control flag can make the live anon producer exit 0 with zero probes. Finding 2. |
| Claim 22 run-time toggle inference | PASS at the stated behavioral boundary | [`auth-probes.txt`](../05-quality/evidence/004b-schema-rls-live/auth-probes.txt): two `session=yes` signups and 46 authenticated PASS; HTTP-0 settings line explicitly rejected as evidence; present state not claimed. |
| Live transcript bytes/bindings | PASS for unchanged-byte integrity; live behavior NOT RUN this cycle | Fresh hashes match both [`redaction-gate.txt`](../05-quality/evidence/004b-schema-rls-live/redaction-gate.txt) GREEN bindings: [`anon-probes.txt`](../05-quality/evidence/004b-schema-rls-live/anon-probes.txt) `9ba3c2b58ac469d8bd8827bceb6dbf7821fbb7bade3a0f97ede2d2a41d0d643f`, 11 PASS; [`auth-probes.txt`](../05-quality/evidence/004b-schema-rls-live/auth-probes.txt) `059edefac0eb3edbe2e2dd4d8b495973c8d55251cb1281edae8ebcc5d3ff0e34`, 46 PASS; zero FAIL. No transcript regenerated. |
| 004b offline stability | PASS | [`stability.txt`](../05-quality/evidence/004b-schema-rls-live/stability.txt) and fresh loopback-only run: six gated artifacts x two captures; 12 identical; differing 0; process 0. |
| Four non-install repository gates | PASS from both fresh stability captures | [`004a gates.txt`](../05-quality/evidence/004a-schema-rls/gates.txt) and [`004b gates.txt`](../05-quality/evidence/004b-schema-rls-live/gates.txt) reproduced typecheck, lint, Jest, and format-check exit-0 bytes. The authorized `.temp` normalization is accepted. |
| Secret-shape scans | PASS | Both positive-controlled full-index scans, [`004a secret-scan.txt`](../05-quality/evidence/004a-schema-rls/secret-scan.txt) and [`004b secret-scan.txt`](../05-quality/evidence/004b-schema-rls-live/secret-scan.txt), reproduced committed bytes. No credential value was read or printed. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta; committed captures prove the no-dependency-delta premise. |
| Branch CI | NOT RUN | Fresh GitHub queries returned zero pull requests for the branch and zero workflow runs at the target SHA. |
| Owner apply/types generation, ACL probe, live auth run, current toggle, and cleanup | NOT RUN by reviewer | Owner/builder actions remain bounded to existing artifacts and controller records. Dispatch prohibited a fresh live run this cycle. |
| `supabase db lint` / local stack | NOT RUN | Requires Docker/local database; unchanged boundary and outside this focused cycle. |
| Transcript trailer and redaction-control exit divergences | PASS as authorized disclosure | Source/artifact differences are exactly the two controller-authorized divergences; live transcripts remain explicitly pre-fix. |
| 004a nonzero gate machinery | NOT RUN / accepted backlog | Controller explicitly kept the pre-existing fail-open gate-machinery chore outside this two-item fix cycle. |
| Delta whitespace | PASS | Full-range and fix-cycle `git diff --check` returned 0 without diagnostics. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deploy, or outward-facing action occurred. |

## Standards

Standards: **three findings; worst severity medium.** Finding 1 breaches the
AGENTS.md artifact/PASS rule: the named RLS guarantee has an apply-valid
surviving mutant. Finding 2 breaches the same rule and fail-closed intent:
a test-only success exit is reachable from the live producer and the cited
control is not sensitive to two parts of its claim. Finding 3 is a literal
verification-record mismatch. Protected paths, review immutability, LOCK
status, write scope, and whitespace otherwise conform.

Judgement-call smells: **Mysterious Name** in `onlyKeys`, which sounds like
equality but implements only "no unexpected keys" and is not applied
recursively to the surviving node; **Speculative Generality** in embedding an
unguarded test-only exit inside the live producer. No other scoped baseline
smell materially appears.

## Spec

Spec: **two findings; worst severity medium.** First, the dispatch makes a
surviving in-class neighbor driving; finding 1 changes the expressly claimed
RLS predicate shape and remains green. Second, B's current source does add
exit 4 before probes and claim 22 is now bounded correctly, but the permanent
artifact does not establish both modes or both flag validators, and the new
hook lets the real anon producer green with no probes. The two controller-
excluded prior findings, authorized normalization/divergences, protected
paths, and exact two-file reviewer write scope match the dispatch.

Standards: 3 findings, worst medium. Spec: 2 findings, worst medium.

## Carried and adjacent items

The applied migrations, unchanged live responses, role/ACL grid, and
REVIEW-014 authorization conclusion remain sound at their measured
boundaries. Claim 22's behavioral inference is cleared; no present toggle
value is asserted. The controller-authorized normalization, transcript
divergences, and backlogged 004a gate behavior are not findings here.
REVIEW-015 finding 3 and REVIEW-013 finding 4 remain excluded and controller-
owned. No out-of-class neighbor is used to drive this verdict.

Findings 1 and 2 prevent PASS. The LOCK remains
`Status: REVIEW — fix cycle 4 complete, awaiting re-review`; MERGED is
controller-only.
