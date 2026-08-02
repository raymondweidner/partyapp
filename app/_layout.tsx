import { Besley_600SemiBold, Besley_700Bold, Besley_800ExtraBold, useFonts as useBesleyFonts } from '@expo-google-fonts/besley';
import { BricolageGrotesque_500Medium, useFonts as useBricolageFonts } from '@expo-google-fonts/bricolage-grotesque';
import { Fraunces_200ExtraLight, useFonts as useFrauncesFonts } from '@expo-google-fonts/fraunces';
import { Lobster_400Regular, useFonts as useLobsterFonts } from '@expo-google-fonts/lobster';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from '@expo-google-fonts/nunito';
import { PaytoneOne_400Regular, useFonts as usePaytoneFonts } from '@expo-google-fonts/paytone-one';
import { Quicksand_700Bold, useFonts as useQuicksandFonts } from '@expo-google-fonts/quicksand';
import messaging from "@react-native-firebase/messaging";
import * as Sentry from '@sentry/react-native';
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import * as SplashScreen from 'expo-splash-screen';
import { getApp } from "firebase/app";
import {
  getMessaging,
  isSupported,
  onMessage
} from "firebase/messaging";
import React, {
  useEffect,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator, Animated, DeviceEventEmitter,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { CurrentMemberProvider, NotificationsProvider, UserDeviceProvider, useCurrentMember, useNotifications } from "../lib/RootContext";
import { AuthProvider, useAuth } from "../lib/auth";
import { CustomHeaderLeft } from "../lib/components/CustomHeaderLeft";
import { Meetup } from "../lib/data/Meetup";
import type { Notification } from "../lib/data/Notification";
import {
  createPoll,
  deleteNotification,
  getMeetups,
  getPolls,
  uploadMedia
} from "../lib/data/service";
import { colors, globalStyles } from "../lib/theme";
import { handleNotificationPress, pendingRedirect, setPendingRedirect, showAlert } from "../lib/util";

Sentry.init({
  dsn: 'https://09f4d814dc579175cc11b2f1dbf0c8ae@o4511842072133632.ingest.us.sentry.io/4511842076327936', // REQUIRED: Please replace with your actual Sentry DSN
  debug: true, // Prints Sentry debug logs to the terminal
  tracesSampleRate: 1.0, // Captures 100% of transactions for performance monitoring
  enableNative: true, // Ensures native iOS/Android crashes are caught
  attachScreenshot: true, // Attach a screenshot of the app at the time of a crash
});

SplashScreen.preventAutoHideAsync();

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
          deleteNotification(token, notifId).catch((e) =>
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
  const { member } = useCurrentMember();
  useEffect(() => {
    if (params.deleteNotifId && user) {
      user.getIdToken().then(token => {
        deleteNotification(token, params.deleteNotifId as string).then(() => {
          refreshNotifications();
        }).catch(e => console.error("Failed to delete background notification:", e));
      });
    }
  }, [params.deleteNotifId, user]);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  const [quicksandLoaded] = useQuicksandFonts({
    Quicksand_700Bold,
  });

  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_200ExtraLight,
  });

  const [bricolageLoaded] = useBricolageFonts({
    BricolageGrotesque_500Medium,
  });

  const [besleyLoaded] = useBesleyFonts({
    Besley_600SemiBold,
    Besley_700Bold,
    Besley_800ExtraBold,
  });

  const [lobsterLoaded] = useLobsterFonts({
    Lobster_400Regular,
  });

  const [paytoneLoaded] = usePaytoneFonts({
    PaytoneOne_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded && quicksandLoaded && frauncesLoaded && bricolageLoaded && besleyLoaded && lobsterLoaded && paytoneLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, quicksandLoaded, frauncesLoaded, bricolageLoaded, besleyLoaded, lobsterLoaded, paytoneLoaded]);

  useEffect(() => {
    if (loading) return;

    const isAuthRoute = segments[0] === "login" || segments[0] === "forgot-password";

    if (!user && !isAuthRoute) {
      if (pathname && pathname !== "/" && pathname !== "") {
        setPendingRedirect({ pathname, params });
      }
      router.replace("/login");
    } else if (user && isAuthRoute) {
      if (pendingRedirect) {
        const target = { ...pendingRedirect };
        router.replace(target);
        setPendingRedirect(null);
      } else {
        router.replace("/");
      }
    }
  }, [user, loading, segments, router, pathname, params]);

  if (loading || !fontsLoaded || !quicksandLoaded || !paytoneLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  function BottomNotificationBar() {
    const { notifications } = useNotifications();
    const [modalVisible, setModalVisible] = useState(false);

    if (notifications.length === 0) return null;

    return (
      <>
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              padding: 10,
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Text style={{ fontSize: 24 }}>🔔</Text>
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
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
          </TouchableOpacity>
        </View>
        <NotificationsModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <FCMHandler />
      <Stack
        screenOptions={{
          headerTitle: "",
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => {
                if (member?.id) {
                  router.push(`/read-member?id=${member.id}&profile=true`);
                } else {
                  router.push("/read-member?profile=true");
                }
              }} 
              style={{ marginRight: 15, alignItems: 'center' }}
            >
              {member?.profile_pic_data ? (
                <Image source={{ uri: member.profile_pic_data }} style={{ width: 28, height: 28, borderRadius: 14 }} />
              ) : (
                <Ionicons name="person-circle-outline" size={30} color={colors.primary} />
              )}
              {member?.name && (
                <Text 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                  style={{ fontSize: 10, color: colors.primary, fontFamily: 'Nunito_600SemiBold', marginTop: 2, maxWidth: 70, textAlign: 'center' }}
                >
                  {member.name}
                </Text>
              )}
            </TouchableOpacity>
          ),
          headerLeft: ({ canGoBack }) =>
            canGoBack ? <CustomHeaderLeft /> : null,
        }}
      >
        <Stack.Screen name="index" options={{ title: "" }} />
        <Stack.Screen
          name="login"
          options={{ title: "Login", headerShown: false }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Forgot Password", headerShown: false }}
        />
      </Stack>
      <BottomNotificationBar />
    </>
  );
}

import { ScrollView } from "react-native";

function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const notifScaleAnim = useRef(new Animated.Value(0.8)).current;
  const notifOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(notifScaleAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
        Animated.timing(notifOpacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      notifScaleAnim.setValue(0.8);
      notifOpacityAnim.setValue(0);
    }
  }, [visible]);

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
      <BlurView intensity={20} tint="light" style={layoutStyles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View style={[layoutStyles.modalContent, { padding: 0, width: "90%", transform: [{ scale: notifScaleAnim }], opacity: notifOpacityAnim }]}>
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
                      style: { fontSize: 14, color: colors.textSecondary, margin: 0, padding: 0 }
                    })
                  ) : (
                    <Text style={{ color: colors.textSecondary }}>{notif.body}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (notif.id) removeNotification(notif.id);
                  }}
                  style={{ padding: 10 }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: "bold" }}>Close</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {notifications.length === 0 && (
              <Text style={{ textAlign: "center", padding: 20, color: colors.textMuted }}>
                No new notifications.
              </Text>
            )}
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

function RootLayout() {
  return (
    <AuthProvider>
      <UserDeviceProvider>
        <CurrentMemberProvider>
          <NotificationsProvider>
            <RootLayoutNav />
            <ShareIntentHandler />
          </NotificationsProvider>
        </CurrentMemberProvider>
      </UserDeviceProvider>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();
  const { user } = useAuth();
  const { member } = useCurrentMember();

  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [pollsByMeetup, setPollsByMeetup] = useState<Record<string, import("../lib/data/Poll").Poll[]>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const shareData: any = shareIntent;

  useEffect(() => {
    if (hasShareIntent && user && shareData?.value) {
      loadData();
    }
  }, [hasShareIntent, user, shareIntent]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await user!.getIdToken();
      const fetchedMeetups = await getMeetups(token);
      setMeetups(fetchedMeetups);

      const pollsMap: Record<string, import("../lib/data/Poll").Poll[]> = {};
      for (const m of fetchedMeetups) {
        const fetchedPolls = await getPolls(token, m.id!);
        pollsMap[m.id!] = fetchedPolls.filter(p => p.status?.toLowerCase() === "posting");
      }
      setPollsByMeetup(pollsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (meetupId: string, pollId?: string) => {
    if (!user || !member || !shareData?.value) return;
    setUploading(true);
    try {
      const token = await user.getIdToken();
      let targetPollId = pollId;

      if (!targetPollId) {
        const now = new Date();
        const entryDeadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const voteDeadline = new Date(entryDeadline.getTime() + 3 * 24 * 60 * 60 * 1000);

        const newPoll = await createPoll(token, {
          meetup_id: meetupId,
          creator_id: member.id!,
          title: "Shared Media Poll",
          details: "Created from shared media.",
          entry_deadline: entryDeadline.toISOString(),
          vote_deadline: voteDeadline.toISOString(),
        });
        targetPollId = newPoll.id;
      }

      if (targetPollId) {
        // Find if this share Intent has a mimeType. Use image/jpeg fallback
        const mimeType = shareData.mimeType || "image/jpeg";
        const filename = shareData.value.split("/").pop() || "shared.jpg";

        // uploadMedia handles file uploading via formData
        await uploadMedia(token, shareData.value, filename, mimeType, meetupId, targetPollId);
        showAlert("Success", "Media uploaded to the poll!");
        resetShareIntent();
      }
    } catch (err) {
      console.error(err);
      showAlert("Error", "Failed to upload shared media.");
    } finally {
      setUploading(false);
    }
  };

  if (!hasShareIntent || !shareData?.value) return null;

  return (
    <Modal visible={true} transparent={true} animationType="slide">
      <BlurView intensity={80} style={layoutStyles.modalOverlay}>
        <View style={[layoutStyles.modalContent, { maxHeight: "90%" }]}>
          <Text style={layoutStyles.modalTitle}>Share to PartyApp</Text>

          {loading || uploading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <ScrollView>
              {shareData.value && (
                <Image source={{ uri: shareData.value }} style={{ width: "100%", height: 200, borderRadius: 10, marginBottom: 20 }} resizeMode="cover" />
              )}

              {meetups.map(m => (
                <View key={m.id} style={{ marginBottom: 20 }}>
                  <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 18, marginBottom: 10 }}>{m.title}</Text>

                  {pollsByMeetup[m.id!]?.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[globalStyles.primaryButton, { marginBottom: 10 }]}
                      onPress={() => handleUpload(m.id!, p.id!)}
                    >
                      <Text style={globalStyles.primaryButtonText}>Add to: {p.title}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[globalStyles.secondaryButton, { marginBottom: 10 }]}
                    onPress={() => handleUpload(m.id!)}
                  >
                    <Text style={globalStyles.secondaryButtonText}>+ Create New Poll</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={[globalStyles.secondaryButton, { marginTop: 20 }]} onPress={() => resetShareIntent()}>
            <Text style={globalStyles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
}

const layoutStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: colors.glassBackground,
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
    fontSize: 18,
    fontFamily: "Fraunces_200ExtraLight",
    color: colors.text,
    lineHeight: 24,
  },
  dmButton: {
    marginTop: 20,
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  dmButtonDisabled: {
    backgroundColor: colors.border,
  },
  dmButtonText: {
    color: "#F8F9FA",
    fontWeight: "bold",
    fontSize: 16,
  },
});
