import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { createTribe, createTribeFam, getFams } from "../lib/data/service";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "./_layout";

export default function CreateTribe() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [allFams, setAllFams] = useState<Fam[]>([]);
  const [selectedFamIds, setSelectedFamIds] = useState<string[]>([]);
  const [famsLoading, setFamsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [createdTribeId, setCreatedTribeId] = useState<string | null>(null);
  const [savingMembers, setSavingMembers] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const fetchFams = async () => {
      setFamsLoading(true);
      try {
        const token = await user.getIdToken();
        const famsData = await getFams(token);
        setAllFams(famsData);
      } catch (error: any) {
        showAlert("Error", error.message);
      } finally {
        setFamsLoading(false);
      }
    };
    fetchFams();
  }, [user]);

  const handleCreate = async () => {
    if (!name || !description) {
      showAlert("Validation Error", "Name and description are required.");
      return;
    }

    setLoading(true);
    try {
      const token = await user?.getIdToken();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const newTribe = await createTribe({ name, description }, token);
      setCreatedTribeId(newTribe.id!);
      setIsModalVisible(true);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while adding Tribe.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleFamSelection = (famId: string) => {
    setSelectedFamIds((prev) =>
      prev.includes(famId)
        ? prev.filter((id) => id !== famId)
        : [...prev, famId],
    );
  };

  const handleSaveMembers = async () => {
    setSavingMembers(true);
    try {
      const token = await user?.getIdToken();
      if (!token || !createdTribeId) return;

      if (selectedFamIds.length > 0) {
        await Promise.all(
          selectedFamIds.map((famId) =>
            createTribeFam({ tribe_id: createdTribeId, fam_id: famId }, token),
          ),
        );
      }

      setIsModalVisible(false);
      router.back();
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to add members.");
    } finally {
      setSavingMembers(false);
    }
  };

  const sortedFams = [...allFams].sort((a, b) => {
    const aSelected = selectedFamIds.includes(a.id!);
    const bSelected = selectedFamIds.includes(b.id!);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Add Tribe",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />

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

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <Button title="Add Tribe" onPress={handleCreate} />
        )}
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsModalVisible(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Members</Text>
            {famsLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              <FlatList
                data={sortedFams}
                keyExtractor={(item) => item.id!}
                renderItem={({ item }) => {
                  const isSelected = selectedFamIds.includes(item.id!);
                  return (
                    <TouchableOpacity
                      style={[
                        styles.famItem,
                        isSelected && styles.famItemSelected,
                      ]}
                      onPress={() => item.id && toggleFamSelection(item.id)}
                    >
                      <View style={styles.famInfo}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemSubtitle}>{item.email}</Text>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No fams available.</Text>
                }
              />
            )}
            <View style={styles.modalButtons}>
              {savingMembers ? (
                <ActivityIndicator size="large" />
              ) : (
                <>
                  <Button title="Save Members" onPress={handleSaveMembers} />
                  <View style={{ height: 10 }} />
                  <Button
                    title="Skip"
                    onPress={() => {
                      setIsModalVisible(false);
                      router.back();
                    }}
                    color="#666"
                  />
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
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
  famItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
  },
  famInfo: { flex: 1 },
  itemTitle: { fontSize: 18, fontWeight: "bold" },
  itemSubtitle: { fontSize: 14, color: "#666" },
  famItemSelected: {
    backgroundColor: "#e6f7ff",
  },
  checkmark: {
    fontSize: 20,
    color: "#007bff",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
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
