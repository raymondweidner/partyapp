import { Alert, AlertButton, Linking, Platform } from "react-native";

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
