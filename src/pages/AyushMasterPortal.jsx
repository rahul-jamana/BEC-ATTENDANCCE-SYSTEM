import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { useNavigate, Link } from "react-router-dom";
import { 
  Shield, UserPlus, Users, School, GraduationCap, ArrowRight, 
  Trash2, CheckCircle2, AlertCircle, RefreshCw, KeyRound, 
  Sparkles, Layers, Lock, Mail, User, BookOpen, Check, X, ShieldAlert
} from "lucide-react";

export const AyushMasterPortal = () => {
  const { masterLoginAsUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create"); // "create" | "users" | "quick-switch"
  const [createRole, setCreateRole] = useState("student"); // "student" | "teacher" | "admin"

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
      if (!form.name || !form.email) {
        throw new Error("Name and Email are required.");
      }

      // Check if email already exists
      const existing = users.find(u => u.email.toLowerCase() === form.email.toLowerCase());
      if (existing) {
        throw new Error(`An account with email "${form.email}" already exists!`);
      }

      const uid = `uid_${Date.now()}`;
      let newProfile = {
        uid,
        name: form.name.trim(),
        email: form.email.trim(),
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
          subjectName: form.subjectName || "Core Subject",
        };
      } else if (createRole === "admin") {
        newProfile = {
          ...newProfile,
          department: "Administration / Examination Cell",
        };
      }

      await DataService.createUser(newProfile);
      setSuccessMsg(`✅ Successfully created ${createRole.toUpperCase()} account for "${form.name}" (${form.email})!`);
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-slate-100 pb-16">
      
      {/* Header Bar */}
      <div className="border-b border-blue-800/40 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  Ayush Master Control Hub
                </h1>
                <span className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase rounded-full tracking-wider shadow-xs">
                  ROOT ACCESS
                </span>
              </div>
              <p className="text-xs text-blue-200/80 font-mono">/login/ayush • Full Account Creation &amp; Master Switch Studio</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors"
            >
              Back to Login
            </Link>
            <button
              onClick={loadAllUsers}
              className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded-xl border border-blue-500/30 transition-colors cursor-pointer"
              title="Reload Users"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Accounts</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">{users.length}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">{approvedCount} Approved</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Admins</span>
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-purple-300 mt-2">{adminCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Full System Authority</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Faculty</span>
              <School className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-black text-sky-300 mt-2">{teacherCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Class Attendance Lecturers</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/60 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Students</span>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-300 mt-2">{studentCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">Across 12 BPUT Branches</div>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "create"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Account Creation Studio</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "users"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master User Accounts ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("quick-switch")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === "quick-switch"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>1-Click Switcher</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: ACCOUNT CREATION STUDIO
            ======================================================== */}
        {activeTab === "create" && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            
            <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Create Any Institutional Account</h2>
                <p className="text-xs text-slate-400 mt-0.5">Create instant Student, Faculty / Teacher, or Admin accounts with custom role attributes</p>
              </div>

              {/* Role Selectors */}
              <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateRole("student")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    createRole === "student"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-slate-200"
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
                      : "text-slate-400 hover:text-slate-200"
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
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              
              {/* Common Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder={createRole === "teacher" ? "Prof. Subrat Das" : createRole === "admin" ? "Dean Academic" : "Rahul Sharma"}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder={`${createRole}@bec.ac.in`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Initial Approval Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="approved">✅ Approved (Instant Access)</option>
                    <option value="pending">⏳ Pending (Requires Admin Approval)</option>
                  </select>
                </div>
              </div>

              {/* Role-Specific Fields */}
              {createRole === "student" && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                    🎓 Student Academic Parameters
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Roll Number</label>
                      <input
                        type="text"
                        placeholder="2201209045"
                        value={form.rollNo}
                        onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Branch</label>
                      <select
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        {DataService.getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Year</label>
                      <select
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        {DataService.getYears().map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Section</label>
                      <select
                        value={form.section}
                        onChange={(e) => setForm({ ...form, section: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        {DataService.getSections().map(s => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Semester</label>
                      <select
                        value={form.semester}
                        onChange={(e) => setForm({ ...form, semester: e.target.value })}
                        className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        {DataService.getSemesters().map(s => <option key={s} value={s}>Sem {s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {createRole === "teacher" && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 block">
                    🏛️ Faculty &amp; Department Details
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Teaching Department</label>
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        {DataService.getDepartments().map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Primary Subject Handled</label>
                      <input
                        type="text"
                        placeholder="e.g. Database Management Systems / Data Structures"
                        value={form.subjectName}
                        onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createRole === "admin" && (
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-400">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400 block">
                    🛡️ Administrator Privileges
                  </span>
                  <p>Admins have unrestricted global access across all 12 BPUT departments, medical exemption booster, student approvals, QR sessions, and reports.</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold rounded-2xl text-sm transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                <span>Create {createRole.toUpperCase()} Account</span>
              </button>

            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: MASTER USER ACCOUNTS ROSTER
            ======================================================== */}
        {activeTab === "users" && (
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">All Registered User Accounts</h2>
                <p className="text-xs text-slate-400">Manage, delete, approve, or instantly switch into any account</p>
              </div>
              <span className="px-3 py-1 bg-slate-800 text-blue-300 text-xs font-mono font-bold rounded-xl border border-slate-700">
                {users.length} Total Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Academic Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          u.role === "admin"
                            ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                            : u.role === "teacher"
                            ? "bg-sky-950 text-sky-300 border border-sky-800/60"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {u.role === "student" ? (
                          <div>
                            <span className="font-mono text-cyan-300 font-bold">{u.rollNo}</span> • {u.branch} ({u.year} Yr Sec-{u.section} Sem {u.semester || "1"})
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
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                          }`}
                          title="Click to toggle status"
                        >
                          {u.status === "approved" ? "✅ Approved" : "⏳ Pending"}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInstantSwitch(u)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Login As</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.uid, u.name)}
                          className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-xl transition-colors cursor-pointer inline-flex items-center"
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
          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Instant 1-Click Master Role Switcher</h2>
              <p className="text-xs text-slate-400">Click any card below to immediately log in and explore their dashboard</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((u) => (
                <div
                  key={u.uid}
                  onClick={() => handleInstantSwitch(u)}
                  className="p-5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      u.role === "admin"
                        ? "bg-purple-950 text-purple-300 border border-purple-800/60"
                        : u.role === "teacher"
                        ? "bg-sky-950 text-sky-300 border border-sky-800/60"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                    }`}>
                      {u.role}
                    </span>

                    <span className={`text-[10px] font-bold ${u.status === "approved" ? "text-emerald-400" : "text-amber-400"}`}>
                      {u.status === "approved" ? "✅ Active" : "⏳ Pending"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      {u.name}
                    </h3>
                    <p className="text-slate-400 font-mono text-xs">{u.email}</p>
                    {u.role === "student" && (
                      <p className="text-xs text-slate-500 mt-1">
                        {u.branch} • {u.year} Yr (Sec {u.section}) • Roll: <span className="font-mono text-slate-300">{u.rollNo}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-blue-400 font-bold">
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
