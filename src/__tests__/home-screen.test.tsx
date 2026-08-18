import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';

// Trivial smoke test. Its job is to prove the harness itself runs — jest-expo
// preset, TSX transform, React Native renderer — not to assert anything about
// product behaviour, of which there is none yet.
describe('placeholder home screen', () => {
  it('renders', async () => {
    await render(<Index />);

    expect(screen.getByText('Placeholder home screen')).toBeTruthy();
  });
});
