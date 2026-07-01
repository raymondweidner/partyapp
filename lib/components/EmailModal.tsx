import React, { useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { Member } from "../data/Member";
import { colors, globalStyles } from "../theme";

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

  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // Initialize form states when the modal is opened
  useEffect(() => {
    if (visible) {
      setSubject(defaultSubject);
      setSearch("");
      setSelectedIds(defaultSelectedIds);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
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
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="light" style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <Text style={styles.modalTitle}>{title}</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="Subject (Optional)"
            value={subject}
            onChangeText={setSubject}
            placeholderTextColor={colors.textMuted}
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
              onPress={() => onCreate(subject, selectedIds)}
            >
              <Text style={styles.primaryButtonText}>Create Thread</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </BlurView>
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
