import React, { useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Member } from "../data/Member";

export function EmailModal({
  visible,
  onClose,
  members,
  onCreate,
  title = "Email Members",
  defaultSelectedIds = [],
  defaultSubject = "",
}: {
  visible: boolean;
  onClose: () => void;
  members: Member[];
  onCreate: (subject: string, selectedIds: string[]) => void;
  title?: string;
  defaultSelectedIds?: string[];
  defaultSubject?: string;
}) {
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize form states when the modal is opened
  useEffect(() => {
    if (visible) {
      setSubject(defaultSubject);
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

          <TextInput
            style={styles.modalInput}
            placeholder="Subject (Optional)"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor="#a0a0a0"
          />

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search members..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#a0a0a0"
            />
          </View>

          <FlatList
            style={{ maxHeight: 200, flexGrow: 0 }}
            data={filteredMembers}
            keyExtractor={(item) => item.id!}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(item.id!);
              const cleanEmail = item.email ? String(item.email).trim() : "";
              const hasEmail = cleanEmail.length > 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.memberItem,
                    isSelected && styles.memberItemSelected,
                    !hasEmail && { opacity: 0.5 },
                  ]}
                  onPress={() => toggleSelection(item.id!)}
                  disabled={!hasEmail}
                >
                  <Text style={styles.itemTitle}>
                    {item.name} {!hasEmail ? "(No Email)" : ""}
                  </Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                      !hasEmail && {
                        backgroundColor: "#f0f0f0",
                        borderColor: "#ccc",
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
                  backgroundColor: "#f0f0f0",
                  shadowOpacity: 0,
                  elevation: 0,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.primaryButtonText, { color: "#333" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, marginLeft: 10 }]}
              onPress={() => onCreate(subject, selectedIds)}
            >
              <Text style={styles.primaryButtonText}>Create Thread</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 52,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  modalInput: {
    fontSize: 16,
    color: "#333",
    height: 52,
    backgroundColor: "#F8F9FA",
    borderColor: "#E4E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalSearchInput: { flex: 1, fontSize: 16, color: "#333" },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxSelected: { backgroundColor: "#007bff", borderColor: "#007bff" },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
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
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  memberItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberItemSelected: { backgroundColor: "#e6f7ff", borderRadius: 8 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 5,
    marginBottom: 10,
    textAlign: "center",
  },
});
