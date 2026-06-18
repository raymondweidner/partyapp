import React, { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

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
  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  if (disabled) {
    return (
      <View
        style={[
          styles.input,
          styles.dropdownHeader,
          styles.readOnlyInput,
          { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.itemTitle, styles.disabledText]}>
          {selectedLabel}
        </Text>
        <Text style={{ fontSize: 16, color: "#888" }}>▼</Text>
      </View>
    );
  }

  return (
    <View style={{ zIndex: 1000, elevation: 1000, width: "100%" }}>
      <TouchableOpacity
        style={[styles.input, styles.dropdownHeader]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.itemTitle}>{selectedLabel}</Text>
        <Text style={{ fontSize: 16 }}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownListContainer}>
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {options.map((opt) => (
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
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  readOnlyInput: { backgroundColor: "#f5f5f5", justifyContent: "center" },
  disabledText: { color: "#888" },
  itemTitle: { fontSize: 16, fontWeight: "bold" },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dropdownListContainer: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    maxHeight: 150,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownList: { flexGrow: 0 },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
