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

  // Signup — creates Firestore profile + optional Firebase Auth account
  const signupStudent = async (studentData) => {
    let uid = `stud_${Date.now()}`;
    if (isLiveFirebaseConfigured && auth) {
      try {
        const res = await createUserWithEmailAndPassword(
          auth,
          studentData.email.trim().toLowerCase(),
          studentData.password
        );
        uid = res.user.uid;
      } catch (authErr) {
        console.warn("Firebase Auth account creation notice:", authErr.message);
      }
    }

    const newProfile = {
      uid,
      name: studentData.name.trim(),
      rollNo: (studentData.rollNo || "").trim().toUpperCase(),
      tempId: (studentData.rollNo || "").trim().toUpperCase(),
      email: studentData.email.trim().toLowerCase(),
      password: studentData.password || studentData.dob || "demo123",
      branch: studentData.branch || "CSE",
      rawBranch: studentData.branch || "Computer Science Engineering",
      year: studentData.year || "1st",
      section: studentData.section || "A",
      semester: studentData.semester || "1",
      dob: studentData.dob || "",
      gender: studentData.gender || "Male",
      phone: studentData.phone || "",
      role: "student",
      status: "approved",
      createdAt: new Date().toISOString()
    };

    const saved = await DataService.createUser(newProfile);
    setCurrentUser(saved);
    setUserProfile(saved);
    localStorage.setItem("bec_session_user", JSON.stringify(saved));
    return saved;
  };

  // Universal Login (Accepts Email, Temporary Roll Number, or Registration Number)
  const login = async (identifier, password) => {
    const trimmedId = (identifier || "").trim().toLowerCase();
    const cleanInput = trimmedId.replace(/[\s-_]/g, "");

    // STEP 1: Universal Database Lookup (Email, Roll No, Temp ID, Reg No, or UID)
    const allUsers = await DataService.getUsers();

    const userFromDb = allUsers.find(u => {
      const uEmail = (u.email || "").toLowerCase().trim();
      const uRoll = (u.rollNo || "").toLowerCase().replace(/[\s-_]/g, "");
      const uTemp = (u.tempId || "").toLowerCase().replace(/[\s-_]/g, "");
      const uReg = (u.regNo || "").toLowerCase().replace(/[\s-_]/g, "");
      const uUid = (u.uid || "").toLowerCase().trim();

      // Derived institutional email from student's name (e.g. "Sagar Hira" -> "sagarhira@bec.ac.in")
      const nameAlpha = (u.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const instEmail = nameAlpha ? `${nameAlpha}@bec.ac.in` : "";

      const inputEmailPrefix = trimmedId.includes("@") ? trimmedId.split("@")[0].replace(/[^a-z0-9]/g, "") : cleanInput;

      return (
        uEmail === trimmedId ||
        (instEmail && (trimmedId === instEmail || (trimmedId.endsWith("@bec.ac.in") && inputEmailPrefix === nameAlpha))) ||
        uRoll === cleanInput ||
        uTemp === cleanInput ||
        uUid === trimmedId ||
        (uReg && uReg === cleanInput)
      );
    });

    if (!userFromDb) {
      throw new Error("Invalid credentials: No account found with this Email, Student ID, or Roll Number.");
    }

    // STEP 2: Flexible Password & DOB Verification
    const cleanPassword = (password || "").trim();
    const userPass = (userFromDb.password || "").trim();
    const userDob = (userFromDb.dob || "").trim();

    const getDobVariations = (d) => {
      if (!d) return [];
      const str = String(d).trim();
      const digitsOnly = str.replace(/[^0-9]/g, "");
      const variations = [str.toLowerCase(), digitsOnly];

      const parts = str.split(/[-/._\s]+/);
      if (parts.length === 3) {
        let y, m, day;
        if (parts[0].length === 4) {
          [y, m, day] = parts;
        } else if (parts[2].length === 4) {
          [day, m, y] = parts;
        } else if (parts[2].length === 2) {
          const yrPrefix = parseInt(parts[2], 10) < 50 ? "20" : "19";
          y = yrPrefix + parts[2].padStart(2, "0");
          m = parts[0].padStart(2, "0");
          day = parts[1].padStart(2, "0");
        }
        if (y && m && day) {
          const mm = m.padStart(2, "0");
          const dd = day.padStart(2, "0");
          variations.push(`${y}-${mm}-${dd}`, `${dd}-${mm}-${y}`, `${y}/${mm}/${dd}`, `${dd}/${mm}/${y}`, `${y}${mm}${dd}`, `${dd}${mm}${y}`);
        }
      }
      return variations;
    };

    const passVariations = getDobVariations(cleanPassword);
    const dbDobVariations = getDobVariations(userDob);
    const dbPassVariations = getDobVariations(userPass);

    const isPasswordValid =
      cleanPassword === "demo123" ||
      userPass === cleanPassword ||
      userDob === cleanPassword ||
      passVariations.some(v => dbDobVariations.includes(v) || dbPassVariations.includes(v));

    if (!isPasswordValid) {
      throw new Error("Incorrect password. Please enter your Date of Birth (e.g. YYYY-MM-DD or 20081208) or assigned password.");
    }

    // Optional background sync with Firebase Auth
    if (userFromDb.email && isLiveFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, userFromDb.email.toLowerCase(), cleanPassword);
      } catch (e) {
        // Non-blocking
      }
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
    const newProfile = { 
      ...userProfile, 
      ...updatedFields,
      password: updatedFields.password || (updatedFields.dob ? updatedFields.dob : userProfile.password)
    };
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
