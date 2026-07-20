import authModule from "@react-native-firebase/auth";
import { Platform } from "react-native";

if (__DEV__) {
  const authUrl = Platform.OS === 'android' ? 'http://10.0.2.2:9099' : 'http://localhost:9099';
  authModule().useEmulator(authUrl);
}

export const auth = authModule();