import React from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import ForgotPassword from "../../app/forgot-password";
import { auth } from "../../lib/firebaseConfig";
import { showAlert } from "../../lib/util";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock Firebase Auth
jest.mock("../../lib/firebaseConfig", () => ({
  auth: {
    sendPasswordResetEmail: jest.fn(),
  },
}));

// Mock util
jest.mock("../../lib/util", () => ({
  ...jest.requireActual("../../lib/util"),
  showAlert: jest.fn(),
}));

describe("Forgot Password Integration Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles successful password reset email request", async () => {
    const user = userEvent.setup();

    // Arrange
    (auth.sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

    await render(<ForgotPassword />);
      
    // Act
    const emailInput = screen.getByPlaceholderText("Email");
    const sendButton = screen.getByText("Send Reset Link");

    await user.type(emailInput, "test@example.com");
    await user.press(sendButton);

    // Assert
    await waitFor(() => {
      expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith("test@example.com");
      expect(showAlert).toHaveBeenCalledWith(
        "Check your email",
        "A password reset link has been sent to your email address."
      );
    });
  });

  it("shows an error when email is empty", async () => {
    const user = userEvent.setup();
    await render(<ForgotPassword />);

    const sendButton = screen.getByText("Send Reset Link");
    await user.press(sendButton);

    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith("Validation Error", "Please enter your email address.");
      expect(auth.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});
