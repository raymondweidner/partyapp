import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { HelpRegistry } from "../lib/data/HelpRegistry";
import { Meetup } from "../lib/data/Meetup";
import { MeetupEvent } from "../lib/data/MeetupEvent";
import { Member } from "../lib/data/Member";
import { Poll } from "../lib/data/Poll";
import { PollEntry } from "../lib/data/PollEntry";
import { PollVote } from "../lib/data/PollVote";
import {
  getHelpRegistries,
  getMeetupEvents,
  getMeetups,
  getMembers,
  getPollEntries,
  getPolls,
  getPollVotes,
  getRegistryItems,
  getSquads,
} from "../lib/data/service";
import { Squad } from "../lib/data/Squad";
import { colors, globalStyles } from "../lib/theme";
import { safeBack } from "../lib/util";
import { FloralDivider } from "../lib/components/FloralDivider";
import { useCurrentMember } from "./_layout";

export default function EventDetails() {
  const router = useRouter();
  const { id: eventId, meetupId } = useLocalSearchParams<{ id: string; meetupId: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [meetupEvent, setMeetupEvent] = useState<MeetupEvent | null>(null);
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pollEntries, setPollEntries] = useState<PollEntry[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [pollTab, setPollTab] = useState("complete");
  const [registries, setRegistries] = useState<(HelpRegistry & { incompleteCount: number })[]>([]);
  const [registryTab, setRegistryTab] = useState<"Please Help!" | "Complete">("Please Help!");
  const [squads, setSquads] = useState<Squad[]>([]);
  const { member } = useCurrentMember();

  useEffect(() => {
    if (!user || !eventId || !meetupId) return;
    const fetchData = async () => {
      try {
        const token = await user.getIdToken();
        const [eventsData, meetupsData, pollsData, membersData, squadsData] = await Promise.all([
          getMeetupEvents(token, meetupId),
          getMeetups(token),
          getPolls(token, meetupId),
          getMembers(token),
          getSquads(token, meetupId as string),
        ]);

        const event = eventsData.find(e => e.id === eventId);
        setMeetupEvent(event || null);
        setMeetup(meetupsData.find(m => m.id === meetupId) || null);
        setMembers(membersData);
        setSquads(squadsData);

        const eventPolls = pollsData.filter(p => p.meetup_event_id === eventId);
        setPolls(eventPolls);

        const entryPromises = eventPolls.map(p => getPollEntries(token, p.id!));
        const votePromises = eventPolls.map(p => getPollVotes(token, p.id!));
        const [entriesResults, votesResults] = await Promise.all([
          Promise.all(entryPromises),
          Promise.all(votePromises)
        ]);
        setPollEntries(entriesResults.flat());
        setPollVotes(votesResults.flat());

        const regs = await getHelpRegistries(token, undefined, eventId);
        const regsWithCounts = await Promise.all(regs.map(async (r) => {
          if (!r.id) return { ...r, incompleteCount: 0 };
          const rItems = await getRegistryItems(token, r.id);
          const incCount = rItems.filter(i => i.status !== 'Complete' && i.status !== 'Cancelled').length;
          return { ...r, incompleteCount: incCount };
        }));
        setRegistries(regsWithCounts);

      } catch (err) {
        console.error("Failed to fetch event details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, eventId, meetupId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!meetupEvent) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, color: colors.textSecondary }}>Event not found.</Text>
      </View>
    );
  }

  const pStartDate = new Date(meetupEvent.start_at);
  const pEndDate = new Date(meetupEvent.end_at);
  const hasValidDate = !isNaN(pStartDate.getTime()) && !isNaN(pEndDate.getTime());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <TouchableOpacity style={globalStyles.backButton} onPress={() => safeBack(router)}>
          <Text style={globalStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 24, marginTop: 12 }}>
          <Text style={{ fontSize: 40, fontFamily: "Lobster_400Regular", color: colors.text }}>
            {meetup?.title || "Meetup Event"}
          </Text>
          <FloralDivider color={colors.accent} />
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 4 }}>
            Past Event Details
          </Text>
        </View>

        <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 24 }}>
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
            <Text style={globalStyles.attributeValuePrimary}>
              {meetupEvent.location || "TBD"}
            </Text>
          </View>

          {meetupEvent.note && (
            <View style={{ marginBottom: 12 }}>
              <Text style={globalStyles.attributeName}>Notes</Text>
              <Text style={globalStyles.attributeValue}>{meetupEvent.note}</Text>
            </View>
          )}

          {meetupEvent.root_folder_id && (
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity onPress={() => Linking.openURL(`https://drive.google.com/drive/folders/${meetupEvent.root_folder_id}`)}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Go To Photo Album</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(() => {
          const isSquadMember = squads.some(c => c.member_id === member?.id) || meetup?.creator_id === member?.id;

          return (
            <View style={globalStyles.sectionPanel}>
              {meetupEvent?.root_folder_id && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={styles.sectionTitle}>Event Polls</Text>
                    {isSquadMember && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => router.push({ pathname: "/write-poll", params: { meetupId: meetupId } } as any)}
                      >
                        <Text style={styles.addButtonText}>+ Add Poll</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                    <TouchableOpacity
                      onPress={() => setPollTab("posting")}
                      style={[styles.tab, pollTab === "posting" && styles.activeTab]}
                    >
                      <Text style={[styles.tabText, pollTab === "posting" && styles.activeTabText]}>Posting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPollTab("voting")}
                      style={[styles.tab, pollTab === "voting" && styles.activeTab]}
                    >
                      <Text style={[styles.tabText, pollTab === "voting" && styles.activeTabText]}>Voting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPollTab("complete")}
                      style={[styles.tab, pollTab === "complete" && styles.activeTab]}
                    >
                      <Text style={[styles.tabText, pollTab === "complete" && styles.activeTabText]}>Complete</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <View style={{ gap: 12 }}>
                    {polls
                      .filter((p) => (p.status || "Posting").toLowerCase() === pollTab)
                      .map((poll) => {
                        const entryCount = pollEntries.filter((e) => e.poll_id === poll.id).length;
                        const voteCount = pollVotes.filter((v) => v.poll_id === poll.id).length;

                        return (
                          <TouchableOpacity
                            key={poll.id}
                            style={styles.proposalItem}
                            onPress={() => router.push(`/read-poll?id=${poll.id}` as any)}
                          >
                            <Text style={{ fontSize: 18, fontFamily: "Nunito_700Bold", color: colors.text, marginBottom: 4 }}>
                              {poll.icon_type ? `${poll.icon_type} ` : ""}{poll.title}
                            </Text>
                            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                              {entryCount} {entryCount === 1 ? "entry" : "entries"}
                              {pollTab !== "posting" && ` • ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    {polls.filter((p) => (p.status || "Posting").toLowerCase() === pollTab).length === 0 && (
                      <Text style={{ textAlign: "center", color: colors.textMuted, fontStyle: "italic", marginTop: 12, marginBottom: 12 }}>No polls found.</Text>
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })()}

        {(() => {
          const isSquadMember = squads.some(c => c.member_id === member?.id) || meetup?.creator_id === member?.id;
          const visibleRegistries = registries.filter(r => !r.is_squad || isSquadMember);

          return (
            <View style={globalStyles.sectionPanel}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={styles.sectionTitle}>Help Registries</Text>
                {isSquadMember && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => router.push({ pathname: "/write-registry", params: { meetupEventId: eventId } })}
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
                    onPress={() => router.push({ pathname: "/read-registry", params: { id: reg.id } })}
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


        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: "Nunito_600SemiBold",
  },
  activeTabText: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
  },
  proposalItem: {
    padding: 15,
    backgroundColor: colors.glassBackground,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: { fontSize: 22, fontFamily: "PaytoneOne_400Regular", color: colors.text, textAlign: "center", marginBottom: 15 },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  tabContainer: { flexDirection: "row", gap: 10, marginVertical: 15 },
  registryCard: { backgroundColor: colors.cardBackground, padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
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
