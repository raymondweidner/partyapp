import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import WriteProposal from "../../app/write-proposal";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "proposal-id-123", meetupId: "meetup-id-456" }),
  useFocusEffect: jest.fn((callback) => {
    const React = require("react");
    React.useEffect(() => {
      callback();
    }, []);
  }),
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

// Mock react-native-maps
jest.mock("react-native-maps", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children }: any) => {
      return React.createElement("View", { "data-testid": "map-view" }, children);
    },
    Marker: () => React.createElement("View", { "data-testid": "map-marker" }),
  };
});

// Mock services
jest.mock("../../lib/service", () => ({
  getProposals: jest.fn(),
  getMeetups: jest.fn(),
  getMembers: jest.fn(),
  getSquads: jest.fn(),
  getHelpRegistries: jest.fn(),
  getRegistryItems: jest.fn(),
  getTribeMembers: jest.fn(),
  getAvailabilities: jest.fn(),
  createProposal: jest.fn(),
  updateProposal: jest.fn(),
}));

describe("Write Proposal Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches proposal details and populates form correctly", async () => {
    // Arrange
    const mockProposal = {
      id: "proposal-id-123",
      meetup_id: "meetup-id-456",
      host_id: "member-id-123",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      location: "Central Park",
    };
    (service.getProposals as jest.Mock).mockResolvedValue([mockProposal]);

    const mockMeetup = {
      id: "meetup-id-456",
      title: "Picnic",
      tribe_id: "tribe-id-1",
    };
    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);

    const mockMember = { id: "member-id-123", name: "Current User" };
    (service.getMembers as jest.Mock).mockResolvedValue([mockMember]);
    (service.getSquads as jest.Mock).mockResolvedValue([]);
    (service.getHelpRegistries as jest.Mock).mockResolvedValue([]);
    (service.getTribeMembers as jest.Mock).mockResolvedValue([]);
    (service.getAvailabilities as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<WriteProposal />);

    // Assert
    await waitFor(() => {
      expect(service.getProposals).toHaveBeenCalledWith("mock-token", undefined, "meetup-id-456");
    });

    // Check if the location is rendered
    expect(await screen.findByText("Central Park")).toBeTruthy();
    // Check if the host name is rendered
    expect(await screen.findByText("Current User")).toBeTruthy();
  });
});
