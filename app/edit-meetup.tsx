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
  DeviceEventEmitter,
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
import { EVENT_DEFAULTS, AVAILABLE_ICONS } from "../lib/constants";

import { useAuth } from "../lib/auth";
import { CheckboxToggle } from "../lib/components/CheckboxToggle";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { NumberStepper } from "../lib/components/NumberStepper";
import { showAlert, safeBack } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
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
  const [eventType, setEventType] = useState("");
  const [iconType, setIconType] = useState("🎉");
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
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchMeetups();
    });
    return () => sub.remove();
  }, [fetchMeetups]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectMeetup = async (meetup: Meetup) => {
    setIsEditing(false);
    setSelectedMeetup(meetup);
    setTitle(meetup.title || "");
    setEventType(meetup.event_type || "");
    setIconType(meetup.icon_type || "🎉");
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
      safeBack(router, `/edit-tribe?id=${paramTribeId}`);
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
          event_type: eventType,
          icon_type: iconType,
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
            title: isEditing ? `Edit ${selectedMeetup.title || ""} Meetup`.trim() : `Meetup ${selectedMeetup.title || ""}`.trim(),
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {isEditing ? (
            <>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Meetup Title"
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ flexDirection: 'row', zIndex: 6000, elevation: 6000, gap: 10 }}>
                <View style={{ flex: 1, zIndex: 6000, elevation: 6000 }}>
                  <Text style={styles.label}>Event Type</Text>
                  <DropdownSelect
                    value={EVENT_DEFAULTS.some(d => d.type === eventType) ? eventType : "custom"}
                    options={[
                      ...EVENT_DEFAULTS.map(def => ({ label: `${def.icon} ${def.type}`, value: def.type })),
                      { label: "Other (Custom)", value: "custom" }
                    ]}
                    onSelect={(val) => {
                      if (val !== "custom") {
                        setEventType(val);
                        const match = EVENT_DEFAULTS.find(d => d.type === val);
                        if (match) setIconType(match.icon);
                      } else {
                        setEventType("");
                      }
                    }}
                    placeholder="Select Event Type"
                  />
                </View>

                <View style={{ width: 90, zIndex: 6001, elevation: 6001 }}>
                  <Text style={styles.label}>Icon</Text>
                  <DropdownSelect
                    value={iconType}
                    options={AVAILABLE_ICONS.map(icon => ({ label: icon, value: icon }))}
                    onSelect={setIconType}
                    placeholder="Icon"
                  />
                </View>
              </View>

              {(!EVENT_DEFAULTS.some(d => d.type === eventType)) && (
                <View style={{ marginTop: 10, marginBottom: 20 }}>
                  <TextInput
                    style={styles.input}
                    value={eventType}
                    onChangeText={setEventType}
                    placeholder="Type custom event..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

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
                  disabled={!!paramTribeId}
                  placeholder={
                    tribes.find((t) => t.id === selectedTribeId)?.name ||
                    "Loading..."
                  }
                />
              </View>

              <View style={{ zIndex: 3500, elevation: 3500 }}>
                <Text style={styles.label}>Details</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Details"
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textMuted}
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
                />
              </View>

              <View style={{ zIndex: 2000, elevation: 2000 }}>
                <Text style={styles.label}>Time to Decide</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <NumberStepper
                    value={daysToDecideNum}
                    onChange={setDaysToDecideNum}
                  />
                  <View style={{ flex: 2 }}>
                    <DropdownSelect
                      value={daysToDecideUnit}
                      options={["days", "weeks", "months"].map((u) => ({
                        label: u,
                        value: u,
                      }))}
                      onSelect={setDaysToDecideUnit}
                    />
                  </View>
                </View>
              </View>

              <View style={{ zIndex: 1000, elevation: 1000, marginTop: 20, marginBottom: 20 }}>
                <CheckboxToggle
                  label="Recurring event?"
                  isChecked={isRecurring}
                  onPress={() => setIsRecurring(!isRecurring)}
                />

                {isRecurring && (
                  <View>
                    <Text style={[styles.label, { marginBottom: 10, marginTop: 0 }]}>
                      Time till the next event:
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <NumberStepper
                        value={recurringNum}
                        onChange={setRecurringNum}
                      />
                      <View style={{ flex: 2 }}>
                        <DropdownSelect
                          value={recurringUnit}
                          options={["weeks", "months", "years"].map((u) => ({
                            label: u,
                            value: u,
                          }))}
                          onSelect={setRecurringUnit}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View style={{ marginBottom: 24 }}>
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <Text style={{ fontSize: 72, marginBottom: 12 }}>{iconType || "🎉"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
                  <Text style={{ fontSize: 32, fontFamily: "Nunito_900Black", color: colors.text, textAlign: "center" }}>{title}</Text>
                  <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ color: "#F8F9FA", fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>{status}</Text>
                  </View>
                </View>
                {details ? (
                  <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginBottom: 24 }}>{details}</Text>
                ) : <View style={{ marginBottom: 24 }} />}
              </View>

              <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight }}>
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Decision Method</Text>
                  <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.text, fontSize: 16 }}>
                    {decisionMethod === "most_available" ? "By most available" : "By vote"}
                  </Text>
                </View>

                {createdAt && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Created On</Text>
                    <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.text, fontSize: 16 }}>
                      {new Date(createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {createdAt && (
                  <View style={{ marginBottom: isRecurring ? 16 : 0 }}>
                    <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 4 }}>Decision Deadline</Text>
                    <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.text, fontSize: 16 }}>
                      {(() => {
                        const createdDate = new Date(createdAt);
                        if (isNaN(createdDate.getTime())) return "Unknown";
                        const deadlineDate = new Date(createdDate);
                        const num = parseInt(daysToDecideNum) || 0;
                        if (daysToDecideUnit === "days") deadlineDate.setDate(deadlineDate.getDate() + num);
                        else if (daysToDecideUnit === "weeks") deadlineDate.setDate(deadlineDate.getDate() + num * 7);
                        else if (daysToDecideUnit === "months") deadlineDate.setMonth(deadlineDate.getMonth() + num);
                        return deadlineDate.toLocaleDateString();
                      })()}
                    </Text>
                  </View>
                )}

                {isRecurring && (
                  <View style={{ marginTop: 8, alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", color: colors.primary, fontSize: 16 }}>
                      {(() => {
                        const num = parseInt(recurringNum) || 0;
                        let days = 0;
                        if (recurringUnit === "weeks") days = num * 7;
                        else if (recurringUnit === "months") days = num * 30;
                        else if (recurringUnit === "years") days = num * 365;
                        return `Repeats in ${days} days`;
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
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
                    backgroundColor: colors.glassBackground,
                    shadowOpacity: 0,
                    elevation: 0,
                  },
                ]}
                onPress={() => {
                  handleSelectMeetup(selectedMeetup!);
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
                                  color: colors.accent,
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
  container: { ...globalStyles.container, padding: 20 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  itemSubtitle: { fontSize: 14, color: colors.textSecondary },
  label: globalStyles.label,
  input: globalStyles.input,
  textArea: globalStyles.textArea,
  spacer: { height: 20 },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
  chip: {
    backgroundColor: colors.glassBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.background,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glassBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconChipSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  readOnlyInput: globalStyles.readOnlyInput,
  disabledText: {
    color: colors.textMuted,
  },
  proposalsContainer: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  proposalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
  proposalItem: {
    padding: 15,
    backgroundColor: colors.glassBackground,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
