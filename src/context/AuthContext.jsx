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
      rollNo: studentData.rollNo,
      email: studentData.email,
      branch: studentData.branch,
      year: studentData.year,
      section: studentData.section,
      semester: studentData.semester,
      role: "student",
      status: "pending", // Default status pending until Admin approves
      createdAt: new Date().toISOString()
    };

    await DataService.createUser(newProfile);
    return newProfile;
  };

  // Standard Email Login
  const login = async (email, password) => {
    let userFromDb = null;
    const allUsers = await DataService.getUsers();
    userFromDb = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!userFromDb) {
      throw new Error("Invalid credentials or account not found.");
    }

    if (isLiveFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (e) {
        console.warn("Live Firebase login skipped, proceeding with profile check:", e);
      }
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
