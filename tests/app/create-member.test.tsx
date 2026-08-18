import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import CreateMember from "../../app/create-member";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({ tribeId: "test-tribe-123" }),
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
  createMember: jest.fn(),
  createMemberContact: jest.fn(),
  createTribeMember: jest.fn(),
}));

// Mock PhoneInput
jest.mock("../../lib/components/PhoneInput", () => {
  const { TextInput } = require("react-native");
  return function MockPhoneInput(props: any) {
    return <TextInput testID="phone-input" {...props} />;
  };
});

describe("Create Member Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles creating a new member invitation successfully", async () => {
    const user = userEvent.setup();

    // Arrange
    (service.createMember as jest.Mock).mockResolvedValue({ id: "new-member-id" });
    (service.createMemberContact as jest.Mock).mockResolvedValue({});

    await render(<CreateMember />);

    // Act
    const nameInput = screen.getByPlaceholderText("Member Name");
    const emailInput = screen.getByPlaceholderText("email@example.com");
    const phoneInput = screen.getByTestId("phone-input");
    const sendInviteButton = screen.getByText("Send Invite");

    await user.type(nameInput, "New Friend");
    await user.type(emailInput, "friend@example.com");
    await user.type(phoneInput, "9876543210");
    await user.press(sendInviteButton);

    // Assert
    await waitFor(() => {
      expect(service.createMember).toHaveBeenCalledWith("mock-token", {
        name: "New Friend",
        email: "friend@example.com",
        phone: "9876543210",
        status: "invited",
      });
      expect(service.createMemberContact).toHaveBeenCalledWith("mock-token", {
        source_id: "current-member-id",
        subject_id: "new-member-id",
        status: "invited",
      });
    });
  });
});
