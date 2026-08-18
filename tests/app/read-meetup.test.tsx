import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ReadMeetup from "../../app/read-meetup";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "meetup-id-123", tribeId: "tribe-id-456" }),
  useFocusEffect: jest.fn(),
  Stack: { Screen: () => null },
}));

// Mock expo-calendar conditionally
jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getCalendarsAsync: jest.fn().mockResolvedValue([{ isPrimary: true, id: "primary" }]),
  createEventAsync: jest.fn(),
  EntityTypes: { EVENT: "EVENT" },
}), { virtual: true });

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
  getMeetups: jest.fn(),
  getTribes: jest.fn(),
  getMembers: jest.fn(),
  getMemberContacts: jest.fn(),
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
}));

describe("Read Meetup Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches meetup details and renders correctly", async () => {
    // Arrange
    const mockMeetup = {
      id: "meetup-id-123",
      title: "Epic Party",
      tribe_id: "tribe-id-456",
      details: "It is going to be epic",
      status: "Planning",
    };
    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);

    const mockTribe = { id: "tribe-id-456", name: "Party Tribe" };
    (service.getTribes as jest.Mock).mockResolvedValue([mockTribe]);

    (service.getMembers as jest.Mock).mockResolvedValue([]);
    (service.getMemberContacts as jest.Mock).mockResolvedValue({
      acceptedSources: [], acceptedSubjects: [], invitedSources: [], invitedSubjects: []
    });

    (service.getProposals as jest.Mock).mockResolvedValue([]);
    (service.getAvailabilities as jest.Mock).mockResolvedValue([]);
    (service.getTribeMembers as jest.Mock).mockResolvedValue([]);
    (service.getPolls as jest.Mock).mockResolvedValue([]);
    (service.getMeetupEvents as jest.Mock).mockResolvedValue([]);
    (service.getSquads as jest.Mock).mockResolvedValue([]);
    (service.getChats as jest.Mock).mockResolvedValue([]);
    (service.getPollEntries as jest.Mock).mockResolvedValue([]);
    (service.getPollVotes as jest.Mock).mockResolvedValue([]);
    (service.getHelpRegistries as jest.Mock).mockResolvedValue([]);
    (service.getRegistryItems as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<ReadMeetup />);
    
    // Trigger the mock useFocusEffect or just emit the event
    const { DeviceEventEmitter } = require("react-native");
    DeviceEventEmitter.emit("refreshView");

    // Assert
    await waitFor(() => {
      expect(service.getMeetups).toHaveBeenCalledWith("mock-token", "tribe-id-456");
      expect(service.getProposals).toHaveBeenCalledWith("mock-token", undefined, "meetup-id-123");
    });

    // Verify title and details
    expect(await screen.findByText("Epic Party")).toBeTruthy();
    expect(await screen.findByText("It is going to be epic")).toBeTruthy();
  });
});
