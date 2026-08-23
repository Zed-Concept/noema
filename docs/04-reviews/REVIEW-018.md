# REVIEW-018: Unit C — Schema and RLS v1 fix-cycle-6 re-review

**Date:** 2026-08-23
**Reviewer:** Codex Sol (reviewer of record, ultra effort, fresh session)
**Base:** `64c1ce603491fb2cb6e8b7b948a369731a436c7f`
**Target:** `feat/schema-rls-v1` at
`c135eeb7f14de0b329c90665f031abefee2ce771`
**Prior records:** REVIEW-011, REVIEW-012, REVIEW-013, REVIEW-015,
REVIEW-016, REVIEW-017 (FAIL); REVIEW-014 (advisory, SOUND, non-gating)
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Per `AGENTS.md`, I read the current project state, authoritative LOCK, and
repository rules before substantive review, then fetched origin and pinned
the dispatched objects. Freshly fetched local/remote `main` equal the supplied
base. Local HEAD and `origin/feat/schema-rls-v1` equal the target. The target
has the sole parent `3129ddb43cdb6448fe187a881ff60fc14edd7c49`; both that
parent and the base are ancestors. The starting tree was clean. The full range
is nineteen linear commits, 51 files, +11330/-12. Fix cycle 6 is one commit:
10 files, +398/-183 including its 227-line HANDOFF insertion, or exactly the
reported 9 files, +171/-183 without HANDOFF. The full and fix-cycle ranges
both pass `git diff --check`.

The fix-cycle diff is empty for all four applied migrations,
`src/lib/database.types.ts`, ADRs, prior REVIEW records, `roles-acl.*`, and
the three protected live transcripts (`anon-probes.txt`, `auth-probes.txt`,
and `redaction-gate.txt`). Prior HANDOFF bytes are preserved below one new
top block. The only BRANCH-NOTES edit is the fix-cycle suffix; the status
remains REVIEW.

I audited the complete fix-cycle diff and the relevant current producers,
not only the builder summaries. Two fresh 004a captures, each using the
exact-pinned `libpg-query@17.7.4` and `supabase@2.115.0`, reproduced all six
gated artifacts byte-for-byte against the target and against each other. The
baseline was 91/91, and all 72 permanent neighbors exited 1 with their named
FAIL; eleven claimed and demonstrated class labels matched in both directions.

The dispatched prohibition on invoking `live-probes.sh` “in any form” was
honored. I did not execute `settings-control.mjs`, the 004b capture or
stability scripts, or any live producer. I did not query Supabase, read a
credential or `.env`, create a user, inspect or change auth state, apply a
migration, regenerate types, push, open a PR, merge, or deploy. Static syntax
checks only returned 0 for `settings-control.mjs`, `live-probes.sh`, and the
004b `capture.sh`.

The controller-disclosed dispatch conflict is accepted. Leaving the
fix-cycle-5 settings transcript untouched, marking its current producer
divergence, and classifying 004b stability NOT RUN are not builder
non-compliance. The Opus 5 / `max` substitution and cosmetic Fable 5 trailer
are accepted. The 004a nonzero-gate chore remains backlogged. REVIEW-015
finding 3 and REVIEW-013 finding 4 remain excluded and controller-owned.

**Disclosure (ruling 6):** the `noema-governance-review` fixed-range method
and one `standards-spec-review` workflow ran. Five read-only subagents covered
scope/integrity, F1/oracle coverage, F2–F4 claims, and the separate Standards
and Spec axes. No subagent edited the repository. The main lane independently
owned the Git preflight, complete diff inspection, two 004a captures, 004b
static inspection, findings, and both authorized records.

## Findings

| # | Severity | Classification | Verdict-driving | Finding |
| --- | --- | --- | --- | --- |
| 1 | medium | FAIL introduced by Unit C and retained after fix cycle 6 | yes | `Entity inventory` still claims function-name discrimination without a committed scenario that demonstrates it; the class-label guard cannot establish an individual property. Under subtraction-only, remove that property from the pinned boundary rather than add a scenario. |
| 2 | medium | FAIL introduced by fix cycle 5 and retained/reasserted after fix cycle 6 | yes | Claim 25 says the containment refusal precedes every credential/`.env` read, every write, and network contact, but its oracle observes only exit, a refusal substring, and absent-or-empty final output-directory state. It can green after an empty-directory write and does not instrument the other temporal claims. |
| 3 | low | FAIL retained or rendered inaccurate after fix cycle 6 | no | F4's prose subtraction is incomplete in current producer/README text: withdrawn oracle and all-class-audit language, a false no-test-hook comment, and “every case”/gated classifications still contradict the narrowed record. |
| 4 | low | FAIL introduced by fix cycle 6 HANDOFF prose | no | The HANDOFF verification row reports 7 files, +169/-181, contradicting its own correct earlier disclosure and the exact 9-file, +171/-183 non-HANDOFF delta. |

### 1. `Entity inventory` still contains an unproved property

The mechanical Functions-class subtraction is honest. Exactly eight
Functions-tagged scenarios were removed, all 72 non-Functions scenarios are
unchanged, the class sets moved 12 to 11 and still match, and
`verify-migrations.mjs` plus `sql-assertions.txt` are byte-unchanged. The known
two-`AS`-item neighbor is therefore no longer inside a claimed Functions
class. Those are real corrections.

The surviving 004a boundary nevertheless says a parse-valid neighbor is
rejected when it changes a property in an enumerated class, and lists under
`Entity inventory` “exactly three tables, two functions, three triggers by
name.” Its permanent artifact has only two Entity-inventory scenarios: a
`LIKE` table element and a trigger rename. The fail-closed derivation compares
the set of class tags; it does not bind the individual properties named
inside a class. Consequently either scenario is enough to admit the entire
Entity-inventory paragraph, including function names.

Direct source inspection shows an exact two-name comparison, and the fresh
91/91 baseline proves the committed names currently satisfy it. That supports
the implementation but does not supply the committed negative artifact the
PASS boundary claims. REVIEW-015 already established that one scenario per
broad class does not prove every property listed for that class, and
`AGENTS.md` does not permit fresh reviewer reasoning to replace the required
artifact.

Under the binding stop rule, the remedy is subtraction: remove function-count
and function-name discrimination from the Entity-inventory pinned boundary
and dependent “no extra functions” claim. The committed function names may
remain as a direct-inspection fact. No new scenario, class, instrument, or
oracle capability is required or authorized.

### 2. Claim 25 outruns the containment oracle

The current wrapper source places its inherited-control-variable guard before
credential/`.env` reads, scratch/output work, and network work. No current
fall-through was found by source inspection. The permanent oracle, however,
does not establish that temporal boundary.

For each refusal case, `settings-control.mjs` computes:

```js
const wroteNothing = !existsSync(outdir) || readdirSync(outdir).length === 0;
const fileOk = w.expectFile ? existsSync(join(outdir, w.expectFile)) : wroteNothing;
const ok = code === w.expectExit && refused === w.expectRefusal && fileOk;
```

Its preceding comment says the handed directory “must not even exist,” but an
existing empty directory passes. A regression that creates the output
directory before refusing, or creates and removes an entry, can therefore
green. The control also has no observation of `.env`/credential reads or
network ordering; its safe loopback environment limits consequences but is
not an oracle for those negative events.

The fix-cycle-5 artifact does prove, for the three measured variable/mode
pairs, exit 5, the refusal message, and no final output entries; the clean
positive also completed. It does not prove claim 25's broader “precedes every
read/write/network contact” PASS. This is an evidence-oracle defect, not a
demonstrated live bypass.

The subtraction-only remedy is to retain the measured exit/refusal/no-output-
file facts and narrow the temporal statements to source inspection or NOT
RUN. Adding instrumentation is neither necessary nor authorized.

### 3. F4's prose correction is incomplete

The intentionally stale `settings-preflight-control.txt` is adequately
quarantined by claims 15 and 26; its old header/trailer are not a separate
finding. Current source and current README text still contain contradictions:

- `verify-migrations.mjs` lines 8–17 retain the disproved “rejected exactly
  when it changes a property some assertion names” contract, while lines
  41–44 still say every named class was audited. The current README says the
  former was withdrawn and no all-class audit is claimed.
- `rls-probes.mjs` line 290 says no test hook lives below that line, while the
  retained `REDACTION_CONTROL_LEAK` hook is immediately below in `anonMode()`.
- `settings-control.mjs`'s generated header and the 004b README artifact row
  say every case runs with no control variable set, while section 2
  deliberately sets one in three cases.
- The 004b `capture.sh` header still calls all six artifacts byte-stable at
  the committed head, and the README's generic gated definition says the
  same, although the specific row and claims 15/26 correctly say one artifact
  is stale and will not reproduce at this head.

These are present-tense producer/README statements, not immutable historical
HANDOFF prose. Comment and classification subtraction is sufficient; no
instrument extension is needed. The controller must adjudicate the tension
between correcting the verifier comments and the cycle's “oracle itself
byte-untouched” implementation choice.

### 4. The HANDOFF has a contradictory exact delta

The new HANDOFF correctly states near its start that the non-HANDOFF delta is
9 files, +171/-183. Its later PASS row instead says 7 files, +169/-181. The
smaller figure covers only the seven evidence files and omits the one-line
BRANCH-NOTES and PROJECT-STATE changes. Exact Git measurement is 10 files,
+398/-183 including the 227-line HANDOFF insertion. This is evidence-record
accuracy only and does not hide a protected-path edit, so it is not
independently verdict-driving.

## REVIEW-017 disposition

| Prior item | Re-review status | Evidence boundary |
| --- | --- | --- |
| F1 — Functions false green | **cleared at the claimed-class boundary** | Functions and its eight scenarios are removed; 11 claimed/demonstrated labels match; baseline remains 91/91. Finding 1 is the separately disclosed Entity-inventory property gap. |
| F2 — control accepted FAIL probes | **cleared in source; stronger result NOT RUN** | Predicate is strictly `probeLines === 0`; source parses. The old artifact supports only zero probe PASS and claim 23 stops there. |
| F3 — incomplete all-variable/all-mode matrix | **cleared by narrowing** | Claim 25 names exactly three measured pairs and the unexercised fourth pair; it no longer quantifies over all four. Finding 2 concerns a different temporal overclaim. |
| F4 — five prose overstatements | **not fully cleared** | Operative README claims are materially narrower, but current producer/README contradictions remain. Finding 3. |

## Evidence and classifications

| Check | Classification | Reviewer evidence |
| --- | --- | --- |
| Exact refs, ancestry, and sequence | PASS | Fresh fetch; local/remote main equal base; local/remote feature tip equal target; sole parent `3129ddb`; nineteen linear commits; clean start. |
| Full range and fix-cycle delta | PASS by Git / HANDOFF row FAIL introduced | Full: 51 files, +11330/-12. Cycle: 10 files, +398/-183, or 9 files, +171/-183 without HANDOFF. Finding 4. |
| Protected/immutable paths | PASS | Empty cycle diff for migrations, generated types, ADRs, prior reviews, `roles-acl.*`, and all three protected live transcripts; prior HANDOFF bytes preserved; LOCK remains REVIEW. |
| Functions removal, both directions | PASS | Exactly eight Functions scenarios removed; 72 remaining; 11 claimed = 11 demonstrated; no duplicate, missing, or extra label. |
| 004a baseline | PASS | Two fresh exact-target captures: 91 assertions, 91 PASS, zero FAIL, zero parse failures, exit 0; SHA-256 `4760a72c…f691275`. |
| 004a permanent battery | PASS at the scenarios/classes it runs | Two fresh captures: 72 exit-1/named-FAIL scenarios; groups 4/2/1/4/12/6/20/23; class lists identical. Finding 1 limits the unsupported property inside Entity inventory. |
| 004a byte-stability and four repo gates | PASS | Six gated artifacts x two fresh captures, twelve identical and zero differing; typecheck, lint, Jest, and format-check each exit 0 in both reproduced `gates.txt` files. |
| F2 producer narrowing | PASS by source inspection | Negative predicate is `aborted && probeLines === 0`; `probe()` emits one matching PASS/FAIL line per probe; `node --check` exit 0. |
| F2 stronger zero-any-probe result | NOT RUN — dispatch prohibits invoking `live-probes.sh` in any form | Producer changed; no fresh artifact. Claim 23 correctly does not promote it. |
| Claim 23 narrowed old-artifact boundary | PASS | Fix-cycle-5 transcript records 18 exit-4 negatives with exact reasons and zero probe PASS, plus two continuations. |
| F3 three measured pairs and clean positive | PASS | Stale-but-disclosed artifact records the three named refusals and clean positive; current claim names exactly those. |
| F3 fourth variable/mode pair | NOT RUN — narrowed instead | `SETTINGS_PREFLIGHT_CONTROL` under `--control` is explicitly unexercised. |
| Claim 25 temporal read/write/network boundary | FAIL introduced by fix cycle 5 and retained | Oracle accepts absent-or-empty final outdir and instruments no credential/`.env` read or network ordering. Finding 2. |
| `settings-preflight-control.txt` matches current producer | FAIL introduced by fix cycle 6, disclosed | Transcript predates the narrowed producer and corrected output text; claim 26 states the divergence. |
| 004b byte-stability at this head | NOT RUN — prohibited producer path | Claims 15/26 correctly supersede the committed fix-cycle-5 stability result. |
| F4 current prose | FAIL retained/rendered inaccurate | Finding 3. The stale transcript itself is accepted as quarantined historical bytes. |
| Live transcripts and GREEN bindings | PASS for repository byte integrity only | Protected bytes unchanged. Anon SHA-256 `9ba3c2…d643f`; auth `059edef…0e34`; binding transcript unchanged. No live semantics were re-run. |
| Fix-cycle-5 unauthorized live run | Repository facts PASS / external-effect testimony UNVERIFIABLE FROM THE REPOSITORY | Transcripts/bindings unchanged, no derived artifact, guard present; deleted `/tmp` output and reported external effects were not re-measured. |
| Live producers, staging, credentials | NOT RUN — prohibited by dispatch | No project query, signup, namespace, toggle, wrapper invocation, credential read, or `.env` read. |
| `npm ci` | NOT RUN with reason | No package or lockfile delta. Exact-pinned scratch dependencies were installed only for the static 004a captures. |
| Branch CI | NOT RUN | No PR or push was authorized. |
| `supabase db lint` / local stack | NOT RUN | Docker/database boundary unchanged. |
| 004a nonzero-gate chore | NOT RUN — controller-backlogged | Deliberately not widened. |
| REVIEW-015 F3 / REVIEW-013 F4 | NOT RUN — excluded and controller-owned | Not reopened. |

## Standards

- **Hard, medium:** claim 25 is not artifact-backed at its temporal boundary.
  The control observes exit/refusal/final output state, not every read, write,
  or network event.
- **Hard, medium:** Entity inventory admits unproved function-name
  discrimination through a class-level tag, contrary to the artifact-backed
  PASS rule.
- **Hard, low:** current documentation contains the wrong HANDOFF delta and
  surviving “every case”/neighbor-class wording that exceeds the record.
- **Judgment-call smell — Duplicated Code:** the control-variable manifest is
  manually duplicated in `settings-control.mjs` and `live-probes.sh`. It has
  not drifted in this cycle.

## Spec

- **Medium:** the unit's temporal claim 25 still exceeds the instrument;
  subtraction to exit/refusal/no-output-file facts is required.
- **Medium:** the specifically disclosed `Entity inventory` function-name
  property is not artifact-backed; it requires subtraction now, not backlog.
- **Low:** the dispatched withdrawal of the exact-when contract and all-class
  audit is incomplete in the current verifier source.
- **Low:** the HANDOFF's later fix-cycle count is wrong.

No scope creep was found. Protected paths, F1's mechanical tag/list removal,
F2's narrowed/NOT RUN treatment, F3's three-pair quantifier, and the
producer/artifact divergence disclosure otherwise match the dispatch.

Standards: 3 hard findings, worst medium, plus one judgment-call smell. Spec:
4 findings, worst medium.

## Conclusion

The Functions subtraction, F2 narrowing, F3 quantifier, protected scope, and
stale-artifact disclosures are materially honest. Findings 1 and 2 still
prevent PASS because individual PASS claims exceed their committed
instruments. Under the binding stop rule, both remedies are subtraction or
strict narrowing, not added capability. The LOCK remains
`Status: REVIEW — fix cycle 6 complete, awaiting re-review`; MERGED remains
controller-only.
