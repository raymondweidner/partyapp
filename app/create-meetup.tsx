import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { CheckboxToggle } from "../lib/components/CheckboxToggle";
import { DropdownSelect } from "../lib/components/DropdownSelect";
import { NumberStepper } from "../lib/components/NumberStepper";
import {
  createMeetup,
  getTribeMembersByMemberId,
  getTribes,
} from "../lib/data/service";
import { Tribe } from "../lib/data/Tribe";
import { EVENT_DEFAULTS, AVAILABLE_ICONS } from "../lib/constants";
import { showAlert, safeBack } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
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

  const [daysToDecideNum, setDaysToDecideNum] = useState("2");
  const [daysToDecideUnit, setDaysToDecideUnit] = useState("weeks");

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringNum, setRecurringNum] = useState("1");
  const [recurringUnit, setRecurringUnit] = useState("years");

  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedTribeId, setSelectedTribeId] = useState<string>(
    paramTribeId || "",
  );
  const [formLoading, setFormLoading] = useState(false);
  const [tribesLoading, setTribesLoading] = useState(false);

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

    let recurs_every_days = 0;
    if (isRecurring) {
      const rNum = parseInt(recurringNum, 10) || 0;
      let rMult = 7;
      if (recurringUnit === "weeks") rMult = 7;
      if (recurringUnit === "months") rMult = 30;
      if (recurringUnit === "years") rMult = 365;
      recurs_every_days = rNum * rMult;
    }

    setFormLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!user || !token) throw new Error("Not authenticated");

      // 'host_id' is technically a reference to Member inside Meetup Schema
      await createMeetup(
        {
          creator_id: member.id as any,
          tribe_id: selectedTribeId,
          title,
          event_type: eventType,
          icon_type: iconType,
          details,
          decision_method: decisionMethod,
          days_to_decide,
          recurs_every_days,
          created_at: new Date().toISOString(),
          status: "Planning",
        },
        token,
      );

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
