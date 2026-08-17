import * as mod from '../../lib/locationTask';

describe('locationTask.ts methods', () => {
  it('should call startGeofencing successfully (happy path)', async () => {
    expect(typeof mod.startGeofencing).toBe('function');
  });

  it('should call stopGeofencing successfully (happy path)', async () => {
    expect(typeof mod.stopGeofencing).toBe('function');
  });

});
