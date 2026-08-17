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
} from "../lib/service";
import { colors, globalStyles } from "../lib/theme";
import { FloralDivider } from "../lib/components/FloralDivider";
import { showAlert } from "../lib/util";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { useCurrentMember } from "../lib/RootContext";
import { EditRegistryItemModal } from "../lib/components/EditRegistryItemModal";

const TABS = ["Todo", "In Progress", "Blocked", "Completed", "Cancelled"];

export default function ReadRegistry() {
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
  const [isSquad, setIsSquad] = useState(false);

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
        setIsSquad(reg.is_squad || false);
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
        const updated = await updateHelpRegistry(token, { ...registry, name, details, is_squad: isSquad, id: registry.id as string });
        setRegistry(updated);
        showAlert("Success", "Registry updated successfully!");
      } else {
        const newReg = await createHelpRegistry(token, { name, details, is_squad: isSquad, proposal_id: proposalId, meetup_event_id: meetupEventId }
        );
        setRegistry(newReg);
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
              <TouchableOpacity onPress={() => router.push(`/write-registry?id=${paramId}&proposalId=${proposalId}&meetupEventId=${meetupEventId}`)}>
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: "bold" }}>
                  Edit
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 40, fontFamily: "Lobster_400Regular", color: colors.accent, textAlign: "center", marginBottom: 8 }}>{name}</Text>
          <FloralDivider color={colors.accent} />
          {details ? (
            <Text style={{ fontSize: 18, fontFamily: "Fraunces_200ExtraLight", color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20, marginTop: 16 }}>{details}</Text>
          ) : null}
        </View>
        {isSquad && (
          <View style={{ marginTop: 15 }}>
            <Text style={{ color: colors.primary, fontWeight: "bold", fontSize: 14 }}>
              🔒 Squad Eyes Only
            </Text>
          </View>
        )}

        {registry?.id && (
          <View style={globalStyles.sectionPanel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <Text style={styles.sectionTitle}>📋 Registry Items</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setSelectedItem(null);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

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
  sectionTitle: { fontSize: 24, fontFamily: "PaytoneOne_400Regular", color: colors.text, textAlign: "center" },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: colors.borderLight,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    flexWrap: "wrap",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  activeTab: {
    backgroundColor: colors.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFFFFF",
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
