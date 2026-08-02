import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { safeBack } from "../util";

export function CustomHeaderLeft({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => {
          if (onBack) onBack();
          else safeBack(router, "/");
        }}
        style={{ paddingHorizontal: 10 }}
      >
        <Text style={{ fontSize: 32, color: "#007bff", marginTop: -4 }}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.replace("/")}
        style={{ paddingHorizontal: 10 }}
      >
        <Text style={{ fontSize: 20 }}>🏠</Text>
      </TouchableOpacity>
    </View>
  );
}
