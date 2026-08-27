# REVIEW-028 — Unit E session durability, subtraction correction 3c

**Date:** 2026-08-27
**Controller:** CTRL-006 Auth Phase B and session durability
**Reviewer of record:** Codex Sol / Ultra / fresh session — the dispatched
seat; the runtime harness does not expose model, reasoning-effort, or
prior-session identity metadata, so those attributes cannot be independently
confirmed
**Code target:** `feat/session-durability` correction head
`453c3c89ee04aea936e359b227b855789a1cd14d`
**Review overlay:** `5399f13d69912d6797db9b0e26a12d42b7668b5c` — controller
LOCK transition only
**Correction base:** `486e910ae79dbb5fcc30370267d7ea785a536208`
**Substantive correction head:**
`699e6f016f4208021c1c1fd069e8bf067c9c05d7`
**REVIEW-027 candidate:** `988e7ff3f4bce4767d8a0ad8dc107372b547a575`
**Review base:** `main` at `7caf23e10856601f17d52ae37ae59fbb9dbbac60`
**Verdict:** **PASS**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.

## Verdict

**PASS.** Correction 3c closes REVIEW-027 finding 1 exactly by subtraction
accounting. The 006d limit-10 itemisation now records both clauses removed from
immutable 006c — “no demand is recorded” and the web storage-key/ruling-26
clause — one entry each, with a reason, in the same form as the other
subtraction entries. The final limit-10 body is untouched from `988e7ff3`, the
HANDOFF top insert carries the same two-item account, and the correction-3b
block remains byte-identical.

The builder range changes exactly the 006d README (`+3/-0`), HANDOFF, and
`ci.txt`; it changes no source, test, assertion, producer, probe, instrument,
mechanism, or LOCK record. The required `src` tree OIDs match. Four local gates
and the exact-candidate GitHub CI pass at `453c3c89`; committed `ci.txt` is
honestly bound to the successful `699e6f01` run. Every result REVIEW-027 marked
passing still holds, including source token/emitted-JavaScript identity against
`9e90fdba`, all 18 assertions, the Known Issues 1–2 register and its four
controls, and the bounded `8b49f314` stability account.

There is no new finding. Merge is recommended with Known Issues 1–2 open as
recorded and with the adjacent items listed in the final section carried into
the controller backlog.

## Acceptance matrix

| # | Required result | REVIEW-028 result | Fresh basis |
|---|---|---|---|
| 1 | Two-item limit-10 removal account in README and HANDOFF; final body and correction-3b block unchanged | **PASS.** Both removals are separately named and explained. README changes by exactly `+3/-0`; the final body hashes identically to `988e7ff3` (`ac5a76c8…`), and the correction-3b HANDOFF block hashes identically (`4a305e34…`). | Direct Git-object diffs; isolated section hashes; HANDOFF suffix comparison. |
| 2 | `486e910a..453c3c89` touches exactly README, HANDOFF, `ci.txt`; no source/test/instrument; `699e6f01:src == 8b49f314:src` | **PASS.** Three files, `+97/-11`; README `+3/-0`. Both required `src` OIDs are `9dce1c5fcae978e2f286662f0859a6191caa0db1`. | Name/status, numstat, per-commit log, path scans, `git rev-parse`. |
| 3 | Gates 4/4 at `453c3c89`; `ci.txt` bound to `699e6f01`; BRANCH-NOTES untouched; governance clean | **PASS.** Fresh local gates all exit 0, 11/11 suites and 196/196 tests. GitHub runs `33036173449` and `33036290253` are completed/success at the exact named heads. Builder range leaves BRANCH-NOTES and every excluded path untouched. | Fresh exact-head install/gates; GitHub API; Git-object and RED-lane path scans. |
| 4 | Everything REVIEW-027 passed still holds: source identity, 18 assertions, Known Issues and controls | **PASS.** Both files remain token-/emit-identical to `9e90fdba`; 18 ordered assertions match; the complete Known-Issues register is byte-identical to `988e7ff3`; the four controls and REVIEW-027's narrowed control 1 remain exact. | TypeScript scanner/transpiler over Git objects; AST assertion extraction; register section hash and quote comparison. |

## Review boundary and preflight

- The mandated sequence ran first: `git fetch origin`; isolated checkout of
  `5399f13d`; then `git diff --stat 453c3c89..HEAD`. Only
  `docs/01-state/BRANCH-NOTES.md` appeared (`+12/-1`).
- `5399f13d` has sole parent `453c3c89`. The Unit E LOCK reads
  `Status: REVIEW`, and its transition note says “correction-3c review,
  REVIEW-028.” The LOCK line was not edited by this review.
- `AGENTS.md` is exactly 5,378 bytes with SHA-256
  `0ff02d209247dadd94f217b441732baa87ed9f182f9b734cece668b1c3f0f013`.
- The ancestry is linear across every dispatched boundary:
  `7caf23e1` → `988e7ff3` → `486e910a` → `699e6f01` → `453c3c89` →
  `5399f13d`.
- Review work ran on local branch `review/review-028` in a dedicated worktree.
  The tree was clean before the two authorised records were written.
- Three supplementary read-only subagents covered scope/tree identity,
  evidence/CI/executable identity, and subtraction text/final-record material.
  The reviewer of record independently inspected the relevant bytes, ran the
  exact-head gates, queried both CI runs, and repeated every verdict-driving
  comparison.
- The Noema governance-review procedure was used. No live Supabase endpoint,
  credential, secret, production system, device, native keychain, deployment,
  or outward-facing product action was used.

## Directed verification

| Check | Classification | Fresh result |
|---|---|---|
| Limit-10 itemisation | **PASS** | Two one-removal entries, each with its rationale; the new entry is exactly three added lines. |
| Final limit-10 body | **PASS / unchanged** | Extracted body at `988e7ff3` and `453c3c89` has SHA-256 `ac5a76c8161450a6a87ec7e35cc6c9c25879aaaa78278d0a3988a758b04288f9`. |
| Correction-3c HANDOFF | **PASS** | Top insert repeats both entries and supersedes only the old one-clause account. |
| Correction-3b HANDOFF | **PASS / unchanged** | Isolated block is byte-identical at `988e7ff3` and the candidate, SHA-256 `4a305e3447aebd28fab4fa1da2c1a55d732013cae7b8b9778839db32671c5883`. |
| Builder touch set | **PASS** | `HANDOFF.md` `+83/-0`; README `+3/-0`; `ci.txt` `+11/-11`; no fourth path. |
| Source/test/instrument exclusion | **PASS** | Zero changed source/test names and zero changed producer/probe names. All 006d instruments other than README/`ci.txt` are unchanged. |
| Required `src` identity | **PASS** | `699e6f01:src` and `8b49f314:src` both resolve to `9dce1c5f…`. |
| Exact-head local gates | **PASS** | `npm ci` 0; typecheck 0; lint 0; test 0 (11/11 suites, 196/196 tests); format check 0. |
| Substantive-head CI binding | **PASS** | Run `33036173449`, attempt 1, completed/success, exact `head_sha=699e6f01…`; Typecheck, Lint, Test, and Format check steps all success. Committed `ci.txt` matches. |
| Final-candidate CI | **PASS** | Run `33036290253`, attempt 1, completed/success, exact `head_sha=453c3c89…`; the same four steps all success. |
| Publisher source identity | **PASS** | 227/227 comment-free tokens; emitted-JS SHA-256 `5fcaf4e48d247c42e2a7f4e4b7ffe1e17b86398463d568f739674b066af14566` at both `9e90fdba` and the candidate. |
| Publisher test identity | **PASS** | 1,114/1,114 tokens; emitted-JS SHA-256 `2567a4526f68652c81fd7db5b287900aadaf9dc65b4361e98b8214229fb2cded`; 18/18 ordered assertions identical. |
| Known Issues and controls | **PASS / unchanged** | Full 006d register through the retirement rule is byte-identical to `988e7ff3` (3,957 bytes; SHA-256 `1bda6a90…`); both REVIEW-025 quotations and all four controls remain exact. |
| REVIEW-027 control-1 narrowing | **PASS / unchanged** | Provider-own-`getSession()` ordering and ADR-009 construction-load qualifier remain; “before any session load” remains absent from the register. |
| `8b49f314` stability account | **PASS at its named boundary** | Correction 3c changes only prose/records; the bound `src` tree is identical, and no producer/probe changes. REVIEW-027's measured 9/9 pair and 7/9 committed account remains the stated bounded claim. |
| Governance / RED lane | **PASS** | BRANCH-NOTES unchanged in the builder range; zero changes to Supabase, auth/RLS policy, payments, manifests, CI workflow, ADRs, prior reviews, product source, or tests. |
| Live Supabase, native File/keychain backend, physical restart/device | **NOT RUN by boundary** | Offline correction review; Unit F retains live/device verification. |

## Findings

None. Correction 3c introduces no standards, specification, evidence,
governance, executable, or assertion defect.

## Standards and spec

**Standards: PASS — zero findings.** The immutable-record boundary,
top-insert discipline, exact three-file builder scope, clean governance range,
and reviewer-only two-file output all conform to repository rules.

**Spec: PASS — zero findings.** All four dispatched acceptance conditions hold.
The correction closes only REVIEW-027's missing-subtraction account and leaves
every accepted Known Issue, control, instrument boundary, and ruling-28
subtraction intact.

## Governance and scope verification

**PASS by direct Git-object verification:**

- Builder commits are exactly `699e6f01` and `453c3c89` above controller
  transition `486e910a`. The first changes only the README `+3/-0`; the second
  changes only HANDOFF and `ci.txt`.
- `docs/01-state/BRANCH-NOTES.md` has the same blob at both builder boundaries.
  The controller overlay alone changes it.
- No builder commit changes `supabase/`, `.github/`, `app.json`, package
  manifests/lockfile, generated database types, decisions, prior reviews,
  product source, tests, or evidence producers/probes.
- No migration, RLS/authorization policy, payment path, secret, production
  query, deployment, publication, or other RED-lane/outward action occurred.
- PR #17 remained open and draft at the controller overlay; no merge, PR-state
  mutation, or deployment was performed by this review.

## Merge recommendation

**Recommend merge with Known Issues 1–2 open exactly as recorded below.** The
controller should paste the following block into PROJECT-STATE unedited.

```markdown
### Unit E — carried from REVIEW-025 (merged with the issue OPEN, ruling 28)

**KNOWN ISSUE 1 — OPEN, severity HIGH, class session exposure.** A newly
raised demand does not revoke standing `signedIn`: the pinned-client
sign-out schedule. Verbatim from REVIEW-025:

> With the real pinned auth client, a signed-in user called the provider's
> `signOut()`. Its internal near-expiry refresh was refused, which
> installed the flag and durable demand. The client then emitted both
> `TOKEN_REFRESHED(session)` and `SIGNED_OUT(null)`. The provider dropped
> both events while the signal stood, the action itself published no
> state, and the provider remained `signedIn` with a durable demand
> outstanding. There were zero unhandled rejections and no session bytes
> remained, so neither an error nor a residual explains the stale usable
> publication.

**Witness:** `known-issue-witness.txt`, KI-1 — committed, **RED, expected
RED** (the withdrawn invariant is asserted and fails exactly as the record
states: expected `signedOut`, received `signedIn`); its PRECONDITION test
proves the schedule reproduces (refused rotation, durable demand, empty
key space, action error null, zero unhandled) before the witness fails.

**KNOWN ISSUE 2 — OPEN, severity HIGH, class session exposure.** A newly
raised demand does not revoke queued `signedIn`: the barrier checks
publication input only. Verbatim from REVIEW-025:

> Independently, `publish(signedIn)` can sample both signals as false and
> enqueue React state; a real observed write can then install the flag and
> durable demand before React commits. The queued `signedIn` still
> commits, and changing the demand predicate does not cause re-evaluation.
> The barrier checks publication input, not consumer exposure or standing
> state.

**Witness:** `known-issue-witness.txt`, KI-2 in both variants (flag — a
REAL observed refused write installs the flag and durable demand through
the real observer before commit; demand — the registered predicate rises
before commit) — committed, **RED, expected RED**; each variant's
PRECONDITION test proves the signals genuinely stand and the barrier does
refuse the NEXT publication at its input.

**Compensating controls, exactly as ruling 28 names them (both issues):**

1. **Any restart purges through the bootstrap path** — the observed purge
   runs before the provider's own `getSession()` (claims 13–14; the
   restart schedules in both committed probes). ADR-009 qualifier:
   library-internal loads during client construction — the pinned client
   registers its own listener and can load and refresh a stored session
   before any provider code runs — can precede the demand consult and are
   contained by the purge that follows, never prevented.
2. **Server-side refresh-token rotation makes the residue unrefreshable** —
   the exposed session's refresh token was superseded at rotation, so it
   dies at its next refresh attempt (the ruling-25 bound, recorded in
   `reauth-demand.ts`).
3. **Unit F measures that backstop live** (registered in PROJECT-STATE
   Active work; blocked on Unit E's merge).
4. **A follow-up unit replaces gating with subscription** — publication-time
   sampling is the class defect; the fix direction is recorded here, not
   attempted this cycle (ruling 28: no further fix inside Unit E).
```

**Adjacent findings to carry into the backlog:**

1. The user-facing `signOut` action can report a refused removal without its
   own read-back; the demand machinery covers the residual only when a write
   refusal preceded it.
2. `clear()`/`remove()` trusts `exists` on deletion; a false result leaves the
   durable demand present. This fails closed but causes a redundant
   purge/re-authentication and remains accepted Known limit 6.
3. The mutation publication log measures calls entering `publish()`, not
   consumer exposure or standing state. Retain it only as a bounded mechanism
   instrument.

**Final claims summary:** Unit E establishes, only for the named offline
schedules and instruments, that purge success is determined by full key-space
read-back rather than inferred from `signOut()` behavior; a separate non-secret
re-authentication demand can survive restart, read failures remain outstanding
rather than becoming absence, bootstrap performs the observed purge before the
provider's own `getSession()`, verified fresh sign-in resolves demand only after
persistence and read-back, and the measured refused-write schedules produce
durable demand with zero unhandled rejections. It withdraws the general
no-exposure invariant, the claim that lint/types enforce a single publication
channel, and the “stable by construction across any docs-only commit” evidence
universal, retaining only current-byte enumerations, named schedules, and
named-head reproducibility. It ships with Known Issues 1–2 open at HIGH
severity: a newly raised demand does not revoke standing or already-queued
`signedIn`; restart purge, refresh-token rotation, Unit F live measurement, and
a subscription-based follow-up are the compensating controls, while live
Supabase, native File/keychain behavior, and physical-device behavior remain
NOT RUN.
