import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
// import firestore from '@react-native-firebase/firestore'; // Removed uninstalled dependency

interface LiveMapModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  targetUserId?: string; // If provided, only show this user. Otherwise, show all.
}

interface UserLocation {
  id: string;
  latitude: number;
  longitude: number;
}

export const LiveMapModal: React.FC<LiveMapModalProps> = ({ visible, onClose, eventId, targetUserId }) => {
  const [locations, setLocations] = useState<UserLocation[]>([]);

  useEffect(() => {
    if (!visible || !eventId) return;

    // Subscribe to Firestore live locations for this event
    /*
    const unsubscribe = firestore()
      .collection('events')
      .doc(eventId)
      .collection('locations')
      .onSnapshot(
        (snapshot: any) => {
          if (!snapshot) return;
          const newLocations: UserLocation[] = [];
          snapshot.forEach((doc: any) => {
            if (!targetUserId || doc.id === targetUserId) {
              const data = doc.data();
              if (data.latitude && data.longitude) {
                newLocations.push({
                  id: doc.id,
                  latitude: data.latitude,
                  longitude: data.longitude,
                });
              }
            }
          });
          setLocations(newLocations);
        },
        (error: any) => {
          console.error("Error fetching live locations:", error);
        }
      );
    return () => unsubscribe();
    */
    console.warn("LiveMapModal: firestore live locations are disabled because the package is not installed.");
    return () => {};
  }, [visible, eventId, targetUserId]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{targetUserId ? "User Location" : "All Attendees"}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {locations.length > 0 ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: locations[0].latitude,
              longitude: locations[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                title={`User: ${loc.id}`}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Waiting for location data...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50, // Avoid safe area
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: '#007AFF',
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});
