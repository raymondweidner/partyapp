import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import UpdateAvailability from "../../app/update-availability";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ proposalId: "proposal-id-123" }),
  Stack: { Screen: () => null },
}));

// Mock Auth
const mockUser = {
  getIdToken: jest.fn().mockResolvedValue("mock-token"),
};
const mockAuth = {
  user: mockUser,
  loading: false,
};
jest.mock("../../lib/auth", () => ({
  useAuth: () => mockAuth,
}));

// Mock RootContext
const mockMemberObj = { id: "member-id-123", name: "Current User" };
const mockCurrentMember = { member: mockMemberObj };
jest.mock("../../lib/RootContext", () => ({
  useCurrentMember: () => mockCurrentMember,
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getAvailabilities: jest.fn(),
  getProposals: jest.fn(),
  getMeetups: jest.fn(),
  updateAvailability: jest.fn(),
  createAvailability: jest.fn(),
}));

describe("Update Availability Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches availability details and renders correctly", async () => {
    // Arrange
    const mockAvailability = {
      id: "availability-id-123",
      member_id: "member-id-123",
      proposal_id: "proposal-id-123",
      status: "Maybe",
    };
    (service.getAvailabilities as jest.Mock).mockResolvedValue([mockAvailability]);

    const mockProposal = {
      id: "proposal-id-123",
      meetup_id: "meetup-id-456",
    };
    (service.getProposals as jest.Mock).mockResolvedValue([mockProposal]);

    const mockMeetup = {
      id: "meetup-id-456",
      decision_method: "single_choice_voting",
    };
    (service.getMeetups as jest.Mock).mockResolvedValue([mockMeetup]);

    // Act
    await render(<UpdateAvailability />);

    // Assert
    await waitFor(() => {
      expect(service.getAvailabilities).toHaveBeenCalledWith("mock-token", "member-id-123", "proposal-id-123");
      expect(service.getProposals).toHaveBeenCalled();
    });

    // Check if Yes, Maybe, No buttons are rendered
    expect(await screen.findByText("✅ Yes")).toBeTruthy();
    expect(await screen.findByText("🤔 Maybe")).toBeTruthy();
    expect(await screen.findByText("❌ No")).toBeTruthy();
    
    // Check if the Vote checkbox is rendered
    expect(await screen.findByText("Vote for this proposal")).toBeTruthy();
  });
});
