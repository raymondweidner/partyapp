import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme";

export function NumberStepper({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.counterContainer}>
      <TouchableOpacity
        style={[styles.counterButton, disabled && { opacity: 0.7 }]}
        disabled={disabled}
        onPress={() =>
          onChange(Math.max(1, parseInt(value || "1", 10) - 1).toString())
        }
      >
        <Text
          style={[styles.counterButtonText, disabled && styles.disabledText]}
        >
          -
        </Text>
      </TouchableOpacity>
      <Text style={[styles.counterValue, disabled && styles.disabledText]}>
        {value}
      </Text>
      <TouchableOpacity
        style={[styles.counterButtonRight, disabled && { opacity: 0.7 }]}
        disabled={disabled}
        onPress={() => onChange((parseInt(value || "0", 10) + 1).toString())}
      >
        <Text
          style={[styles.counterButtonText, disabled && styles.disabledText]}
        >
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
    backgroundColor: colors.glassBackground,
    overflow: "hidden",
  },
  counterButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  counterButtonRight: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  counterButtonText: { fontSize: 18, fontWeight: "bold", color: colors.text },
  counterValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  disabledText: { color: colors.textMuted },
});
