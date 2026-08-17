import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { checkInEvent, checkOutEvent } from './service';

export const GEOFENCE_TASK_NAME = 'GEOFENCE_TASK';

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofence task error:', error);
    return;
  }
  
  if (data) {
    const { eventType, region } = data as any;
    // region.identifier should be the eventId passed when starting the geofence
    const eventId = region.identifier;

    // TODO: In a real app, you would retrieve the user's auth token securely (e.g. from SecureStore or an active session)
    // For this example, we assume a globally accessible token or you'd inject it when initializing
    const authToken = "PLACEHOLDER_TOKEN"; 

    try {
      if (eventType === Location.GeofencingEventType.Enter) {
        console.log(`Entered geofence for event ${eventId}`);
        // Call checkIn endpoint. The background task may not have exact lat/lng immediately from the region object, 
        // so we could fetch the latest location, but the backend validates it anyway if we provide the region's center 
        // or the device's current known location.
        const location = await Location.getLastKnownPositionAsync();
        if (location) {
          await checkInEvent(authToken, eventId, location.coords.latitude, location.coords.longitude);
        }
      } else if (eventType === Location.GeofencingEventType.Exit) {
        console.log(`Exited geofence for event ${eventId}`);
        await checkOutEvent(authToken, eventId);
      }
    } catch (err) {
      console.error('Failed to process geofence event:', err);
    }
  }
});

export const startGeofencing = async (eventId: string, latitude: number, longitude: number, radiusMeters: number) => {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Background location permission denied');
    return;
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
    {
      identifier: eventId,
      latitude,
      longitude,
      radius: radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    }
  ]);
};

export const stopGeofencing = async (eventId: string) => {
  const isRunning = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
  if (isRunning) {
    // Note: Expo doesn't have stopGeofencingAsync for a single identifier out of the box without tracking it yourself,
    // so typically you might stop all or manage regions actively.
    await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
  }
};
