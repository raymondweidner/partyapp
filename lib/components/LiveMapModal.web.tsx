import React from 'react';
import { Modal, Text, View, StyleSheet, TouchableOpacity } from 'react-native';

interface LiveMapModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  targetUserId?: string;
}

export const LiveMapModal: React.FC<LiveMapModalProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Live Map Not Supported</Text>
          <Text style={styles.text}>The live map feature requires native iOS/Android components and is currently not available on the Web.</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  content: { backgroundColor: "white", padding: 20, borderRadius: 12, margin: 20, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  text: { textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: "#007bff", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "white", fontWeight: "bold" }
});
