# REVIEW-002: REVIEW-001 fix-loop re-review

**Date:** 2026-08-18
**Reviewer:** Codex (reviewer of record)
**Target:** `chore/agents-md-formatting` at
`71630bba856975e4cf305e7476b4b38c404af82a`, delta from
`6501b2d7761a0c64f83aa7e26d0a972f9e8691b9`
**Verdict:** PASS

> Immutable. Once committed, do not edit. A later re-review is a new record.

## Scope

Reviewed only the single fix commit `6501b2d...71630bb` and the two additional
content verifications directed by the controller. I independently inspected the
Git-object diff, commit ancestry, changed-path list, final `AGENTS.md` blob, and
the relevant `HANDOFF.md` blocks. The committed 001c evidence was compared with
fresh results; it was not treated as proof by assertion.

I did **not** re-examine the scaffold commit `fdbc384`, the formatting commit
`f25631c`, or any matter already settled in REVIEW-001 except findings 1 and 2
and the specifically directed verifications. I did not reassess the payment
wording, which is owner-approved; I verified only its exact presence and
placement. I did not inspect application behavior, external systems,
credentials, ignored or untracked files, or unreachable Git objects. I did not
merge or fix the reviewed commit.

Accepted deviation, not a finding: REVIEW-001 finding 3 (`README.md`) was
overruled because dispatch 001 explicitly allowed the owner-approved file.
`README.md` is unchanged in this fix range.

## Findings

No new findings.

| # | Severity | File:line | Finding | Status |
|---|---|---|---|---|
| REVIEW-001 #1 | high | `AGENTS.md:26` at `71630bb` | **Resolved.** The final blob adds the owner-approved payment/purchase/entitlement/billing-webhook RED-lane entry immediately after the auth/RLS entry, closing the prior policy gap. | fixed |
| REVIEW-001 #2 | medium | `docs/01-state/HANDOFF.md:160` at `71630bb` | **Resolved.** The scaffold heading is restored, and the complete scaffold block byte-matches its `fdbc384` source while the newer records remain above it. | fixed |

## Evidence

| Check | Classification | Reviewer evidence |
|---|---|---|
| Commit identity and ancestry | PASS | `71630bb` has `6501b2d` as its sole parent and merge-base; `git show --check 71630bb` passed. |
| `AGENTS.md` fingerprint | PASS | Fresh `git show 71630bb:AGENTS.md` measured 5,378 bytes and sha256 `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`, matching the committed [fingerprint artifact](../05-quality/evidence/001c-fixes/agents-md-fingerprint.txt). |
| `AGENTS.md` delta and placement | PASS | Fresh parent-to-head `git diff` returned numstat `1 0 AGENTS.md` and exactly one added line: `Changing payment, purchase, entitlement, or billing-webhook logic`. In the final blob it is line 26, immediately after the auth/RLS line at 25. The fresh diff byte-matches the committed [diff artifact](../05-quality/evidence/001c-fixes/agents-md-diff.txt). |
| Scaffold HANDOFF preservation | PASS | Fresh extraction from `## 2026-08-17 — main (scaffold)` through EOF is byte-identical between `fdbc384` and `71630bb`; both slices hash to `afe82af9b310e769710acbc7e198087d996bdb24d66c20ca59c0c844a8248002`. This independently confirms the empty [restoration-diff artifact](../05-quality/evidence/001c-fixes/handoff-restore-diff.txt). |
| Newer HANDOFF records | PASS | At `71630bb`, the fix-loop block begins at line 11, the pre-existing formatting block at line 69, and the scaffold block at line 160. The pre-existing formatting block byte-matches `6501b2d` with sha256 `6ee0ac8f8cc13d76dc8591bd257d7738659194f786b9eb87509da74d488fde77`. |
| 001c scope boundary | PASS | Fresh `git diff --name-only 6501b2d...71630bb` returned only `AGENTS.md`, `HANDOFF.md`, `BRANCH-NOTES.md`, `PROJECT-STATE.md`, and three files under [001c-fixes](../05-quality/evidence/001c-fixes/). The `PROJECT-STATE.md` diff changes only the Active work row; `BRANCH-NOTES.md` changes only the formatting branch's dispatch/evidence and closing note. No unexpected path was returned. |
| REVIEW-001 finding 1 | PASS | Resolved by the verified `AGENTS.md` insertion and placement above. |
| REVIEW-001 finding 2 | PASS | Resolved by the verified HANDOFF restoration and preservation above. |

## Standards

No standards finding in the reviewed fix delta. The change restores alignment
between the RED-lane rulebook and the already-reviewed governance decision, and
the HANDOFF repair restores the append-above/immutable-old-block structure.

## Spec

No specification finding in the reviewed fix delta. Both requested remediations
are complete, and the delta stays within the controller-approved 001c set.

Standards: 0 new findings. Spec: 0 new findings.

## Carried items

None. The README deviation is accepted, not an open issue.
