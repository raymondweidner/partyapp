import { Stack, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { safeBack, showAlert } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
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
      safeBack(router, "/");
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
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          numberOfLines={4}
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
          safeBack(router, "/");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Members</Text>
            {membersLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                style={{ maxHeight: 300, flexGrow: 0 }}
                data={sortedMembers}
                keyExtractor={(item) => item.id!}
                numColumns={3}
                columnWrapperStyle={{ justifyContent: 'flex-start' }}
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
                            email: cleanEmail,
                            memberId: item.id,
                          });
                      }}
                      {...(Platform.OS === "web" && hasInfo
                        ? ({ title: infoText } as any)
                        : {})}
                    >
                      <View style={styles.memberCardImageContainer}>
                        {item.profile_pic_data ? (
                          <Image source={{ uri: item.profile_pic_data }} style={styles.memberCardImage} />
                        ) : (
                          <Text style={styles.memberCardSilhouette}>👤</Text>
                        )}
                        {isSelected && (
                          <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: colors.surface, borderRadius: 10 }}>
                            <Text style={styles.checkmark}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberCardName} numberOfLines={1}>{item.name}</Text>
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
                        backgroundColor: colors.glassBackground,
                        marginTop: 10,
                        shadowOpacity: 0,
                        elevation: 0,
                      },
                    ]}
                    onPress={() => {
                      setIsModalVisible(false);
                      safeBack(router, "/");
                    }}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
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
  textArea: globalStyles.textArea,
  buttonContainer: { marginTop: 8 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  memberItem: {
    width: 80,
    margin: 5,
    padding: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  memberCardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.glassBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  memberCardSilhouette: {
    fontSize: 32,
  },
  memberCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
  },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  itemSubtitle: { fontSize: 14, color: colors.textSecondary },
  memberItemSelected: {
    backgroundColor: "rgba(157, 78, 221, 0.2)",
  },
  checkmark: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: colors.textMuted,
  },
  modalOverlay: globalStyles.modalOverlay,
  modalContent: globalStyles.modalContent,
  modalTitle: globalStyles.modalTitle,
  modalButtons: {
    marginTop: 20,
  },
});
