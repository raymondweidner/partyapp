import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import Login from "../../app/login";
import { auth } from "../../lib/firebaseConfig";
import * as service from "../../lib/service";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children,
}));

// Mock Firebase Auth
jest.mock("../../lib/firebaseConfig", () => ({
  auth: {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
  },
}));

// Mock services
jest.mock("../../lib/service", () => ({
  getMembers: jest.fn(),
  createMember: jest.fn(),
  updateMember: jest.fn(),
  checkInvite: jest.fn(),
  getMemberContacts: jest.fn(),
  updateMemberContact: jest.fn(),
}));

// Mock RootContext
jest.mock("../../lib/RootContext", () => ({
  useCurrentMember: () => ({
    setMember: jest.fn(),
  }),
}));

// Mock PhoneInput to avoid complex rendering issues in tests
jest.mock("../../lib/components/PhoneInput", () => {
  const { TextInput } = require("react-native");
  return function MockPhoneInput(props: any) {
    return <TextInput testID="phone-input" {...props} />;
  };
});

describe("Login View Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles a happy path sign-in successfully", async () => {
    const user = userEvent.setup();
    // Arrange
    const mockUserCredential = {
      user: {
        uid: "test-uid-123",
        getIdToken: jest.fn().mockResolvedValue("mock-token"),
      },
    };
    (auth.signInWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);

    const mockMembers = [{ user_id: "test-uid-123", email: "test@example.com", name: "Test User" }];
    (service.getMembers as jest.Mock).mockResolvedValue(mockMembers);

    await render(<Login />);

    // Act
    const emailInput = screen.getByPlaceholderText("Email");
    const passwordInput = screen.getByPlaceholderText("Password");
    const signInButton = screen.getByText("Sign In");

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.press(signInButton);

    // Assert
    await waitFor(() => {
      expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith("test@example.com", "password123");
      expect(service.getMembers).toHaveBeenCalledWith("mock-token");
    });
  });

  it("handles a happy path sign-up successfully", async () => {
    const user = userEvent.setup();
    // Arrange
    const mockUserCredential = {
      user: {
        uid: "new-uid-456",
        getIdToken: jest.fn().mockResolvedValue("mock-token"),
      },
    };
    (auth.createUserWithEmailAndPassword as jest.Mock).mockResolvedValue(mockUserCredential);
    
    // getMembers is called twice during signup: once initially, once after creation
    (service.getMembers as jest.Mock)
      .mockResolvedValueOnce([]) // First call: no member found
      .mockResolvedValueOnce([{ user_id: "new-uid-456", email: "new@example.com", name: "New User" }]); // Second call: member created

    await render(<Login />);

    // Act - Switch to Sign Up mode
    await user.press(screen.getByText(/Don't have an account/i));

    // Act - Fill out the form
    const nameInput = screen.getByPlaceholderText("Name");
    const phoneInput = screen.getByTestId("phone-input");
    const emailInput = screen.getByPlaceholderText("Email");
    const passwordInput = screen.getByPlaceholderText("Password");
    const signUpButton = screen.getByText("Sign Up");

    await user.type(nameInput, "New User");
    await user.type(phoneInput, "1234567890");
    await user.type(emailInput, "new@example.com");
    await user.type(passwordInput, "newpassword123");
    
    await user.press(signUpButton);

    // Assert
    await waitFor(() => {
      expect(auth.createUserWithEmailAndPassword).toHaveBeenCalledWith("new@example.com", "newpassword123");
      expect(service.createMember).toHaveBeenCalledWith("mock-token", {
        name: "New User",
        email: "new@example.com",
        phone: "1234567890",
        user_id: "new-uid-456",
        status: "active",
      });
    });
  });
});
