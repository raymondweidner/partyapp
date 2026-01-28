import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Guest } from "../lib/data/Guest";
import { createInvite, createParty, getGuests } from "../lib/data/service";
import { showAlert } from "../lib/util";
import { useAuth } from "./auth";

export default function CreateParty() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Form State
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [scheduledFor, setScheduledFor] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Guest & Modal State
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await getGuests(token);
      setGuests(data);
    } catch (error) {
      console.error("Failed to fetch guests", error);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchGuests();
  }, [user, authLoading, router, fetchGuests]);

  const toggleGuestSelection = (id: string) => {
    if (selectedGuestIds.includes(id)) {
      setSelectedGuestIds(selectedGuestIds.filter((gId) => gId !== id));
    } else {
      setSelectedGuestIds([...selectedGuestIds, id]);
    }
  };

  const handleCreate = async () => {
    if (!title || !details) {
      showAlert("Validation Error", "Title and Details are required.");
      return;
    }

    if (scheduledFor <= new Date()) {
      showAlert("Validation Error", "Scheduled date must be in the future.");
      return;
    }

    setLoading(true);
    setFormLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!user || !token) throw new Error("Not authenticated");

      const newParty = await createParty(
        {
          title,
          details,
          scheduled_for: scheduledFor.toISOString(),
          user_id: user.uid,
        },
        token,
      );

      // Create invitations for selected guests
      const invitationPromises = selectedGuestIds.map((guestId) =>
        createInvite({ party_id: newParty.id, guest_id: guestId }, token),
      );

      await Promise.all(invitationPromises);

      showAlert("Success", "Party created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
      setFormLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || scheduledFor;
    // On Android, the picker closes automatically. On iOS, we toggle. On Web, it stays.
    if (Platform.OS !== "web") {
      setShowPicker(Platform.OS === "ios");
    }
    setScheduledFor(currentDate);
  };

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const isSelected = selectedGuestIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.guestItem, isSelected && styles.selectedGuestItem]}
        onPress={() => toggleGuestSelection(item.id)}
      >
        <View>
          <Text style={styles.guestName}>{item.name}</Text>
          <Text style={styles.guestDetail}>{item.email}</Text>
          <Text style={styles.guestDetail}>{item.phone}</Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Create party" }} />

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Party Title"
        placeholderTextColor="#a0a0a0"
      />

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={details}
        onChangeText={setDetails}
        placeholder="Party Details"
        multiline
        numberOfLines={4}
        placeholderTextColor="#a0a0a0"
      />

      <Text style={styles.label}>Scheduled For</Text>
      {Platform.OS === "web" ? (
        <View style={styles.webDatePicker}>
          {React.createElement("input", {
            type: "datetime-local",
            value: new Date(
              scheduledFor.getTime() - scheduledFor.getTimezoneOffset() * 60000,
            )
              .toISOString()
              .slice(0, 16),
            onChange: (e: any) => {
              const d = new Date(e.target.value);
              if (!isNaN(d.getTime())) setScheduledFor(d);
            },
            style: {
              border: "none",
              width: "100%",
              height: 30,
              fontSize: 16,
              backgroundColor: "transparent",
              outline: "none",
            },
          })}
        </View>
      ) : (
        <>
          <View style={styles.dateRow}>
            <Text style={styles.dateText}>{scheduledFor.toLocaleString()}</Text>
            <Button
              title={showPicker ? "Done" : "Select Date"}
              onPress={() => setShowPicker(!showPicker)}
            />
          </View>

          {showPicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={scheduledFor}
              mode="datetime"
              is24Hour={true}
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </>
      )}

      <View style={styles.spacer} />

      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.inviteButtonText}>
          Invite Guests ({selectedGuestIds.length})
        </Text>
      </TouchableOpacity>

      <View style={styles.spacer} />

      {formLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Create Party" onPress={handleCreate} color="#007bff" />
      )}

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Guests</Text>
          <FlatList
            data={guests}
            keyExtractor={(item) => item.id}
            renderItem={renderGuestItem}
            contentContainerStyle={styles.listContent}
          />
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.updateButtonText}>Update Guest List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  webDatePicker: {
    marginVertical: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  datePickerWeb: { height: 30, width: "100%" },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 5,
  },
  dateText: { fontSize: 16 },
  spacer: { height: 20 },

  // Modal Styles
  modalContainer: { flex: 1, paddingTop: 50, backgroundColor: "#fff" },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  listContent: { paddingBottom: 100 },
  modalButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  updateButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  inviteButton: {
    backgroundColor: "#333",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  inviteButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // Guest Item Styles
  guestItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedGuestItem: { backgroundColor: "#e6f2ff" },
  guestName: { fontSize: 16, fontWeight: "bold" },
  guestDetail: { fontSize: 14, color: "#666" },
  checkmark: { fontSize: 20, color: "#007bff", fontWeight: "bold" },
});
