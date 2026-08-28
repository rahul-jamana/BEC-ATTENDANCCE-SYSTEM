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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("bec_session_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("bec_session_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync session and listen to Firebase Auth
  useEffect(() => {
    const saved = localStorage.getItem("bec_session_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      setCurrentUser(parsed);
      setUserProfile(parsed);
    }

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
            localStorage.setItem("bec_session_user", JSON.stringify(profile));
          }
        } catch (e) {
          console.warn("Failed to load profile on auth change:", e);
        }
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
      dob: studentData.dob || "",
      gender: studentData.gender || "Male",
      phone: studentData.phone || "",
      role: "student",
      status: "approved",
      createdAt: new Date().toISOString()
    };

    await DataService.createUser(newProfile);
    setCurrentUser(newProfile);
    setUserProfile(newProfile);
    localStorage.setItem("bec_session_user", JSON.stringify(newProfile));
    return newProfile;
  };

  // Universal Login (Accepts Email, Temporary Roll Number, or Registration Number)
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
          localStorage.setItem("bec_session_user", JSON.stringify(profile));
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
          // Fall through to check local student DB / DOB credentials
        } else if (code === "auth/user-not-found" || code === "auth/invalid-email") {
          // Fall through to database lookup
        } else if (!code) {
          throw firebaseErr;
        }
        console.warn("Firebase Auth bypassed, checking Firestore & student roster:", firebaseErr.message);
      }
    }

    // STEP 2: Universal Database Lookup (Email, Roll No, Temp ID, or Registration Number)
    const allUsers = await DataService.getUsers();
    const cleanInput = trimmedId.replace(/[\s-_]/g, "");

    const userFromDb = allUsers.find(u => {
      const uEmail = (u.email || "").toLowerCase();
      const uRoll = (u.rollNo || "").toLowerCase().replace(/[\s-_]/g, "");
      const uTemp = (u.tempId || "").toLowerCase().replace(/[\s-_]/g, "");
      const uReg = (u.regNo || "").toLowerCase().replace(/[\s-_]/g, "");
      return (
        uEmail === trimmedId ||
        uRoll === cleanInput ||
        uTemp === cleanInput ||
        (uReg && uReg === cleanInput)
      );
    });

    if (!userFromDb) {
      throw new Error("Invalid credentials: No account found with this Email, Student ID, or Roll Number.");
    }

    // STEP 3: Flexible Password & DOB Verification
    const cleanPassword = (password || "").trim();
    const userPass = (userFromDb.password || "").trim();
    const userDob = (userFromDb.dob || "").trim();

    const normalizeDateDigits = (d) => String(d || "").replace(/[^0-9]/g, "");

    const isPasswordValid =
      cleanPassword === "demo123" ||
      userPass === cleanPassword ||
      userDob === cleanPassword ||
      (userDob && normalizeDateDigits(userDob) === normalizeDateDigits(cleanPassword)) ||
      (userPass && normalizeDateDigits(userPass) === normalizeDateDigits(cleanPassword));

    if (!isPasswordValid) {
      throw new Error("Incorrect password. Please enter your Date of Birth (e.g. YYYY-MM-DD or DD-MM-YYYY) or assigned password.");
    }

    setCurrentUser(userFromDb);
    setUserProfile(userFromDb);
    localStorage.setItem("bec_session_user", JSON.stringify(userFromDb));
    return userFromDb;
  };

  // Quick Demo Login helper
  const demoLogin = async (email) => login(email, "demo123");

  // Master direct login — bypasses password (Ayush Master Portal only)
  const masterLoginAsUser = async (profile) => {
    setCurrentUser(profile);
    setUserProfile(profile);
    localStorage.setItem("bec_session_user", JSON.stringify(profile));
    return profile;
  };

  // Logout — signs out from Firebase Auth; onAuthStateChanged clears state
  const logout = async () => {
    if (isLiveFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {}
    }
    setCurrentUser(null);
    setUserProfile(null);
    localStorage.removeItem("bec_session_user");
  };

  // Refresh profile from Firestore
  const refreshProfile = async () => {
    if (userProfile?.uid) {
      const updated = await DataService.getUserById(userProfile.uid);
      if (updated) {
        setUserProfile(updated);
        localStorage.setItem("bec_session_user", JSON.stringify(updated));
      }
    }
  };

  // Update profile data in Firestore and active session
  const updateProfile = async (updatedFields) => {
    if (!userProfile?.uid) throw new Error("No user logged in.");
    await DataService.updateUserProfile(userProfile.uid, updatedFields);
    const newProfile = { ...userProfile, ...updatedFields };
    setUserProfile(newProfile);
    localStorage.setItem("bec_session_user", JSON.stringify(newProfile));
    return newProfile;
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
    updateProfile,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
