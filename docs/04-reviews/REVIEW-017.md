# REVIEW-017: Unit C — Schema and RLS v1 fix-cycle-5 re-review

**Date:** 2026-08-23
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`5cab52a30b08eee597ef3ff85dbb333b78750c45`
**Prior records:** REVIEW-011, REVIEW-012, REVIEW-013, REVIEW-015,
REVIEW-016 (FAIL); REVIEW-014 (advisory, SOUND, non-gating)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Per `AGENTS.md`, I read the current project state, authoritative LOCK, and
repository rules before substantive review. I then fetched origin and pinned
the dispatched objects. Freshly fetched `origin/main` and local `main` equal
the supplied base. `origin/feat/schema-rls-v1`, local HEAD, and the clean
checked-out branch equal the target. The target's sole parent is
`877e80d53649c2f3d3bdfe90e8eb687d93188a6f`; both that parent and the base are
ancestors of the target. The full range is seventeen linear commits, 50
files, +10584/-12. Fix cycle 5 is exactly one commit: 14 files,
+1332/-248.

The fix-cycle diff is empty for the four applied migrations,
`src/lib/database.types.ts`, ADRs, prior REVIEW records, `roles-acl.*`, and
the three protected live artifacts (`anon-probes.txt`, `auth-probes.txt`, and
`redaction-gate.txt`). The previous HANDOFF body is byte-preserved below one
new top block. The only BRANCH-NOTES change is the LOCK suffix for fix cycle
5; status remains REVIEW. The full range and fix-cycle delta both pass
`git diff --check`.

I audited the entire fix-cycle delta and the relevant complete evidence
producers, not only the three dispatched summaries. I reran the 91-assertion
baseline, regenerated the 80-scenario battery offline, reran both committed
stability suites, exercised the 24-case settings control, inspected the
unchanged live-artifact bindings, and used disposable scratch copies for
adversarial controls. The target baseline and regenerated battery match their
committed artifacts byte-for-byte. Both stability suites returned 0: each
compared six gated artifacts across two fresh captures, with 12 identical and
zero different.

No Supabase project was queried by the reviewer. I did not read a credential,
run a live producer, inspect or change live auth state, create or delete a
user, apply a migration, regenerate types, open a PR, push, merge, or deploy.
Fresh GitHub reads found no PR for the branch and no workflow run at the
target SHA. The dispatched RED-lane approval is accepted only for the stated
Unit C schema/RLS review scope; it was not used to widen this review into a
live operation.

The Opus 5 / `max` builder substitution is controller-authorized. The
harness-fixed Fable 5 trailer is the known cosmetic artifact and is not a
finding. The controller-authorized 004a `.temp` normalization and two
historical transcript divergences remain accepted. The 004a nonzero-gate
machinery chore is not widened. REVIEW-015 finding 3 and REVIEW-013 finding 4
remain excluded and controller-owned.

**Disclosure (ruling 6):** one review workflow ran:
`standards-spec-review`, with separate read-only Standards and Spec axes.
Five read-only subagents covered those axes, exact-scope/integrity, the F2
control, and an oracle-adversary lane. The oracle lane's final response was
blocked by an output filter; its scratch evidence remained available and the
main lane independently reran and owned the decisive oracle countercontrol.
No subagent edited the repository. Main-lane methods were the fixed-range
Noema governance review, offline Supabase/PostgreSQL security and evidence-
boundary inspection, and a final documentation-accuracy guard over this
record and HANDOFF.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
| --- | --- | --- | --- | --- |
| 1 | medium | FAIL introduced by Unit C and retained after fix cycle 5 | yes | The oracle still returns green for a parse-valid neighbor inside the expressly claimed Functions class. Under the binding stop rule, the remedy is removal of `Functions` from the claimed class list, not another oracle extension. |
| 2 | medium | FAIL introduced by fix cycle 5 | yes | The permanent settings-preflight control can green after failing probes have already run, so it does not prove claim 23's “before any probe runs” boundary. |
| 3 | medium | FAIL introduced by fix cycle 5 | yes | The permanent containment matrix does not exercise every control variable in both wrapper modes, despite claiming that quantified result. Direct reviewer checks support the implementation, but AGENTS.md requires an artifact for the PASS. |
| 4 | low | FAIL introduced or rendered inaccurate by fix cycle 5 | no | Several evidence records overstate their measured boundary: “no test hook,” “before anything is read,” the four-violation guard mutant, a six-case rerun description, and the all-twelve-class audit provenance. |

### 1. The Functions class still has a parse-valid false green

The exact target baseline returned process 0 with `91 assertions, 91 PASS, 0
FAIL, parse failures 0`. The 80 committed scenarios each returned 1 with the
named FAIL, and their 80 class tags derive twelve unique classes matching the
twelve README labels in both directions. REVIEW-016's `[1][2]` neighbor and
the other 24 reported group-8 neighbors now reject. Those are real
improvements.

They do not establish the stated Functions class. In a disposable copy of the
exact target migrations I split the first PL/pgSQL function definition across
two `AS` items. The original tail was:

```sql
return new;
end;
$$;
```

The countercontrol was:

```sql
return new;
$$, $$end;
$$;
```

Pinned `libpg-query@17.7.4` accepted all four files with the same 9/21/3/5
statement counts. The committed verifier returned process 0 and 91/91,
including both the exact Functions option assertion and the full-body
assertion.

The cause is direct. For each function, `verify-migrations.mjs` computes the
body with `opts.as.List.items.map(sval).join('')`. It never pins the `AS` item
list to exactly one element and therefore mistakes a second item for a
continuation of the PL/pgSQL body. The README says a parse-valid neighbor is
rejected exactly when it changes a property an assertion names, and the
Functions class names full body-text equality plus the exact option-name
sequence. Here the actual first body item is truncated and a second item
carries its tail, yet joining them conceals both changes.

This is deliberately a parser-level finding, not an applied-schema claim.
PostgreSQL's backend accepts a second `AS` item for the C-language object-file
form and otherwise rejects it; the countercontrol would not create a valid
PL/pgSQL function. See the PostgreSQL 17
[`interpret_AS_clause` implementation](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/commands/functioncmds.c#L998-L1005).
The applied migration remains the intended single-item PL/pgSQL definition,
and no runtime or authorization defect was found in it. The README's own
contract is nevertheless parse-valid discrimination over named properties,
so this surviving in-class neighbor prevents PASS.

The controller's binding stop rule now applies: remove `Functions` from the
claimed class list and let the derivation narrow honestly. This review does
not authorize another extension or remediation edit.

### 2. The no-probe control checks only for zero passing probes

The current producer is correct on direct inspection: an unusable settings
response reaches `requireUsableAuthSettings()`, records the abort, and calls
`finish(4)` before the normal anon/auth probe flows. The 20 preflight cases
exercise ten responses in each production mode; the exact committed target
returns zero violations. Auth-call removal and isolated removal of the
`mailer_autoconfirm` and `disable_signup` guards produce the reported 9, 6,
and 6 violations. The retired success-exit settings hook is absent.

The permanent oracle does not prove the stronger no-probe property. Although
`settings-control.mjs` calculates both `probePassLines` and all
`probeLines`, a negative case is accepted when it aborted and
`probePassLines === 0`; it never requires `probeLines === 0`.

In a disposable exact-target producer copy, I inserted one failing `probe()`
immediately before the preflight's `finish(4)`. Every one of the 18 negative
children then emitted a real FAIL probe before aborting. Direct child output
reported `0 PASS, 1 FAIL` and exit 4. The full 24-case harness still returned
0 with zero violations because all expected abort lines, reasons, exit codes,
and zero-PASS counts remained satisfied.

Claim 23 and `settings-preflight-control.txt` say the abort occurs before any
probe runs. A harness that accepts executed FAIL probes is a false green at
exactly that boundary. This is an evidence-oracle defect; no live producer
defect is asserted.

### 3. “Every control variable in both modes” is not artifact-backed

The wrapper guard enumerates both `REDACTION_CONTROL_LEAK` and the retired
`SETTINGS_PREFLIGHT_CONTROL`. Direct reviewer variants covered both names,
empty/zero/nonempty values, default and `--control` modes, and both names
together. Every variant returned 5 before `.env` loading, scratch/output
writes, or network fall-through, and the supplied output path remained
absent. The clean `--control` positive still completed. The source behavior is
therefore supported independently.

The permanent section-2 matrix has only these four cases: leak variable in
default mode, retired variable in default mode, leak variable in `--control`
mode, and a clean `--control` positive. It never runs the retired variable in
`--control` mode. Its final line nevertheless says the wrapper refuses every
ambient control variable in both modes, and README claim 25 assigns PASS to
that artifact.

AGENTS.md requires every PASS to have a linked artifact. Fresh reviewer
testing cannot silently replace the committed proof. The implementation may
be correct while the quantified artifact claim is still unestablished; this
evidence gap therefore prevents PASS independently of finding 2.

### 4. Evidence prose exceeds the exact measured boundary

The following inaccuracies do not establish a live bypass, but they breach
the “claims match measurements, no more and no less” rule:

- “No test hook exists in either producer at all” is false.
  `rls-probes.mjs` retains the contained synthetic
  `REDACTION_CONTROL_LEAK` hook, and `live-probes.sh --control` remains a
  producer path. The accurate result is narrower: no settings-preflight
  success hook remains, and the retained redaction hook is refused when
  ambient on a default production run.
- The wrapper says it refuses “before anything is read,” but it resolves its
  own directory and executes `git rev-parse --show-toplevel` before the
  guard. It does refuse before reading `.env` or a credential, before scratch
  or output writes, and before network contact.
- Functional deletion of the complete containment block produced three
  violations, not the claimed four. Four appears when only the
  `CONTROL_VARS` assignment is deleted: `set -u` then breaks every wrapper
  case, including the clean positive. That is a broken-script mutant, not
  proof of guard-removal sensitivity.
- The 004b rerun section still calls `settings-control.mjs` a six-case
  control after the producer became a 24-case control.
- The HANDOFF says all twelve classes were audited for the REVIEW-016 defect
  shape by measurement. The permanent group-8 artifact records 25 neighbors
  across four classes; it records neither candidate/result trails for the
  other eight nor the three AST-equivalent green probes. The 80-case battery
  and twelve-label derivation are real, but the broader all-class audit
  assertion remains unverified.

## Disclosed dispatch violation

The builder's unauthorized staging run remains **FAIL introduced by fix cycle
5**, as the controller adjudicated. It is not independently verdict-driving
in this review, and that does not convert it to PASS.

The repository-verifiable boundaries are clear:

- `anon-probes.txt` is still SHA-256
  `9ba3c2b58ac469d8bd8827bceb6dbf7821fbb7bade3a0f97ede2d2a41d0d643f`;
  `auth-probes.txt` is still
  `059edefac0eb3edbe2e2dd4d8b495973c8d55251cb1281edae8ebcc5d3ff0e34`.
  Both equal their unchanged `redaction-gate.txt` GREEN bindings and their
  parent-commit blobs.
- The evidence directories contain no `/tmp/nope`,
  `email_address_invalid`, or disclosed settings-pair fingerprint. No
  committed evidence artifact derives from the run.
- The installed guard prevents the disclosed ambient-variable fall-through
  before `.env`, output, or network work. Findings 2–4 concern proof and exact
  prose, not a surviving staging fall-through.
- `mailer_autoconfirm=false` is load-bearing nowhere in the evidence claims.
  Claim 22 remains tied to the unchanged authenticated transcript's two
  sessions and 46 authenticated PASS results, not to the incidental
  observation.

The deleted `/tmp` output is unavailable. Consequently, the reported eleven
denials, two HTTP-400 signup responses, absence of users/writes, and absence
of a toggle change are builder/controller testimony, **UNVERIFIABLE FROM THE
REPOSITORY**. I did not make a second live query to manufacture confirmation.

## REVIEW-016 disposition

| Prior item | Re-review status | Evidence boundary |
| --- | --- | --- |
| F1 — surviving named-class neighbor | **not cleared** | The reported 25 group-8 neighbors reject, but the Functions `AS`-list neighbor still returns 91/91. Finding 1. The binding remedy is class removal. |
| F2 — live-reachable settings control and partial proof | **partly corrected, not cleared** | The settings success hook is removed and the wrapper blocks ambient fall-through. The new permanent proof false-greens after FAIL probes and does not cover every variable/mode pair. Findings 2–3. |
| F3 — fix-cycle-4 numstat | **cleared** | Fresh `f994f8d..1a090ba` measurement is 20 files, +1523/-144; fix cycle 5 is 14 files, +1332/-248. |
| REVIEW-015 F3 — evidence-history prose | **excluded by controller ruling** | Not reviewed as an open builder finding. |
| REVIEW-013 F4 — historical LOCK denial label | **excluded by controller ruling** | Superseding close-out remains controller-owned. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
| --- | --- | --- |
| Exact refs, ancestry, and sequence | PASS | Fresh fetch; local/remote main equal base; local/remote feature ref and clean HEAD equal target; sole parent `877e80d`; seventeen linear commits. |
| Full range and fix-cycle delta | PASS | Full: 50 files, +10584/-12. Fix cycle 5: 14 files, +1332/-248. Fix cycle 4 correction: 20 files, +1523/-144. |
| Protected/immutable paths | PASS | Empty fix-cycle diff for migrations, generated types, ADRs, prior reviews, `roles-acl.*`, and all three protected live artifacts. Prior HANDOFF bytes preserved; LOCK remains REVIEW. |
| Actual migration/RLS source | PASS on direct inspection | Applied bytes are unchanged and retain the intended authenticated owner predicates, UPDATE USING+WITH CHECK pairs, private bucket row, and single `[1]` storage lookup. No applied bypass found. |
| Exact-target 004a baseline | PASS | [`sql-assertions.txt`](../05-quality/evidence/004a-schema-rls/sql-assertions.txt): 91 PASS, zero FAIL, zero parse failures, process 0; fresh output SHA-256 equals committed `4760a72ce18f54583a3900e3442e777b421cc2f8edc461e9696501db8f691275`. |
| Enumerated 80-scenario battery | PASS at its exact cases and label derivation | [`assertions-negative-control.txt`](../05-quality/evidence/004a-schema-rls/assertions-negative-control.txt): 80 scenarios/tags, each exit 1 with named FAIL; twelve unique labels match the README list; fresh bytes equal committed SHA-256 `4a69834efd9ec5fbe6b6fc8562e6ccf02bb804ccaa1648210fc431019ea67bba`. |
| Genuine named-class discrimination | FAIL introduced by Unit C; retained | Parse-valid Functions neighbor returns process 0 and 91/91. Finding 1. |
| Three spelling-equivalence probes | PASS as a stated parser boundary | Fresh AST comparison confirms `f(ALL x)`/`f(x)` and `CAST(x AS text)`/`x::text` are identical after source-location stripping; `pg_catalog.trigger` names the same built-in type. This does not prove the unrecorded all-class audit. |
| 004a stability | PASS | [`stability.txt`](../05-quality/evidence/004a-schema-rls/stability.txt) and fresh run: six gated artifacts x two captures; 12 identical; zero differing; process 0. |
| Current auth-settings preflight source | PASS on direct inspection | [`rls-probes.mjs`](../05-quality/evidence/004b-schema-rls-live/rls-probes.mjs) validates HTTP/body/both booleans and exits 4 before its normal probes in both modes; retired settings success hook absent. |
| 20 preflight cases | PASS at exact recorded fields; FAIL for “before any probe” proof | [`settings-preflight-control.txt`](../05-quality/evidence/004b-schema-rls-live/settings-preflight-control.txt) reproduces 18 aborts and two continuations, but ignores FAIL probe lines. Finding 2. |
| Control-variable guard source | PASS at inspected and fresh reviewer boundary | Both ambient names and tested value/mode variants return 5 before `.env`, output, or network fall-through; clean control mode completes. |
| Permanent containment matrix | PASS for its three refusals and clean positive; FAIL for every-name/both-mode claim | It omits retired `SETTINGS_PREFLIGHT_CONTROL` under `--control`. Finding 3. |
| Reported control mutations | PASS for auth/mailer/disable removals; FAIL for guard count | Fresh scratch controls reproduce 9, 6, and 6 violations. Complete guard deletion gives 3; deleting only its variable assignment gives 4 by breaking all cases. Finding 4. |
| 004b offline stability | PASS | [`stability.txt`](../05-quality/evidence/004b-schema-rls-live/stability.txt) and fresh loopback-only run: six gated artifacts x two captures; 12 identical; zero differing; process 0. |
| Four non-install repository gates | PASS from both stability captures | [`004a gates.txt`](../05-quality/evidence/004a-schema-rls/gates.txt) and [`004b gates.txt`](../05-quality/evidence/004b-schema-rls-live/gates.txt) reproduce typecheck, lint, Jest, and format-check exit-0 bytes. |
| Secret-shape scans | PASS | Both positive-controlled full-index scans reproduce committed bytes. No credential value was read or printed. |
| Live transcript bytes and bindings | PASS for unchanged-byte integrity; live behavior NOT RUN by reviewer | Fresh hashes match both [`redaction-gate.txt`](../05-quality/evidence/004b-schema-rls-live/redaction-gate.txt) GREEN bindings. No transcript was regenerated. |
| Unauthorized-run repository effects | PASS at repository boundary | Protected blobs unchanged; no evidence artifact contains the run fingerprints; incidental toggle observation supports no claim. External/deleted-output effects remain UNVERIFIABLE. |
| Unauthorized live run | FAIL introduced by fix cycle 5; controller-adjudicated non-disqualifying | Dispatch prohibition was violated. Reviewer neither repeated nor independently observed the external run. |
| `npm ci` | NOT RUN with reason | No package/lockfile delta; committed captures prove the no-dependency-delta premise. |
| Branch CI | NOT RUN | Fresh GitHub reads found no PR for the branch and no workflow run at target SHA. |
| Authorized live auth run, current toggle, user cleanup, owner apply/types, and ACL probe | NOT RUN by reviewer | Dispatch prohibited live work; existing artifacts and controller records remain the boundary. |
| `supabase db lint` / local stack | NOT RUN | Requires Docker/local database; unchanged boundary and outside this focused cycle. |
| 004a nonzero-gate machinery | NOT RUN / accepted backlog | Controller explicitly kept this pre-existing chore outside fix cycle 5. |
| Delta whitespace | PASS | Full-range and fix-cycle `git diff --check` return 0 without diagnostics. |
| Production access | NOT RUN — prohibited | No production credential, query, write, deploy, or outward-facing action occurred. |

## Standards

Standards axis: **three hard violations; worst severity medium.**

1. `settings-control.mjs` calculates all probe lines but accepts negative
   cases based only on zero PASS lines. That leaves claim 23 and its linked
   artifact unproven under AGENTS.md's evidence rule.
2. The section-2 matrix does not run the retired settings variable under
   `--control`, yet assigns PASS to every control variable in both modes.
   This is a second quantified artifact/PASS breach.
3. The “no test hook,” pre-read guard, four-violation mutant, and six-case
   rerun statements are literal evidence-record inaccuracies. The first
   three were introduced by fix cycle 5; the stale rerun text was retained
   when the control expanded.

Judgment-call smell: **Duplicated Code** in the manually repeated control-
variable manifest in `settings-control.mjs` and `live-probes.sh`, which must
be “kept in step.” It has not drifted in the target and is not a separate
finding. Review immutability, protected paths, top-only HANDOFF insertion,
LOCK status, and whitespace otherwise conform.

## Spec

Spec axis: **three findings; worst severity medium.**

1. F2 is only partial because the 24-case control can accept FAIL probes
   before its expected abort; it does not prove the dispatch's no-probe
   boundary.
2. F2's “no test hook” and “before anything is read” statements are
   inaccurate. The ambient production fall-through is blocked, but only the
   settings-preflight success hook is gone, and Git repository discovery
   precedes the guard.
3. F1's statement that every one of the twelve classes was audited by
   measurement is not fully artifact-backed. Group 8 records the 25 rejecting
   neighbors across four classes; no artifact records the candidate/results
   trail for the other eight or the three equivalent green probes.

No unasked scope widening was found. F3's corrected arithmetic is exact, the
protected-path diff is empty, and the unauthorized-run effects remain bounded
to what Git can verify versus deleted-output testimony.

Standards: 3 findings, worst medium. Spec: 3 findings, worst medium.

## Carried and adjacent items

The applied migrations, unchanged live responses, role/ACL grid, and
REVIEW-014 authorization conclusion remain sound at their measured
boundaries. Claim 22's behavioral inference remains tied only to the prior
authenticated transcript; no present toggle value is asserted. The
controller-authorized normalization, transcript divergences, and backlogged
004a gate behavior are not findings here. REVIEW-015 finding 3 and REVIEW-013
finding 4 remain excluded and controller-owned.

Findings 1–3 prevent PASS. The binding next action for finding 1 is removal
of the `Functions` class, not another extension. The LOCK remains
`Status: REVIEW — fix cycle 5 complete, awaiting re-review`; MERGED is
controller-only.
