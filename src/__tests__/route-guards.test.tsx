import { render, screen } from '@testing-library/react-native';

import AppLayout from '@/app/(app)/_layout';
import AuthLayout from '@/app/(auth)/_layout';
import RootLayout from '@/app/_layout';
import { APP_NAME } from '@/lib/app-config';
import type { AuthState } from '@/lib/auth/auth-provider';

// The state the guards see. Mutated per test; read lazily by the mocked hook,
// so it is initialised long before anything calls it.
const mockAuth: { state: AuthState } = { state: { status: 'bootstrapping' } };

jest.mock('@/lib/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuth,
}));

// Stand-ins that make the navigator and any redirect observable in the tree.
//
// `require` rather than `import`: a jest.mock factory is hoisted above the
// import block, so the module registry is not reachable any other way. The rule
// is suppressed for exactly those lines, not for the file.
jest.mock('expo-router', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require('react');
  const { Text, View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */

  // Named function declarations: an anonymous arrow here trips react/display-name.
  function Stack({ children }: { children?: React.ReactNode }) {
    return React.createElement(View, { testID: 'stack' }, children);
  }

  Stack.Screen = function StackScreen({
    name,
    options,
  }: {
    name: string;
    options?: { title?: string };
  }) {
    return React.createElement(Text, { testID: `screen:${name}` }, options?.title ?? '');
  };

  function Redirect({ href }: { href: string }) {
    return React.createElement(Text, { testID: 'redirect' }, String(href));
  }

  return { Stack, Redirect };
});

const SESSION = {
  access_token: 'opaque',
  refresh_token: 'opaque',
  expires_at: 4102444800,
  user: { id: 'user-1', email: 'someone@example.test' },
} as unknown as Extract<AuthState, { status: 'signedIn' }>['session'];

describe('route protection — while the session is unresolved', () => {
  it('mounts no navigator at the root, so protected content cannot flash', async () => {
    mockAuth.state = { status: 'bootstrapping' };

    await render(<RootLayout />);

    expect(screen.queryByTestId('stack')).toBeNull();
    expect(screen.queryByTestId('redirect')).toBeNull();
    expect(screen.getByLabelText('Restoring your session')).toBeTruthy();
  });

  it('renders neither screens nor a redirect inside the protected group', async () => {
    mockAuth.state = { status: 'bootstrapping' };

    await render(<AppLayout />);

    expect(screen.queryByTestId('stack')).toBeNull();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });
});

describe('route protection — once the session is known', () => {
  it('sends a signed-out visitor from the protected group to sign-in', async () => {
    mockAuth.state = { status: 'signedOut' };

    await render(<AppLayout />);

    expect(screen.getByTestId('redirect')).toHaveTextContent('/sign-in');
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  it('shows the protected group to a signed-in user', async () => {
    mockAuth.state = { status: 'signedIn', session: SESSION };

    await render(<AppLayout />);

    expect(screen.getByTestId('stack')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('sends a signed-in user away from the sign-in group', async () => {
    mockAuth.state = { status: 'signedIn', session: SESSION };

    await render(<AuthLayout />);

    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
    expect(screen.queryByTestId('stack')).toBeNull();
  });

  it('shows the sign-in group to a signed-out visitor', async () => {
    mockAuth.state = { status: 'signedOut' };

    await render(<AuthLayout />);

    expect(screen.getByTestId('stack')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('mounts the navigator once the session resolves', async () => {
    mockAuth.state = { status: 'signedOut' };

    await render(<RootLayout />);

    expect(screen.getByTestId('stack')).toBeTruthy();
  });
});

describe('chrome — screen titles are set, not derived from the route name', () => {
  it('titles the home screen from the single config source', async () => {
    mockAuth.state = { status: 'signedIn', session: SESSION };

    await render(<AppLayout />);

    const title = screen.getByTestId('screen:index');
    // The defect being closed is a header reading "index", the route name.
    expect(title).not.toHaveTextContent('index');
    // Resolved from the single config source, not written into the screen.
    expect(title).toHaveTextContent(APP_NAME);
  });

  it('titles the sign-in screen explicitly', async () => {
    mockAuth.state = { status: 'signedOut' };

    await render(<AuthLayout />);

    const title = screen.getByTestId('screen:sign-in');
    expect(title).not.toHaveTextContent('sign-in');
    expect(title).toHaveTextContent(`Sign in · ${APP_NAME}`);
  });
});
