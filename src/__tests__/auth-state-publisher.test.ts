import { act, renderHook } from '@testing-library/react-native';

import { useAuthStatePublisher } from '@/lib/auth/auth-state-publisher';

// Jest runs these suites under CommonJS, where `require` carries `resolve`
// and can load node's `fs` — but the app tsconfig types neither (no
// @types/node, deliberately: the app is not a node program). Typed here
// narrowly instead of widening the whole project's type environment for one
// source-shape test.
const nodeRequire = require as unknown as {
  (id: 'fs'): { readFileSync: (path: string, encoding: 'utf8') => string };
  resolve: (id: string) => string;
};

/**
 * THE ONE PUBLICATION BARRIER — REVIEW-024 finding 2, tested at the module
 * that carries it. Every publication of provider auth state flows through
 * `publish`, which re-checks the registered demand signal and the unconsumed
 * write-refusal flag AT PUBLICATION TIME and refuses to publish `signedIn`
 * while either stands — resolving to `signedOut` instead, never dropping
 * silently (a dropped bootstrap resolution would strand `bootstrapping`).
 *
 * The flag is read through the real import seam (`session-storage.ts`),
 * mocked here so both barrier halves can be driven independently; the
 * composition against the real observer runs in the review024 probe.
 */
jest.mock('@/lib/auth/session-storage', () => ({
  peekSessionPersistenceFailure: jest.fn(),
}));

const { peekSessionPersistenceFailure } = jest.requireMock('@/lib/auth/session-storage') as {
  peekSessionPersistenceFailure: jest.Mock;
};

const SESSION = {
  access_token: 'opaque',
  refresh_token: 'opaque',
  expires_at: 4102444800,
  user: { id: 'user-1', email: 'someone@example.test' },
} as unknown as import('@supabase/supabase-js').Session;

beforeEach(() => {
  peekSessionPersistenceFailure.mockReturnValue(null);
});

describe('auth state publisher — the publication barrier', () => {
  it('starts bootstrapping and publishes freely while neither signal stands', async () => {
    const { result } = await renderHook(() => useAuthStatePublisher());
    expect(result.current.state).toEqual({ status: 'bootstrapping' });

    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedIn');

    await act(async () => result.current.publish({ status: 'signedOut' }));
    expect(result.current.state.status).toBe('signedOut');
  });

  it('refuses signedIn while the registered demand signal stands — signedOut is published instead', async () => {
    const { result } = await renderHook(() => useAuthStatePublisher());
    let outstanding = true;
    await act(async () => result.current.setDemandSignal(() => outstanding));

    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedOut');

    // The signal is re-checked at EVERY publication — once it clears, the
    // same publisher's next publication passes.
    outstanding = false;
    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedIn');
  });

  it('refuses signedIn while the write-refusal flag stands — the observer-ahead-of-cache window', async () => {
    const { result } = await renderHook(() => useAuthStatePublisher());
    peekSessionPersistenceFailure.mockReturnValue({
      key: 'zc-auth-session',
      cause: new Error('errSecInteractionNotAllowed'),
    });

    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedOut');

    peekSessionPersistenceFailure.mockReturnValue(null);
    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedIn');
  });

  it('checks the signals at publication time, not registration time', async () => {
    // The finding-2 shape in miniature: the signal rises AFTER the caller's
    // await began and BEFORE it publishes. Only a publication-time check
    // catches it.
    const { result } = await renderHook(() => useAuthStatePublisher());
    let outstanding = false;
    await act(async () => result.current.setDemandSignal(() => outstanding));

    outstanding = true;
    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedOut');
  });

  it('lets non-session publications through while a signal stands', async () => {
    // signedOut and bootstrapping carry nothing to protect; the barrier bars
    // exactly the exposure, not the resolution.
    const { result } = await renderHook(() => useAuthStatePublisher());
    await act(async () => result.current.setDemandSignal(() => true));

    await act(async () => result.current.publish({ status: 'signedOut' }));
    expect(result.current.state.status).toBe('signedOut');

    await act(async () => result.current.publish({ status: 'bootstrapping' }));
    expect(result.current.state.status).toBe('bootstrapping');
  });

  it('defaults to no demand signal before the session effect registers one', async () => {
    const { result } = await renderHook(() => useAuthStatePublisher());
    await act(async () => result.current.publish({ status: 'signedIn', session: SESSION }));
    expect(result.current.state.status).toBe('signedIn');
  });
});

describe('auth state publisher — the current publisher enumeration and source shape', () => {
  // NARROWED (ruling 28, REVIEW-025 finding 1). REVIEW-024 finding 2 asked
  // for "no caller may reach setState with a session by another route" as a
  // type- or lint-level fact; that claim is WITHDRAWN. What holds: the raw
  // setter is a closure variable of the hook, never returned, so no other
  // scope can name THAT variable; the eslint.config.js restriction bars the
  // direct named `useState` import in auth-provider.tsx (that one shape —
  // the bypass is documented beside the rule); and THESE tests enumerate the
  // CURRENT source bytes. REVIEW-025 minted a second setter in the provider
  // from a default React import destructured under an alias while ESLint and
  // every assertion below stayed green — so these pins catch drift in the
  // named shapes, not every possible channel. Enumeration, not
  // impossibility.
  //
  // THE PUBLISHER ENUMERATION — every state publication in auth-provider.tsx,
  // named; each is exercised through the barrier by the provider suite and
  // the review024 probe:
  //   1. resolveOnce            — the bootstrap resolution (getSession .then,
  //                               its .catch, and the bootstrap timeout)
  //   2. the auth listener      — onAuthStateChange
  //   3. requireReauthentication — the flag-driven signedOut
  //   4. evaluate               — the outstanding-demand signedOut
  //   5. resolveDemandByFreshSignIn — the mid-process resolution re-read
  const { readFileSync } = nodeRequire('fs');
  const providerSource = readFileSync(nodeRequire.resolve('@/lib/auth/auth-provider'), 'utf8');
  const publisherSource = readFileSync(
    nodeRequire.resolve('@/lib/auth/auth-state-publisher'),
    'utf8',
  );

  it('auth-provider.tsx contains no useState and no setState call site', () => {
    // Call-or-import syntax, not prose: comments may NAME useState (the lint
    // ban's own explanation does); no code may import or invoke it.
    expect(providerSource.match(/\buseState\s*[<(]/g)).toBeNull();
    const reactImport = providerSource.match(/import \{[^}]*\} from 'react'/);
    expect(reactImport).not.toBeNull();
    expect((reactImport as RegExpMatchArray)[0]).not.toContain('useState');
    expect(providerSource.match(/\bsetState\s*\(/g)).toBeNull();
  });

  it('auth-provider.tsx publishes at exactly the five enumerated sites, all through publish()', () => {
    expect(providerSource.match(/\bpublish\(/g)).toHaveLength(5);
  });

  it('the raw setter has exactly one owner: one useState, called only inside the barrier', () => {
    expect(publisherSource.match(/\buseState\s*[<(]/g)).toHaveLength(1);
    // Two setState calls, both inside `publish`: the refusal's signedOut and
    // the ordinary publication.
    expect(publisherSource.match(/\bsetState\s*\(/g)).toHaveLength(2);
  });
});
