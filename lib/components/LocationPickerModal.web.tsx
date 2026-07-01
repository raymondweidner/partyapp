import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
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

  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

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
                <View style={{ padding: 20 }}>
                  <Text style={{ color: colors.textMuted, marginBottom: 10 }}>Location Search is currently optimized for iOS/Android. Please enter the location manually on Web.</Text>
                  <TextInput
                    style={globalStyles.input}
                    value={currentAddress}
                    onChangeText={setCurrentAddress}
                    placeholder="Enter location address"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity style={[globalStyles.primaryButton, { marginTop: 10 }]} onPress={confirmLocation}>
                    <Text style={globalStyles.primaryButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
                
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
