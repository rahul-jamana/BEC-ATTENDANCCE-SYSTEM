import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap, School, Shield, ArrowRight,
  Lock, User, Eye, EyeOff, AlertCircle
} from "lucide-react";

export const Login = () => {
  // Selected portal: "student" | "teacher" | "admin"
  const [selectedRole, setSelectedRole] = useState("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, userProfile, role, status } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to appropriate role dashboard
  useEffect(() => {
    if (userProfile && role) {
      redirectUserRole(role, status);
    }
  }, [userProfile, role, status]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(identifier.trim(), password.trim());
      redirectUserRole(user.role, user.status);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  const redirectUserRole = (userRole, userStatus) => {
    if (userStatus === "pending") {
      navigate("/pending");
      return;
    }
    switch (userRole) {
      case "admin":
        navigate("/admin");
        break;
      case "teacher":
        navigate("/teacher");
        break;
      case "student":
        navigate("/student");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col justify-between bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.55) 0%, rgba(30, 58, 138, 0.45) 50%, rgba(15, 23, 42, 0.65) 100%), url('/bec-campus.jpg')`
      }}
    >
      {/* Top Banner / Navbar */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-white/20 py-3 px-4 sm:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 border border-slate-200 shadow-xs flex items-center justify-center">
              <img src="/bec-logo.png" alt="BEC Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-blue-950 tracking-tight leading-tight">
                BHUBANESWAR ENGINEERING COLLEGE
              </h1>
              <p className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
                Autonomous Institution • BPUT Affiliated
              </p>
            </div>
          </div>

          <Link
            to="/signup"
            className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs"
          >
            New Student? Register
          </Link>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
        <div className="max-w-2xl w-full bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 overflow-hidden relative z-10">
          
          {/* 3 Top Role Selector Tabs */}
          <div className="p-4 sm:p-6 pb-2 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              
              {/* Student Tab */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("student");
                  setError("");
                }}
                className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all cursor-pointer text-left ${
                  selectedRole === "student"
                    ? "bg-white text-blue-900 shadow-md ring-2 ring-blue-500 border border-blue-100"
                    : "text-slate-600 hover:text-blue-800 hover:bg-white/60"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === "student" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-extrabold leading-tight">Student</div>
                  <div className="text-[10px] text-slate-500 font-medium">Roll No &amp; DOB</div>
                </div>
              </button>

              {/* Teacher Tab */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("teacher");
                  setError("");
                }}
                className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all cursor-pointer text-left ${
                  selectedRole === "teacher"
                    ? "bg-white text-blue-900 shadow-md ring-2 ring-blue-500 border border-blue-100"
                    : "text-slate-600 hover:text-blue-800 hover:bg-white/60"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === "teacher" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  <School className="w-5 h-5" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-extrabold leading-tight">Teacher</div>
                  <div className="text-[10px] text-slate-500 font-medium">Faculty Email</div>
                </div>
              </button>

              {/* Admin Tab */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("admin");
                  setError("");
                }}
                className={`flex items-center justify-center sm:justify-start gap-2.5 p-3 rounded-xl transition-all cursor-pointer text-left ${
                  selectedRole === "admin"
                    ? "bg-white text-blue-900 shadow-md ring-2 ring-blue-500 border border-blue-100"
                    : "text-slate-600 hover:text-blue-800 hover:bg-white/60"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRole === "admin" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-extrabold leading-tight">Admin</div>
                  <div className="text-[10px] text-slate-500 font-medium">Master Console</div>
                </div>
              </button>

            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 sm:pt-6">
            
            {/* Header / Title */}
            <div className="text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {selectedRole === "student" && "🎓 STUDENT PORTAL LOGIN"}
                {selectedRole === "teacher" && "👨‍🏫 FACULTY PORTAL LOGIN"}
                {selectedRole === "admin" && "👑 ADMIN CONSOLE LOGIN"}
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Sign in to {selectedRole === "student" ? "Student Portal" : selectedRole === "teacher" ? "Faculty Portal" : "Admin Portal"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Access Attendance, Central Library, Notes, and ID Pass.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {selectedRole === "student" ? "Roll Number / Registration No / Email *" : "Email Address *"}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-blue-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={
                      selectedRole === "student"
                        ? "e.g. 2401211001 or student@bec.ac.in"
                        : "e.g. teacher@bec.ac.in"
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-slate-50/70 rounded-2xl border border-slate-200 font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {selectedRole === "student" ? "Password (or Date of Birth YYYY-MM-DD) *" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-blue-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 text-xs sm:text-sm bg-slate-50/70 rounded-2xl border border-slate-200 font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Royal Blue Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Enter {selectedRole === "student" ? "Student Hub" : selectedRole === "teacher" ? "Faculty Hub" : "Admin Hub"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Login Credentials */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2.5 text-xs text-slate-500 font-medium">
              <span>Quick Login:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("student");
                  setIdentifier("2401211001");
                  setPassword("2006-05-12");
                }}
                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold border border-blue-200/80 transition-colors cursor-pointer"
              >
                Sample Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole("admin");
                  setIdentifier("admin@bec.ac.in");
                  setPassword("admin123");
                }}
                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold border border-blue-200/80 transition-colors cursor-pointer"
              >
                Admin
              </button>
            </div>

            {/* Mobile Register Link */}
            <div className="sm:hidden text-center mt-4">
              <Link to="/signup" className="text-xs font-bold text-blue-600 hover:underline">
                New Student? Register Here
              </Link>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/90 backdrop-blur-md border-t border-white/20 py-3 px-4 text-center text-xs text-slate-700 font-semibold shadow-inner">
        Bhubaneswar Engineering College • Unified Campus Portal • Attendance • Central Library • Hostel &amp; Mess
      </footer>
    </div>
  );
};
