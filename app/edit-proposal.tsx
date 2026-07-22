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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../lib/auth";
import { DateTimePickerField } from "../lib/components/DateTimePickerField";
import { LocationPickerModal } from "../lib/components/LocationPickerModal";
import { Availability } from "../lib/data/Availability";
import { HelpRegistry } from "../lib/data/HelpRegistry";
import { Meetup } from "../lib/data/Meetup";
import { Member } from "../lib/data/Member";
import { Proposal } from "../lib/data/Proposal";
import {
  getAvailabilities,
  getHelpRegistries,
  getMeetups,
  getMembers,
  getProposals,
  getRegistryItems,
  getTribeMembers,
  getTribalCouncils,
  updateProposal,
} from "../lib/data/service";
import { TribalCouncil } from "../lib/data/TribalCouncil";
import { colors, globalStyles } from "../lib/theme";
import { openMapUrl, showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function EditProposal() {
  const router = useRouter();
  const { id: paramProposalId, meetupId: paramMeetupId } =
    useLocalSearchParams<{
      id?: string;
      meetupId?: string;
    }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();


  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [location, setLocation] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [tribeMembers, setTribeMembers] = useState<Member[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [registries, setRegistries] = useState<(HelpRegistry & { incompleteCount: number })[]>([]);
  const [registryTab, setRegistryTab] = useState<"Please Help!" | "Complete">("Please Help!");
  const [tribalCouncils, setTribalCouncils] = useState<TribalCouncil[]>([]);

  const fetchDetails = useCallback(async () => {
    if (!user || !paramProposalId || !paramMeetupId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [proposalsData, meetupsData, membersData, councilsData] = await Promise.all([
        getProposals(token, undefined, paramMeetupId),
        getMeetups(token),
        getMembers(token),
        getTribalCouncils(token, paramMeetupId),
      ]);
      setTribalCouncils(councilsData);

      const found = proposalsData.find((p) => p.id === paramProposalId);
      if (found) {
        setProposal(found);
        setStartDate(
          (found as any).start_at ? new Date((found as any).start_at) : new Date(),
        );
        setEndDate(
          (found as any).end_at ? new Date((found as any).end_at) : new Date(Date.now() + 60 * 60 * 1000),
        );
        setLocation((found as any).location || "");

        const regs = await getHelpRegistries(token, paramProposalId, undefined);
        const regsWithCounts = await Promise.all(regs.map(async (r) => {
          if (!r.id) return { ...r, incompleteCount: 0 };
          const rItems = await getRegistryItems(token, r.id);
          const incCount = rItems.filter(i => i.status !== 'Complete' && i.status !== 'Cancelled').length;
          return { ...r, incompleteCount: incCount };
        }));
        setRegistries(regsWithCounts);
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

    if (!startDate || !endDate || !location) {
      showAlert("Validation Error", "Start time, end time, and location are required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateProposal(
        {
          ...proposal,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
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
      setStartDate(
        (proposal as any).start_at ? new Date((proposal as any).start_at) : new Date(),
      );
      setEndDate(
        (proposal as any).end_at ? new Date((proposal as any).end_at) : new Date(Date.now() + 60 * 60 * 1000),
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

            <Text style={styles.label}>Starting</Text>
            <DateTimePickerField
              date={startDate}
              onChange={setStartDate}
            />

            <Text style={styles.label}>Until</Text>
            <DateTimePickerField
              date={endDate}
              onChange={setEndDate}
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
              <Text style={globalStyles.attributeName}>Starting</Text>
              <Text style={globalStyles.attributeValue}>
                {startDate.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
              </Text>
            </View>

            <View style={{ marginBottom: 12, alignItems: "center" }}>
              <Text style={globalStyles.attributeName}>Until</Text>
              <Text style={globalStyles.attributeValue}>
                {endDate.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
              </Text>
            </View>

            <View style={{ marginBottom: 12, alignItems: "center" }}>
              <Text style={globalStyles.attributeName}>Where</Text>
              <TouchableOpacity
                onPress={() => {
                  if (location) {
                    showAlert(
                      "Open in Maps",
                      "Would you like to open this location in your Maps app?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open", onPress: () => openMapUrl(location) }
                      ]
                    );
                  }
                }}
              >
                <Text style={globalStyles.attributeValuePrimary}>
                  {location || "TBD"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12, alignItems: "center" }}>
              <Text style={globalStyles.attributeName}>Who</Text>
              <Text style={globalStyles.attributeValue}>
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

        <View style={globalStyles.sectionPanel}>
          <Text style={styles.sectionTitle}>
            Availability
          </Text>
          {tribeMembers.map((m) => {
            const avail = availabilities.find((a) => a.member_id === m.id);
            const status = avail ? avail.status : "unknown";
            let icon = "❔";
            if (status === "Yes") icon = "✅";
            else if (status === "No") icon = "❌";
            else if (status === "Maybe") icon = "🤔";

            const isVotingMethod =
              meetup?.decision_method === "single_choice_voting";
            let tooltipText = "Unknown";
            if (status === "Yes") tooltipText = "Available";
            else if (status === "No") tooltipText = "Unavailable";
            else if (status === "Maybe") tooltipText = "Unsure";
            if (isVotingMethod && (avail as any)?.vote) {
              icon += " 🗳️";
              tooltipText += " (Voted)";
            }

            return (
              <View key={m.id} style={styles.availabilityItem}>
                <Text style={styles.itemTitle}>{m.name}</Text>
                <View>
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                </View>
              </View>
            );
          })}

          {meetup?.status === "Planning" && (
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
          )}
        </View>

        {(() => {
          const isCouncilMember = tribalCouncils.some(c => c.member_id === member?.id) || meetup?.creator_id === member?.id;
          const visibleRegistries = registries.filter(r => !r.is_council || isCouncilMember);

          return (
            <View style={globalStyles.sectionPanel}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>Help Registries</Text>
                {isCouncilMember && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push({ pathname: "/edit-registry", params: { proposalId: paramProposalId } })}
                  >
                    <Text style={styles.addButtonText}>+ Add Registry</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.tabContainer}>
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
                <Text style={{ color: colors.textMuted, fontStyle: "italic", marginTop: 15 }}>No registries found.</Text>
              ) : (
                visibleRegistries.filter(r => registryTab === "Complete" ? r.incompleteCount === 0 : r.incompleteCount > 0).map(reg => (
                  <TouchableOpacity
                    key={reg.id}
                    style={styles.registryCard}
                    onPress={() => router.push({ pathname: "/edit-registry", params: { id: reg.id } })}
                  >
                    <Text style={styles.registryName}>{reg.name}</Text>
                    <Text style={styles.registryCount}>
                      {reg.incompleteCount} incomplete item{reg.incompleteCount !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })()}
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
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: colors.text, textAlign: "center", marginBottom: 15 },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  tabContainer: { flexDirection: "row", gap: 10, marginVertical: 15 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: "bold" },
  activeTabText: { color: "#fff" },
  registryCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  registryName: { fontSize: 16, color: colors.text, fontWeight: "bold", marginBottom: 4 },
  registryCount: { fontSize: 14, color: colors.primary },
  tabBadge: {
    backgroundColor: "colors.border",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "colors.border",
  },
  tabBadgeText: {
    color: "#ccc",
    fontSize: 12,
    fontWeight: "bold",
  },
});
