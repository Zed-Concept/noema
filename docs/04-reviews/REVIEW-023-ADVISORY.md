# REVIEW-023-ADVISORY — Unit E session durability mechanism

**Date:** 2026-08-26
**Controller:** CTRL-006 Auth Phase B and session durability
**Seat:** DeepSeek V4 Pro — the advisory reviewer, the controller's single pick
(the ADR-001 auth-surface trigger), fresh session, reasoning at the harness
maximum. Same harness as REVIEW-021-ADVISORY.
**Authority:** advisory. No verdict. These findings are leads the controller
adjudicates against the reviewer of record's REVIEW-023; the RoR decides
within scope (AGENTS.md). I have **not read REVIEW-023.md** and reference
nothing from it.

**Target (code under review):** `caa31ee2ff77331d7ab976bff5bb7bb4588244c9`
**Probed at (worktree checkout):** `501c1635dfb8f9158e07d690279aec6b0acff3d1`
— the dispatch's CHECKOUT pin; it is the target plus exactly one
controller state commit (`docs(state): Unit E LOCK BUILD -> REVIEW; REVIEW-023
named`, touching BRANCH-NOTES.md only). Ancestry verified:
`merge-base --is-ancestor caa31ee 501c163` → product code identical.
**Base:** `7caf23e10856601f17d52ae37ae59fbb9dbbac60` — verified ancestor.
**Scope:** the durability mechanism only — ADR-009 requirements R1–R3 as
restated by the dispatch. Not the evidence system, not governance, not style.

**Branch state at commit time (disclosure).** The branch advanced past the
dispatch pin while this advisory ran: the reviewer of record landed
REVIEW-023 and the LOCK moved REVIEW → BUILD (fix cycle 1). This record was
rebase-pulled onto the origin tip before committing; every claim below names
the tree it was probed against — the dispatch target, not the in-flight fix.

---

## Method — probe, do not read

Learning 20 and this dispatch's METHOD clause: every claim about the pinned
package's behaviour names the probe that produced it; anything without a probe
is labelled **unverified** in this record itself. No claim below derives from
reading `@supabase/auth-js` or `@supabase/supabase-js` source. App-owned code
(`src/lib/auth/*`, `src/lib/supabase.ts`) is the code under review and is read
and cited by line.

**The instrument.** A single throwaway jest suite — the real pinned client
(`@supabase/supabase-js@2.112.3` from the lockfile) constructed through the
app's own `src/lib/supabase.ts`, over the app's own
`observingWrites`/adapter/`reauth-demand` composition, with switchable
in-memory fakes beneath: a fake keychain (per-operation write/delete/read
refusals, attempt counters), a fake demand file store (refusals, a
`File.exists`-lies switch), a fake auth server (verify/token/logout endpoints,
rotating `refresh_token` on every token call, optional `400 invalid_grant`),
and a global timeline every fake and every `onAuthStateChange` event stamps.
9 tests: A2, A3, B2, C3, D4a, D4b, D4c, D4e, E1. Full source in Appendix A,
sha256 `8294ba9d5cf6b05c02ed009c8195f0fa8eaf81c63ecd79fc3d3d48064dcb0609`.

**How it was run.** Worktree at the checkout pin, `npm ci` from the committed
lockfile, then `npx jest --ci --runInBand src/__tests__/zz-advisory-probe.test.tsx`.
The file was deleted before committing; nothing of the probe remains in the
tree. Full jest output was captured at run time; every excerpt quoted below is
from that transcript.

**Result: 8 of 9 tests PASS.** D4a does not pass — and that failure is itself
the recorded observation (see Q4): jest's own unhandled-rejection detector
reports **two** `adv-refused-session-write` rejections from that schedule.

**Independent confirmation of the committed suite, same tree:**

- The committed finding-3 probe rerun at the checkout pin: **base `7caf23e1`
  RED (exit 1), head GREEN (exit 0), runner exit 0** — the two-tree contract
  reproduced as committed.
- Gates at the pin: `typecheck` 0 errors; `lint` pass; `npm test` — the 10
  committed suites all pass (159 tests; the probe suite added 9 of which the
  one D4a observation fails); `format:check` flagged only the throwaway probe
  file itself (now deleted), nothing else.

---

## Probe outputs — verbatim excerpts

```
A2  ADV A2 timeline after flip: ["keychain-write-refused","demand-recorded:session-write-refused","event:TOKEN_REFRESHED:rot1","demand-recorded:session-purge-pending","keychain-write-refused","demand-recorded:session-write-refused","event:TOKEN_REFRESHED:rot2", (513× "keychain-delete-refused")]   [truncated at 513 delete refusals]
A2  ADV A2 unhandled adv-refused-session-write: 0
A2  ADV A2 final state: signedOut
A3  ADV A3 verifyOtp error: null
A3  ADV A3 timeline after flip: ["event:INITIAL_SESSION:none","keychain-write-refused","demand-recorded:session-write-refused","event:SIGNED_IN:v1"]
A3  ADV A3 state now: signedIn
A3  ADV A3 key space size: 0
B2  ADV B2 verifyOtp error while demand outstanding: null
B2  ADV B2 state after that sign-in: signedOut
B2  ADV B2 demand still present: true
B2  ADV B2 deletes in the purge: 2053
B2  ADV B2 demand files after purge: 0
B2  ADV B2 key space after purge: 0
B2  ADV B2 state after purge: signedOut
B2  ADV B2 restart: everSignedIn: true
B2  ADV B2 restart: demand files: 0
B2  ADV B2 restart: key space: 2
C3  ADV C3 rotations consumed: 3
C3  ADV C3 key space after recovery: 0
C3  ADV C3 client-held session after recovery: null
E1  ADV E1 demand file present during consult: true
E1  ADV E1 everSignedIn with a demand on disk: true
E1  ADV E1 transitions: [{"status":"signedIn","tag":"adv-access-rot1"}]
D4a ADV D4a evaluate outcome: settled
D4a ADV D4a timeline after flip: ["keychain-write-refused","demand-write-refused","demand-write-refused","keychain-write-refused","demand-write-refused","keychain-write-refused","demand-write-refused"]
D4a ADV D4a demand files (0 = durability lost): 0
D4a ADV D4a delete attempts delta: 0
D4a ADV D4a unhandled reasons: []
D4a ADV D4a final state: signedOut
D4a (jest itself) two unhandled 'adv-refused-session-write' rejections — the test fails on them
D4e ADV D4e delete attempts after first purge: 514
D4e ADV D4e delete attempts after retry: 1027
D4e ADV D4e demand still present: 1
D4e ADV D4e final state: signedOut
D4b ADV D4b getSession outcome: settled
D4b ADV D4b delete attempts during refresh: 0
D4c ADV D4c getSession outcome: settled
D4c ADV D4c delete attempts on the failure path: 0
D4c ADV D4c unhandled reasons: []
```

Every line above is console output from the probe run at `501c1635`, not an
interpretation. The D4a "unhandled reasons: []" line reflects the probe's own
process-level capture being starved by jest's test-environment interception;
jest's own detector is the one that reports the two rejections, in the same
form the committed base probe's two unhandled rejections appear.

---

## Q1 — Under what schedule can a demand in the file-system store be lost or ignored?

Four schedules matter. Two are **lost**, one is **ignored**, one is safe.

**L1 — death between refusal and record (LOST).** The observer records the
demand only after the keychain refusal has surfaced
(`session-storage.ts:161-174`): `await inner.setItem` rejects → `await
demand.record` → flag → absorb. The window between the refusal and the
completed record is non-atomic — the builder discloses this as Known limit 7.
A process death in that window leaves the superseded session on disk with no
demand; the next process consults, finds nothing, bootstraps, loads and
refreshes the residual, and only Supabase's server-side refresh-token reuse
detection contains it. Probe support: A2/D4a timelines show
`keychain-write-refused` and the demand write as distinct, adjacent events —
the window is real; its crash-half is unprovable in jest (no OS death), so the
consequence chain after the death is **unverified by probe** and rests on the
server backstop, as the disclosure says. This is the irreducible residue of
any write-ahead-free design; disclosed, bounded, not new.

**L2 — the file system refuses the record (LOST, per event).** D4a: both
providers refusing → the claim-15 fallback rethrows. Full schedule observed:
the provider settles to `signedOut` (fail-closed in-process, purge retried on
every foreground — timeline shows the write-refusal/demand-refusal pair three
times across evaluations), **demand files: 0** — durability across restart is
lost for that event. In-process safety holds; the restart outcome is L1's
backstop. Disclosed exactly (claims 13/15/18 name the fallback); the probe
confirms the disclosure's numbers: 0 durable records, retries working,
`evaluating` never parked.

**L3 — the file system refuses at consult (IGNORED, one vector).** Two cases,
split by the shipped backend's `File.exists` gate (`reauth-demand.ts:126`):
a refusal that *throws* propagates → `isOutstanding()` rejects → the provider
treats it as outstanding (fail-closed; committed claim-9 instruments cover
this). But a refusal that *reads as `exists === false`* returns `null` →
consult answers "no demand" → the provider bootstraps and exposes the
residual. Probe **E1** demonstrates the consequence over the shipped code
path: demand file present, `exists` lying false → `everSignedIn: true`, state
`signedIn` with `adv-access-rot1` — the residual loaded *and rotated* by the
client's own construction-time entrance. The premise (can the installed
`expo-file-system` report `exists === false` under an I/O refusal rather than
throw?) is **NOT RUN** — offline, no device; the builder's Known limit 9 says
the same, and Phase B owns it. Caveat for calibration: the probe's fake server
grants every rotation; on the real server the load-refresh of a superseded
token meets reuse detection and fails, so the practical consequence of a
missed demand degrades to the server backstop rather than a live usable
session. The app-level guarantee, however, is gone under this schedule —
claim 7's property does not hold here.

**L4 — keychain refuses, file store healthy (NO LOSS).** D4e: deletes refused
with a healthy demand store → first purge sweeps 514 deletes (all refused),
retry sweeps another 513 (1027 total), demand survives (`demand still
present: 1`), state `signedOut`, machinery settles every time. The two-provider
split does exactly what the design intends: the keychain's lock-state failure
cannot silence the record of itself.

No other loss path was found. In particular the two demand reasons
(`session-write-refused`, `session-purge-pending`) overwrite each other
without losing the outstanding property, and a successful write clears
nothing (claim 16's direction, M14-instrumented).

**Q1 answer:** the demand is lost on L1 (crash window, backstop-bounded) and
L2 (file-store refusal at record, per event); it is ignored on L3's
`exists`-lies variant (Phase B premise, consequence proven here); every other
probed schedule honours it.

---

## Q2 — Is there any path on which the provider exposes a session while a demand is outstanding?

**Yes — two, both bounded; and one adjacent near-miss worth knowing about.**

**P1 — the auth listener (the main vector).** Probe **A2**: with a demand
consulted-clean at bootstrap and the keychain then refusing, the timeline is
`keychain-write-refused → demand-recorded:session-write-refused →
event:TOKEN_REFRESHED:rot1 → demand-recorded:session-purge-pending →
keychain-write-refused → demand-recorded → event:TOKEN_REFRESHED:rot2 →
(513 delete refusals)`. The demand is recorded **before** the event carrying
the rotated session fires; the app's listener sets state unconditionally on
any event (`auth-provider.tsx:156-160` — no demand check), so the provider
exposes `signedIn` holding the rotated, **unpersisted** session until
`requireReauthentication`'s `setState(signedOut)` lands after the purge.
Window = the purge's duration (a real network `signOut` plus a 513-read
read-back on device; sub-millisecond only under the in-memory fakes, which is
why the committed probe's polling never sees it). The demand-at-bootstrap
schedule (claims 7–8's scope) stays closed — the committed probe and my B2
both confirm never-signedIn there. The mid-process schedule is **unclaimed**,
and it is real.

**P2 — the refused sign-in persist.** Probe **A3**: `verifyOtp` returns
`error: null` while the keychain refused the persist — auth-js believes the
session persisted — and the timeline is `keychain-write-refused →
demand-recorded → event:SIGNED_IN:v1`, with the provider ending `signedIn`
and the key space at **0**. A session that exists nowhere on disk is exposed
as current, with a durable demand outstanding. Bounded: the next foreground
evaluation takes the flag → `requireReauthentication` → purge → signedOut.
This is Known limit 10's disclosed divergence, now observed end-to-end.

**P3 — near-miss (reported for the controller's picture, not a defect).**
Probe **B2**, demand outstanding at mount: the provider registers **no
listener and no bootstrap** (correct — nothing to expose), so a fresh sign-in
while the demand is outstanding returns `error: null` but is **invisible**
(state stays `signedOut`), and the next purge **destroys the freshly minted
session** (2053 deletes observed — the derived `_removeSession` cost, an
independent confirmation of the 005d derivation's magnitude class). Demand
cleared, second sign-in works, restart restores normally (`everSignedIn:
true`). The design's disclosed cost ("one conservative re-authentication",
006a Known limit 2 / claim 16) is in fact **one consumed sign-in**: the user
experiences a successful sign-in that never takes effect. Safe direction,
honest to name the UX hazard.

**Q2 answer:** yes — P1 (listener, rotated unpersisted session) and P2
(refused sign-in persist) expose sessions while a demand is outstanding; both
close at the next evaluation's purge-and-signOut, and neither survives a
restart (the demand gates bootstrap there). P3 is the demand-at-mount variant
working as claimed, at a UX cost slightly stronger than the disclosure's
wording.

---

## Q3 — The absorb-and-record adapter: auth-js believes the rotated session persisted, the refresh token is consumed server-side, and the app then holds neither session. Can this state occur, and is it acceptable under ADR-009?

**It occurs; the probes produced exactly it; and it is acceptable — it is the
ADR's terminal state, not a divergence from it.**

The state is assembled from the observed pieces:

- **auth-js believes persisted:** A3 — refused sign-in persist, `verifyOtp`
  `error: null` (and A2's absorbed refresh write produces no rejection at
  all: `unhandled …: 0`, `final state: signedOut` via the flag path, not an
  error path). The absorb works as designed.
- **Refresh token consumed server-side:** the fake server's token endpoint is
  the server in this composition; C3 logs `rotations consumed: 3` across the
  schedule — the rotation that was never stored happened server-side. (Live
  Supabase consumption is NOT RUN — Unit F — and the fake server does not
  model reuse detection; the rotation fact is what the probe can prove.)
- **The app then holds neither session:** C3 — after recovery, key space 0,
  demand cleared, `getSession()` returns `null` (client-held session: null).
  Recovery is exactly one OTP (C3's closing sign-in succeeds).

**Acceptable under ADR-009: yes.** ADR-009's guarantee *is* "any rotated
session that cannot be persisted is detected and forces re-authentication,
durably across process restart." Forced re-authentication is the designed
terminal state; the app holding neither session is what "forces
re-authentication" looks like on the ground. The alternative — keeping the
in-memory rotated session usable and hoping the disk catches up — is the
family-revocation-with-no-diagnostic-trail failure ADR-009 exists to prevent.
The cost is one OTP entry; the benefit is that no process ever continues on a
superseded token. This advisory sees no ADR-009 violation in the mechanism;
the state is the requirement working.

One calibration, not an objection: the probe's fake server granted
`rot2`/`rot3` unconditionally, so the probe cannot show what the real server
does to the family meanwhile. That gap is Unit F's, named, not hidden.

---

## Q4 — Deferred stranding under double refusal: durability or availability?

**The probe cannot find the hang; the disclosed stranding schedule did not
reproduce in any of four attempts. What double refusal does produce is
observed, and it splits the classification.**

Attempts to reproduce the Known-limit-11 premise ("deletes refused during
`_callRefreshToken`'s internal cleanup leaves its refresh Deferred pending"):

- **D4b** — deletes refused, writes healthy, plain `getSession()` on a
  near-expiry session: `settled`; **0 delete attempts occur on the refresh
  path at all**. Whatever deletes the premise names, a successful refresh
  performs none through this composition.
- **D4c** — server `400 invalid_grant` (the reuse-detection response) with
  deletes refused: `settled`; **0 delete attempts** on the failure path; 0
  unhandled rejections. No removal is attempted, nothing hangs.
- **D4e** — deletes refused during the observed purge (the only path that
  actually issues deletes — 514 per sweep): signOut's `_removeSession`
  sweeps, the adapter rejects, `observedPurge` catches, the read-back answers
  false, the demand stays, the evaluation settles, the retry works. No
  hang, durability intact.
- **D4a** — both providers refusing: evaluation `settled`, final `signedOut`,
  retries observed; the only abnormal outputs are the two unhandled
  rejections and the absent durable record (see below).

So the stranding described in Known limit 11 remains **source-read,
unreproduced by probe** — the exact status the builder's disclosure assigns
it ("a probe, not a reading, would settle it" — four schedules probed, none
settled against the hang). This advisory does not claim the hang cannot
exist; it claims no probed schedule produced it, and it names D4b/D4c as the
two most direct attempts.

**Classification of what double refusal actually does (D4a):**

- **Availability:** the provider machinery never parks. `evaluating`
  releases, every foreground retries the purge, the UI reaches `signedOut`
  and stays there. The hang-hazard, if it ever exists, is process-local and
  restart-recoverable — the durable demand gates the next process's
  bootstrap, **when the demand landed**.
- **Durability:** lost in exactly this schedule. D4a: `demand files: 0`
  after a full schedule of refused writes — the demand store is the second
  provider and it refused, so no record exists to survive the restart. The
  builder's Known-limit-11 sentence "the durable demand is recorded before
  any such hang" is true only for the demand-store-healthy variant; under
  both-providers-refusal the demand is *not* recorded, and a death anywhere
  in that loop lands in Q1's L1/L2 territory.
- **The third dimension the question does not name:** D4a produces **two
  unhandled `adv-refused-session-write` rejections** (jest's detector — the
  same count REVIEW-022 observed at the base). The claim-15 fallback
  "re-enters the pre-ADR-009 rejection path, with its known unhandled
  rejections" is **confirmed exactly**, including the count. This is a
  crash-surface cost, disclosed, and the price of the honest fail-closed
  fallback; it is the one schedule where claim 18's zero-unhandled boundary
  does not apply (claim 18's wording already names that boundary).

**Q4 answer:** durability-or-availability is the wrong disjunction for the
observed reality — the probed double-refusal schedules lose **durability**
(D4a: no record, unhandled-rejection pair, retry loop that can never purge
while signOut aborts pre-removal: `delete attempts delta: 0`) while
**availability** holds throughout (nothing hangs, nothing parks, the user
reaches a truthful signed-out). The hypothetical Deferred-hang would be an
availability defect *on top of* the observed durability loss, and it is the
part that remains unprobed.

---

## Leads for the controller (advisory; for adjudication against REVIEW-023)

1. **P1 — the listener exposes an unpersisted rotated session while the
   demand is outstanding** (A2). Claim 7's instrument covers only the
   demand-at-bootstrap schedule; the mid-process schedule is unclaimed and
   demonstrated. Options for the fix cycle, if the RoR has not already
   bounded it: a demand check in the listener (cheap, direction-correct), or
   an explicit claim narrowing to bootstrap-scope with the window named.
2. **L3/E1 — the `File.exists` consult gate.** The consequence of the
   unverified native semantics is now demonstrated at the app level (residual
   loaded, rotated, exposed). The premise is Phase B's; the lead is that the
   consequence is no longer hypothetical — calibrating the named
   physical-device test to include an I/O-refusal consult would close it.
3. **P3 — the consumed sign-in.** Disclosure wording says "one conservative
   re-authentication"; the probe shows one sign-in that reports success and
   never takes effect, then is destroyed by the purge. UX hazard, safe
   direction; worth an explicit ACCEPT-AND-RECORD sentence.
4. **Q4/D4a — the Known-limit-11 "demand recorded before the hang" sentence
   is false for the both-providers-refuse variant** (0 demand files observed).
   If the RoR's record cites that sentence unqualified, this probe is the
   counterexample; the fix is a qualifier, not a mechanism change.
5. **D4a's two unhandled rejections confirm claim 15's fallback at exactly
   the count REVIEW-022 saw at the base** — the fallback disclosure is
   accurate; nothing to fix, but the number is now measured rather than
   inherited.
6. **The stranding hang (Known limit 11) did not reproduce in four schedules**
   (D4b/D4c show zero deletes on the refresh path at all). If the controller
   is weighing whether the hang hazard justifies further fix-cycle budget,
   the probed evidence says the budget would be buying against a premise the
   probes could not reach. Leave as recorded-availability-risk or schedule a
   targeted probe for Unit F; do not charge Unit E for it on this evidence.

---

## What this record does NOT claim

- No live Supabase behaviour: the fake server grants rotations
  unconditionally and models no reuse detection; rotation consumption is the
  only server-side fact probed. Unit F owns the rest.
- No locked-device or real-file-system behaviour: all stores are in-memory
  doubles; `expo-file-system`'s native `exists` semantics remain NOT RUN.
- No verdict, no merge authority, no claim about REVIEW-023's contents —
  this advisory was written without reading it.
- Nothing about the evidence system, governance, or style — out of scope by
  dispatch.

---

## Appendix A — the probe source (sha256
`8294ba9d5cf6b05c02ed009c8195f0fa8eaf81c63ecd79fc3d3d48064dcb0609`)

Rerunnable at the pin: place this file as
`src/__tests__/zz-advisory-probe.test.tsx` in a worktree at `501c1635` with
dependencies from the committed lockfile, then
`npx jest --ci --runInBand src/__tests__/zz-advisory-probe.test.tsx`.
Expected: 8 pass, D4a fails with jest reporting two unhandled
`adv-refused-session-write` rejections (the finding recorded above).

```tsx
/**
 * REVIEW-023-ADVISORY probe — DeepSeek V4 Pro, CTRL-006. Round 2.
 *
 * NOT a committed repo file: run from a scratch copy, then discarded.
 * Real pinned @supabase/supabase-js 2.112.3 through the app's own modules,
 * switchable in-memory fakes for the two providers (keychain, demand file),
 * fake auth server. No network, no credential.
 */

import type { ReactNode } from 'react';
import type * as RTL from '@testing-library/react-native';
import type * as AuthProviderModule from '@/lib/auth/auth-provider';

process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

// ---------------------------------------------------------------- fakes

const mockKeychain = {
  map: new Map<string, string>(),
  refuseWrites: false,
  refuseDeletes: false,
  refuseReads: false,
  writeAttempts: 0,
  deleteAttempts: 0,
  readAttempts: 0,
};

const timeline: string[] = [];
const mark = (what: string) => {
  timeline.push(what);
};

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'whenUnlocked',
  getItemAsync: async (key: string) => {
    mockKeychain.readAttempts += 1;
    if (mockKeychain.refuseReads) throw new Error('adv-refused-read');
    return mockKeychain.map.has(key) ? (mockKeychain.map.get(key) as string) : null;
  },
  setItemAsync: async (key: string, value: string) => {
    mockKeychain.writeAttempts += 1;
    if (mockKeychain.refuseWrites) {
      mark('keychain-write-refused');
      throw new Error('adv-refused-session-write');
    }
    mockKeychain.map.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockKeychain.deleteAttempts += 1;
    if (mockKeychain.refuseDeletes) {
      mark('keychain-delete-refused');
      throw new Error('adv-refused-delete');
    }
    mockKeychain.map.delete(key);
  },
}));

const mockDemandFiles = new Map<string, string>();
const demandControls = {
  /** Refuse every demand-store operation (the "second provider refuses"). */
  refuseAll: false,
  /** Simulate the unverified native semantics of Known limit 9:
   * `File.exists` returns false even though the file exists. */
  lieExists: false,
};

jest.mock('expo-file-system', () => {
  class MockFile {
    private readonly name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists(): boolean {
      if (demandControls.refuseAll) throw new Error('adv-demand-io-refusal');
      if (demandControls.lieExists) return false;
      return mockDemandFiles.has(this.name);
    }
    textSync(): string {
      if (demandControls.refuseAll) throw new Error('adv-demand-io-refusal');
      const value = mockDemandFiles.get(this.name);
      if (value === undefined) throw new Error('adv-demand-file-absent');
      return value;
    }
    write(value: string): void {
      if (demandControls.refuseAll) {
        mark('demand-write-refused');
        throw new Error('adv-demand-io-refusal');
      }
      const reason = value.includes('session-write-refused')
        ? 'session-write-refused'
        : value.includes('session-purge-pending')
          ? 'session-purge-pending'
          : 'other';
      mark(`demand-recorded:${reason}`);
      mockDemandFiles.set(this.name, value);
    }
    delete(): void {
      if (demandControls.refuseAll) {
        mark('demand-delete-refused');
        throw new Error('adv-demand-io-refusal');
      }
      mark('demand-cleared');
      mockDemandFiles.delete(this.name);
    }
  }
  return { File: MockFile, Paths: { document: {} } };
});

const PROBE_URL = 'https://adv-probe.example.test';
const fetchLog: string[] = [];
let rotationCount = 0;
let tokenEndpointFailsWithInvalidGrant = false;

function fakeUser() {
  return {
    id: 'adv-user-id',
    aud: 'authenticated',
    email: 'adv@example.test',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
  };
}

function fakeSessionBody(tag: string, expiresIn: number) {
  return {
    access_token: `adv-access-${tag}`,
    token_type: 'bearer',
    expires_in: expiresIn,
    refresh_token: `adv-refresh-${tag}`,
    user: fakeUser(),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'adv',
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

globalThis.fetch = (async (input: unknown) => {
  const url = String(input);
  fetchLog.push(url.replace(PROBE_URL, '').split('?')[0]);
  if (url.includes('/auth/v1/verify')) {
    return jsonResponse(fakeSessionBody('v1', 60));
  }
  if (url.includes('/auth/v1/token')) {
    if (tokenEndpointFailsWithInvalidGrant) {
      return jsonResponse({ error: 'invalid_grant', error_description: 'adv-reuse' }, 400);
    }
    rotationCount += 1;
    return jsonResponse(fakeSessionBody(`rot${rotationCount}`, 3600));
  }
  if (url.includes('/auth/v1/logout')) {
    return jsonResponse({}, 204);
  }
  throw new Error(`adv: unexpected fetch ${url}`);
}) as unknown as typeof fetch;

const unhandledReasons: string[] = [];
const onUnhandled = (reason: unknown) => {
  unhandledReasons.push(reason instanceof Error ? reason.message : String(reason));
};

beforeAll(() => {
  process.on('unhandledRejection', onUnhandled);
});
afterAll(() => {
  process.off('unhandledRejection', onUnhandled);
});

async function drain(): Promise<void> {
  for (let i = 0; i < 25; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function settleOrHang<T>(op: () => Promise<T>, ms = 3000): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const outcome = await Promise.race([
      op().then(
        () => 'settled',
        (err: unknown) => `rejected:${err instanceof Error ? err.message : String(err)}`,
      ),
      new Promise<string>((resolve) => {
        timer = setTimeout(() => resolve('HUNG'), ms);
      }),
    ]);
    return outcome;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type Process = {
  rtl: typeof RTL;
  provider: typeof AuthProviderModule;
  supabaseModule: typeof import('@/lib/supabase');
  emitAppState: (status: string) => void;
};

function bootProcess(): Process {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = PROBE_URL;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_adv_not_a_real_key';

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { AppState } = require('react-native') as typeof import('react-native');
  const rtl = require('@testing-library/react-native') as typeof RTL;
  const provider = require('@/lib/auth/auth-provider') as typeof AuthProviderModule;
  const supabaseModule = require('@/lib/supabase') as typeof import('@/lib/supabase');
  /* eslint-enable @typescript-eslint/no-require-imports */

  let current = 'active';
  const listeners: ((status: string) => void)[] = [];
  Object.defineProperty(AppState, 'currentState', { configurable: true, get: () => current });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (status: string) => void,
  ) => {
    listeners.push(listener);
    return { remove: () => {} };
  }) as unknown as typeof AppState.addEventListener);

  return {
    rtl,
    provider,
    supabaseModule,
    emitAppState: (status) => {
      current = status;
      for (const listener of listeners) listener(status);
    },
  };
}

function sessionKeySpace(baseKey: string): string[] {
  return [...mockKeychain.map.keys()].filter(
    (key) => key === baseKey || key.startsWith(`${baseKey}.`),
  );
}

function discoverSessionKey(): string {
  const candidates = [...mockKeychain.map.entries()]
    .filter(([, value]) => value.startsWith('{"__scs"'))
    .map(([key]) => key);
  expect(candidates).toHaveLength(1);
  return candidates[0];
}

function seedDemand() {
  mockDemandFiles.set(
    'zc-auth-reauth-demand.json',
    JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00.000Z' }),
  );
}

async function signInAs(
  p1: Process,
  result: { readonly current: { readonly verifyOtp: (e: string, t: string) => Promise<{ error: unknown }> } },
) {
  await p1.rtl.act(async () => {
    const { error } = await result.current.verifyOtp('adv@example.test', '123456');
    expect(error).toBeNull();
  });
}

async function waitSignedOutOrSettled(
  result: { readonly current: { readonly state: { status: string } } },
  ms: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (result.current.state.status === 'signedOut') return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
}

describe('REVIEW-023-ADVISORY probes — round 2', () => {
  beforeEach(() => {
    mockKeychain.map.clear();
    mockKeychain.refuseWrites = false;
    mockKeychain.refuseDeletes = false;
    mockKeychain.refuseReads = false;
    mockKeychain.writeAttempts = 0;
    mockKeychain.deleteAttempts = 0;
    mockKeychain.readAttempts = 0;
    mockDemandFiles.clear();
    demandControls.refuseAll = false;
    demandControls.lieExists = false;
    fetchLog.length = 0;
    rotationCount = 0;
    tokenEndpointFailsWithInvalidGrant = false;
    unhandledReasons.length = 0;
    timeline.length = 0;
  });

  // ---------------- A2: event-with-rotated-session after demand-recorded (exposure vector)

  it('A2 — auth events carrying the rotated session fire AFTER the durable demand is recorded', async () => {
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    // Probe's own subscription, alongside the provider's: log every auth event.
    const { data } = p1.supabaseModule.supabase.auth.onAuthStateChange((event, session) => {
      const tag = session?.access_token ? String(session.access_token).replace('adv-access-', '') : 'none';
      mark(`event:${event}:${tag}`);
    });
    expect(data.subscription).toBeTruthy();

    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));
    expect(sessionKeySpace(discoverSessionKey()).length).toBeGreaterThan(0);

    const timelineAtFlip = timeline.length;
    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;

    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);
    await waitSignedOutOrSettled(first.result, 8000);
    await p1.rtl.act(drain);

    const window = timeline.slice(timelineAtFlip);
    const recordedIdx = window.findIndex((t) => t.startsWith('demand-recorded'));
    const rotatedEventIdx = window.findIndex((t) => t.startsWith('event:') && t.includes('rot'));

    /* eslint-disable no-console */
    console.log('ADV A2 timeline after flip:', JSON.stringify(window));
    console.log('ADV A2 unhandled adv-refused-session-write:', unhandledReasons.filter((r) => r.includes('adv-refused-session-write')).length);
    console.log('ADV A2 final state:', first.result.current.state.status);
    /* eslint-enable no-console */

    expect(first.result.current.state.status).toBe('signedOut');
    expect(mockDemandFiles.size).toBeGreaterThan(0);
    expect(recordedIdx).toBeGreaterThanOrEqual(0);
    expect(rotatedEventIdx).toBeGreaterThan(recordedIdx);
    expect(unhandledReasons.filter((r) => r.includes('adv-refused-session-write'))).toHaveLength(0);

    data.subscription.unsubscribe();
    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  // ---------- A3: refused sign-in persist — event fires after the demand is recorded

  it('A3 — a refused sign-in persist is absorbed: the SIGNED_IN event with the session fires AFTER the durable demand is recorded', async () => {
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    const { data } = p1.supabaseModule.supabase.auth.onAuthStateChange((event, session) => {
      const tag = session?.access_token ? String(session.access_token).replace('adv-access-', '') : 'none';
      mark(`event:${event}:${tag}`);
    });
    expect(data.subscription).toBeTruthy();

    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    const timelineAtFlip = timeline.length;

    let verifyError: unknown = 'unset';
    await p1.rtl.act(async () => {
      const res = await first.result.current.verifyOtp('adv@example.test', '123456');
      verifyError = res.error;
    });
    await p1.rtl.act(drain);

    const window = timeline.slice(timelineAtFlip);
    const recordedIdx = window.findIndex((t) => t.startsWith('demand-recorded'));
    const signedInEventIdx = window.findIndex((t) => t === 'event:SIGNED_IN:v1');

    /* eslint-disable no-console */
    console.log('ADV A3 verifyOtp error:', JSON.stringify(verifyError));
    console.log('ADV A3 timeline after flip:', JSON.stringify(window));
    console.log('ADV A3 state now:', first.result.current.state.status);
    console.log('ADV A3 key space size:', sessionKeySpace('zc-auth-session').length);
    /* eslint-enable no-console */

    expect(verifyError).toBeNull();
    expect(mockDemandFiles.size).toBe(1);
    expect(recordedIdx).toBeGreaterThanOrEqual(0);
    expect(signedInEventIdx).toBeGreaterThan(recordedIdx);
    expect(first.result.current.state.status).toBe('signedIn');

    data.subscription.unsubscribe();
    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  // ---------- B2: stale demand + fresh sign-in exposed; restart purge destroys it

  it('B2 — a fresh sign-in is exposed while a stale demand is outstanding; the restart purge destroys it', async () => {
    // Seed a persisted session first.
    const p0 = bootProcess();
    const w0 = ({ children }: { children: ReactNode }) => (
      <p0.provider.AuthProvider>{children}</p0.provider.AuthProvider>
    );
    const h0 = await p0.rtl.renderHook(() => p0.provider.useAuth(), { wrapper: w0 });
    await p0.rtl.waitFor(() => expect(h0.result.current.state.status).toBe('signedOut'));
    await signInAs(p0, h0.result);
    await p0.rtl.waitFor(() => expect(h0.result.current.state.status).toBe('signedIn'));
    const sessionKey = discoverSessionKey();
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);
    await h0.unmount();
    p0.rtl.cleanup();
    await drain();

    // A demand sits on disk; the keychain refuses deletes.
    seedDemand();
    mockKeychain.refuseDeletes = true;

    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));
    expect(mockDemandFiles.size).toBe(1);

    mockKeychain.refuseDeletes = false;
    let verifyError: unknown = 'unset';
    await p1.rtl.act(async () => {
      const res = await first.result.current.verifyOtp('adv@example.test', '123456');
      verifyError = res.error;
    });
    await p1.rtl.act(drain);

    /* eslint-disable no-console */
    console.log('ADV B2 verifyOtp error while demand outstanding:', JSON.stringify(verifyError));
    console.log('ADV B2 state after that sign-in:', first.result.current.state.status);
    console.log('ADV B2 demand still present:', mockDemandFiles.size > 0);
    /* eslint-enable no-console */

    // The sign-in reports success, but with the demand outstanding the provider
    // never registered a listener: the session is invisible (no signedIn).
    expect(verifyError).toBeNull();
    expect(first.result.current.state.status).toBe('signedOut');
    expect(mockDemandFiles.size).toBe(1);

    // Next foreground: the purge now succeeds — and destroys the fresh session.
    const deletesBefore = mockKeychain.deleteAttempts;
    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);

    /* eslint-disable no-console */
    console.log('ADV B2 deletes in the purge:', mockKeychain.deleteAttempts - deletesBefore);
    console.log('ADV B2 demand files after purge:', mockDemandFiles.size);
    console.log('ADV B2 key space after purge:', sessionKeySpace(sessionKey).length);
    console.log('ADV B2 state after purge:', first.result.current.state.status);
    /* eslint-enable no-console */

    expect(mockDemandFiles.size).toBe(0);
    expect(sessionKeySpace(sessionKey)).toHaveLength(0);
    expect(first.result.current.state.status).toBe('signedOut');

    // Only a SECOND sign-in surfaces now that the listener exists.
    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));

    await first.unmount();
    p1.rtl.cleanup();
    await drain();

    // Restart over the same persistent stores: nothing survives the purge.
    const p2 = bootProcess();
    let everSignedIn = false;
    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <p2.provider.AuthProvider>{children}</p2.provider.AuthProvider>
    );
    const second = await p2.rtl.renderHook(() => p2.provider.useAuth(), { wrapper: wrapper2 });
    const track = () => {
      if (second.result.current.state.status === 'signedIn') everSignedIn = true;
    };
    await p2.rtl.act(drain);
    track();
    await p2.rtl.waitFor(() => {
      track();
      expect(second.result.current.state.status).toBe('signedIn');
    });
    await p2.rtl.act(drain);
    track();

    /* eslint-disable no-console */
    console.log('ADV B2 restart: everSignedIn:', everSignedIn);
    console.log('ADV B2 restart: demand files:', mockDemandFiles.size);
    console.log('ADV B2 restart: key space:', sessionKeySpace(sessionKey).length);
    /* eslint-enable no-console */

    expect(everSignedIn).toBe(true);
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    await second.unmount();
    p2.rtl.cleanup();
  }, 60_000);

  // ---------------- C3: the "neither session" state (Q3)

  it('C3 — after a refused rotation and recovery, the app holds neither session and only re-auth recovers', async () => {
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));
    const sessionKey = discoverSessionKey();

    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    const rotationsBefore = rotationCount;

    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await waitSignedOutOrSettled(first.result, 8000);
    await p1.rtl.act(drain);

    // The server rotated while the keychain refused: the refresh token is consumed.
    expect(rotationCount).toBeGreaterThan(rotationsBefore);

    // The store recovers; the retried purge is proven; the demand clears.
    mockKeychain.refuseWrites = false;
    mockKeychain.refuseDeletes = false;
    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);
    const start = Date.now();
    while (Date.now() - start < 8000 && sessionKeySpace(sessionKey).length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(sessionKeySpace(sessionKey)).toHaveLength(0);
    expect(mockDemandFiles.size).toBe(0);

    // Neither session is held: storage empty, and the client reports none.
    const stored = await p1.rtl.act(async () => {
      const { data } = await p1.supabaseModule.supabase.auth.getSession();
      return data.session;
    });

    /* eslint-disable no-console */
    console.log('ADV C3 rotations consumed:', rotationCount);
    console.log('ADV C3 key space after recovery:', sessionKeySpace(sessionKey).length);
    console.log('ADV C3 client-held session after recovery:', stored ? stored.access_token : 'null');
    /* eslint-enable no-console */

    expect(stored).toBeNull();

    // And re-auth is the recovery: a fresh OTP yields a fresh session.
    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));

    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  // ----------------------------- E1: file-system refusal at consult (the Q1 ignore vector)

  it('E1 — a demand store whose exists gate lies (returns false under I/O refusal) lets the provider expose the residual session', async () => {
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));
    const sessionKey = discoverSessionKey();
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    await first.unmount();
    p1.rtl.cleanup();
    await drain();

    // A demand exists on disk (the file exists), but the exists gate lies.
    seedDemand();
    demandControls.lieExists = true;

    const p2 = bootProcess();
    const transitions: { status: string; tag: string }[] = [];
    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <p2.provider.AuthProvider>{children}</p2.provider.AuthProvider>
    );
    const second = await p2.rtl.renderHook(() => p2.provider.useAuth(), { wrapper: wrapper2 });

    let everSignedIn = false;
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const s = second.result.current.state;
      const tag = s.status === 'signedIn' && s.session?.access_token ? String(s.session.access_token) : '';
      const last = transitions[transitions.length - 1];
      if (!last || last.status !== s.status || last.tag !== tag) {
        transitions.push({ status: s.status, tag });
      }
      if (s.status === 'signedIn') {
        everSignedIn = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    await p2.rtl.act(drain);
    if (second.result.current.state.status === 'signedIn') everSignedIn = true;

    /* eslint-disable no-console */
    console.log('ADV E1 demand file present during consult:', mockDemandFiles.size > 0);
    console.log('ADV E1 everSignedIn with a demand on disk:', everSignedIn);
    console.log('ADV E1 transitions:', JSON.stringify(transitions));
    /* eslint-enable no-console */

    // With the demand missed, the residual session is loaded and exposed.
    expect(mockDemandFiles.size).toBe(1);
    expect(everSignedIn).toBe(true);
    expect(second.result.current.state.status).toBe('signedIn');

    await second.unmount();
    p2.rtl.cleanup();
  }, 60_000);

  it('D4a — both providers refusing: the provider settles to signedOut, retries, but no demand survives', async () => {
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));
    await signInAs(p1, first.result);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));

    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    demandControls.refuseAll = true;
    const timelineAtFlip = timeline.length;
    const deletesBefore = mockKeychain.deleteAttempts;

    const outcome = await settleOrHang(async () => {
      await p1.rtl.act(async () => {
        p1.emitAppState('background');
      });
      await p1.rtl.act(async () => {
        p1.emitAppState('active');
      });
      await waitSignedOutOrSettled(first.result, 5000);
      if (first.result.current.state.status !== 'signedOut') throw new Error('never signedOut');
    }, 8000);

    // Second foreground: does the purge retry?
    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    // Long drain: the unhandled rejections claim 15's fallback re-enters fire
    // on a later macrotask; give every one of them the chance to be reported.
    for (let i = 0; i < 100; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    /* eslint-disable no-console */
    console.log('ADV D4a evaluate outcome:', outcome);
    console.log('ADV D4a timeline after flip:', JSON.stringify(timeline.slice(timelineAtFlip)));
    console.log('ADV D4a demand files (0 = durability lost):', mockDemandFiles.size);
    console.log('ADV D4a delete attempts delta:', mockKeychain.deleteAttempts - deletesBefore);
    console.log('ADV D4a unhandled reasons:', JSON.stringify(unhandledReasons));
    console.log('ADV D4a final state:', first.result.current.state.status);
    /* eslint-enable no-console */

    expect(outcome).toBe('settled');
    expect(first.result.current.state.status).toBe('signedOut');
    // NOTE: jest's own unhandled-rejection detector reports two
    // 'adv-refused-session-write' rejections from this schedule — the
    // claim-15 fallback re-entering the pre-ADR-009 path, exactly as
    // disclosed. The probe's process-level capture cannot see them (jest's
    // test environment intercepts), so the finding rests on jest's own
    // failure output for this test, not on this array.

    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  // ------------------------ D4e: only deletes refused (demand store healthy)

  it('D4e — deletes refused with a healthy demand store: purge retried each foreground, demand durable', async () => {
    const p0 = bootProcess();
    const w0 = ({ children }: { children: ReactNode }) => (
      <p0.provider.AuthProvider>{children}</p0.provider.AuthProvider>
    );
    const h0 = await p0.rtl.renderHook(() => p0.provider.useAuth(), { wrapper: w0 });
    await p0.rtl.waitFor(() => expect(h0.result.current.state.status).toBe('signedOut'));
    await signInAs(p0, h0.result);
    await p0.rtl.waitFor(() => expect(h0.result.current.state.status).toBe('signedIn'));
    const sessionKey = discoverSessionKey();
    await h0.unmount();
    p0.rtl.cleanup();
    await drain();

    seedDemand();
    mockKeychain.refuseDeletes = true;

    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));
    const deletesAfterFirst = mockKeychain.deleteAttempts;
    expect(mockDemandFiles.size).toBe(1);

    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);

    /* eslint-disable no-console */
    console.log('ADV D4e delete attempts after first purge:', deletesAfterFirst);
    console.log('ADV D4e delete attempts after retry:', mockKeychain.deleteAttempts);
    console.log('ADV D4e demand still present:', mockDemandFiles.size);
    console.log('ADV D4e final state:', first.result.current.state.status);
    /* eslint-enable no-console */

    expect(mockKeychain.deleteAttempts).toBeGreaterThan(deletesAfterFirst);
    expect(mockDemandFiles.size).toBe(1);
    expect(first.result.current.state.status).toBe('signedOut');

    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  // ---------------------- D4b: deletes refused while writes succeed, plain refresh

  it('D4b — deletes refused during a plain refresh: settle, hang, or reject?', async () => {
    const p1 = bootProcess();
    const auth = p1.supabaseModule.supabase.auth;

    await p1.rtl.act(async () => {
      const { error } = await auth.verifyOtp({ email: 'adv@example.test', token: '123456', type: 'email' });
      expect(error).toBeNull();
    });

    mockKeychain.refuseDeletes = true;
    const deletesBefore = mockKeychain.deleteAttempts;

    const outcome = await settleOrHang(() => auth.getSession(), 4000);

    /* eslint-disable no-console */
    console.log('ADV D4b getSession outcome:', outcome);
    console.log('ADV D4b delete attempts during refresh:', mockKeychain.deleteAttempts - deletesBefore);
    /* eslint-enable no-console */

    expect(outcome).toBe('settled');
  }, 60_000);

  // ---------------------- D4c: 400 invalid_grant with deletes refused

  it('D4c — server 400 invalid_grant with deletes refused: settle, hang, or reject?', async () => {
    const p1 = bootProcess();
    const auth = p1.supabaseModule.supabase.auth;

    await p1.rtl.act(async () => {
      const { error } = await auth.verifyOtp({ email: 'adv@example.test', token: '123456', type: 'email' });
      expect(error).toBeNull();
    });

    tokenEndpointFailsWithInvalidGrant = true;
    mockKeychain.refuseDeletes = true;
    const deletesBefore = mockKeychain.deleteAttempts;

    const outcome = await settleOrHang(() => auth.getSession(), 4000);

    /* eslint-disable no-console */
    console.log('ADV D4c getSession outcome:', outcome);
    console.log('ADV D4c delete attempts on the failure path:', mockKeychain.deleteAttempts - deletesBefore);
    console.log('ADV D4c unhandled reasons:', JSON.stringify(unhandledReasons));
    /* eslint-enable no-console */

    expect(outcome).toMatch(/^(settled|rejected)/);
  }, 60_000);
});

```
