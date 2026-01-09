import { Alert, AlertButton, Platform } from 'react-native';

export const showAlert = (title: string, message: string, buttons?: AlertButton[]) => {
  if (Platform.OS === 'web') {
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