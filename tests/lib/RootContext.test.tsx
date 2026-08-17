import * as mod from '../../lib/RootContext';

describe('RootContext.tsx methods', () => {
  it('should call useUserDevice successfully (happy path)', async () => {
    expect(typeof mod.useUserDevice).toBe('function');
  });

  it('should call useCurrentMember successfully (happy path)', async () => {
    expect(typeof mod.useCurrentMember).toBe('function');
  });

  it('should call useNotifications successfully (happy path)', async () => {
    expect(typeof mod.useNotifications).toBe('function');
  });

  it('should call UserDeviceProvider successfully (happy path)', async () => {
    expect(typeof mod.UserDeviceProvider).toBe('function');
  });

  it('should call CurrentMemberProvider successfully (happy path)', async () => {
    expect(typeof mod.CurrentMemberProvider).toBe('function');
  });

  it('should call NotificationsProvider successfully (happy path)', async () => {
    expect(typeof mod.NotificationsProvider).toBe('function');
  });

});
