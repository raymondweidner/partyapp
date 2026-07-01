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
import { colors, globalStyles } from "../lib/theme";
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
          title: "🙌 Invite Fam",
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
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          placeholderTextColor={colors.textMuted}
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
  container: { ...globalStyles.container, padding: 20 },
  formCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: globalStyles.label,
  input: globalStyles.input,
  buttonContainer: { marginTop: 8 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
