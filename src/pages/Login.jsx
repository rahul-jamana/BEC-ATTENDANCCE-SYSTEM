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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-white">
        
        {/* Left Side: Brand & Hero Banner */}
        <div className="gradient-blue-bg text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl"></div>
          
          <div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
              <QrCode className="w-7 h-7 text-white" />
            </div>
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              Smart QR Attendance
            </span>
            <h1 className="text-3xl font-extrabold mt-3 leading-tight">
              Bhubaneswar Engineering College
            </h1>
            <p className="text-blue-100 text-sm mt-3 leading-relaxed">
              Automated, real-time classroom attendance tracking with section matching, dynamic 30s QR rotation, and instant analytics.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex items-center space-x-3 text-xs text-blue-100">
              <UserCheck className="w-4 h-4 text-sky-300" />
              <span>Admin Approved Accounts • Multi-Role Dashboards</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form & Quick Demo Buttons */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Sign In to BEC Portal</h2>
            <p className="text-slate-500 text-xs mt-1">Enter your institutional credentials below</p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="student@bec.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
              >
                <span>{loading ? "Authenticating..." : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-xs text-slate-500">New Student? </span>
              <Link to="/signup" className="text-xs font-bold text-blue-600 hover:underline">
                Create Student Account
              </Link>
            </div>
          </div>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              ⚡ Instant 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickDemo("admin@bec.ac.in")}
                className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Portal</span>
              </button>

              <button
                onClick={() => handleQuickDemo("teacher@bec.ac.in")}
                className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Faculty / Teacher</span>
              </button>

              <button
                onClick={() => handleQuickDemo("rahul@bec.ac.in")}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Student (Rahul)</span>
              </button>

              <button
                onClick={() => handleQuickDemo("amit@bec.ac.in")}
                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
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
