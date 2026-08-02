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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { RecurrencePicker, buildRecurrencePayload, defaultRecurrenceState, parseMeetupToRecurrenceState } from "../lib/components/RecurrencePicker";
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
  createSquad,
  deleteSquad,
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
  getSquads,
  getTribeMembers,
  getTribes,
  updateMeetup,
  updateProposal
} from "../lib/data/service";
import { Squad } from "../lib/data/Squad";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";

import { useAuth } from "../lib/auth";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { FloralDivider } from "../lib/components/FloralDivider";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { NumberStepper } from "../lib/components/NumberStepper";
import { colors, globalStyles } from "../lib/theme";
import { safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember } from "../lib/RootContext";

export default function WriteMeetup() {
  const router = useRouter();
  const { id: paramMeetupId, tribeId: paramTribeId } = useLocalSearchParams<{
    id?: string;
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const isEditing = true;
  const setIsEditing = (v: boolean) => {
    if (!v && router.canGoBack()) router.back();
  };
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

  // Squad State
  const [squads, setSquads] = useState<Squad[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [showSquadEditModal, setShowSquadEditModal] = useState(false);
  const [showSquadChatModal, setShowSquadChatModal] = useState(false);
  const [squadChatName, setSquadChatName] = useState("");
  const [squadChatUrl, setSquadChatUrl] = useState("");
  const [squadMemberIds, setSquadMemberIds] = useState<string[]>([]);

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
            const [availResults, tribeMems, fetchedPolls, fetchedEvents, fetchedSquads, fetchedChats] = await Promise.all([
              Promise.all(availPromises),
              getTribeMembers(token, found.tribe_id || paramTribeId!),
              getPolls(token, paramMeetupId),
              getMeetupEvents(token, paramMeetupId),
              getSquads(token, paramMeetupId),
              getChats(token),
            ]);
            setAvailabilities(availResults.flat());
            setTribeMembers(tribeMems);
            setPolls(fetchedPolls);
            setMeetupEvents(fetchedEvents);
            setSquads(fetchedSquads);
            setChats(fetchedChats);
            setSquadMemberIds(fetchedSquads.map(c => c.member_id));

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

        const [fetchedPolls, fetchedEvents, fetchedSquads, fetchedChats] = await Promise.all([
          getPolls(token, meetup.id),
          getMeetupEvents(token, meetup.id),
          getSquads(token, meetup.id),
          getChats(token),
        ]);
        setPolls(fetchedPolls);
        setMeetupEvents(fetchedEvents);
        setSquads(fetchedSquads);
        setChats(fetchedChats);
        setSquadMemberIds(fetchedSquads.map(c => c.member_id));

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
      safeBack(router, `/read-tribe?id=${paramTribeId}`);
    } else {
      setSelectedMeetup(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;

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
      await updateMeetup(token, {
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
        } as any
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
      await updateMeetup(token, { ...selectedMeetup, status: "Cancelled" } as any);
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
            let nextRecursOn = selectedMeetup?.recurs_on;

            if (selectedMeetup?.recurrence_type) {
              nextStatus = "Planning";
              const baseDate = selectedMeetup?.recurs_on ? new Date(selectedMeetup?.recurs_on) : new Date(selectedMeetup?.created_at || Date.now());
              const basis = Number(selectedMeetup?.recurrence_basis) || 1;
              if (selectedMeetup?.recurrence_type === "weekly") {
                baseDate.setDate(baseDate.getDate() + 7 * basis);
              } else if (selectedMeetup?.recurrence_type === "monthly") {
                baseDate.setMonth(baseDate.getMonth() + basis);
              } else if (selectedMeetup?.recurrence_type === "yearly") {
                baseDate.setFullYear(baseDate.getFullYear() + basis);
              }
              nextRecursOn = baseDate.toISOString();
            }

            await updateMeetup(token, { ...selectedMeetup, status: nextStatus, recurs_on: nextRecursOn } as any);
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
            await updateProposal(token, { ...proposal, status: "accepted" } as any);
            await updateMeetup(token, { ...selectedMeetup, status: "Scheduled" } as any);
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

  const handleUpdateSquad = async () => {
    const meetupId = selectedMeetup?.id;
    if (!user || !meetupId) return;
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await Promise.all(squads.map(c => deleteSquad(token, c.id!)));
      const newSquads = await Promise.all(
        squadMemberIds.map(cid =>
          createSquad(token, { meetup_id: meetupId, member_id: cid })
        )
      );
      setSquads(newSquads);
      setShowSquadEditModal(false);
    } catch (e: any) {
      showAlert("Error", "Failed to update Squad: " + e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveSquadChat = async (name: string, url: string) => {
    if (!user || !selectedMeetup?.id! || !name || !url) return;
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const chat = await createChat(token, {
        name: name,
        url: url,
        chat_type: 'squad',
        meetup_id: selectedMeetup?.id!,
        tribe_id: selectedMeetup?.tribe_id,
      });
      setChats(prev => [...prev, chat]);
      setShowSquadChatModal(false);
      setSquadChatName("");
      setSquadChatUrl("");
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

  if (selectedMeetup || !paramMeetupId) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: `Edit ${selectedMeetup?.title || ""} Meetup`.trim(),
            headerLeft: () => <CustomHeaderLeft onBack={handleBack} />,
          }}
        />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {isEditing && (
            <>
              <View style={[globalStyles.sectionPanel, { marginBottom: 24, zIndex: 6000, elevation: 6000 }]}>
                <View style={globalStyles.sectionHeader}>
                  <Text style={globalStyles.sectionTitle}>
                    ℹ️ Info
                  </Text>
                </View>

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

                {(!paramMeetupId) && (
                  <View style={{ zIndex: 4000, elevation: 4000, marginTop: 10 }}>
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
                )}

                <View style={{ zIndex: 3750, elevation: 3750, marginTop: 10 }}>
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

                <View style={{ zIndex: 3500, elevation: 3500, marginTop: 10 }}>
                  <Text style={styles.label}>Details</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { marginBottom: 0 }]}
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Details"
                    multiline
                    numberOfLines={4}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={[globalStyles.sectionPanel, { marginBottom: 24, zIndex: 3000, elevation: 3000 }]}>
                <View style={globalStyles.sectionHeader}>
                  <Text style={globalStyles.sectionTitle}>
                    ⚖️ Decision Details
                  </Text>
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

                <View style={{ zIndex: 2000, elevation: 2000, marginTop: 24 }}>
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
              </View>

              <View style={[globalStyles.sectionPanel, { marginBottom: 24, zIndex: 1000, elevation: 1000 }]}>
                <RecurrencePicker state={recurrenceState} onChange={setRecurrenceState} />
              </View>
            </>
          )}

          {isEditing && <FloralDivider color={colors.accent} />}

          {updating ? (
            <ActivityIndicator size="large" />
          ) : isEditing ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 0,
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
                  if (router.canGoBack()) router.back();
                }}
              >
                <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                onPress={handleSave}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (selectedMeetup as any).creator_id === member?.id ? (
            <View style={{ marginTop: -32, marginBottom: 54, zIndex: 1 }}>
              {selectedMeetup?.status === "Cancelled" ? null :
                selectedMeetup?.status === "Completed" && !selectedMeetup?.recurrence_type ? null : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <Text style={styles.primaryButtonText}>Edit Meetup</Text>
                  </TouchableOpacity>
                )}
            </View>
          ) : null}



          {/* Squad Section */}




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

          <Modal visible={showSquadEditModal} transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.background, padding: 20, borderRadius: 12 }}>
                <Text style={{ fontSize: 20, fontFamily: "Besley_700Bold", color: colors.text, marginBottom: 16 }}>
                  Edit Squad
                </Text>

                <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                  {tribeMembers.map((tm) => {
                    const mem = members.find((m) => m.id === tm.member_id);
                    if (!mem) return null;
                    const isCreator = mem.id === (selectedMeetup as any).creator_id;
                    if (isCreator) return null;
                    const isSelected = squadMemberIds.includes(mem.id!);
                    return (
                      <TouchableOpacity
                        key={mem.id}
                        onPress={() => {
                          setSquadMemberIds((prev) =>
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
                    onPress={() => setShowSquadEditModal(false)}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleUpdateSquad}
                  >
                    <Text style={styles.primaryButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <GroupChatModal
            visible={showSquadChatModal}
            onClose={() => setShowSquadChatModal(false)}
            members={[]}
            hideMemberSelection={true}
            hideNameInput={true}
            title="Squad Group Chat"
            defaultName={`${title || "Meetup"} Squad Group Chat`}
            onCreate={(_name, url) => {
              setSquadChatName(`${title || "Meetup"} Squad Group Chat`);
              setSquadChatUrl(url);
              handleSaveSquadChat(`${title || "Meetup"} Squad Group Chat`, url);
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
  itemTitle: { fontFamily: "BricolageGrotesque_500Medium", fontSize: 15, color: colors.text },
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
    backgroundColor: colors.glassCardBackground,
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
