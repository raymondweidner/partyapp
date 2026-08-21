import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import ReadMember from "../../app/read-member";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "member-id-123", profile: "true" }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: () => null },
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// Mock expo-auth-session
jest.mock("expo-auth-session", () => ({
  useAutoDiscovery: jest.fn(),
  useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
  makeRedirectUri: jest.fn().mockReturnValue("redirect-uri"),
  exchangeCodeAsync: jest.fn(),
}));

// Mock firebase
jest.mock("firebase/auth", () => ({
  updatePassword: jest.fn(),
}));

jest.mock("../../lib/firebaseConfig", () => ({
  auth: {
    signOut: jest.fn(),
    currentUser: {
      updatePassword: jest.fn(),
    },
  },
}));

// Mock Auth
const mockUser = {
  getIdToken: jest.fn().mockResolvedValue("mock-token"),
};
jest.mock("../../lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock RootContext
jest.mock("../../lib/RootContext", () => ({
  useCurrentMember: () => ({
    member: { id: "member-id-123", name: "Current User" },
    refreshMember: jest.fn(),
  }),
  useUserDevice: () => ({
    userDevice: { id: "device-123" },
  }),
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getMembers: jest.fn(),
  getMemberAlertPreferences: jest.fn(),
  updateMember: jest.fn(),
}));

describe("Read Member Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches member details and renders correctly", async () => {
    // Arrange
    const mockMember = {
      id: "member-id-123",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      map_type: "google",
    };
    (service.getMembers as jest.Mock).mockResolvedValue([mockMember]);

    (service.getMemberAlertPreferences as jest.Mock).mockResolvedValue([
      { alert_type: "meetup_created", email_enabled: true, push_enabled: false },
    ]);

    // Act
    await render(<ReadMember />);

    // Simulate focus
    const { DeviceEventEmitter } = require("react-native");
    await act(async () => {
      DeviceEventEmitter.emit("refreshView");
    });

    // Assert
    await waitFor(() => {
      expect(service.getMembers).toHaveBeenCalledWith("mock-token");
      expect(service.getMemberAlertPreferences).toHaveBeenCalledWith("mock-token", "member-id-123");
    });

    // Check if member data is rendered
    expect(await screen.findByDisplayValue("John Doe")).toBeTruthy();
    expect(await screen.findByDisplayValue("john@example.com")).toBeTruthy();
  });
});
