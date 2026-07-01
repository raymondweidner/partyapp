import messaging from "@react-native-firebase/messaging";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { getApp } from "firebase/app";
import {
  getMessaging,
  getToken as getWebToken,
  isSupported,
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
  DeviceEventEmitter,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { AuthProvider, useAuth } from "../lib/auth";
import { Member } from "../lib/data/Member";
import type { Notification } from "../lib/data/Notification";
import { UserDevice } from "../lib/data/UserDevice";
import {
  createUserDevice,
  deleteNotification,
  getMembers,
  getNotifications,
  getUserDeviceByToken,
  updateUserDevice,
} from "../lib/data/service";
import "../lib/firebaseConfig";
import { handleNotificationPress, openEmailThread, openWhatsAppDM, pendingRedirect, safeBack, setPendingRedirect, showAlert } from "../lib/util";

const UserDeviceContext = createContext<{
  userDevice: UserDevice | null;
  loading: boolean;
  refreshUserDevice: () => Promise<void>;
}>({
  userDevice: null,
  loading: false,
  refreshUserDevice: async () => { },
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

function CurrentMemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMember = useCallback(async () => {
    if (!user || !user.email) {
      setMember(null);
      return;
    }
    try {
      const token = await user.getIdToken();
      const members = await getMembers(token);
      let foundMember = members.find((f: any) => f.email === user.email);

      if (foundMember) {
        setMember(foundMember);
      } else {
        setMember(null);
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

function NotificationsProvider({ children }: { children: React.ReactNode }) {
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
    try {
      const token = await user.getIdToken();
      await deleteNotification(id, token);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
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

function Header() {
  const { member } = useCurrentMember();
  const { notifications } = useNotifications();
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 15 }}>
        {member?.name ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/edit-member",
                params: { id: member.id, profile: "true" },
              })
            }
            style={{ flexDirection: "row", alignItems: "center", marginRight: 15 }}
          >
            {member.profile_pic_data ? (
              <Image source={{ uri: member.profile_pic_data }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#007bff' }} />
            ) : (
              <Text style={{ fontSize: 24, marginRight: 8 }}>👤</Text>
            )}
            <Text style={{ fontWeight: "bold", fontSize: 16 }}>{member.name}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={() => {
            if (notifications.length > 0) {
              setModalVisible(true);
            }
          }}
          disabled={notifications.length === 0}
          style={{ position: "relative", marginLeft: 5 }}
        >
          <Text style={{ fontSize: 24, opacity: notifications.length > 0 ? 1 : 0.5 }}>🔔</Text>
          {notifications.length > 0 && (
            <View style={{
              position: 'absolute',
              top: -5,
              right: -10,
              backgroundColor: 'red',
              borderRadius: 10,
              paddingHorizontal: 5,
              paddingVertical: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                {notifications.length > 99 ? '99+' : notifications.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <NotificationsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

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

function FCMHandler() {
  const { refreshNotifications, removeNotification } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: () => void;
    let channel: BroadcastChannel | null = null;

    const handlePayload = (payload: any, clicked: boolean = false) => {
      console.log(`[FCMHandler] Message received! clicked=${clicked}, payload=`, payload);
      refreshNotifications();

      const data = payload.data || {};
      const title = payload.notification?.title || data.title || "New Message";
      const body = payload.notification?.body || data.body || "You have a new message";

      const notifId = data.notificationId || data.notification_id;
      if (notifId && user) {
        user.getIdToken().then((token) => {
          deleteNotification(notifId, token).catch((e) =>
            console.error("Failed to delete displayed notification:", e),
          );
        });
      }

      console.log(`[FCMHandler] Parsed Notification Data: title="${title}", body="${body}", data=`, data);

      const notif: Notification = {
        title,
        body,
        html_body: data.htmlBody || data.html_body,
        member_id: "",
        resource_type: data.resourceType || data.resource_type,
        resource_id: data.resourceId || data.resource_id,
        action_mode: data.actionMode || data.action_mode,
      };

      if (clicked) {
        console.log("[FCMHandler] Notification clicked. Routing directly without alert.", notif);
        handleNotificationPress(notif, router, !!user);
      } else {
        console.log("[FCMHandler] Displaying an alert for the received message.", notif);
        DeviceEventEmitter.emit("refreshView");
        showAlert(title, body, [
          { text: "Dismiss", style: "cancel" },
          {
            text: "Open",
            onPress: () => {
              handleNotificationPress(notif, router, !!user);
            },
          },
        ]);
      }
    };

    if (Platform.OS === "web") {
      isSupported().then((supported) => {
        if (!supported) {
          console.warn("[FCMHandler] Firebase Messaging is not supported.");
          return;
        }
        console.log("[FCMHandler] Attaching web foreground listener...");
        const messagingWeb = getMessaging(getApp());
        unsubscribe = onMessage(messagingWeb, (payload) => {
          console.log("[FCMHandler] Received onMessage from firebase/messaging (web foreground).");
          handlePayload(payload, false);
        });

        if (typeof BroadcastChannel !== "undefined") {
          channel = new BroadcastChannel("fcm_channel");
          channel.onmessage = (event) => {
            console.log("[FCMHandler] Received BroadcastChannel message from SW.");
            handlePayload(event.data, false);
          };
        }
      });
    } else {
      console.log("[FCMHandler] Attaching React Native foreground listener...");
      unsubscribe = messaging().onMessage(async (remoteMessage) => {
        console.log("[FCMHandler] Received onMessage from React Native FCM (native foreground).");
        handlePayload(remoteMessage, false);
      });

      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log("[FCMHandler] React Native FCM onNotificationOpenedApp triggered.");
        handlePayload(remoteMessage, true);
      });

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log("[FCMHandler] React Native FCM getInitialNotification resolved.", remoteMessage);
            handlePayload(remoteMessage, true);
          }
        });
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (channel) channel.close();
    };
  }, [refreshNotifications, router, user]);

  return null;
}

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const { refreshNotifications } = useNotifications();

  useEffect(() => {
    if (params.deleteNotifId && user) {
      user.getIdToken().then(token => {
        deleteNotification(params.deleteNotifId as string, token).then(() => {
          refreshNotifications();
        }).catch(e => console.error("Failed to delete background notification:", e));
      });
    }
  }, [params.deleteNotifId, user]);

  useEffect(() => {
    if (loading) return;

    const inLogin = segments[0] === "login";

    if (!user && !inLogin) {
      if (pathname && pathname !== "/" && pathname !== "") {
        setPendingRedirect({ pathname, params });
      }
      router.replace("/login");
    } else if (user && inLogin) {
      if (pendingRedirect) {
        const target = pendingRedirect;
        setPendingRedirect(null);
        router.replace(target);
      } else {
        router.replace("/");
      }
    }
  }, [user, loading, segments, router, pathname, params]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <FCMHandler />
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
    </>
  );
}

export const InfoModalContext = createContext<{
  showInfoModal: (
    title: string,
    content: string,
    options?: { phone?: string | null; email?: string | null; memberId?: string | null },
  ) => void;
}>({ showInfoModal: () => { } });

export const useInfoModal = () => useContext(InfoModalContext);

function InfoModalProvider({ children }: { children: React.ReactNode }) {
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    content: "",
    options: undefined as
      | { phone?: string | null; email?: string | null; memberId?: string | null }
      | undefined,
  });

  const showInfoModal = useCallback(
    (
      title: string,
      content: string,
      options?: { phone?: string | null; email?: string | null; memberId?: string | null },
    ) => {
      setModalConfig({ visible: true, title, content, options });
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const phone = modalConfig.options?.phone;
  const email = modalConfig.options?.email;
  const targetMemberId = modalConfig.options?.memberId;
  const { member } = useCurrentMember();
  const router = useRouter();

  return (
    <InfoModalContext.Provider value={{ showInfoModal }}>
      {children}
      <Modal
        visible={modalConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={layoutStyles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={layoutStyles.modalContent}>
            {!!modalConfig.title && (
              <Text style={layoutStyles.modalTitle}>{modalConfig.title}</Text>
            )}
            <Text style={layoutStyles.modalText}>{modalConfig.content}</Text>
            {modalConfig.options && (
              <View style={{ flexDirection: "row", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
                <TouchableOpacity
                  style={[
                    layoutStyles.dmButton,
                    { flex: 1, minWidth: 100, marginTop: 0, backgroundColor: "#007bff" },
                    !email && layoutStyles.dmButtonDisabled,
                  ]}
                  disabled={!email}
                  onPress={() => {
                    if (email) {
                      closeModal();
                      openEmailThread([email], "", member?.email);
                    }
                  }}
                >
                  <Text style={layoutStyles.dmButtonText}>📧 Email</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    layoutStyles.dmButton,
                    { flex: 1, minWidth: 100, marginTop: 0 },
                    !phone && layoutStyles.dmButtonDisabled,
                  ]}
                  disabled={!phone}
                  onPress={() => {
                    if (phone) {
                      closeModal();
                      openWhatsAppDM(phone);
                    }
                  }}
                >
                  <Text style={layoutStyles.dmButtonText}>💬 WhatsApp</Text>
                </TouchableOpacity>
                {targetMemberId && targetMemberId === member?.id && (
                  <TouchableOpacity
                    style={[
                      layoutStyles.dmButton,
                      { flex: 1, minWidth: 100, marginTop: 0, backgroundColor: "#28a745" },
                    ]}
                    onPress={() => {
                      closeModal();
                      router.push(`/edit-member?id=${targetMemberId}`);
                    }}
                  >
                    <Text style={layoutStyles.dmButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </InfoModalContext.Provider>
  );
}

import { ScrollView } from "react-native";

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { notifications, removeNotification } = useNotifications();
  const router = useRouter();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={layoutStyles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[layoutStyles.modalContent, { padding: 0, width: "90%" }]}>
          <Text style={[layoutStyles.modalTitle, { margin: 20, marginBottom: 10 }]}>Notifications</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {notifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
                onPress={() => {
                  onClose();
                  handleNotificationPress(notif, router, true, () => {
                    if (notif.id) removeNotification(notif.id);
                  });
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 4 }}>{notif.title}</Text>
                  {Platform.OS === "web" && (notif.html_body || (notif as any).htmlBody) ? (
                    React.createElement("div", {
                      dangerouslySetInnerHTML: { __html: notif.html_body || (notif as any).htmlBody },
                      style: { fontSize: 14, color: "#555", margin: 0, padding: 0 }
                    })
                  ) : (
                    <Text style={{ color: "#555" }}>{notif.body}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (notif.id) removeNotification(notif.id);
                  }}
                  style={{ padding: 10 }}
                >
                  <Text style={{ color: "red", fontWeight: "bold" }}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {notifications.length === 0 && (
              <Text style={{ textAlign: "center", padding: 20, color: "#888" }}>
                No new notifications.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <UserDeviceProvider>
        <CurrentMemberProvider>
          <NotificationsProvider>
            <InfoModalProvider>
              <RootLayoutNav />
            </InfoModalProvider>
          </NotificationsProvider>
        </CurrentMemberProvider>
      </UserDeviceProvider>
    </AuthProvider>
  );
}

const layoutStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  dmButton: {
    marginTop: 20,
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  dmButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
