// NOTE: Please rename this file to create-member.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { createMember, createMemberContact } from "../lib/data/service";
import { showAlert, safeBack } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreateMember() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { member: currentMember } = useCurrentMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleCreate = async () => {
    if (!name || !email) {
      showAlert("Validation Error", "Name and email are required.");
      return;
    }

    if (!validateEmail(email)) {
      showAlert("Validation Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }
      if (!currentMember?.id) {
        throw new Error("Current member context missing.");
      }

      const newMember = await createMember(
        { name, email, phone, status: "invited" } as any,
        token,
      );

      await createMemberContact(
        {
          source_id: currentMember.id,
          subject_id: newMember.id!,
          status: "invited",
        },
        token,
      );

      showAlert("Success", "Invitation sent successfully!", [
        { text: "OK", onPress: () => safeBack(router, "/") },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while adding Member.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Invite Fam",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />

      <View style={styles.formCard}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Member Name"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone Number"
          keyboardType="phone-pad"
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
              <Text style={styles.primaryButtonText}>Send Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
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
