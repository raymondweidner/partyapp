import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { Platform } from "react-native";

import secrets from '../secrets.json';

const firebaseConfig = {
  apiKey: secrets.FIREBASE_API_KEY,
  authDomain: secrets.FIREBASE_AUTH_DOMAIN,
  databaseURL: secrets.FIREBASE_DATABASE_URL,
  projectId: secrets.FIREBASE_PROJECT_ID,
  storageBucket: secrets.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: secrets.FIREBASE_MESSAGING_SENDER_ID,
  appId: secrets.FIREBASE_APP_ID,
  measurementId: secrets.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (__DEV__) {
  const authUrl = Platform.OS === 'android' ? 'http://10.0.2.2:9099' : 'http://localhost:9099';
  connectAuthEmulator(auth, authUrl);
}