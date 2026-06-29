import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { CheckboxToggle } from "../lib/components/CheckboxToggle";
import { Availability } from "../lib/data/Availability";
import {
  createAvailability,
  getAvailabilities,
  getMeetups,
  getProposals,
  updateAvailability,
} from "../lib/data/service";
import { showAlert, safeBack } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function UpdateAvailability() {
  const router = useRouter();
  const { proposalId: paramProposalId } = useLocalSearchParams<{
    proposalId: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [status, setStatus] = useState("maybe");
  const [existingAvailability, setExistingAvailability] =
    useState<Availability | null>(null);
  const [isVoted, setIsVoted] = useState(false);
  const [isVotingMethod, setIsVotingMethod] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!user || !member?.id || !paramProposalId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const aData = await getAvailabilities(token, member.id, paramProposalId);
      if (aData.length > 0) {
        setExistingAvailability(aData[0]);
        setStatus(aData[0].status || "maybe");
        setIsVoted((aData[0] as any).vote === true || false);
      }

      const proposalsData = await getProposals(token);
      const thisProposal = proposalsData.find((p) => p.id === paramProposalId);
      if (thisProposal?.meetup_id) {
        const meetupsData = await getMeetups(token);
        const meetup = meetupsData.find((m) => m.id === thisProposal.meetup_id);
        setIsVotingMethod(meetup?.decision_method === "single_choice_voting");
      }
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user, member, paramProposalId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSave = async () => {
    if (!member?.id || !paramProposalId) return;
    setSaving(true);
    try {
      const token = await user!.getIdToken();
      if (existingAvailability) {
        const updatedAvailability = {
          ...existingAvailability,
          status,
          vote: isVoted,
          id: existingAvailability.id!,
        };
        await updateAvailability(updatedAvailability, token);
      } else {
        const proposalsData = await getProposals(token);
        const thisProposal = proposalsData.find(
          (p) => p.id === paramProposalId,
        );
        if (thisProposal?.meetup_id) {
          const meetupProposals = proposalsData.filter(
            (p) => p.meetup_id === thisProposal.meetup_id,
          );
          const meetupProposalIds = meetupProposals.map((p) => p.id);

          const myAvails = await getAvailabilities(token, member.id);
          const hasOtherAvailability = myAvails.some(
            (a) => a.proposal_id && meetupProposalIds.includes(a.proposal_id),
          );

          if (hasOtherAvailability) {
            showAlert(
              "Error",
              "You have already provided an availability for this meetup.",
            );
            setSaving(false);
            return;
          }
        }

        await createAvailability(
          {
            member_id: member.id,
            proposal_id: paramProposalId,
            status,
            vote: isVoted,
          } as any,
          token,
        );
      }
      showAlert("Success", "Availability updated!", [
        { text: "OK", onPress: () => safeBack(router, "/") },
      ]);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Update Availability",
          headerLeft: () => <CustomHeaderLeft />,
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.label}>Can you make it?</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "yes" && styles.statusSelected,
              ]}
              onPress={() => setStatus("yes")}
            >
              <Text style={styles.statusText}>✅ Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "maybe" && styles.statusSelected,
              ]}
              onPress={() => setStatus("maybe")}
            >
              <Text style={styles.statusText}>🤔 Maybe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === "no" && styles.statusSelected,
              ]}
              onPress={() => setStatus("no")}
            >
              <Text style={styles.statusText}>❌ No</Text>
            </TouchableOpacity>
          </View>
          {isVotingMethod && (
            <View style={{ marginTop: 20 }}>
              <CheckboxToggle
                label="Vote for this proposal"
                isChecked={isVoted}
                onPress={() => setIsVoted(!isVoted)}
              />
            </View>
          )}
          <View style={styles.buttonContainer}>
            {saving ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSave}
              >
                <Text style={styles.primaryButtonText}>Save Availability</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...globalStyles.container, padding: 20 },
  formCard: {
    backgroundColor: colors.glassBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...globalStyles.label,
    fontSize: 18,
    textAlign: "center",
  },
  statusContainer: { flexDirection: "column", gap: 15 },
  statusButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: colors.glassBackground,
  },
  statusSelected: { borderColor: colors.primary, backgroundColor: "rgba(0, 240, 255, 0.1)" },
  statusText: { fontSize: 18, fontWeight: "bold", color: colors.text },
  buttonContainer: { marginTop: 30 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
