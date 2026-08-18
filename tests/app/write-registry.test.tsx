import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import WriteRegistry from "../../app/write-registry";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: "registry-id-123", proposalId: "proposal-id-123" }),
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
  getMembers: jest.fn(),
  getHelpRegistry: jest.fn(),
  getRegistryItems: jest.fn(),
  createHelpRegistry: jest.fn(),
  updateHelpRegistry: jest.fn(),
}));

describe("Write Registry Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches registry details and populates form correctly", async () => {
    // Arrange
    const mockMember = { id: "member-id-123", name: "Current User" };
    (service.getMembers as jest.Mock).mockResolvedValue([mockMember]);

    const mockRegistry = {
      id: "registry-id-123",
      name: "Snacks",
      details: "Bring some snacks",
      is_squad: false,
    };
    (service.getHelpRegistry as jest.Mock).mockResolvedValue(mockRegistry);

    const mockItem = {
      id: "item-id-123",
      help_registry_id: "registry-id-123",
      details: "Chips",
      status: "Todo",
    };
    (service.getRegistryItems as jest.Mock).mockResolvedValue([mockItem]);

    // Act
    await render(<WriteRegistry />);

    // Assert
    await waitFor(() => {
      expect(service.getHelpRegistry).toHaveBeenCalledWith("mock-token", "registry-id-123");
    });

    // Check if the registry name is populated in the input field
    expect(await screen.findByDisplayValue("Snacks")).toBeTruthy();
    // Check if the details are populated in the input field
    expect(await screen.findByDisplayValue("Bring some snacks")).toBeTruthy();
  });
});
