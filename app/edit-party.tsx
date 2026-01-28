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
import { Invite } from "../lib/data/Invite";
import { Party } from "../lib/data/Party";
import {
  createInvite,
  deleteInvite,
  getGuests,
  getInvites,
  getParties,
  updateInvite,
  updateParty,
} from "../lib/data/service";
import { showAlert } from "../lib/util";
import { useAuth } from "./auth";

export default function EditParty() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Data State
  const [parties, setParties] = useState<Party[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [originalInvites, setOriginalInvites] = useState<Invite[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [scheduledFor, setScheduledFor] = useState(new Date());
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fetchParties = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await getParties(token);
      setParties(data);
    } catch (error) {
      console.error("Failed to fetch parties", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    fetchParties();
    fetchGuests();
  }, [fetchParties, fetchGuests]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const fetchInvites = async (partyId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const allInvites = await getInvites(token);
      const partyInvites = allInvites.filter((inv) => inv.party_id === partyId);
      setOriginalInvites(partyInvites);
      setSelectedGuestIds(partyInvites.map((inv) => inv.guest_id));
    } catch (error) {
      console.error("Failed to fetch invites", error);
    }
  };

  const handleSelectParty = async (party: Party) => {
    setSelectedParty(party);
    setTitle(party.title);
    setDetails(party.details);
    setScheduledFor(new Date(party.scheduled_for));
    await fetchInvites(party.id);
  };

  const toggleGuestSelection = (id: string) => {
    if (selectedGuestIds.includes(id)) {
      setSelectedGuestIds(selectedGuestIds.filter((gId) => gId !== id));
    } else {
      setSelectedGuestIds([...selectedGuestIds, id]);
    }
  };

  const handleStatusUpdate = async (guestId: string) => {
    const invite = originalInvites.find((inv) => inv.guest_id === guestId);
    if (!invite) return;

    const nextStateMap: Record<string, Invite["state"]> = {
      pending: "accepted",
      accepted: "declined",
      declined: "maybe",
      maybe: "pending",
    };

    const currentState = invite.state || "pending";
    const nextState = nextStateMap[currentState];

    // Optimistic update
    setOriginalInvites((prev) =>
      prev.map((inv) =>
        inv.id === invite.id ? { ...inv, state: nextState } : inv,
      ),
    );

    try {
      const token = await user?.getIdToken();
      if (!token) return;

      await updateInvite({ ...invite, state: nextState }, token);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleUpdate = async () => {
    if (!selectedParty || !user) return;

    if (!title || !details) {
      showAlert("Validation Error", "Title and Details are required.");
      return;
    }

    if (scheduledFor <= new Date()) {
      showAlert("Validation Error", "Scheduled date must be in the future.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();

      // Update Party
      await updateParty(
        {
          ...selectedParty,
          title,
          details,
          scheduled_for: scheduledFor.toISOString(),
          user_id: user.uid,
        },
        token,
      );

      // Handle Invitations
      const originalGuestIds = originalInvites.map((inv) => inv.guest_id);
      const guestsToAdd = selectedGuestIds.filter(
        (id) => !originalGuestIds.includes(id),
      );
      const invitesToRemove = originalInvites.filter(
        (inv) => !selectedGuestIds.includes(inv.guest_id),
      );

      const promises = [];

      for (const guestId of guestsToAdd) {
        promises.push(
          createInvite(
            { party_id: selectedParty.id, guest_id: guestId },
            token,
          ),
        );
      }

      for (const inv of invitesToRemove) {
        promises.push(deleteInvite(inv.id, token));
      }

      await Promise.all(promises);

      showAlert("Success", "Party updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setSelectedParty(null);
            fetchParties();
          },
        },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || scheduledFor;
    if (Platform.OS !== "web") {
      setShowPicker(Platform.OS === "ios");
    }
    setScheduledFor(currentDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "#4CAF50";
      case "declined":
        return "#F44336";
      case "maybe":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const isSelected = selectedGuestIds.includes(item.id);
    const existingInvite = originalInvites.find(
      (inv) => inv.guest_id === item.id,
    );

    return (
      <View style={[styles.guestItem, isSelected && styles.selectedGuestItem]}>
        <TouchableOpacity
          style={styles.guestInfo}
          onPress={() => toggleGuestSelection(item.id)}
        >
          <View>
            <Text style={styles.guestName}>{item.name}</Text>
            <Text style={styles.guestDetail}>{item.email}</Text>
            <Text style={styles.guestDetail}>{item.phone}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.rightActions}>
          {isSelected && existingInvite && (
            <TouchableOpacity
              style={[
                styles.statusButton,
                {
                  backgroundColor: getStatusColor(
                    existingInvite.state || "pending",
                  ),
                },
              ]}
              onPress={() => handleStatusUpdate(item.id)}
            >
              <Text style={styles.statusText}>
                {existingInvite.state || "pending"}
              </Text>
            </TouchableOpacity>
          )}
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    );
  };

  const renderPartyItem = ({ item }: { item: Party }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelectParty(item)}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemSubtitle}>
        {new Date(item.scheduled_for).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  if (selectedParty) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Edit Party Details" }} />
        <Button title="Back to List" onPress={() => setSelectedParty(null)} />

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
                scheduledFor.getTime() -
                  scheduledFor.getTimezoneOffset() * 60000,
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
              <Text style={styles.dateText}>
                {scheduledFor.toLocaleString()}
              </Text>
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

        {updating ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Update Party" onPress={handleUpdate} color="#007bff" />
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Select Party to Edit" }} />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={parties}
          keyExtractor={(item) => item.id}
          renderItem={renderPartyItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No parties found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemTitle: { fontSize: 18, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
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
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },

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
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedGuestItem: { backgroundColor: "#e6f2ff" },
  guestInfo: { flex: 1 },
  guestName: { fontSize: 16, fontWeight: "bold" },
  guestDetail: { fontSize: 14, color: "#666" },
  rightActions: { flexDirection: "row", alignItems: "center" },
  statusButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
    minWidth: 80,
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  checkmark: { fontSize: 20, color: "#007bff", fontWeight: "bold" },
});
