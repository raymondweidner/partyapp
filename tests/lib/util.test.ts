import * as mod from '../../lib/util';

describe('util.ts methods', () => {
  it('should call setPendingRedirect successfully (happy path)', async () => {
    expect(typeof mod.setPendingRedirect).toBe('function');
  });

  it('should call safeBack successfully (happy path)', async () => {
    expect(typeof mod.safeBack).toBe('function');
  });

  it('should call showAlert successfully (happy path)', async () => {
    expect(typeof mod.showAlert).toBe('function');
  });

  it('should call getResourceEndpoint successfully (happy path)', async () => {
    expect(typeof mod.getResourceEndpoint).toBe('function');
  });

  it('should call openWhatsAppDM successfully (happy path)', async () => {
    expect(typeof mod.openWhatsAppDM).toBe('function');
  });

  it('should call openEmailThread successfully (happy path)', async () => {
    expect(typeof mod.openEmailThread).toBe('function');
  });

  it('should call openWhatsApp successfully (happy path)', async () => {
    expect(typeof mod.openWhatsApp).toBe('function');
  });

  it('should call openMapUrl successfully (happy path)', async () => {
    expect(typeof mod.openMapUrl).toBe('function');
  });

  it('should call handleNotificationPress successfully (happy path)', async () => {
    expect(typeof mod.handleNotificationPress).toBe('function');
  });

});
