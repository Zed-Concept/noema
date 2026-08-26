/**
 * The REVIEW-023 findings 1 and 2 probe, committed as an instrument.
 *
 * Run by `review023-probe.sh`, which copies this file into a disposable
 * worktree as `src/__tests__/review023-probe.test.tsx` — once at the pinned
 * REVIEWED CANDIDATE (`caa31ee2`, the head REVIEW-023 measured, where the
 * schedules below FAIL exactly as the reviewer found: that RED run is this
 * instrument's positive control, learning 14) and once at the current HEAD
 * (where all must PASS). No `.test` suffix here, so the ordinary `npm test`
 * never executes it in place.
 *
 * WHAT IT IS: the real pinned `@supabase/supabase-js` client, constructed by
 * the app's own `src/lib/supabase.ts`, over the app's own session-storage
 * composition — with exactly three things injected beneath the app code: a
 * fake keychain behind `expo-secure-store` (switchable write/delete refusal),
 * a fake file store behind `expo-file-system` (switchable WRITE refusal — the
 * demand store's refusal is what REVIEW-023 finding 1 turns on), and a fake
 * `fetch` answering the auth endpoints locally, able to HOLD the logout leg
 * pending (REVIEW-023 finding 2's schedule). No Supabase service is
 * contacted and no credential exists.
 *
 * THE SCHEDULES — the reviewer's own, from the immutable record:
 *
 *   1. Demand-store refusal, process 1 + restart (finding 1 / ruling 25):
 *      every medium refuses; process 1 must show signedOut with ZERO
 *      unhandled rejections and the demand held (no durable record — nothing
 *      accepted one); the demand store then recovers BEFORE death and a later
 *      opportunity must land the durable record; the restart must find it
 *      and honour it before any session is exposed.
 *   2. Death before any medium recovers — the ruling-25 KNOWN LIMIT, stated
 *      and demonstrated, not claimed away: no durable record can exist, and
 *      the next process exposes the residual. The bound is server-side —
 *      the residual's refresh token was already consumed at rotation, and
 *      Supabase's rotation rejects a consumed token outside the reuse
 *      interval — and is measured live by Unit F, not here.
 *   3. Pending logout (finding 2): from a genuinely signed-in provider, the
 *      next rotated write is refused; `signOut()`'s internal refresh write
 *      succeeds; the local logout fetch is HELD. The provider must read
 *      signedOut with the durable demand present WHILE the logout is
 *      pending; on release the read-back proves the purge and the demand
 *      clears. A mid-purge TOKEN_REFRESHED must not re-expose the session.
 *
 * PLUS the REVIEW-023-ADVISORY schedules the controller adjudicated into
 * this cycle (leads 1–3; the cycle-1 addendum):
 *
 *   4. A2 — mid-process refusal: the demand is recorded by the observer
 *      BEFORE the TOKEN_REFRESHED event carrying the unpersisted rotated
 *      session fires. No state the provider ever renders may hold that
 *      rotated session.
 *   5. A3 — refused sign-in persist: `verifyOtp` reports success while the
 *      keychain refused the persist. The SIGNED_IN event carries a session
 *      that exists nowhere durable; the provider must never expose it.
 *   6. E1 — the lying `exists` gate: a demand record present and readable
 *      while `exists` reports false. The consult READS — the demand is
 *      honoured. (Whether the installed expo-file-system can produce this
 *      answer natively remains NOT RUN; the mock's lie is synthetic.)
 *   7. B2 — the consumed sign-in: with a demand outstanding at mount, a
 *      fresh sign-in that persists and reads back RESOLVES the demand and
 *      is exposed — never destroyed by the stale demand's purge.
 */

import type { AppStateStatus } from 'react-native';
import type * as RTL from '@testing-library/react-native';
import type * as AuthProviderModule from '@/lib/auth/auth-provider';
import type { ReactNode } from 'react';

// The testing library registers an `afterAll` cleanup hook at import time,
// and this probe imports it INSIDE tests — once per simulated process, after
// `jest.resetModules()` — where registering hooks is (correctly) an error.
// Cleanup becomes manual; each process calls `cleanup()` itself.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

// ---------------------------------------------------------------------------
// Persistent fakes. These OUTLIVE jest.resetModules() — they are the disk and
// the network, the things a process restart preserves. Reset per test.
// ---------------------------------------------------------------------------

const mockKeychain = {
  map: new Map<string, string>(),
  refuseWrites: false,
  refuseDeletes: false,
  writeAttempts: 0,
  deleteAttempts: 0,
};

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'whenUnlocked',
  getItemAsync: async (key: string) =>
    mockKeychain.map.has(key) ? (mockKeychain.map.get(key) as string) : null,
  setItemAsync: async (key: string, value: string) => {
    mockKeychain.writeAttempts += 1;
    if (mockKeychain.refuseWrites) throw new Error('probe-refused-session-write');
    mockKeychain.map.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    mockKeychain.deleteAttempts += 1;
    if (mockKeychain.refuseDeletes) throw new Error('probe-refused-delete');
    mockKeychain.map.delete(key);
  },
}));

/** The app-sandbox file store the durable demand lives in. `refuseWrites` is
 * REVIEW-023 finding 1's switch: the demand store itself refusing.
 * `lieAbsent` is the advisory's E1 switch: `exists` reports false while the
 * record is present and readable — the synthetic form of the unverified
 * native premise. */
const mockDemandStore = {
  files: new Map<string, string>(),
  refuseWrites: false,
  lieAbsent: false,
};

jest.mock('expo-file-system', () => {
  class MockFile {
    private readonly name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists(): boolean {
      if (mockDemandStore.lieAbsent) return false;
      return mockDemandStore.files.has(this.name);
    }
    textSync(): string {
      const value = mockDemandStore.files.get(this.name);
      if (value === undefined) throw new Error('probe-demand-file-absent');
      return value;
    }
    write(value: string): void {
      if (mockDemandStore.refuseWrites) throw new Error('probe-demand-store-refused');
      mockDemandStore.files.set(this.name, value);
    }
    delete(): void {
      mockDemandStore.files.delete(this.name);
    }
  }
  return { File: MockFile, Paths: { document: {} } };
});

// ---------------------------------------------------------------------------
// The fake auth server. Every response is fabricated locally. `holdLogout`
// is REVIEW-023 finding 2's switch: the logout leg held pending until
// `releaseLogout()` — the unbounded interval the finding measures.
// ---------------------------------------------------------------------------

const PROBE_URL = 'https://probe-project.example.test';
let rotationCount = 0;
let holdLogout = false;
let pendingLogoutReleases: (() => void)[] = [];
/** Called on every /token response, so a schedule can toggle store behaviour
 * between one rotation's save and the next — the only seam between auth-js's
 * internal steps that does not read library internals. */
let onTokenRotation: (rotation: number) => void = () => {};

function releaseLogout(): void {
  for (const release of pendingLogoutReleases) release();
  pendingLogoutReleases = [];
}

function fakeUser() {
  return {
    id: 'probe-user-id',
    aud: 'authenticated',
    email: 'probe@example.test',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
  };
}

/** A session body as auth-js expects it. `expiresIn` under the 90s margin
 * makes the very next session load refresh it. */
function fakeSessionBody(tag: string, expiresIn: number) {
  return {
    access_token: `probe-access-${tag}`,
    token_type: 'bearer',
    expires_in: expiresIn,
    refresh_token: `probe-refresh-${tag}`,
    user: fakeUser(),
  };
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'probe',
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

globalThis.fetch = (async (input: unknown) => {
  const url = String(input);
  if (url.includes('/auth/v1/verify')) {
    // The seeded session: near expiry from the moment it is issued.
    return jsonResponse(fakeSessionBody('v1', 60));
  }
  if (url.includes('/auth/v1/token')) {
    rotationCount += 1;
    onTokenRotation(rotationCount);
    return jsonResponse(fakeSessionBody(`rot${rotationCount}`, 3600));
  }
  if (url.includes('/auth/v1/logout')) {
    if (holdLogout) {
      return new Promise((resolve) => {
        pendingLogoutReleases.push(() => resolve(jsonResponse({}, 204)));
      });
    }
    return jsonResponse({}, 204);
  }
  throw new Error(`probe: unexpected fetch ${url}`);
}) as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Unhandled-rejection capture. REVIEW-023 finding 1 observed two unhandled
// `probe-refused-session-write` failures when the demand store also refused;
// R3 under ruling 25 admits zero, on every schedule below.
// ---------------------------------------------------------------------------

const unhandledReasons: unknown[] = [];
const onUnhandled = (reason: unknown) => {
  unhandledReasons.push(reason);
};

function refusedWriteUnhandledCount(): number {
  return unhandledReasons.filter((reason) =>
    String(reason instanceof Error ? reason.message : reason).includes(
      'probe-refused-session-write',
    ),
  ).length;
}

beforeAll(() => {
  process.on('unhandledRejection', onUnhandled);
});
afterAll(() => {
  process.off('unhandledRejection', onUnhandled);
});

/** Macrotask hops, so pending rejections become unhandled events and pending
 * auth-js settlements land before anything is asserted. */
async function drain(): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

beforeEach(() => {
  mockKeychain.map.clear();
  mockKeychain.refuseWrites = false;
  mockKeychain.refuseDeletes = false;
  mockKeychain.writeAttempts = 0;
  mockKeychain.deleteAttempts = 0;
  mockDemandStore.files.clear();
  mockDemandStore.refuseWrites = false;
  mockDemandStore.lieAbsent = false;
  rotationCount = 0;
  holdLogout = false;
  pendingLogoutReleases = [];
  onTokenRotation = () => {};
  unhandledReasons.length = 0;
});

// ---------------------------------------------------------------------------
// One simulated process = one module registry over the persistent fakes.
// ---------------------------------------------------------------------------

type Process = {
  rtl: typeof RTL;
  provider: typeof AuthProviderModule;
  emitAppState: (status: AppStateStatus) => void;
};

function bootProcess(): Process {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = PROBE_URL;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_probe_not_a_real_key';

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { AppState } = require('react-native') as typeof import('react-native');
  const rtl = require('@testing-library/react-native') as typeof RTL;
  // Importing the provider imports src/lib/supabase, which constructs the
  // REAL pinned client — including whatever its constructor does with the
  // session already in the fake keychain.
  const provider = require('@/lib/auth/auth-provider') as typeof AuthProviderModule;
  /* eslint-enable @typescript-eslint/no-require-imports */

  let current: AppStateStatus = 'active';
  const listeners: ((status: AppStateStatus) => void)[] = [];
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    get: () => current,
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _type: string,
    listener: (status: AppStateStatus) => void,
  ) => {
    listeners.push(listener);
    return { remove: () => {} };
  }) as unknown as typeof AppState.addEventListener);

  return {
    rtl,
    provider,
    emitAppState: (status) => {
      current = status;
      for (const listener of listeners) listener(status);
    },
  };
}

/** Every key that could hold session material for `baseKey`. */
function sessionKeySpace(baseKey: string): string[] {
  return [...mockKeychain.map.keys()].filter(
    (key) => key === baseKey || key.startsWith(`${baseKey}.`),
  );
}

/** The session's base key, discovered from what the adapter actually wrote. */
function discoverSessionKey(): string {
  const candidates = [...mockKeychain.map.entries()]
    .filter(([, value]) => value.startsWith('{"__scs"'))
    .map(([key]) => key);
  expect(candidates).toHaveLength(1);
  return candidates[0];
}

/** Mount a provider in `proc`. When `history` is given, every rendered state
 * is appended to it — the exposure record the advisory schedules assert on:
 * an exposure that any render saw is in the history even if a later render
 * replaced it. */
async function mountProvider(proc: Process, history?: AuthProviderModule.AuthState[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <proc.provider.AuthProvider>{children}</proc.provider.AuthProvider>
  );
  const hook = await proc.rtl.renderHook(
    () => {
      const value = proc.provider.useAuth();
      history?.push(value.state);
      return value;
    },
    { wrapper },
  );
  return hook;
}

/** Sign in through the real client against the fake server and wait for the
 * provider to expose the session. The persisted session expires in 60s —
 * inside auth-js's 90s margin, so every later load of it refreshes. */
async function signIn(
  proc: Process,
  hook: { result: { current: AuthProviderModule.AuthContextValue } },
) {
  await proc.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
  await proc.rtl.act(async () => {
    const { error } = await hook.result.current.verifyOtp('probe@example.test', '123456');
    expect(error).toBeNull();
  });
  await proc.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedIn'));
}

/** The demand record's file name — the literal `reauth-demand.ts` uses. Kept
 * a literal here so the probe imports nothing module-private and runs
 * unchanged against both pinned trees. */
const DEMAND_FILE = 'zc-auth-reauth-demand.json';

/** True when any recorded state exposed a session whose access token matches. */
function historyExposed(history: AuthProviderModule.AuthState[], tokenPart: string): boolean {
  return history.some(
    (state) => state.status === 'signedIn' && state.session.access_token.includes(tokenPart),
  );
}

async function foregroundCycle(proc: Process) {
  await proc.rtl.act(async () => {
    proc.emitAppState('background');
  });
  await proc.rtl.act(async () => {
    proc.emitAppState('active');
  });
  await proc.rtl.act(drain);
}

describe('REVIEW-023 findings 1 and 2 — the probe (RED at reviewed candidate caa31ee2, GREEN at the head)', () => {
  it('finding 1 — double refusal absorbs, holds, retries once a medium recovers, and the restart honours the record', async () => {
    // ----------------------------------------------------- process 1: seed
    const p1 = bootProcess();
    const first = await mountProvider(p1);
    await signIn(p1, first);
    const sessionKey = discoverSessionKey();
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    // ------------------- process 1: EVERY medium refuses (the reviewer's
    // schedule): keychain writes and deletes, and the demand store's writes.
    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    mockDemandStore.refuseWrites = true;

    // A foreground settle loads the near-expiry session; the margin refresh
    // rotates it; the keychain refuses the write; the demand store refuses
    // the record. Recovery — whatever the revision under test does — runs.
    await foregroundCycle(p1);
    await p1.rtl.act(drain);

    // Process 1, measured exactly as the reviewer measured it: the provider
    // exposes signedOut, and ZERO refused-write rejections went unhandled.
    // At the reviewed candidate this is where the deliberate rethrow
    // re-entered the pinned client's throw-and-reject path — Jest surfaced
    // two unhandled failures there. Ruling 25: R3 admits no exception.
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));
    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    // Nothing durable exists — no medium accepted a write — and the residual
    // is still in the keychain. The demand is HELD in memory (ruling 25),
    // which the next stage proves by watching it land.
    expect(mockDemandStore.files.size).toBe(0);
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    // ------------------- process 1: the DEMAND medium recovers before death
    // (the keychain stays refusing, so the purge cannot complete and the
    // demand stays owed). Ruling 25: the durable record is retried on every
    // later opportunity — the next foreground evaluation is one.
    mockDemandStore.refuseWrites = false;
    await foregroundCycle(p1);

    // The held demand went durable. THIS is what the reviewed candidate had
    // already lost: its fallback rethrew and forgot, so no later opportunity
    // could ever land the record.
    await p1.rtl.waitFor(() => expect(mockDemandStore.files.size).toBe(1));
    const demandRaw = [...mockDemandStore.files.values()][0];
    const demand = JSON.parse(demandRaw) as Record<string, unknown>;
    expect(Object.keys(demand).sort()).toEqual(['at', 'reason', 'v']);
    expect(demandRaw).not.toContain('probe-access');
    expect(demandRaw).not.toContain('probe-refresh');

    await first.unmount();
    p1.rtl.cleanup();
    await drain();

    // -------------------------------- process 2: RESTART, media recovered
    // Fresh module state over the same fakes: every process-local variable
    // any revision keeps is gone. The durable record — landed by the retry —
    // is all the next process has, and it must be honoured: no session
    // exposed, purge proven by read-back, demand cleared.
    mockKeychain.refuseWrites = false;
    mockKeychain.refuseDeletes = false;

    const p2 = bootProcess();
    let everSignedInAfterRestart = false;
    const second = await mountProvider(p2);
    const track = () => {
      if (second.result.current.state.status === 'signedIn') everSignedInAfterRestart = true;
    };

    await p2.rtl.act(drain);
    track();
    await p2.rtl.waitFor(() => {
      track();
      expect(second.result.current.state.status).toBe('signedOut');
    });
    track();

    await p2.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));
    expect(mockDemandStore.files.size).toBe(0);
    track();
    expect(everSignedInAfterRestart).toBe(false);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await second.unmount();
    p2.rtl.cleanup();
  }, 60_000);

  it('the ruling-25 Known limit, demonstrated — death before ANY medium recovers loses the demand', async () => {
    // This test asserts the LIMIT, not a defect: when every medium refuses
    // and the process dies before any recovers, no durable record can exist,
    // and the next process exposes the residual session. Ruling 25 records
    // exactly this schedule as a Known limit, bounded by Supabase's
    // refresh-token rotation — the residual's refresh token was consumed at
    // rotation, so the exposure ends server-side at its next refresh. That
    // bound is live behaviour; Unit F measures it. What must STILL hold here,
    // and did not at the reviewed candidate: process 1 absorbs every refusal
    // — zero unhandled rejections — and exposes signedOut.
    const p1 = bootProcess();
    const first = await mountProvider(p1);
    await signIn(p1, first);
    const sessionKey = discoverSessionKey();

    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    mockDemandStore.refuseWrites = true;

    await foregroundCycle(p1);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));
    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);
    expect(mockDemandStore.files.size).toBe(0);

    // Death, with every medium still refusing.
    await first.unmount();
    p1.rtl.cleanup();
    await drain();

    // Restart with the media recovered: nothing durable says what happened.
    mockKeychain.refuseWrites = false;
    mockKeychain.refuseDeletes = false;
    mockDemandStore.refuseWrites = false;

    const p2 = bootProcess();
    const second = await mountProvider(p2);
    await p2.rtl.act(drain);

    // The recorded limit's exact shape: the residual session is exposed.
    await p2.rtl.waitFor(() => expect(second.result.current.state.status).toBe('signedIn'));
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    // Absorption still held everywhere — the limit is about durability, and
    // R3's zero-unhandled has no schedule exception (ruling 25).
    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await second.unmount();
    p2.rtl.cleanup();
  }, 60_000);

  it('finding 2 — signedOut with the demand present WHILE the logout leg is held; release, read-back, cleared', async () => {
    // The reviewer's pending-logout schedule, exactly: a genuinely signed-in
    // provider; the next rotated session write refused (rotation 1); the
    // purge's own internal refresh write allowed to succeed (rotation 2);
    // the local logout fetch held pending. The candidate under review kept
    // exposing signedIn for that whole unbounded interval.
    const p1 = bootProcess();
    const first = await mountProvider(p1);
    await signIn(p1, first);
    const sessionKey = discoverSessionKey();

    // Rotation 1 is the foreground settle's margin refresh: its save must be
    // refused. Rotation 2 is `signOut()`'s internal refresh on the way out:
    // its save must land. The toggle rides the fake server's own /token
    // responses — no library internal is read.
    holdLogout = true;
    onTokenRotation = (rotation) => {
      mockKeychain.refuseWrites = rotation === 1;
    };

    let everSignedInDuringPurge = false;
    const track = () => {
      if (first.result.current.state.status === 'signedIn') everSignedInDuringPurge = true;
    };

    await foregroundCycle(p1);
    await p1.rtl.act(drain);

    // THE HOLD POINT. The logout fetch is pending and nothing has released
    // it. The state change must already have happened — signedOut is set
    // BEFORE the purge is awaited — with the durable demand already present.
    // At the reviewed candidate the provider still read signedIn here.
    expect(pendingLogoutReleases.length).toBeGreaterThan(0);
    expect(first.result.current.state.status).toBe('signedOut');
    expect(mockDemandStore.files.size).toBe(1);

    // The purge's own internal refresh emitted TOKEN_REFRESHED with the very
    // session being purged. From this point on, that event must never
    // re-expose it.
    track();
    await p1.rtl.act(drain);
    track();
    expect(first.result.current.state.status).toBe('signedOut');

    // Release the logout: deletes run, the read-back proves the space empty,
    // and only that proof ends the demand.
    await p1.rtl.act(async () => {
      releaseLogout();
    });
    await p1.rtl.act(drain);
    track();

    await p1.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));
    await p1.rtl.waitFor(() => expect(mockDemandStore.files.size).toBe(0));
    track();
    expect(everSignedInDuringPurge).toBe(false);
    expect(first.result.current.state.status).toBe('signedOut');

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await first.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('advisory A2 — no rendered state ever holds an unpersisted rotated session', async () => {
    // The advisory's mid-process schedule: the demand is recorded by the
    // observer BEFORE the TOKEN_REFRESHED event carrying the rotated session
    // fires, but the provider's own demand cache is stale at that moment. At
    // the reviewed candidate the listener set state unconditionally and the
    // rotated, unpersisted session was exposed for the purge's duration —
    // a window the in-memory fakes compress to sub-render size (the advisory
    // observed the same), so this test HOLDS the purge's logout leg open to
    // keep the window observable, exactly as the finding-2 schedule does.
    // Every rotation's write is refused here, so no rotated session is ever
    // durable and none may render, at the hold point or after.
    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await signIn(p1, hook);
    const sessionKey = discoverSessionKey();

    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    holdLogout = true;

    await foregroundCycle(p1);
    await p1.rtl.act(drain);

    // THE HOLD POINT: the purge is parked on its logout leg. The reviewed
    // candidate rendered signedIn carrying the rotated session here; the
    // fix's flag-gate means the event never surfaced and the state changed
    // when the demand was made, not when the purge settled.
    expect(pendingLogoutReleases.length).toBeGreaterThan(0);
    expect(hook.result.current.state.status).toBe('signedOut');
    expect(historyExposed(history, 'probe-access-rot')).toBe(false);
    // The demand store is healthy here: the refusal's record went durable
    // before the event fired.
    expect(mockDemandStore.files.size).toBe(1);

    await p1.rtl.act(async () => {
      releaseLogout();
    });
    await p1.rtl.act(drain);

    // Deletes stayed refused, so the purge cannot prove and the demand
    // stays; the residual is still there; nothing rotated ever rendered.
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(historyExposed(history, 'probe-access-rot')).toBe(false);
    expect(mockDemandStore.files.size).toBe(1);
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('advisory A3 — a sign-in whose persist was refused is never exposed', async () => {
    // `verifyOtp` reports success while the keychain refuses the persist —
    // auth-js believes the session stored. The SIGNED_IN event then carries
    // a session that exists nowhere durable. At the reviewed candidate the
    // provider ended signedIn over an empty key space; now the unconsumed
    // flag gates the event and nothing surfaces.
    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));

    mockKeychain.refuseWrites = true;
    await p1.rtl.act(async () => {
      const { error } = await hook.result.current.verifyOtp('probe@example.test', '123456');
      expect(error).toBeNull();
    });
    await p1.rtl.act(drain);

    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    expect(hook.result.current.state.status).toBe('signedOut');
    // Nothing landed in the keychain, and the refusal's demand is durable.
    expect(mockKeychain.map.size).toBe(0);
    expect(mockDemandStore.files.size).toBe(1);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('advisory E1 — a demand the exists gate denies is still honoured: the consult READS', async () => {
    // The lying-exists schedule: the demand record is present and readable
    // while `exists` reports false. At the reviewed candidate the consult
    // gated on `exists` alone, answered "no demand", and the residual was
    // loaded, rotated, and exposed. The consult now reads content first.
    // (Whether the INSTALLED expo-file-system can produce this lie natively
    // remains NOT RUN — the mock's lie is synthetic; Phase B owns the
    // premise.)
    const p1 = bootProcess();
    const h1 = await mountProvider(p1);
    await signIn(p1, h1);
    const sessionKey = discoverSessionKey();
    await h1.unmount();
    p1.rtl.cleanup();
    await drain();

    mockDemandStore.files.set(
      DEMAND_FILE,
      JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00Z' }),
    );
    mockDemandStore.lieAbsent = true;

    const history: AuthProviderModule.AuthState[] = [];
    const p2 = bootProcess();
    const hook = await mountProvider(p2, history);
    await p2.rtl.act(drain);

    await p2.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    // Honoured all the way: the purge ran and the read-back proved the
    // residual gone.
    await p2.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p2.rtl.cleanup();
  }, 60_000);

  it('advisory B2 — a fresh sign-in resolves the demand and the stale purge never destroys it', async () => {
    // The consumed-sign-in schedule: demand outstanding at mount, purge
    // unable to prove (deletes refused), then a real sign-in. At the
    // reviewed candidate the sign-in reported success, was invisible, and
    // the next purge swept the freshly minted session. Lead 3: the sign-in
    // that persists and reads back RESOLVES the demand and is exposed.
    const p1 = bootProcess();
    const h1 = await mountProvider(p1);
    await signIn(p1, h1);
    const sessionKey = discoverSessionKey();
    await h1.unmount();
    p1.rtl.cleanup();
    await drain();

    mockDemandStore.files.set(
      DEMAND_FILE,
      JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00Z' }),
    );
    mockKeychain.refuseDeletes = true;

    const history: AuthProviderModule.AuthState[] = [];
    const p2 = bootProcess();
    const hook = await mountProvider(p2, history);
    await p2.rtl.act(drain);
    await p2.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    expect(mockDemandStore.files.size).toBe(1);

    // The store recovers, and the user re-authenticates — which is exactly
    // what the demand asked for.
    mockKeychain.refuseDeletes = false;
    await p2.rtl.act(async () => {
      const { error } = await hook.result.current.verifyOtp('probe@example.test', '123456');
      expect(error).toBeNull();
    });
    await p2.rtl.act(drain);

    // Resolved and exposed. The exposed session is the sign-in's own or its
    // legitimately persisted rotation (the fresh 60s session is inside the
    // refresh margin, and the store accepts every write in this phase —
    // getSession may rotate it on exposure); what matters is that exposure
    // began only after the fresh session read back, the demand ended, and
    // the material is durable.
    await p2.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedIn'));
    expect(mockDemandStore.files.size).toBe(0);
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    // And the next foreground does not purge what re-authentication minted.
    await foregroundCycle(p2);
    expect(hook.result.current.state.status).toBe('signedIn');
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p2.rtl.cleanup();
  }, 60_000);
});
