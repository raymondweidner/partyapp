import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Member } from "../data/Member";
import { showAlert } from "../util";
import { colors, globalStyles } from "../theme";

export function GroupChatModal({
  visible,
  onClose,
  members,
  onCreate,
  title = "Create Groupchat",
  creating = false,
  defaultSelectedIds = [],
  defaultName = "",
}: {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  onCreate: (name: string, url: string, selectedIds: string[]) => void;
  title?: string;
  creating?: boolean;
  defaultSelectedIds?: string[];
  defaultName?: string;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize form states when the modal is opened
  useEffect(() => {
    if (visible) {
      setName(defaultName);
      setUrl("");
      setSearch("");
      setSelectedIds(defaultSelectedIds);
    }
  }, [visible]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredMembers = members.filter((m) =>
    (m.name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.guidedPanel}>
            <Text style={styles.guidedPanelText}>
              {"WhatsApp doesn't allow automatic group creation. To proceed:"}
            </Text>
            <Text style={styles.guidedPanelText}>
              {"1. Open WhatsApp and create a new group."}
            </Text>
            <Text style={styles.guidedPanelText}>
              {'2. Copy the group\'s "Invite Link".'}
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { height: 44, marginTop: 8, marginBottom: 12 },
              ]}
              onPress={() =>
                Linking.openURL("whatsapp://app").catch(() =>
                  showAlert("Error", "WhatsApp is not installed."),
                )
              }
            >
              <Text style={styles.primaryButtonText}>Open WhatsApp</Text>
            </TouchableOpacity>
            <Text style={styles.guidedPanelText}>
              3. Paste the link and name the chat below.
            </Text>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="Chat Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textMuted}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="WhatsApp Invite URL (https://chat.whatsapp.com/...)"
            value={url}
            onChangeText={setUrl}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search members..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <FlatList
            style={{ maxHeight: 200, flexGrow: 0 }}
            data={filteredMembers}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id!);
              const cleanPhone = (item as any).phone
                ? String((item as any).phone).trim()
                : "";
              const hasPhone = cleanPhone.length > 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.memberItem,
                    isSelected && styles.memberItemSelected,
                    !hasPhone && { opacity: 0.5 },
                  ]}
                  onPress={() => toggleSelection(item.id!)}
                  disabled={!hasPhone}
                >
                  <Text style={styles.itemTitle}>
                    {item.name} {!hasPhone ? "(No Phone)" : ""}
                  </Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                      !hasPhone && {
                        backgroundColor: "transparent",
                        borderColor: colors.textMuted,
                      },
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No matching members.</Text>
            }
          />

          {creating ? (
            <ActivityIndicator
              size="large"
              color="#007bff"
              style={{ marginTop: 20 }}
            />
          ) : (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
              }}
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
                onPress={onClose}
              >
                <Text style={[styles.primaryButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
                onPress={() => onCreate(name, url, selectedIds)}
              >
                <Text style={styles.primaryButtonText}>Create Chat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: globalStyles.modalOverlay,
  modalContent: globalStyles.modalContent,
  modalTitle: globalStyles.modalTitle,
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: 8, color: colors.textMuted },
  modalInput: {
    fontSize: 16,
    color: colors.text,
    height: 52,
    backgroundColor: colors.glassBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalSearchInput: { flex: 1, fontSize: 16, color: colors.text },
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
  checkboxSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  primaryButton: globalStyles.primaryButton,
  primaryButtonText: globalStyles.primaryButtonText,
  guidedPanel: {
    backgroundColor: colors.glassBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidedPanelText: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  memberItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberItemSelected: { backgroundColor: "rgba(157, 78, 221, 0.2)", borderRadius: 8 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 10,
    textAlign: "center",
  },
});
