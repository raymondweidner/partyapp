import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { Meetup } from "../lib/data/Meetup";
import { Tribe } from "../lib/data/Tribe";
import { getMeetups, getTribes, updateMeetup } from "../lib/data/service";

import { useAuth } from "../lib/auth";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "./_layout";

export default function EditMeetup() {
  const router = useRouter();
  const { id: paramMeetupId, tribeId: paramTribeId } = useLocalSearchParams<{
    id?: string;
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string>(
    paramTribeId || "",
  );
  const [status, setStatus] = useState<string>("proposed");

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchMeetups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [meetupsData, tribesData] = await Promise.all([
        getMeetups(token),
        getTribes(token),
      ]);
      setMeetups(meetupsData);
      setTribes(tribesData);

      if (paramMeetupId) {
        const found = meetupsData.find((m) => m.id === paramMeetupId);
        if (found) handleSelectMeetup(found);
      }
    } catch (error) {
      console.error("Failed to fetch meetups", error);
    } finally {
      setLoading(false);
    }
  }, [user, paramMeetupId]);

  useEffect(() => {
    fetchMeetups();
  }, [fetchMeetups]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectMeetup = async (meetup: Meetup) => {
    setSelectedMeetup(meetup);
    setTitle(meetup.title || "");
    setDetails(meetup.details || "");
    setNote(meetup.note || "");
    setSelectedTribeId(meetup.tribe_id || "");
    setStatus(meetup.status || "proposed");
  };

  const handleBack = () => {
    if (paramMeetupId) {
      router.back();
    } else {
      setSelectedMeetup(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMeetup || !user) return;

    if (!title) {
      showAlert("Validation Error", "Title is required.");
      return;
    }

    if (!selectedTribeId) {
      showAlert("Validation Error", "Tribe selection is required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateMeetup(
        {
          ...selectedMeetup,
          title,
          details,
          note,
          tribe_id: selectedTribeId,
          status,
        } as any,
        token,
      );

      showAlert("Success", "Meetup updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (paramMeetupId) {
              router.back();
            } else {
              setSelectedMeetup(null);
              fetchMeetups();
            }
          },
        },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const renderMeetupItem = ({ item }: { item: Meetup }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelectMeetup(item)}
    >
      <Text style={styles.itemTitle}>{item.title || "Unnamed Meetup"}</Text>
    </TouchableOpacity>
  );

  if (selectedMeetup) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Edit Meetup Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Meetup Title"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Tribe</Text>
        <View style={styles.tribeList}>
          {tribes.map((tribe) => (
            <TouchableOpacity
              key={tribe.id}
              style={[
                styles.tribeItem,
                selectedTribeId === tribe.id && styles.tribeItemSelected,
                paramTribeId ? styles.tribeItemDisabled : null,
              ]}
              disabled={!!paramTribeId}
              onPress={() => setSelectedTribeId(tribe.id!)}
            >
              <Text
                style={[
                  styles.tribeItemText,
                  selectedTribeId === tribe.id && styles.tribeItemTextSelected,
                  paramTribeId ? styles.tribeItemTextDisabled : null,
                ]}
              >
                {tribe.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusControl}>
          {["proposed", "pending", "complete"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusButton,
                status === s && styles.statusButtonSelected,
              ]}
              onPress={() => setStatus(s)}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === s && styles.statusButtonTextSelected,
                ]}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={details}
          onChangeText={setDetails}
          placeholder="Details"
          multiline
          numberOfLines={4}
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          multiline
          numberOfLines={2}
          placeholderTextColor="#a0a0a0"
        />

        <View style={styles.spacer} />

        {updating ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button
            title="Update Meetup"
            onPress={handleUpdate}
            color="#007bff"
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Meetup to Edit",
          headerLeft: () => <CustomHeaderLeft onBack={() => router.navigate("/")} />
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={meetups}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderMeetupItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meetups found.</Text>
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
  spacer: { height: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  tribeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
  },
  tribeItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    backgroundColor: "#f9f9f9",
  },
  tribeItemSelected: {
    borderColor: "#007bff",
    backgroundColor: "#e6f7ff",
  },
  tribeItemText: { fontSize: 14, color: "#333" },
  tribeItemTextSelected: { color: "#007bff", fontWeight: "bold" },
  statusControl: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    backgroundColor: "#f9f9f9",
  },
  statusButtonSelected: {
    borderColor: "#007bff",
    backgroundColor: "#e6f7ff",
  },
  statusButtonText: { fontSize: 14, color: "#333" },
  statusButtonTextSelected: { color: "#007bff", fontWeight: "bold" },
  tribeItemDisabled: { opacity: 0.5 },
  tribeItemTextDisabled: { color: "#666" },
});
