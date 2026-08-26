import { render, screen } from '@testing-library/react-native';

import Index from '@/app/(app)/index';

// The home screen now reads session state from context. Mocking the provider
// keeps this a harness smoke test rather than a second copy of the provider
// tests, which live in auth-provider.test.tsx.
jest.mock('@/lib/auth/auth-provider', () => ({
  useAuth: () => ({
    state: {
      status: 'signedIn',
      session: { user: { email: 'someone@example.test' } },
    },
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Trivial smoke test. Its job is to prove the harness itself runs — jest-expo
// preset, TSX transform, React Native renderer — not to assert anything about
// product behaviour, of which there is none yet.
describe('placeholder home screen', () => {
  it('renders', async () => {
    await render(<Index />);

    expect(screen.getByText('Placeholder home screen')).toBeTruthy();
  });

  it('shows who is signed in and offers a way out', async () => {
    await render(<Index />);

    expect(screen.getByText('Signed in as someone@example.test')).toBeTruthy();
    expect(screen.getByText('Sign out')).toBeTruthy();
  });
});
