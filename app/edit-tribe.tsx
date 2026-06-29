import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Image,
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
import { EmailModal } from "../lib/components/EmailModal";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";
import {
  createChat,
  createChatMember,
  createMemberContact,
  createTribeMember,
  deleteTribeMember,
  getMeetups,
  getMemberContacts,
  getMembers,
  getTribeMembers,
  getTribes,
  GroupedMemberContacts,
  updateTribe,
} from "../lib/data/service";
import { openEmailThread, safeBack, showAlert } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { CustomHeaderLeft, useCurrentMember, useInfoModal } from "./_layout";

export default function EditTribe() {
  const router = useRouter();
  const { id: paramTribeId } = useLocalSearchParams<{ id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();
  const { showInfoModal } = useInfoModal();

  const [isEditing, setIsEditing] = useState(false);

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [updating, setUpdating] = useState(false);

  // Members state
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberContacts, setMemberContacts] =
    useState<GroupedMemberContacts | null>(null);

  // Meetups state
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

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
      const newChat = await createChat({ name, url }, token);

      const memberIdsToCreate = [...selectedIds];
      if (member?.id && !memberIdsToCreate.includes(member.id)) {
        memberIdsToCreate.push(member.id);
      }

      await Promise.all(
        memberIdsToCreate.map((memberId) =>
          createChatMember(
            { chat_id: newChat.id!, member_id: memberId },
            token,
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
        const [membersData, tribeMembersData, meetupsData, contactsData] =
          await Promise.all([
            getMembers(token),
            getTribeMembers(tribeId, token),
            getMeetups(token, tribeId),
            getMemberContacts(token, member.id),
          ]);
        setAllMembers(membersData);
        setTribeMembers(tribeMembersData);
        setSelectedMemberIds(tribeMembersData.map((tm) => tm.member_id));
        setMeetups(meetupsData);
        setMemberContacts(contactsData);
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
      setIsEditing(false);
      setSelectedTribe(tribe);
      setName(tribe.name || "");
      setDescription(tribe.description || "");
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
      await updateTribe(
        { ...selectedTribe, name, description } as Tribe & { id: string },
        token,
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
          createTribeMember(
            { tribe_id: selectedTribe.id!, member_id: memberId },
            token,
          ),
        );
      });
      toRemove.forEach((tm) => {
        promises.push(
          deleteTribeMember(tm.id, selectedTribe.id!, tm.member_id, token),
        );
      });

      await Promise.all(promises);

      showAlert("Success", "Tribe updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setIsEditing(false);
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
        onLongPress={() => {
          if (hasDesc) showInfoModal(item.name || "Tribe", cleanDesc);
        }}
        {...(Platform.OS === "web" && hasDesc
          ? ({ title: cleanDesc } as any)
          : {})}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={1}>
            {item.name || "Unnamed Tribe"}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              if (hasDesc) showInfoModal(item.name || "Tribe", cleanDesc);
            }}
            style={{ paddingLeft: 10 }}
            disabled={!hasDesc}
          >
            <Text
              style={{
                color: hasDesc ? colors.accent : colors.textMuted,
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              ⓘ
            </Text>
          </TouchableOpacity>
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
        await createMemberContact(
          {
            source_id: member.id,
            subject_id: item.id,
            status: "invited",
          },
          token,
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
          showInfoModal(item.name || "Member", infoText, {
            phone: cleanPhone,
            email: cleanEmail,
            memberId: item.id,
          });
        }}
        {...(Platform.OS === "web" ? ({ title: infoText } as any) : {})}
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
            {!isMe && isInvited && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  showInfoModal("Status", "Invite Sent");
                }}
                style={{ paddingHorizontal: 5, backgroundColor: colors.surface, borderRadius: 10 }}
              >
                <Text style={{ fontSize: 18 }}>⏳</Text>
              </TouchableOpacity>
            )}
            {isMe && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  showInfoModal("Status", "You");
                }}
                style={{ paddingHorizontal: 5, backgroundColor: colors.surface, borderRadius: 10 }}
              >
                <Text style={{ fontSize: 18 }}>⭐</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.memberCardName} numberOfLines={1}>{item.name || "Unnamed"}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          {isPending && (
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); showInfoModal("Status", "Pending App Join"); }}>
              <Text style={{ fontSize: 12 }}>✉️ </Text>
            </TouchableOpacity>
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

    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected]}
        onPress={() => item.id && toggleMemberSelection(item.id)}
        onLongPress={() => {
          showInfoModal(item.name || "Member", infoText, {
            phone: cleanPhone,
            email: cleanEmail,
            memberId: item.id,
          });
        }}
        {...(Platform.OS === "web" ? ({ title: infoText } as any) : {})}
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
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); showInfoModal("Status", "Pending App Join"); }}>
              <Text style={{ fontSize: 12 }}>✉️ </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const sortedMembers = [...allMembers].sort((a, b) => {
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
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: isEditing ? `Edit ${selectedTribe.name} Tribe` : selectedTribe.name || "Tribe Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnlyInput]}
            value={name}
            onChangeText={setName}
            placeholder="Tribe Name"
            placeholderTextColor={colors.textMuted}
            editable={isEditing}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, !isEditing && styles.readOnlyInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
            multiline
            numberOfLines={4}
            placeholderTextColor={colors.textMuted}
            editable={isEditing}
          />

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.label, { marginTop: 30, marginBottom: 10 }]}>
              Tribe Members
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={openGroupChatModal}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>💬 Groupchat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openEmailModal}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>📧 Email</Text>
              </TouchableOpacity>
              {isEditing && (
                <TouchableOpacity
                  onPress={() => setIsModalVisible(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
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

          <View style={styles.meetupsContainer}>
            <View style={styles.meetupsHeader}>
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
                Tribe Meetups
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  router.push({
                    pathname: "/create-meetup",
                    params: { tribeId: selectedTribe.id },
                  })
                }
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {meetups.length === 0 ? (
              <Text style={styles.emptyText}>No meetups in this tribe.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {meetups.map((meetup) => {
                  const cleanDetails = meetup.details
                    ? String(meetup.details).trim()
                    : "";
                  const eventInfo = meetup.event_type ? `Type: ${meetup.event_type}\n` : "";
                  const infoText =
                    cleanDetails.length > 0 &&
                      cleanDetails !== "undefined" &&
                      cleanDetails !== "null"
                      ? `${eventInfo}Status: ${meetup.status || "Planning"}\n\n${cleanDetails}`
                      : `${eventInfo}Status: ${meetup.status || "Planning"}`;
                  return (
                    <TouchableOpacity
                      key={meetup.id}
                      style={styles.squareCard}
                      onPress={() =>
                        router.push({
                          pathname: "/edit-meetup",
                          params: { id: meetup.id, tribeId: selectedTribe.id },
                        })
                      }
                      onLongPress={() => {
                        showInfoModal(meetup.title || "Meetup", infoText);
                      }}
                      {...(Platform.OS === "web"
                        ? ({ title: infoText } as any)
                        : {})}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.squareCardIcon}>
                          {meetup.icon_type || "🎉"}
                        </Text>
                        <Text
                          style={styles.squareCardTitle}
                          numberOfLines={2}
                        >
                          {meetup.title || "Unnamed Meetup"}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {meetup.status || "Planning"}
                        </Text>
                        <TouchableOpacity
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            showInfoModal(meetup.title || "Meetup", infoText);
                          }}
                        >
                          <Text
                            style={{
                              color: colors.accent,
                              fontSize: 14,
                              fontWeight: "bold",
                            }}
                          >
                            ⓘ
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View
            style={[styles.buttonContainer, { marginBottom: 20, marginTop: 30 }]}
          >
            {updating ? (
              <ActivityIndicator size="large" />
            ) : isEditing ? (
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
                  onPress={() => {
                    handleSelectTribe(selectedTribe!);
                    setIsEditing(false);
                  }}
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
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.primaryButtonText}>Edit Details</Text>
              </TouchableOpacity>
            )}
          </View>

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
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.primaryButtonText}>
                      Update Membership
                    </Text>
                  </TouchableOpacity>
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
        </ScrollView>
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
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: colors.background,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: -2,
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
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editButtonText: { color: colors.primary, fontWeight: "bold" },
  modalOverlay: globalStyles.modalOverlay,
  modalContent: globalStyles.modalContent,
  modalTitle: globalStyles.modalTitle,
  modalButtons: {
    marginTop: 20,
  },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
