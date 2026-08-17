import * as mod from '../../lib/auth';

describe('auth.tsx methods', () => {
  it('should call useAuth successfully (happy path)', async () => {
    expect(typeof mod.useAuth).toBe('function');
  });

  it('should call AuthProvider successfully (happy path)', async () => {
    expect(typeof mod.AuthProvider).toBe('function');
  });

});
