import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { DataService } from "../services/dataService";
import { QrCode, User, Mail, Lock, BookOpen, Clock, ArrowRight } from "lucide-react";

export const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    branch: "CSE",
    year: "2nd",
    section: "A",
    semester: "3",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signupStudent } = useAuth();
  const navigate = useNavigate();

  const branches = DataService.getDepartments();
  const years = DataService.getYears();
  const sections = DataService.getSections();
  const semesters = DataService.getSemesters();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signupStudent(formData);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-sky-100 to-blue-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-blue-200/80 p-8 sm:p-10">
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <img src="/bec-logo.png" alt="Bhubaneswar Engineering College Logo" className="w-11 h-11 object-contain drop-shadow-sm" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Student Self Registration</h2>
            <p className="text-xs text-slate-500">Fill in your academic profile for BEC Attendance portal</p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-amber-900">Registration Pending Approval</h3>
            <p className="text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
              Your account details for <strong>{formData.name}</strong> ({formData.rollNo}) have been submitted to the BEC Administrator for verification.
            </p>
            <div className="p-3 bg-white/80 rounded-xl text-xs text-slate-600 font-mono text-left space-y-1 max-w-sm mx-auto border border-amber-200">
              <div>• Branch: {formData.branch}</div>
              <div>• Academic Roster: Year {formData.year} | Sec {formData.section} | Sem {formData.semester}</div>
              <div>• Status: Pending Admin Verification</div>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Name & Roll No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Rahul Kumar"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  name="rollNo"
                  required
                  placeholder="2201CS045"
                  value={formData.rollNo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Branch, Year, Section, Semester Dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Branch</label>
                <select
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Section</label>
                <select
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Semester</label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {semesters.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                </select>
              </div>
            </div>

            {/* Email & Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="rahul@bec.ac.in"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
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
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20"
            >
              {loading ? "Submitting Registration..." : "Register Account"}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Already registered? </span>
              <Link to="/login" className="text-xs font-bold text-blue-600 hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
