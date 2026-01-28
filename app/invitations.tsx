import { Stack, useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
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
  getGuests,
  getInvites,
  getParties,
  updateInvite,
} from "../lib/data/service";
import { showAlert } from "../lib/util";
import { useAuth } from "./auth";

export default function Invitations() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  const [invitedGuests, setInvitedGuests] = useState<Guest[]>([]);
  const [partyInvites, setPartyInvites] = useState<Invite[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [invitationText, setInvitationText] = useState("");
  const [loadingGuests, setLoadingGuests] = useState(false);

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

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectParty = async (party: Party) => {
    setSelectedParty(party);
    setLoadingGuests(true);
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const [allGuests, allInvites] = await Promise.all([
        getGuests(token),
        getInvites(token),
      ]);

      const partyInvites = allInvites.filter(
        (inv) => inv.party_id === party.id,
      );
      setPartyInvites(partyInvites);

      const partyInviteGuestIds = partyInvites.map((inv) => inv.guest_id);

      const guests = allGuests.filter((g) =>
        partyInviteGuestIds.includes(g.id),
      );
      setInvitedGuests(guests);
      setSelectedGuestIds(guests.map((g) => g.id));

      const dateStr = new Date(party.scheduled_for).toLocaleString();
      setInvitationText(
        `You're invited to ${party.title}!\n\n${party.details}\nWhen: ${dateStr}\n\nClick HERE to download the PartyParty guest app for free!`,
      );
    } catch (error) {
      console.error(error);
      showAlert("Error", "Failed to load guest list");
    } finally {
      setLoadingGuests(false);
    }
  };

  const toggleGuestSelection = (id: string) => {
    if (selectedGuestIds.includes(id)) {
      setSelectedGuestIds(selectedGuestIds.filter((gId) => gId !== id));
    } else {
      setSelectedGuestIds([...selectedGuestIds, id]);
    }
  };

  const handleStatusUpdate = async (guestId: string) => {
    const invite = partyInvites.find((inv) => inv.guest_id === guestId);
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
    setPartyInvites((prev) =>
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

  const handleSendInvitations = async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      showAlert("Error", "SMS is not available on this device");
      return;
    }

    const recipients = invitedGuests
      .filter((g) => selectedGuestIds.includes(g.id) && g.phone)
      .map((g) => g.phone);

    if (recipients.length === 0) {
      showAlert("Notice", "No guests with phone numbers selected.");
      return;
    }

    await SMS.sendSMSAsync(recipients, invitationText);
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
    const invite = partyInvites.find((inv) => inv.guest_id === item.id);
    const state = invite?.state || "pending";

    return (
      <View style={[styles.guestItem, isSelected && styles.selectedGuestItem]}>
        <TouchableOpacity
          style={styles.guestInfo}
          onPress={() => toggleGuestSelection(item.id)}
        >
          <View>
            <Text style={styles.guestName}>{item.name}</Text>
            <Text style={styles.guestDetail}>{item.phone}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              { backgroundColor: getStatusColor(state) },
            ]}
            onPress={() => handleStatusUpdate(item.id)}
          >
            <Text style={styles.statusText}>{state}</Text>
          </TouchableOpacity>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.label}>Invitation text</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={invitationText}
        onChangeText={setInvitationText}
        multiline
        numberOfLines={4}
        placeholderTextColor="#a0a0a0"
      />
      <View style={styles.buttonContainer}>
        <Button title="Send Invitations" onPress={handleSendInvitations} />
      </View>
    </View>
  );

  if (selectedParty) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Send Invitations" }} />
        <Button
          title="Back to Parties"
          onPress={() => setSelectedParty(null)}
        />

        <Text style={styles.header}>Select guests to invite</Text>

        {loadingGuests ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={invitedGuests}
            keyExtractor={(item) => item.id}
            renderItem={renderGuestItem}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No guests invited to this party yet.
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Invitations" }} />
      <Text style={styles.header}>Select party to send invitations for:</Text>
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
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 10, marginTop: 10 },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemTitle: { fontSize: 18, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
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
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  buttonContainer: { marginTop: 20 },
  footer: { marginTop: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
});
