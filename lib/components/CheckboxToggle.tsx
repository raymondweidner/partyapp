import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function CheckboxToggle({
  label,
  isChecked,
  onPress,
  disabled = false,
}: {
  label: string;
  isChecked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}
      disabled={disabled}
      onPress={onPress}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: isChecked
              ? disabled
                ? "#aaa"
                : "#007bff"
              : "#fff",
          },
          disabled && { opacity: 0.7 },
        ]}
      >
        {isChecked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={[styles.checkboxLabel, { marginTop: 0, marginBottom: 0 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: { color: "#fff", fontWeight: "bold" },
  checkboxLabel: { fontSize: 16, fontWeight: "bold" },
});
