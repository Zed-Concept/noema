/**
 * The REVIEW-022 finding-3 probe, reproduced as a committed instrument.
 *
 * Run by `finding3-probe.sh`, which copies this file into a disposable
 * worktree as `src/__tests__/finding3-probe.test.tsx` — once at the pinned
 * BASE (`7caf23e1`, where every assertion below that encodes ADR-009's three
 * requirements FAILS: that RED run is the probe's positive control, learning
 * 14) and once at the candidate head (where all must PASS). The filename here
 * carries no `.test` suffix precisely so the ordinary `npm test` run never
 * executes it: it needs the module scheduling below, and it exists to be run
 * against TWO trees, which no in-place jest run can do.
 *
 * WHAT IT IS: the real pinned `@supabase/supabase-js` client, constructed by
 * the app's own `src/lib/supabase.ts`, over the app's own session-storage
 * composition — with exactly three things injected, all beneath the app code:
 * a fake keychain behind `expo-secure-store` whose write/delete refusals are
 * switchable, a fake file store behind `expo-file-system`, and a fake `fetch`
 * that answers the auth endpoints locally. No Supabase service is contacted,
 * no credential exists, and every byte of "server" response is fabricated
 * here (REVIEW-022 ran this composition ad hoc; learning 20 is why it is a
 * probe and not a source reading).
 *
 * WHAT IT OBSERVES — only externals that exist at BOTH revisions: the fake
 * keychain's contents and call counts, the fake file store's contents,
 * unhandled promise rejections, and the provider's rendered state. It
 * imports no module added by this unit, so the BASE run fails on facts, not
 * on missing files.
 *
 * THE SCHEDULE (three simulated processes over one persistent fake storage):
 *   Process 1 — sign in (near-expiry session persisted), then the keychain
 *   refuses writes and deletes; a foreground settle triggers the margin
 *   refresh; the rotated write is refused; recovery runs. Then one more
 *   foreground while the store still refuses.
 *   Process 2 — RESTART: fresh module state over the same fakes, store still
 *   refusing. The demand must be honoured before any session is exposed.
 *   Then the store recovers, and the purge must complete and be PROVEN.
 */

import type { AppStateStatus } from 'react-native';
import type * as RTL from '@testing-library/react-native';
import type * as AuthProviderModule from '@/lib/auth/auth-provider';
import type { ReactNode } from 'react';

// The testing library registers an `afterAll` cleanup hook at import time,
// and this probe imports it INSIDE the test — once per simulated process,
// after `jest.resetModules()` — where registering hooks is (correctly) an
// error. The library's own escape hatch for exactly this: cleanup becomes
// manual, and each process below calls `cleanup()` itself.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

// ---------------------------------------------------------------------------
// Persistent fakes. These OUTLIVE jest.resetModules() — deliberately: they
// are the disk and the network, the things a process restart preserves.
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

/** The app-sandbox file store the durable demand lives in (head only; at the
 * base nothing imports this module and the fake simply stays empty — which is
 * exactly what the demand assertions then catch). */
const mockDemandFiles = new Map<string, string>();

jest.mock('expo-file-system', () => {
  class MockFile {
    private readonly name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
    }
    get exists(): boolean {
      return mockDemandFiles.has(this.name);
    }
    textSync(): string {
      const value = mockDemandFiles.get(this.name);
      if (value === undefined) throw new Error('probe-demand-file-absent');
      return value;
    }
    write(value: string): void {
      mockDemandFiles.set(this.name, value);
    }
    delete(): void {
      mockDemandFiles.delete(this.name);
    }
  }
  return { File: MockFile, Paths: { document: {} } };
});

// ---------------------------------------------------------------------------
// The fake auth server. Every response is fabricated locally.
// ---------------------------------------------------------------------------

const PROBE_URL = 'https://probe-project.example.test';
const fetchLog: string[] = [];
let rotationCount = 0;

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
  fetchLog.push(url.replace(PROBE_URL, '').split('?')[0]);
  if (url.includes('/auth/v1/verify')) {
    // The seeded session: near expiry from the moment it is issued.
    return jsonResponse(fakeSessionBody('v1', 60));
  }
  if (url.includes('/auth/v1/token')) {
    rotationCount += 1;
    return jsonResponse(fakeSessionBody(`rot${rotationCount}`, 3600));
  }
  if (url.includes('/auth/v1/logout')) {
    return jsonResponse({}, 204);
  }
  throw new Error(`probe: unexpected fetch ${url}`);
}) as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Unhandled-rejection capture — REVIEW-022 observed two unhandled
// `refused-session-write` rejections on this path at the base.
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
  // session already in the fake keychain. That construction-time behaviour is
  // part of what this probe measures.
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

/** Every key that could hold session material for `baseKey` in the fake
 * keychain: the index key itself plus every chunked fragment under it. */
function sessionKeySpace(baseKey: string): string[] {
  return [...mockKeychain.map.keys()].filter(
    (key) => key === baseKey || key.startsWith(`${baseKey}.`),
  );
}

/** The session's base key, discovered from what the adapter actually wrote —
 * never derived, so the probe works identically at base and head, whichever
 * storage key the client uses there. The adapter's index is the only value
 * whose text starts with its marker. */
function discoverSessionKey(): string {
  const candidates = [...mockKeychain.map.entries()]
    .filter(([, value]) => value.startsWith('{"__scs"'))
    .map(([key]) => key);
  expect(candidates).toHaveLength(1);
  return candidates[0];
}

// ---------------------------------------------------------------------------
// The schedule. One test so the three processes share one storage history,
// exactly as one device would.
// ---------------------------------------------------------------------------

describe('REVIEW-022 finding 3 — the probe (RED at base 7caf23e1, GREEN at the candidate)', () => {
  it('purge is observed, the demand survives restart, and no rejection goes unhandled', async () => {
    // ----------------------------------------------------- process 1: seed
    const p1 = bootProcess();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <p1.provider.AuthProvider>{children}</p1.provider.AuthProvider>
    );
    const first = await p1.rtl.renderHook(() => p1.provider.useAuth(), { wrapper });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    // Sign in through the real client against the fake server. The session it
    // persists expires in 60s — inside auth-js's 90s margin, so every later
    // load of it refreshes.
    await p1.rtl.act(async () => {
      const { error } = await first.result.current.verifyOtp('probe@example.test', '123456');
      expect(error).toBeNull();
    });
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedIn'));
    const sessionKey = discoverSessionKey();
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);

    // ------------------------------- process 1: the keychain stops accepting
    mockKeychain.refuseWrites = true;
    mockKeychain.refuseDeletes = true;
    const deleteAttemptsBeforeRecovery = mockKeychain.deleteAttempts;

    // A foreground settle loads the near-expiry session; the margin refresh
    // rotates it at the (fake) server; the keychain refuses the write.
    // Recovery — whatever the revision under test does — runs from here.
    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);
    await p1.rtl.waitFor(() => expect(first.result.current.state.status).toBe('signedOut'));

    // One more foreground with the store still refusing: a recovery that is
    // real keeps trying; one that inferred success from silence stops here.
    await p1.rtl.act(async () => {
      p1.emitAppState('background');
    });
    await p1.rtl.act(async () => {
      p1.emitAppState('active');
    });
    await p1.rtl.act(drain);

    // ADR-009 requirement 1 (recovery half): the purge is ATTEMPTED against
    // the store while the residual exists — deletion demanded, not inferred.
    // At the base, `signOut()` rejected before any removal was attempted, its
    // silence was read as success, and NO delete was ever attempted: this
    // count stays zero there.
    expect(mockKeychain.deleteAttempts).toBeGreaterThan(deleteAttemptsBeforeRecovery);

    // ADR-009 requirement 2 (record half): while the purge is unproven, a
    // DURABLE demand exists outside the keychain — a version, a reason, a
    // timestamp, and no token material. At the base no such record exists.
    expect(mockDemandFiles.size).toBe(1);
    const demandRaw = [...mockDemandFiles.values()][0];
    const demand = JSON.parse(demandRaw) as Record<string, unknown>;
    expect(Object.keys(demand).sort()).toEqual(['at', 'reason', 'v']);
    expect(demandRaw).not.toContain('probe-access');
    expect(demandRaw).not.toContain('probe-refresh');

    await first.unmount();
    p1.rtl.cleanup();
    await drain();

    // -------------------------------------- process 2: RESTART, still refusing
    // Fresh module state — every process-local flag any revision keeps is
    // gone. The same fake keychain still holds the residual; the same fake
    // file store holds (or at the base, does not hold) the demand. Note the
    // client is REconstructed here with a near-expiry session already in
    // storage: its construction-time load and refresh attempt is recorded
    // library behaviour (ADR-009), and the write it attempts is refused.
    const p2 = bootProcess();
    let everSignedInAfterRestart = false;
    const wrapper2 = ({ children }: { children: ReactNode }) => (
      <p2.provider.AuthProvider>{children}</p2.provider.AuthProvider>
    );
    const second = await p2.rtl.renderHook(() => p2.provider.useAuth(), { wrapper: wrapper2 });
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

    // The demand outlived the restart and is still honoured: the residual
    // session is in the keychain, readable, and the provider is NOT signed in.
    expect(sessionKeySpace(sessionKey).length).toBeGreaterThan(0);
    expect(second.result.current.state.status).toBe('signedOut');

    // ------------------------------- process 2: the keychain recovers
    mockKeychain.refuseWrites = false;
    mockKeychain.refuseDeletes = false;

    await p2.rtl.act(async () => {
      p2.emitAppState('background');
    });
    await p2.rtl.act(async () => {
      p2.emitAppState('active');
    });
    await p2.rtl.act(drain);
    track();

    // ADR-009 requirement 1 (proof half): with the store answering again, the
    // retried purge completes and the read-back can prove it — the fake
    // keychain's OWN contents are the ground truth this probe checks against.
    // At the base nothing retries (the demand was already "met" by silence),
    // so the residual outlives this forever.
    await p2.rtl.waitFor(() => expect(sessionKeySpace(sessionKey)).toHaveLength(0));

    // The demand ends with the residual: proven purge, cleared record.
    expect(mockDemandFiles.size).toBe(0);

    // And the residual was never exposed: across the whole restarted process
    // the provider never reported signedIn — not from the readable residual
    // before the purge, not from anything after it.
    track();
    expect(everSignedInAfterRestart).toBe(false);
    expect(second.result.current.state.status).toBe('signedOut');

    // ADR-009 requirement 3: across every schedule above — refused rotated
    // writes, refused purges, a restart, a recovery — not one
    // `refused-session-write` rejection went unhandled. REVIEW-022 observed
    // two at the base from a single refused rotation.
    await drain();
    expect(refusedWriteUnhandledCount()).toBe(0);

    await second.unmount();
    p2.rtl.cleanup();
  }, 60_000);
});
