import React from "react";
import { render, screen, waitFor, userEvent } from "@testing-library/react-native";
import Home from "../../app/index";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
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
  getMembers: jest.fn(),
  getChats: jest.fn(),
  getChatMembers: jest.fn(),
  getMemberContacts: jest.fn(),
  getTribeMembersByMemberId: jest.fn(),
  getTribes: jest.fn(),
  getMeetups: jest.fn(),
}));

describe("Home Index View Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches dashboard data and renders correctly", async () => {
    // Arrange
    (service.getMembers as jest.Mock).mockResolvedValue([
      { id: "current-member-id", name: "Current User" },
      { id: "friend-id", name: "Friend Name" },
    ]);
    (service.getChats as jest.Mock).mockResolvedValue([]);
    (service.getChatMembers as jest.Mock).mockResolvedValue([]);
    
    (service.getMemberContacts as jest.Mock).mockResolvedValue({
      acceptedSources: [{ subject_id: "friend-id" }],
      acceptedSubjects: [],
      invitedSources: [],
      invitedSubjects: [],
    });

    (service.getTribeMembersByMemberId as jest.Mock).mockResolvedValue([
      { tribe_id: "tribe-id" },
    ]);

    (service.getTribes as jest.Mock).mockResolvedValue([
      { id: "tribe-id", name: "My Awesome Tribe", icon_type: "🏕️" },
    ]);

    (service.getMeetups as jest.Mock).mockResolvedValue([
      { id: "meetup-id", title: "My Awesome Meetup", status: "proposed", icon_type: "🎉" },
    ]);

    await render(<Home />);
    
    const { DeviceEventEmitter } = require("react-native");
    DeviceEventEmitter.emit("refreshView");

    // Assert
    await waitFor(() => {
      expect(service.getMembers).toHaveBeenCalled();
      expect(service.getMemberContacts).toHaveBeenCalled();
      expect(service.getTribeMembersByMemberId).toHaveBeenCalled();
      expect(service.getTribes).toHaveBeenCalled();
      expect(service.getMeetups).toHaveBeenCalled();
    });

    // Verify it rendered the meetup tab correctly and we see "My Awesome Meetup"
    // Note: The UI starts on "meetups" tab initially if tribes/fam data exist
    const meetupTitle = await screen.findByText("My Awesome Meetup");
    expect(meetupTitle).toBeTruthy();
    
    // Switch to Tribes tab
    const user = userEvent.setup();
    const tribesTabButton = screen.getByText("Tribes");
    await user.press(tribesTabButton);

    // Verify Tribe rendered
    const tribeTitle = await screen.findByText("My Awesome Tribe");
    expect(tribeTitle).toBeTruthy();
  });
});
