# REVIEW-021-ADVISORY — Unit D auth and session v1, fix cycle 2

**Date:** 2026-08-25
**Advisory reviewer:** DeepSeek V4 Pro, fresh session — the ADR-001 auth
trigger seat, controller's pick, per the `feat/auth-session-v1` LOCK
**Reviewer of record:** Codex Sol, Ultra effort, fresh session — full-surface
review; this record does not duplicate it
**Review target:** `feat/auth-session-v1` at
`7bea41c4f8b769ce0e602ea290c2d6b7d8a413ea`
**Review base:** `main` at
`d5b4f8aec3b45e7009a9a7bb2a7119c9758e1bc3`
**Pull request:** #11
**Verdict:** **DEFECTS_FOUND**

> Immutable review record. Do not edit after commit. A later result requires a
> new `REVIEW-NNN.md`.
>
> Advisory scope, per the dispatch: the auth-client refresh lifecycle — whether
> removing self-scheduling eliminates or relocates the three REVIEW-020 finding 1
> probes; whether the retained on-demand refresh in `getSession()` reopens what
> the flag closed; whether an unpersisted rotated session is detectable in every
> path it can arise; and whether forced re-authentication is proportionate or an
> inducible denial of service. **Advisory carries no merge authority**; the
> controller adjudicates against the reviewer-of-record record.

## Verdict

**DEFECTS_FOUND.** The shape ADR-007 chose is sound and should survive: the
client no longer self-schedules, a foreground gate owns the app's refresh
initiations, and a refused session write forces re-authentication. But the
enforcement boundary is not what the decision text and the branch's claims say
it is. Removing the scheduler eliminated one of the three REVIEW-020 probes and
**relocated the other two**:

- **Probe 1 (initialization restarting the ticker) is eliminated.** Verified
  against pinned `@supabase/auth-js` 2.112.3: `_handleVisibilityChange` gates the
  non-browser ticker on `this.autoRefreshToken` (`GoTrueClient.js:4693`), no app
  code calls `startAutoRefresh`/`stopAutoRefresh`, and the provider test asserts
  the calls are never made.
- **Probe 2 (recovery refresh) is relocated, not eliminated.** `_recoverAndRefresh`
  is gated on the flag (`:4104`), but listener registration re-enters the same
  refresh through a different, ungated door: the app's own `onAuthStateChange`
  registration at mount (`auth-provider.tsx:107`) triggers `_emitInitialSession`
  (`:3640`) → `_useSession` (`:2477`) → `__loadSession` (`:2496`), which calls
  `_callRefreshToken` whenever the stored session is inside the 90s
  `EXPIRY_MARGIN_MS` — with **no `autoRefreshToken` gate and no foreground
  gate**. The bootstrap `getSession()` (`auth-provider.tsx:117`) is a second
  ungated entrance. Both fire on mount regardless of AppState, including the
  backgrounded mount the provider test itself exercises. The comment at
  `supabase.ts:46` ("construction no longer refreshes a stored session") is
  therefore true of `_recoverAndRefresh` only; the ADR-007 clause "refresh
  initiated only by explicit, foreground-gated calls" is not implemented, and
  the gate module's claim to be "the single place that asks"
  (`foreground-refresh.ts:17`) is false.
- **Probe 3 (in-flight write after the stop) is relocated with handling — the
  one relocation that is principled.** A foreground-initiated refresh can still
  straddle a background transition; the difference is that the failed persist is
  now surfaced by the write observer and forced into re-authentication instead
  of vanishing. ADR-007 explicitly redefined the property from "no refresh ever
  fires in the background" to "no rotated token vanishes unnoticed," and this
  relocation honors that redefinition. The locked-device remainder is honestly
  NOT RUN / NOT CLAIMED with a named Phase B device test.

The retained on-demand refresh therefore **partially reopens** what the flag
closed: not the self-scheduling it eliminated, but the recovery-refresh probe
(probe 2) that the `_recoverAndRefresh` gate appeared to close. The door moved,
and the foreground gate does not stand in front of the new one.

Detectability of an unpersisted rotated session holds on native **because the
observer sits at the write, not at the call path** — every failing `setItem`
through the singleton adapter sets the flag regardless of which internal path
initiated the refresh, and the flag survives auth-js's own error handling. The
web platform is the honest gap: there the observer does not exist, and the
ADR-007 sentence claiming surfacing is platform-unqualified.

Forced re-authentication is **proportionate and not remotely inducible**; the
mechanism should exist in this shape. The defects are in the initiation
boundary and one decision-text qualification, not in the remedy.

## Review boundary and preconditions

- `HEAD` and `origin/feat/auth-session-v1` pinned to
  `7bea41c4f8b769ce0e602ea290c2d6b7d8a413ea`; the working tree contained only the
  reviewer-of-record's then-uncommitted `REVIEW-021.md` and HANDOFF edits,
  which this record does not touch and this commit does not include.
- The `feat/auth-session-v1` LOCK block names this seat, names Codex Sol as
  reviewer of record, and reads `Status: REVIEW` at the target — the
  controller's own `7bea41c` reconciliation. Precondition satisfied.
- Pinned `@supabase/auth-js` 2.112.3 verified present in `node_modules`; every
  library-behaviour citation below was read from the installed source, not
  asserted from comments.
- No live Supabase call, no credential read, no device. Phase A, offline, as
  the unit is scoped.

## Q1 — does removing self-scheduling eliminate the three probes or relocate them?

**Two relocations, one elimination.** Detail per probe:

| Probe (REVIEW-020 finding 1) | Fate at `7bea41c` | Verification |
|---|---|---|
| 1. Initialization restarts the ticker after a background stop | **Eliminated.** The ticker mechanism no longer exists. `_handleVisibilityChange` starts it only under `if (this.autoRefreshToken)` (`GoTrueClient.js:4693`); the flag is false at construction (`supabase.ts:58`); nothing in `src/` calls `startAutoRefresh`/`stopAutoRefresh` (grep over non-test sources), and `auth-provider.test.tsx:330-343` asserts the calls never occur | Direct source read; grep; committed test |
| 2. Expired stored session produces a recovery refresh after the stop | **Relocated.** `_recoverAndRefresh`'s refresh is gated (`:4104`) and dead, but the same load-and-margin-refresh executes through `_emitInitialSession` → `_useSession` → `__loadSession` (`:3640`, `:2477`, `:2496`) when the provider registers its auth listener at mount (`auth-provider.tsx:107`), and through the bootstrap `getSession()` (`auth-provider.tsx:117`). Neither path consults `autoRefreshToken`, the foreground gate, or AppState | Direct source read; see finding 1 |
| 3. In-flight refresh persists after the stop | **Relocated with handling.** There is no stop to race. A refresh initiated while foreground can still complete after backgrounding — the window is one network round trip, unclosable without the cancellation API auth-js lacks. The failed write now sets the persistence-failure flag at the write itself (`session-storage.ts:100-118`), and the evaluation that awaited the settle takes the flag and forces re-authentication (`auth-provider.tsx:191-196`) | Direct source read; `foreground-refresh.test.ts:122-146` |

Probe 1 is gone for the reason ADR-007 named: the option removes the restart
path rather than racing it. Probe 3's relocation is the decision working as
written. **Probe 2's relocation is the defect** — see finding 1. The consequence
is the ADR-005 hazard class through a new door: a mount with a near-expiry
stored session refreshes and writes without any foreground gate. In v1 no
background-launch mechanism exists, so a backgrounded mount is theoretical —
but the clause ADR-007 states is not enforced, and the boundary claims in
`supabase.ts` and the 005c README are false as written, not merely unproven.

## Q2 — does the retained on-demand refresh in `getSession()` reopen what the flag closed?

**Partially: the door it reopens is not the one the flag closed.** The flag
closed two things: the visibility ticker and the `_recoverAndRefresh` recovery
refresh. Both remain closed. The on-demand refresh inside `__loadSession` is not
self-scheduling — it fires only when that function runs — so `autoRefreshToken:
false` correctly leaves it alive for the foreground-gated `getSession()` calls
(`auth-provider.tsx:192`).

What the branch's documentation understates is that `__loadSession` runs on more
than application `getSession()` calls. Listener registration runs it through
`_emitInitialSession` without any application auth call — an internal
re-entrance the pinned source's own comment acknowledges ("very eager users of
`getSession()` — like realtime-js", `GoTrueClient.js:2516-2519`, refresh within
margin regardless of the flag). Registration happens in the provider's bootstrap
effect at mount, unconditionally with respect to AppState. The two app-level
refresh-capable entrances that ARE the design (bootstrap `getSession` at `:117`,
the gate at `:192`) are joined by this third, un-gated one.

So: the self-scheduling door stays shut; the recovery-refresh door that
`_recoverAndRefresh`'s gate appeared to shut is open again one room over, and
the foreground gate is not standing in front of it. The enforcement of
"foreground-gated" for the on-demand path rests on app discipline — exactly two
named call sites — which the committed tests assert by call count, but nothing
in the library or the gate forbids the registration-triggered path.

## Q3 — is an unpersisted rotated session detectable in every path it can arise?

**On native: yes, by construction — detection is at the write, not at the
initiator.** `observingWrites` wraps the single module-scope adapter instance
handed to the client (`session-storage.ts:138-139`), so every `setItem` the
library performs — gated refresh, bootstrap refresh, listener-emission refresh,
`verifyOtp` persist — sets the flag on refusal before rethrowing
(`session-storage.ts:103-115`). The flag is checked after the settle whether or
not it rejected (`foreground-refresh.ts:91-106`), so detection does not depend
on auth-js propagating the failure; even a swallowed rejection leaves the flag
set. This is the property that makes the probe-2 relocation survivable: a
listener-emission refresh whose write is refused while backgrounded still ends
in forced re-authentication at the next foreground evaluation. The untested
compositions (listener-emission failure, bootstrap-refresh failure at a
backgrounded mount) are mechanically sound for the same reason; the flag
persists until taken or until a successful write clears it.

The gaps are real and two:

- **Web is unobserved.** `Platform.OS === 'web'` yields `undefined`, so
  `supabase-js` uses its own `localStorage` and the observer never sees the
  write (`session-storage.ts:138-139`). A quota-exceeded write of a rotated
  session on web is the exact silent loss ADR-007 exists to prevent — the
  decision's sentence "a refresh whose persistence fails is surfaced" is
  platform-unqualified. The code discloses the scope; the ADR text does not.
- **The removal-refusal residual.** If forced re-authentication's own
  `signOut` removal also fails, the superseded session survives on disk
  (`auth-provider.tsx:144-160`, disclosed). The next cold start reads it,
  margin-refreshes with the superseded refresh token, and trips Supabase's
  reuse detection — the day-later family revocation the design exists to avoid.
  Nothing at this layer can force a refusing store; the residual is inherent
  and disclosed, but it makes forced re-authentication a mitigation rather
  than a complete remedy in the persistent-refusal case.

## Q4 — is forced re-authentication proportionate, or an inducible denial of service?

**Proportionate, and not remotely inducible.** The trigger is strictly a
refused session write; a settle that fails for any other reason does not
re-authenticate (tested at `foreground-refresh.test.ts:161-173` and
`auth-provider.test.tsx:399-409`). A remote attacker controls none of the
conditions that can set the flag: a refresh fires only within the 90s
`EXPIRY_MARGIN_MS` on a transition the user's device lifecycle produces; the
write is refused only by device-local state (lock, keychain condition); the
margin window itself is server-issued and TLS-bound. A local attacker with
device control can already do worse than force an OTP round trip. The realistic
incidence is a user's own background/lock straddle near expiry — bounded, and
an OTP round trip is the harm ADR-007's consequences explicitly price in.

The alternative is worse. Continuing against an unpersisted rotated session
leaves a superseded refresh token on disk whose next use ends in reuse
detection: the whole family revoked, later, across all devices, with no
diagnostic trail. Forced re-authentication converts that into an immediate,
local, explainable recovery — and it stays device-local (`scope: 'local'`
asserted at `auth-provider.test.tsx:427`), so the remedy never revokes other
devices. This mechanism should exist in this shape.

Two refinements are recorded, not required. First, the design re-authenticates
immediately without attempting to re-persist the healthy in-memory session on
the next foreground (a `refreshSession()` retry would spare some users an OTP
when the refusal was the transient locked-device moment; its cost is a second
rotation and a crash window). The fail-closed choice is defensible. Second,
the trigger fires once per refused write by read-and-clear semantics
(`session-storage.ts:70-81`), so a re-auth loop cannot self-sustain.

## Findings

### 1. HIGH — probe 2 is relocated into the listener-emission path, not eliminated

**Class:** DEFECTS_FOUND — the ADR-007 foreground-only clause is not
implemented at this head. Verdict-driving for this advisory.
**Files:** `src/lib/auth/auth-provider.tsx:91-131`;
`src/lib/supabase.ts:42-57`;
`src/lib/auth/foreground-refresh.ts:14-18`;
`docs/05-quality/evidence/005c-auth-session-fix2/README.md` claim 2.

The chain, verified in the installed pinned source: `onAuthStateChange`
registration (`GoTrueClient.js:3615-3636`) awaits `initializePromise`, then
calls `_emitInitialSession` (`:3640`) → `_useSession` (`:2477`) →
`__loadSession` (`:2496`), which calls `_callRefreshToken` whenever the stored
access token is inside `EXPIRY_MARGIN_MS` (`:2521-2547`). No check on that
path consults `autoRefreshToken` — the flag gates `_recoverAndRefresh`
(`:4104`) and the ticker (`:4693`) only. The provider registers the listener
at mount, before the foreground gate's evaluation and unconditionally with
respect to AppState (`auth-provider.tsx:105-111`); the bootstrap `getSession()`
(`:116-124`) is a second ungated entrance. A mount with a near-expiry stored
session therefore refreshes and writes without any foreground gate — the
recovery-refresh probe REVIEW-020 demonstrated, through a new door.

The committed tests cannot observe this: they replace the auth client with a
mock (`auth-provider.test.tsx:12-24`), so the emission path never runs, and
the call-count assertions measure the two app entrances, not the internal one.
The claims the branch makes ("construction no longer refreshes a stored
session", `supabase.ts:44-50`; "this is the only place that initiates one",
`auth-provider.tsx:168-169`; gate module is "the single place that asks",
`foreground-refresh.ts:17`) are false as written. The defect is the same class
the branch already met twice: a claim standing ahead of its instrument.

Remedy direction, app-side and consistent with ADR-007: make the foreground
gate own every entrance into `__loadSession` — defer both the listener
registration and the bootstrap `getSession()` until the first AppState
`active` (the gate already defers its own evaluation), or narrow the ADR-007
clause to name load-time recovery as an explicit exception whose failed
persist is surfaced. The surfacing half already covers this path, so the
observer and forced re-authentication survive the fix unchanged.

### 2. LOW — ADR-007's surfacing sentence is platform-unqualified

**Class:** decision-text/implementation mismatch; not verdict-driving on its
own.
**Files:** `docs/03-decisions/ADR-007-refresh-lifecycle.md:56-59`;
`src/lib/auth/session-storage.ts:50-58,138-139`.

The mechanism "a refresh whose persistence fails is surfaced" exists on native
only. Web delegates to `localStorage` unobserved, where the analogous refusal
(a quota-exceeded write of a rotated session) is silently lost — the exact
failure the decision exists to prevent. The code discloses the scope honestly;
the ADR sentence carries no qualifier. Recommend the controller narrow the
sentence (the ruling-16 mechanism used for ADR-007 itself) or record explicit
acceptance, and name a synthetic web-quota probe for the next unit that
touches auth storage.

## Directed assessments that are not findings

### The remedy shape should survive

The combination — no self-scheduling, a foreground gate for app-initiated
refreshes, a write observer, forced local re-authentication on refused
persist — is the right architecture for the constraint the pinned library
imposes. Nothing in this record argues for returning to
`startAutoRefresh`/`stopAutoRefresh` gating; REVIEW-020's probe methodology
proved that shape unenforceable, and the verification above shows the flag
genuinely closes the ticker and `_recoverAndRefresh` paths.

### The reviewer-of-record boundary

Codex Sol's REVIEW-021 record (uncommitted in the working tree at the time of
this review, dated 2026-08-25, verdict FAIL) reaches the same root — the
foreground-only clause is not implemented — by its own probes. Where the RoR
attributes an auth-listener registration to `supabase-js` at construction,
this advisory verified the shipped `supabase-js` registers no auth listener
(`dist/module` sources contain no `onAuthStateChange` registration); the
verified trigger is the app's own registration at `auth-provider.tsx:107`.
The consequence is identical; the mechanism differs. The controller should
read the two records against each other on this point.

### Proportionality, restated

Forced re-authentication is the correct response to a refused persist: the
session is already unrecoverable across restarts, the on-disk token is
superseded, and the alternative is family-wide revocation with no trail. It is
not remotely inducible. The mechanism should exist in this shape.

## Conclusion

**Verdict: DEFECTS_FOUND.** Of the three REVIEW-020 probes, one is eliminated
(the ticker), one is relocated with principled handling (the in-flight write,
now surfaced), and one is relocated into an ungated load-time path (the
recovery refresh, via listener-registration emission and the bootstrap
`getSession()`). The on-demand refresh partially reopens the door the flag
appeared to close. Detectability of a lost rotated session holds on native by
construction, with web unobserved and the removal-refusal residual disclosed.
Forced re-authentication is proportionate and not remotely inducible. The
shape is right; the boundary is not — fix the initiation boundary, do not
abandon the shape.

Advisory carries no merge authority. The controller adjudicates against the
reviewer-of-record record.
