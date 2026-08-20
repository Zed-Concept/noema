# Evidence — 004b Schema and RLS v1, Phase B (Unit C, CTRL-004): post-apply, live

Branch `feat/schema-rls-v1`, Phase B base
`7ebeb8bf59132961dab73cd5c1ee3692105cf11f` (the dispatch-named origin tip =
the Phase A head). Phase B is **post-apply by dispatch**: the owner applied
the four Phase A migrations to `noema-staging` on 2026-08-20 (ruling 10;
apply and `types:gen` transcripts are held by the controller), and this
directory proves the live behavior of the applied schema plus the
consistency of the owner-regenerated `src/lib/database.types.ts`. The
migrations are APPLIED and RED: nothing under `supabase/` has changed in
any phase or cycle of this unit.

**Fix cycle 1 (REVIEW-011, 2026-08-20)** regenerated the live evidence:
the cross-user matrix is now the full per-table per-operation grid with
the WITH CHECK isolation probe (finding 5), the redaction totality gate
now scans the exact committed transcript bytes with a committed planted-leak
positive control (finding 3), and the staging role/ACL/RLS posture is
measured by the owner-run `roles-acl.sql` probe (finding 1).

**Fix cycle 2 (REVIEW-012, 2026-08-20)** narrowed every privileged-role,
tooling, PUBLIC, `service_role`, column-ACL, and definer-owner statement in
this directory to the exact measured boundary of `roles-acl.txt`
(finding 1 — see the measurement-boundary paragraph and claims 19–21),
stated exactly what the redaction gate does on each red path (finding 3),
made disposable-user counts per-namespace (finding 4), and tightened every
live-response oracle to a single exact status + code with the anon summary
naming its exact subset (finding 5) — then re-ran the live suite under
those strict oracles in a fresh `ctrl004d-*` namespace. `roles-acl.txt` is
unchanged: the measurement is settled and was not re-run.

## The two verification subjects

1. **The owner-regenerated types file** — committed as-is (this phase's
   first commit). Builders hold no access token and cannot regenerate it, so
   its verification is deliberately **indirect**: the repo typecheck passes
   with it (claim 2) and the live REST row shapes equal its declared Row
   columns for all three tables (claim 3). The generation run itself is NOT
   RUN in repo evidence (claim 1).
2. **The applied schema/RLS/storage behavior** — proven live over the anon
   and authenticated paths (claims 4–10). `inventory.txt` pins the exact
   types-file and migration bytes these claims are about, by index blob SHA.

## Credentials and redaction

The owner-held staging URL + publishable key were handed via the repo-root
`.env` (gitignored — the OPERATIONS.md pattern; filled by the owner
mid-session). `live-probes.sh` extracts exactly the two named variables
(never sourcing the file); no value is committed, echoed, or printed.

Redaction is enforced in two layers (the outer one rebuilt in fix cycle 1,
REVIEW-011 finding 3):

1. **At source** — `rls-probes.mjs` registers URL, host, project ref, key,
   generated passwords, and every issued access/refresh token, replacing
   each before anything is buffered; auth-endpoint responses are printed
   only as reduced summaries; a generic JWT-shape sweep runs over every
   line; and an in-process gate suppresses the buffered transcript and
   exits 1 if any registered value or JWT shape survives it. This layer
   covers only what flows through the buffer.
2. **Post-write, pre-commit — the totality guarantee.** The transcript file
   commits the child's _entire_ stdout/stderr, a stream a stray direct
   write could reach without passing through the buffer (the finding 3
   defect class). So every registered value is also mirrored into a
   0600 scratch ledger (`REDACTION_LEDGER`, outside the repo, deleted on
   exit; `rls-probes.mjs` refuses to run without it), and after each
   transcript file is complete — header, child output, exit trailer, the
   exact bytes a commit would record — `redaction-gate.mjs` scans those
   file bytes against the full ledger plus the JWT shape.
   `redaction-gate.txt` records each file's sha256, binding the committed
   bytes to the scanned bytes. `redaction-control.txt` is the planted
   positive control: a synthetic key leaked straight to child stdout
   provably turns the gate red and the transcript is deleted.

**Exactly what the gate does on red (REVIEW-012 finding 3).** The contract
is the exit status, not deletion: the gate returns 1 on *every* red path and
`live-probes.sh` propagates the worst status, so a run that reddens never
exits 0. Deletion happens on exactly one of those paths — a residual match,
where secret bytes were found in the scanned file, so the file must not
survive. The fail-closed paths — ledger missing, unreadable, or implausibly
small (fewer than two distinct values), or the transcript itself unreadable
— return 1 **without** unlinking, because in those cases nothing was
scanned and deleting would destroy evidence about a run that was never
checked. A transcript on disk after a red run is therefore possible, and it
is precisely the case where the run's nonzero status is the only thing
standing between it and a commit.

So the guarantee is: a transcript whose bytes are bound by a GREEN sha256
line in `redaction-gate.txt` scanned clean at exactly those bytes —
verifiable by comparing `sha256sum` of each committed transcript against
the recorded value. A transcript with no such GREEN binding proves nothing
and must not be committed.

## Test identifiers (documented per dispatch) and residual staging state

- Test users (disposable, clearly namespaced, created via the
  publishable-key signup path — exactly the two this fix cycle's dispatch
  authorizes): `ctrl004d-user1@example.com`, `ctrl004d-user2@example.com`
  (`example.com` is RFC-2606-reserved: never deliverable, no real-person
  namespace). Generated passwords existed only in the probe process's
  memory: never persisted, never printed (redaction-registered and
  ledger-mirrored, scratch-only).
- Storage keys: `{user1-uid}/probe.bin` (uploaded, verified, deleted
  in-run); denied attempts `{user2-uid}/intrusion.bin` and
  `no-folder-probe.bin` created nothing.
- **Disposable-user counts are per-namespace, never global** (REVIEW-012
  finding 4). This cycle's namespace is `ctrl004d-*` and it contains
  exactly two users; that is the only user-count statement this directory
  makes. Earlier namespaces (`ctrl004b-*`, `ctrl004c-*`) have their own
  records in their own HANDOFF blocks, and nothing here asserts a maximum
  across namespaces or across time.
- Residual state after the committed run: the two `ctrl004d-*` auth users,
  their two provisioned/reinserted `profiles` rows, one `captures` row
  (capture A, status `ready`, user1) and one `transcripts` row (user1).
  Storage holds no test objects. **Cleanup is owner-class** (deleting users
  needs the dashboard or a secret-class key): deleting the two users in
  Auth → Users cascades away all their rows (every FK chains to
  `auth.users` ON DELETE CASCADE). Deletion was requested in-loop at this
  cycle's close; the fix-cycle-2 HANDOFF block records its confirmation
  state. Re-running `--auth` requires a fresh namespace or cleaned-up
  users: a signup for an existing email cannot recover the original
  in-memory password.

## Owner-executed environment facts (config/credential class, no repo bytes)

1. Phase A migrations applied + types regenerated by the owner, 2026-08-20
   (ruling 10; transcripts held by the controller).
2. Staging email confirmation is a dashboard toggle the owner has moved
   several times, and **the committed transcripts prove only their own
   run-time state** (each records the `mailer_autoconfirm` it ran under —
   `true` for the committed authenticated runs). Sequence on the record:
   initially required (`mailer_autoconfirm=false`, the dispatch's NOT RUN
   contingency) → owner-disabled for the Phase B run (2026-08-20) →
   owner-re-enabled after that run (recorded in the REVIEW-011 review
   dispatch; REVIEW-011 finding 4) → owner-disabled for the fix-cycle-1 run
   → owner-re-enabled at that cycle's close → owner-disabled again, on
   request, for this fix cycle's run (2026-08-20) → re-enable requested
   in-loop at this cycle's close. **The newest HANDOFF block is the
   current-state record of this toggle; nothing in this directory claims
   its present value.**
3. The `roles-acl.sql` measurement was owner-executed in the staging SQL
   editor on 2026-08-20 (ruling 10); its verbatim pasted output is
   `roles-acl.txt`.

## Measured staging role/ACL/RLS posture (`roles-acl.txt`, REVIEW-011 finding 1)

**The measurement boundary, stated once.** `roles-acl.sql` reads five things
and nothing else: role attributes from `pg_roles`; **table-level** effective
privileges via `has_table_privilege`; the raw `relacl` expansion; the
`information_schema.role_table_grants` PUBLIC count; and the `pg_class` RLS
flags — plus the SQL-editor session's own `current_user`. It does **not**
read `pg_proc.proowner`, any column ACL (`pg_attribute.attacl`,
`has_any_column_privilege`, `information_schema.column_privileges`), or any
tool session other than the SQL editor it ran in. Every bullet below is
therefore a **current, table-level** fact about the three v1 tables; each
statement that reaches past the grid is labeled as an inference, and none is
absolute.

- **`postgres`: `rolsuper=f rolbypassrls=t`**, table-level
  select/insert/update/delete all true on all three tables, and the SQL
  editor measurably executes with `current_user=postgres` (run-context row).
  *Inference from the measured attribute, not a transcribed session:* since
  FORCE binds only non-`BYPASSRLS` roles, expect any dashboard surface
  running as `postgres` to see all rows despite FORCE. **Table Editor and
  data-only dumps were never executed or transcribed and their execution
  identities were not measured** (claim 19) — the SQL editor is the only
  identity on the record. The `TO postgres` provisioning policy's present
  effect is **not isolated** by this evidence either: the applied function's
  owner was not measured (claim 20), so whether the definer insert is
  admitted by `BYPASSRLS` or by that policy is unproven in both directions.
  OPERATIONS.md and the 004a README carry the same bounded statement; the
  applied migration comments carrying the original premise are immutable and
  superseded by this measurement.
- **`service_role`: `rolbypassrls=t` with zero table-level CRUD** on the
  three v1 tables (`select/insert/update/delete` all `f`), and its current
  raw ACL entries on each are exactly `TRUNCATE`, `TRIGGER`, `MAINTAIN`,
  `REFERENCES`. The scope of "receives nothing" is therefore **CRUD at the
  table level** — not a claim about every privilege class, and **not a
  column-ACL claim: column privileges are exposed separately in PostgreSQL
  and were not measured.**
- **`anon`: zero table-level CRUD** (consistent with the live 401 `42501`
  denials), with the same four non-CRUD raw ACL entries;
  **`authenticated`: exactly the authored CRUD** on all three tables, plus
  those same non-CRUD entries. Column ACLs unmeasured for both.
- **PUBLIC: no current table-level ACL entry.** The raw `relacl` expansion
  contains no `PUBLIC` grantee on any of the three tables — that is the
  supported statement. The `information_schema.role_table_grants` PUBLIC
  count of 0 is recorded but **non-probative on its own**: PostgreSQL
  documents that view as omitting access made available through PUBLIC.
  Nothing here speaks to column-level or non-table PUBLIC access.
- **`relrowsecurity=t` and `relforcerowsecurity=t` measured on all three
  tables** — ENABLE + FORCE are live, not just authored.
- **Adjacent observation (controller-classified in the fix-cycle loop:
  acknowledged as measured Supabase default-ACL posture, not acted on):**
  the raw ACL also carries platform-default non-CRUD privileges —
  `TRUNCATE`, `TRIGGER`, `MAINTAIN`, `REFERENCES` — for `anon`,
  `authenticated`, and `service_role` on all three tables. These are not
  authored grants (the migrations grant CRUD to `authenticated` only), and
  PostgREST exposes no TRUNCATE/TRIGGER/MAINTAIN/REFERENCES operation
  (documented API surface, not a measurement), so no Data-API-reachable
  widening follows; noted because `TRUNCATE` is not subject to row-level
  security, which would matter on any future surface that speaks SQL as
  those roles. Classified: measured, reported, unactioned — any change is
  a schema/RLS-class decision outside this fix cycle's scope.

## Artifacts and classification

Three classes, following `../002b-fix-loop/README.md` precedent: **gated**
(regenerates byte-for-byte from its committed script at this committed head —
proven per artifact by `stability.txt`), **run-varying** (varying fields
named), and **not gated** (the gate itself). Every producer pins
`LC_ALL=C LANG=C` (learning 7 discipline; recorded in `environment.txt`).
`capture.sh` needs dependencies already materialized per the committed
lockfile (`npm ci` has run); it fetches nothing.

| Artifact | Producer | Class | Notes / normalization |
| --- | --- | --- | --- |
| `anon-probes.txt` | `live-probes.sh` → `rls-probes.mjs --anon` | run-varying, captured once (003a connectivity precedent: the committed transcript is the evidence boundary) | varying fields: run-date line, GoTrue version string, response timestamps. Redaction placeholders (`<staging-url>`, `<staging-host>`, `<publishable-key>`, …) per the section above. The exact denial shapes are the recorded contract. Its summary line names the exact subset — **9 denial/invisibility probes (6 REST + 3 storage) plus 2 service-context probes** (auth-health reachability, auth-settings record), which prove that the denials are policy rather than outage and record the run-time config; totals are never labeled denials (REVIEW-012 finding 5). File bytes gated post-write by `redaction-gate.mjs` |
| `auth-probes.txt` | `live-probes.sh` → `rls-probes.mjs --auth` | run-varying, captured once | varying fields additionally: user/row/object UUIDs, timestamps. Response bodies over 400 chars truncated with an explicit `…(truncated)` marker; auth-endpoint responses reduced by design (never raw). Re-run precondition: owner cleanup above. File bytes gated post-write by `redaction-gate.mjs` |
| `redaction-gate.txt` | `live-probes.sh` → `redaction-gate.mjs` | run-varying, captured once (produced with the live transcripts it scans) | per transcript: byte count, sha256 (binds committed bytes to scanned bytes), distinct registered values scanned, JWT-sweep and residual counts, verdict, gate exit. Raw values never printed |
| `redaction-control.txt` | `capture.sh` → `live-probes.sh --control` | gated | the finding 3 positive control: the real `run_mode` + gate pipeline with synthetic values only (`https://127.0.0.1:9`, instant refusal — no network, no DNS) and the leak hook enabled; proves child exit 1, raw synthetic key present pre-gate, gate RED, transcript deleted. Deterministic lines only (bytes/sha256 of the scratch file omitted); the synthetic key prefix appears only defanged |
| `roles-acl.sql` | authored probe, owner-executed (ruling 10) | producer (not an output) | single read-only SELECT over `pg_catalog`/`information_schema` — role attributes, effective table privileges, raw ACL entries, PUBLIC grants, RLS flags for the three v1 tables. Run in the staging SQL editor by the owner; output committed verbatim as `roles-acl.txt` |
| `types-shape.txt` | `capture.sh` → `types-shape.mjs` | gated | deterministic extraction (sorted tables, sorted columns) from the one committed types file; fail-closed on structure drift |
| `gates.txt` | `capture.sh` | gated | the four non-install CI steps at this head plus the no-dependency-delta probe (pinned to the Phase B base SHA, package files only). jest `Time:` masked, per-suite duration suffixes stripped, `env:` lines dropped (Expo CLI prints them only when a local `.env` exists — machine state, not repo state). The format check runs the pinned local prettier against a clean `git checkout-index` of the staged tree: prettier walks untracked working-copy files and does not read nested ignore rules, so the owner's machine-local `supabase/.temp` CLI residue (untracked, ignored by `supabase/.gitignore`) would otherwise be flagged — CI checks out only the tracked tree, and this measures exactly that. Fail-closed on any nonzero step |
| `inventory.txt` | `capture.sh` | gated | the seven tracked files every claim here is about (the types file + the six `supabase/` files), with index blob SHAs; reads the index (fixed-point discipline) |
| `secret-scan.txt` | `capture.sh` | gated | the five 004a patterns plus a JWT shape (unredacted tokens are the leak class native to live-probe transcripts); defanged patterns, runtime-assembled positive controls, fail-closed |
| `environment.txt` | `capture.sh` | run-varying | node, npm, OS of the machine; the locale line is pinned by construction |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself (002d precedent); exit status is its contract — 0 all-match, 1 otherwise |

`capture.sh` **fails closed**: exit 1 after writing the transcript that
shows why, on a types-shape extraction failure, a redaction positive
control that fails to prove the red path, any nonzero CI-step exit, a
nonzero dependency delta, a wrong inventory, a secret-scan match, or a
broken positive control. `rls-probes.mjs` fails closed on its in-process
gate and refuses to run unledgered; `redaction-gate.mjs` returns 1 on every
red path and unlinks the transcript on the residual-match path (see "Exactly
what the gate does on red" above). A green artifact set from a red run
cannot exist.

## Claims

| # | Claim | Class | Artifact |
| --- | --- | --- | --- |
| 1 | The owner-regenerated `src/lib/database.types.ts` is committed as-is; the generation run itself (owner-executed, ruling 10) | NOT RUN (generation) — provenance recorded; verification is indirect via claims 2–3, stated as such per dispatch | this README + the phase's first commit |
| 2 | The repo typechecks with the regenerated types (the shared client compiles against them) | PASS | `gates.txt` (tsc step) |
| 3 | Probe consistency: live REST row keys equal the types-declared Row columns, all three tables | PASS | `types-shape.txt` + `auth-probes.txt` (the three `row keys ===` probes) |
| 4 | Anon REST denial: SELECT and INSERT on profiles, captures, transcripts each answer **exactly** HTTP 401 code `42501` (anon holds no grants) — six probes, each oracle pinning that one status and that one code (REVIEW-012 finding 5); exact shapes recorded as the contract | PASS | `anon-probes.txt` |
| 5 | Anon storage denial on `captures-audio`: download → **exactly** 400/`NoSuchKey` (not-found obfuscation), upload → **exactly** 400/`AccessDenied` (RLS rejection), list → **exactly** HTTP 200 with an empty array, including re-checked while an owner object existed | PASS | `anon-probes.txt` + `auth-probes.txt` (the anon-list contrast probe) |
| 6 | Signup provisioning created each test user's `profiles` row (the `on_auth_user_created` trigger ran), visible only to its owner, `locale` defaulting `'en'`. **Which mechanism admits that definer insert under FORCE is not isolated by this evidence**: the applied function's owner was not measured (claim 20), and either a `BYPASSRLS` definer or the `TO postgres` policy would admit it — the live rows prove the path works, not which link carried it | PASS (provisioning occurred) / admitting mechanism NOT ISOLATED | `auth-probes.txt` + `roles-acl.txt` |
| 7 | Owner CRUD allowed on own rows across all three tables (profiles: R,U,D,C; captures: C,R,U,D; transcripts: C,R,U,D); `updated_at` triggers fire on profiles and captures | PASS | `auth-probes.txt` |
| 8 | Cross-user denial is the full per-table, per-operation grid: SELECT RLS-invisible (200, zero rows) on all three tables; UPDATE and DELETE true no-ops (200, zero rows affected) on all three tables, with all three victim rows re-read unchanged; INSERT impersonation denied by WITH CHECK at **exactly** 403 `42501` on all three tables — for transcripts via the isolation probe: the attacker inserting the victim's own valid `(capture_id, user_id)` pair (FK-satisfiable by construction) is rejected **exactly** 403 `42501`, so only the RLS WITH CHECK can be the rejector, distinct from claim 9's FK case. Each oracle pins one status and one code, so a neighboring `401/42501` cannot earn a PASS labeled 403 (REVIEW-012 finding 5) | PASS | `auth-probes.txt` (16-probe cross-user section) |
| 9 | The `user_id`-consistency guarantee holds live: a transcript INSERT onto another user's capture with the attacker's own `user_id` (WITH CHECK satisfied) fails **exactly** 409 `23503` naming `transcripts_capture_id_user_id_fkey` | PASS | `auth-probes.txt` |
| 10 | Storage `{user_id}/` scoping: own-prefix upload/download/list/delete allowed; other-prefix upload denied **exactly** 400/`AccessDenied`; a no-folder key fails closed at **exactly** 400/`AccessDenied`; cross-user download **exactly** 400/`NoSuchKey`, list exactly 200 with an empty array, delete **exactly** 400/`AccessDenied` | PASS | `auth-probes.txt` |
| 11 | The four non-install CI steps pass at this head (typecheck, lint, test, format:check — all exit 0). Install is NOT RUN here: the delta provably contains no dependency change (probe in the transcript), and 002d/003a document the destructive npm-ci ENOTEMPTY transient under a live editor; CI runs the real install when the PR opens | PASS / install NOT RUN with reason | `gates.txt` |
| 12 | CI itself on this branch | NOT RUN — no `pull_request` event yet | — |
| 13 | No credential shape exists anywhere in the index (six patterns, each with a matching positive control) | PASS | `secret-scan.txt` |
| 14 | Redaction totality over both live transcripts: zero residual registered values and zero JWT shapes **in the exact committed file bytes** (post-write, pre-commit; full both-mode ledger), with sha256 binding the committed bytes to the scanned bytes; the residual-match red path (direct-child-stdout leakage → RED, transcript unlinked) is proven by the committed planted-synthetic-key control | PASS — each committed transcript carries a GREEN sha256 binding for exactly its bytes (the in-process buffer gate additionally ran, first line). The gate's contract is its exit status; deletion is the residual-match path only, and the ledger-failure paths return 1 without unlinking | `redaction-gate.txt` (sha256 per transcript) + `redaction-control.txt` (positive control) + the in-process gate line in each transcript |
| 15 | The five gated artifacts regenerate byte-for-byte (two fresh capture runs, locale pinned) | PASS | `stability.txt` |
| 16 | `supabase db lint` / local-stack validation of the migration set | NOT RUN — requires Docker and a local database; unchanged Phase A posture | — |
| 17 | The owner's `db push` / `types:gen` transcripts | NOT RUN here — owner-executed (ruling 10), held by the controller; corroborated indirectly by every live claim above (the applied schema demonstrably exists and behaves exactly as authored) | — |
| 18 | The **current table-level** staging role/ACL/RLS posture: `postgres` `rolbypassrls=t` (`rolsuper=f`); `service_role` `rolbypassrls=t` with zero table-level CRUD on the three tables; `anon` zero table-level CRUD; `authenticated` exactly the authored table-level CRUD; no current PUBLIC entry in the raw table ACL; `relrowsecurity=t` and `relforcerowsecurity=t` on all three; the SQL-editor session executes as `postgres`; plus the platform-default non-CRUD ACL entries (adjacent observation above). Scope is exactly the grid — see the measurement-boundary paragraph | PASS (measured, at that boundary) — owner-executed probe, captured once | `roles-acl.txt` (verbatim owner paste; probe: `roles-acl.sql`) |
| 19 | Dashboard tooling *exercised end to end* — Table Editor sessions, data-only dumps, and their execution identities | NOT RUN — only the SQL editor's own `current_user` was measured (claim 18); no Table Editor session, dump, or other tooling run was executed or transcribed. The OPERATIONS.md operator expectation is written as an explicitly-labeled inference from the measured `BYPASSRLS` attribute, never as a transcribed result | — |
| 20 | The applied `public.handle_new_user` function's owner (the role a SECURITY DEFINER call executes as) | NOT RUN — `roles-acl.sql` does not read `pg_proc.proowner`; PostgreSQL executes a SECURITY DEFINER function with its owner's privileges, so that owner is a required link in any causal claim about the provisioning path, and no artifact here establishes it | — |
| 21 | Column-level privileges on the three v1 tables | NOT RUN — PostgreSQL exposes column privileges separately from table privileges, and the probe reads none of `pg_attribute.attacl`, `has_any_column_privilege`, or `information_schema.column_privileges`. Every privilege statement in this directory is therefore table-level only | — |

## Re-running

From the repo root, at a committed (or fully staged — fixed-point
discipline) head, with dependencies already materialized per the committed
lockfile:

- `bash docs/05-quality/evidence/004b-schema-rls-live/capture.sh` —
  regenerates the five gated artifacts and `environment.txt` (runs the four
  CI steps and the redaction positive control; a couple of minutes). Exit
  1 = fail closed.
- `bash docs/05-quality/evidence/004b-schema-rls-live/stability.sh` — the
  byte-stability proof: two fresh captures into scratch, compared against
  the committed copies. Exit 0/1 is the contract.
- `bash docs/05-quality/evidence/004b-schema-rls-live/live-probes.sh` —
  needs the two owner-held env values (exported, or in the repo-root
  `.env`). `--anon` is stateless and re-runnable at will; the `--auth` run
  requires the owner-class cleanup documented above and consumes the
  two-user authorization, so it is once-per-cleanup by design. Both
  transcripts and `redaction-gate.txt` are rewritten together.
- `roles-acl.sql` is owner-executed in the staging SQL editor (ruling 10);
  its pasted output is the committed `roles-acl.txt` and is not
  reproducible by any builder-runnable script here.
