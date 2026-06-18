import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export function DateTimePickerField({
  date,
  onChange,
  disabled = false,
}: {
  date: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (Platform.OS === "web") {
    return (
      <input
        type="datetime-local"
        style={{
          ...(styles.input as any),
          ...(disabled ? (styles.readOnlyInput as any) : {}),
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "inherit",
          color: disabled ? "#888" : "inherit",
        }}
        value={
          !isNaN(date.getTime())
            ? new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)
            : ""
        }
        onChange={(e: any) => {
          const parsed = new Date(e.target.value);
          if (!isNaN(parsed.getTime())) onChange(parsed);
        }}
        disabled={disabled}
      />
    );
  }

  return (
    <>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setShowDatePicker(true)}
      >
        <View style={[styles.input, disabled && styles.readOnlyInput]}>
          <Text style={disabled ? styles.disabledText : undefined}>
            {date.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
      {showDatePicker && !disabled && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(e: any, d?: Date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (d) onChange(d);
          }}
        />
      )}
    </>
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
});
