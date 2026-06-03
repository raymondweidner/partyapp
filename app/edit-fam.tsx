// NOTE: Please rename this file to edit-fam.tsx
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Fam } from "../lib/data/Fam";
import { getFams, updateFam } from "../lib/data/service";

import { useAuth } from "../lib/auth";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "./_layout";

export default function EditFam() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [fams, setFams] = useState<Fam[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFam, setSelectedFam] = useState<Fam | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchFams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await getFams(token);
      setFams(data);
    } catch (error: any) {
      showAlert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFams();
  }, [fetchFams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  const handleSelectFam = (fam: Fam) => {
    setSelectedFam(fam);
    setName(fam.name);
    setEmail(fam.email);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleUpdate = async () => {
    if (!selectedFam || !user) return;

    if (!name || !email) {
      showAlert("Validation Error", "Name and email are required.");
      return;
    }

    if (!validateEmail(email)) {
      showAlert("Validation Error", "Please enter a valid email address.");
      return;
    }

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      // @ts-ignore
      await updateFam({ ...selectedFam, name, email }, token);

      showAlert("Success", "Fam updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setSelectedFam(null);
            fetchFams();
          },
        },
      ]);
    } catch (error: any) {
      showAlert(
        "Error",
        error.message || "An error occurred while updating the fam.",
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderFamItem = ({ item }: { item: Fam }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleSelectFam(item)}>
      <Text style={styles.itemTitle}>{item.name || "Unnamed Fam"}</Text>
      <Text style={styles.itemSubtitle}>
        {item.email || "No email provided"}
      </Text>
    </TouchableOpacity>
  );

  if (selectedFam) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: "Edit Fam Details",
            headerLeft: () => (
              <CustomHeaderLeft onBack={() => setSelectedFam(null)} />
            ),
          }}
        />

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Fam Name"
          placeholderTextColor="#a0a0a0"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#a0a0a0"
        />

        <View style={styles.buttonContainer}>
          {updating ? (
            <ActivityIndicator size="large" />
          ) : (
            <Button title="Update Fam" onPress={handleUpdate} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Select Fam to Edit",
          headerLeft: () => (
            <CustomHeaderLeft onBack={() => router.navigate("/")} />
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={fams}
          keyExtractor={(item: any) => item.id || Math.random().toString()}
          renderItem={renderFamItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No fams found.</Text>
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
  buttonContainer: { marginTop: 20 },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#666",
  },
});
