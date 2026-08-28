import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { QrCode, Lock, Mail, ArrowRight, UserCheck, Shield, School, GraduationCap, Eye, EyeOff } from "lucide-react";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, demoLogin, userProfile, role, status } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
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
      const user = await login(email, password);
      redirectUserRole(user.role, user.status);
    } catch (err) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setError("");
    setLoading(true);
    try {
      const user = await demoLogin(demoEmail);
      redirectUserRole(user.role, user.status);
    } catch (err) {
      setError(err.message || "Demo login failed.");
    } finally {
      setLoading(false);
    }
  };

  const redirectUserRole = (role, status) => {
    if (status === "pending") {
      navigate("/pending");
      return;
    }
    switch (role) {
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
    <div className="min-h-screen lg:h-screen bg-gradient-to-br from-blue-200 via-sky-100 to-blue-100 flex items-center justify-center p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-blue-200/80 bg-white max-h-[92vh]">
        
        {/* Left Side: Brand & Hero Banner with Campus Background */}
        <div 
          className="text-white p-6 sm:p-8 flex flex-col justify-end relative overflow-hidden bg-cover bg-center shadow-inner min-h-[260px] md:min-h-full"
          style={{ 
            backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.15) 0%, rgba(15, 23, 42, 0.75) 100%), url('/bec-campus.jpg')` 
          }}
        >
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex items-center space-x-3 bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/20 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-xl flex items-center justify-center ring-2 ring-white/50 shrink-0">
              <img src="/bec-logo.png" alt="Bhubaneswar Engineering College Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                Bhubaneswar Engineering College
              </h1>
              <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-widest block mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                BEC Portal
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form & Quick Demo Buttons */}
        <div className="p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Sign In to BEC Portal</h2>
            <p className="text-slate-500 text-xs mt-0.5">Enter your institutional credentials below</p>

            {error && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email, Student ID / Roll No, or Reg No
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="name@bec.ac.in or BEC26002"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    DOB (YYYY-MM-DD) for students
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="e.g. 2004-06-18 or account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Authenticating..." : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-xs font-bold text-blue-700 tracking-wide uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                ✨ Welcome to BEC
              </span>
            </div>
          </div>

          {/* Clean Institutional Security & Support Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-slate-600">BEC Secure Attendance</span>
            </div>
            <span>BPUT Affiliated</span>
          </div>

        </div>

      </div>
    </div>
  );
};
