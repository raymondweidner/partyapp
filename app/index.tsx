import { useFocusEffect, useRouter } from "expo-router";
// removed signOut from firebase/auth
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  Linking,
  Platform,
  RefreshControl,
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
import { colors, globalStyles } from "../lib/theme";
import { openEmailThread, showAlert } from "../lib/util";
import { useCurrentMember, useUserDevice } from "./_layout";

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { userDevice } = useUserDevice();
  const { member: currentMember } = useCurrentMember();


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
  const [meetupTab, setMeetupTab] = useState<string>("proposed");
  const [meetupsExpanded, setMeetupsExpanded] = useState(false);
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

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (!isRefresh) setLoading(true);
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
        const finalMeetups = Array.from(uniqueMeetups.values());
        setMeetups(finalMeetups);
        if (finalMeetups.some(m => m.status?.toLowerCase() === "ongoing")) {
          setMeetupTab("ongoing");
        }
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
      await auth.signOut();
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
        style={{ marginRight: 16 }}
      >
        <View style={styles.itemContainer}>
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>{icon || "📁"}</Text>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {textTitle || "Unnamed"}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={2}>
            {cleanSubtitle.replace(/\n/g, ' ')}
          </Text>
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
    const isPendingAppJoin = f.status?.toLowerCase() === "invited";
    const cleanEmail = f.email ? String(f.email).trim() : "";
    const cleanPhone = (f as any).phone ? String((f as any).phone).trim() : "";

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
      <View
        key={f.id}
        style={styles.memberCard}
      >
        <View style={styles.memberCardImageContainer}>
          {f.profile_pic_data && !isPendingAppJoin ? (
            <Image source={{ uri: f.profile_pic_data }} style={styles.memberCardImage} />
          ) : isPendingAppJoin ? (
            <Text style={styles.memberCardSilhouette}>✉️</Text>
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
      </View>
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true).finally(() => setRefreshing(false));
  }, [fetchData]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.header}>
            Tribal
            <Text style={{ color: colors.accent, opacity: 0.85, textShadowColor: colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 }}>
              Vibe
            </Text>
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <>
            <View style={globalStyles.sectionPanel}>
              {renderSectionHeader("🏕️ Tribes", "/create-tribe")}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.listContainer} nestedScrollEnabled>
                {tribes.map((t) => {
                  const cleanDetails = t.description ? String(t.description).trim() : "";
                  const hasDetails = cleanDetails.length > 0 && cleanDetails !== "undefined" && cleanDetails !== "null";

                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.squareCard}
                      onPress={() =>
                        router.push({
                          pathname: "/edit-tribe",
                          params: { id: t.id },
                        })
                      }
                    >
                      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={styles.squareCardIcon}>
                          {t.icon_type || "😊"}
                        </Text>
                        <Text style={styles.squareCardTitle} numberOfLines={2} ellipsizeMode="tail">
                          {t.name || "Unnamed"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {tribes.length === 0 && (
                <Text style={styles.emptyText}>No tribes found.</Text>
              )}
            </View>

            <View style={globalStyles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎉 Meetups</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setMeetupsExpanded(!meetupsExpanded)}
                    style={{ marginRight: 15 }}
                  >
                    <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                      {meetupsExpanded ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/create-meetup")}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(() => {
                const ongoingMeetups = meetups.filter(m => m.status && m.status.toLowerCase() === "ongoing");
                const proposedMeetups = meetups.filter(m => !m.status || !["upcoming", "selected", "scheduled", "completed", "complete", "cancelled", "ongoing"].includes(m.status.toLowerCase()));
                const upcomingMeetups = meetups.filter(m => m.status && ["upcoming", "selected", "scheduled"].includes(m.status.toLowerCase()));
                const completedMeetups = meetups.filter(m => m.status && ["completed", "complete"].includes(m.status.toLowerCase()));
                const cancelledMeetups = meetups.filter(m => m.status && m.status.toLowerCase() === "cancelled");

                let currentMeetups: Meetup[] = [];
                if (meetupTab === "ongoing") currentMeetups = ongoingMeetups;
                else if (meetupTab === "proposed") currentMeetups = proposedMeetups;
                else if (meetupTab === "upcoming") currentMeetups = upcomingMeetups;
                else if (meetupTab === "completed") currentMeetups = completedMeetups;
                else if (meetupTab === "cancelled") currentMeetups = cancelledMeetups;

                return (
                  <>
                    <View style={styles.tabContainer}>
                      {ongoingMeetups.length > 0 && (
                        <TouchableOpacity
                          style={[styles.tab, meetupTab === "ongoing" && styles.activeTab]}
                          onPress={() => setMeetupTab("ongoing")}
                        >
                          <Text style={[styles.tabText, meetupTab === "ongoing" && styles.activeTabText]}>
                            Ongoing
                          </Text>
                          <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>
                              {ongoingMeetups.length > 99 ? "99+" : ongoingMeetups.length}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.tab, meetupTab === "proposed" && styles.activeTab]}
                        onPress={() => setMeetupTab("proposed")}
                      >
                        <Text style={[styles.tabText, meetupTab === "proposed" && styles.activeTabText]}>
                          Proposed
                        </Text>
                        <View style={styles.tabBadge}>
                          <Text style={styles.tabBadgeText}>
                            {proposedMeetups.length > 99 ? "99+" : proposedMeetups.length}
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
                            {upcomingMeetups.length > 99 ? "99+" : upcomingMeetups.length}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {meetupsExpanded && (
                        <>
                          <TouchableOpacity
                            style={[styles.tab, meetupTab === "completed" && styles.activeTab]}
                            onPress={() => setMeetupTab("completed")}
                          >
                            <Text style={[styles.tabText, meetupTab === "completed" && styles.activeTabText]}>
                              Completed
                            </Text>
                            <View style={styles.tabBadge}>
                              <Text style={styles.tabBadgeText}>
                                {completedMeetups.length > 99 ? "99+" : completedMeetups.length}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.tab, meetupTab === "cancelled" && styles.activeTab]}
                            onPress={() => setMeetupTab("cancelled")}
                          >
                            <Text style={[styles.tabText, meetupTab === "cancelled" && styles.activeTabText]}>
                              Cancelled
                            </Text>
                            <View style={styles.tabBadge}>
                              <Text style={styles.tabBadgeText}>
                                {cancelledMeetups.length > 99 ? "99+" : cancelledMeetups.length}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.listContainer} nestedScrollEnabled>
                      {currentMeetups.map((meetup) => {
                        const cleanDetails = meetup.details ? String(meetup.details).trim() : "";
                        const eventInfo = meetup.event_type ? `Type: ${meetup.event_type}\n` : "";
                        const infoText = cleanDetails.length > 0 && cleanDetails !== "undefined" && cleanDetails !== "null"
                          ? `${eventInfo}Status: ${meetup.status || "Planning"}\n\n${cleanDetails}`
                          : `${eventInfo}Status: ${meetup.status || "Planning"}`;

                        return (
                          <TouchableOpacity
                            key={meetup.id}
                            style={styles.squareCard}
                            onPress={() =>
                              router.push({
                                pathname: "/edit-meetup",
                                params: { id: meetup.id },
                              })
                            }
                          >
                            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                              <Text style={styles.squareCardIcon}>
                                {meetup.icon_type || "🎉"}
                              </Text>
                              <Text style={styles.squareCardTitle} numberOfLines={2} ellipsizeMode="tail">
                                {meetup.title || "Unnamed Meetup"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {currentMeetups.length === 0 && (
                      <Text style={styles.emptyText}>No meetups found.</Text>
                    )}
                  </>
                );
              })()}
            </View>

            <View style={globalStyles.sectionPanel}>
              <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(0, 0, 0, 0.08)", paddingBottom: 5 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={styles.sectionTitle}>🙌 Fam</Text>
                  <View style={styles.headerButtonsRow}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push("/find-friend" as any)}
                    >
                      <Text style={styles.actionButtonText}>🙌 Find</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push("/create-member" as any)}
                    >
                      <Text style={styles.actionButtonText}>
                        🚪 Invite
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                <Text style={styles.emptyText}>No contacts yet</Text>
              )}
              {famTab === "incoming" && incomingInvites.length === 0 && (
                <Text style={styles.emptyText}>No incoming invites.</Text>
              )}
              {famTab === "outgoing" && outgoingInvites.length === 0 && (
                <Text style={styles.emptyText}>No outgoing invites.</Text>
              )}

              <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
                <TouchableOpacity onPress={openEmailModal}>
                  <Text style={{ color: colors.primary, fontStyle: "italic", fontSize: 16, textDecorationLine: "underline" }}>Email Fam</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={globalStyles.sectionPanel}>
              {renderSectionHeader("💬 Group Chats", openGroupChatModal)}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.listContainer} nestedScrollEnabled>
                {chats.map((chat) => {
                  const membersOfChat = chatMembers
                    .filter((cm) => cm.chat_id === chat.id)
                    .map((cm) => {
                      const member = allMembers.find(
                        (m) => m.id === cm.member_id,
                      );
                      return member?.name || "Unknown Member";
                    });
                  const infoText = membersOfChat.length > 0 ? membersOfChat.join(", ") : "No members yet";

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
            </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20 },
  header: {
    fontFamily: "BricolageGrotesque_500Medium",
    fontSize: 40,
    marginBottom: 4,
    textAlign: "center",
    color: colors.accent,
    letterSpacing: 1,
    textShadowColor: "rgba(122, 139, 115, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  greeting: {
    fontSize: 16,
    color: colors.text,
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
    borderBottomColor: "colors.border",
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
  listContainer: { paddingBottom: 10 },
  itemContainer: {
    backgroundColor: colors.skyBlue,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "center", marginBottom: 4 },
  itemSubtitle: { fontSize: 11, color: colors.textMuted, textAlign: "center", lineHeight: 14 },
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
    borderBottomColor: "colors.glassBorder",
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
    backgroundColor: colors.danger,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  signOutText: { color: "#F8F9FA", fontSize: 16, fontWeight: "bold" },
  headerButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  actionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: colors.borderLight, // #F4F0EB in mock
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: colors.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  memberCard: {
    width: 80,
    margin: 10,
    alignItems: 'center',
  },
  memberCardImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
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
  squareCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    width: 120,
    height: 120,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  squareCardTitle: {
    fontSize: 22,
    fontFamily: "DancingScript_700Bold",
    color: colors.text,
    textAlign: "center",
  },
  squareCardIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: "center",
  },
  memberCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text,
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
    backgroundColor: "#E2DDD5", // from mock segment-btn:not(.active) .badge
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeText: {
    color: "#555555",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalOverlay: globalStyles.modalOverlay,
  modalContent: globalStyles.modalContent,
  modalTitle: globalStyles.modalTitle,
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "colors.glassBorder",
    borderColor: "colors.border",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: 8, color: "#888" },
  modalInput: {
    fontSize: 16,
    color: colors.text,
    height: 52,
    backgroundColor: "colors.glassBorder",
    borderColor: "colors.border",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: "#F8F9FA", fontSize: 16, fontWeight: "bold" },
  guidedPanel: {
    backgroundColor: "colors.glassBorder",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "colors.border",
  },
  guidedPanelText: { fontSize: 14, color: colors.text, marginBottom: 6 },
});
