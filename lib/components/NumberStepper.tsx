import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
    borderColor: "#ccc",
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  counterButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#f0f0f0",
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  counterButtonRight: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#f0f0f0",
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  counterButtonText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  counterValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledText: { color: "#888" },
});
