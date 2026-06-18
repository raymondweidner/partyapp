import { useFocusEffect, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { Chat } from "../lib/data/Chat";
import { ChatMember } from "../lib/data/ChatMember";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Tribe } from "../lib/data/Tribe";
import {
  createChat,
  createChatMember,
  deleteMemberContact,
  deleteUserDevice,
  getChatMembers,
  getChats,
  getMeetups,
  getMemberContacts,
  getMembers,
  getTribeMembersByMemberId,
  getTribes,
  GroupedMemberContacts,
  updateMemberContact,
} from "../lib/data/service";
import { auth } from "../lib/firebaseConfig";
import { openWhatsAppDM, showAlert } from "../lib/util";
import { useCurrentMember, useInfoModal, useUserDevice } from "./_layout";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { userDevice } = useUserDevice();
  const { member: currentMember } = useCurrentMember();
  const { showInfoModal } = useInfoModal();

  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [myFamMembers, setMyFamMembers] = useState<Member[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<Member[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<Member[]>([]);
  const [famTab, setFamTab] = useState<"my_fam" | "incoming" | "outgoing">(
    "my_fam",
  );
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
  const [memberContacts, setMemberContacts] =
    useState<GroupedMemberContacts | null>(null);

  const [isGroupChatModalVisible, setIsGroupChatModalVisible] = useState(false);
  const [groupChatSearch, setGroupChatSearch] = useState("");
  const [groupChatSelectedIds, setGroupChatSelectedIds] = useState<string[]>(
    [],
  );
  const [newChatName, setNewChatName] = useState("");
  const [newChatUrl, setNewChatUrl] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);

  const openGroupChatModal = () => {
    setNewChatName("");
    setNewChatUrl("");
    setGroupChatSelectedIds([]); // Unselected by default for fam
    setGroupChatSearch("");
    setIsGroupChatModalVisible(true);
  };

  const toggleGroupChatSelection = (memberId: string) => {
    setGroupChatSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleCreateGroupChat = async () => {
    if (!newChatName || !newChatUrl) {
      showAlert("Validation Error", "Chat Name and Invite URL are required.");
      return;
    }
    if (
      groupChatSelectedIds.length === 0 &&
      !myFamMembers.some((m) => m.id === currentMember?.id)
    ) {
      showAlert(
        "No members selected",
        "Please select at least one member for the chat.",
      );
      return;
    }

    setCreatingChat(true);
    try {
      const token = await user!.getIdToken();
      const newChat = await createChat(
        { name: newChatName, url: newChatUrl },
        token,
      );

      const memberIdsToCreate = [...groupChatSelectedIds];
      if (currentMember?.id && !memberIdsToCreate.includes(currentMember.id)) {
        memberIdsToCreate.push(currentMember.id);
      }

      await Promise.all(
        memberIdsToCreate.map((memberId) =>
          createChatMember(
            { chat_id: newChat.id!, member_id: memberId },
            token,
          ),
        ),
      );

      showAlert("Success", "Group chat created!");
      setIsGroupChatModalVisible(false);
      fetchData();
    } catch (error: any) {
      showAlert("Error", "Failed to create group chat: " + error.message);
    } finally {
      setCreatingChat(false);
    }
  };

  const filteredFamForChat = myFamMembers.filter((m) =>
    (m.name || "").toLowerCase().includes(groupChatSearch.toLowerCase()),
  );

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();

      const [allMembersData, chatsData, chatMembersData] = await Promise.all([
        getMembers(token),
        getChats(token),
        getChatMembers(token),
      ]);
      setAllMembers(allMembersData);

      // 1. Fetch user's members
      let myFam: Member[] = [];
      let incInvites: Member[] = [];
      let outInvites: Member[] = [];

      if (currentMember && currentMember.id) {
        const groupedContacts = await getMemberContacts(
          token,
          currentMember.id,
        );

        setMemberContacts(groupedContacts);

        const acceptedIds = new Set([
          ...groupedContacts.acceptedSources.map((c) => c.subject_id),
          ...groupedContacts.acceptedSubjects.map((c) => c.source_id),
        ]);
        const incomingIds = new Set(
          groupedContacts.invitedSubjects.map((c) => c.source_id),
        );
        const outgoingIds = new Set(
          groupedContacts.invitedSources.map((c) => c.subject_id),
        );

        myFam = allMembersData.filter((m) => m.id && acceptedIds.has(m.id));
        incInvites = allMembersData.filter(
          (m) => m.id && incomingIds.has(m.id),
        );
        outInvites = allMembersData.filter(
          (m) => m.id && outgoingIds.has(m.id),
        );
      }

      setMyFamMembers(myFam);
      setIncomingInvites(incInvites);
      setOutgoingInvites(outInvites);

      // 2. Fetch user's tribes
      let myTribeIds: string[] = [];
      if (currentMember && currentMember.id) {
        const tribeMembers = await getTribeMembersByMemberId(
          currentMember.id,
          token,
        );
        console.log(
          `Tribe memberships for member id ${currentMember.id}`,
          tribeMembers,
        );
        myTribeIds = tribeMembers.map((tm) => tm.tribe_id);
      }

      const allTribes = await getTribes(token); // This could be optimized if getTribes can take IDs
      console.log("All tribes", allTribes); // This could be optimized if getTribes can take IDs
      const myTribes = allTribes.filter(
        (t) => t.id && myTribeIds.includes(t.id),
      );
      setTribes(myTribes);

      // 3. Fetch user's meetups (for the tribes they belong to)
      if (myTribeIds.length > 0) {
        const meetupsPromises = myTribeIds.map((tribeId) =>
          getMeetups(token, tribeId),
        );
        const meetupsResults = await Promise.all(meetupsPromises);

        const uniqueMeetups = new Map<string, Meetup>();
        meetupsResults.flat().forEach((m) => {
          if (m.id) uniqueMeetups.set(m.id, m);
        });
        setMeetups(Array.from(uniqueMeetups.values()));
      } else {
        setMeetups([]);
      }

      setChats(chatsData);
      setChatMembers(chatMembersData);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, currentMember]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleSignOut = async () => {
    try {
      const deviceId = userDevice?.id;
      if (user && deviceId) {
        const token = await user.getIdToken();
        await deleteUserDevice(deviceId, token);
      }
      await signOut(auth);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const renderSectionHeader = (
    title: string,
    action: string | (() => void),
  ) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        onPress={() =>
          typeof action === "string" ? router.push(action as any) : action()
        }
      >
        <Text style={styles.plusButton}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = (
    titleNode: React.ReactNode,
    textTitle: string,
    subtitle: string,
    onPress: () => void,
    infoModalOptions?: { phone?: string | null },
  ) => {
    const cleanSubtitle = subtitle ? String(subtitle).trim() : "";
    const hasSubtitle =
      cleanSubtitle.length > 0 &&
      cleanSubtitle !== "undefined" &&
      cleanSubtitle !== "null";
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={onPress}
        onLongPress={() => {
          if (hasSubtitle)
            showInfoModal(textTitle, cleanSubtitle, infoModalOptions);
        }}
        {...(Platform.OS === "web" && hasSubtitle
          ? ({ title: cleanSubtitle } as any)
          : {})}
      >
        <View style={styles.itemRow}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            {titleNode}
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              if (hasSubtitle)
                showInfoModal(textTitle, cleanSubtitle, infoModalOptions);
            }}
            style={styles.infoIconContainer}
            disabled={!hasSubtitle}
          >
            <Text
              style={[
                styles.infoIcon,
                { color: hasSubtitle ? "#007bff" : "#ccc" },
              ]}
            >
              ⓘ
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleAcceptInvite = async (f: Member) => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const contact = memberContacts?.invitedSubjects.find(
        (c) => c.source_id === f.id,
      );
      if (contact) {
        if (!contact.id) {
          showAlert(
            "Backend Error",
            "Invitation record is missing its database ID.",
          );
          return;
        }
        await updateMemberContact(
          { ...contact, status: "accepted", id: contact.id! },
          token,
        );
        showAlert("Success", `You are now connected with ${f.name}!`);
        fetchData();
      } else {
        showAlert("Error", "Could not find the invitation record.");
      }
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDeclineInvite = async (f: Member) => {
    try {
      if (!user) return;
      const token = await user.getIdToken();
      const contact = memberContacts?.invitedSubjects.find(
        (c) => c.source_id === f.id,
      );
      if (contact && contact.id) {
        await deleteMemberContact(contact.id, token);
        showAlert("Success", `Invitation from ${f.name} declined.`);
        fetchData();
      }
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleIncomingPress = (f: Member) => {
    if (Platform.OS === "web") {
      const accept = window.confirm(
        `Accept invitation from ${f.name}?\n\nClick OK to accept, or Cancel to ignore/decline.`,
      );
      if (accept) {
        handleAcceptInvite(f);
      } else {
        const decline = window.confirm(
          `Do you want to DECLINE and remove the invitation from ${f.name}?`,
        );
        if (decline) {
          handleDeclineInvite(f);
        }
      }
    } else {
      showAlert("Respond to Invite", `Accept invitation from ${f.name}?`, [
        { text: "Not Now", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => handleDeclineInvite(f),
        },
        { text: "Accept", onPress: () => handleAcceptInvite(f) },
      ]);
    }
  };

  const renderFamItem = (
    f: Member,
    statusText: string,
    statusIcon: string,
    tab: string,
  ) => {
    const isPendingJoin = f.status === "invited";
    const cleanPhone = (f as any).phone ? String((f as any).phone).trim() : "";
    const infoText = `Email: ${f.email || "N/A"}\nPhone: ${cleanPhone || "N/A"}\nStatus: ${isPendingJoin ? "Pending App Join" : statusText}`;

    const titleNode = (
      <>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {f.name || "Unnamed"}
        </Text>
        {isPendingJoin && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              showInfoModal("Status", "Pending App Join");
            }}
          >
            <Text style={styles.itemTitle}> ✉️</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            showInfoModal("Connection Status", statusText);
          }}
        >
          <Text style={styles.itemTitle}> {statusIcon}</Text>
        </TouchableOpacity>
        {tab === "my_fam" && !!cleanPhone && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openWhatsAppDM(cleanPhone);
            }}
            style={{ marginLeft: 10 }}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
          </TouchableOpacity>
        )}
      </>
    );

    const onPress = () => {
      if (tab === "incoming") {
        handleIncomingPress(f);
      }
    };

    return renderItem(titleNode, f.name || "Unnamed", infoText, onPress, {
      phone: cleanPhone,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>TribeVibe</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            {renderSectionHeader("Tribes", "/create-tribe")}
            <ScrollView style={styles.listContainer} nestedScrollEnabled>
              {tribes.map((t) =>
                renderItem(
                  <Text
                    style={[styles.itemTitle, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {t.name || "Unnamed"}
                  </Text>,
                  t.name || "Unnamed",
                  t.description || "",
                  () =>
                    router.push({
                      pathname: "/edit-tribe",
                      params: { id: t.id },
                    }),
                ),
              )}
            </ScrollView>
            {tribes.length === 0 && (
              <Text style={styles.emptyText}>No tribes found.</Text>
            )}

            {renderSectionHeader("Meetups", "/create-meetup")}
            <ScrollView style={styles.listContainer} nestedScrollEnabled>
              {meetups.map((m) => {
                const meetupSubtitle = m.details
                  ? `Status: ${m.status || "Planning"}\n\n${m.details}`
                  : `Status: ${m.status || "Planning"}`;
                return renderItem(
                  <Text
                    style={[styles.itemTitle, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {m.title || "Unnamed"}
                  </Text>,
                  m.title || "Unnamed",
                  meetupSubtitle,
                  () =>
                    router.push({
                      pathname: "/edit-meetup",
                      params: { id: m.id },
                    }),
                );
              })}
            </ScrollView>
            {meetups.length === 0 && (
              <Text style={styles.emptyText}>No meetups found.</Text>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fam</Text>
              <View style={styles.headerButtonsRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push("/find-friend" as any)}
                >
                  <Text style={styles.actionButtonText}>🙌 Find My Fam!</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push("/create-member" as any)}
                >
                  <Text style={styles.actionButtonText}>
                    🚪 Invite to TribeVibe!
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, famTab === "my_fam" && styles.activeTab]}
                onPress={() => setFamTab("my_fam")}
              >
                <Text
                  style={[
                    styles.tabText,
                    famTab === "my_fam" && styles.activeTabText,
                  ]}
                >
                  My Fam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, famTab === "incoming" && styles.activeTab]}
                onPress={() => setFamTab("incoming")}
              >
                <Text
                  style={[
                    styles.tabText,
                    famTab === "incoming" && styles.activeTabText,
                  ]}
                >
                  Incoming
                </Text>
                {incomingInvites.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {incomingInvites.length > 99
                        ? "99+"
                        : incomingInvites.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, famTab === "outgoing" && styles.activeTab]}
                onPress={() => setFamTab("outgoing")}
              >
                <Text
                  style={[
                    styles.tabText,
                    famTab === "outgoing" && styles.activeTabText,
                  ]}
                >
                  Outgoing
                </Text>
                {outgoingInvites.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {outgoingInvites.length > 99
                        ? "99+"
                        : outgoingInvites.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.listContainer} nestedScrollEnabled>
              {famTab === "my_fam" &&
                myFamMembers.map((f) =>
                  renderFamItem(f, "Active", "✅", "my_fam"),
                )}
              {famTab === "incoming" &&
                incomingInvites.map((f) =>
                  renderFamItem(f, "Incoming Invite", "⏳", "incoming"),
                )}
              {famTab === "outgoing" &&
                outgoingInvites.map((f) =>
                  renderFamItem(f, "Outgoing Invite", "⏳", "outgoing"),
                )}
            </ScrollView>

            {famTab === "my_fam" && myFamMembers.length === 0 && (
              <Text style={styles.emptyText}>No active connections.</Text>
            )}
            {famTab === "incoming" && incomingInvites.length === 0 && (
              <Text style={styles.emptyText}>No incoming invites.</Text>
            )}
            {famTab === "outgoing" && outgoingInvites.length === 0 && (
              <Text style={styles.emptyText}>No outgoing invites.</Text>
            )}

            {renderSectionHeader("Group Chats", openGroupChatModal)}
            <ScrollView style={styles.listContainer} nestedScrollEnabled>
              {chats.map((chat) => {
                const membersOfChat = chatMembers
                  .filter((cm) => cm.chat_id === chat.id)
                  .map((cm) => {
                    const member = allMembers.find(
                      (m) => m.id === cm.member_id,
                    );
                    return member?.name || "Unknown Member";
                  });
                const infoText = `URL: ${chat.url || "Pending..."}\n\nMembers:\n- ${membersOfChat.join(
                  "\n- ",
                )}`;

                return renderItem(
                  <Text
                    style={[styles.itemTitle, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {chat.name}
                  </Text>,
                  chat.name,
                  infoText,
                  () =>
                    chat.url
                      ? Linking.openURL(chat.url).catch(() =>
                          showAlert("Error", "Could not open WhatsApp link."),
                        )
                      : showAlert(
                          "Pending",
                          "The group chat is being generated. Please check back in a moment.",
                        ),
                );
              })}
            </ScrollView>
            {chats.length === 0 && (
              <Text style={styles.emptyText}>No group chats found.</Text>
            )}
          </>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Modal
          visible={isGroupChatModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsGroupChatModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Fam Groupchat</Text>

              <View style={styles.guidedPanel}>
                <Text style={styles.guidedPanelText}>
                  {
                    "WhatsApp doesn't allow automatic group creation. To proceed:"
                  }
                </Text>
                <Text style={styles.guidedPanelText}>
                  {"1. Open WhatsApp and create a new group."}
                </Text>
                <Text style={styles.guidedPanelText}>
                  {'2. Copy the group\'s "Invite Link".'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { height: 44, marginTop: 8, marginBottom: 12 },
                  ]}
                  onPress={() =>
                    Linking.openURL("whatsapp://app").catch(() =>
                      showAlert("Error", "WhatsApp is not installed."),
                    )
                  }
                >
                  <Text style={styles.primaryButtonText}>Open WhatsApp</Text>
                </TouchableOpacity>
                <Text style={styles.guidedPanelText}>
                  3. Paste the link and name the chat below.
                </Text>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Chat Name"
                value={newChatName}
                onChangeText={setNewChatName}
                placeholderTextColor="#a0a0a0"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="WhatsApp Invite URL (https://chat.whatsapp.com/...)"
                value={newChatUrl}
                onChangeText={setNewChatUrl}
                placeholderTextColor="#a0a0a0"
                autoCapitalize="none"
              />

              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search members..."
                  value={groupChatSearch}
                  onChangeText={setGroupChatSearch}
                  placeholderTextColor="#a0a0a0"
                />
              </View>

              <FlatList
                style={{ maxHeight: 200, flexGrow: 0 }}
                data={filteredFamForChat}
                keyExtractor={(item) => item.id!}
                renderItem={({ item }) => {
                  const isSelected = groupChatSelectedIds.includes(item.id!);
                  const cleanPhone = (item as any).phone
                    ? String((item as any).phone).trim()
                    : "";
                  const hasPhone = cleanPhone.length > 0;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.memberItem,
                        isSelected && styles.memberItemSelected,
                        !hasPhone && { opacity: 0.5 },
                      ]}
                      onPress={() => toggleGroupChatSelection(item.id!)}
                      disabled={!hasPhone}
                    >
                      <Text style={styles.itemTitle}>
                        {item.name} {!hasPhone ? "(No Phone)" : ""}
                      </Text>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                          !hasPhone && {
                            backgroundColor: "#f0f0f0",
                            borderColor: "#ccc",
                          },
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No matching members.</Text>
                }
              />

              {creatingChat ? (
                <ActivityIndicator
                  size="large"
                  color="#007bff"
                  style={{ marginTop: 20 }}
                />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 20,
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
                    onPress={() => setIsGroupChatModalVisible(false)}
                  >
                    <Text style={[styles.primaryButtonText, { color: "#333" }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                    onPress={handleCreateGroupChat}
                  >
                    <Text style={styles.primaryButtonText}>Create Chat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  scrollContent: { padding: 20 },
  header: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
    color: "#007bff",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#1A1A1A" },
  plusButton: {
    fontSize: 28,
    color: "#007bff",
    lineHeight: 30,
    paddingHorizontal: 10,
  },
  listContainer: { maxHeight: 240 },
  itemContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  itemSubtitle: { fontSize: 14, color: "#666", marginTop: 4 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoIconContainer: { paddingLeft: 10, paddingVertical: 2 },
  infoIcon: { fontSize: 14, fontWeight: "bold" },
  memberItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberItemSelected: { backgroundColor: "#e6f7ff", borderRadius: 8 },
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 10,
  },
  signOutButton: {
    marginTop: 32,
    height: 52,
    backgroundColor: "#FF4D4D",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF4D4D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  headerButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  actionButton: {
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#007bff",
    fontSize: 13,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#E4E7EB",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  activeTabText: { color: "#007bff" },
  badge: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  modalInput: {
    fontSize: 16,
    color: "#333",
    height: 52,
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxSelected: { backgroundColor: "#007bff", borderColor: "#007bff" },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
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
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  guidedPanel: {
    backgroundColor: "#E4E7EB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  guidedPanelText: { fontSize: 14, color: "#333", marginBottom: 6 },
});
