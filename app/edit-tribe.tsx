import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Button,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../lib/auth";
import { Fam } from "../lib/data/Fam";
import { Meetup } from "../lib/data/Meetup";
import { Tribe } from "../lib/data/Tribe";
import { TribeFam } from "../lib/data/TribeFam";
import {
    createTribeFam,
    deleteTribeFam,
    getFams,
    getMeetups,
    getTribeFams,
    getTribes,
    updateTribe,
} from "../lib/data/service";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "./_layout";

export default function EditTribe() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTribe, setSelectedTribe] = useState<Tribe | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fams state
  const [allFams, setAllFams] = useState<Fam[]>([]);
  const [tribeFams, setTribeFams] = useState<TribeFam[]>([]);
  const [selectedFamIds, setSelectedFamIds] = useState<string[]>([]);
  const [famsLoading, setFamsLoading] = useState(false);

  // Meetups state
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [meetupStatus, setMeetupStatus] = useState<string>("proposed");
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchTribes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await getTribes(token);
      setTribes(data);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchFamsAndTribeFams = useCallback(
    async (tribeId: string) => {
      if (!user) return;
      setFamsLoading(true);
      try {
        const token = await user.getIdToken();
        const [famsData, tribeFamsData, meetupsData] = await Promise.all([
          getFams(token),
          getTribeFams(tribeId, token),
          getMeetups(token, tribeId),
        ]);
        setAllFams(famsData);
        setTribeFams(tribeFamsData);
        setSelectedFamIds(tribeFamsData.map((tf) => tf.fam_id));
        setMeetups(meetupsData);
      } catch (error: any) {
        showAlert("Error", error.message);
      } finally {
        setFamsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchTribes();
  }, [fetchTribes]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectTribe = (tribe: Tribe) => {
    setSelectedTribe(tribe);
    setName(tribe.name || "");
    setDescription(tribe.description || "");
    if (tribe.id) {
      fetchFamsAndTribeFams(tribe.id);
    }
  };

  const toggleFamSelection = (famId: string) => {
    setSelectedFamIds((prev) =>
      prev.includes(famId)
        ? prev.filter((id) => id !== famId)
        : [...prev, famId],
    );
  };

  const handleUpdate = async () => {
    if (!selectedTribe || !user) return;

    if (!name || !description) {
      showAlert("Validation Error", "Name and description are required.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      await updateTribe(
        { ...selectedTribe, name, description } as Tribe & { id: string },
        token,
      );

      const originalFamIds = tribeFams.map((tf) => tf.fam_id);
      const toAdd = selectedFamIds.filter((id) => !originalFamIds.includes(id));
      const toRemove = tribeFams.filter(
        (tf) => !selectedFamIds.includes(tf.fam_id),
      );

      const promises: Promise<any>[] = [];
      toAdd.forEach((famId) => {
        promises.push(
          createTribeFam({ tribe_id: selectedTribe.id!, fam_id: famId }, token),
        );
      });
      toRemove.forEach((tf) => {
        promises.push(
          deleteTribeFam(tf.id, selectedTribe.id!, tf.fam_id, token),
        );
      });

      await Promise.all(promises);

      showAlert("Success", "Tribe updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setSelectedTribe(null);
            fetchTribes();
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while updating the tribe.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderTribeItem = ({ item }: { item: Tribe }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => handleSelectTribe(item)}
    >
      <Text style={styles.itemTitle}>{item.name || "Unnamed Tribe"}</Text>
      <Text style={styles.itemSubtitle}>
        {item.description || "No description provided"}
      </Text>
    </TouchableOpacity>
  );

  const renderCurrentFamItem = ({ item }: { item: Fam }) => (
    <View style={styles.famItem}>
      <View style={styles.famInfo}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSubtitle}>{item.email}</Text>
      </View>
    </View>
  );

  const renderModalFamItem = ({ item }: { item: Fam }) => {
    const isSelected = selectedFamIds.includes(item.id!);

    return (
      <TouchableOpacity
        style={[styles.famItem, isSelected && styles.famItemSelected]}
        onPress={() => item.id && toggleFamSelection(item.id)}
      >
        <View style={styles.famInfo}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{item.email}</Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const sortedFams = [...allFams].sort((a, b) => {
    const aSelected = selectedFamIds.includes(a.id!);
    const bSelected = selectedFamIds.includes(b.id!);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  const currentFams = sortedFams.filter((fam) =>
    selectedFamIds.includes(fam.id!),
  );

  const filteredMeetups = meetups.filter(
    (m) => (m.status || "proposed") === meetupStatus,
  );

  if (selectedTribe) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Edit Tribe Details",
            headerLeft: () => (
              <CustomHeaderLeft onBack={() => setSelectedTribe(null)} />
            ),
          }}
        />

        <FlatList
          ListHeaderComponent={
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tribe Name"
                placeholderTextColor="#a0a0a0"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                multiline
                numberOfLines={4}
                placeholderTextColor="#a0a0a0"
              />

              <View style={styles.sectionHeaderRow}>
                <Text
                  style={[styles.label, { marginTop: 30, marginBottom: 10 }]}
                >
                  Tribe Fams
                </Text>
                <TouchableOpacity
                  onPress={() => setIsModalVisible(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {famsLoading && <ActivityIndicator size="small" />}
            </>
          }
          data={currentFams}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderCurrentFamItem}
          ListFooterComponent={
            <View>
              <View style={styles.meetupsContainer}>
                <View style={styles.meetupsHeader}>
                  <Text
                    style={[styles.label, { marginTop: 0, marginBottom: 0 }]}
                  >
                    Tribe Meetups
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() =>
                      router.push({
                        pathname: "/create-meetup",
                        params: { tribeId: selectedTribe.id },
                      })
                    }
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.statusControl}>
                  {["proposed", "pending", "complete"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        meetupStatus === status && styles.statusButtonSelected,
                      ]}
                      onPress={() => setMeetupStatus(status)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          meetupStatus === status &&
                            styles.statusButtonTextSelected,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filteredMeetups.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No {meetupStatus} meetups.
                  </Text>
                ) : (
                  filteredMeetups.map((meetup) => (
                    <TouchableOpacity
                      key={meetup.id}
                      style={styles.meetupItem}
                      onPress={() =>
                        router.push({
                          pathname: "/edit-meetup",
                          params: { id: meetup.id, tribeId: selectedTribe.id },
                        })
                      }
                    >
                      <Text style={styles.itemTitle}>
                        {meetup.title || "Unnamed Meetup"}
                      </Text>
                      <Text style={styles.itemSubtitle}>{meetup.details}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <View
                style={[
                  styles.buttonContainer,
                  { marginBottom: 20, marginTop: 30 },
                ]}
              >
                {updating ? (
                  <ActivityIndicator size="large" />
                ) : (
                  <Button title="Update Tribe" onPress={handleUpdate} />
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            !famsLoading ? (
              <Text style={styles.emptyText}>No fams in this tribe.</Text>
            ) : null
          }
        />

        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manage Membership</Text>
              {famsLoading ? (
                <ActivityIndicator size="large" />
              ) : (
                <FlatList
                  data={sortedFams}
                  keyExtractor={(item) => item.id!}
                  renderItem={renderModalFamItem}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No fams available.</Text>
                  }
                />
              )}
              <View style={styles.modalButtons}>
                <Button
                  title="Update Membership"
                  onPress={() => setIsModalVisible(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Tribe to Edit",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tribes}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderTribeItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tribes found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  item: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  itemTitle: { fontSize: 18, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  buttonContainer: { marginTop: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
  famItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
  },
  famInfo: { flex: 1 },
  famItemSelected: {
    backgroundColor: "#e6f7ff",
  },
  checkmark: {
    fontSize: 20,
    color: "#007bff",
    fontWeight: "bold",
  },
  statusControl: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
    marginBottom: 10,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    backgroundColor: "#f9f9f9",
  },
  statusButtonSelected: {
    borderColor: "#007bff",
    backgroundColor: "#e6f7ff",
  },
  statusButtonText: {
    fontSize: 14,
    color: "#333",
  },
  statusButtonTextSelected: {
    color: "#007bff",
    fontWeight: "bold",
  },
  meetupsContainer: { marginTop: 30 },
  meetupsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#007bff",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "bold",
  },
  meetupItem: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editButton: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#e6f7ff",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#007bff",
  },
  editButtonText: { color: "#007bff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtons: {
    marginTop: 20,
  },
});
