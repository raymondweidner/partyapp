import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import WriteTribe from "../../app/write-tribe";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "tribe-id-123" }),
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

// Mock services
jest.mock("../../lib/service", () => ({
  getTribes: jest.fn(),
  getMembers: jest.fn(),
  getMemberContacts: jest.fn(),
  getTribeMembers: jest.fn(),
  getTribalCouncils: jest.fn(),
  createTribe: jest.fn(),
  updateTribe: jest.fn(),
}));

describe("Write Tribe Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches tribe details and populates form correctly", async () => {
    // Arrange
    const mockTribe = {
      id: "tribe-id-123",
      name: "Cool Tribe",
      description: "A very cool tribe",
      icon_type: "😊",
    };
    (service.getTribes as jest.Mock).mockResolvedValue([mockTribe]);

    const mockMember = { id: "member-id-123", name: "Current User" };
    (service.getMembers as jest.Mock).mockResolvedValue([mockMember]);
    (service.getMemberContacts as jest.Mock).mockResolvedValue({});
    (service.getTribeMembers as jest.Mock).mockResolvedValue([]);
    (service.getTribalCouncils as jest.Mock).mockResolvedValue([]);

    // Act
    await render(<WriteTribe />);

    // Assert
    await waitFor(() => {
      expect(service.getTribes).toHaveBeenCalledWith("mock-token");
    });

    // Check if the tribe name is populated in the input field
    expect(await screen.findByDisplayValue("Cool Tribe")).toBeTruthy();
    // Check if the description is populated in the input field
    expect(await screen.findByDisplayValue("A very cool tribe")).toBeTruthy();
  });
});
