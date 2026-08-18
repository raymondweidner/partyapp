import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import EventDetails from "../../app/event-details";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "event-id-123", meetupId: "meetup-id-456" }),
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
    member: { id: "current-member-id", name: "Current User" },
  }),
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getMeetupEvents: jest.fn(),
  getMeetups: jest.fn(),
  getPolls: jest.fn(),
  getMembers: jest.fn(),
  getSquads: jest.fn(),
  getPollEntries: jest.fn(),
  getPollVotes: jest.fn(),
  getHelpRegistries: jest.fn(),
  getRegistryItems: jest.fn(),
}));

describe("Event Details Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches event details and renders correctly", async () => {
    // Arrange
    const mockMeetupEvent = {
      id: "event-id-123",
      meetup_id: "meetup-id-456",
      start_at: "2026-08-17T20:00:00Z",
      end_at: "2026-08-17T22:00:00Z",
      location: "Central Park",
      note: "Bring snacks",
    };
    (service.getMeetupEvents as jest.Mock).mockResolvedValue([mockMeetupEvent]);

    const mockMeetup = {
      id: "meetup-id-456",
      title: "Summer Picnic",
    };
    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);

    const mockPoll = {
      id: "poll-1",
      meetup_event_id: "event-id-123",
      title: "What to eat?",
      status: "Posting",
    };
    (service.getPolls as jest.Mock).mockResolvedValue([mockPoll]);
    
    (service.getMembers as jest.Mock).mockResolvedValue([]);
    (service.getSquads as jest.Mock).mockResolvedValue([]);
    (service.getPollEntries as jest.Mock).mockResolvedValue([]);
    (service.getPollVotes as jest.Mock).mockResolvedValue([]);

    const mockRegistry = { id: "registry-1", name: "Snacks", is_squad: false };
    (service.getHelpRegistries as jest.Mock).mockResolvedValue([mockRegistry]);
    
    const mockRegistryItem = { id: "item-1", registry_id: "registry-1", status: "Incomplete" };
    (service.getRegistryItems as jest.Mock).mockResolvedValue([mockRegistryItem]);

    // Act
    await render(<EventDetails />);

    // Assert
    await waitFor(() => {
      expect(service.getMeetupEvents).toHaveBeenCalledWith("mock-token", "meetup-id-456");
      expect(service.getMeetups).toHaveBeenCalledWith("mock-token");
      expect(service.getPolls).toHaveBeenCalledWith("mock-token", "meetup-id-456");
      expect(service.getHelpRegistries).toHaveBeenCalledWith("mock-token", undefined, "event-id-123");
    });

    try {
      // Check if the meetup title is rendered
      expect(await screen.findByText("Summer Picnic")).toBeTruthy();
    } catch (e) {
      screen.debug();
      throw e;
    }
  });
});
