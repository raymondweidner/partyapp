import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { Member } from "../lib/data/Member";
import {
  createTribe,
  createTribeMember,
  getMembers,
} from "../lib/data/service";
import { showAlert } from "../lib/util";
import {
  CurrentMemberContext,
  CustomHeaderLeft,
  useInfoModal,
} from "./_layout";
export const useCurrentMember = () => useContext(CurrentMemberContext);

export default function CreateTribe() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();
  const { showInfoModal } = useInfoModal();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [createdTribeId, setCreatedTribeId] = useState<string | null>(null);
  const [savingMembers, setSavingMembers] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!member) return;
    const fetchMembers = async () => {
      setMembersLoading(true);
      try {
        const token = await user?.getIdToken();
        const membersData = token ? await getMembers(token) : [];
        setAllMembers(membersData);
      } catch (error: any) {
        showAlert("Error", error.message);
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [member, user]);

  const handleCreate = async () => {
    if (!name || !description) {
      showAlert("Validation Error", "Name and description are required.");
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const newTribe = await createTribe({ name, description }, token);
      setCreatedTribeId(newTribe.id!);

      if (member?.id) {
        await createTribeMember(
          { tribe_id: newTribe.id!, member_id: member.id },
          token,
        );
      }

      setIsModalVisible(true);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while adding Tribe.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleSaveMembers = async () => {
    setSavingMembers(true);
    try {
      const token = await user?.getIdToken();
      if (!token || !createdTribeId) return;

      if (selectedMemberIds.length > 0) {
        await Promise.all(
          selectedMemberIds.map((memberId) =>
            createTribeMember(
              { tribe_id: createdTribeId, member_id: memberId },
              token,
            ),
          ),
        );
      }

      setIsModalVisible(false);
      router.back();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to add members.");
    } finally {
      setSavingMembers(false);
    }
  };

  const sortedMembers = [...allMembers]
    .filter((m) => m.id !== member?.id)
    .sort((a, b) => {
      const aSelected = selectedMemberIds.includes(a.id!);
      const bSelected = selectedMemberIds.includes(b.id!);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Add Tribe",
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
          placeholder="Tribe Name"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          numberOfLines={4}
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
              <Text style={styles.primaryButtonText}>Add Tribe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsModalVisible(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Members</Text>
            {membersLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                style={{ maxHeight: 212, flexGrow: 0 }}
                data={sortedMembers}
                keyExtractor={(item) => item.id!}
                renderItem={({ item }) => {
                  const isSelected = selectedMemberIds.includes(item.id!);
                  const cleanEmail = item.email
                    ? String(item.email).trim()
                    : "";
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
                  const hasInfo = infoText.length > 0;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.memberItem,
                        isSelected && styles.memberItemSelected,
                      ]}
                      onPress={() => item.id && toggleMemberSelection(item.id)}
                      onLongPress={() => {
                        if (hasInfo)
                          showInfoModal(item.name || "Member", infoText, {
                            phone: cleanPhone,
                          });
                      }}
                      {...(Platform.OS === "web" && hasInfo
                        ? ({ title: infoText } as any)
                        : {})}
                    >
                      <View style={styles.memberInfo}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <TouchableOpacity
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            if (hasInfo)
                              showInfoModal(item.name || "Member", infoText, {
                                phone: cleanPhone,
                              });
                          }}
                          style={{
                            paddingLeft: 10,
                            paddingRight: isSelected ? 10 : 0,
                          }}
                          disabled={!hasInfo}
                        >
                          <Text
                            style={{
                              color: hasInfo ? "#007bff" : "#ccc",
                              fontSize: 18,
                              fontWeight: "bold",
                            }}
                          >
                            ⓘ
                          </Text>
                        </TouchableOpacity>
                        {isSelected && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              showInfoModal("Status", "Selected Member");
                            }}
                          >
                            <Text style={styles.checkmark}> ✓</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No members available.</Text>
                }
              />
            )}
            <View style={styles.modalButtons}>
              {savingMembers ? (
                <ActivityIndicator size="large" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSaveMembers}
                  >
                    <Text style={styles.primaryButtonText}>Save Members</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor: "#f0f0f0",
                        marginTop: 10,
                        shadowOpacity: 0,
                        elevation: 0,
                      },
                    ]}
                    onPress={() => {
                      setIsModalVisible(false);
                      router.back();
                    }}
                  >
                    <Text style={[styles.primaryButtonText, { color: "#333" }]}>
                      Skip
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
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
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 16 },
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
  memberItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberInfo: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
  memberItemSelected: {
    backgroundColor: "#e6f7ff",
  },
  checkmark: {
    fontSize: 20,
    color: "#007bff",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: 20,
  },
});
