import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import FindFriend from "../../app/find-friend";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
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
  getMembers: jest.fn(),
  getMemberContacts: jest.fn(),
  createMemberContact: jest.fn(),
}));

// Mock Alert to automatically press 'Yes' on invite confirmation
jest.mock("../../lib/util", () => ({
  ...jest.requireActual("../../lib/util"),
  showAlert: jest.fn((title, message, buttons) => {
    if (title === "Invite to Fam" && buttons) {
      const yesButton = buttons.find((b: any) => b.text === "Yes");
      if (yesButton) {
        yesButton.onPress();
      }
    }
  }),
}));

describe("Find Friend Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("searches for members and allows sending an invitation", async () => {
    const user = userEvent.setup();

    // Arrange
    (service.getMemberContacts as jest.Mock).mockResolvedValue({
      acceptedSources: [],
      acceptedSubjects: [],
      invitedSources: [],
      invitedSubjects: [],
    });

    const mockMembers = [
      { id: "current-member-id", name: "Current User", email: "me@example.com" },
      { id: "found-member-id", name: "Jane Doe", email: "jane@example.com" },
    ];
    (service.getMembers as jest.Mock).mockResolvedValue(mockMembers);
    (service.createMemberContact as jest.Mock).mockResolvedValue({});

    await render(<FindFriend />);

    // Act
    const searchInput = screen.getByPlaceholderText("e.g. Jane Doe or jane@example.com");
    const searchButton = screen.getByText("Search");

    await user.type(searchInput, "Jane");
    await user.press(searchButton);

    // Assert
    await waitFor(() => {
      expect(service.getMembers).toHaveBeenCalledWith("mock-token");
    });

    // We should see Jane Doe in results
    const resultItem = await screen.findByText("Jane Doe");
    expect(resultItem).toBeTruthy();

    // Act - Select the member to invite
    await user.press(resultItem);

    // Assert
    await waitFor(() => {
      // Due to the mock of showAlert, 'Yes' is automatically pressed.
      expect(service.createMemberContact).toHaveBeenCalledWith("mock-token", {
        source_id: "current-member-id",
        subject_id: "found-member-id",
        status: "invited",
      });
    });
  });
});
