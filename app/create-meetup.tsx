import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../lib/auth";
import { CheckboxToggle } from "../lib/components/CheckboxToggle";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { GroupChatModal } from "../lib/components/GroupChatModal";
import { NumberStepper } from "../lib/components/NumberStepper";
import { RecurrencePicker, buildRecurrencePayload, defaultRecurrenceState } from "../lib/components/RecurrencePicker";
import { AVAILABLE_ICONS, EVENT_DEFAULTS } from "../lib/constants";
import { Member } from "../lib/data/Member";
import {
  createChat,
  createMeetup,
  createTribalCouncil,
  getMembers,
  getTribeMembers,
  getTribeMembersByMemberId,
  getTribes
} from "../lib/data/service";
import { Tribe } from "../lib/data/Tribe";
import { TribeMember } from "../lib/data/TribeMember";
import { colors, globalStyles } from "../lib/theme";
import { safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreateMeetup() {
  const router = useRouter();
  const { tribeId: paramTribeId } = useLocalSearchParams<{
    tribeId?: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  // Form State
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [iconType, setIconType] = useState("🎉");
  const [details, setDetails] = useState("");

  const [decisionMethod, setDecisionMethod] = useState("most_available");
  const [leaderTitleSelect, setLeaderTitleSelect] = useState("Tribal Chieftain");
  const [leaderTitleCustom, setLeaderTitleCustom] = useState("");

  const [daysToDecideNum, setDaysToDecideNum] = useState("2");
  const [daysToDecideUnit, setDaysToDecideUnit] = useState("weeks");

  const [recurrenceState, setRecurrenceState] = useState(defaultRecurrenceState);

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string>(
    paramTribeId || "",
  );
  const [formLoading, setFormLoading] = useState(false);
  const [tribesLoading, setTribesLoading] = useState(false);

  // Tribal Council State
  const [members, setMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<TribeMember[]>([]);
  const [councilMemberIds, setCouncilMemberIds] = useState<string[]>([]);
  const [councilChatName, setCouncilChatName] = useState("");
  const [councilChatUrl, setCouncilChatUrl] = useState("");
  const [showCouncilChatModal, setShowCouncilChatModal] = useState(false);

  useEffect(() => {
    if (member?.id && councilMemberIds.length === 0) {
      setCouncilMemberIds([member.id]);
    }
  }, [member?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !member?.id) return;
    const fetchTribesList = async () => {
      setTribesLoading(true);
      try {
        const token = await user.getIdToken();
        if (paramTribeId) {
          const tribesData = await getTribes(token);
          const selected = tribesData.find((t) => t.id === paramTribeId);
          setTribes(selected ? [selected] : []);
        } else {
          const [tribesData, tribeMembersData] = await Promise.all([
            getTribes(token),
            getTribeMembersByMemberId(member.id!, token),
          ]);
          const myTribeIds = tribeMembersData.map((tm) => tm.tribe_id);
          const myTribes = tribesData.filter(
            (t) => t.id && myTribeIds.includes(t.id),
          );
          setTribes(myTribes);
          if (myTribes.length > 0 && !selectedTribeId) {
            setSelectedTribeId((prev) => prev || myTribes[0].id!);
          }
        }
      } catch (error: any) {
        showAlert("Error", "Could not fetch tribes: " + error.message);
      } finally {
        setTribesLoading(false);
      }
    };
    fetchTribesList();
  }, [user, member, paramTribeId]);

  useEffect(() => {
    if (!user || !selectedTribeId) {
      setTribeMembers([]);
      setMembers([]);
      return;
    }
    const fetchTribeCouncilCandidates = async () => {
      try {
        const token = await user.getIdToken();
        const [mems, tMems] = await Promise.all([
          getMembers(token),
          getTribeMembers(selectedTribeId, token)
        ]);
        setMembers(mems);
        setTribeMembers(tMems);
      } catch (e: any) {
        console.error("Failed to fetch tribe members for council selection", e);
      }
    };
    fetchTribeCouncilCandidates();
  }, [user, selectedTribeId]);

  const handleCreate = async () => {
    if (!title) {
      showAlert("Validation Error", "Title is required.");
      return;
    }

    if (!selectedTribeId) {
      showAlert("Validation Error", "Tribe selection is required.");
      return;
    }

    if (!member) {
      showAlert("Validation Error", "Member context is missing.");
      return;
    }

    const numDays = parseInt(daysToDecideNum, 10) || 0;
    let multiplier = 1;
    if (daysToDecideUnit === "weeks") multiplier = 7;
    if (daysToDecideUnit === "months") multiplier = 30;
    const days_to_decide = numDays * multiplier;

    const recPayload = buildRecurrencePayload(recurrenceState);

    setFormLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!user || !token) throw new Error("Not authenticated");

      // 'host_id' is technically a reference to Member inside Meetup Schema
      const newMeetup = await createMeetup(
        {
          creator_id: member.id as any,
          tribe_id: selectedTribeId,
          title,
          event_type: eventType,
          icon_type: iconType,
          details,
          decision_method: decisionMethod,
          days_to_decide,
          leader_title: leaderTitleSelect === "Custom..." ? leaderTitleCustom : leaderTitleSelect,
          ...recPayload,
          created_at: new Date().toISOString(),
          status: "Planning",
        },
        token,
      );

      if (newMeetup.id) {
        // Create Tribal Councils
        await Promise.all(
          councilMemberIds.map((cid) =>
            createTribalCouncil(
              {
                meetup_id: newMeetup.id!,
                member_id: cid,
              },
              token
            )
          )
        );

        // Create Chat if provided
        if (councilChatName && councilChatUrl) {
          await createChat(
            {
              name: councilChatName,
              url: councilChatUrl,
              is_council: true,
              meetup_id: newMeetup.id,
              tribe_id: selectedTribeId,
            },
            token
          );
        }
      }

      showAlert("Success", "Planning Event Meetup created!", [
        { text: "OK", onPress: () => safeBack(router, "/") },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "🎉 Create Meetup",
          headerLeft: () => (
            <CustomHeaderLeft
              onBack={() => {
                if (paramTribeId) {
                  safeBack(router, "/");
                } else {
                  router.navigate("/");
                }
              }}
            />
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
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

        <View style={{ zIndex: 4000, elevation: 4000 }}>
          <Text style={styles.label}>Tribe</Text>
          {tribesLoading ? (
            <ActivityIndicator
              size="small"
              style={{ alignSelf: "flex-start" }}
            />
          ) : (
            <DropdownSelect
              value={selectedTribeId}
              options={tribes.map((t) => ({
                label: t.name || "",
                value: t.id || "",
              }))}
              onSelect={setSelectedTribeId}
              disabled={!!paramTribeId}
              placeholder={paramTribeId ? tribes[0]?.name : "Select a Tribe"}
            />
          )}
        </View>

        <View style={{ zIndex: 3000, elevation: 3000, marginTop: 24, marginBottom: 24 }}>
          <Text style={styles.label}>Your Title</Text>
          <DropdownSelect
            value={leaderTitleSelect}
            options={[
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

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={details}
          onChangeText={setDetails}
          placeholder="Event context and vibes..."
          multiline
          numberOfLines={4}
          placeholderTextColor={colors.textMuted}
        />

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

        <View
          style={{
            zIndex: 1000,
            elevation: 1000,
            marginTop: 20,
            marginBottom: 20,
          }}
        >
          <RecurrencePicker state={recurrenceState} onChange={setRecurrenceState} />
        </View>

        {/* Tribal Council Section */}
        <View style={{ marginTop: 24, marginBottom: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          <Text style={{ fontSize: 20, fontFamily: "Besley_700Bold", color: colors.text, marginBottom: 16 }}>Tribal Council</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
            Pick the tribe members who are helpers and planners for this meetup
          </Text>

          <View style={{ marginBottom: 16 }}>
            {tribeMembers.filter(tm => tm.member_id !== member?.id).length === 0 ? (
              <Text style={{ color: colors.textMuted, fontStyle: "italic" }}>
                There are no other members in this tribe to add to the council.
              </Text>
            ) : (
              tribeMembers.map((tm) => {
                const mem = members.find((m) => m.id === tm.member_id);
                if (!mem) return null;
                const isCreator = mem.id === member?.id;
                if (isCreator) return null;
                const isSelected = councilMemberIds.includes(mem.id!);
                return (
                  <CheckboxToggle
                    key={mem.id}
                    label={mem.name}
                    isChecked={isSelected}
                    onPress={() => {
                      setCouncilMemberIds((prev) =>
                        isSelected ? prev.filter((id) => id !== mem.id!) : [...prev, mem.id!]
                      );
                    }}
                  />
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowCouncilChatModal(true)}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primary }]}>
              {councilChatUrl ? "Edit Chat" : "+ Create Tribal Council Group Chat"}
            </Text>
          </TouchableOpacity>
        </View>
        {formLoading ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>
              Start the Conversation!
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Council Chat Modal */}
      <GroupChatModal
        visible={showCouncilChatModal}
        onClose={() => setShowCouncilChatModal(false)}
        members={[]}
        hideMemberSelection={true}
        hideNameInput={true}
        title="Tribal Council Group Chat"
        defaultName={`${title || "Meetup"} Tribal Council Group Chat`}
        defaultUrl={councilChatUrl}
        onCreate={(_name, url) => {
          setCouncilChatName(`${title || "Meetup"} Tribal Council Group Chat`);
          setCouncilChatUrl(url);
          setShowCouncilChatModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...globalStyles.container, padding: 20 },
  label: globalStyles.label,
  input: globalStyles.input,
  textArea: globalStyles.textArea,
  spacer: { height: 20 },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  readOnlyInput: globalStyles.readOnlyInput,
  disabledText: {
    color: colors.textMuted,
  },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
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
});
