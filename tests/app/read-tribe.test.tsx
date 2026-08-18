import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ReadTribe from "../../app/read-tribe";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "tribe-id-123" }),
  useFocusEffect: jest.fn(),
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
    member: { id: "current-member-id", name: "Current User" },
  }),
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getTribes: jest.fn(),
  getMembers: jest.fn(),
  getTribeMembers: jest.fn(),
  getMeetups: jest.fn(),
  getMemberContacts: jest.fn(),
  getTribalCouncils: jest.fn(),
}));

describe("Read Tribe Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches tribe details and renders correctly", async () => {
    // Arrange
    const mockTribe = {
      id: "tribe-id-123",
      name: "Camping Crew",
      description: "We love camping",
      icon_type: "🏕️",
    };
    (service.getTribes as jest.Mock).mockResolvedValue([mockTribe]);

    const mockMember = { id: "member-id-456", name: "Alice" };
    (service.getMembers as jest.Mock).mockResolvedValue([mockMember]);

    const mockTribeMember = { id: "tm-1", tribe_id: "tribe-id-123", member_id: "member-id-456" };
    (service.getTribeMembers as jest.Mock).mockResolvedValue([mockTribeMember]);

    const mockMeetup = { id: "meetup-id-789", title: "Forest Trip", status: "proposed", tribe_id: "tribe-id-123" };
    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);

    (service.getMemberContacts as jest.Mock).mockResolvedValue({
      acceptedSources: [],
      acceptedSubjects: [],
      invitedSources: [],
      invitedSubjects: [],
    });

    (service.getTribalCouncils as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<ReadTribe />);
    
    // Simulate useFocusEffect and initial mount
    const { DeviceEventEmitter } = require("react-native");
    DeviceEventEmitter.emit("refreshView");

    // Assert
    await waitFor(() => {
      expect(service.getTribes).toHaveBeenCalledWith("mock-token");
      expect(service.getTribeMembers).toHaveBeenCalledWith("mock-token", "tribe-id-123");
    });

    // Check if the tribe name is rendered
    expect(await screen.findByText("Camping Crew")).toBeTruthy();
    // Check if the description is rendered
    expect(await screen.findByText("We love camping")).toBeTruthy();
    
    // Switch to meetups tab? Active tab by default is 'meetups'
    expect(await screen.findByText("Forest Trip")).toBeTruthy();
  });
});
