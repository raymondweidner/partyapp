import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { DateTimePickerField } from "../lib/components/DateTimePickerField";
import { createProposal } from "../lib/data/service";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreateProposal() {
  const router = useRouter();
  const { meetupId } = useLocalSearchParams<{ meetupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleCreate = async () => {
    if (!date || !location) {
      showAlert("Validation Error", "Date and location are required.");
      return;
    }
    if (!member?.id || !meetupId) return;

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      await createProposal(
        {
          host_id: member.id,
          meetup_id: meetupId,
          date: date.toISOString(),
          location,
          status: "pending",
        } as any,
        token!,
      );
      showAlert("Success", "Proposal created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Create Proposal",
          headerLeft: () => <CustomHeaderLeft />,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>Host</Text>
          <View style={[styles.input, styles.readOnlyInput]}>
            <Text style={styles.disabledText}>
              {member?.name || "Loading..."}
            </Text>
          </View>

          <Text style={styles.label}>Date</Text>
          <DateTimePickerField date={date} onChange={setDate} />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Location"
            placeholderTextColor="#a0a0a0"
          />

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreate}
              >
                <Text style={styles.primaryButtonText}>Create Proposal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F7F9FC" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: "#333" },
  input: {
    height: 52,
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#333",
  },
  readOnlyInput: {
    backgroundColor: "#E4E7EB",
    justifyContent: "center",
  },
  disabledText: {
    color: "#888",
  },
  buttonContainer: { marginTop: 8 },
  primaryButton: {
    backgroundColor: "#007bff",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
