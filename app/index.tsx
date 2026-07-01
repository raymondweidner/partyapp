import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { EmailModal } from "../lib/components/EmailModal";
import { GroupChatModal } from "../lib/components/GroupChatModal";
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
import { openEmailThread, showAlert } from "../lib/util";
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
  const [meetupTab, setMeetupTab] = useState<"proposed" | "upcoming">("proposed");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatMembers, setChatMembers] = useState<ChatMember[]>([]);
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
    if (
      selectedIds.length === 0 &&
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
      const newChat = await createChat({ name, url }, token);

      const memberIdsToCreate = [...selectedIds];
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

    const selectedMembers = myFamMembers.filter((m) =>
      selectedIds.includes(m.id!),
    );
    const emails = selectedMembers
      .map((m) => (m.email ? String(m.email).trim() : ""))
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      showAlert("Error", "Selected members do not have email addresses.");
      return;
    }

    openEmailThread(emails, subject, currentMember?.email);
    setIsEmailModalVisible(false);
  };

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

      let myChats = chatsData;
      if (currentMember && currentMember.id) {
        const myChatIds = chatMembersData
          .filter((cm) => cm.member_id === currentMember.id)
          .map((cm) => cm.chat_id);
        myChats = chatsData.filter((c) => c.id && myChatIds.includes(c.id));
      }

      setChats(myChats);
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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchData();
    });
    return () => sub.remove();
  }, [fetchData]);

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
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = (
    icon: string | null,
    textTitle: string,
    subtitle: string,
    onPress: () => void,
    infoModalOptions?: { phone?: string | null; email?: string | null },
  ) => {
    const cleanSubtitle = subtitle ? String(subtitle).trim() : "";
    const hasSubtitle =
      cleanSubtitle.length > 0 &&
      cleanSubtitle !== "undefined" &&
      cleanSubtitle !== "null";
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={() => {
          if (hasSubtitle)
            showInfoModal(textTitle, cleanSubtitle, infoModalOptions);
        }}
        {...(Platform.OS === "web" && hasSubtitle
          ? ({ title: cleanSubtitle } as any)
          : {})}
        style={{ marginRight: 16 }}
      >
        <BlurView intensity={30} tint="dark" style={styles.itemContainer}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{icon || "📁"}</Text>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {textTitle || "Unnamed"}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={2}>
            {cleanSubtitle.replace(/\n/g, ' ')}
          </Text>
        </BlurView>
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
    const cleanEmail = f.email ? String(f.email).trim() : "";
    const cleanPhone = (f as any).phone ? String((f as any).phone).trim() : "";
    const infoText = `Email: ${cleanEmail || "N/A"}\nPhone: ${cleanPhone || "N/A"}\nStatus: ${isPendingJoin ? "Pending App Join" : statusText}`;

    const onPress = () => {
      showInfoModal(f.name || "Member", infoText, { phone: cleanPhone, email: cleanEmail, memberId: f.id });
    };

    const actionNode = tab === "incoming" ? (
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          handleIncomingPress(f);
        }}
        style={{ paddingHorizontal: 5, backgroundColor: 'white', borderRadius: 10 }}
      >
        <Text style={{ fontSize: 18 }}>👋</Text>
      </TouchableOpacity>
    ) : null;

    return (
      <TouchableOpacity
        key={f.id}
        style={styles.memberCard}
        onPress={onPress}
      >
        <View style={styles.memberCardImageContainer}>
          {f.profile_pic_data ? (
            <Image source={{ uri: f.profile_pic_data }} style={styles.memberCardImage} />
          ) : (
            <Text style={styles.memberCardSilhouette}>👤</Text>
          )}
          {actionNode && (
            <View style={{ position: 'absolute', top: -5, right: -10 }}>
              {actionNode}
            </View>
          )}
        </View>
        <Text style={styles.memberCardName} numberOfLines={1}>{f.name || "Unnamed"}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.header}>TribeVibe</Text>
          <Text style={styles.greeting}>Welcome back, {currentMember?.name || "Fam"}!</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            {renderSectionHeader("Tribes", "/create-tribe")}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listContainer} nestedScrollEnabled>
              {tribes.map((t) =>
                renderItem(
                  t.icon_type || "😊",
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
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, meetupTab === "proposed" && styles.activeTab]}
                onPress={() => setMeetupTab("proposed")}
              >
                <Text style={[styles.tabText, meetupTab === "proposed" && styles.activeTabText]}>
                  Proposed
                </Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {meetups.filter(m => !m.status || !["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())).length > 99
                      ? "99+"
                      : meetups.filter(m => !m.status || !["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())).length}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, meetupTab === "upcoming" && styles.activeTab]}
                onPress={() => setMeetupTab("upcoming")}
              >
                <Text style={[styles.tabText, meetupTab === "upcoming" && styles.activeTabText]}>
                  Upcoming
                </Text>
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {meetups.filter(m => m.status && ["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())).length > 99
                      ? "99+"
                      : meetups.filter(m => m.status && ["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())).length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listContainer} nestedScrollEnabled>
              {(meetupTab === "proposed" ? meetups.filter(m => !m.status || !["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())) : meetups.filter(m => m.status && ["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase()))).map((m) => {
                return renderItem(
                  m.icon_type || "🎉",
                  m.title || "Unnamed",
                  "",
                  () =>
                    router.push({
                      pathname: "/edit-meetup",
                      params: { id: m.id },
                    }),
                );
              })}
            </ScrollView>
            {(meetupTab === "proposed" ? meetups.filter(m => !m.status || !["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase())) : meetups.filter(m => m.status && ["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase()))).length === 0 && (
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
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={openEmailModal}
                >
                  <Text style={styles.actionButtonText}>📧 Email Fam</Text>
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
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {myFamMembers.length > 99 ? "99+" : myFamMembers.length}
                  </Text>
                </View>
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
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {incomingInvites.length > 99
                      ? "99+"
                      : incomingInvites.length}
                  </Text>
                </View>
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
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {outgoingInvites.length > 99
                      ? "99+"
                      : outgoingInvites.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingBottom: 20 }}>
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
            </View>

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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listContainer} nestedScrollEnabled>
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
                  "💬",
                  chat.name,
                  infoText,
                  () =>
                    chat.url
                      ? Linking.openURL(chat.url).catch(() =>
                        showAlert("Error", "Could not open WhatsApp link."),
                      )
                      : showAlert(
                        "Error",
                        "No WhatsApp link provided for this chat.",
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

        <GroupChatModal
          visible={isGroupChatModalVisible}
          onClose={() => setIsGroupChatModalVisible(false)}
          members={myFamMembers}
          onCreate={handleCreateGroupChat}
          title="Create Fam Groupchat"
          creating={creatingChat}
        />

        <EmailModal
          visible={isEmailModalVisible}
          onClose={() => setIsEmailModalVisible(false)}
          members={myFamMembers}
          onCreate={handleCreateEmailThread}
          title="Email Fam"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  scrollContent: { padding: 20 },
  header: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 4,
    textAlign: "center",
    color: "#00F0FF",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 240, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  greeting: {
    fontSize: 16,
    color: "#E0E0E0",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#E0E0E0" },
  addButton: {
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.5)",
  },
  addButtonText: {
    color: "#00F0FF",
    fontSize: 12,
    fontWeight: "bold",
  },
  listContainer: { paddingBottom: 10 },
  itemContainer: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", textAlign: "center", marginBottom: 4 },
  itemSubtitle: { fontSize: 11, color: "#AAAAAA", textAlign: "center", lineHeight: 14 },
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
    borderBottomColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberItemSelected: { backgroundColor: "rgba(0, 240, 255, 0.1)", borderRadius: 8 },
  emptyText: {
    fontSize: 14,
    color: "#888",
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
    backgroundColor: "rgba(157, 78, 221, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(157, 78, 221, 0.5)",
  },
  actionButtonText: {
    color: "#9D4EDD",
    fontSize: 13,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  activeTabText: { color: "#00F0FF" },
  memberCard: {
    width: 80,
    margin: 10,
    alignItems: 'center',
  },
  memberCardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: '#00F0FF',
    shadowColor: "#00F0FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
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
    color: '#E0E0E0',
  },
  badge: {
    backgroundColor: "#ff4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  tabBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tabBadgeText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalContent: {
    margin: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: 8, color: "#888" },
  modalInput: {
    fontSize: 16,
    color: "#FFFFFF",
    height: 52,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: { backgroundColor: "#9D4EDD", borderColor: "#9D4EDD" },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  primaryButton: {
    backgroundColor: "#9D4EDD",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9D4EDD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  guidedPanel: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  guidedPanelText: { fontSize: 14, color: "#E0E0E0", marginBottom: 6 },
});
