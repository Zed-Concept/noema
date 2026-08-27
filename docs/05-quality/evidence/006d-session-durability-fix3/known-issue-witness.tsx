/**
 * THE KNOWN-ISSUE WITNESS — REVIEW-025 finding 1's two schedules, committed
 * as EXPECTED-RED instruments (ruling 28).
 *
 * This file is the opposite of every other probe in this evidence chain: its
 * WITNESS tests assert the WITHDRAWN invariant — "no path exposes a session
 * while a re-authentication demand is outstanding" — on exactly the two
 * schedules REVIEW-025 demonstrated defeat it, and they are REQUIRED TO
 * FAIL. A failing witness is the committed reproduction of the Known Issue;
 * a PASSING witness means the issue no longer reproduces and this instrument
 * must be retired by the unit that fixes it (the follow-up unit replacing
 * gating with subscription). The runner (`known-issue-witness.sh`) exits 0
 * only when every PRECONDITION test passes AND every WITNESS test fails.
 *
 * THE TWO SCHEDULES — the reviewer's own, from the immutable record:
 *
 *   KNOWN ISSUE 1 (provider, real pinned client): a signed-in user calls the
 *   provider's `signOut()`. The near-expiry session makes auth-js refresh on
 *   the way out; the observed persist of that rotation is refused, which
 *   installs the flag synchronously and records the durable demand. Auth-js
 *   then emits TOKEN_REFRESHED(session) and SIGNED_OUT(null); the listener
 *   gate drops both while a signal stands, and the action publishes no state
 *   itself. The action returns no error, the session key space is empty, and
 *   there are zero unhandled rejections — yet the provider remains signedIn
 *   with a durable demand outstanding.
 *
 *   KNOWN ISSUE 2 (barrier, real modules): `publish(signedIn)` samples both
 *   signals as false and enqueues React state; a signal then rises before
 *   React commits — in the flag variant a REAL observed write is refused
 *   (installing the flag and recording the durable demand through the real
 *   observer); in the demand variant the registered predicate rises. The
 *   queued signedIn commits anyway and stands until the next explicit
 *   `publish()`: the barrier checks publication input, not standing state.
 *
 * The fakes are the committed review024-probe harness verbatim where they
 * overlap: a fake keychain behind `expo-secure-store` (switchable write
 * refusal), a fake file store behind `expo-file-system`, and a fake `fetch`
 * answering the auth endpoints locally. No Supabase service is contacted and
 * no credential exists. No `.test` suffix here, so the ordinary `npm test`
 * never executes it in place — an expected-RED instrument can never live
 * inside the green suite.
 */

import type { AppStateStatus } from 'react-native';
import type * as RTL from '@testing-library/react-native';
import type * as AuthProviderModule from '@/lib/auth/auth-provider';
import type * as AuthStatePublisherModule from '@/lib/auth/auth-state-publisher';
import type * as SessionStorageModule from '@/lib/auth/session-storage';
import type { ReactNode } from 'react';

// The testing library registers an `afterAll` cleanup hook at import time,
// and this probe imports it INSIDE tests — once per simulated process, after
// `jest.resetModules()` — where registering hooks is (correctly) an error.
// Cleanup becomes manual; each process calls `cleanup()` itself.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

// ---------------------------------------------------------------------------
// Persistent fakes — the review024-probe harness. These OUTLIVE
// jest.resetModules(); reset per test.
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
/** Called on every /token response — the seam that lets Known Issue 1 refuse
 * exactly the persist of signOut()'s internal refresh. */
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
 * makes the very next session load refresh it — Known Issue 1 relies on the
 * fresh sign-in's 60s session being near expiry when signOut() loads it. */
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
// Unhandled-rejection capture. Known Issue 1's record includes "zero
// unhandled rejections" — the exposure is not explained by an error.
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
  storage: typeof SessionStorageModule;
  emitAppState: (status: AppStateStatus) => void;
};

function bootProcess(): Process {
  jest.resetModules();
  process.env.EXPO_PUBLIC_SUPABASE_URL = PROBE_URL;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_probe_not_a_real_key';

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { AppState } = require('react-native') as typeof import('react-native');
  const rtl = require('@testing-library/react-native') as typeof RTL;
  const provider = require('@/lib/auth/auth-provider') as typeof AuthProviderModule;
  const storage = require('@/lib/auth/session-storage') as typeof SessionStorageModule;
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
    storage,
    emitAppState: (status) => {
      current = status;
      for (const listener of listeners) listener(status);
    },
  };
}

/** A fresh module registry holding just the barrier and the real storage
 * composition — Known Issue 2's world. No provider, no client, no env. */
type BarrierWorld = {
  rtl: typeof RTL;
  publisher: typeof AuthStatePublisherModule;
  storage: typeof SessionStorageModule;
};

function bootBarrier(): BarrierWorld {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const rtl = require('@testing-library/react-native') as typeof RTL;
  const publisher = require('@/lib/auth/auth-state-publisher') as typeof AuthStatePublisherModule;
  const storage = require('@/lib/auth/session-storage') as typeof SessionStorageModule;
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { rtl, publisher, storage };
}

/** Every key that could hold session material for `baseKey`. */
function sessionKeySpace(baseKey: string): string[] {
  return [...mockKeychain.map.keys()].filter(
    (key) => key === baseKey || key.startsWith(`${baseKey}.`),
  );
}

/** Mount a provider in `proc`, recording every rendered state. */
async function mountProvider(proc: Process, history: AuthProviderModule.AuthState[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <proc.provider.AuthProvider>{children}</proc.provider.AuthProvider>
  );
  const hook = await proc.rtl.renderHook(
    () => {
      const value = proc.provider.useAuth();
      history.push(value.state);
      return value;
    },
    { wrapper },
  );
  return hook;
}

/** Sign in through the real client against the fake server and wait for the
 * provider to expose the session. The /verify session is 60s — near expiry
 * from the moment it is issued. */
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

/** The demand record's file name — the literal `reauth-demand.ts` uses. */
const DEMAND_FILE = 'zc-auth-reauth-demand.json';

const WITNESS_SESSION = {
  access_token: 'witness-opaque',
  refresh_token: 'witness-opaque',
  expires_at: 4102444800,
  user: { id: 'witness-user', email: 'witness@example.test' },
} as unknown as import('@supabase/supabase-js').Session;

/**
 * KNOWN ISSUE 1's schedule, shared by its precondition and witness tests:
 * mount, sign in (near-expiry session persisted), arm the refusal for the
 * next rotation, call the provider's signOut() action, drain.
 */
async function runSignOutSchedule() {
  const proc = bootProcess();
  const history: AuthProviderModule.AuthState[] = [];
  const hook = await mountProvider(proc, history);
  await signIn(proc, hook);
  await proc.rtl.act(drain);

  const rotationsBefore = rotationCount;
  onTokenRotation = () => {
    mockKeychain.refuseWrites = true;
  };

  let actionError: Error | null = null;
  await proc.rtl.act(async () => {
    const { error } = await hook.result.current.signOut();
    actionError = error;
  });
  await proc.rtl.act(drain);

  return { proc, hook, history, rotationsBefore, actionError };
}

describe('REVIEW-025 Known Issue 1 — signOut() under a refused mid-sign-out refresh (severity HIGH, class session exposure)', () => {
  it('KI-1 PRECONDITION — the schedule reproduces: refused rotation, durable demand, empty key space, action error null, zero unhandled', async () => {
    const { proc, hook, rotationsBefore, actionError } = await runSignOutSchedule();

    // The internal near-expiry refresh happened and its persist was refused.
    expect(rotationCount).toBeGreaterThan(rotationsBefore);
    expect(proc.storage.peekSessionPersistenceFailure()).not.toBeNull();
    // The durable demand is outstanding.
    expect(mockDemandStore.files.has(DEMAND_FILE)).toBe(true);
    // No session bytes remain — the logout's removal ran.
    expect(sessionKeySpace(proc.storage.AUTH_SESSION_STORAGE_KEY)).toHaveLength(0);
    // Neither an error nor a residual explains what the witness asserts:
    expect(actionError).toBeNull();
    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await hook.unmount();
    proc.rtl.cleanup();
  }, 60_000);

  it('KI-1 WITNESS (expected RED) — the withdrawn invariant: the provider ends signedOut with the demand outstanding', async () => {
    const { proc, hook } = await runSignOutSchedule();

    // THE WITHDRAWN INVARIANT, asserted so its failure is on the record:
    // a durable demand is outstanding, so no usable session may be exposed.
    // REVIEW-025: the listener gate dropped both TOKEN_REFRESHED(session)
    // and SIGNED_OUT(null), the action published no state, and the provider
    // remained signedIn. EXPECTED RED until the follow-up unit closes the
    // class; a GREEN run here means the Known Issue no longer reproduces.
    expect(hook.result.current.state.status).toBe('signedOut');

    await hook.unmount();
    proc.rtl.cleanup();
  }, 60_000);
});

describe('REVIEW-025 Known Issue 2 — queued signedIn commits past a rising signal (severity HIGH, class session exposure)', () => {
  it('KI-2 PRECONDITION (flag) — the refused observed write installs the flag and durable demand before commit; the NEXT publication is refused', async () => {
    const world = bootBarrier();
    const { result, unmount } = await world.rtl.renderHook(() =>
      world.publisher.useAuthStatePublisher(),
    );
    const storage = world.storage.authSessionStorage;
    expect(storage).toBeDefined();

    await world.rtl.act(async () => {
      // Sampled now: no demand registered, no flag — the barrier lets it
      // through and React queues it.
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
      // The REAL observed write is refused before React commits: the real
      // observer installs the flag synchronously and records the durable
      // demand through the real demand module.
      mockKeychain.refuseWrites = true;
      await storage?.setItem(world.storage.AUTH_SESSION_STORAGE_KEY, 'witness-session-payload');
    });

    // Both signals genuinely stand from before the commit...
    expect(world.storage.peekSessionPersistenceFailure()).not.toBeNull();
    expect(mockDemandStore.files.has(DEMAND_FILE)).toBe(true);
    // ...and the barrier DOES refuse at its input: the next explicit
    // publication resolves to signedOut. What it cannot do is retract the
    // queued commit — that is the witness below.
    await world.rtl.act(async () => {
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
    });
    expect(result.current.state.status).toBe('signedOut');

    await unmount();
    world.rtl.cleanup();
  }, 60_000);

  it('KI-2 WITNESS (expected RED, flag) — the withdrawn invariant: the queued signedIn does not commit past the rising flag', async () => {
    const world = bootBarrier();
    const { result, unmount } = await world.rtl.renderHook(() =>
      world.publisher.useAuthStatePublisher(),
    );
    const storage = world.storage.authSessionStorage;

    await world.rtl.act(async () => {
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
      mockKeychain.refuseWrites = true;
      await storage?.setItem(world.storage.AUTH_SESSION_STORAGE_KEY, 'witness-session-payload');
    });

    // THE WITHDRAWN INVARIANT: the flag and durable demand rose before
    // React committed, so no usable session may stand. REVIEW-025: the
    // queued value commits anyway — the barrier checked its input when
    // publish() was called and nothing re-evaluates the standing state.
    // EXPECTED RED until the follow-up unit closes the class.
    expect(result.current.state.status).toBe('signedOut');

    await unmount();
    world.rtl.cleanup();
  }, 60_000);

  it('KI-2 PRECONDITION (demand) — the predicate rises before commit; the NEXT publication is refused', async () => {
    const world = bootBarrier();
    const { result, unmount } = await world.rtl.renderHook(() =>
      world.publisher.useAuthStatePublisher(),
    );

    let outstanding = false;
    await world.rtl.act(async () => {
      result.current.setDemandSignal(() => outstanding);
    });
    await world.rtl.act(async () => {
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
      outstanding = true;
    });

    // The signal stands, and the barrier refuses the NEXT publication at
    // its input — sampling works; retraction is what the witness shows
    // missing.
    await world.rtl.act(async () => {
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
    });
    expect(result.current.state.status).toBe('signedOut');

    await unmount();
    world.rtl.cleanup();
  }, 60_000);

  it('KI-2 WITNESS (expected RED, demand) — the withdrawn invariant: the queued signedIn does not commit past the rising demand', async () => {
    const world = bootBarrier();
    const { result, unmount } = await world.rtl.renderHook(() =>
      world.publisher.useAuthStatePublisher(),
    );

    let outstanding = false;
    await world.rtl.act(async () => {
      result.current.setDemandSignal(() => outstanding);
    });
    await world.rtl.act(async () => {
      result.current.publish({ status: 'signedIn', session: WITNESS_SESSION });
      outstanding = true;
    });

    // THE WITHDRAWN INVARIANT: the demand predicate rose before React
    // committed, so no usable session may stand. REVIEW-025: changing the
    // demand predicate does not cause re-evaluation; the queued signedIn
    // commits and remains. EXPECTED RED until the follow-up unit closes
    // the class.
    expect(result.current.state.status).toBe('signedOut');

    await unmount();
    world.rtl.cleanup();
  }, 60_000);
});
