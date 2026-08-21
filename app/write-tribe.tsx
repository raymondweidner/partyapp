import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../lib/auth";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { EmailModal } from "../lib/components/EmailModal";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { FloralDivider } from "../lib/components/FloralDivider";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";
import { TribalCouncil } from "../lib/data/TribalCouncil";
import {
  createChat,
  createChatMember,
  createMemberContact,
  createTribe,
  createTribeMember,
  deleteTribeMember,
  getTribalCouncils,
  createTribalCouncil,
  deleteTribalCouncil,
  getMeetups,
  getMemberContacts,
  getMembers,
  getTribeMembers,
  getTribes,
  GroupedMemberContacts,
  updateTribe,
} from "../lib/service";
import { colors, globalStyles } from "../lib/theme";
import { openEmailThread, safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember } from "../lib/RootContext";

export default function EditTribe() {
  const router = useRouter();
  const { id: paramTribeId } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);
  const isEditing = !!paramTribeId;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconType, setIconType] = useState("😊");
  const [updating, setUpdating] = useState(false);

  // Members state
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [leaderTitle, setLeaderTitle] = useState("");
  const [tribalCouncils, setTribalCouncils] = useState<TribalCouncil[]>([]);
  const [councilMemberIds, setCouncilMemberIds] = useState<string[]>([]);
    const [memberContacts, setMemberContacts] =
    useState<GroupedMemberContacts | null>(null);

  
  const [isGroupChatModalVisible, setIsGroupChatModalVisible] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);

  const openGroupChatModal = () => {
    setIsGroupChatModalVisible(true);
  };

  const handleCreateGroupChat = async (
    name: string,
    url: string,
    selectedIds: string[],
  ) => {
    if (!name || !url) {
      showAlert("Validation Error", "Chat Name and Invite URL are required.");
      return;
    }
    if (selectedIds.length === 0) {
      showAlert(
        "No members selected",
        "Please select at least one member to start a chat.",
      );
      return;
    }

    setCreatingChat(true);
    try {
      const token = await user!.getIdToken();
      const newChat = await createChat(token, { name, url });

      const memberIdsToCreate = [...selectedIds];
      if (member?.id && !memberIdsToCreate.includes(member.id)) {
        memberIdsToCreate.push(member.id);
      }

      await Promise.all(
        memberIdsToCreate.map((memberId) =>
          createChatMember(token, { chat_id: newChat.id!, member_id: memberId }
          ),
        ),
      );

      showAlert(
        "Success",
        "Group chat created! It will appear on the home screen.",
      );
      setIsGroupChatModalVisible(false);
    } catch (error: any) {
      showAlert("Error", "Failed to create group chat: " + error.message);
    } finally {
      setCreatingChat(false);
    }
  };

  const openEmailModal = () => {
    setIsEmailModalVisible(true);
  };

  const handleCreateEmailThread = (subject: string, selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      showAlert(
        "No members selected",
        "Please select at least one member for the email thread.",
      );
      return;
    }

    const selectedMembers = currentMembers.filter((m) =>
      selectedIds.includes(m.id!),
    );
    const emails = selectedMembers
      .map((m) => (m.email ? String(m.email).trim() : ""))
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      showAlert("Error", "Selected members do not have email addresses.");
      return;
    }

    openEmailThread(emails, subject, member?.email);
    setIsEmailModalVisible(false);
  };

  const fetchMembersAndTribeMembers = useCallback(
    async (tribeId?: string) => {
      if (!user || !member?.id) return;
      setMembersLoading(true);
      try {
        const token = await user.getIdToken();
        const promises: Promise<any>[] = [
          getMembers(token),
          getMemberContacts(token, member.id),
        ];
        
        if (tribeId) {
          promises.push(getTribeMembers(token, tribeId));
          promises.push(getTribalCouncils(token, tribeId));
        }
        
        const results = await Promise.all(promises);
        setAllMembers(results[0]);
        setMemberContacts(results[1]);
        
        if (tribeId) {
          setTribeMembers(results[2]);
          setSelectedMemberIds(results[2].map((tm: any) => tm.member_id));
          setTribalCouncils(results[3]);
          setCouncilMemberIds(results[3].map((c: any) => c.member_id));
        }
      } catch (error: any) {
        showAlert("Error", error.message);
      } finally {
        setMembersLoading(false);
      }
    },
    [user, member],
  );

  const handleSelectTribe = useCallback(
    (tribe: Tribe) => {
      setSelectedTribe(tribe);
      setName(tribe.name || "");
      setDescription(tribe.description || "");
      setIconType(tribe.icon_type || "😊");
      if (tribe.id) {
        fetchMembersAndTribeMembers(tribe.id);
      }
    },
    [fetchMembersAndTribeMembers],
  );

  const fetchTribes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      if (paramTribeId) {
        const data = await getTribes(token);
        setTribes(data);
        const found = data.find((t) => t.id === paramTribeId);
        if (found) handleSelectTribe(found);
      } else {
        fetchMembersAndTribeMembers();
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramTribeId, handleSelectTribe, fetchMembersAndTribeMembers]);

  useFocusEffect(
    useCallback(() => {
      fetchTribes();
    }, [fetchTribes])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchTribes();
    });
    return () => sub.remove();
  }, [fetchTribes]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleBack = () => {
    safeBack(router, "/");
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleUpdate = async () => {
    if (!user) return;
    if (isEditing && !selectedTribe) return;

    if (!name || !description) {
      showAlert("Validation Error", "Name and description are required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      let tribeId = selectedTribe?.id;
      
      if (isEditing && selectedTribe) {
        await updateTribe(token, { ...selectedTribe, name, description, icon_type: iconType, leader_title: leaderTitle } as Tribe & { id: string }
        );
      } else {
        const newTribe = await createTribe(token, { name, description, icon_type: iconType, leader_title: leaderTitle, creator_id: member?.id } as Tribe);
        tribeId = newTribe.id;
      }

      const originalMemberIds = isEditing ? tribeMembers.map((tm) => tm.member_id) : [];
      
      const finalSelectedIds = [...selectedMemberIds];
      if (!isEditing && member?.id && !finalSelectedIds.includes(member.id)) {
        finalSelectedIds.push(member.id);
      }

      const toAdd = finalSelectedIds.filter(
        (id) => !originalMemberIds.includes(id),
      );
      const toRemove = isEditing ? tribeMembers.filter(
        (tm) => !finalSelectedIds.includes(tm.member_id),
      ) : [];

      const promises: Promise<any>[] = [];
      toAdd.forEach((memberId) => {
        promises.push(
          createTribeMember(token, { tribe_id: tribeId!, member_id: memberId, status: "invited" } as any),
        );
      });
      toRemove.forEach((tm) => {
        promises.push(
          deleteTribeMember(token, tm.id, tribeId!, tm.member_id),
        );
      });

      await Promise.all(promises);

      showAlert("Success", `Tribe ${isEditing ? "updated" : "created"} successfully!`, [
        {
          text: "OK",
          onPress: () => {
            safeBack(router, "/");
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while saving the tribe.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderTribeItem = ({ item }: { item: Tribe }) => {
    const cleanDesc = item.description ? String(item.description).trim() : "";
    const hasDesc =
      cleanDesc.length > 0 && cleanDesc !== "undefined" && cleanDesc !== "null";
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleSelectTribe(item)}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={1}>
            {item.icon_type ? `${item.icon_type} ` : "😊 "}{item.name || "Unnamed Tribe"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const sortedMembers = [...allMembers].sort((a, b) => {
    if (member && a.id === member.id) return -1;
    if (member && b.id === member.id) return 1;

    const aSelected = selectedMemberIds.includes(a.id!);
    const bSelected = selectedMemberIds.includes(b.id!);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const currentMembers = sortedMembers.filter((member) =>
    selectedMemberIds.includes(member.id!),
  );

  if (selectedTribe || !isEditing) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isEditing ? `Edit ${selectedTribe?.name || ""} Tribe` : "Create Tribe",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: "row", gap: 10, zIndex: 6000, elevation: 6000 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tribe Name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={{ width: 90 }}>
              <Text style={styles.label}>Icon</Text>
              <DropdownSelect
                options={[
                  { label: "👨‍👩‍👧‍👦", value: "👨‍👩‍👧‍👦" },
                  { label: "🏠", value: "🏠" },
                  { label: "💼", value: "💼" },
                  { label: "🏢", value: "🏢" },
                  { label: "🎓", value: "🎓" },
                  { label: "🎒", value: "🎒" },
                  { label: "♾️", value: "♾️" },
                  { label: "🤝", value: "🤝" },
                  { label: "🪄", value: "🪄" },
                  { label: "🕹️", value: "🕹️" },
                  { label: "⚾", value: "⚾" },
                  { label: "🏅", value: "🏅" },
                  { label: "😊", value: "😊" },
                  { label: "😃", value: "😃" },
                ]}
                value={iconType}
                onSelect={setIconType}
                placeholder="😊"
              />
            </View>
          </View>


          <Text style={styles.label}>Leader Title</Text>
          <TextInput
            style={[styles.input, { marginBottom: 12 }]}
            value={leaderTitle}
            onChangeText={setLeaderTitle}
            placeholder="e.g. Chief"
            placeholderTextColor="#888888"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { marginBottom: 24 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textMuted}
          />






          <FloralDivider color={colors.accent} />
          <View
            style={[styles.buttonContainer, { marginBottom: 20, marginTop: 30 }]}
          >
            {updating ? (
              <ActivityIndicator size="large" />
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    {
                      flex: 1,
                      marginRight: 10,
                      backgroundColor: "#f0f0f0",
                      shadowOpacity: 0,
                      elevation: 0,
                    },
                  ]}
                  onPress={handleBack}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                  onPress={handleUpdate}
                >
                  <Text style={styles.primaryButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>



          <GroupChatModal
            visible={isGroupChatModalVisible}
            onClose={() => setIsGroupChatModalVisible(false)}
            members={currentMembers}
            onCreate={handleCreateGroupChat}
            title="Start Tribe Groupchat"
            creating={creatingChat}
            defaultName={`${name} Chat`}
            defaultSelectedIds={currentMembers
              .filter((m) => {
                const cleanPhone = (m as any).phone
                  ? String((m as any).phone).trim()
                  : "";
                return cleanPhone.length > 0;
              })
              .map((m) => m.id!)}
          />

          <EmailModal
            visible={isEmailModalVisible}
            onClose={() => setIsEmailModalVisible(false)}
            members={currentMembers}
            onCreate={handleCreateEmailThread}
            title="Email Tribe Members"
            defaultSubject={`${name} Thread`}
            defaultSelectedIds={currentMembers
              .filter((m) => {
                const cleanEmail = m.email ? String(m.email).trim() : "";
                return cleanEmail.length > 0;
              })
              .map((m) => m.id!)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  membersContainer: { flexDirection: "row", flexWrap: "wrap", marginVertical: 10 },
  container: { ...globalStyles.container, padding: 20 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  itemSubtitle: { fontSize: 14, color: colors.textSecondary },
  label: globalStyles.label,
  input: globalStyles.input,
  readOnlyInput: globalStyles.readOnlyInput,
  textArea: globalStyles.textArea,
  buttonContainer: { marginTop: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: colors.textMuted,
  },
  memberItem: {
    width: 80,
    marginRight: 10,
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
  memberInfo: { flex: 1 },
  memberItemSelected: {
    backgroundColor: "rgba(157, 78, 221, 0.2)",
  },
  checkmark: {
    fontSize: 20,
    color: colors.accent,
    fontWeight: "bold",
  },
  meetupsContainer: { marginTop: 30 },
  meetupsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.08)",
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  squareCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    width: 150,
    height: 150,
    marginRight: 15,
    justifyContent: "space-between",
  },
  squareCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  squareCardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: {
    color: "#F8F9FA",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Nunito_700Bold",
  },
  modalOverlay: globalStyles.modalOverlay,
  modalContent: globalStyles.modalContent,
  modalTitle: globalStyles.modalTitle,
  modalButtons: {
    marginTop: 20,
  },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
