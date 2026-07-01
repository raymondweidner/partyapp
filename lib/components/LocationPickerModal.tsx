import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, TextInput, ActivityIndicator, Modal, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { colors, globalStyles } from '../theme';
import { openMapUrl } from '../util';

// NOTE: Replace with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyAo-sW5eo87zuK3qg2Nv8ov_OJ2pU453yY";

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  initialValue?: string;
  mapType?: string;
}

export function LocationPickerModal({ visible, onClose, onSelect, initialValue = "", mapType = "google" }: LocationPickerModalProps) {
  const [mode, setMode] = useState<"autocomplete" | "embedded">("autocomplete");
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentAddress, setCurrentAddress] = useState(initialValue);
  const mapRef = useRef<MapView>(null);

  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMode("autocomplete");
      setCurrentAddress(initialValue);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible, initialValue]);

  useEffect(() => {
    if (mode === "embedded") {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setRegion(prev => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      })();
    }
  }, [mode]);

  const handleRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion);
    setLoadingLoc(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        const formatted = `${addr.name ? addr.name + ', ' : ''}${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.replace(/^, | ,|, $/g, '').trim();
        setCurrentAddress(formatted);
      } else {
        setCurrentAddress("Unknown Location");
      }
    } catch (e) {
      setCurrentAddress("Unknown Location");
    } finally {
      setLoadingLoc(false);
    }
  };

  const confirmLocation = () => {
    onSelect(currentAddress);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <BlurView intensity={20} tint="light" style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Location</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.pickerContainer}>
            {mode === "autocomplete" ? (
              <View style={{ flex: 1, zIndex: 1000 }}>
                <GooglePlacesAutocomplete
                  placeholder="Search for a place"
                  onPress={(data) => {
                    setCurrentAddress(data.description);
                    onSelect(data.description);
                    onClose();
                  }}
                  onFail={(error) => console.log('Google Places Error:', error)}
                  query={{
                    key: GOOGLE_MAPS_API_KEY,
                    language: 'en',
                  }}
                  requestUrl={{
                    useOnPlatform: 'web',
                    url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
                  }}
                  styles={{
                      textInputContainer: {
                        width: '100%',
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        borderBottomWidth: 0,
                        padding: 10,
                      },
                      textInput: {
                        ...globalStyles.input,
                        backgroundColor: colors.glassBackground,
                        color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                      row: {
                        backgroundColor: colors.background,
                        padding: 13,
                        height: 44,
                        flexDirection: 'row',
                      },
                      description: {
                        color: colors.text,
                      },
                      separator: {
                        height: 1,
                        backgroundColor: colors.border,
                      },
                    }}
                    textInputProps={{
                      placeholderTextColor: colors.textMuted,
                      defaultValue: currentAddress,
                      onChangeText: (text) => setCurrentAddress(text)
                    }}
                  />
                
                <View style={styles.footerLinks}>
                  <TouchableOpacity onPress={() => setMode("embedded")}>
                    <Text style={styles.linkText}>Use interactive map instead?</Text>
                  </TouchableOpacity>
                  
                  {currentAddress ? (
                    <TouchableOpacity onPress={() => openMapUrl(currentAddress, mapType)} style={{ marginTop: 15 }}>
                      <Text style={[styles.linkText, { color: colors.primary }]}>Open currently typed location in map?</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                {Platform.OS === 'web' ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted }}>Interactive Map not supported on Web.</Text>
                    <TextInput
                      style={[globalStyles.input, { width: '100%', marginTop: 10 }]}
                      value={currentAddress}
                      onChangeText={setCurrentAddress}
                      placeholder="Enter location manually"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity style={[globalStyles.primaryButton, { marginTop: 10 }]} onPress={confirmLocation}>
                      <Text style={globalStyles.primaryButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <MapView
                      ref={mapRef}
                      style={{ flex: 1 }}
                      region={region}
                      onRegionChangeComplete={handleRegionChangeComplete}
                    >
                      <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
                    </MapView>
                    
                    <View style={styles.addressOverlay}>
                      {loadingLoc ? (
                        <ActivityIndicator size="small" color="#00F0FF" />
                      ) : (
                        <Text style={styles.addressText} numberOfLines={2}>{currentAddress || "Select a location"}</Text>
                      )}
                      <TouchableOpacity style={styles.confirmButton} onPress={confirmLocation}>
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <View style={[styles.footerLinks, { backgroundColor: colors.background }]}>
                  <TouchableOpacity onPress={() => setMode("autocomplete")}>
                    <Text style={styles.linkText}>Use search instead?</Text>
                  </TouchableOpacity>
                  
                  {currentAddress ? (
                    <TouchableOpacity onPress={() => openMapUrl(currentAddress, mapType)} style={{ marginTop: 15 }}>
                      <Text style={[styles.linkText, { color: colors.primary }]}>Open currently selected location in map?</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.glassBackground,
  },
  headerButton: {
    color: colors.primary,
    fontSize: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerContainer: {
    flex: 1,
  },
  footerLinks: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  linkText: {
    color: colors.accent,
    fontSize: 16,
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressText: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#000',
    fontWeight: 'bold',
  }
});
