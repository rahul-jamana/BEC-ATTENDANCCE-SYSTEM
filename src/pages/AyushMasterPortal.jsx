import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { useNavigate, Link } from "react-router-dom";
import { 
  Shield, UserPlus, Users, School, GraduationCap, ArrowRight, 
  Trash2, CheckCircle2, AlertCircle, RefreshCw, KeyRound, 
  Sparkles, Layers, Lock, Mail, User, BookOpen, Check, X, 
  ShieldAlert, Eye, EyeOff, Key
} from "lucide-react";

export const AyushMasterPortal = () => {
  const { masterLoginAsUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create"); // "create" | "users" | "quick-switch"
  const [createRole, setCreateRole] = useState("student"); // "student" | "teacher" | "admin"
  const [showPassword, setShowPassword] = useState(false);

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

      const uid = `uid_${Date.now()}`;
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
                <span className="px-2.5 py-0.5 bg-amber-400 text-blue-950 text-[10px] font-black uppercase rounded-full tracking-wider shadow-xs">
                  ROOT ACCESS
                </span>
              </div>
              <p className="text-xs text-blue-100 font-mono">/login/ayush • Full Account Creation &amp; Password Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-colors shadow-xs"
            >
              Back to Login
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

                {/* 3. Password (Crucial Feature) */}
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
                {users.length} Total Registered
              </span>
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
                  {users.map((u) => (
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
                            <span className="font-mono text-blue-700 font-bold">{u.rollNo}</span> • {u.branch} ({u.year} Yr Sec-{u.section} Sem {u.semester || "1"})
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
                  ))}
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
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Instant 1-Click Master Role Switcher</h2>
              <p className="text-xs text-slate-500">Click any card below to immediately log in and explore their dashboard</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => handleInstantSwitch(u)}
                  className="p-5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
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
                        {u.branch} • {u.year} Yr (Sec {u.section}) • Roll: <span className="font-mono text-slate-800 font-bold">{u.rollNo}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-blue-700 font-bold">
                    <span>Jump to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
