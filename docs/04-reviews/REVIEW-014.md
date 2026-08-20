# REVIEW-014 — Unit C advisory review (RLS/auth surface)

**Status:** immutable record. **Type:** advisory (ADR-001 RED-on-arrival
trigger). **Controller:** CTRL-004 Schema and RLS v1. **Advisory reviewer:**
DeepSeek V4 Pro, OpenCode plan mode (read-only), fresh session,
`reasoningEffort: high` configured in `opencode.json` — runtime confirmation
of the applied effort is unavailable in that tool and is therefore recorded
as configured, not verified. **Reviewer of record:** Codex Sol (records
REVIEW-011, REVIEW-012, REVIEW-013) — unchanged; this record does not
substitute for the RoR verdict and does not gate merge on its own.

**Subject:** the Unit C authorization surface, frozen since
`7ebeb8bf59132961dab73cd5c1ee3692105cf11f` and unchanged by three fix cycles
— the four applied migrations under `supabase/migrations/`: v1 core schema
(`profiles`, `captures`, `transcripts`), the RLS policy set (ENABLE + FORCE,
per-operation owner-only policies, initplan-wrapped `(select auth.uid())`),
SECURITY DEFINER profile provisioning with pinned empty `search_path` plus
an INSERT-only `TO postgres` policy, and the private `captures-audio` bucket
with `{user_id}/`-scoped storage policies.

**Measured context supplied:** `docs/05-quality/evidence/004b-schema-rls-live/roles-acl.txt`
(owner-run); `anon-probes.txt` and `auth-probes.txt` as committed at dispatch
time.

**Reviewer scope discipline:** no repository writes, no staging or production
access, no credentials. The advisory reply was delivered to the controller,
which commits this record. The reviewer verified the one load-bearing
semantic question against PostgreSQL source (`check_enable_rls` in
`src/backend/utils/misc/rls.c`) across the 15, 16, and 17 release branches.

---

## Verdict

**SOUND.** The authorization surface is correct for a v1 in which every row
is owner-only and no sharing model exists. No finding rises to Medium. All
findings are documentation-accuracy, measurement-completeness, or
forward-guidance class. Nothing found warrants withholding merge.

---

## Resolution of the admitting-mechanism question

The dispatch asked whether the SECURITY DEFINER function combined with the
`TO postgres` policy creates any privilege path beyond profile provisioning.
The reviewer's answer, verified at source: **no — and the policy admits
nothing at all on staging today.**

1. `check_enable_rls()` in PostgreSQL 15, 16, and 17 tests
   `has_bypassrls_privilege(user_id)` first and returns `RLS_NONE_ENV`
   before the owner/FORCE branch is reached. `FORCE ROW LEVEL SECURITY`
   binds the owner *as owner*; it does not override `BYPASSRLS`.
2. Staging `postgres` is measured `rolbypassrls=t` and owns the tables, so
   it bypasses RLS on all three tables regardless of FORCE.
3. Therefore: the provisioning insert inside `handle_new_user` is admitted
   by BYPASSRLS, never by the `profiles_provisioning_insert` policy; that
   policy is inert belt-and-suspenders; and FORCE itself is protective of
   nothing on Supabase today. The surface is held by ENABLE, the grants, and
   the policies themselves.
4. The `pg_proc.proowner` measurement gap (004b claim 20) does not affect
   this conclusion. It would matter only in the degenerate case where the
   function owner were a non-BYPASSRLS role — in which case provisioning
   would *break* (the insert would be policy-checked and denied, no policy
   matching), not widen.
5. `handle_new_user` is trigger-typed and therefore uncallable outside
   trigger context, is the only SECURITY DEFINER function in the set, and
   its body is schema-qualified under a pinned empty `search_path`.

**Controller ruling on 004b claim 6:** the claim's bounded "admitting
mechanism NOT ISOLATED" wording was honest at the time it was written and is
not a defect. This record supplies the resolution: the admitting mechanism is
BYPASSRLS. The claim text was deliberately not amended mid-cycle; the two
records stand together.

---

## Findings

| # | Severity | Summary |
|---|---|---|
| F1 | LOW (documentation; immutable) | Migration comments at `20260820100100:2-4` and `20260820100200:23-28` assert a FORCE-binds-`postgres` mechanism that PostgreSQL 15/16/17 do not implement for a BYPASSRLS owner. The fix-cycle evidence prose (004b README, OPERATIONS.md, HANDOFF fix-cycle-2 blocks) already supersedes them correctly. The comments stand as applied-and-immutable, superseded by measurement and by this record. |
| F2 | LOW (measured grant reality) | `20260820100100:7-9` states that new public-schema entities carry no privileges for the Data API roles until granted. Measured reality: `anon`, `authenticated`, and `service_role` each hold TRUNCATE, TRIGGER, MAINTAIN, REFERENCES on all three tables (grantor `postgres`). The statement is true only of the CRUD four; the explicit CRUD grants remain load-bearing. Already recorded in the 004b README as an acknowledged adjacent observation. Two additions: (a) the mechanism (default privileges vs one-time platform grants) is unmeasured and determines whether future public-schema tables inherit these; (b) see standing ruling S3. |
| F3 | ADVISORY (forward) | EXECUTE on functions defaults to PUBLIC in PostgreSQL. Both current functions are trigger-typed and therefore uncallable via `/rpc` — inert today. The first future SECURITY DEFINER non-trigger function in the public schema would be RPC-callable by `anon` and `authenticated` with the publishable key, executing as its owner (`postgres` → BYPASSRLS → full row access, TRUNCATE included). See standing ruling S1. |
| F4 | ADVISORY (forward) | `service_role` is measured zero-CRUD and `rolbypassrls=t`. The moment a `service_role` grant lands, that role bypasses the entire owner-only matrix and server-side code becomes the sole enforcement point; its already-granted TRUNCATE is not RLS-bound. See standing ruling S2. |
| F5 | LOW (abuse, not privacy) | The `captures-audio` bucket row carries no `file_size_limit` or `allowed_mime_types`. A hostile authenticated user can write only inside their own folder (privacy intact) but can consume project storage quota unboundedly — a cost/DoS exposure, not a data exposure. Backlog. |
| F6 | INFO | GraphQL (`pg_graphql`, if enabled) and Realtime `postgres_changes` are not probed by 004b. Both resolve through normal RLS, so the risk is theoretical; one probe each would close it. Backlog. |
| F7 | INFO | Storage path equality is case-sensitive text comparison. A client uploading under an uppercase-UID folder would own objects it can never read back — fail-closed self-denial, no escalation. SDK-layer convention note. Backlog. |
| F8 | INFO | The staging server's PostgreSQL major version is nowhere recorded (the evidence pins the local PG17 parser). The conclusions above hold for every Supabase-supported major, since 15/16/17 share the BYPASSRLS-first ordering, so nothing turns on it. The next owner-run probe should add `select version();`. Backlog. |

---

## Answers to the dispatched questions

- **UPDATE completeness and predicates:** complete and correct on all three
  tables. USING and WITH CHECK are both present and both pin the immutable
  ownership column (`id` / `user_id` = `auth.uid()`). An owner cannot be
  stripped from a row via UPDATE; a row cannot be reassigned across users;
  `capture_id` reassignment on `transcripts` is doubly constrained (WITH
  CHECK plus the composite FK). Corroborated live by the 16-probe grid and
  the WITH CHECK-versus-FK isolation probe.
- **Definer plus `TO postgres`:** no privilege path beyond provisioning
  exists — see the resolution section above.
- **`search_path` and function hardening:** sound. Empty pinned
  `search_path` on both functions, fully qualified bodies, trigger-typed;
  `set_updated_at` correctly SECURITY INVOKER.
- **Storage path-scoping:** no bypass found. `foldername(name)[1]`
  semantics are correct; folder-less keys fail closed (verified live);
  move, copy, and upsert all route through the same four predicate shapes.
- **Composite-FK consistency:** sound. `transcripts(capture_id, user_id)`
  → `captures(id, user_id)` makes cross-owner transcript rows
  unrepresentable at insert and at reassignment; live-proven `409`/`23503`.
- **What an evidence-focused review structurally misses:** exactly F1. The
  FORCE/BYPASSRLS mechanism inversion lives in the one context that
  `anon`/`authenticated` probes can never observe — `postgres`-context
  execution — and the migrations' stated rationale is the opposite of
  PostgreSQL's implemented semantics.

---

## Standing rulings carried from this record

Recorded here at issue; the controller promotes them to the binding digest
in `docs/01-state/PROJECT-STATE.md` at the CTRL-004 close-out, where the
owner's merge ratifies them.

- **S1 (from F3):** every future function migration pins
  `revoke all on function ... from public, anon, authenticated` and grants
  EXECUTE only where intended. Any SECURITY DEFINER non-trigger function in
  a client-reachable schema is RED-lane class.
- **S2 (from F4):** any grant to `service_role` re-triggers an advisory
  review before merge. That role bypasses the entire owner-only matrix; its
  arrival moves enforcement into server-side code.
- **S3 (from F2b):** every future public-schema table repeats the
  ENABLE + FORCE + per-operation-policy discipline. A future table granted
  CRUD to `authenticated` without RLS enabled is wide open.

## Backlog carried from this record

F5 (bucket `file_size_limit` / `allowed_mime_types`), F6 (one GraphQL and
one Realtime probe), F7 (lowercase-UID storage convention note at the SDK
layer), F8 (`select version();` appended to the next owner-run probe).
