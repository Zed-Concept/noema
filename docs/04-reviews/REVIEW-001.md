# REVIEW-001: governance scaffold and AGENTS.md formatting restoration

**Date:** 2026-08-17
**Reviewer:** Codex (reviewer of record)
**Target:** `fdbc38409b8657b671cca5453ce5d3e150dc1cba` and `f25631c96023bad0f3d8047862dd05a4c203d33d`
**Verdict:** FAIL

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed the complete root tree introduced by `fdbc384` and the complete
`fdbc384...f25631c` delta as one unit. I compared the final tree with the local
`project-governance` skill (`SKILL.md` sha256
`8690e95b5897722e0275d147a84bccc30704bc9ce01c8b2229fa88392c655af3`), its
templates, `AGENTS.md`, the two ADRs, both LOCK blocks, both HANDOFF bodies, and
the committed evidence. I independently reran the committed normalization and
structure scripts and performed fresh path and secret-pattern sweeps against
both commit trees.

The controller-accepted deviations were noted and not flagged: omitted
`docs/06-content/`; independently authored `ARCHITECTURE.md` and `OPERATIONS.md`
with `TODO(owner)` markers; and the retained unfilled `ADR-NNN-template.md`
alongside ADR-001 and ADR-002.

I did **not** verify the owner-approved source beyond the supplied sha256,
visually render Markdown, query GitHub or Linear, inspect ignored/untracked
working-tree files or unreachable Git objects, test application behavior (there
is no application), or access any environment, credential, or production
system. Repository privacy was outside this review.

## Findings

| # | Severity | File:line | Finding | Status |
|---|---|---|---|---|
| 1 | high | `AGENTS.md:23`; `docs/03-decisions/ADR-001-operating-model.md:75` | ADR-001 says payment work is already RED lane and therefore needs explicit approval, but the rulebook only names the narrower RevenueCat configuration action. A non-RevenueCat payment change can therefore follow `AGENTS.md` without the approval ADR-001 says is mandatory. This also conflicts with the governance skill's rule that anything touching money starts in RED lane. | open |
| 2 | medium | `docs/01-state/HANDOFF.md:7`; `docs/01-state/HANDOFF.md:100` | `f25631c` replaced the prior `## 2026-08-17 — main (scaffold)` heading instead of appending a complete new block above it. The scaffold body now begins unheaded at line 102, so only one well-formed HANDOFF record remains and the commit edited an old block despite the file's “Never edit an old one” rule. | open |
| 3 | low | `README.md:1` | `README.md` is an extra top-level document outside the skill scaffold. The skill says not to invent extra top-level docs, and README is not one of the controller-accepted deviations. | open |

## Evidence

| Check | Classification | Reviewer evidence |
|---|---|---|
| Commit identity and ancestry | PASS | `fdbc384` is a root commit; `f25631c` has `fdbc384` as its sole parent. `git show --check` passed for both. |
| Scaffold tree | FAIL introduced by this work (`fdbc384`) | All required numbered paths exist; the ADR and REVIEW templates are byte-identical to the skill templates; accepted deviations are as scoped. The additional README produces finding 3. See [scaffold inventory](../05-quality/evidence/001-scaffold/git-ls-files.txt). |
| Branch `AGENTS.md` fingerprint | PASS | Fresh `shasum -a 256 AGENTS.md` returned `1028ac153298d361c434c7963a78f0dc49de1d0212f42171104e02793d678295`; size is 5310 bytes, with 10 ATX headings and 10 lines containing `|`. This independently confirms the committed [fingerprint artifact](../05-quality/evidence/001b-agents-md/fingerprint.txt). |
| Wording unchanged | PASS | Reran committed [normalize.py](../05-quality/evidence/001b-agents-md/normalize.py) against `fdbc384:AGENTS.md` and the branch file: 713 words before, 713 after, empty `diff`. This independently confirms [wording-diff.txt](../05-quality/evidence/001b-agents-md/wording-diff.txt). |
| Markdown structure | PASS | Reran committed [structcheck.py](../05-quality/evidence/001b-agents-md/structcheck.py): target exits 0 with 10 headings, a valid two-column table, an indented lock block, and zero tabs; the scaffold version exits 1 and reproduces the old defect. See [structure-check.txt](../05-quality/evidence/001b-agents-md/structure-check.txt). Visual rendering was NOT RUN. |
| Application code, dependencies, and CI | PASS | Fresh `git ls-tree` path sweeps on both SHAs found no application-source paths, manifests, lockfiles, dependency declarations, or CI paths. The two `.py` files are bounded evidence utilities, not application code. |
| Secrets | PASS | Fresh `git grep` sweeps on both SHAs found zero files containing private-key, JWT, AWS, Google, GitHub, Anthropic, OpenAI, Supabase, Slack, Stripe, PostHog, or Sentry token patterns, and zero quoted or unquoted credential-assignment matches. A supplemental 32-plus-hex sweep matched only the expected `AGENTS.md` sha256 in `BRANCH-NOTES.md` and `fingerprint.txt`; both were adjudicated as hashes, not credentials. No builder secret-scan transcript was reused. |
| ADR consistency | FAIL introduced by this work (`fdbc384`) | Roles, reviewer flip, lock authority, auth/RLS lane, and ADR-002 align with [AGENTS.md](../../AGENTS.md); payment RED-lane coverage does not, producing finding 1. |
| LOCK and HANDOFF records | FAIL introduced by this work (`f25631c`) | Both LOCK blocks exist, name Codex, remain in REVIEW, and match the relevant branch/diff. The formatting LOCK candidly records an unresolved model discrepancy. The [HANDOFF file](../01-state/HANDOFF.md) contains both bodies, but `fdbc384...f25631c` deletes the scaffold heading, producing finding 2. |

## Standards

Three documented-standard findings: one high, one medium, one low. No code-smell
heuristic applies to this documentation-only unit. Worst standards issue:
payment work is not fully protected by the RED lane that the skill and ADR-001
say applies.

## Spec

Three spec findings: one missing/partial safety requirement (finding 1), one
implemented-but-wrong record update (finding 2), and one scope deviation
(finding 3). Worst spec issue: the rulebook and ADR disagree at the financial
authority boundary.

## Carried items

None. The three open findings are blocking this verdict and were not fixed in
review, per reviewer scope.
