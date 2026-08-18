import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ReadPoll from "../../app/read-poll";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "poll-id-123" }),
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
}));

describe("Read Poll Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches poll details and renders correctly", async () => {
    // Arrange
    const mockPoll = {
      id: "poll-id-123",
      title: "Where to eat?",
      details: "Vote for your favorite place",
      icon_type: "🍔",
      status: "voting",
      meetup_id: "meetup-id-123",
      creator_id: "creator-id",
    };
    (service.getPoll as jest.Mock).mockResolvedValue(mockPoll);

    const mockEntry = {
      id: "entry-id-123",
      poll_id: "poll-id-123",
      creator_id: "creator-id",
      caption: "Pizza Place",
      thumbnail: "https://example.com/pizza.jpg",
      file_id: "file-123",
    };
    (service.getPollEntries as jest.Mock).mockResolvedValue([mockEntry]);

    (service.getPollVotes as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<ReadPoll />);

    // Assert
    await waitFor(() => {
      expect(service.getPoll).toHaveBeenCalledWith("mock-token", "poll-id-123");
      expect(service.getPollEntries).toHaveBeenCalledWith("mock-token", "poll-id-123");
      expect(service.getPollVotes).toHaveBeenCalledWith("mock-token", "poll-id-123");
    });

    // Verify title and details
    expect(await screen.findByText("Where to eat?")).toBeTruthy();
    expect(await screen.findByText("Vote for your favorite place")).toBeTruthy();
    
    // Verify entry caption
    expect(await screen.findByText("Pizza Place")).toBeTruthy();
  });
});
