import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCt0f73Wph2hUtLOz87JHQAfZmU_VmQlCo",
  authDomain: "partyparty-6918c.firebaseapp.com",
  databaseURL: "https://partyparty-6918c-default-rtdb.firebaseio.com",
  projectId: "partyparty-6918c",
  storageBucket: "partyparty-6918c.firebasestorage.app",
  messagingSenderId: "395288752355",
  appId: "1:395288752355:web:65e78a2909ac721ed715d6",
  measurementId: "G-432F11C5Q8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

if (__DEV__) {
  const authUrl = Platform.OS === 'android' ? 'http://10.0.2.2:9099' : 'http://localhost:9099';
  connectAuthEmulator(auth, authUrl);
}