/**
 * The REVIEW-024 findings 1 and 2 probe, committed as an instrument.
 *
 * Run by `review024-probe.sh`, which copies this file into a disposable
 * worktree as `src/__tests__/review024-probe.test.tsx` — once at the pinned
 * REVIEWED CANDIDATE (`5f6d2e6c`, the formal head REVIEW-024 measured, where
 * the schedules below FAIL exactly as the reviewer found: that RED run is
 * this instrument's positive control, learning 14) and once at the current
 * HEAD (where all must PASS). No `.test` suffix here, so the ordinary
 * `npm test` never executes it in place.
 *
 * WHAT IT IS: the real pinned `@supabase/supabase-js` client, constructed by
 * the app's own `src/lib/supabase.ts`, over the app's own session-storage
 * composition — with exactly three things injected beneath the app code: a
 * fake keychain behind `expo-secure-store` (switchable write/delete refusal),
 * a fake file store behind `expo-file-system` (READ refusal and lying-exists
 * switches — REVIEW-024 finding 1 turns on the read refusal — plus the
 * parent-directory listing the fixed consult corroborates absence with), and
 * a fake `fetch` answering the auth endpoints locally. No Supabase service
 * is contacted and no credential exists.
 *
 * THE SCHEDULES — the reviewer's own, from the immutable record:
 *
 *   1. Finding 1: a durable demand record is PRESENT, its read THROWS, and
 *      `exists` reports false. The consult must stay OUTSTANDING — the
 *      restart purges the residual and never exposes signedIn. At the
 *      reviewed candidate the thrown read plus `exists === false` was
 *      converted to absence and the residual was exposed.
 *   2. Finding 1 control: the identical thrown read with `exists === true`.
 *      Outstanding at both trees — the pair isolates the deleted boolean
 *      branch.
 *   3. Absence control: NO record exists; the listing — a read that
 *      succeeded — returns nothing under the record's name and `exists`
 *      corroborates. No demand, no spurious purge: the stored session
 *      bootstraps normally at both trees.
 *   4. Finding 2, the verdict-driving bootstrap schedule: an old demand
 *      holds the provider signed out; a fresh OTP sign-in persists, reads
 *      back, and legitimately resolves it; the previously deferred bootstrap
 *      then runs, and the pinned client refreshes the near-expiry fresh
 *      session DURING that bootstrap; only that follow-up persist is
 *      refused. The provider must END signedOut with the new demand durable
 *      and zero unhandled rejections — the rotated, unpersisted session is
 *      never exposed. At the reviewed candidate the ungated
 *      `getSession().then` published it as signedIn.
 *   5. Finding 2, the mid-process resolution re-read: bootstrap already ran;
 *      a refused rotation mid-process forces the demand; a fresh sign-in
 *      resolves it; the resolution's own `getSession()` re-read refreshes
 *      the fresh session and THAT persist is refused. The publication must
 *      re-check — signedOut, new demand, nothing exposed. At the reviewed
 *      candidate this branch called setState with no re-check.
 *
 * The event-before-record ordering REVIEW-024 also named (the flag installed
 * only after `demand.record()` settled) is instrumented at the unit level —
 * `foreground-refresh.test.ts` holds the record write pending and proves the
 * flag peekable in the interval — because the pinned client cannot be made
 * to deliver an event inside its own save await without reading library
 * internals; REVIEW-024 records same-operation reachability as UNVERIFIED.
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
};

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'whenUnlocked',
  getItemAsync: async (key: string) =>
    mockKeychain.map.has(key) ? (mockKeychain.map.get(key) as string) : null,
  setItemAsync: async (key: string, value: string) => {
    if (mockKeychain.refuseWrites) throw new Error('probe-refused-session-write');
    mockKeychain.map.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (mockKeychain.refuseDeletes) throw new Error('probe-refused-delete');
    mockKeychain.map.delete(key);
  },
}));

/** The app-sandbox file store the durable demand lives in. `refuseReads` is
 * REVIEW-024 finding 1's switch: the record's read throws while the record
 * IS present in the medium. `lieAbsent` makes `exists` report false
 * regardless — the synthetic form of the documented "no read access reads
 * as false" premise, which remains NOT RUN natively. The listing reads the
 * same persistent medium, so a present record is LISTED even when its read
 * refuses — exactly the discrimination the fixed consult relies on. */
const mockDemandStore = {
  files: new Map<string, string>(),
  refuseWrites: false,
  refuseReads: false,
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
      if (mockDemandStore.refuseReads) throw new Error('probe-demand-read-refused');
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
  return {
    File: MockFile,
    Paths: {
      document: {
        list: () => [...mockDemandStore.files.keys()].map((name) => ({ name })),
      },
    },
  };
});

// ---------------------------------------------------------------------------
// The fake auth server. Every response is fabricated locally.
// ---------------------------------------------------------------------------

const PROBE_URL = 'https://probe-project.example.test';
let rotationCount = 0;
/** Called on every /token response, so a schedule can toggle store behaviour
 * between one rotation's save and the next — the only seam between auth-js's
 * internal steps that does not read library internals. */
let onTokenRotation: (rotation: number) => void = () => {};

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
    // The fresh sign-in's session: near expiry from the moment it is issued,
    // so the next session load refreshes it — the finding-2 follow-up.
    return jsonResponse(fakeSessionBody('v1', 60));
  }
  if (url.includes('/auth/v1/token')) {
    rotationCount += 1;
    onTokenRotation(rotationCount);
    return jsonResponse(fakeSessionBody(`rot${rotationCount}`, 3600));
  }
  if (url.includes('/auth/v1/logout')) {
    return jsonResponse({}, 204);
  }
  throw new Error(`probe: unexpected fetch ${url}`);
}) as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Unhandled-rejection capture. R3 under ruling 25 admits zero, on every
// schedule below.
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
  mockDemandStore.files.clear();
  mockDemandStore.refuseWrites = false;
  mockDemandStore.refuseReads = false;
  mockDemandStore.lieAbsent = false;
  rotationCount = 0;
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
 * is appended to it — the exposure record the schedules assert on: an
 * exposure that any render saw is in the history even if a later render
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
 * provider to expose the session. */
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

/** Seed a signed-in keychain: process 0 signs in and dies. Returns the
 * session key space's base key. The last persisted session has a 3600s
 * life (the settle's rotation), so later loads do not refresh it. */
async function seedSignedInKeychain(): Promise<string> {
  const p0 = bootProcess();
  const hook = await mountProvider(p0);
  await signIn(p0, hook);
  const sessionKey = discoverSessionKey();
  await p0.rtl.act(drain);
  await hook.unmount();
  p0.rtl.cleanup();
  await drain();
  return sessionKey;
}

describe('REVIEW-024 findings 1 and 2 — the probe (RED at reviewed candidate 5f6d2e6c, GREEN at the head)', () => {
  it('finding 1 — a present record whose read throws is OUTSTANDING while exists lies false: purge, never signedIn', async () => {
    // The reviewer's schedule: residual session in the keychain, durable
    // demand record present in the file medium, the record's read THROWS,
    // and `exists` reports false. At the reviewed candidate the thrown read
    // plus the false boolean read as "no demand" and the residual was
    // loaded and exposed. The fixed consult sees the record in the parent
    // listing and stays outstanding: the restart purges and never signs in.
    const sessionKey = await seedSignedInKeychain();
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    mockDemandStore.files.set(
      DEMAND_FILE,
      JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00Z' }),
    );
    mockDemandStore.refuseReads = true;
    mockDemandStore.lieAbsent = true;

    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await p1.rtl.act(drain);

    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    // Honoured all the way: the purge ran and the read-back proved the
    // residual gone.
    await p1.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('finding 1 control — the identical thrown read with exists TRUE is outstanding the same way', async () => {
    // The reviewer's control: everything as above except the boolean. The
    // pair isolates the deleted branch — at BOTH trees this consult is
    // outstanding, so this test passes at the candidate too; the schedule
    // above is the discriminating half.
    const sessionKey = await seedSignedInKeychain();

    mockDemandStore.files.set(
      DEMAND_FILE,
      JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00Z' }),
    );
    mockDemandStore.refuseReads = true;
    mockDemandStore.lieAbsent = false;

    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await p1.rtl.act(drain);

    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    await p1.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('absence control — no record, empty listing, exists false: no demand, the stored session bootstraps', async () => {
    // The other direction, guarded: genuine absence — the listing (a read
    // that succeeded) has no entry under the record's name and `exists`
    // corroborates — must NOT read as outstanding, or every restart would
    // purge a valid session. The stored session bootstraps normally.
    const sessionKey = await seedSignedInKeychain();
    expect(mockDemandStore.files.size).toBe(0);

    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await p1.rtl.act(drain);

    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedIn'));
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);
    expect(mockDemandStore.files.size).toBe(0);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('finding 2 — fresh-sign-in resolution with a refused follow-up refresh ends signedOut with the new demand durable', async () => {
    // The verdict-driving bootstrap schedule. An old demand holds the
    // provider signed out (purge cannot prove: deletes refused). The fresh
    // OTP sign-in persists, reads back, and legitimately resolves the old
    // demand; the deferred bootstrap starts; the pinned client refreshes
    // the near-expiry fresh session during that bootstrap; ONLY that
    // follow-up persist is refused. At the reviewed candidate the ungated
    // getSession().then published the rotated, unpersisted session as
    // signedIn while the observer's new demand stood. The barrier re-checks
    // at publication: signedOut, new demand durable, zero unhandled, and
    // the rotated session never rendered.
    const sessionKey = await seedSignedInKeychain();

    mockDemandStore.files.set(
      DEMAND_FILE,
      JSON.stringify({ v: 1, reason: 'session-purge-pending', at: '2026-08-26T00:00:00Z' }),
    );
    mockKeychain.refuseDeletes = true;

    const history: AuthProviderModule.AuthState[] = [];
    const p1 = bootProcess();
    const hook = await mountProvider(p1, history);
    await p1.rtl.act(drain);
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(history.some((state) => state.status === 'signedIn')).toBe(false);
    expect(mockDemandStore.files.size).toBe(1);

    // The store recovers for the sign-in itself; every rotation from here
    // on is refused persistence — the first one is the bootstrap's own
    // margin refresh of the fresh 60s session, the reviewer's follow-up.
    mockKeychain.refuseDeletes = false;
    const rotationsBefore = rotationCount;
    onTokenRotation = () => {
      mockKeychain.refuseWrites = true;
    };

    await p1.rtl.act(async () => {
      const { error } = await hook.result.current.verifyOtp('probe@example.test', '123456');
      expect(error).toBeNull();
    });
    await p1.rtl.act(drain);

    // The follow-up refresh happened and its persist was refused.
    expect(rotationCount).toBeGreaterThan(rotationsBefore);
    // The provider ended signedOut — the barrier refused the rotated
    // session the bootstrap promise carried — and the NEW demand is
    // durable. At the reviewed candidate this read signedIn here.
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(historyExposed(history, 'probe-access-rot')).toBe(false);
    expect(mockDemandStore.files.size).toBe(1);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);

  it('finding 2 — the mid-process resolution re-read with a refused follow-up persist ends signedOut, nothing exposed', async () => {
    // The second publisher REVIEW-024 named. Bootstrap already ran; a
    // refused rotation forces the demand mid-process (the purge cannot
    // prove: deletes refused); the fresh sign-in resolves it on read-back
    // evidence; the resolution's own getSession() re-read then refreshes
    // the near-expiry fresh session and THAT persist is refused. At the
    // reviewed candidate the branch called setState with no re-check and
    // exposed the unpersisted rotation.
    const p1 = bootProcess();
    const history: AuthProviderModule.AuthState[] = [];
    const hook = await mountProvider(p1, history);
    await signIn(p1, hook);

    // Mid-process refusal: the next settle's margin refresh (rotation 1 of
    // this schedule) is refused persistence; signOut()'s internal refresh
    // (rotation 2) is allowed to land so no unconsumed flag survives the
    // purge — the reviewer's finding-2 toggle, on the fake server's own
    // /token responses. Deletes refuse so the demand stays outstanding.
    const baseRotation = rotationCount;
    onTokenRotation = (rotation) => {
      mockKeychain.refuseWrites = rotation === baseRotation + 1;
    };
    mockKeychain.refuseDeletes = true;
    await foregroundCycle(p1);
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(mockDemandStore.files.size).toBe(1);

    // Recovery for the fresh sign-in; every rotation from here on is
    // refused — the first is the resolution re-read's margin refresh of
    // the fresh 60s session.
    mockKeychain.refuseDeletes = false;
    mockKeychain.refuseWrites = false;
    onTokenRotation = () => {
      mockKeychain.refuseWrites = true;
    };
    const beforeResolution = history.length;

    await p1.rtl.act(async () => {
      const { error } = await hook.result.current.verifyOtp('probe@example.test', '123456');
      expect(error).toBeNull();
    });
    await p1.rtl.act(drain);

    // The resolution ran (the old demand file was cleared on evidence) and
    // the refused follow-up re-raised a new durable demand; the re-read's
    // publication was refused. No render after the resolution began ever
    // held a session. At the reviewed candidate this ended signedIn.
    await p1.rtl.waitFor(() => expect(hook.result.current.state.status).toBe('signedOut'));
    expect(
      history.slice(beforeResolution).some((state) => state.status === 'signedIn'),
    ).toBe(false);
    expect(mockDemandStore.files.size).toBe(1);

    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    p1.rtl.cleanup();
  }, 60_000);
});
