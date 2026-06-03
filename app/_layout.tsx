import messaging from "@react-native-firebase/messaging";
import { Stack, useRouter, useSegments } from "expo-router";
import { getApp } from "firebase/app";
import {
  getMessaging,
  getToken as getWebToken,
  onMessage,
} from "firebase/messaging";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { Fam } from "../lib/data/Fam";
import { UserDevice } from "../lib/data/UserDevice";
import {
  createUserDevice,
  getFams,
  getUserDeviceByToken,
  updateFam,
  updateUserDevice,
} from "../lib/data/service";
import "../lib/firebaseConfig";

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
        if (typeof window === "undefined" || !("Notification" in window)) {
          console.warn("This browser does not support desktop notification");
          return;
        }

        if (!("serviceWorker" in navigator)) {
          console.warn(
            "This browser does not support service workers (Check if you are on HTTPS or localhost)",
          );
          return;
        }

        console.log("Requesting notification permission...");
        const messagingWeb = getMessaging(getApp());
        const permission = await Notification.requestPermission();
        console.log("Permission status:", permission);
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
          );
          await navigator.serviceWorker.ready;

          if (navigator.serviceWorker.controller) {
            console.log("[SW] Service Worker is controlling this page.");
          } else {
            console.log(
              "[SW] Service Worker is registered but NOT controlling this page yet. A reload is usually required.",
            );
          }

          fcmToken = await getWebToken(messagingWeb, {
            vapidKey:
              "BD1Se4bOz-TfdOpF24iXQIEMBzYXAmxhx1l6L1o1gx7I4B13i__koLzFjwnRwJbpVBZWI9cAqdT9EOmO2pWqbt8",
            serviceWorkerRegistration: registration,
          });
          console.log("Web FCM Token:", fcmToken);
        } else {
          console.warn(
            "Notification permission NOT granted. Status:",
            permission,
          );
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
        console.log("🔥 FCM Token (Use this to test):", fcmToken);
        setLoading(true);
        const token = await user.getIdToken();
        let foundDevice = await getUserDeviceByToken(fcmToken, token);

        if (foundDevice) {
          console.log("Existing user ID for token", foundDevice);

          // 2. Update user_id if found but user_id is different
          if (foundDevice.user_id !== user.uid) {
            console.log("Different user_id!", "Updating device");
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

  useEffect(() => {
    let unsubscribe: () => void;
    let channel: BroadcastChannel | null = null;

    if (Platform.OS === "web") {
      const messagingWeb = getMessaging(getApp());
      console.log("Initializing Web FCM Listeners");

      unsubscribe = onMessage(messagingWeb, (payload) => {
        console.log("Foreground Message:", payload);
        const title =
          payload.notification?.title || payload.data?.title || "New Message";
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          "You have a new message";
        alert(`${title}: ${body}`);
      });

      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel("fcm_channel");
        channel.onmessage = (event) => {
          console.log("Background Message (via BroadcastChannel):", event.data);
        };
      }
    } else {
      unsubscribe = messaging().onMessage(async (remoteMessage) => {
        Alert.alert(
          remoteMessage.notification?.title || "New Message",
          remoteMessage.notification?.body,
        );
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (channel) channel.close();
    };
  }, []);

  return (
    <UserDeviceContext.Provider
      value={{ userDevice, loading, refreshUserDevice: fetchUserDevice }}
    >
      {children}
    </UserDeviceContext.Provider>
  );
}

const CurrentFamContext = createContext<{
  fam: Fam | null;
  loading: boolean;
  refreshFam: () => Promise<void>;
}>({
  fam: null,
  loading: false,
  refreshFam: async () => {},
});

export const useCurrentFam = () => useContext(CurrentFamContext);

function CurrentFamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [fam, setFam] = useState<Fam | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFam = useCallback(async () => {
    if (!user || !user.email) {
      setFam(null);
      return;
    }
    try {
      const token = await user.getIdToken();
      const fams = await getFams(token);
      let foundFam = fams.find((f: any) => f.email === user.email);

      if (foundFam) {
        if (foundFam.user_id !== user.uid) {
          foundFam = await updateFam(
            { ...foundFam, user_id: user.uid } as Fam & { id: string },
            token,
          );
        }
        setFam(foundFam);
      } else {
        setFam(null);
      }
    } catch (error) {
      console.error("Failed to fetch fam", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFam();
  }, [fetchFam]);

  return (
    <CurrentFamContext.Provider value={{ fam, loading, refreshFam: fetchFam }}>
      {children}
    </CurrentFamContext.Provider>
  );
}

function Header() {
  const { fam } = useCurrentFam();
  return fam?.name ? (
    <Text style={{ marginRight: 15, fontWeight: "bold", fontSize: 16 }}>
      {fam.name}
    </Text>
  ) : null;
}

export function CustomHeaderLeft({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={() => (onBack ? onBack() : router.back())}
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
        headerLeft: ({ canGoBack }) =>
          canGoBack ? <CustomHeaderLeft /> : null,
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
        <CurrentFamProvider>
          <RootLayoutNav />
        </CurrentFamProvider>
      </UserDeviceProvider>
    </AuthProvider>
  );
}
