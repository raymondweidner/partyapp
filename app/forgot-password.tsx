import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../lib/firebaseConfig";
import { showAlert } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onResetPassword = async () => {
    if (!email) {
      showAlert("Validation Error", "Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await auth.sendPasswordResetEmail(email);
      showAlert(
        "Check your email",
        "A password reset link has been sent to your email address."
      );
      router.back();
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        showAlert("Error", "No account found with this email.");
      } else {
        showAlert("Error", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>
              Tribal
              <Text style={{ color: colors.accent, opacity: 0.85, textShadowColor: colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 }}>
                Vibe
              </Text>
            </Text>
            <Text style={styles.subtitle}>
              Reset your password
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textMuted}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onResetPassword}
              >
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryButtonText}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: globalStyles.container,
  inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoText: {
    ...globalStyles.header,
    marginBottom: 0,
    color: colors.accent,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.glassCardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { ...globalStyles.input, marginBottom: 16 },
  buttonContainer: { marginTop: 8, gap: 12 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  secondaryButton: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
