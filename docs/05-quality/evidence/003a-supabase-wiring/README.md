# Evidence — 003a Supabase wiring (Unit B, CTRL-003)

Branch `feat/supabase-wiring`, cut from `main` at
`98f3c6ae00ccca4af732e573cac02cb3f2c926f2` (the tip the dispatch named).
Staging only. This directory backs every PASS claim the Unit B handoff makes.

The staging URL and publishable key were handed by the owner at dispatch, used
via the builder's local environment only, and appear nowhere in this
repository — see **Redaction** and `secret-scan.txt`.

## Artifacts and classification

Three classes, following the precedent set in `../002b-fix-loop/README.md`:
**gated** (regenerates byte-for-byte from its committed script at this
committed head — proven per artifact by `stability.txt`), **run-varying**
(cannot be byte-stable without lying about what it measures; the varying
fields are named), and **fixed-head demonstration** (reproducible at the named
commit; not part of any gate).

**Locale normalization (learning 7; REVIEW-008 finding 1).** Every producer in
`capture.sh` runs under a pinned `LC_ALL=C LANG=C`, exported at the top of the
script. npm renders its dependency tree from the locale — UTF-8 locales draw
`└──` where the C locale draws `` `-- `` — so without the pin `deps.txt` is
locale-variant and the byte-stability claim fails in any UTF-8 environment.
The pinned value is recorded in `environment.txt`. The masking normalizations
named per artifact below are applied on top of, not instead of, this pin.
One further environment sensitivity, observed in this cycle's clone-based
gate run and reported as an adjacent finding rather than repaired:
`deps.txt`'s `$PWD` → `<repo-root>` mask assumes a plain checkout path that
npm prints verbatim, and npm 11's output redaction turns credential-shaped
path segments (here a UUID-shaped directory name) into `***` before the mask
can match, so the gate must run from a checkout whose absolute path contains
no such segment.

`capture.sh` also **fails closed** (REVIEW-008 adjudication): it exits 1 after
writing the transcript that shows why, if the secret scan matches any tracked
file, if any scan positive control fails to match, or if the redaction control
is broken. A green artifact set cannot come out of a red run.

Inventory at this head: five `.sh` producers, eleven `.txt` transcripts, and
this README — the two artifacts new in fix cycle 1 are produced by the
existing `capture.sh`, not by new scripts. (At the REVIEW-008 target
`98c4d6d` the tree held five `.sh` and nine `.txt`; the prior HANDOFF block's
"six scripts" was wrong — finding 5, corrected on the record in the fix-cycle
HANDOFF block, never by editing the old one.)

| Artifact | Producer | Class | Varying fields / notes |
|---|---|---|---|
| `gates.txt` | `capture.sh` | gated | normalization: all durations masked to `<duration>`; `npm ci` reduced to its added-package count (the audited clause and advisory/funding footers are registry-shaped); jest per-test/suite duration suffixes stripped; `env:` lines dropped (printed by the Expo CLI only when a local `.env` exists — machine state, not repo state). Fail-loudly covers all three missing-env cases (neither, URL-only, key-only); the ignore probes cover `.env`, `.env.local`, `.env.staging`, `.envrc`, `.envfoo` plus the pattern-evaluating negative probe (REVIEW-009: `git check-ignore --no-index`, because the default form is index-suppressed for the tracked path and proves nothing) that `.env.example` is not ignored — plain form exit 1, verbose form naming `.gitignore`'s `!.env.example` as the deciding line — and stays tracked |
| `deps.txt` | `capture.sh` | gated | locale-invariant only under the pin above; repo path masked to `<repo-root>`; the npm package name masked to `<package-name>` — an internal identifier (ruling 8) whose presence would otherwise add this `docs/` file to the name-scan count gated by `../002b-fix-loop/name-scan.txt` |
| `types-plumbing.txt` | `capture.sh` | gated | generated-types plumbing (REVIEW-008 finding 4): `types:gen` reaches the script, `bash -n` passes, missing-ref refusal exits 1 before any CLI invocation (no network), the CLI version is pinned exact (`supabase@2.115.0`), and the committed placeholder is imported as the client generic and typechecks. The authenticated generation run itself stays owner-executed, NOT RUN |
| `redaction-control.txt` | `capture.sh` | gated | malformed-URL failure path (REVIEW-008 finding 4): synthetic non-credential values, exit 1, zero raw occurrences of either value in the output — the previously uncommitted repro, now a committed control. No network: the client constructor rejects the value inside the lazy import |
| `secret-scan.txt` | `capture.sh` | gated | reads the index (fixed-point discipline, like `../002b-fix-loop/tracked-files.sh`); each pattern carries a runtime-assembled positive control so a green scan is not vacuous; enforcement is fail-closed per the note above |
| `environment.txt` | `capture.sh` | run-varying | node, npm, and OS versions of the machine; the locale line is pinned by construction, recorded here so the stability contract's environment is explicit |
| `npm-audit.txt` | `capture.sh` | run-varying | the upstream npm advisory database |
| `connectivity.txt` | `connectivity.sh` | run-varying | network reachability, live staging service state, and the UTC run date; the green-path bytes are designed deterministic (everything variable is masked or redacted), but reproduction requires the owner-held env values and reachable staging, and any failure records different bytes by design. The committed transcript is the 2026-08-19 capture and stands unchanged through fix cycle 1; its producer now propagates the child exit status (REVIEW-008 adjudication), which changes no green-path byte |
| `stability.txt` | `stability.sh` | not gated | a gate cannot contain a run of itself (precedent: `../002d-fix-loop-3/negative-control.txt`); the script's exit status is its contract — 0 all-match, 1 otherwise |
| `unit-a-gate-at-head.txt` | `unit-a-gate-at-head.sh` | fixed-head demonstration | tmp paths and mtimes in the embedded diff headers vary run to run; the comparison results are reproducible at this committed head |
| `unit-a-gate-at-base.txt` | `unit-a-gate-at-base.sh` | fixed-base demonstration | same caveat; pinned to the base commit named in the script |

## Claims

| # | Claim | Class | Artifact |
|---|---|---|---|
| 1 | `@supabase/supabase-js@2.112.3` is a dependency, resolved by the committed lockfile | PASS | `deps.txt` |
| 2 | The shared typed client (`src/lib/supabase.ts`) instantiates from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and completes three unauthenticated staging round-trips — its own REST call (PostgREST answered `PGRST205` for a deliberately nonexistent probe table, proving the key is accepted), a client-independent raw REST probe, and the auth health endpoint — plus one local check (`auth.getSession`: client constructs, auth surface answers session-null without error; no network involved with persistence off) | PASS | `connectivity.txt` (4/4, exit 0; run 2026-08-19 local, 2026-08-18 UTC, by the builder with owner-handed values via local env) |
| 3 | The client fails loudly at load when either variable is missing | PASS | `gates.txt`, "fail-loudly" sections — all three cases committed: neither set, URL-only (key missing), key-only (URL missing); REVIEW-008 finding 4 closed |
| 4 | Generated-types plumbing: `npm run types:gen` wraps CLI generation (pinned `supabase@2.115.0`) with the project ref read from env at run time; the committed `src/lib/database.types.ts` placeholder is wired into the client's generics | PASS (plumbing — now backed by a committed artifact; REVIEW-008 finding 4 closed) / **NOT RUN** (the generation itself — owner-executed; it needs `SUPABASE_ACCESS_TOKEN`, which builders do not hold) | `types-plumbing.txt` (script reachable, `bash -n`, missing-ref refusal, exact pin, placeholder-import typecheck); README "Supabase" section documents the owner command |
| 5 | `.env.example` lists exactly the two variables, blank; literal `.env*` is gitignored (REVIEW-008 finding 3: the rules now use `.env*`, not `.env` + `.env.*`); `.env.example` itself is the sole negation and is tracked | PASS | `gates.txt`, ".env hygiene" section — probes `.env`, `.env.local`, `.env.staging`, `.envrc`, `.envfoo`; the negative probe is pattern-evaluating (REVIEW-009: `git check-ignore --no-index` — the default form is index-suppressed for the tracked path and proved nothing): the plain form exits 1 and would print the path and exit 0 with the negation removed, and the verbose form names `.gitignore`'s `!.env.example` as the deciding line (in `-v` mode a negation match counts as a match, so its exit 0 is expected — the discriminating exit code is the plain form's); tracked check; the file's variable lines captured verbatim |
| 6 | The five CI steps pass at this head (local equivalents: `npm ci`, typecheck, lint, test, format:check — all exit 0) | PASS | `gates.txt` |
| 7 | CI itself on this branch | NOT RUN | no `pull_request` event yet; the workflow file is untouched by this unit |
| 8 | No staging credential shape exists anywhere in the index | PASS | `secret-scan.txt` — four patterns, zero files each, every positive control matched. Stated limitation: a bare project ref (outside a URL) cannot be scanned for without embedding the ref itself; the URL-form pattern covers the realistic leak shape |
| 9 | This directory's gated artifacts (all five) regenerate byte-for-byte, locale-invariantly | PASS | `stability.txt` — two fresh `capture.sh` runs against the committed copies, 0 differing, process exit 0; locale pinned per the normalization note (REVIEW-008 finding 1 closed) |
| 10 | The Unit A byte-stability gate, run unmodified at this head | **exit 1 — disclosed and triaged below** | `unit-a-gate-at-head.txt`, `unit-a-gate-at-base.txt` |
| 11 | Redaction is total on the malformed-URL failure path: the connectivity script fails loudly and its output retains no raw value | PASS | `redaction-control.txt` — exit 1, zero raw occurrences of the synthetic malformed URL and key (REVIEW-008 finding 4 closed; previously proven only in an uncommitted repro) |

## Unit A gate triage

`../002c-fix-loop-2/stability.sh` at this head reports 11 gated artifacts,
**3 differing**, process exit 1. Per artifact:

- **`push-state.txt` — pre-existing at the base.** Its producer asks whether
  `refs/remotes/origin/feat/app-skeleton` contains the reviewed Unit A
  commits; that branch was deleted after the Unit A merge, so the regenerated
  transcript reads ABSENT/no where the committed one reads present/yes.
  `unit-a-gate-at-base.txt` proves this at the dispatch base, before any of
  this unit's work.
- **`git-ls-files.txt` — pre-existing at the base, extended at this head.**
  Controller state commits added tracked files after the listing was last
  regenerated (proven at base), and this unit's files extend the same delta at
  head. The regenerated listing correctly describes each head it is run at;
  the committed copy correctly describes the Unit A head it was captured at.
- **`lint-file-list.txt` — this unit, cause named.** Three new tracked
  lintable files (`scripts/check-supabase-connectivity.ts`,
  `src/lib/database.types.ts`, `src/lib/supabase.ts`), all
  errors=0 warnings=0; the tracked-files-linted count moves 5 → 8.
- **The other eight are identical at this head**, including all four CI-step
  transcripts, `export-summary.txt`, `name-scan.txt`, and `dev-server.txt`.

**Why nothing was repaired.** Those artifacts are Unit A's reviewed evidence,
cited by immutable review records through REVIEW-007. Regenerating them from a
different unit would change merged, reviewed bytes to keep an instrument green
whose staleness began at the Unit A merge itself. No state file records this
staleness yet — the existing backlog item about the gate covers a different,
narrower task (adding one artifact to the gated set) — so this unit reports it
to the controller as an adjacent finding in its HANDOFF block rather than
acting on it: recording it and scheduling the reconciliation are controller
calls, and a builder cannot add state rows beyond its own. One deliberate
avoidance is recorded in the `deps.txt` row above: masking the package name
keeps this directory from adding a new `docs/` file to the name-scan count,
which would have manufactured a fourth difference.

## Implementation notes disclosed for review

- `tsconfig.json` gains exactly one line, `"allowImportingTsExtensions":
  true`. It is instrumentally required: the connectivity script must import
  the real shared module with an explicit `.ts` specifier (Node's native
  TypeScript execution demands the extension), and without the flag
  `tsc --noEmit` fails with TS5097 on that import. It is legal because the
  inherited `expo/tsconfig.base` sets `noEmit: true`, and behaviorally inert
  for app code (nothing else imports with extensions; `gates.txt` shows
  typecheck green).
- The client is created with `persistSession`, `autoRefreshToken`, and
  `detectSessionInUrl` all off: session handling needs a storage adapter and
  an auth policy set, which are a later, RED-lane-adjacent unit. The options
  are visible in `src/lib/supabase.ts` with the reason inline.

## Redaction

`scripts/check-supabase-connectivity.ts` replaces the full URL, the bare host,
and the key with placeholders in every line it emits, including caught error
text; `connectivity.sh` adds only a UTC date on top. The scan patterns in
`capture.sh` are written defanged (bracketed characters) with runtime-assembled
positive-control samples, so neither the scanner nor its transcript can ever
contain — or match — a credential-shaped string. The malformed-URL failure
path — where a throwing redaction helper once could have printed the raw
value — is proven total by the committed `redaction-control.txt`, and
`capture.sh` fails closed if that control ever breaks.

One service fact recorded for future units: the REST OpenAPI root
(`/rest/v1/`) answers 401 "Secret API key required" to publishable-class
keys by gateway design. The connectivity check therefore probes a table route
(the shape publishable keys are for) instead of the root; builders hold no
secret-class keys (RED lane).

## Re-running

From the repo root, at a committed head:

- `bash docs/05-quality/evidence/003a-supabase-wiring/capture.sh` — regenerates
  the gated and run-varying artifacts (full `npm ci` inside; a few minutes).
  Locale is pinned internally; no caller setup needed. Exits 1 (fail closed)
  on any secret-scan match, broken positive control, or broken redaction
  control.
- `bash .../connectivity.sh` — needs the two env variables exported
  (owner-held staging values). Exits with the connectivity check's own status.
- `bash .../stability.sh` — the byte-stability proof; exit 0/1 is the
  contract.
- `bash .../unit-a-gate-at-head.sh` — reruns the Unit A gate (its own
  prerequisites: port 8081 free; several minutes) and restores Unit A's
  transcript from the index afterwards.
- `bash .../unit-a-gate-at-base.sh` — the fixed-base demonstration in a
  detached worktree; cheap, pure git.
