import messaging from "@react-native-firebase/messaging";
import { getApp } from "firebase/app";
import { getMessaging, getToken as getWebToken, isSupported } from "firebase/messaging";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "./auth";
import { Member } from "./data/Member";
import type { Notification } from "./data/Notification";
import { UserDevice } from "./data/UserDevice";
import {
  createUserDevice,
  deleteNotification,
  getMembers,
  getNotifications,
  getUserDeviceByToken,
  updateUserDevice,
} from "./data/service";
import { auth } from "./firebaseConfig";

export const UserDeviceContext = createContext<{
  userDevice: UserDevice | null;
  loading: boolean;
  refreshUserDevice: () => Promise<void>;
}>({
  userDevice: null,
  loading: false,
  refreshUserDevice: async () => { },
});

export const useUserDevice = () => useContext(UserDeviceContext);

export function UserDeviceProvider({ children }: { children: React.ReactNode }) {
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

        const supported = await isSupported();
        if (!supported) {
          console.warn("Firebase Messaging is not supported in this browser environment.");
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
        let foundDevice = await getUserDeviceByToken(token, fcmToken);

        if (foundDevice) {
          console.log("Existing user ID for token", foundDevice);

          // 2. Update user_id if found but user_id is different
          if (foundDevice.user_id !== user.uid) {
            console.log("Different user_id!", "Updating device");
            foundDevice = await updateUserDevice(token, {
              ...foundDevice,
              user_id: user.uid,
              platform: Platform.OS,
              updated_at: new Date().toISOString(),
            });
          } else {
            console.log("Same userId...", "No change");
          }
        } else {
          // 3. Create if not found
          foundDevice = await createUserDevice(token, {
            user_id: user.uid,
            token: fcmToken,
            updated_at: new Date().toISOString(),
            platform: Platform.OS,
          });
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

export const CurrentMemberContext = createContext<{
  member: Member | null;
  loading: boolean;
  refreshMember: () => Promise<void>;
  setMember: (member: Member | null) => void;
}>({
  member: null,
  loading: false,
  refreshMember: async () => { },
  setMember: () => { },
});

export const useCurrentMember = () => useContext(CurrentMemberContext);

export function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMember = useCallback(async () => {
    if (!user || !user.email) {
      setMember(null);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const members = await getMembers(token);
      let foundMember = members.find((f: any) => f.email === user.email);

      if (foundMember) {
        setMember(foundMember);
      } else {
        setMember(null);
        await auth.signOut();
      }
    } catch (error) {
      console.error("Failed to fetch member", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  return (
    <CurrentMemberContext.Provider
      value={{ member, loading, refreshMember: fetchMember, setMember }}
    >
      {children}
    </CurrentMemberContext.Provider>
  );
}

export const NotificationsContext = createContext<{
  notifications: Notification[];
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
}>({
  notifications: [],
  loading: false,
  refreshNotifications: async () => { },
  removeNotification: async () => { },
});

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { member } = useCurrentMember();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user || !member || !member.id) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const fetched = await getNotifications(token, member.id);
      setNotifications(fetched);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  }, [user, member]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const removeNotification = async (id: string) => {
    if (!user) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const token = await user.getIdToken();
      await deleteNotification(token, id);
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        loading,
        refreshNotifications: fetchNotifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
