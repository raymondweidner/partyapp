import messaging from "@react-native-firebase/messaging";
import { Stack, useRouter, useSegments } from "expo-router";
import { getApp } from "firebase/app";
import { getMessaging, getToken as getWebToken } from "firebase/messaging";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { Host } from "../lib/data/Host";
import {
  createUserDevice,
  getHostByEmail,
  getUserDeviceByToken,
  updateHost,
  updateUserDevice,
} from "../lib/data/service";
import { UserDevice } from "../lib/data/UserDevice";
import "../lib/firebaseConfig";
import { AuthProvider, useAuth } from "./auth";

const UserDeviceContext = createContext<{
  userDevice: UserDevice | null;
  loading: boolean;
  refreshUserDevice: () => Promise<void>;
}>({
  userDevice: null,
  loading: false,
  refreshUserDevice: async () => {},
});

export const useUserDevice = () => useContext(UserDeviceContext);

function UserDeviceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userDevice, setUserDevice] = useState<UserDevice | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUserDevice = useCallback(async () => {
    console.log("fetchUserDevice called", {
      user: user?.uid,
      platform: Platform.OS,
    });
    if (!user) {
      setUserDevice(null);
      return;
    }
    try {
      let fcmToken: string | undefined;

      if (Platform.OS === "web") {
        console.log("Requesting notification permission...");
        const messagingWeb = getMessaging(getApp());
        const permission = await Notification.requestPermission();
        console.log("Permission status:", permission);
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
          );
          fcmToken = await getWebToken(messagingWeb, {
            vapidKey:
              "BD1Se4bOz-TfdOpF24iXQIEMBzYXAmxhx1l6L1o1gx7I4B13i__koLzFjwnRwJbpVBZWI9cAqdT9EOmO2pWqbt8",
            serviceWorkerRegistration: registration,
          });
          console.log("Web FCM Token:", fcmToken);
        }
      } else {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          fcmToken = await messaging().getToken();
          console.log("New FCM Token", fcmToken);
        }
      }

      if (fcmToken) {
        console.log("FCM Token", fcmToken);
        setLoading(true);
        const token = await user.getIdToken();
        let foundDevice = await getUserDeviceByToken(fcmToken, token);

        if (foundDevice) {
          console.log("Existing user ID for token", foundDevice);

          // 2. Update userId if found but userId is different
          if (foundDevice.user_id !== user.uid) {
            console.log("Different userId!", "Updating device");
            foundDevice = await updateUserDevice(
              {
                ...foundDevice,
                user_id: user.uid,
                platform: Platform.OS,
                updated_at: new Date().toISOString(),
              },
              token,
            );
          } else {
            console.log("Same userId...", "No change");
          }
        } else {
          // 3. Create if not found
          foundDevice = await createUserDevice(
            {
              user_id: user.uid,
              token: fcmToken,
              updated_at: new Date().toISOString(),
              platform: Platform.OS,
            },
            token,
          );
          console.log("No matching token found", JSON.stringify(foundDevice));
        }
        setUserDevice(foundDevice || null);
      }
    } catch (error) {
      console.error("Failed to sync user device", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log("UserDeviceProvider useEffect triggered");
    fetchUserDevice();
  }, [fetchUserDevice]);

  return (
    <UserDeviceContext.Provider
      value={{ userDevice, loading, refreshUserDevice: fetchUserDevice }}
    >
      {children}
    </UserDeviceContext.Provider>
  );
}

const HostContext = createContext<{
  host: Host | null;
  loading: boolean;
  refreshHost: () => Promise<void>;
}>({
  host: null,
  loading: false,
  refreshHost: async () => {},
});

export const useHost = () => useContext(HostContext);

function HostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHost = useCallback(async () => {
    if (!user || !user.email) {
      setHost(null);
      return;
    }
    try {
      const token = await user.getIdToken();
      let foundHost = await getHostByEmail(user.email, token);

      if (foundHost) {
        if (foundHost.user_id !== user.uid) {
          foundHost = await updateHost(
            { ...foundHost, user_id: user.uid },
            token,
          );
        }
        setHost(foundHost);
      } else {
        setHost(null);
      }
    } catch (error) {
      console.error("Failed to fetch host", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHost();
  }, [fetchHost]);

  return (
    <HostContext.Provider value={{ host, loading, refreshHost: fetchHost }}>
      {children}
    </HostContext.Provider>
  );
}

function Header() {
  const { host } = useHost();
  return host?.name ? (
    <Text style={{ marginRight: 15, fontWeight: "bold", fontSize: 16 }}>
      {host.name}
    </Text>
  ) : null;
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inLogin = segments[0] === "login";

    if (!user && !inLogin) {
      router.replace("/login");
    } else if (user && inLogin) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerRight: () => <Header />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen
        name="login"
        options={{ title: "Login", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserDeviceProvider>
        <HostProvider>
          <RootLayoutNav />
        </HostProvider>
      </UserDeviceProvider>
    </AuthProvider>
  );
}
