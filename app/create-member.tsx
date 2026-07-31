import { Stack, useRouter, useLocalSearchParams } from "expo-router";
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
import { createMember, createMemberContact, createTribeMember } from "../lib/data/service";
import { showAlert, safeBack, openWhatsApp } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import PhoneInput from "../lib/components/PhoneInput";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreateMember() {
  const router = useRouter();
  const { tribeId } = useLocalSearchParams<{ tribeId?: string }>();
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

      const memberPayload: any = { name, email, status: "invited" };
      if (phone.trim()) {
        memberPayload.phone = phone.trim();
      } else {
        memberPayload.phone = null;
      }

      const newMember = await createMember(
        memberPayload,
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

      const buttons: any[] = [
        { text: "OK", onPress: () => safeBack(router, tribeId ? `/read-tribe?id=${tribeId}` : "/") }
      ];

      if (phone.trim()) {
        buttons.unshift({
          text: "Send via WhatsApp",
          onPress: () => {
            const message = `Hi ${name.trim()}, you've been invited to join the Fam! Join here: https://app.partyapp.com/login?invite=${encodeURIComponent(email)}`;
            openWhatsApp(phone, message);
            safeBack(router, tribeId ? `/read-tribe?id=${tribeId}` : "/");
          }
        });
      }

      showAlert("Success", "Invitation sent successfully!", buttons);
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
        <PhoneInput
          value={phone}
          onChangeText={setPhone}
          defaultCountry="US"
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
    backgroundColor: colors.glassCardBackground,
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
