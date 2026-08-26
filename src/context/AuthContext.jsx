import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, isLiveFirebaseConfigured } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { DataService } from "../services/dataService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase Auth is the single source of truth for session.
  // onAuthStateChanged fires on every page load — no localStorage needed.
  useEffect(() => {
    if (!isLiveFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await DataService.getUserById(firebaseUser.uid);
          if (profile) {
            setCurrentUser(firebaseUser);
            setUserProfile(profile);
          } else {
            // Firebase Auth user exists but no Firestore profile — sign out
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
          }
        } catch (e) {
          console.warn("Failed to load user profile:", e);
          setCurrentUser(null);
          setUserProfile(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Signup — creates Firebase Auth account + Firestore profile
  const signupStudent = async (studentData) => {
    const res = await createUserWithEmailAndPassword(
      auth,
      studentData.email.trim(),
      studentData.password
    );
    const uid = res.user.uid;

    const newProfile = {
      uid,
      name: studentData.name,
      rollNo: (studentData.rollNo || "").trim().toUpperCase(),
      email: studentData.email.trim().toLowerCase(),
      password: studentData.password,
      branch: studentData.branch,
      year: studentData.year,
      section: studentData.section,
      semester: studentData.semester,
      role: "student",
      status: "approved",
      createdAt: new Date().toISOString()
    };

    await DataService.createUser(newProfile);
    // onAuthStateChanged will auto-set currentUser & userProfile
    return newProfile;
  };

  // Universal Login (Accepts Email or Roll Number)
  const login = async (identifier, password) => {
    const trimmedId = (identifier || "").trim().toLowerCase();
    const isEmail = trimmedId.includes("@");

    // STEP 1: Try Firebase Auth first (email login)
    if (isEmail && isLiveFirebaseConfigured && auth) {
      try {
        const firebaseResult = await signInWithEmailAndPassword(auth, trimmedId, password);
        // Fetch profile from Firestore (auth token now valid)
        const profile = await DataService.getUserById(firebaseResult.user.uid);
        if (profile) {
          setCurrentUser(firebaseResult.user);
          setUserProfile(profile);
          return profile;
        }
        // Signed in but no Firestore profile found
        await signOut(auth);
        throw new Error("No account profile found. Please contact admin.");
      } catch (firebaseErr) {
        const code = firebaseErr.code || "";
        if (
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential" ||
          code === "auth/invalid-password"
        ) {
          throw new Error("Incorrect password. Please check your password and try again.");
        }
        if (code === "auth/user-not-found" || code === "auth/invalid-email") {
          throw new Error("Invalid credentials: No account found with this Email or Roll Number.");
        }
        // Re-throw our own errors (e.g. "No account profile found")
        if (!code) throw firebaseErr;
        // For other Firebase errors (network etc.), fall through to Firestore lookup
        console.warn("Firebase Auth failed, trying Firestore lookup:", firebaseErr.message);
      }
    }

    // STEP 2: Fallback for roll-number login or Firestore-only users
    // (users not registered in Firebase Auth, e.g. older accounts)
    const allUsers = await DataService.getUsers();
    const userFromDb = allUsers.find(u =>
      (u.email && u.email.toLowerCase() === trimmedId) ||
      (u.rollNo && u.rollNo.toLowerCase() === trimmedId)
    );

    if (!userFromDb) {
      throw new Error("Invalid credentials: No account found with this Email or Roll Number.");
    }
    if (userFromDb.password && userFromDb.password !== password) {
      throw new Error("Incorrect password. Please check your password and try again.");
    }

    setCurrentUser(userFromDb);
    setUserProfile(userFromDb);
    return userFromDb;
  };

  // Quick Demo Login helper
  const demoLogin = async (email) => login(email, "demo123");

  // Master direct login — bypasses password (Ayush Master Portal only)
  const masterLoginAsUser = async (profile) => {
    setCurrentUser(profile);
    setUserProfile(profile);
    return profile;
  };

  // Logout — signs out from Firebase Auth; onAuthStateChanged clears state
  const logout = async () => {
    if (isLiveFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setUserProfile(null);
  };

  // Refresh profile from Firestore
  const refreshProfile = async () => {
    if (userProfile?.uid) {
      const updated = await DataService.getUserById(userProfile.uid);
      if (updated) setUserProfile(updated);
    }
  };

  const value = {
    currentUser,
    userProfile,
    role: userProfile?.role || null,
    status: userProfile?.status || null,
    signupStudent,
    login,
    demoLogin,
    masterLoginAsUser,
    logout,
    refreshProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
