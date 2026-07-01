import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from "react-native";
import { useAuth } from "../lib/auth";
import { DateTimePickerField } from "../lib/components/DateTimePickerField";
import { Availability } from "../lib/data/Availability";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Proposal } from "../lib/data/Proposal";
import { LocationPickerModal } from "../lib/components/LocationPickerModal";
import {
  getAvailabilities,
  getMeetups,
  getMembers,
  getProposals,
  getTribeMembers,
  updateProposal,
} from "../lib/data/service";
import { showAlert, openMapUrl } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { CustomHeaderLeft, useCurrentMember, useInfoModal } from "./_layout";

export default function EditProposal() {
  const router = useRouter();
  const { id: paramProposalId, meetupId: paramMeetupId } =
    useLocalSearchParams<{
      id?: string;
      meetupId?: string;
    }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();
  const { showInfoModal } = useInfoModal();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<Member[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!user || !paramProposalId || !paramMeetupId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [proposalsData, meetupsData, membersData] = await Promise.all([
        getProposals(token, undefined, paramMeetupId),
        getMeetups(token),
        getMembers(token),
      ]);

      const found = proposalsData.find((p) => p.id === paramProposalId);
      if (found) {
        setProposal(found);
        setDate(
          (found as any).date ? new Date((found as any).date) : new Date(),
        );
        setLocation((found as any).location || "");
      }

      setMembers(membersData);

      const foundMeetup = meetupsData.find((m) => m.id === paramMeetupId);
      setMeetup(foundMeetup || null);
      if (foundMeetup?.tribe_id) {
        const [tMembers, aData] = await Promise.all([
          getTribeMembers(foundMeetup.tribe_id, token),
          getAvailabilities(token, undefined, paramProposalId),
        ]);

        const tm = tMembers
          .map((tm) => membersData.find((m) => m.id === tm.member_id))
          .filter(Boolean) as Member[];
        setTribeMembers(tm);
        setAvailabilities(aData);
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramProposalId, paramMeetupId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetails();
    }, [fetchDetails]),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("refreshView", () => {
      fetchDetails();
    });
    return () => sub.remove();
  }, [fetchDetails]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleUpdate = async () => {
    if (!proposal || !user) return;

    if (!date || !location) {
      showAlert("Validation Error", "Date and location are required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateProposal(
        {
          ...proposal,
          date: date.toISOString(),
          location,
        } as any,
        token,
      );

      showAlert("Success", "Proposal updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setIsEditing(false);
            fetchDetails();
          },
        },
      ]);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (proposal) {
      setDate(
        (proposal as any).date ? new Date((proposal as any).date) : new Date(),
      );
      setLocation((proposal as any).location || "");
    }
    setIsEditing(false);
  };

  if (!proposal) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const host = members.find((m) => m.id === proposal.host_id);
  const isHost = member?.id === proposal.host_id;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Proposal Details",
          headerLeft: () => <CustomHeaderLeft />,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {isEditing ? (
          <>
            <Text style={styles.label}>Host</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={[styles.itemTitle, styles.disabledText]}>
                {host?.name || "Unknown"}
              </Text>
            </View>

            <Text style={styles.label}>Date</Text>
            <DateTimePickerField
              date={date}
              onChange={setDate}
            />

            <Text style={styles.label}>Location</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setLocationModalVisible(true)}
            >
              <Text style={{ color: location ? colors.text : colors.textMuted }}>
                {location || "Select Location"}
              </Text>
            </TouchableOpacity>
            <LocationPickerModal
              visible={locationModalVisible}
              onClose={() => setLocationModalVisible(false)}
              onSelect={setLocation}
              initialValue={location}
              mapType={member?.map_type}
            />
          </>
        ) : (
          <View style={{ padding: 24, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 16, alignItems: "center", backgroundColor: colors.surface, marginTop: 16 }}>
            <View style={{ marginBottom: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 2 }}>When</Text>
              <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.text, fontSize: 16 }}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {date.toLocaleDateString()}
              </Text>
            </View>

            <View style={{ marginBottom: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 2 }}>Where</Text>
              <TouchableOpacity
                onPress={() => {
                  if (location) {
                    showAlert(
                      "Open in Maps",
                      "Would you like to open this location in your Maps app?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open", onPress: () => openMapUrl(location, member?.map_type) }
                      ]
                    );
                  }
                }}
              >
                <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.primary, fontSize: 16 }}>
                  {location || "TBD"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand_700Bold", color: "#999999", fontSize: 12, textTransform: "uppercase", marginBottom: 2 }}>Who</Text>
              <Text style={{ fontFamily: "Nunito_600SemiBold", color: colors.text, fontSize: 16 }}>
                {host?.name || "Unknown"}
              </Text>
            </View>
          </View>
        )}

        <View style={{ marginTop: 20 }}>
          {updating ? (
            <ActivityIndicator size="large" />
          ) : isEditing ? (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
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
                onPress={handleCancel}
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
          ) : isHost ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.primaryButtonText}>Edit Proposal</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ marginTop: 30 }}>
          <Text
            style={[
              styles.label,
              { fontSize: 18, marginBottom: 15, marginTop: 0 },
            ]}
          >
            Availability
          </Text>
          {tribeMembers.map((m) => {
            const avail = availabilities.find((a) => a.member_id === m.id);
            const status = avail ? avail.status : "unknown";
            let icon = "❔";
            if (status === "yes") icon = "✅";
            else if (status === "no") icon = "❌";
            else if (status === "maybe") icon = "🤔";

            const isVotingMethod =
              meetup?.decision_method === "single_choice_voting";
            let tooltipText = "Unknown";
            if (status === "yes") tooltipText = "Available";
            else if (status === "no") tooltipText = "Unavailable";
            else if (status === "maybe") tooltipText = "Unsure";
            if (isVotingMethod && (avail as any)?.vote) {
              icon += " 🗳️";
              tooltipText += " (Voted)";
            }

            return (
              <View key={m.id} style={styles.availabilityItem}>
                <Text style={styles.itemTitle}>{m.name}</Text>
                <TouchableOpacity
                  onPress={() =>
                    showInfoModal("Availability Status", tooltipText)
                  }
                >
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: "rgba(157, 78, 221, 0.2)", shadowOpacity: 0, elevation: 0 },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/update-availability",
                  params: { proposalId: paramProposalId },
                })
              }
            >
              <Text style={[styles.primaryButtonText, { color: colors.primary }]}>
                Update Availability
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...globalStyles.container, padding: 20 },
  label: globalStyles.label,
  input: globalStyles.input,
  readOnlyInput: globalStyles.readOnlyInput,
  disabledText: { color: colors.textMuted },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  availabilityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
