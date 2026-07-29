import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { RecurrencePicker, buildRecurrencePayload, defaultRecurrenceState, getRecurrenceString, parseMeetupToRecurrenceState } from "../lib/components/RecurrencePicker";
import { AVAILABLE_ICONS, EVENT_DEFAULTS } from "../lib/constants";
import { Availability } from "../lib/data/Availability";
import { Chat } from "../lib/data/Chat";
import { HelpRegistry } from "../lib/data/HelpRegistry";
import { Meetup } from "../lib/data/Meetup";
import { MeetupEvent } from "../lib/data/MeetupEvent";
import { Member } from "../lib/data/Member";
import { Poll } from "../lib/data/Poll";
import { PollEntry } from "../lib/data/PollEntry";
import { PollVote } from "../lib/data/PollVote";
import { Proposal } from "../lib/data/Proposal";
import {
  createChat,
  createTribalCouncil,
  deleteTribalCouncil,
  getAvailabilities,
  getChats,
  getHelpRegistries,
  getMeetupEvents,
  getMeetups,
  getMembers,
  getPollEntries,
  getPollVotes,
  getPolls,
  getProposals,
  getRegistryItems,
  getTribalCouncils,
  getTribeMembers,
  getTribes,
  updateMeetup,
  updateProposal,
} from "../lib/data/service";
import { TribalCouncil } from "../lib/data/TribalCouncil";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";

import { useAuth } from "../lib/auth";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { NumberStepper } from "../lib/components/NumberStepper";
import { colors, globalStyles } from "../lib/theme";
import { openMapUrl, safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function EditMeetup() {
  const router = useRouter();
  const { id: paramMeetupId, tribeId: paramTribeId } = useLocalSearchParams<{
    id?: string;
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [isEditing, setIsEditing] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollEntries, setPollEntries] = useState<PollEntry[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [pollTab, setPollTab] = useState("posting");
  const [registries, setRegistries] = useState<(HelpRegistry & { incompleteCount: number })[]>([]);
  const [registryTab, setRegistryTab] = useState<"Please Help!" | "Complete">("Please Help!");

  const [meetupEvents, setMeetupEvents] = useState<MeetupEvent[]>([]);

  // Tribal Council State
  const [tribalCouncils, setTribalCouncils] = useState<TribalCouncil[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showCouncilEditModal, setShowCouncilEditModal] = useState(false);
  const [showCouncilChatModal, setShowCouncilChatModal] = useState(false);
  const [councilChatName, setCouncilChatName] = useState("");
  const [councilChatUrl, setCouncilChatUrl] = useState("");
  const [councilMemberIds, setCouncilMemberIds] = useState<string[]>([]);

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

  const [recurrenceState, setRecurrenceState] = useState(defaultRecurrenceState);

  const [createdAt, setCreatedAt] = useState("");
  const [status, setStatus] = useState("Planning");
  const [leaderTitleSelect, setLeaderTitleSelect] = useState("Tribal Chieftain");
  const [leaderTitleCustom, setLeaderTitleCustom] = useState("");

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isSelectProposalModalVisible, setIsSelectProposalModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [selectedProposalForAccept, setSelectedProposalForAccept] = useState<any>(null);

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
            const [availResults, tribeMems, fetchedPolls, fetchedEvents, fetchedCouncils, fetchedChats] = await Promise.all([
              Promise.all(availPromises),
              getTribeMembers(token, found.tribe_id || paramTribeId!),
              getPolls(token, paramMeetupId),
              getMeetupEvents(paramMeetupId, token),
              getTribalCouncils(paramMeetupId, token),
              getChats(token),
            ]);
            setAvailabilities(availResults.flat());
            setTribeMembers(tribeMems);
            setPolls(fetchedPolls);
            setMeetupEvents(fetchedEvents);
            setTribalCouncils(fetchedCouncils);
            setChats(fetchedChats);
            setCouncilMemberIds(fetchedCouncils.map(c => c.member_id));

            const entryPromises = fetchedPolls.map(p => getPollEntries(token, p.id!));
            const votePromises = fetchedPolls.map(p => getPollVotes(token, p.id!));
            const [entriesResults, votesResults] = await Promise.all([
              Promise.all(entryPromises),
              Promise.all(votePromises)
            ]);
            setPollEntries(entriesResults.flat());
            setPollVotes(votesResults.flat());

            const regPromises = [];
            for (const p of proposalsData) {
              regPromises.push(getHelpRegistries(token, p.id, undefined));
            }
            for (const e of fetchedEvents) {
              regPromises.push(getHelpRegistries(token, undefined, e.id));
            }
            const regsResults = await Promise.all(regPromises);
            const allRegs = regsResults.flat();

            const regsWithCounts = await Promise.all(allRegs.map(async (r) => {
              if (!r.id) return { ...r, incompleteCount: 0 };
              const rItems = await getRegistryItems(token, r.id);
              const incCount = rItems.filter(i => i.status !== 'Complete' && i.status !== 'Cancelled').length;
              return { ...r, incompleteCount: incCount };
            }));
            setRegistries(regsWithCounts);
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

    if (user && meetup.id) {
      try {
        const token = await user.getIdToken();
        const proposalsData = await getProposals(token, undefined, meetup.id);
        setProposals(proposalsData);
        const availPromises = proposalsData.map((p) => getAvailabilities(token, undefined, p.id!));
        const availResults = await Promise.all(availPromises);
        setAvailabilities(availResults.flat());

        const [fetchedPolls, fetchedEvents, fetchedCouncils, fetchedChats] = await Promise.all([
          getPolls(token, meetup.id),
          getMeetupEvents(meetup.id, token),
          getTribalCouncils(meetup.id, token),
          getChats(token),
        ]);
        setPolls(fetchedPolls);
        setMeetupEvents(fetchedEvents);
        setTribalCouncils(fetchedCouncils);
        setChats(fetchedChats);
        setCouncilMemberIds(fetchedCouncils.map(c => c.member_id));

        const entryPromises = fetchedPolls.map(p => getPollEntries(token, p.id!));
        const votePromises = fetchedPolls.map(p => getPollVotes(token, p.id!));
        const [entriesResults, votesResults] = await Promise.all([
          Promise.all(entryPromises),
          Promise.all(votePromises)
        ]);
        setPollEntries(entriesResults.flat());
        setPollVotes(votesResults.flat());

        const regPromises = [];
        for (const p of proposalsData) {
          regPromises.push(getHelpRegistries(token, p.id, undefined));
        }
        for (const e of fetchedEvents) {
          regPromises.push(getHelpRegistries(token, undefined, e.id));
        }
        const regsResults = await Promise.all(regPromises);
        const allRegs = regsResults.flat();

        const regsWithCounts = await Promise.all(allRegs.map(async (r) => {
          if (!r.id) return { ...r, incompleteCount: 0 };
          const rItems = await getRegistryItems(token, r.id);
          const incCount = rItems.filter(i => i.status !== 'Complete' && i.status !== 'Cancelled').length;
          return { ...r, incompleteCount: incCount };
        }));
        setRegistries(regsWithCounts);
      } catch (e) {
        console.error("Failed to fetch related data for meetup", e);
      }
    }

    setDecisionMethod(meetup.decision_method || "most_available");
    setCreatedAt(meetup.created_at || "");
    setStatus(meetup.status || "Planning");

    const presetTitles = ["Tribal Chieftain", "Master of Ceremonies", "Grand Poobah", "Vibe Curator", "The Decider"];
    if (meetup.leader_title) {
      if (presetTitles.includes(meetup.leader_title)) {
        setLeaderTitleSelect(meetup.leader_title);
        setLeaderTitleCustom("");
      } else {
        setLeaderTitleSelect("Custom...");
        setLeaderTitleCustom(meetup.leader_title);
      }
    } else {
      setLeaderTitleSelect("Tribal Chieftain");
      setLeaderTitleCustom("");
    }

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

    setRecurrenceState(parseMeetupToRecurrenceState(meetup));
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

    const recurrencePayload = buildRecurrencePayload(recurrenceState);

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
          leader_title: leaderTitleSelect === "Custom..." ? leaderTitleCustom : leaderTitleSelect,
          ...recurrencePayload,
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

  const handleCancelMeetup = async () => {
    if (!selectedMeetup || !user) return;
    setIsCancelModalVisible(true);
  };

  const confirmCancelMeetup = async () => {
    if (!selectedMeetup || !user) return;
    setIsCancelModalVisible(false);
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateMeetup({ ...selectedMeetup, status: "Cancelled" } as any, token);
      showAlert("Success", "Meetup cancelled!");
      setIsEditing(false);
      fetchMeetups();
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteMeetup = async () => {
    if (!selectedMeetup || !user) return;
    showAlert("Complete Meetup", "Are you sure you want to complete this meetup?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setUpdating(true);
          try {
            const token = await user.getIdToken();
            let nextStatus = "Completed";
            let nextRecursOn = selectedMeetup.recurs_on;

            if (selectedMeetup.recurrence_type) {
              nextStatus = "Planning";
              const baseDate = selectedMeetup.recurs_on ? new Date(selectedMeetup.recurs_on) : new Date(selectedMeetup.created_at || Date.now());
              const basis = Number(selectedMeetup.recurrence_basis) || 1;
              if (selectedMeetup.recurrence_type === "weekly") {
                baseDate.setDate(baseDate.getDate() + 7 * basis);
              } else if (selectedMeetup.recurrence_type === "monthly") {
                baseDate.setMonth(baseDate.getMonth() + basis);
              } else if (selectedMeetup.recurrence_type === "yearly") {
                baseDate.setFullYear(baseDate.getFullYear() + basis);
              }
              nextRecursOn = baseDate.toISOString();
            }

            await updateMeetup({ ...selectedMeetup, status: nextStatus, recurs_on: nextRecursOn } as any, token);
            showAlert("Success", "Meetup completed!");
            setIsEditing(false);
            fetchMeetups();
          } catch (error: any) {
            showAlert("Error", error.message);
          } finally {
            setUpdating(false);
          }
        }
      }
    ]);
  };

  const handleAcceptProposal = async (proposal: any) => {
    if (!selectedMeetup || !user) return;
    showAlert("Accept Proposal", "Are you sure you want to accept this proposal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Accept",
        onPress: async () => {
          setUpdating(true);
          try {
            const token = await user.getIdToken();
            await updateProposal({ ...proposal, status: "accepted" } as any, token);
            await updateMeetup({ ...selectedMeetup, status: "Scheduled" } as any, token);
            showAlert("Success", "Proposal accepted and meetup scheduled!");
            setIsSelectProposalModalVisible(false);
            setSelectedProposalForAccept(null);
            fetchMeetups();
            setIsEditing(false);
            setSelectedMeetup(null);
          } catch (error: any) {
            showAlert("Error", error.message);
          } finally {
            setUpdating(false);
          }
        }
      }
    ]);
  };

  const handleUpdateCouncil = async () => {
    if (!user || !selectedMeetup?.id) return;
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await Promise.all(tribalCouncils.map(c => deleteTribalCouncil(c.id!, token)));
      const newCouncils = await Promise.all(
        councilMemberIds.map(cid =>
          createTribalCouncil({ meetup_id: selectedMeetup.id!, member_id: cid }, token)
        )
      );
      setTribalCouncils(newCouncils);
      setShowCouncilEditModal(false);
    } catch (e: any) {
      showAlert("Error", "Failed to update Tribal Council: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveCouncilChat = async (name: string, url: string) => {
    if (!user || !selectedMeetup?.id || !name || !url) return;
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const chat = await createChat({
        name: name,
        url: url,
        is_council: true,
        meetup_id: selectedMeetup.id,
        tribe_id: selectedMeetup.tribe_id,
      }, token);
      setChats(prev => [...prev, chat]);
      setShowCouncilChatModal(false);
      setCouncilChatName("");
      setCouncilChatUrl("");
    } catch (e: any) {
      showAlert("Error", "Failed to create chat: " + e.message);
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

              <View style={{ zIndex: 3750, elevation: 3750, marginTop: 24, marginBottom: 24 }}>
                <Text style={styles.label}>Your Title</Text>
                <DropdownSelect
                  value={leaderTitleSelect}
                  options={[
                    { label: "Mama Bear", value: "Mama Bear" },
                    { label: "Papa Bear", value: "Papa Bear" },
                    { label: "Oh Wise One", value: "Oh Wise One" },
                    { label: "Queen Bee", value: "Queen Bee" },
                    { label: "Boss Lady", value: "Boss Lady" },
                    { label: "Chief Trouble Maker", value: "Chief Trouble Maker" },
                    { label: "Her Royal Highness", value: "Her Royal Highness" },
                    { label: "Tribal Chieftain", value: "Tribal Chieftain" },
                    { label: "Master of Ceremonies", value: "Master of Ceremonies" },
                    { label: "Grand Poobah", value: "Grand Poobah" },
                    { label: "Vibe Curator", value: "Vibe Curator" },
                    { label: "The Decider", value: "The Decider" },
                    { label: "Custom...", value: "Custom..." },
                  ]}
                  onSelect={setLeaderTitleSelect}
                />
                {leaderTitleSelect === "Custom..." && (
                  <TextInput
                    style={[styles.input, { marginTop: 10 }]}
                    value={leaderTitleCustom}
                    onChangeText={setLeaderTitleCustom}
                    placeholder="Enter your custom title..."
                    placeholderTextColor={colors.textMuted}
                  />
                )}
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
                <RecurrencePicker state={recurrenceState} onChange={setRecurrenceState} />
              </View>
            </>
          ) : (
            <View style={{ marginBottom: 24 }}>
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <Text style={{ fontSize: 72, marginBottom: 12 }}>{iconType || "🎉"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
                  <Text style={{ fontSize: 40, fontFamily: "Lobster_400Regular", color: colors.accent, textAlign: "center" }}>{title}</Text>
                  {(() => {
                    let bgColor = colors.accent;
                    let textColor = "#F8F9FA";
                    let bWidth = 0;
                    if (status === "Scheduled" || status === "Ongoing") bgColor = "#28a745";
                    else if (status === "Planning") bgColor = "#007bff";
                    else if (status === "Cancelled") bgColor = "#dc3545";
                    else if (status === "Completed") {
                      bgColor = "#ffffff";
                      textColor = "#000000";
                      bWidth = 1;
                    }
                    return (
                      <View style={{ backgroundColor: bgColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: bWidth, borderColor: "#ccc" }}>
                        <Text style={{ color: textColor, fontWeight: "bold", fontSize: 12, textTransform: "uppercase" }}>{status}</Text>
                      </View>
                    );
                  })()}
                </View>
                {details ? (
                  <Text style={{ fontSize: 18, fontFamily: "Fraunces_200ExtraLight", color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginBottom: 32 }}>{details}</Text>
                ) : <View style={{ marginBottom: 32 }} />}
                {(() => {
                  const tribe = tribes.find(t => t.id === selectedMeetup.tribe_id);
                  if (!tribe) return null;
                  return (
                    <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: colors.textSecondary, textAlign: "center", marginBottom: 24 }}>
                      {tribe.icon_type} {tribe.name}
                    </Text>
                  );
                })()}
              </View>

              <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight }}>
                {(() => {
                  const isFinalized = ["Upcoming", "Ongoing"].includes(selectedMeetup.status || "");
                  const currentEvent = isFinalized && meetupEvents.length > 0
                    ? [...meetupEvents].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]
                    : null;
                  const acceptedProposal = proposals.find(p => p.status === "Accepted");

                  if (currentEvent) {
                    const host = members.find(m => m.id === currentEvent.host_id);
                    const pStartDate = new Date(currentEvent.start_at || "");
                    const pEndDate = new Date(currentEvent.end_at || "");
                    const hasValidDate = !isNaN(pStartDate.getTime()) && !isNaN(pEndDate.getTime());

                    return (
                      <>
                        <View style={{ marginBottom: 12 }}>
                          <Text style={globalStyles.attributeName}>Starting</Text>
                          <Text style={globalStyles.attributeValue}>
                            {hasValidDate ? pStartDate.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : "TBD"}
                          </Text>
                        </View>

                        <View style={{ marginBottom: 12 }}>
                          <Text style={globalStyles.attributeName}>Until</Text>
                          <Text style={globalStyles.attributeValue}>
                            {hasValidDate ? pEndDate.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : "TBD"}
                          </Text>
                        </View>

                        <View style={{ marginBottom: 12 }}>
                          <Text style={globalStyles.attributeName}>Where</Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (currentEvent.location) {
                                showAlert(
                                  "Open in Maps",
                                  "Would you like to open this location in your Maps app?",
                                  [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Open", onPress: () => openMapUrl(currentEvent.location) }
                                  ]
                                );
                              }
                            }}
                          >
                            <Text style={globalStyles.attributeValuePrimary}>
                              {currentEvent.location || "TBD"}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                          <Text style={globalStyles.attributeName}>Who</Text>
                          <Text style={globalStyles.attributeValue}>
                            {host?.name || "Unknown"}
                          </Text>
                        </View>

                        {acceptedProposal && (
                          <View>
                            <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Availabilities</Text>
                            {(() => {
                              const isVoting = selectedMeetup?.decision_method === "single_choice_voting";
                              let pAvails = availabilities.filter(a => a.proposal_id === acceptedProposal.id);

                              const creatorId = (selectedMeetup as any).creator_id;
                              const hostId = acceptedProposal.host_id;
                              [creatorId, hostId].forEach(id => {
                                if (id && !pAvails.some(a => a.member_id === id)) {
                                  pAvails.push({
                                    id: `implicit-${id}`,
                                    proposal_id: acceptedProposal.id,
                                    member_id: id,
                                    status: "yes",
                                    vote: isVoting
                                  } as any);
                                }
                              });

                              if (pAvails.length === 0) return <Text style={{ fontFamily: "Nunito_400Regular", color: colors.textSecondary }}>No availabilities yet.</Text>;

                              return (
                                <View style={{ gap: 4 }}>
                                  {pAvails.map(a => {
                                    const m = members.find((mem) => mem.id === a.member_id);
                                    let icon = "❔";
                                    if (a.status === "Yes") icon = "✅";
                                    else if (a.status === "No") icon = "❌";
                                    else if (a.status === "Maybe") icon = "🤔";
                                    if (isVoting && (a as any).vote === true) icon += " 🗳️";
                                    return (
                                      <Text key={a.id || a.member_id} style={globalStyles.attributeValue}>
                                        {m?.name || "Unknown"}: {icon}
                                      </Text>
                                    );
                                  })}
                                </View>
                              );
                            })()}
                          </View>
                        )}
                        {currentEvent.root_folder_id ? (
                          <View style={{ marginTop: 16 }}>
                            <TouchableOpacity onPress={() => Linking.openURL(`https://drive.google.com/drive/folders/${currentEvent.root_folder_id}`)}>
                              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Go To Photo Album</Text>
                            </TouchableOpacity>
                          </View>
                        ) : selectedMeetup.root_folder_id ? (
                          <View style={{ marginTop: 16 }}>
                            <TouchableOpacity onPress={() => Linking.openURL(`https://drive.google.com/drive/folders/${selectedMeetup.root_folder_id}`)}>
                              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Go To Meetup Folder</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </>
                    );
                  }

                  return (
                    <>
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Decision Method</Text>
                        <Text style={globalStyles.attributeValue}>
                          {decisionMethod === "most_available" ? "By most available" : "By vote"}
                        </Text>
                      </View>

                      {createdAt && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Created On</Text>
                          <Text style={globalStyles.attributeValue}>
                            {new Date(createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      )}

                      {createdAt && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Decision Deadline</Text>
                          <Text style={globalStyles.attributeValue}>
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
                    </>
                  );
                })()}

                {selectedMeetup.recurrence_type && (
                  <View style={{ marginTop: 8, alignItems: "center", paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
                    <Text style={{ fontFamily: "Nunito_700Bold", color: colors.primary, fontSize: 16 }}>
                      {getRecurrenceString(selectedMeetup as any)}
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
            <View style={{ marginTop: -32, marginBottom: 54, zIndex: 1 }}>
              {selectedMeetup.status === "Cancelled" ? null :
                selectedMeetup.status === "Completed" && !selectedMeetup.recurrence_type ? null : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.primaryButtonText}>Edit Meetup</Text>
                  </TouchableOpacity>
                )}
            </View>
          ) : null}

          {!isEditing && selectedMeetup.root_folder_id && (
            <View style={globalStyles.sectionPanel}>
              <View style={globalStyles.sectionHeader}>
                <Text style={globalStyles.sectionTitle}>📊 Polls</Text>
                {selectedMeetup.status !== "Completed" && (
                  <TouchableOpacity
                    onPress={() => router.push(`/create-poll?meetupId=${selectedMeetup.id}` as any)}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <TouchableOpacity
                  onPress={() => setPollTab("posting")}
                  style={[styles.tab, pollTab === "posting" && styles.activeTab]}
                >
                  <Text style={[styles.tabText, pollTab === "posting" && styles.activeTabText]}>Still Posting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPollTab("voting")}
                  style={[styles.tab, pollTab === "voting" && styles.activeTab]}
                >
                  <Text style={[styles.tabText, pollTab === "voting" && styles.activeTabText]}>Now Voting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPollTab("completed")}
                  style={[styles.tab, pollTab === "completed" && styles.activeTab]}
                >
                  <Text style={[styles.tabText, pollTab === "completed" && styles.activeTabText]}>Completed</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={{ gap: 12 }}>
                {polls
                  .filter((p) => (p.status || "Posting").toLowerCase() === pollTab && !p.meetup_event_id)
                  .map((poll) => {
                    const entryCount = pollEntries.filter((e) => e.poll_id === poll.id).length;
                    const voteCount = pollVotes.filter((v) => v.poll_id === poll.id).length;

                    let daysLeftText = "";
                    if (pollTab === "posting" && poll.entry_deadline) {
                      const days = Math.max(0, Math.ceil((new Date(poll.entry_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                      daysLeftText = `${days} ${days === 1 ? 'day' : 'days'} left • `;
                    } else if (pollTab === "voting" && poll.vote_deadline) {
                      const days = Math.max(0, Math.ceil((new Date(poll.vote_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                      daysLeftText = `${days} ${days === 1 ? 'day' : 'days'} left • `;
                    }

                    return (
                      <TouchableOpacity
                        key={poll.id}
                        style={styles.proposalItem}
                        onPress={() => router.push(`/edit-poll?id=${poll.id}` as any)}
                      >
                        <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: colors.text, marginBottom: 4 }}>
                          {poll.icon_type ? `${poll.icon_type} ` : ""}{poll.title}
                        </Text>
                        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                          {daysLeftText}{entryCount} {entryCount === 1 ? "entry" : "entries"}
                          {pollTab !== "posting" && ` • ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                {polls.filter((p) => (p.status || "Posting").toLowerCase() === pollTab && !p.meetup_event_id).length === 0 && (
                  <Text style={{ textAlign: "center", color: colors.textMuted, fontStyle: "italic", marginTop: 12, marginBottom: 12 }}>No polls found.</Text>
                )}
              </View>

              {(() => {
                if ((selectedMeetup?.status || "").toLowerCase() === "planning") return null;

                const isCouncilMember = tribalCouncils.some(c => c.member_id === member?.id) || selectedMeetup?.creator_id === member?.id;
                const isFinalized = ["upcoming", "scheduled", "ongoing"].includes((selectedMeetup?.status || "").toLowerCase());
                const currentEvent = isFinalized && meetupEvents.length > 0
                  ? [...meetupEvents].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]
                  : null;
                const acceptedProposal = proposals.find(p => p.status === "Accepted");

                let relevantEventId = currentEvent?.id;
                let relevantProposalId = acceptedProposal?.id;

                const visibleRegistries = registries.filter(r => (!r.is_council || isCouncilMember) && relevantEventId && r.meetup_event_id === relevantEventId);

                return (
                  <View style={globalStyles.sectionPanel}>
                    <View style={globalStyles.sectionHeader}>
                      <Text style={globalStyles.sectionTitle}>📋 Help Registries</Text>
                      {isCouncilMember && relevantEventId && (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => {
                            router.push({ pathname: "/edit-registry", params: { meetupEventId: relevantEventId } });
                          }}
                        >
                          <Text style={styles.addButtonText}>+ Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={{ flexDirection: "row", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                      {["Please Help!", "Complete"].map(tab => (
                        <TouchableOpacity
                          key={tab}
                          style={[styles.tab, registryTab === tab && styles.activeTab]}
                          onPress={() => setRegistryTab(tab as any)}
                        >
                          <Text style={[styles.tabText, registryTab === tab && styles.activeTabText]}>{tab}</Text>
                          <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>
                              {tab === "Please Help!" ? visibleRegistries.filter(r => r.incompleteCount > 0).length : visibleRegistries.filter(r => r.incompleteCount === 0).length}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {visibleRegistries.filter(r => registryTab === "Complete" ? r.incompleteCount === 0 : r.incompleteCount > 0).length === 0 ? (
                      <Text style={{ textAlign: "center", color: colors.textMuted, fontStyle: "italic", marginTop: 12, marginBottom: 12 }}>No registries found.</Text>
                    ) : (
                      visibleRegistries.filter(r => registryTab === "Complete" ? r.incompleteCount === 0 : r.incompleteCount > 0).map(reg => (
                        <TouchableOpacity
                          key={reg.id}
                          style={styles.proposalItem}
                          onPress={() => router.push({ pathname: "/edit-registry", params: { id: reg.id } })}
                        >
                          <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: colors.text, marginBottom: 4 }}>{reg.name}</Text>
                          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                            {reg.incompleteCount} incomplete item{reg.incompleteCount !== 1 ? 's' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {selectedMeetup.status === "Planning" && (
            <View style={[globalStyles.sectionPanel, { marginBottom: 24 }]}>
              <View style={globalStyles.sectionHeader}>
                <Text style={globalStyles.sectionTitle}>
                  💡 Proposals
                </Text>
                {selectedMeetup.status === "Planning" && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() =>
                      router.push({
                        pathname: "/create-proposal",
                        params: { meetupId: selectedMeetup.id },
                      })
                    }
                  >
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              {proposals.length === 0 ? (
                <Text style={styles.emptyText}>No proposals found.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 256 }} nestedScrollEnabled>
                  {proposals.map((p) => {
                    const host = members.find((m) => m.id === p.host_id);
                    let displayDate = "Unknown Date";
                    if (p.start_at) {
                      const dStart = new Date(p.start_at);
                      const dEnd = p.end_at ? new Date(p.end_at) : null;
                      if (!isNaN(dStart.getTime())) {
                        const pad = (n: number) => n.toString().padStart(2, "0");
                        const startStr = `${dStart.getFullYear()}-${pad(dStart.getMonth() + 1)}-${pad(dStart.getDate())} ${pad(dStart.getHours())}:${pad(dStart.getMinutes())}`;
                        if (dEnd && !isNaN(dEnd.getTime())) {
                          displayDate = `${startStr} - ${pad(dEnd.getHours())}:${pad(dEnd.getMinutes())}`;
                        } else {
                          displayDate = startStr;
                        }
                      }
                    }

                    const pAvails = availabilities.filter(
                      (a) => a.proposal_id === p.id,
                    );
                    const availableCount = pAvails.filter(
                      (a) => a.status === "Yes",
                    ).length;
                    const unsureCount = pAvails.filter(
                      (a) => a.status === "Maybe",
                    ).length;
                    const unavailableCount = pAvails.filter(
                      (a) => a.status === "No",
                    ).length;
                    const pendingCount = Math.max(0, tribeMembers.length - pAvails.length);
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
                        if (a.status === "Yes") icon = "✅";
                        else if (a.status === "No") icon = "❌";
                        else if (a.status === "Maybe") icon = "🤔";
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
                        onPress={() => {
                          if (selectedMeetup.status === "Cancelled" || selectedMeetup.status === "Completed") return;
                          router.push({
                            pathname: "/edit-proposal",
                            params: { id: p.id, meetupId: selectedMeetup.id },
                          });
                        }}
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
                            {p.status === "Accepted" && (
                              <View>
                                <Text
                                  style={{
                                    color: colors.accent,
                                    fontSize: 20,
                                    marginRight: 10,
                                  }}
                                >
                                  ✓
                                </Text>
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemTitle} numberOfLines={1}>
                                {displayDate}
                              </Text>
                              <Text style={styles.itemSubtitle}>
                                {(p as any).location}
                              </Text>
                            </View>

                            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginRight: 10 }}>
                              <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 16 }}>✅</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{availableCount}</Text>
                              </View>
                              <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 16 }}>🤔</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{unsureCount}</Text>
                              </View>
                              <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 16 }}>❌</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{unavailableCount}</Text>
                              </View>
                              <View style={{ alignItems: "center" }}>
                                <Text style={{ fontSize: 16 }}>❔</Text>
                                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{pendingCount}</Text>
                              </View>
                              {isVoting && (
                                <View style={{ alignItems: "center" }}>
                                  <Text style={{ fontSize: 16 }}>🗳️</Text>
                                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>{voteCount}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          {p.root_folder_id && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                Linking.openURL(`https://drive.google.com/drive/folders/${p.root_folder_id}`);
                              }}
                              style={{ marginTop: 8 }}
                            >
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "bold" }}>Photo Album</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {!isEditing && (selectedMeetup as any).creator_id === member?.id && selectedMeetup.status !== "Cancelled" && selectedMeetup.status !== "Completed" && proposals.length > 0 && selectedMeetup.status === "Planning" && (
            <View style={{ marginTop: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent }]}
                onPress={() => setIsSelectProposalModalVisible(true)}
              >
                <Text style={styles.primaryButtonText}>Select Proposal</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isEditing && (
            <View style={globalStyles.sectionPanel}>
              <View style={globalStyles.sectionHeader}>
                <Text style={globalStyles.sectionTitle}>
                  🕰️ Past Events
                </Text>
              </View>
              {(() => {
                const pastEvents = meetupEvents.filter(e => new Date(e.end_at).getTime() < new Date().getTime());
                if (pastEvents.length === 0) return <Text style={styles.emptyText}>No past events.</Text>;
                return (
                  <ScrollView style={{ maxHeight: 256 }} nestedScrollEnabled>
                    {pastEvents.map((pe) => {
                      const pStartDate = new Date(pe.start_at);
                      const displayDate = !isNaN(pStartDate.getTime()) ? pStartDate.toLocaleDateString() : "Unknown Date";
                      return (
                        <TouchableOpacity
                          key={pe.id}
                          style={styles.proposalItem}
                          onPress={() => router.push(`/event-details?id=${pe.id}&meetupId=${selectedMeetup.id}` as any)}
                        >
                          <Text style={styles.itemTitle}>{displayDate}</Text>
                          <Text style={styles.itemSubtitle}>{pe.location}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                );
              })()}
            </View>
          )}

          {/* Tribal Council Section */}
          {!isEditing && (
            <View style={globalStyles.sectionPanel}>
              <View style={globalStyles.sectionHeader}>
                <Text style={globalStyles.sectionTitle}>👑 Tribal Council</Text>
                {(selectedMeetup as any).creator_id === member?.id && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setCouncilMemberIds(tribalCouncils.map((c) => c.member_id));
                      setShowCouncilEditModal(true);
                    }}
                  >
                    <Text style={styles.addButtonText}>Edit Council</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Creator as leader */}
              <View style={{ marginBottom: 16 }}>
                {(() => {
                  const creatorMember = members.find((m) => m.id === (selectedMeetup as any).creator_id);
                  if (creatorMember) {
                    return (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>
                          {selectedMeetup.leader_title || "Tribal Chieftain"}
                        </Text>
                        <TouchableOpacity onPress={() => router.push(`/edit-member?id=${creatorMember.id}` as any)}>
                          <Text style={globalStyles.attributeValue}>
                            {creatorMember.name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return <Text style={{ color: colors.text }}>Unknown</Text>;
                })()}
              </View>

              {/* Council Members */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[globalStyles.attributeName, { marginBottom: 4 }]}>Council Members</Text>
                {(() => {
                  const regularCouncils = tribalCouncils.filter(c => c.member_id !== (selectedMeetup as any).creator_id);
                  if (regularCouncils.length === 0) {
                    return <Text style={{ color: colors.textMuted }}>No council members</Text>;
                  }
                  return regularCouncils.map((c) => {
                    const mem = members.find((m) => m.id === c.member_id);
                    if (!mem) return null;
                    return (
                      <TouchableOpacity key={c.id} onPress={() => router.push(`/edit-member?id=${mem.id}` as any)} style={{ marginBottom: 4 }}>
                        <Text style={globalStyles.attributeValue}>{mem.name}</Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>

              {/* Council Chat */}
              <View style={{ alignItems: "center" }}>
                {(() => {
                  const councilChat = chats.find(c => c.meetup_id === selectedMeetup.id && c.is_council);
                  if (councilChat) {
                    return (
                      <TouchableOpacity onPress={() => Linking.openURL(councilChat.url)}>
                        <Text style={{ color: colors.primary, fontSize: 16, textDecorationLine: "underline" }}>{councilChat.name}</Text>
                      </TouchableOpacity>
                    );
                  } else {
                    const isCouncil = tribalCouncils.some(c => c.member_id === member?.id);
                    if (isCouncil || (selectedMeetup as any).creator_id === member?.id) {
                      return (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => setShowCouncilChatModal(true)}
                        >
                          <Text style={styles.addButtonText}>+ Create Council Chat</Text>
                        </TouchableOpacity>
                      );
                    }
                    return <Text style={{ color: colors.textMuted }}>No chat available</Text>;
                  }
                })()}
              </View>
            </View>
          )}

          {!isEditing && (selectedMeetup as any).creator_id === member?.id && selectedMeetup.status !== "Cancelled" && selectedMeetup.status !== "Completed" && (
            <View style={{ marginTop: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.danger }]}
                onPress={handleCancelMeetup}
              >
                <Text style={styles.primaryButtonText}>Cancel Meetup</Text>
              </TouchableOpacity>
            </View>
          )}

          <Modal
            visible={isCancelModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsCancelModalVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
              <View style={{ backgroundColor: colors.background, padding: 24, borderRadius: 16 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 12 }}>Cancel Meetup</Text>
                <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 24 }}>Are you sure you want to cancel this meetup?</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: colors.glassBackground }]} onPress={() => setIsCancelModalVisible(false)}>
                    <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: colors.danger }]} onPress={confirmCancelMeetup}>
                    <Text style={styles.primaryButtonText}>Yes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            visible={isSelectProposalModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              setIsSelectProposalModalVisible(false);
              setSelectedProposalForAccept(null);
            }}
          >
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 }}>
              <View style={{ backgroundColor: colors.background, padding: 20, borderRadius: 16 }}>
                {!selectedProposalForAccept ? (
                  <>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 20 }}>Select a Proposal</Text>
                    <ScrollView style={{ maxHeight: 400 }}>
                      {proposals.map(p => {
                        const dStart = p.start_at ? new Date(p.start_at) : null;
                        const dEnd = p.end_at ? new Date(p.end_at) : null;
                        let dateStr = "Unknown Date";
                        if (dStart && !isNaN(dStart.getTime())) {
                          dateStr = `${dStart.toLocaleDateString()} ${dStart.toLocaleTimeString()}`;
                          if (dEnd && !isNaN(dEnd.getTime())) {
                            dateStr += ` - ${dEnd.toLocaleTimeString()}`;
                          }
                        }
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                            onPress={() => setSelectedProposalForAccept(p)}
                          >
                            <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.text }}>{dateStr}</Text>
                            <Text style={{ color: colors.textSecondary }}>{(p as any).location}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity style={[styles.primaryButton, { marginTop: 20, backgroundColor: colors.glassBackground }]} onPress={() => setIsSelectProposalModalVisible(false)}>
                      <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>Close</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text, marginBottom: 20 }}>Proposal Info</Text>
                    {(() => {
                      const p = selectedProposalForAccept;
                      const host = members.find((m) => m.id === p.host_id);
                      const dStart = p.start_at ? new Date(p.start_at) : null;
                      const dEnd = p.end_at ? new Date(p.end_at) : null;
                      let dateStr = "Unknown Date";
                      if (dStart && !isNaN(dStart.getTime())) {
                        dateStr = `${dStart.toLocaleDateString()} ${dStart.toLocaleTimeString()}`;
                        if (dEnd && !isNaN(dEnd.getTime())) {
                          dateStr += ` - ${dEnd.toLocaleTimeString()}`;
                        }
                      }

                      const pAvails = availabilities.filter((a) => a.proposal_id === p.id);
                      const availableCount = pAvails.filter((a) => a.status === "Yes").length;
                      const unsureCount = pAvails.filter((a) => a.status === "Maybe").length;
                      const unavailableCount = pAvails.filter((a) => a.status === "No").length;

                      let availText = pAvails
                        .map((a) => {
                          const m = members.find((mem) => mem.id === a.member_id);
                          let icon = "❔";
                          if (a.status === "Yes") icon = "✅";
                          else if (a.status === "No") icon = "❌";
                          else if (a.status === "Maybe") icon = "🤔";
                          return `${m?.name || "Unknown"}: ${icon}`;
                        })
                        .join("\n");
                      if (!availText) availText = "No availabilities yet.";

                      return (
                        <ScrollView style={{ maxHeight: 400 }}>
                          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10 }}><Text style={{ fontWeight: 'bold' }}>Date:</Text> {dateStr}</Text>
                          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10 }}><Text style={{ fontWeight: 'bold' }}>Location:</Text> {(p as any).location}</Text>
                          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10 }}><Text style={{ fontWeight: 'bold' }}>Host:</Text> {host?.name}</Text>
                          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10, marginTop: 10, fontWeight: 'bold' }}>Summary:</Text>
                          <Text style={{ color: colors.text }}>• Available: {availableCount}</Text>
                          <Text style={{ color: colors.text }}>• Unsure: {unsureCount}</Text>
                          <Text style={{ color: colors.text, marginBottom: 10 }}>• Unavailable: {unavailableCount}</Text>
                          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10, marginTop: 10, fontWeight: 'bold' }}>Availabilities:</Text>
                          <Text style={{ color: colors.text }}>{availText}</Text>
                        </ScrollView>
                      );
                    })()}

                    <View style={{ flexDirection: "row", marginTop: 20, gap: 10 }}>
                      <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: colors.glassBackground }]} onPress={() => setSelectedProposalForAccept(null)}>
                        <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: colors.accent }]} onPress={() => handleAcceptProposal(selectedProposalForAccept)}>
                        <Text style={styles.primaryButtonText}>Accept Proposal</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Modal>

          <Modal visible={showCouncilEditModal} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.background, padding: 20, borderRadius: 12 }}>
                <Text style={{ fontSize: 20, fontFamily: "Besley_700Bold", color: colors.text, marginBottom: 16 }}>
                  Edit Tribal Council
                </Text>

                <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                  {tribeMembers.map((tm) => {
                    const mem = members.find((m) => m.id === tm.member_id);
                    if (!mem) return null;
                    const isCreator = mem.id === (selectedMeetup as any).creator_id;
                    if (isCreator) return null;
                    const isSelected = councilMemberIds.includes(mem.id!);
                    return (
                      <TouchableOpacity
                        key={mem.id}
                        onPress={() => {
                          setCouncilMemberIds((prev) =>
                            isSelected ? prev.filter((id) => id !== mem.id!) : [...prev, mem.id!]
                          );
                        }}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                      >
                        <View style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? colors.primary : colors.textMuted, backgroundColor: isSelected ? colors.primary : "transparent", marginRight: 12, alignItems: "center", justifyContent: "center" }}>
                          {isSelected && <Text style={{ color: colors.background, fontSize: 16, fontWeight: "bold" }}>✓</Text>}
                        </View>
                        <Text style={{ color: colors.text, fontSize: 16 }}>{mem.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1, backgroundColor: colors.surface }]}
                    onPress={() => setShowCouncilEditModal(false)}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleUpdateCouncil}
                  >
                    <Text style={styles.primaryButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <GroupChatModal
            visible={showCouncilChatModal}
            onClose={() => setShowCouncilChatModal(false)}
            members={[]}
            hideMemberSelection={true}
            hideNameInput={true}
            title="Tribal Council Group Chat"
            defaultName={`${title || "Meetup"} Tribal Council Group Chat`}
            onCreate={(_name, url) => {
              setCouncilChatName(`${title || "Meetup"} Tribal Council Group Chat`);
              setCouncilChatUrl(url);
              handleSaveCouncilChat(`${title || "Meetup"} Tribal Council Group Chat`, url);
            }}
          />

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
  addButtonText: {
    color: "#F8F9FA",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: "Nunito_700Bold",
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
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 16,
  },
  tabText: {
    fontSize: 16,
    fontFamily: "Nunito_700Bold",
    color: colors.textSecondary,
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabBadge: {
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "bold",
  },
});
