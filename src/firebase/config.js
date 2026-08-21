import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Default configuration (Replace with your actual Firebase Project credentials)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoConfigKeyForBECSystem123456",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bec-attendance-system.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bec-attendance-system",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bec-attendance-system.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef1234567890"
};

// Check if valid API Key is provided
export const isLiveFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  !import.meta.env.VITE_FIREBASE_API_KEY.includes("DemoConfigKey")
);

let app = null;
let auth = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn("Firebase initialization warning (Falling back to local demo storage mode):", error);
}

export { app, auth, db };
