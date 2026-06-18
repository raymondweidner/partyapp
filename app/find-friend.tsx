import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { Member } from "../lib/data/Member";
import {
    createMemberContact,
    getMemberContacts,
    getMembers,
    GroupedMemberContacts,
} from "../lib/data/service";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember, useInfoModal } from "./_layout";

export default function FindFriend() {
  const router = useRouter();
  const { user } = useAuth();
  const { member: currentMember } = useCurrentMember();
  const { showInfoModal } = useInfoModal();

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [memberContacts, setMemberContacts] =
    useState<GroupedMemberContacts | null>(null);

  const fetchMemberContacts = useCallback(async () => {
    if (!user || !currentMember?.id) return;
    try {
      const token = await user.getIdToken();
      const contacts = await getMemberContacts(token, currentMember.id);
      setMemberContacts(contacts);
    } catch (error) {
      console.error("Failed to fetch member contacts", error);
    }
  }, [user, currentMember]);

  useEffect(() => {
    fetchMemberContacts();
  }, [fetchMemberContacts]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showAlert("Info", "Please enter a name or email to search.");
      return;
    }
    setLoading(true);
    try {
      const token = await user!.getIdToken();
      const allMembers = await getMembers(token);
      const isEmail = validateEmail(searchTerm);

      const results = allMembers.filter((member) => {
        if (member.id === currentMember?.id) return false; // Exclude self
        if (isEmail) {
          return member.email?.toLowerCase() === searchTerm.toLowerCase();
        } else {
          return member.name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
      });

      setSearchResults(results);
      setIsModalVisible(true);
    } catch (error: any) {
      showAlert("Search Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = async (selectedMember: Member) => {
    console.log("handleSelectMember triggered for:", selectedMember.name);

    if (!currentMember?.id || !selectedMember.id) {
      console.log("Missing member information", {
        currentMember,
        selectedMember,
      });
      showAlert("Error", "Missing member information.");
      return;
    }

    let contacts = memberContacts;
    if (!contacts) {
      console.log("Contacts missing, fetching now...");
      try {
        const token = await user!.getIdToken();
        contacts = await getMemberContacts(token, currentMember.id);
        setMemberContacts(contacts);
      } catch (error) {
        console.error("Could not fetch member contacts.", error);
        showAlert("Error", "Could not fetch member contacts.");
        return;
      }
    }

    const {
      acceptedSources,
      acceptedSubjects,
      invitedSources,
      invitedSubjects,
    } = contacts;

    console.log("Checking existing relationships...");

    if (
      acceptedSources.some((c) => c.subject_id === selectedMember.id) ||
      acceptedSubjects.some((c) => c.source_id === selectedMember.id)
    ) {
      console.log("Already connected.");
      showAlert("Already Connected", "You are already part of the same Fam.");
      return;
    }
    if (invitedSources.some((c) => c.subject_id === selectedMember.id)) {
      console.log("Invitation already sent.");
      showAlert(
        "Invitation Sent",
        "You have already sent an invitation to this member.",
      );
      return;
    }
    if (invitedSubjects.some((c) => c.source_id === selectedMember.id)) {
      console.log("Invitation pending.");
      showAlert(
        "Invitation Pending",
        "This member has already sent you an invitation. Check your incoming invites.",
      );
      return;
    }

    console.log("Prompting for invite confirmation...");

    setIsModalVisible(false);

    const confirmInvite = async () => {
      console.log("Invite confirmed, sending request...");
      try {
        const token = await user!.getIdToken();
        await createMemberContact(
          {
            source_id: currentMember.id!,
            subject_id: selectedMember.id!,
            status: "invited",
          },
          token,
        );
        showAlert("Success", `Invitation sent to ${selectedMember.name}!`);
        fetchMemberContacts();
      } catch (error: any) {
        console.error("Invite Error:", error);
        showAlert("Invite Error", error.message);
      }
    };

    setTimeout(() => {
      if (Platform.OS === "web") {
        if (window.confirm(`Invite ${selectedMember.name} into your fam?`)) {
          confirmInvite();
        } else {
          setIsModalVisible(true);
        }
      } else {
        showAlert(
          "Invite to Fam",
          `Invite ${selectedMember.name} into your fam?`,
          [
            {
              text: "No",
              onPress: () => setIsModalVisible(true),
              style: "cancel",
            },
            { text: "Yes", onPress: confirmInvite },
          ],
        );
      }
    }, 100);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Find My Fam!",
          headerLeft: () => <CustomHeaderLeft />,
        }}
      />
      <Text style={styles.label}>Search by Name or Email</Text>
      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="e.g. Jane Doe or jane@example.com"
          autoCapitalize="none"
          placeholderTextColor="#a0a0a0"
        />
        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#007bff" />
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSearch}
            >
              <Text style={styles.primaryButtonText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Search Results</Text>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id!}
                renderItem={({ item }) => {
                  const isPending = item.status === "invited";
                  return (
                    <TouchableOpacity
                      style={styles.resultItem}
                      onPress={() => handleSelectMember(item)}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text style={styles.resultName}>{item.name}</Text>
                        {isPending && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              showInfoModal("Status", "Pending App Join");
                            }}
                          >
                            <Text style={styles.resultName}> ✉️</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.resultEmail}>{item.email}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <Text style={styles.emptyText}>No members found.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F7F9FC" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#333" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  input: {
    height: 52,
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: { marginTop: 16 },
  primaryButton: {
    backgroundColor: "#007bff",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  resultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  resultName: { fontSize: 16, fontWeight: "bold" },
  resultEmail: { fontSize: 14, color: "#666" },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
});
