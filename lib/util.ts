import { Alert, AlertButton, Linking, Platform } from "react-native";
import { Notification } from "./data/Notification";

export let pendingRedirect: any = null;
export const setPendingRedirect = (val: any) => {
  pendingRedirect = val;
};

export const safeBack = (router: any, fallbackRoute: string = "/") => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute);
  }
};

export const showAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[],
) => {
  if (Platform.OS === "web") {
    alert(message);
    if (buttons) {
      const onPress = buttons.find((b) => b.onPress)?.onPress;
      if (onPress) {
        onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export const getResourceEndpoint = () => {
  if (__DEV__) {
    return "http://localhost:5008";
  }
  return "https://partyparty-395288752355.us-east5.run.app";
};

export const openWhatsAppDM = async (phone: string) => {
  if (!phone) {
    showAlert("Error", "No phone number available for this member.");
    return;
  }
  const cleanPhone = phone.replace(/\D/g, "");
  const url = `whatsapp://send?phone=${cleanPhone}`;
  const fallbackUrl = `https://wa.me/${cleanPhone}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    showAlert("Error", "Could not open WhatsApp.");
  }
};

export const openEmailThread = async (
  emails: string[],
  subject: string,
  senderEmail?: string,
) => {
  if (!emails || emails.length === 0) {
    showAlert("Error", "No email addresses selected.");
    return;
  }
  const to = emails.join(",");
  let url = `mailto:${to}?subject=${encodeURIComponent(subject)}`;

  const isGmailSender = senderEmail?.toLowerCase().endsWith("@gmail.com");

  if (Platform.OS === "web" && isGmailSender) {
    url = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodeURIComponent(subject)}`;
  }

  try {
    await Linking.openURL(url);
  } catch (error) {
    showAlert("Error", "Could not open email client.");
  }
};

export const openMapUrl = async (address: string, mapType: string = "google") => {
  if (!address) return;
  const query = encodeURIComponent(address);
  
  if (Platform.OS === "web") {
    let url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (mapType === "apple") {
      url = `https://maps.apple.com/?q=${query}`;
    }
    window.open(url, '_blank');
    return;
  }

  let url = `comgooglemaps://?q=${query}`;
  let fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  
  if (mapType === "apple") {
    url = `maps://?q=${query}`;
    fallbackUrl = `https://maps.apple.com/?q=${query}`;
  }

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    showAlert("Error", "Could not open map.");
  }
};

export const handleNotificationPress = (
  notification: Notification,
  router: any,
  isLoggedIn: boolean = true,
  onComplete?: () => void
) => {
  if (notification.resource_type && notification.action_mode) {
    if (notification.resource_type.toLowerCase() === 'oauth' && notification.action_mode.toLowerCase() === 'google_drive') {
      const target = { pathname: "/edit-member", params: { id: notification.resource_id, profile: "true" } };
      if (isLoggedIn) {
        router.push(target as any);
      } else {
        setPendingRedirect(target);
        router.replace("/login");
      }
    } else if (notification.action_mode.toUpperCase() === "GET" && notification.resource_id) {
      let targetPath = "";
      switch (notification.resource_type.toLowerCase()) {
        case "tribe":
          targetPath = "/edit-tribe";
          break;
        case "meetup":
          targetPath = "/edit-meetup";
          break;
        case "member":
          targetPath = "/edit-member";
          break;
        case "proposal":
          targetPath = "/edit-proposal";
          break;
      }
      
      if (targetPath) {
        const target = { pathname: targetPath, params: { id: notification.resource_id } };
        if (isLoggedIn) {
          router.push(target);
        } else {
          setPendingRedirect(target);
          router.replace("/login");
        }
      }
    }
  }
  if (onComplete) onComplete();
};
