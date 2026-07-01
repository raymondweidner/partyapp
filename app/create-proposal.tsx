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
import { DateTimePickerField } from "../lib/components/DateTimePickerField";
import { LocationPickerModal } from "../lib/components/LocationPickerModal";
import { createProposal } from "../lib/data/service";
import { showAlert, safeBack } from "../lib/util";
import { colors, globalStyles } from "../lib/theme";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";

export default function CreateProposal() {
  const router = useRouter();
  const { meetupId } = useLocalSearchParams<{ meetupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { member } = useCurrentMember();

  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleCreate = async () => {
    if (!date || !location) {
      showAlert("Validation Error", "Date and location are required.");
      return;
    }
    if (!member?.id || !meetupId) return;

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      await createProposal(
        {
          host_id: member.id,
          meetup_id: meetupId,
          date: date.toISOString(),
          location,
          status: "pending",
        } as any,
        token!,
      );
      showAlert("Success", "Proposal created!", [
        { text: "OK", onPress: () => safeBack(router, "/") },
      ]);
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Create Proposal",
          headerLeft: () => <CustomHeaderLeft />,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.formCard}>
          <Text style={styles.label}>Host</Text>
          <View style={[styles.input, styles.readOnlyInput]}>
            <Text style={styles.disabledText}>
              {member?.name || "Loading..."}
            </Text>
          </View>

          <Text style={styles.label}>Date</Text>
          <DateTimePickerField date={date} onChange={setDate} />

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

          <View style={styles.buttonContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreate}
              >
                <Text style={styles.primaryButtonText}>Create Proposal</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
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
  label: globalStyles.label,
  input: globalStyles.input,
  readOnlyInput: globalStyles.readOnlyInput,
  disabledText: {
    color: colors.textMuted,
  },
  buttonContainer: { marginTop: 8 },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
});
