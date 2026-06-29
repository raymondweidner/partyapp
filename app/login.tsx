import { useLocalSearchParams } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
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
import {
  checkInvite,
  createMember,
  getMemberContacts,
  getMembers,
  updateMember,
  updateMemberContact,
} from "../lib/data/service";
import { auth } from "../lib/firebaseConfig";
import { showAlert } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { useCurrentMember } from "./_layout";

export default function Login() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [invitedMember, setInvitedMember] = useState<any>(null);
  const { setMember } = useCurrentMember();

  useEffect(() => {
    if (invite) {
      checkInvite(invite)
        .then((member) => {
          if (member) {
            setInvitedMember(member);
            setName(member.name || "");
            setEmail(member.email || "");
            setPhone(member?.phone || "");
            setIsSignUp(true);
          }
        })
        .catch((error) => console.error("Failed to check invite", error));
    }
  }, [invite]);

  const onSignIn = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const token = await userCredential.user.getIdToken();

      // Immediately fetch the actual member record
      const members = await getMembers(token);
      const member = members.find(
        (f: any) =>
          f.user_id === userCredential.user.uid ||
          f.email?.toLowerCase() === email.toLowerCase(),
      );
      if (member) setMember(member);

      if (Platform.OS === "web" && "Notification" in window && window.Notification.permission === "default") {
        await window.Notification.requestPermission();
      }

      showAlert("Success", "Logged in successfully!");
    } catch (error: any) {
      showAlert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    if (!name || !phone) {
      showAlert("Validation Error", "Please enter your name and phone number.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      const token = await user.getIdToken();

      try {
        // 1. Fetch all members to get the complete database record
        const members = await getMembers(token);

        // 2. Try fetching by user_id
        let member = members.find((f: any) => f.user_id === user.uid);

        if (!member) {
          // 3. Try fetching by email
          member = members.find((f: any) => f.email === email);
        }

        // 4. Fallback to invitedMember ONLY if the backend returned an ID
        if (!member && invitedMember?.id) {
          member = invitedMember;
        }

        if (member) {
          if (!member.id) {
            throw new Error("Existing member record is missing an id.");
          }
          // 4. Update user_id, name, and email (Link existing member or update details)
          await updateMember(
            {
              ...member,
              id: member.id,
              user_id: user.uid,
              name,
              email,
              phone,
              status: "active",
            },
            token,
          );
        } else {
          // 5. Create new member
          await createMember(
            { name, email, phone, user_id: user.uid, status: "active" } as any,
            token,
          );
        }

        // IMMEDIATELY GET THE ACTUAL MEMBER RECORD (LIKE REFRESHING DOES)
        const latestMembers = await getMembers(token);
        const finalMember = latestMembers.find(
          (f: any) =>
            f.user_id === user.uid ||
            f.email?.toLowerCase() === email.toLowerCase(),
        );

        if (finalMember) {
          setMember(finalMember);

          if (finalMember.id) {
            // 4b. Accept any pending invitations for this member
            try {
              const contacts = await getMemberContacts(token, finalMember.id);
              const pendingInvites = contacts.invitedSubjects;

              const validInvites = pendingInvites.filter(
                (contact) => !!contact.id,
              );
              if (pendingInvites.length > 0 && validInvites.length === 0) {
                console.error(
                  "Backend Error: GET /member_contact is missing the 'id' field in its response. Cannot accept invites.",
                );
              }

              await Promise.all(
                validInvites.map((contact) =>
                  updateMemberContact(
                    { ...contact, status: "accepted" },
                    token,
                  ),
                ),
              );
            } catch (contactsError) {
              console.error(
                "Failed to automatically accept invites:",
                contactsError,
              );
            }
          }
        }
      } catch (error: any) {
        await user.delete();
        throw new Error(
          "Failed to create or link host record. " + error.message,
        );
      }

      if (Platform.OS === "web" && "Notification" in window && window.Notification.permission === "default") {
        await window.Notification.requestPermission();
      }

      showAlert("Success", "Account created!");
    } catch (error: any) {
      showAlert("Sign Up Error", error.message);
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
        <View style={styles.headerContainer}>
          <Text style={styles.logoText}>TribeVibe</Text>
          <Text style={styles.subtitle}>
            {invitedMember
              ? "You've been invited to join the Fam!"
              : isSignUp
                ? "Create your account to get started"
                : "Welcome back, sign in to continue"}
          </Text>
        </View>

        <View style={styles.formCard}>
          {isSignUp && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />
            </>
          )}

          <TextInput
            style={[
              styles.input,
              invitedMember && styles.readOnlyInput,
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textMuted}
            editable={!invitedMember}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.textMuted}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <View style={styles.buttonContainer}>
              {isSignUp ? (
                <>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onSignUp}
                  >
                    <Text style={styles.primaryButtonText}>
                      {invitedMember ? "Join the Fam!" : "Create Account"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setIsSignUp(false);
                      setInvitedMember(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Back to Login
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={onSignIn}
                  >
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setIsSignUp(true)}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
  logoText: globalStyles.header,
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: globalStyles.input,
  readOnlyInput: globalStyles.readOnlyInput,
  buttonContainer: { marginTop: 8, gap: 12 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  secondaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
