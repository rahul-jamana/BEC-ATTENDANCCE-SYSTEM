import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { QrCode, Lock, Mail, ArrowRight, UserCheck, Shield, School, GraduationCap } from "lucide-react";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

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
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="student@bec.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
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

            <div className="mt-3 text-center">
              <span className="text-xs text-slate-500">New Student? </span>
              <Link to="/signup" className="text-xs font-bold text-blue-600 hover:underline">
                Create Student Account
              </Link>
            </div>
          </div>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              ⚡ Instant 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleQuickDemo("admin@bec.ac.in")}
                className="p-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Portal</span>
              </button>

              <button
                onClick={() => handleQuickDemo("teacher@bec.ac.in")}
                className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Faculty / Teacher</span>
              </button>

              <button
                onClick={() => handleQuickDemo("rahul@bec.ac.in")}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Student (Rahul)</span>
              </button>

              <button
                onClick={() => handleQuickDemo("amit@bec.ac.in")}
                className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Pending Student</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
