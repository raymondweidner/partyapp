import { Alert, AlertButton, Linking, Platform } from "react-native";
import { Notification } from "./data/Notification";

export let pendingRedirect: any = null;
export const setPendingRedirect = (val: any) => {
  pendingRedirect = val;
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
  return "http://localhost:5008";
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

export const handleNotificationPress = (
  notification: Notification,
  router: any,
  isLoggedIn: boolean = true,
  onComplete?: () => void
) => {
  if (notification.resource_type && notification.action_mode) {
    if (notification.action_mode.toUpperCase() === "GET" && notification.resource_id) {
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
