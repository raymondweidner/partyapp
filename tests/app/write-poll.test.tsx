import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import WritePoll from "../../app/write-poll";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "poll-id-123", meetupId: "meetup-id-456" }),
  Stack: { Screen: () => null },
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
  }),
}));

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn(),
}));

// Mock vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
}));

// Mock webview
jest.mock("react-native-webview", () => ({
  WebView: "WebView"
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getPoll: jest.fn(),
  getPollEntries: jest.fn(),
  getPollVotes: jest.fn(),
  createPoll: jest.fn(),
  updatePoll: jest.fn(),
}));

describe("Write Poll Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches poll details and populates form for editing", async () => {
    // Arrange
    const mockPoll = {
      id: "poll-id-123",
      title: "Where to eat?",
      details: "Vote for your favorite place",
      icon_type: "🍔",
      status: "voting",
      meetup_id: "meetup-id-456",
      creator_id: "member-id-123",
    };
    (service.getPoll as jest.Mock).mockResolvedValue(mockPoll);
    (service.getPollEntries as jest.Mock).mockResolvedValue([]);
    (service.getPollVotes as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<WritePoll />);

    // Assert
    await waitFor(() => {
      expect(service.getPoll).toHaveBeenCalledWith("mock-token", "poll-id-123");
    });

    // Check if the title is rendered
    expect(await screen.findByDisplayValue("Where to eat?")).toBeTruthy();
    // Check if details are rendered
    expect(await screen.findByDisplayValue("Vote for your favorite place")).toBeTruthy();
  });
});
