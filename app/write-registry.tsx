import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { HelpRegistry } from "../lib/data/HelpRegistry";
import { RegistryItem } from "../lib/data/RegistryItem";
import { Member } from "../lib/data/Member";
import {
  createHelpRegistry,
  createRegistryItem,
  getHelpRegistry,
  getMembers,
  getRegistryItems,
  updateHelpRegistry,
  updateRegistryItem,
} from "../lib/data/service";
import { colors, globalStyles } from "../lib/theme";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft, useCurrentMember } from "./_layout";
import { EditRegistryItemModal } from "../lib/components/EditRegistryItemModal";

const TABS = ["Todo", "In Progress", "Blocked", "Completed", "Cancelled"];

export default function EditRegistry() {
  const router = useRouter();
  const { id: paramId, proposalId, meetupEventId } = useLocalSearchParams<{
    id?: string;
    proposalId?: string;
    meetupEventId?: string;
  }>();
  const { user } = useAuth();
  const { member } = useCurrentMember();

  const [registry, setRegistry] = useState<HelpRegistry | null>(null);
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Registry Details
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [isCouncil, setIsCouncil] = useState(false);

  // Item List State
  const [activeTab, setActiveTab] = useState("Todo");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RegistryItem | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const allMembers = await getMembers(token);
      setMembers(allMembers);

      if (paramId) {
        const reg = await getHelpRegistry(token, paramId);
        setRegistry(reg);
        setName(reg.name || "");
        setDetails(reg.details || "");
        setIsCouncil(reg.is_council || false);
        const itms = await getRegistryItems(token, paramId);
        setItems(itms);
      }
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [user, paramId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleSaveRegistry = async () => {
    if (!user) return;
    if (!name.trim()) {
      showAlert("Validation", "Registry name is required.");
      return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      if (registry && registry.id) {
        const updated = await updateHelpRegistry(token, { ...registry, name, details, is_council: isCouncil, id: registry.id as string });
        setRegistry(updated);
        router.back();
        showAlert("Success", "Registry updated successfully!");
      } else {
        const newReg = await createHelpRegistry(token, { name, details, is_council: isCouncil, proposal_id: proposalId, meetup_event_id: meetupEventId }
        );
        setRegistry(newReg);
        router.back();
        showAlert("Success", "Registry created successfully!");
        router.setParams({ id: newReg.id });
      }
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async (itemData: Partial<RegistryItem>) => {
    if (!user || !registry?.id) return;
    try {
      const token = await user.getIdToken();
      if (selectedItem?.id) {
        const updated = await updateRegistryItem(token, { ...selectedItem, ...itemData } as RegistryItem & { id: string }
        );
        setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      } else {
        const newItem = await createRegistryItem(token, { ...itemData, help_registry_id: registry.id } as Omit<RegistryItem, "id">
        );
        setItems(prev => [...prev, newItem]);
      }
      setModalVisible(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredItems = items.filter(i => i.status === activeTab);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: registry?.id ? "Help Registry" : "Create Registry",
          headerLeft: () => <CustomHeaderLeft />,
          headerRight: () =>
            registry?.id ? (
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={globalStyles.label}>Registry Name</Text>
        <TextInput
          style={globalStyles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Decorations, Food, Cleanup"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[globalStyles.label, { marginTop: 15 }]}>Details</Text>
        <TextInput
          style={[globalStyles.input, { minHeight: 80 }]}
          value={details}
          onChangeText={setDetails}
          multiline
          placeholder="Any special instructions for helpers?"
          placeholderTextColor={colors.textMuted}
        />
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 15, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              isCouncil && styles.checkboxSelected
            ]}
            onPress={() => setIsCouncil(!isCouncil)}
          >
            {isCouncil && (
              <Text style={{ color: colors.background, fontWeight: "bold", fontSize: 14 }}>✓</Text>
            )}
          </TouchableOpacity>
          <Text style={[globalStyles.label, { marginLeft: 10, marginTop: 0 }]}>
            Tribal Council Eyes Only?
          </Text>
        </View>
        <TouchableOpacity
          style={[globalStyles.primaryButton, { marginTop: 20 }]}
          onPress={handleSaveRegistry}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={globalStyles.primaryButtonText}>
              {registry?.id ? "Save Registry" : "Create Registry"}
            </Text>
          )}
        </TouchableOpacity>

        {registry?.id && (
          <View style={globalStyles.sectionPanel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.sectionTitle}>Registry Items</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedItem(null);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 15 }}>
              <View style={styles.tabContainer}>
                {TABS.map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {filteredItems.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontStyle: "italic", textAlign: "center", marginTop: 20 }}>
                No items in this state.
              </Text>
            ) : (
              filteredItems.map(item => {
                const helper = members.find(m => m.id === item.helper_id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => {
                      setSelectedItem(item);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.itemDetails}>{item.details}</Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemHelper}>
                        Assigned: {helper ? helper.name || helper.email : "Unassigned"}
                      </Text>
                      <Text style={styles.itemStatus}>{item.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {registry?.id && (
        <EditRegistryItemModal
          visible={modalVisible}
          item={selectedItem}
          tribeMembers={members}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  readOnlyInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
    color: colors.text,
  },
  sectionTitle: { fontSize: 24, fontFamily: "PaytoneOne_400Regular", color: colors.text, textAlign: "center", marginBottom: 15 },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: "bold",
  },
  activeTabText: {
    color: "#fff",
  },
  itemCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemDetails: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemHelper: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemStatus: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "bold",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
