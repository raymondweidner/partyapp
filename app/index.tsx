import { Button, Text, View } from "react-native";
import { useAuth } from "../src/auth";
import { auth } from "../src/firebaseConfig";

export default function Index() {
  const { user } = useAuth();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Welcome {user?.email}</Text>
      <Button title="Sign Out" onPress={() => auth.signOut()} />
    </View>
  );
}
