import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { createMeetup, getTribes } from "../lib/data/service";
import { Tribe } from "../lib/data/Tribe";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentFam } from "./_layout";

export default function CreateMeetup() {
  const router = useRouter();
  const { tribeId: paramTribeId } = useLocalSearchParams<{
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { fam } = useCurrentFam();

  // Form State
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string>("proposed");

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string>(
    paramTribeId || "",
  );
  const [formLoading, setFormLoading] = useState(false);
  const [tribesLoading, setTribesLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchTribesList = async () => {
      setTribesLoading(true);
      try {
        const token = await user.getIdToken();
        const tribesData = await getTribes(token);
        setTribes(tribesData);
      } catch (error: any) {
        showAlert("Error", "Could not fetch tribes: " + error.message);
      } finally {
        setTribesLoading(false);
      }
    };
    fetchTribesList();
  }, [user]);

  const handleCreate = async () => {
    if (!title) {
      showAlert("Validation Error", "Title is required.");
      return;
    }

    if (!selectedTribeId) {
      showAlert("Validation Error", "Tribe selection is required.");
      return;
    }

    if (!fam) {
      showAlert("Validation Error", "Fam context is missing.");
      return;
    }

    setFormLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!user || !token) throw new Error("Not authenticated");

      // 'host_id' is technically a reference to Fam inside Meetup Schema
      await createMeetup(
        {
          host_id: fam.id as any,
          tribe_id: selectedTribeId,
          title,
          details,
          note,
          status,
        },
        token,
      );

      showAlert("Success", "Planning Event Meetup created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Create Meetup",
          headerLeft: () => (
            <CustomHeaderLeft
              onBack={() => {
                if (paramTribeId) {
                  router.back();
                } else {
                  router.navigate("/");
                }
              }}
            />
          ),
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
      {tribesLoading ? (
        <ActivityIndicator size="small" style={{ alignSelf: "flex-start" }} />
      ) : (
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
      )}

      <Text style={styles.label}>Status</Text>
      <View style={styles.statusControl}>
        {["proposed", "pending", "complete"].map((s) => (
          <View
            key={s}
            style={[
              styles.statusButton,
              status === s && styles.statusButtonSelected,
              status !== s && { opacity: 0.5 },
            ]}
          >
            <Text
              style={[
                styles.statusButtonText,
                status === s && styles.statusButtonTextSelected,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.label}>Details</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={details}
        onChangeText={setDetails}
        placeholder="Event context and vibes..."
        multiline
        numberOfLines={4}
        placeholderTextColor="#a0a0a0"
      />

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={note}
        onChangeText={setNote}
        placeholder="Extra thoughts..."
        multiline
        numberOfLines={2}
        placeholderTextColor="#a0a0a0"
      />

      <View style={styles.spacer} />

      {formLoading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Launch Plan" onPress={handleCreate} color="#007bff" />
      )}
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
  spacer: { height: 20 },
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
  tribeItemText: {
    fontSize: 14,
    color: "#333",
  },
  tribeItemTextSelected: {
    color: "#007bff",
    fontWeight: "bold",
  },
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
