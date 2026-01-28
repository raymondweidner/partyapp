import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createHost,
  getHostByEmail,
  getHostByUserId,
  updateHost,
} from "../lib/data/service";
import { auth } from "../lib/firebaseConfig";
import { showAlert } from "../lib/util";

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const onSignIn = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showAlert("Success", "Logged in successfully!");
    } catch (error: any) {
      showAlert("Login Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    if (!name) {
      showAlert("Validation Error", "Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;
      const token = await user.getIdToken();

      try {
        // 1. Try fetching by user_id
        let host = await getHostByUserId(user.uid, token);

        if (!host) {
          // 2. Try fetching by email
          host = await getHostByEmail(email, token);
        }

        if (host) {
          // 3. Update user_id, name, and email (Link existing host or update details)
          await updateHost({ ...host, user_id: user.uid, name, email }, token);
        } else {
          // 4. Create new host
          await createHost({ name, email, user_id: user.uid }, token);
        }
      } catch (error: any) {
        await user.delete();
        throw new Error(
          "Failed to create or link host record. " + error.message,
        );
      }

      showAlert("Success", "Account created!");
    } catch (error: any) {
      showAlert("Sign Up Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>
          PartyParty! Event Manager - {isSignUp ? "Sign Up" : "Login"}
        </Text>

        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#a0a0a0"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#a0a0a0"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#a0a0a0"
        />

        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <View style={styles.buttonContainer}>
            {isSignUp ? (
              <>
                <Button
                  title="Create Account"
                  onPress={onSignUp}
                  color="#841584"
                />
                <View style={styles.spacer} />
                <Button
                  title="Back to Login"
                  onPress={() => setIsSignUp(false)}
                  color="#666"
                />
              </>
            ) : (
              <>
                <Button title="Sign In" onPress={onSignIn} />
                <View style={styles.spacer} />
                <Button
                  title="Create Account"
                  onPress={() => setIsSignUp(true)}
                  color="#841584"
                />
              </>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  buttonContainer: { marginTop: 10 },
  spacer: { height: 10 },
});
