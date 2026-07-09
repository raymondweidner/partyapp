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
import { NumberStepper } from "../lib/components/NumberStepper";
import { AVAILABLE_ICONS } from "../lib/constants";
import { createPoll, getMeetups, getProposals, getMeetupEvents } from "../lib/data/service";
import { colors, globalStyles } from "../lib/theme";
import { safeBack, showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreatePoll() {
  const router = useRouter();
  const { meetupId } = useLocalSearchParams<{ meetupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [daysToPost, setDaysToPost] = useState("3");
  const [daysToVote, setDaysToVote] = useState("2");
  const [minutesToPost, setMinutesToPost] = useState(15);
  const [minutesToVote, setMinutesToVote] = useState(15);
  const [loading, setLoading] = useState(false);
  const [meetup, setMeetup] = useState<any>(null);
  const [acceptedProposal, setAcceptedProposal] = useState<any>(null);
  const [meetupEvents, setMeetupEvents] = useState<any[]>([]);
  const [iconType, setIconType] = useState("📊");

  useEffect(() => {
    if (!user || !meetupId) return;
    const fetchMeetupData = async () => {
      try {
        const token = await user.getIdToken();
        const meetups = await getMeetups(token);
        const m = meetups.find(mem => mem.id === meetupId);
        setMeetup(m || null);
        if (m) {
          const [proposalsData, eventsData] = await Promise.all([
            getProposals(token, undefined, meetupId),
            getMeetupEvents(meetupId, token),
          ]);
          const accepted = proposalsData.find(p => p.status === "accepted");
          setAcceptedProposal(accepted || null);
          setMeetupEvents(eventsData);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchMeetupData();
  }, [user, meetupId]);

  const formatMinutes = (m: number) => {
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr`;
    return `${mins} min`;
  };

  const TimeStepper = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
    <View style={stepperStyles.counterContainer}>
      <TouchableOpacity
        style={stepperStyles.counterButton}
        onPress={() => onChange(Math.max(15, value - 15))}
      >
        <Text style={stepperStyles.counterButtonText}>-</Text>
      </TouchableOpacity>
      <Text style={stepperStyles.counterValue}>{formatMinutes(value)}</Text>
      <TouchableOpacity
        style={stepperStyles.counterButtonRight}
        onPress={() => onChange(value + 15)}
      >
        <Text style={stepperStyles.counterButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleCreate = async () => {
    if (!title.trim()) {
      showAlert("Validation Error", "Poll name is required.");
      return;
    }
    if (!member?.id || !meetupId) {
      showAlert("Error", "Missing required information.");
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();

      const now = new Date();
      let entryDeadline: Date;
      let voteDeadline: Date;
      
      const isOngoing = meetup?.status === "Ongoing";
      let meetupEventId = undefined;

      if (isOngoing) {
        entryDeadline = new Date(now.getTime() + minutesToPost * 60 * 1000);
        voteDeadline = new Date(entryDeadline.getTime() + minutesToVote * 60 * 1000);
        
        const currentEvent = meetupEvents.length > 0
          ? [...meetupEvents].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]
          : null;
        if (currentEvent) {
          meetupEventId = currentEvent.id;
        }
        
        if (acceptedProposal && acceptedProposal.end_at) {
          const meetupEnd = new Date(acceptedProposal.end_at);
          if (voteDeadline > meetupEnd) {
            showAlert("Validation Error", "The poll cannot be scheduled to end after the meetup is completed.");
            setLoading(false);
            return;
          }
        }
      } else {
        entryDeadline = new Date(now.getTime() + parseInt(daysToPost, 10) * 24 * 60 * 60 * 1000);
        voteDeadline = new Date(entryDeadline.getTime() + parseInt(daysToVote, 10) * 24 * 60 * 60 * 1000);
      }

      await createPoll(
        {
          creator_id: member.id,
          meetup_id: meetupId,
          title: title.trim(),
          details: details.trim(),
          status: "Posting",
          entry_deadline: entryDeadline.toISOString(),
          vote_deadline: voteDeadline.toISOString(),
          icon_type: iconType,
          meetup_event_id: meetupEventId,
        },
        token!
      );

      safeBack(router, "/");
    } catch (error) {
      console.error("Failed to create poll:", error);
      showAlert("Error", "Failed to create poll. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Create Poll",
          headerLeft: () => <CustomHeaderLeft />,
          headerStyle: globalStyles.headerStyle,
          headerTitleStyle: globalStyles.headerTitleStyle,
          headerTintColor: colors.primary,
        }}
      />
      <ScrollView contentContainerStyle={globalStyles.contentContainer}>
        <View style={globalStyles.formGroup}>
          <Text style={globalStyles.label}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 15, paddingHorizontal: 5, paddingVertical: 10 }}>
              {AVAILABLE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setIconType(icon)}
                  style={{
                    padding: 10,
                    borderRadius: 25,
                    backgroundColor: iconType === icon ? colors.accent : colors.surface,
                    borderWidth: 2,
                    borderColor: iconType === icon ? colors.primary : "transparent",
                    transform: [{ scale: iconType === icon ? 1.1 : 1 }],
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        <View style={globalStyles.formGroup}>
          <Text style={globalStyles.label}>Poll Name</Text>
          <TextInput
            style={globalStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Summer Trip Destination"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={globalStyles.formGroup}>
          <Text style={globalStyles.label}>Details (Optional)</Text>
          <TextInput
            style={[globalStyles.input, globalStyles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder="Add some details..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {meetup?.status === "Ongoing" ? (
          <>
            <View style={globalStyles.formGroup}>
              <Text style={globalStyles.label}>Time to Post</Text>
              <Text style={styles.helperText}>How long can members add entries to this poll?</Text>
              <View style={{ height: 48, flexDirection: "row" }}>
                <TimeStepper value={minutesToPost} onChange={setMinutesToPost} />
              </View>
            </View>

            <View style={globalStyles.formGroup}>
              <Text style={globalStyles.label}>Time to Vote</Text>
              <Text style={styles.helperText}>How long can members vote after posting ends?</Text>
              <View style={{ height: 48, flexDirection: "row" }}>
                <TimeStepper value={minutesToVote} onChange={setMinutesToVote} />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={globalStyles.formGroup}>
              <Text style={globalStyles.label}>Days to Post</Text>
              <Text style={styles.helperText}>How long can members add entries to this poll?</Text>
              <View style={{ height: 48, flexDirection: "row" }}>
                <NumberStepper value={daysToPost} onChange={setDaysToPost} />
              </View>
            </View>

            <View style={globalStyles.formGroup}>
              <Text style={globalStyles.label}>Days to Vote</Text>
              <Text style={styles.helperText}>How long can members vote after posting ends?</Text>
              <View style={{ height: 48, flexDirection: "row" }}>
                <NumberStepper value={daysToVote} onChange={setDaysToVote} />
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[globalStyles.primaryButton, loading && { opacity: 0.7 }, { marginTop: 20 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={globalStyles.primaryButtonText}>Create Poll</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    marginTop: -4,
  },
});

const stepperStyles = StyleSheet.create({
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flex: 1,
    backgroundColor: colors.glassBackground,
    overflow: "hidden",
  },
  counterButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  counterButtonRight: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  counterButtonText: { fontSize: 18, fontWeight: "bold", color: colors.text },
  counterValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
});
