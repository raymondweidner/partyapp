import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
} from "react-native";
import { colors, globalStyles } from "../theme";

export function DropdownSelect({
  value,
  options,
  onSelect,
  disabled = false,
  placeholder = "Select...",
}: {
  value: string;
  options: { label: string; value: string }[];
  onSelect: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  if (disabled) {
    return (
      <Text style={[globalStyles.valueText, { opacity: 0.8 }]}>
        {selectedLabel}
      </Text>
    );
  }

  const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const showFilter = options.length > 6 && options.some(o => /[a-zA-Z]/.test(o.label));

  return (
    <View style={{ zIndex: isOpen ? 10000 : 1, elevation: isOpen ? 10000 : 1, width: "100%" }}>
      <TouchableOpacity
        style={[styles.input, styles.dropdownHeader]}
        onPress={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch("");
        }}
      >
        <Text style={styles.itemTitle}>{selectedLabel}</Text>
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownListContainer}>
          {showFilter && (
            <TextInput
              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, fontSize: 16, color: colors.text }}
              placeholder="Filter..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          )}
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {filteredOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.dropdownItem}
                onPress={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
              >
                <Text style={styles.itemTitle}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.glassBackground,
  },
  readOnlyInput: { backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: "center" },
  disabledText: { color: colors.textMuted },
  itemTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownListContainer: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    opacity: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    maxHeight: 250,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownList: { flexGrow: 0 },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
