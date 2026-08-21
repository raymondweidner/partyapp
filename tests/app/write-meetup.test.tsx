import React from "react";
import { render, screen, userEvent, waitFor, act } from "@testing-library/react-native";
import WriteMeetup from "../../app/write-meetup";
import * as service from "../../lib/service";
import { DeviceEventEmitter } from "react-native";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
  }),
  useLocalSearchParams: () => ({ id: "test-meetup-123", tribeId: "test-tribe-123" }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: () => null },
}));

// Mock Auth
jest.mock("../../lib/auth", () => ({
  useAuth: () => ({
    user: {
      getIdToken: jest.fn().mockResolvedValue("mock-token"),
    },
    loading: false,
  }),
}));

// Mock RootContext
jest.mock("../../lib/RootContext", () => ({
  useCurrentMember: () => ({
    member: { id: "current-member-id", name: "Current User" },
  }),
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getMeetups: jest.fn(),
  getTribes: jest.fn(),
  getMembers: jest.fn(),
  getProposals: jest.fn(),
  getAvailabilities: jest.fn(),
  getTribeMembers: jest.fn(),
  getPolls: jest.fn(),
  getMeetupEvents: jest.fn(),
  getSquads: jest.fn(),
  getChats: jest.fn(),
  getPollEntries: jest.fn(),
  getPollVotes: jest.fn(),
  getHelpRegistries: jest.fn(),
  getRegistryItems: jest.fn(),
  updateMeetup: jest.fn(),
}));

describe("Write Meetup Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches meetup data and allows saving an update", async () => {
    const user = userEvent.setup();

    // Arrange - Setup all the fetched data
    const mockMeetup = {
      id: "test-meetup-123",
      title: "Initial Title",
      event_type: "Dinner",
      icon_type: "🍽️",
      details: "Initial Details",
      tribe_id: "test-tribe-123",
      decision_method: "most_available",
      days_to_decide: 14,
      leader_title: "Tribal Chieftain",
      creator_id: "current-member-id",
    };

    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);
    (service.getTribes as jest.Mock).mockResolvedValue([{ id: "test-tribe-123", name: "My Tribe" }]);
    (service.getMembers as jest.Mock).mockResolvedValue([]);
    (service.getProposals as jest.Mock).mockResolvedValue([]);
    (service.getTribeMembers as jest.Mock).mockResolvedValue([]);
    (service.getPolls as jest.Mock).mockResolvedValue([]);
    (service.getMeetupEvents as jest.Mock).mockResolvedValue([]);
    (service.getSquads as jest.Mock).mockResolvedValue([]);
    (service.getChats as jest.Mock).mockResolvedValue([]);
    (service.updateMeetup as jest.Mock).mockResolvedValue({});

    await render(<WriteMeetup />);

    // Since useFocusEffect is mocked to do nothing to avoid React Navigation context issues,
    // we'll manually trigger the initial load by emitting the refresh event which WriteMeetup listens to
    await act(async () => {
      DeviceEventEmitter.emit("refreshView");
    });

    // Wait for data to load
    await waitFor(() => {
      expect(service.getMeetups).toHaveBeenCalledWith("mock-token", "test-tribe-123");
    });

    // Act
    const titleInput = await screen.findByPlaceholderText("Meetup Title");
    const detailsInput = screen.getByPlaceholderText("Details");
    const saveButton = screen.getByText("Save");

    // The fields should be pre-populated
    expect(titleInput.props.value).toBe("Initial Title");
    expect(detailsInput.props.value).toBe("Initial Details");

    // Change title
    await user.type(titleInput, " Updated");
    await user.type(detailsInput, " Additional details");
    
    // Press Save
    await user.press(saveButton);

    // Assert
    await waitFor(() => {
      expect(service.updateMeetup).toHaveBeenCalledWith("mock-token", expect.objectContaining({
        id: "test-meetup-123",
        title: "Initial Title Updated",
        details: "Initial Details Additional details",
      }));
    });
  });
});
