import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import RootLayout from "../../app/_layout";

// Mock Sentry
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: jest.fn((component) => component),
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => ["/"],
  usePathname: () => "/",
  useGlobalSearchParams: () => ({}),
  Stack: Object.assign(
    ({ children }: any) => <>{children}</>,
    { Screen: ({ children }: any) => <>{children}</> }
  ),
}));

// Mock Context Providers so we don't have to deal with nested state
jest.mock("../../lib/RootContext", () => {
  const React = require("react");
  return {
    CurrentMemberProvider: ({ children }: any) => <>{children}</>,
    NotificationsProvider: ({ children }: any) => <>{children}</>,
    UserDeviceProvider: ({ children }: any) => <>{children}</>,
    useCurrentMember: () => ({
      member: { id: "current-member-id", name: "Current User" },
    }),
    useNotifications: () => ({
      notifications: [],
      refreshNotifications: jest.fn(),
      removeNotification: jest.fn(),
    }),
  };
});

jest.mock("../../lib/auth", () => {
  const React = require("react");
  return {
    AuthProvider: ({ children }: any) => <>{children}</>,
    useAuth: () => ({
      user: { uid: "test-uid", getIdToken: jest.fn().mockResolvedValue("mock-token") },
      loading: false,
    }),
  };
});

// Mock Expo Google Fonts
jest.mock("@expo-google-fonts/nunito", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/quicksand", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/fraunces", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/bricolage-grotesque", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/besley", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/lobster", () => ({ useFonts: () => [true] }));
jest.mock("@expo-google-fonts/paytone-one", () => ({ useFonts: () => [true] }));

// Mock Expo Share Intent
jest.mock("expo-share-intent", () => ({
  useShareIntent: () => ({
    hasShareIntent: false,
    shareIntent: null,
    resetShareIntent: jest.fn(),
    error: null,
  }),
}));

// Mock Firebase Messaging
jest.mock("firebase/app", () => ({ getApp: jest.fn() }));
jest.mock("firebase/messaging", () => ({
  getMessaging: jest.fn(),
  isSupported: jest.fn().mockResolvedValue(true),
  onMessage: jest.fn(),
}));

jest.mock("@react-native-firebase/messaging", () => {
  return () => ({
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  });
});

// Mock Expo Splash Screen
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock Firebase Config
jest.mock("../../lib/firebaseConfig", () => ({
  auth: {},
  firestore: {},
  storage: {},
}));

describe("Root Layout Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the root layout successfully without crashing", async () => {
    // Arrange
    await render(<RootLayout />);

    // Assert
    await waitFor(() => {
      // The Stack should be rendered, but we just verify it didn't throw an error
      expect(true).toBe(true);
    });
  });
});
