import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCt0f73Wph2hUtLOz87JHQAfZmU_VmQlCo",
  authDomain: "partyparty-6918c.firebaseapp.com",
  projectId: "partyparty-6918c",
  storageBucket: "partyparty-6918c.firebasestorage.app",
  messagingSenderId: "395288752355",
  appId: "1:395288752355:web:65e78a2909ac721ed715d6",
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const rawAuth = getAuth(app);

if (__DEV__ && process.env.EXPO_PUBLIC_USE_PROD_BACKEND !== "true") {
  connectAuthEmulator(rawAuth, "http://localhost:9099");
}

export const auth = {
  signInWithEmailAndPassword: (email: string, pass: string) => 
    require("firebase/auth").signInWithEmailAndPassword(rawAuth, email, pass),
  createUserWithEmailAndPassword: (email: string, pass: string) => 
    require("firebase/auth").createUserWithEmailAndPassword(rawAuth, email, pass),
  signOut: () => require("firebase/auth").signOut(rawAuth),
  onAuthStateChanged: (callback: any) => 
    require("firebase/auth").onAuthStateChanged(rawAuth, callback),
  sendPasswordResetEmail: (email: string) =>
    require("firebase/auth").sendPasswordResetEmail(rawAuth, email),
  get currentUser() { return rawAuth.currentUser; }
};
