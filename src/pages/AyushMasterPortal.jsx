import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { auth, isLiveFirebaseConfigured } from "../firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { 
  Shield, UserPlus, Users, School, GraduationCap, ArrowRight, 
  Trash2, CheckCircle2, AlertCircle, RefreshCw, KeyRound, 
  Sparkles, Layers, Lock, Mail, User, BookOpen, Check, X, 
  ShieldAlert, Eye, EyeOff, Key, LogOut, ShieldCheck, LockKeyhole,
  Search, Filter
} from "lucide-react";

export const AyushMasterPortal = () => {
  const { masterLoginAsUser } = useAuth();
  const navigate = useNavigate();

  // Master Gate Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("ayush_master_authenticated") === "true";
  });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Portal Dashboard State
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create"); // "create" | "users" | "quick-switch"
  const [createRole, setCreateRole] = useState("student"); // "student" | "teacher" | "admin"
  const [showPassword, setShowPassword] = useState(false);

  // User Filter State for Master Roster & Quick Switch
  const [userRoleFilter, setUserRoleFilter] = useState("all"); // "all" | "admin" | "teacher" | "student"
  const [userBranchFilter, setUserBranchFilter] = useState("all");
  const [userYearFilter, setUserYearFilter] = useState("all");
  const [userSectionFilter, setUserSectionFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Create User Form State
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    rollNo: "",
    branch: "CSE",
    year: "1st",
    section: "A",
    semester: "1",
    dob: "",
    gender: "Male",
    phone: "",
    department: "CSE",
    subjectName: "",
    status: "approved"
  });

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await DataService.getUsers();
      setUsers(allUsers || []);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllUsers();
  }, []);

  // Master Gate Login Handler
  const handleMasterLogin = (e) => {
    e.preventDefault();
    setAuthError("");

    const targetEmail = "ayushtechbbse@gmail.com";
    const targetPass = "ayush#@2026";

    if (
      authEmail.trim().toLowerCase() === targetEmail.toLowerCase() &&
      authPassword.trim() === targetPass
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem("ayush_master_authenticated", "true");
      setAuthError("");
    } else {
      setAuthError("Invalid credentials! Access restricted to authorized Master Admin only.");
    }
  };

  const handleMasterLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout from the master control hub?");
    if (!confirmed) return;

    setIsAuthenticated(false);
    sessionStorage.removeItem("ayush_master_authenticated");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    try {
      if (!form.name.trim() || !form.email.trim()) {
        throw new Error("Full Name and Email Address are required.");
      }

      if (!form.password.trim()) {
        throw new Error("Please provide a login password for this account.");
      }

      // Check if email already exists
      const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase().trim());
      if (existing) {
        throw new Error(`An account with email "${form.email}" already exists!`);
      }

      // Try to register user in Firebase Auth so they can log in via email/password
      let uid = `uid_${Date.now()}`;
      if (isLiveFirebaseConfigured && auth) {
        try {
          const firebaseRes = await createUserWithEmailAndPassword(
            auth,
            form.email.trim().toLowerCase(),
            form.password.trim()
          );
          uid = firebaseRes.user.uid;
        } catch (firebaseErr) {
          // If user already exists in Firebase Auth, that's fine — use generated uid
          if (firebaseErr.code !== "auth/email-already-in-use") {
            console.warn("Firebase Auth registration failed (will use Firestore-only login):", firebaseErr.message);
          }
        }
      }

      let newProfile = {
        uid,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: createRole,
        status: form.status || "approved",
        createdAt: new Date().toISOString()
      };

      if (createRole === "student") {
        newProfile = {
          ...newProfile,
          rollNo: form.rollNo.trim() || `BEC${Date.now().toString().slice(-4)}`,
          branch: form.branch,
          year: form.year,
          section: form.section,
          semester: form.semester,
          dob: form.dob || "",
          gender: form.gender || "Male",
          phone: form.phone || ""
        };
      } else if (createRole === "teacher") {
        newProfile = {
          ...newProfile,
          department: form.department,
          subjectName: form.subjectName || "Core Faculty",
        };
      } else if (createRole === "admin") {
        newProfile = {
          ...newProfile,
          department: "Administration / Examination Cell",
        };
      }

      await DataService.createUser(newProfile);
      setSuccessMsg(`✅ Account created for "${form.name}" (${form.email})! Password: "${form.password.trim()}"`);
      
      // Reset form fields
      setForm({
        name: "",
        email: "",
        password: "",
        role: createRole,
        rollNo: "",
        branch: "CSE",
        year: "1st",
        section: "A",
        semester: "1",
        department: "CSE",
        subjectName: "",
        status: "approved"
      });

      loadAllUsers();
    } catch (err) {
      setErrorMsg(err.message || "Failed to create account.");
    }
  };

  const handleInstantSwitch = async (user) => {
    try {
      await masterLoginAsUser(user);
      if (user.status === "pending") {
        navigate("/pending");
      } else if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    } catch (e) {
      setErrorMsg("Failed to switch account.");
    }
  };

  const handleDeleteUser = async (uid, userName) => {
    if (!window.confirm(`Are you sure you want to delete "${userName}"? This cannot be undone.`)) return;
    try {
      await DataService.deleteUser(uid);
      setSuccessMsg(`Deleted account for "${userName}".`);
      loadAllUsers();
    } catch (e) {
      setErrorMsg("Failed to delete user.");
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "approved" ? "pending" : "approved";
    try {
      await DataService.updateUserStatus(user.uid, nextStatus);
      setSuccessMsg(`Updated ${user.name}'s status to ${nextStatus.toUpperCase()}.`);
      loadAllUsers();
    } catch (e) {
      setErrorMsg("Failed to update status.");
    }
  };

  // Filtered Users computation for Tab 2 and Tab 3
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;

    // Branch / Department filter
    if (userBranchFilter !== "all") {
      const userBranch = u.branch || u.department;
      if (userBranch !== userBranchFilter) return false;
    }

    // Year filter (applies to students)
    if (userYearFilter !== "all") {
      if (u.role === "student" && u.year !== userYearFilter) return false;
    }

    // Section filter (applies to students)
    if (userSectionFilter !== "all") {
      if (u.role === "student" && u.section !== userSectionFilter) return false;
    }

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchRoll = u.rollNo?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      const matchSub = u.subjectName?.toLowerCase().includes(q);
      const matchBranch = u.branch?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchDept && !matchSub && !matchBranch) return false;
    }
    return true;
  });

  // ──────────────────────────────────────────────────────────────
  // VIEW 1: MASTER LOGIN GATE SCREEN (When Not Authenticated)
  // ──────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-blue-200/80 space-y-6">
          
          {/* Header Badge */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg mx-auto ring-4 ring-blue-100">
              <LockKeyhole className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ayush Master Access</h1>
            <p className="text-xs text-slate-500">Enter master credentials to unlock administrative creation studio</p>
          </div>

          {authError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleMasterLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Master ID / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ayushtechbbse@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Master Password</span>
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {showAuthPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showAuthPassword ? "Hide" : "Show"}</span>
                </button>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showAuthPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Unlock Master Hub</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link to="/login" className="text-xs text-slate-500 hover:text-blue-600 font-semibold transition-colors">
              ← Return to Main Login Portal
            </Link>
          </div>

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // VIEW 2: FULL AYUSH MASTER CONTROL HUB (When Authenticated)
  // ──────────────────────────────────────────────────────────────
  const adminCount = users.filter(u => u.role === "admin").length;
  const teacherCount = users.filter(u => u.role === "teacher").length;
  const studentCount = users.filter(u => u.role === "student").length;
  const approvedCount = users.filter(u => u.status === "approved").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-50 to-blue-100 text-slate-800 pb-16">
      
      {/* Top Navigation Bar */}
      <div className="gradient-header text-white shadow-lg sticky top-0 z-30 border-b border-blue-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-blue-800 flex items-center justify-center shadow-lg font-black text-lg">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Ayush Master Control Hub
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-400 text-blue-950 text-[10px] font-black uppercase rounded-full tracking-wider shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> AUTHENTICATED
                </span>
              </div>
              <p className="text-xs text-blue-100 font-mono">ayushtechbbse@gmail.com • Full Account Creation &amp; Password Studio</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleMasterLogout}
              className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-xl border border-rose-400/30 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Lock & Logout Master Hub"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Master</span>
            </button>
            <Link
              to="/login"
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors shadow-xs"
            >
              Login Page
            </Link>
            <button
              onClick={loadAllUsers}
              className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
              title="Reload Users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Metric Cards in Clean Light Blue Aesthetic */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/95 backdrop-blur-sm border border-blue-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Accounts</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">{users.length}</div>
            <div className="text-[11px] text-emerald-700 font-bold mt-1">{approvedCount} Approved</div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm border border-blue-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Admins</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-black text-purple-900 mt-2">{adminCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Full System Authority</div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm border border-blue-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Faculty</span>
              <School className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-black text-sky-900 mt-2">{teacherCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Class Lecturers</div>
          </div>

          <div className="bg-white/95 backdrop-blur-sm border border-blue-100 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Students</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-900 mt-2">{studentCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">12 BPUT Branches</div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-300 text-red-900 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-red-700 hover:text-red-950 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-blue-50/80 p-1.5 rounded-2xl border border-blue-200 w-fit">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "create"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-blue-700"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Account Creation Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "users"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-blue-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master User Accounts ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("quick-switch")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "quick-switch"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-blue-700"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>1-Click Role Switcher</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: ACCOUNT CREATION STUDIO (WITH PASSWORD)
            ======================================================== */}
        {activeTab === "create" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm space-y-6">
            
            <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Create Any Institutional Account</h2>
                <p className="text-xs text-slate-500 mt-0.5">Set full name, email, credentials, and password so users can log in directly</p>
              </div>

              {/* Role Selectors */}
              <div className="flex items-center space-x-2 bg-blue-50 p-1.5 rounded-2xl border border-blue-100">
                <button
                  type="button"
                  onClick={() => setCreateRole("student")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    createRole === "student"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateRole("teacher")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    createRole === "teacher"
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <School className="w-4 h-4" />
                  <span>Teacher</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateRole("admin")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    createRole === "admin"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              
              {/* Credentials Grid: Full Name, Email, Password, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder={createRole === "teacher" ? "Prof. Subrat Das" : createRole === "admin" ? "Dean Academic" : "Rahul Sharma"}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder={`${createRole}@bec.ac.in`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Login Password *</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? "Hide" : "Show"}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="e.g. Pass@123"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 4. Approval Status */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Approval Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="approved">✅ Approved (Instant Access)</option>
                    <option value="pending">⏳ Pending (Requires Approval)</option>
                  </select>
                </div>

              </div>

              {/* Role-Specific Fields */}
              {createRole === "student" && (
                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100 space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                    🎓 Student Academic Parameters
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Roll Number</label>
                      <input
                        type="text"
                        placeholder="2201209045"
                        value={form.rollNo}
                        onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch</label>
                      <select
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DataService.getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year</label>
                      <select
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DataService.getYears().map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Section</label>
                      <select
                        value={form.section}
                        onChange={(e) => setForm({ ...form, section: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DataService.getSections().map(s => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                      <select
                        value={form.semester}
                        onChange={(e) => setForm({ ...form, semester: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DataService.getSemesters().map(s => <option key={s} value={s}>Sem {s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Date of Birth, Gender, Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => setForm({ ...form, dob: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gender</label>
                      <select
                        value={form.gender}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createRole === "teacher" && (
                <div className="bg-sky-50/60 p-5 rounded-2xl border border-sky-100 space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800 block">
                    🏛️ Faculty &amp; Department Details
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teaching Department</label>
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DataService.getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Primary Subject Handled</label>
                      <input
                        type="text"
                        placeholder="e.g. Database Management Systems / Data Structures"
                        value={form.subjectName}
                        onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createRole === "admin" && (
                <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100 space-y-2 text-xs text-purple-900">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-800 block">
                    🛡️ Administrator Privileges
                  </span>
                  <p>Admins have unrestricted global access across all 12 BPUT departments, medical exemption booster, student approvals, QR sessions, and reports.</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                <span>Create {createRole.toUpperCase()} Account &amp; Save Credentials</span>
              </button>

            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: MASTER USER ACCOUNTS ROSTER (SHOWING PASSWORDS)
            ======================================================== */}
        {activeTab === "users" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">All Registered User Accounts</h2>
                <p className="text-xs text-slate-500">Manage, delete, approve, view passwords, or instantly switch into any account</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-mono font-bold rounded-xl border border-blue-200">
                Showing: {filteredUsers.length} of {users.length} Users
              </span>
            </div>

            {/* Role Filter Tabs + Search Bar */}
            <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Role Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setUserRoleFilter("all"); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "all"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    🌐 All ({users.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserRoleFilter("admin"); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "admin"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-purple-50 border border-slate-200"
                    }`}
                  >
                    🛡️ Admins ({users.filter(u => u.role === "admin").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserRoleFilter("teacher"); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "teacher"
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
                    }`}
                  >
                    👨‍🏫 Teachers ({users.filter(u => u.role === "teacher").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUserRoleFilter("student"); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "student"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
                    }`}
                  >
                    🎓 Students ({users.filter(u => u.role === "student").length})
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, roll, email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Student Sub-Filters (Branch, Year, Section) */}
              {(userRoleFilter === "student" || userRoleFilter === "all") && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-500 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-blue-600" /> Student Filters:
                  </span>

                  {/* Branch Filter */}
                  <select
                    value={userBranchFilter}
                    onChange={(e) => setUserBranchFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="all">All Branches</option>
                    {DataService.getDepartments().map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>

                  {/* Year Filter */}
                  <select
                    value={userYearFilter}
                    onChange={(e) => setUserYearFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="all">All Years</option>
                    {DataService.getYears().map(y => (
                      <option key={y} value={y}>{y} Year</option>
                    ))}
                  </select>

                  {/* Section Filter */}
                  <select
                    value={userSectionFilter}
                    onChange={(e) => setUserSectionFilter(e.target.value)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="all">All Sections</option>
                    {DataService.getSections().map(s => (
                      <option key={s} value={s}>Sec {s}</option>
                    ))}
                  </select>

                  {(userBranchFilter !== "all" || userYearFilter !== "all" || userSectionFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserBranchFilter("all");
                        setUserYearFilter("all");
                        setUserSectionFilter("all");
                      }}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-bold text-[11px] cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-blue-50/60 text-slate-600 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Academic Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No user accounts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : u.role === "teacher"
                              ? "bg-sky-100 text-sky-800 border border-sky-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}>
                            {u.role}
                          </span>
                        </td>

                        {/* Visible Password Column for Ayush */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {u.password || "demo123"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          {u.role === "student" ? (
                            <div>
                              <span className="font-mono text-blue-700 font-bold">{u.rollNo}</span> • <span className="font-semibold text-slate-900">{u.branch}</span> ({u.year} Yr Sec-{u.section} Sem {u.semester || "1"})
                            </div>
                          ) : u.role === "teacher" ? (
                            <div>{u.department} Dept • {u.subjectName || "Core Faculty"}</div>
                          ) : (
                            <div>Administrator / Dean</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              u.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200"
                            }`}
                            title="Click to toggle status"
                          >
                            {u.status === "approved" ? "✅ Approved" : "⏳ Pending"}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleInstantSwitch(u)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Login As</span>
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.uid, u.name)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 rounded-xl transition-colors cursor-pointer inline-flex items-center"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: 1-CLICK INSTANT SWITCHER GRID
            ======================================================== */}
        {activeTab === "quick-switch" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Instant 1-Click Master Role Switcher</h2>
                <p className="text-xs text-slate-500">Click any card below to immediately log in and explore their dashboard</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-800 text-xs font-mono font-bold rounded-xl border border-blue-200">
                Showing: {filteredUsers.length} of {users.length} Users
              </span>
            </div>

            {/* Filter controls for Quick Switcher */}
            <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "all" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    🌐 All ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("admin")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "admin" ? "bg-purple-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    🛡️ Admins ({users.filter(u => u.role === "admin").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("teacher")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "teacher" ? "bg-sky-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    👨‍🏫 Teachers ({users.filter(u => u.role === "teacher").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleFilter("student")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      userRoleFilter === "student" ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    🎓 Students ({users.filter(u => u.role === "student").length})
                  </button>
                </div>

                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, roll, email, branch..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  {userSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-Filters: Branch, Year, Section */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-blue-600" /> Academic Filters:
                </span>

                {/* Branch / Department Filter */}
                <select
                  value={userBranchFilter}
                  onChange={(e) => setUserBranchFilter(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Branches / Depts</option>
                  {DataService.getDepartments().map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                {/* Year Filter */}
                <select
                  value={userYearFilter}
                  onChange={(e) => setUserYearFilter(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {DataService.getYears().map(y => (
                    <option key={y} value={y}>{y} Year</option>
                  ))}
                </select>

                {/* Section Filter */}
                <select
                  value={userSectionFilter}
                  onChange={(e) => setUserSectionFilter(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="all">All Sections</option>
                  {DataService.getSections().map(s => (
                    <option key={s} value={s}>Sec {s}</option>
                  ))}
                </select>

                {(userBranchFilter !== "all" || userYearFilter !== "all" || userSectionFilter !== "all" || userSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserBranchFilter("all");
                      setUserYearFilter("all");
                      setUserSectionFilter("all");
                      setUserSearchQuery("");
                    }}
                    className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-bold text-[11px] cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400">
                  No accounts found for the selected filter.
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => handleInstantSwitch(u)}
                    className="p-5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : u.role === "teacher"
                          ? "bg-sky-100 text-sky-800 border border-sky-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {u.role}
                      </span>

                      <span className={`text-[10px] font-bold ${u.status === "approved" ? "text-emerald-700" : "text-amber-700"}`}>
                        {u.status === "approved" ? "✅ Active" : "⏳ Pending"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                        {u.name}
                      </h3>
                      <p className="text-slate-500 font-mono text-xs">{u.email}</p>
                      <p className="text-xs text-slate-600 mt-1 font-mono font-medium">
                        Password: <span className="font-bold text-blue-700">{u.password || "demo123"}</span>
                      </p>
                      {u.role === "student" && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-semibold text-slate-800">{u.branch}</span> • {u.year} Yr (Sec {u.section}) • Roll: <span className="font-mono text-slate-800 font-bold">{u.rollNo}</span>
                        </p>
                      )}
                      {u.role === "teacher" && (
                        <p className="text-xs text-slate-500 mt-1">
                          {u.department} Dept • {u.subjectName || "Faculty"}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-blue-700 font-bold">
                      <span>Jump to Dashboard</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
