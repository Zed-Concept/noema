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
measured by the owner-run `roles-acl.sql` probe (finding 1) — see the
sections below.

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
   file bytes against the full ledger plus the JWT shape. A red gate
   deletes the transcript and fails the run; `redaction-gate.txt` records
   each file's sha256, binding the committed bytes to the scanned bytes.
   `redaction-control.txt` is the planted positive control: a synthetic
   key leaked straight to child stdout provably turns the gate red and the
   transcript is deleted.

A committed transcript can therefore only exist if the exact bytes being
committed scanned clean — verifiable by comparing `sha256sum` of each
committed transcript against the value recorded in `redaction-gate.txt`.

## Test identifiers (documented per dispatch) and residual staging state

- Test users (disposable, clearly namespaced, created via the
  publishable-key signup path — the two-user cap the fix-cycle dispatch
  authorizes): `ctrl004c-user1@example.com`, `ctrl004c-user2@example.com`
  (`example.com` is RFC-2606-reserved: never deliverable, no real-person
  namespace). Generated passwords existed only in the probe process's
  memory: never persisted, never printed (redaction-registered and
  ledger-mirrored, scratch-only).
- Storage keys: `{user1-uid}/probe.bin` (uploaded, verified, deleted
  in-run); denied attempts `{user2-uid}/intrusion.bin` and
  `no-folder-probe.bin` created nothing.
- Residual state after the committed run: the two `ctrl004c-*` auth users,
  their two provisioned/reinserted `profiles` rows, one `captures` row
  (capture A, status `ready`, user1) and one `transcripts` row (user1).
  Storage holds no test objects. **Cleanup is owner-class** (deleting users
  needs the dashboard or a secret-class key): deleting the two users in
  Auth → Users cascades away all their rows (every FK chains to
  `auth.users` ON DELETE CASCADE). Deletion was requested in-loop at this
  cycle's close; the fix-cycle HANDOFF block records its confirmation
  state. The superseded Phase B pair (`ctrl004b-user1/2@example.com`)
  belongs to the same owner-cleanup class. Re-running `--auth` requires
  fresh-namespace or cleaned-up users: a signup for an existing email
  cannot recover the original in-memory password.

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
   dispatch; REVIEW-011 finding 4) → owner-disabled again, on request, for
   this fix cycle's run (2026-08-20) → re-enable requested in-loop at this
   cycle's close. **The fix-cycle HANDOFF block is the current-state record
   of this toggle; nothing in this directory claims its present value.**
3. The `roles-acl.sql` measurement was owner-executed in the staging SQL
   editor on 2026-08-20 (ruling 10); its verbatim pasted output is
   `roles-acl.txt`.

## Measured staging role/ACL/RLS posture (`roles-acl.txt`, REVIEW-011 finding 1)

Every statement here reads directly off the owner-run probe output; no
claim below extends past what the grid supports.

- **`postgres`: `rolsuper=f rolbypassrls=t`**, full CRUD on all three
  tables, and the SQL editor measurably executes as it (run-context row).
  So FORCE does not bind postgres-role tooling — Table Editor, SQL editor,
  and data-only dumps see rows — and the `TO postgres` provisioning policy
  is **inert defense-in-depth** (the SECURITY DEFINER insert bypasses row
  security via the role attribute), load-bearing only under a future role
  demotion. OPERATIONS.md and the 004a README carry the same corrected
  statement; the applied migration comments carrying the original premise
  are immutable and superseded by this measurement.
- **`service_role`: `rolbypassrls=t` but zero CRUD table privileges** on
  the three v1 tables (`select/insert/update/delete` all `f`). "Receives
  nothing" is now a measured effective-privilege fact at the CRUD layer,
  not just an authored-GRANT fact — and the BYPASSRLS attribute is moot
  against tables it cannot read or write.
- **`anon`: zero CRUD** (matches the live 401 `42501` denials);
  **`authenticated`: exactly the authored CRUD** on all three tables.
- **PUBLIC: nothing** — no `PUBLIC` grantee in any raw ACL entry, and the
  information_schema PUBLIC-grant count is 0 for each table.
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
| `anon-probes.txt` | `live-probes.sh` → `rls-probes.mjs --anon` | run-varying, captured once (003a connectivity precedent: the committed transcript is the evidence boundary) | varying fields: run-date line, GoTrue version string, response timestamps. Redaction placeholders (`<staging-url>`, `<staging-host>`, `<publishable-key>`, …) per the section above. The exact denial shapes are the recorded contract. File bytes gated post-write by `redaction-gate.mjs` |
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
gate and refuses to run unledgered; `redaction-gate.mjs` deletes any
transcript it reddens. A green artifact set from a red run cannot exist.

## Claims

| # | Claim | Class | Artifact |
| --- | --- | --- | --- |
| 1 | The owner-regenerated `src/lib/database.types.ts` is committed as-is; the generation run itself (owner-executed, ruling 10) | NOT RUN (generation) — provenance recorded; verification is indirect via claims 2–3, stated as such per dispatch | this README + the phase's first commit |
| 2 | The repo typechecks with the regenerated types (the shared client compiles against them) | PASS | `gates.txt` (tsc step) |
| 3 | Probe consistency: live REST row keys equal the types-declared Row columns, all three tables | PASS | `types-shape.txt` + `auth-probes.txt` (the three `row keys ===` probes) |
| 4 | Anon REST denial: SELECT and INSERT on profiles, captures, transcripts each answer HTTP 401 code `42501` (anon holds no grants); exact shapes recorded as the contract | PASS | `anon-probes.txt` |
| 5 | Anon storage denial on `captures-audio`: download → not-found obfuscation (400/`NoSuchKey`), upload → RLS rejection (400/`AccessDenied`), list → zero objects, including re-checked while an owner object existed | PASS | `anon-probes.txt` + `auth-probes.txt` (the anon-list contrast probe) |
| 6 | Signup provisioning created each test user's `profiles` row (the `on_auth_user_created` trigger ran), visible only to its owner, `locale` defaulting `'en'`. The definer insert executes as `postgres`, which measurably carries BYPASSRLS — the `TO postgres` policy is inert defense-in-depth, not the admitting path (see the measured-posture section) | PASS | `auth-probes.txt` + `roles-acl.txt` |
| 7 | Owner CRUD allowed on own rows across all three tables (profiles: R,U,D,C; captures: C,R,U,D; transcripts: C,R,U,D); `updated_at` triggers fire on profiles and captures | PASS | `auth-probes.txt` |
| 8 | Cross-user denial is the full per-table, per-operation grid: SELECT RLS-invisible (200, zero rows) on all three tables; UPDATE and DELETE true no-ops (200, zero rows affected) on all three tables, with all three victim rows re-read unchanged; INSERT impersonation denied by WITH CHECK (403 `42501`) on all three tables — for transcripts via the isolation probe: the attacker inserting the victim's own valid `(capture_id, user_id)` pair (FK-satisfiable by construction) is rejected 403 `42501`, so only the RLS WITH CHECK can be the rejector, distinct from claim 9's FK case | PASS | `auth-probes.txt` (16-probe cross-user section) |
| 9 | The `user_id`-consistency guarantee holds live: a transcript INSERT onto another user's capture with the attacker's own `user_id` (WITH CHECK satisfied) fails 409 `23503` naming `transcripts_capture_id_user_id_fkey` | PASS | `auth-probes.txt` |
| 10 | Storage `{user_id}/` scoping: own-prefix upload/download/list/delete allowed; other-prefix upload denied; a no-folder key fails closed; cross-user download/list/delete denied | PASS | `auth-probes.txt` |
| 11 | The four non-install CI steps pass at this head (typecheck, lint, test, format:check — all exit 0). Install is NOT RUN here: the delta provably contains no dependency change (probe in the transcript), and 002d/003a document the destructive npm-ci ENOTEMPTY transient under a live editor; CI runs the real install when the PR opens | PASS / install NOT RUN with reason | `gates.txt` |
| 12 | CI itself on this branch | NOT RUN — no `pull_request` event yet | — |
| 13 | No credential shape exists anywhere in the index (six patterns, each with a matching positive control) | PASS | `secret-scan.txt` |
| 14 | Redaction totality over both live transcripts: zero residual registered values and zero JWT shapes **in the exact committed file bytes** (post-write, pre-commit; full both-mode ledger), with sha256 binding the committed bytes to the scanned bytes; the gate's red path (direct-child-stdout leakage → RED, transcript deleted) is proven by the committed planted-synthetic-key control | PASS — a committed transcript exists only if its exact bytes scanned clean (the in-process buffer gate additionally ran, first line) | `redaction-gate.txt` (sha256 per transcript) + `redaction-control.txt` (positive control) + the in-process gate line in each transcript |
| 15 | The five gated artifacts regenerate byte-for-byte (two fresh capture runs, locale pinned) | PASS | `stability.txt` |
| 16 | `supabase db lint` / local-stack validation of the migration set | NOT RUN — requires Docker and a local database; unchanged Phase A posture | — |
| 17 | The owner's `db push` / `types:gen` transcripts | NOT RUN here — owner-executed (ruling 10), held by the controller; corroborated indirectly by every live claim above (the applied schema demonstrably exists and behaves exactly as authored) | — |
| 18 | The exact staging role/ACL/RLS posture: `postgres` `rolbypassrls=t` (rolsuper=f); `service_role` `rolbypassrls=t` with zero CRUD on the three tables; `anon` zero CRUD; `authenticated` exactly the authored CRUD; PUBLIC nothing; `relforcerowsecurity=t` on all three; SQL editor executes as `postgres`; plus the platform-default non-CRUD ACL entries (adjacent observation above) | PASS (measured) — owner-executed probe, captured once | `roles-acl.txt` (verbatim owner paste; probe: `roles-acl.sql`) |
| 19 | Postgres-role dashboard tooling behavior (Table Editor / SQL editor / data-only dumps *exercised end to end*) | NOT RUN — the role attributes and privileges that determine it are measured (claim 18) and the OPERATIONS sentence is written to that measurement; no dashboard-tooling session or dump was itself transcribed | — |

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
