import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../lib/auth";
import { EmailModal } from "../lib/components/EmailModal";
import { FloralDivider } from "../lib/components/FloralDivider";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { HintBox } from "../lib/components/HintBox";
import { MemberModal } from "../lib/components/MemberModal";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import {
  createChat,
  createChatMember,
  createMemberContact,
  createTribalCouncil,
  createTribeMember,
  deleteTribalCouncil,
  deleteTribeMember,
  getMeetups,
  getMemberContacts,
  getMembers,
  getTribalCouncils,
  getTribeMembers,
  getTribes,
  GroupedMemberContacts,
  updateTribe,
} from "../lib/data/service";
import { TribalCouncil } from "../lib/data/TribalCouncil";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";
import { colors, globalStyles } from "../lib/theme";
import { openEmailThread, safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember } from "../lib/RootContext";

export default function ReadTribe() {
  const router = useRouter();
  const { id: paramTribeId } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();


  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);

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
  const [memberContacts, setMemberContacts] =
    useState<GroupedMemberContacts | null>(null);

  // Tribal Council state
  const [tribalCouncils, setTribalCouncils] = useState<TribalCouncil[]>([]);
  const [councilMemberIds, setCouncilMemberIds] = useState<string[]>([]);
  const [showCouncilEditModal, setShowCouncilEditModal] = useState(false);
  const [councilLoading, setCouncilLoading] = useState(false);

  // Meetups state
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [meetupTab, setMeetupTab] = useState<string>("proposed");
  const [meetupsExpanded, setMeetupsExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [isGroupChatModalVisible, setIsGroupChatModalVisible] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);

  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);

  const [isMemberModalVisible, setIsMemberModalVisible] = useState(false);
  const [selectedMemberForModal, setSelectedMemberForModal] = useState<Member | null>(null);

  const [activeTab, setActiveTab] = useState<"meetups" | "council" | "members">("meetups");
  const addMeetupRef = useRef<any>(null);

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
    async (tribeId: string) => {
      if (!user || !member?.id) return;
      setMembersLoading(true);
      try {
        const token = await user.getIdToken();
        const [membersData, tribeMembersData, meetupsData, contactsData, councilsData] =
          await Promise.all([
            getMembers(token),
            getTribeMembers(token, tribeId),
            getMeetups(token, tribeId),
            getMemberContacts(token, member.id),
            getTribalCouncils(token, tribeId),
          ]);
        setAllMembers(membersData);
        setTribeMembers(tribeMembersData);
        setSelectedMemberIds(tribeMembersData.map((tm) => tm.member_id));
        setMeetups(meetupsData);
        setMemberContacts(contactsData);
        setTribalCouncils(councilsData);
        if (meetupsData.some((m: Meetup) => m.status?.toLowerCase() === "ongoing")) {
          setMeetupTab("ongoing");
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
      const data = await getTribes(token);
      setTribes(data);

      if (paramTribeId) {
        const found = data.find((t) => t.id === paramTribeId);
        if (found) handleSelectTribe(found);
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramTribeId, handleSelectTribe]);

  useFocusEffect(
    useCallback(() => {
      fetchTribes();
    }, [fetchTribes])
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedTribe?.id) {
        fetchMembersAndTribeMembers(selectedTribe.id);
      }
    }, [selectedTribe?.id, fetchMembersAndTribeMembers])
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
    if (paramTribeId) {
      safeBack(router, "/");
    } else {
      setSelectedTribe(null);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleUpdate = async () => {
    if (!selectedTribe || !user) return;

    if (!name || !description) {
      showAlert("Validation Error", "Name and description are required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const updatedTribe = await updateTribe(token, { ...selectedTribe, name, description, icon_type: iconType } as Tribe & { id: string }
      );

      const originalMemberIds = tribeMembers.map((tm) => tm.member_id);
      const toAdd = selectedMemberIds.filter(
        (id) => !originalMemberIds.includes(id),
      );
      const toRemove = tribeMembers.filter(
        (tm) => !selectedMemberIds.includes(tm.member_id),
      );

      const promises: Promise<any>[] = [];
      toAdd.forEach((memberId) => {
        promises.push(
          createTribeMember(token, { tribe_id: selectedTribe.id!, member_id: memberId }
          ),
        );
      });
      toRemove.forEach((tm) => {
        promises.push(
          deleteTribeMember(token, tm.id, selectedTribe.id!, tm.member_id),
        );
      });

      await Promise.all(promises);

      setSelectedTribe(updatedTribe);
      showAlert("Success", "Tribe updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (paramTribeId) {
              safeBack(router, "/");
            } else {
              setSelectedTribe(null);
              fetchTribes();
            }
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while updating the tribe.",
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

  const renderCurrentMemberItem = ({ item }: { item: Member }) => {
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

    let isMe = item.id === member?.id;
    let isFam = false;
    let isInvited = false;
    let isIncoming = false;

    if (memberContacts) {
      isFam =
        memberContacts.acceptedSources.some((c) => c.subject_id === item.id) ||
        memberContacts.acceptedSubjects.some((c) => c.source_id === item.id);
      isInvited = memberContacts.invitedSources.some(
        (c) => c.subject_id === item.id,
      );
      isIncoming = memberContacts.invitedSubjects.some(
        (c) => c.source_id === item.id,
      );
    }

    const handleInvite = async () => {
      if (!user || !member?.id || !item.id) return;
      try {
        const token = await user.getIdToken();
        await createMemberContact(token, {
          source_id: member.id,
          subject_id: item.id,
          status: "invited",
        }
        );
        showAlert("Success", `Invitation sent to ${item.name}!`);
        const newContacts = await getMemberContacts(token, member.id);
        setMemberContacts(newContacts);
      } catch (e: any) {
        showAlert("Error", e.message);
      }
    };

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => {
          if (item.id === member?.id) {
            router.push(`/read-member?id=${item.id}&profile=true` as any);
          } else {
            setSelectedMemberForModal(item);
            setIsMemberModalVisible(true);
          }
        }}
      >
        <View style={styles.memberCardImageContainer}>
          {item.profile_pic_data ? (
            <Image source={{ uri: item.profile_pic_data }} style={styles.memberCardImage} />
          ) : (
            <Text style={styles.memberCardSilhouette}>👤</Text>
          )}
          <View style={{ position: 'absolute', top: -5, right: -10 }}>
            {!isMe && !isFam && !isInvited && !isIncoming && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleInvite();
                }}
                style={{ paddingHorizontal: 5, backgroundColor: colors.surface, borderRadius: 10 }}
              >
                <Text style={{ fontSize: 18 }}>➕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.memberCardName} numberOfLines={1}>{item.name || "Unnamed"}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          {isPending && (
            <View>
              <Text style={{ fontSize: 12 }}>✉️ </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderModalMemberItem = ({ item }: { item: Member }) => {
    const isSelected = selectedMemberIds.includes(item.id!);
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

    const isCreator = selectedTribe?.creator_id === item.id;

    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected, isCreator && { opacity: 0.7 }]}
        onPress={() => {
          if (isCreator) return;
          item.id && toggleMemberSelection(item.id);
        }}
        disabled={isCreator}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          {isPending && (
            <View>
              <Text style={{ fontSize: 12 }}>✉️ </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleUpdateMembers = async () => {
    if (!selectedTribe || !user) return;
    setMembersLoading(true);
    try {
      const token = await user.getIdToken();
      const currentIds = tribeMembers.map(tm => tm.member_id);
      const toAdd = selectedMemberIds.filter(id => !currentIds.includes(id));
      const toRemove = tribeMembers.filter(tm => !selectedMemberIds.includes(tm.member_id));

      const promises: Promise<any>[] = [];

      for (const id of toAdd) {
        promises.push(createTribeMember(token, {
          tribe_id: selectedTribe.id!,
          member_id: id
        }));
      }
      for (const tm of toRemove) {
        if (tm.id) {
          promises.push(deleteTribeMember(token, tm.id, selectedTribe.id!, tm.member_id));
        }
      }

      await Promise.all(promises);
      const updated = await getTribeMembers(token, selectedTribe.id!);
      setTribeMembers(updated);
      setIsModalVisible(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleUpdateCouncil = async () => {
    if (!selectedTribe || !user) return;
    setCouncilLoading(true);
    try {
      const token = await user.getIdToken();
      const currentIds = tribalCouncils.map(c => c.member_id);

      const toAdd = councilMemberIds.filter(id => !currentIds.includes(id));
      const toRemove = tribalCouncils.filter(c => !councilMemberIds.includes(c.member_id));

      const promises: Promise<any>[] = [];

      for (const id of toAdd) {
        promises.push(createTribalCouncil(token, {
          tribe_id: selectedTribe.id!,
          member_id: id,
        }));
      }
      for (const c of toRemove) {
        if (c.id) {
          promises.push(deleteTribalCouncil(token, c.id));
        }
      }

      await Promise.all(promises);
      const updated = await getTribalCouncils(token, selectedTribe.id!);
      setTribalCouncils(updated);
      setShowCouncilEditModal(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setCouncilLoading(false);
    }
  };

  const toggleCouncilSelection = (memberId: string) => {
    setCouncilMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const renderModalCouncilItem = ({ item }: { item: Member }) => {
    const isSelected = councilMemberIds.includes(item.id!);
    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected]}
        onPress={() => item.id && toggleCouncilSelection(item.id)}
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

  if (selectedTribe) {
    const isCreator = member?.id === selectedTribe?.creator_id;
    const isCouncilOrCreator = isCreator || tribalCouncils.some(c => c.member_id === member?.id);
    const hasFam = !!memberContacts && (memberContacts.acceptedSources.length > 0 || memberContacts.acceptedSubjects.length > 0);
    const showMeetupHint = hasFam && tribes.length > 0 && meetups.length === 0 && isCouncilOrCreator;
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: selectedTribe.name || "Tribe Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", marginTop: 0, marginBottom: 8 }}>
            <Text style={{ fontSize: 72, marginBottom: 12 }}>{iconType || "😊"}</Text>
            <Text style={{ fontSize: 40, fontFamily: "Lobster_400Regular", color: colors.accent, textAlign: "center", marginBottom: 8 }}>{name}</Text>

            {description ? (
              <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginBottom: 8 }}>{description}</Text>
            ) : <View style={{ marginBottom: 8 }} />}

            <View style={{ marginBottom: 4 }}>
              <FloralDivider color={colors.accent} />
            </View>

            {isCreator && (
              <View
                style={[styles.buttonContainer, { marginTop: -30, width: "100%", paddingHorizontal: 20, marginBottom: 12 }]}
              >
                <TouchableOpacity
                  style={[styles.primaryButton, { width: "100%" }]}
                  onPress={() => router.push({ pathname: "/write-tribe", params: { id: selectedTribe.id } })}
                >
                  <Text style={styles.primaryButtonText}>Edit Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {activeTab === "meetups" && (
            <View style={globalStyles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  🎉 Tribe Meetups
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setMeetupsExpanded(!meetupsExpanded)}
                    style={{ marginRight: 15 }}
                  >
                    <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                      {meetupsExpanded ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  <View ref={addMeetupRef} collapsable={false}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() =>
                      router.push({
                        pathname: "/write-meetup",
                        params: { tribeId: selectedTribe.id },
                      })
                    }
                  >
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                  </View>
                </View>

              {showMeetupHint && (
                <View style={{ position: 'absolute', top: 90, left: 0, right: 0, alignItems: 'center', zIndex: 1000 }} pointerEvents="box-none">
                  <HintBox 
                    title="This tribe needs a meetup, and you're just the person to plan it!"
                    width={320}
                    hints={[
                      { 
                        text: "Create a meetup .",
                        targetRef: addMeetupRef,
                        arrowPosition: 'back'
                      }
                    ]}
                  />
                </View>
              )}
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

                    {currentMeetups.length === 0 ? (
                      <Text style={styles.emptyText}>No meetups in this category.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                        {currentMeetups.map((meetup) => {
                          return (
                            <TouchableOpacity
                              key={meetup.id}
                              style={styles.squareCard}
                              onPress={() =>
                                router.push({
                                  pathname: "/read-meetup",
                                  params: { id: meetup.id, tribeId: selectedTribe.id },
                                })
                              }
                            >
                              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                                <Text style={styles.squareCardIcon}>
                                  {meetup.icon_type || "🎉"}
                                </Text>
                                <Text
                                  style={styles.squareCardTitle}
                                  numberOfLines={2}
                                  ellipsizeMode="tail"
                                >
                                  {meetup.title || "Unnamed Meetup"}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </>
                );
              })()}
            </View>
          )}

          {activeTab === "council" && (
            <View style={globalStyles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔥 Tribal Council</Text>
                {isCreator && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setCouncilMemberIds(tribalCouncils.map((c) => c.member_id));
                      setShowCouncilEditModal(true);
                    }}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
              {councilLoading && <ActivityIndicator size="small" />}

              {!councilLoading && (
                <>
                  <View style={{ marginBottom: 16 }}>
                    {(() => {
                      const creatorMember = allMembers.find((m) => m.id === selectedTribe?.creator_id);
                      if (creatorMember) {
                        return (
                          <View style={{ marginBottom: 8 }}>
                            <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>
                              {selectedTribe.leader_title || "Tribe Leader"}
                            </Text>
                            <TouchableOpacity onPress={() => {
                              if (creatorMember.id === member?.id) {
                                router.push(`/read-member?id=${creatorMember.id}&profile=true` as any);
                              } else {
                                setSelectedMemberForModal(creatorMember);
                                setIsMemberModalVisible(true);
                              }
                            }}>
                              <Text style={globalStyles.attributeValue}>
                                {creatorMember.name}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Council Members</Text>
                    {(() => {
                      const regularCouncils = tribalCouncils.filter(c => c.member_id !== selectedTribe?.creator_id);
                      if (regularCouncils.length === 0) {
                        return <Text style={{ color: colors.textMuted }}>No council members</Text>;
                      }
                      return regularCouncils.map((c) => {
                        const mem = allMembers.find((m) => m.id === c.member_id);
                        if (!mem) return null;
                        return (
                          <TouchableOpacity key={c.id} onPress={() => {
                            if (mem.id === member?.id) {
                              router.push(`/read-member?id=${mem.id}&profile=true` as any);
                            } else {
                              setSelectedMemberForModal(mem);
                              setIsMemberModalVisible(true);
                            }
                          }} style={{ marginBottom: 4 }}>
                            <Text style={globalStyles.attributeValue}>{mem.name}</Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === "members" && (
            <View style={globalStyles.sectionPanel}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  🙌 Tribe Members
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {isCouncilOrCreator && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMemberIds(tribeMembers.map((tm) => tm.member_id));
                        setIsModalVisible(true);
                      }}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={openGroupChatModal}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>💬 Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openEmailModal}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>📧 Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {membersLoading && <ActivityIndicator size="small" />}

              {!membersLoading && currentMembers.length === 0 ? (
                <Text style={styles.emptyText}>No members in this tribe.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                  {currentMembers.map((item) => (
                    <React.Fragment key={item.id}>
                      {renderCurrentMemberItem({ item })}
                    </React.Fragment>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Manage Membership</Text>
                {membersLoading ? (
                  <ActivityIndicator size="large" />
                ) : (
                  <FlatList
                    style={{ maxHeight: 300, flexGrow: 0 }}
                    data={sortedMembers}
                    keyExtractor={(item) => item.id!}
                    numColumns={3}
                    columnWrapperStyle={{ justifyContent: 'flex-start' }}
                    renderItem={renderModalMemberItem}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No members available.</Text>
                    }
                  />
                )}
                <View style={styles.modalButtons}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
                      onPress={() => {
                        setSelectedMemberIds(tribeMembers.map((tm) => tm.member_id));
                        setIsModalVisible(false);
                      }}
                    >
                      <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                      onPress={() => handleUpdateMembers()}
                    >
                      <Text style={styles.primaryButtonText}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showCouncilEditModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowCouncilEditModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Manage Council</Text>
                {councilLoading ? (
                  <ActivityIndicator size="large" />
                ) : (
                  <FlatList
                    style={{ maxHeight: 300, flexGrow: 0 }}
                    data={sortedMembers.filter(m => m.id !== selectedTribe?.creator_id)}
                    keyExtractor={(item) => item.id!}
                    numColumns={3}
                    columnWrapperStyle={{ justifyContent: 'flex-start' }}
                    renderItem={renderModalCouncilItem}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No members available.</Text>
                    }
                  />
                )}
                <View style={styles.modalButtons}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
                      onPress={() => {
                        setCouncilMemberIds(tribalCouncils.map((c) => c.member_id));
                        setShowCouncilEditModal(false);
                      }}
                    >
                      <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                      onPress={() => handleUpdateCouncil()}
                    >
                      <Text style={styles.primaryButtonText}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

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

          <MemberModal
            visible={isMemberModalVisible}
            onClose={() => setIsMemberModalVisible(false)}
            member={selectedMemberForModal}
            isMe={member?.id === selectedMemberForModal?.id}
            isFam={!!memberContacts && (
              memberContacts.acceptedSources.some(c => c.subject_id === selectedMemberForModal?.id) ||
              memberContacts.acceptedSubjects.some(c => c.source_id === selectedMemberForModal?.id)
            )}
            isPendingFam={!!memberContacts && (
              memberContacts.invitedSources.some(c => c.subject_id === selectedMemberForModal?.id) ||
              memberContacts.invitedSubjects.some(c => c.source_id === selectedMemberForModal?.id)
            )}
            onSendEmail={() => {
              if (selectedMemberForModal?.email) {
                openEmailThread([selectedMemberForModal.email], "", member?.email);
              }
            }}
            onSendDM={() => {
              showAlert("Not Implemented", "Direct messaging is not yet implemented in this view.");
            }}
            onSendFamRequest={async () => {
              if (!user || !member?.id || !selectedMemberForModal?.id) return;
              try {
                const token = await user.getIdToken();
                await createMemberContact(token, {
                  source_id: member.id,
                  subject_id: selectedMemberForModal.id,
                  status: "invited",
                });
                showAlert("Success", `Invitation sent to ${selectedMemberForModal.name}!`);
                const newContacts = await getMemberContacts(token, member.id);
                setMemberContacts(newContacts);
              } catch (e: any) {
                showAlert("Error", e.message);
              }
            }}
          />
        </ScrollView>

        {/* Fixed Bottom Navigation */}
        <View style={styles.bottomNav}>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setActiveTab("meetups")}
          >
            <Text style={styles.bottomNavIcon}>🎉</Text>
            <Text style={[styles.bottomNavText, activeTab === "meetups" && styles.bottomNavTextActive]}>Meetups</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setActiveTab("council")}
          >
            <Text style={styles.bottomNavIcon}>🔥</Text>
            <Text style={[styles.bottomNavText, activeTab === "council" && styles.bottomNavTextActive]}>Council</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => setActiveTab("members")}
          >
            <Text style={styles.bottomNavIcon}>🙌</Text>
            <Text style={[styles.bottomNavText, activeTab === "members" && styles.bottomNavTextActive]}>Members</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Tribe to Edit",
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
          data={tribes}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderTribeItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tribes found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...globalStyles.container, padding: 20, backgroundColor: colors.background },
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
    backgroundColor: colors.glassCardBackground,
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
    fontSize: 17,
    fontFamily: "BricolageGrotesque_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  squareCardIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: colors.borderLight,
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
  tabBadge: {
    backgroundColor: "#E2DDD5",
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
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: 24,
    paddingTop: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomNavIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bottomNavText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  bottomNavTextActive: {
    color: colors.accent,
    fontWeight: "bold",
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
