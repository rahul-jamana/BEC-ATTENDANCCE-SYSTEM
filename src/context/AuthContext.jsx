import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, isLiveFirebaseConfigured } from "../firebase/config";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { DataService } from "../services/dataService";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load session from storage or Firebase on launch
  useEffect(() => {
    const savedUser = localStorage.getItem("bec_current_user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setCurrentUser(parsed);
      setUserProfile(parsed);
    }

    if (isLiveFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await DataService.getUserById(firebaseUser.uid);
          if (profile) {
            setCurrentUser(firebaseUser);
            setUserProfile(profile);
            localStorage.setItem("bec_current_user", JSON.stringify(profile));
          }
        }
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  // Signup function for Students
  const signupStudent = async (studentData) => {
    let uid = `uid_${Date.now()}`;
    if (isLiveFirebaseConfigured && auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, studentData.email, studentData.password);
        uid = res.user.uid;
      } catch (e) {
        console.warn("Firebase Auth signup failed, falling back to local storage auth:", e);
      }
    }

    const newProfile = {
      uid,
      name: studentData.name,
      rollNo: (studentData.rollNo || "").trim().toUpperCase(),
      email: (studentData.email || "").trim(),
      password: studentData.password,
      branch: studentData.branch,
      year: studentData.year,
      section: studentData.section,
      semester: studentData.semester,
      role: "student",
      status: "approved", // Auto-approved for instant login & testing
      createdAt: new Date().toISOString()
    };

    await DataService.createUser(newProfile);
    
    // Auto-login newly registered student
    setCurrentUser(newProfile);
    setUserProfile(newProfile);
    localStorage.setItem("bec_current_user", JSON.stringify(newProfile));
    
    return newProfile;
  };

  // Universal Login (Accepts Email or Roll Number)
  const login = async (identifier, password) => {
    const trimmedId = (identifier || "").trim().toLowerCase();
    const isEmail = trimmedId.includes("@");

    // STEP 1: If identifier looks like an email AND Firebase is configured,
    // try Firebase Auth FIRST. This solves the chicken-and-egg problem:
    // Firestore rules require auth to read, but we need to read to auth.
    if (isEmail && isLiveFirebaseConfigured && auth) {
      try {
        const firebaseResult = await signInWithEmailAndPassword(auth, trimmedId, password);
        // Firebase Auth succeeded — now fetch the profile (auth token is now valid)
        const profile = await DataService.getUserById(firebaseResult.user.uid);
        if (profile) {
          setCurrentUser(firebaseResult.user);
          setUserProfile(profile);
          localStorage.setItem("bec_current_user", JSON.stringify(profile));
          return profile;
        }
      } catch (firebaseErr) {
        // Firebase Auth failed — could be wrong password or user not in Firebase Auth.
        const code = firebaseErr.code || "";
        if (
          code === "auth/wrong-password" ||
          code === "auth/invalid-credential" ||
          code === "auth/invalid-password"
        ) {
          throw new Error("Incorrect password. Please check your password and try again.");
        }
        // For user-not-found or other errors, fall through to Firestore/local lookup
        // (users created via Master Portal exist in Firestore but not in Firebase Auth)
        console.warn("Firebase Auth attempt failed, falling back to local lookup:", firebaseErr.message);
      }
    }

    // STEP 2: Fallback — look up user by email or roll number from Firestore/localStorage
    let userFromDb = null;
    const allUsers = await DataService.getUsers();

    userFromDb = allUsers.find(u =>
      (u.email && u.email.toLowerCase() === trimmedId) ||
      (u.rollNo && u.rollNo.toLowerCase() === trimmedId)
    );

    if (!userFromDb) {
      throw new Error("Invalid credentials: No account found with this Email or Roll Number.");
    }

    // Password check for locally-stored users (password field exists in profile)
    if (userFromDb.password && userFromDb.password !== password) {
      throw new Error("Incorrect password. Please check your password and try again.");
    }

    setCurrentUser(userFromDb);
    setUserProfile(userFromDb);
    localStorage.setItem("bec_current_user", JSON.stringify(userFromDb));
    return userFromDb;
  };

  // Quick Demo Login helper (Admin, Teacher, Approved Student, Pending Student)
  const demoLogin = async (email) => {
    return login(email, "demo123");
  };

  // Master direct login without password check (for Master/Ayush Admin portal)
  const masterLoginAsUser = async (profile) => {
    setCurrentUser(profile);
    setUserProfile(profile);
    localStorage.setItem("bec_current_user", JSON.stringify(profile));
    return profile;
  };

  // Logout
  const logout = async () => {
    if (isLiveFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Firebase signout error:", e);
      }
    }
    setCurrentUser(null);
    setUserProfile(null);
    localStorage.removeItem("bec_current_user");
  };

  const refreshProfile = async () => {
    if (userProfile?.uid) {
      const updated = await DataService.getUserById(userProfile.uid);
      if (updated) {
        setUserProfile(updated);
        localStorage.setItem("bec_current_user", JSON.stringify(updated));
      }
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
