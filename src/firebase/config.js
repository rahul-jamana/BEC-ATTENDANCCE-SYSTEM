import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// User's Live Firebase Project credentials (bec-at-system)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC8-xW8PG4xDf-UI9pBH0jMwrWIIfk2mUQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bec-at-system.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bec-at-system",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bec-at-system.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "5275309105",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:5275309105:web:051261270458c3695bb110"
};

// Check if valid API Key is provided
export const isLiveFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes("DemoConfigKey")
);

let app = null;
let auth = null;
let db = null;

if (isLiveFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("🔥 Live Firebase & Cloud Firestore connected to project:", firebaseConfig.projectId);
  } catch (error) {
    console.warn("Firebase initialization warning:", error);
  }
}

export { app, auth, db };
