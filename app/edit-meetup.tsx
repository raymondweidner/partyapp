import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Availability } from "../lib/data/Availability";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Proposal } from "../lib/data/Proposal";
import { Tribe } from "../lib/data/Tribe";
import {
  getAvailabilities,
  getMeetups,
  getMembers,
  getProposals,
  getTribes,
  updateMeetup,
} from "../lib/data/service";

import { useAuth } from "../lib/auth";
import { CheckboxToggle } from "../lib/components/CheckboxToggle";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { NumberStepper } from "../lib/components/NumberStepper";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember, useInfoModal } from "./_layout";

export default function EditMeetup() {
  const router = useRouter();
  const { id: paramMeetupId, tribeId: paramTribeId } = useLocalSearchParams<{
    id?: string;
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();
  const { showInfoModal } = useInfoModal();
  const [isEditing, setIsEditing] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string>(
    paramTribeId || "",
  );

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const [decisionMethod, setDecisionMethod] = useState("most_available");

  const [daysToDecideNum, setDaysToDecideNum] = useState("2");
  const [daysToDecideUnit, setDaysToDecideUnit] = useState("weeks");

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringNum, setRecurringNum] = useState("1");
  const [recurringUnit, setRecurringUnit] = useState("years");

  const [createdAt, setCreatedAt] = useState("");
  const [status, setStatus] = useState("Planning");

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchMeetups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [meetupsData, tribesData, membersData] = await Promise.all([
        getMeetups(token, paramTribeId),
        getTribes(token),
        getMembers(token),
      ]);
      setMeetups(meetupsData);
      setTribes(tribesData);
      setMembers(membersData);

      if (paramMeetupId) {
        const found = meetupsData.find((m) => m.id === paramMeetupId);
        if (found) {
          handleSelectMeetup(found);
          try {
            const proposalsData = await getProposals(
              token,
              undefined,
              paramMeetupId,
            );
            setProposals(proposalsData);

            const availPromises = proposalsData.map((p) =>
              getAvailabilities(token, undefined, p.id!),
            );
            const availResults = await Promise.all(availPromises);
            setAvailabilities(availResults.flat());
          } catch (e) {
            console.error("Failed to fetch proposals", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch meetups", error);
    } finally {
      setLoading(false);
    }
  }, [user, paramMeetupId, paramTribeId]);

  useFocusEffect(
    useCallback(() => {
      fetchMeetups();
    }, [fetchMeetups]),
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectMeetup = async (meetup: Meetup) => {
    setIsEditing(false);
    setSelectedMeetup(meetup);
    setTitle(meetup.title || "");
    setDetails(meetup.details || "");
    setSelectedTribeId(meetup.tribe_id || "");

    setDecisionMethod(meetup.decision_method || "most_available");
    setCreatedAt(meetup.created_at || "");
    setStatus(meetup.status || "Planning");

    const dtd = meetup.days_to_decide || 0;
    if (dtd > 0 && dtd % 30 === 0) {
      setDaysToDecideNum((dtd / 30).toString());
      setDaysToDecideUnit("months");
    } else if (dtd > 0 && dtd % 7 === 0) {
      setDaysToDecideNum((dtd / 7).toString());
      setDaysToDecideUnit("weeks");
    } else if (dtd > 0) {
      setDaysToDecideNum(dtd.toString());
      setDaysToDecideUnit("days");
    } else {
      setDaysToDecideNum("2");
      setDaysToDecideUnit("weeks");
    }

    const red = meetup.recurs_every_days || 0;
    if (red > 0) {
      setIsRecurring(true);
      if (red % 365 === 0) {
        setRecurringNum((red / 365).toString());
        setRecurringUnit("years");
      } else if (red % 30 === 0) {
        setRecurringNum((red / 30).toString());
        setRecurringUnit("months");
      } else if (red % 7 === 0) {
        setRecurringNum((red / 7).toString());
        setRecurringUnit("weeks");
      } else {
        setRecurringNum(red.toString());
        setRecurringUnit("days");
      }
    } else {
      setIsRecurring(false);
      setRecurringNum("1");
      setRecurringUnit("years");
    }
  };

  const handleBack = () => {
    if (paramMeetupId) {
      router.back();
    } else {
      setSelectedMeetup(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedMeetup || !user) return;

    if (!title) {
      showAlert("Validation Error", "Title is required.");
      return;
    }

    if (!selectedTribeId) {
      showAlert("Validation Error", "Tribe selection is required.");
      return;
    }

    const numDays = parseInt(daysToDecideNum, 10) || 0;
    let multiplier = 1;
    if (daysToDecideUnit === "weeks") multiplier = 7;
    if (daysToDecideUnit === "months") multiplier = 30;
    const days_to_decide = numDays * multiplier;

    let recurs_every_days = 0;
    if (isRecurring) {
      const rNum = parseInt(recurringNum, 10) || 0;
      let rMult = 7;
      if (recurringUnit === "weeks") rMult = 7;
      if (recurringUnit === "months") rMult = 30;
      if (recurringUnit === "years") rMult = 365;
      recurs_every_days = rNum * rMult;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateMeetup(
        {
          ...selectedMeetup,
          title,
          details,
          tribe_id: selectedTribeId,
          decision_method: decisionMethod,
          days_to_decide,
          recurs_every_days,
        } as any,
        token,
      );

      showAlert("Success", "Meetup updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setIsEditing(false);
            fetchMeetups();
          },
        },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const renderMeetupItem = ({ item }: { item: Meetup }) => {
    const cleanDetails = item.details ? String(item.details).trim() : "";
    const hasDetails =
      cleanDetails.length > 0 &&
      cleanDetails !== "undefined" &&
      cleanDetails !== "null";
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleSelectMeetup(item)}
        onLongPress={() => {
          if (hasDetails) showInfoModal(item.title || "Meetup", cleanDetails);
        }}
        {...(Platform.OS === "web" && hasDetails
          ? ({ title: cleanDetails } as any)
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
            {item.title || "Unnamed Meetup"}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              e?.preventDefault?.();
              if (hasDetails)
                showInfoModal(item.title || "Meetup", cleanDetails);
            }}
            style={{ paddingLeft: 10 }}
            disabled={!hasDetails}
          >
            <Text
              style={{
                color: hasDetails ? "#007bff" : "#ccc",
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

  if (selectedMeetup) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Edit Meetup Details",
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.readOnlyInput]}
            value={title}
            onChangeText={setTitle}
            placeholder="Meetup Title"
            placeholderTextColor="#a0a0a0"
            editable={isEditing}
          />

          {createdAt ? (
            <View style={{ marginBottom: 0 }}>
              <Text style={styles.label}>Created At</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={[styles.itemTitle, styles.disabledText]}>
                  {new Date(createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ marginBottom: 0 }}>
            <Text style={styles.label}>Status</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={[styles.itemTitle, styles.disabledText]}>
                {status}
              </Text>
            </View>
          </View>

          <View style={{ zIndex: 4000, elevation: 4000 }}>
            <Text style={styles.label}>Tribe</Text>
            <DropdownSelect
              value={selectedTribeId}
              options={tribes.map((t) => ({
                label: t.name || "",
                value: t.id || "",
              }))}
              onSelect={setSelectedTribeId}
              disabled={!isEditing || !!paramTribeId}
              placeholder={
                tribes.find((t) => t.id === selectedTribeId)?.name ||
                "Loading..."
              }
            />
          </View>

          <View style={{ zIndex: 3500, elevation: 3500 }}>
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                !isEditing && styles.readOnlyInput,
              ]}
              value={details}
              onChangeText={setDetails}
              placeholder="Details"
              multiline
              numberOfLines={4}
              placeholderTextColor="#a0a0a0"
              editable={isEditing}
            />
          </View>

          <View style={{ zIndex: 3000, elevation: 3000 }}>
            <Text style={styles.label}>Decision Method</Text>
            <DropdownSelect
              value={decisionMethod}
              options={[
                { label: "By most available", value: "most_available" },
                { label: "By vote", value: "single_choice_voting" },
              ]}
              onSelect={setDecisionMethod}
              disabled={!isEditing}
            />
          </View>

          <View style={{ zIndex: 2000, elevation: 2000 }}>
            <Text style={styles.label}>Time to Decide</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <NumberStepper
                value={daysToDecideNum}
                onChange={setDaysToDecideNum}
                disabled={!isEditing}
              />
              <View style={{ flex: 2 }}>
                <DropdownSelect
                  value={daysToDecideUnit}
                  options={["days", "weeks", "months"].map((u) => ({
                    label: u,
                    value: u,
                  }))}
                  onSelect={setDaysToDecideUnit}
                  disabled={!isEditing}
                />
              </View>
            </View>
          </View>

          <View
            style={{
              zIndex: 1000,
              elevation: 1000,
              marginTop: 20,
              marginBottom: 20,
            }}
          >
            <CheckboxToggle
              label="Recurring event?"
              isChecked={isRecurring}
              onPress={() => setIsRecurring(!isRecurring)}
              disabled={!isEditing}
            />

            {isRecurring && (
              <View>
                <Text
                  style={[styles.label, { marginBottom: 10, marginTop: 0 }]}
                >
                  Time till the next event:
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <NumberStepper
                    value={recurringNum}
                    onChange={setRecurringNum}
                    disabled={!isEditing}
                  />
                  <View style={{ flex: 2 }}>
                    <DropdownSelect
                      value={recurringUnit}
                      options={["weeks", "months", "years"].map((u) => ({
                        label: u,
                        value: u,
                      }))}
                      onSelect={setRecurringUnit}
                      disabled={!isEditing}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {updating ? (
            <ActivityIndicator size="large" />
          ) : isEditing ? (
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
                onPress={() => {
                  handleSelectMeetup(selectedMeetup!);
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
          ) : (selectedMeetup as any).creator_id === member?.id ? (
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 20 }]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.primaryButtonText}>Edit Meetup</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.proposalsContainer}>
            <View style={styles.proposalsHeader}>
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
                Proposals
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  router.push({
                    pathname: "/create-proposal",
                    params: { meetupId: selectedMeetup.id },
                  })
                }
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {proposals.length === 0 ? (
              <Text style={styles.emptyText}>No proposals found.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 256 }} nestedScrollEnabled>
                {proposals.map((p) => {
                  const host = members.find((m) => m.id === p.host_id);
                  let displayDate = (p as any).date || "Unknown Date";
                  if ((p as any).date) {
                    const d = new Date((p as any).date);
                    if (!isNaN(d.getTime())) {
                      const pad = (n: number) => n.toString().padStart(2, "0");
                      displayDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    }
                  }

                  const pAvails = availabilities.filter(
                    (a) => a.proposal_id === p.id,
                  );
                  const availableCount = pAvails.filter(
                    (a) => a.status === "yes",
                  ).length;
                  const unsureCount = pAvails.filter(
                    (a) => a.status === "maybe",
                  ).length;
                  const unavailableCount = pAvails.filter(
                    (a) => a.status === "no",
                  ).length;
                  const voteCount = pAvails.filter(
                    (a) => (a as any).vote === true,
                  ).length;

                  const isVoting =
                    selectedMeetup?.decision_method === "single_choice_voting";
                  let statsText = `• Available: ${availableCount}\n• Unsure: ${unsureCount}\n• Unavailable: ${unavailableCount}`;
                  if (isVoting) statsText += `\n• Votes: ${voteCount}`;

                  let availText = pAvails
                    .map((a) => {
                      const m = members.find((mem) => mem.id === a.member_id);
                      let icon = "❔";
                      if (a.status === "yes") icon = "✅";
                      else if (a.status === "no") icon = "❌";
                      else if (a.status === "maybe") icon = "🤔";
                      if (isVoting && (a as any).vote === true) icon += " 🗳️";
                      return `${m?.name || "Unknown"}: ${icon}`;
                    })
                    .join("\n");

                  if (!availText) availText = "No availabilities yet.";

                  const hostInfo = `Host: ${host?.name || "Unknown Host"}\n\nSummary:\n${statsText}\n\nAvailabilities:\n${availText}`;

                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.proposalItem}
                      onPress={() =>
                        router.push({
                          pathname: "/edit-proposal",
                          params: { id: p.id, meetupId: selectedMeetup.id },
                        })
                      }
                      onLongPress={() => {
                        showInfoModal("Proposal Info", hostInfo);
                      }}
                      {...(Platform.OS === "web"
                        ? ({ title: hostInfo } as any)
                        : {})}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          {p.status === "accepted" && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                showInfoModal("Status", "Accepted Proposal");
                              }}
                            >
                              <Text
                                style={{
                                  color: "green",
                                  fontSize: 20,
                                  marginRight: 10,
                                }}
                              >
                                ✓
                              </Text>
                            </TouchableOpacity>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {displayDate}
                            </Text>
                            <Text style={styles.itemSubtitle}>
                              {(p as any).location}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            e?.preventDefault?.();
                            showInfoModal("Proposal Info", hostInfo);
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
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Meetup to Edit",
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
          data={meetups}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderMeetupItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meetups found.</Text>
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
  textArea: { height: 100, textAlignVertical: "top", paddingTop: 16 },
  spacer: { height: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  readOnlyInput: {
    backgroundColor: "#E4E7EB",
    justifyContent: "center",
  },
  disabledText: {
    color: "#888",
  },
  proposalsContainer: {
    marginTop: 30,
  },
  proposalsHeader: {
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
  proposalItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryButton: {
    backgroundColor: "#007bff",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
