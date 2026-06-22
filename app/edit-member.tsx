// NOTE: Please rename this file to edit-member.tsx
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    DeviceEventEmitter,
} from "react-native";
import { Member } from "../lib/data/Member";
import { getMembers, updateMember } from "../lib/data/service";

import { useAuth } from "../lib/auth";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useInfoModal } from "./_layout";

export default function EditMember() {
  const router = useRouter();
  const { id: paramMemberId, profile } = useLocalSearchParams<{
    id?: string;
    profile?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { showInfoModal } = useInfoModal();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isProfile = profile === "true";

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await getMembers(token);
      setMembers(data);

      if (paramMemberId) {
        const found = data.find((f) => f.id === paramMemberId);
        if (found) handleSelectMember(found);
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramMemberId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchMembers();
    });
    return () => sub.remove();
  }, [fetchMembers]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleBack = () => {
    if (paramMemberId) {
      router.back();
    } else {
      setSelectedMember(null);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setName(member.name || "");
    setEmail(member.email || "");
    setPhone((member as any).phone || "");
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleUpdate = async () => {
    if (!selectedMember || !user) return;

    if (!name || !email || !phone) {
      showAlert(
        "Validation Error",
        "Name, email, and phone number are required.",
      );
      return;
    }

    if (!validateEmail(email)) {
      showAlert("Validation Error", "Please enter a valid email address.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      // @ts-ignore
      await updateMember({ ...selectedMember, name, email, phone }, token);

      showAlert("Success", "Member updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (paramMemberId) {
              router.back();
            } else {
              setSelectedMember(null);
              fetchMembers();
            }
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while updating the member.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderMemberItem = ({ item }: { item: Member }) => {
    const cleanEmail = item.email ? String(item.email).trim() : "";
    const cleanPhone = (item as any).phone
      ? String((item as any).phone).trim()
      : "";
    const hasEmail =
      cleanEmail.length > 0 &&
      cleanEmail !== "undefined" &&
      cleanEmail !== "null";
    const hasPhone =
      cleanPhone.length > 0 &&
      cleanPhone !== "undefined" &&
      cleanPhone !== "null";
    const isPending = item.status === "invited";
    const statusText = isPending ? "Pending App Join" : "Active";
    const infoText = [
      hasEmail ? `Email: ${cleanEmail}` : null,
      hasPhone ? `Phone: ${cleanPhone}` : null,
      `Status: ${statusText}`,
    ]
      .filter(Boolean)
      .join("\n");
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => {
          showInfoModal(item.name || "Member", infoText, {
            phone: cleanPhone,
            email: cleanEmail,
            memberId: item.id,
          });
        }}
        {...(Platform.OS === "web" ? ({ title: infoText } as any) : {})}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.name || "Unnamed Member"}
            </Text>
            {isPending && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  showInfoModal("Status", "Pending App Join");
                }}
              >
                <Text style={styles.itemTitle}> ✉️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (selectedMember) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isProfile ? "Update Profile" : "Edit Member Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
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
            style={[styles.input, isProfile && styles.readOnlyInput]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#a0a0a0"
            editable={!isProfile}
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
            {updating ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleUpdate}
              >
                <Text style={styles.primaryButtonText}>Update Member</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Member to Edit",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          style={{ maxHeight: 212, flexGrow: 0 }}
          data={members}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderMemberItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No members found.</Text>
          }
        />
      )}
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
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
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
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  readOnlyInput: {
    backgroundColor: "#E4E7EB",
    color: "#888",
  },
});
