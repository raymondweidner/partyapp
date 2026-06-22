import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
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
import { openEmailThread, openWhatsAppDM, showAlert, safeBack } from "../lib/util";
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
                color: hasDesc ? "#007bff" : "#ccc",
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
        <View
          style={[
            styles.memberInfo,
            { flexDirection: "row", alignItems: "center" },
          ]}
        >
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.name}
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {!isMe && !isFam && !isInvited && !isIncoming && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleInvite();
              }}
              style={{ paddingHorizontal: 5 }}
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
              style={{ paddingHorizontal: 5 }}
            >
              <Text style={{ fontSize: 16 }}>⏳</Text>
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
        <View
          style={[
            styles.memberInfo,
            { flexDirection: "row", alignItems: "center" },
          ]}
        >
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.name}
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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
            placeholderTextColor="#a0a0a0"
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
            placeholderTextColor="#a0a0a0"
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
          <View style={{ maxHeight: 212 }}>
            {currentMembers.map((item) => (
              <React.Fragment key={item.id}>
                {renderCurrentMemberItem({ item })}
              </React.Fragment>
            ))}
          </View>
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
            <View style={{ maxHeight: 256 }}>
              {meetups.map((meetup) => {
                const cleanDetails = meetup.details
                  ? String(meetup.details).trim()
                  : "";
                const infoText =
                  cleanDetails.length > 0 &&
                    cleanDetails !== "undefined" &&
                    cleanDetails !== "null"
                    ? `Status: ${meetup.status || "Planning"}\n\n${cleanDetails}`
                    : `Status: ${meetup.status || "Planning"}`;
                return (
                  <TouchableOpacity
                    key={meetup.id}
                    style={styles.meetupItem}
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
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={[styles.itemTitle, { flex: 1 }]}
                        numberOfLines={1}
                      >
                        {meetup.title || "Unnamed Meetup"}
                      </Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          e?.preventDefault?.();
                          showInfoModal(meetup.title || "Meetup", infoText);
                        }}
                        style={{ paddingLeft: 10 }}
                      >
                        <Text
                          style={{
                            color: "#007bff",
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
            </View>
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
                <Text style={[styles.primaryButtonText, { color: "#333" }]}>
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
                  style={{ maxHeight: 212, flexGrow: 0 }}
                  data={sortedMembers}
                  keyExtractor={(item) => item.id!}
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
  container: { flex: 1, padding: 20, backgroundColor: "#F7F9FC" },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
    color: "#333",
  },
  input: {
    height: 52,
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    fontSize: 16,
    color: "#333",
  },
  readOnlyInput: {
    backgroundColor: "#E4E7EB",
    justifyContent: "center",
  },
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 16 },
  buttonContainer: { marginTop: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
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
  memberItemSelected: {
    backgroundColor: "#e6f7ff",
  },
  checkmark: {
    fontSize: 20,
    color: "#007bff",
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
    backgroundColor: "#007bff",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "bold",
  },
  meetupItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
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
    backgroundColor: "#e6f7ff",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#007bff",
  },
  editButtonText: { color: "#007bff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
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
  guidedPanel: {
    backgroundColor: "#E4E7EB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  guidedPanelText: { fontSize: 14, color: "#333", marginBottom: 6 },
});
