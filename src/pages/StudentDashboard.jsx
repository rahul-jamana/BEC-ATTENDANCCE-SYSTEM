import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { LibraryService } from "../services/libraryService";
import { QRScannerModal } from "../components/QRScannerModal";
import { exportStudentCompleteExcel, exportClassTotalExcel } from "../utils/pdfExporter";
import { 
  Camera, QrCode, AlertTriangle, CheckCircle2, BookOpen, GraduationCap, 
  BarChart3, RefreshCw, Award, Clock, FileText, HeartPulse, 
  User, Calendar, ShieldCheck, ChevronRight, Download, X,
  Edit3, Save, UserCog, Library, Building2, ArrowLeft, Utensils
} from "lucide-react";

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, updateProfile } = useAuth();
  
  // Active View State: "hub" | "attendance" | "hostel" | "idpass"
  const [activeView, setActiveView] = useState("hub");

  // Attendance & Library States
  const [stats, setStats] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [issuedBooksCount, setIssuedBooksCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [attendanceTab, setAttendanceTab] = useState("subjects"); // "subjects" | "logs"
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Edit Profile Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    name: "", 
    dob: "", 
    gender: "Male", 
    phone: "",
    regNo: "" 
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  const fetchStudentStats = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = await DataService.getStudentSubjectStats(userProfile);
      setStats(data);

      const allAttendance = await DataService.getAttendance();
      const studentLogs = allAttendance
        .filter(a => a.studentId === userProfile.uid || a.rollNo === userProfile.rollNo || (a.tempId && a.tempId === userProfile.tempId))
        .sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));
      setAttendanceLogs(studentLogs);

      // Fetch issued books count
      const allCirculation = await LibraryService.getCirculation();
      const myLoans = allCirculation.filter(
        c => (c.studentId === userProfile.uid || c.studentRoll === userProfile.rollNo) && c.status === "issued"
      );
      if (myLoans.length > 0) {
        setIssuedBooksCount(myLoans.length);
      }
    } catch (e) {
      console.error("Failed to load student data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentStats();
  }, [userProfile]);

  const handleOpenEditProfile = () => {
    setProfileForm({
      name: userProfile?.name || "",
      dob: userProfile?.dob || "",
      gender: userProfile?.gender || "Male",
      phone: userProfile?.phone || "",
      regNo: userProfile?.regNo || ""
    });
    setProfileSuccessMsg("");
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg("");
    try {
      if (updateProfile) {
        await updateProfile(profileForm);
      }
      setProfileSuccessMsg("Profile updated successfully!");
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSuccessMsg("");
      }, 1200);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportMyExcel = () => {
    exportStudentCompleteExcel({
      studentProfile: userProfile,
      stats,
      records: attendanceLogs
    });
  };

  const handleExportClassExcel = async () => {
    const allAttendance = await DataService.getAttendance();
    const classRecords = allAttendance.filter(
      a => a.branch === userProfile?.branch &&
           a.year === userProfile?.year &&
           a.section === userProfile?.section
    );
    exportClassTotalExcel({
      branch: userProfile?.branch,
      year: userProfile?.year,
      section: userProfile?.section,
      semester: userProfile?.semester,
      records: classRecords
    });
  };

  // Cumulative Attendance Calculations
  const totalAttended = stats.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const totalClasses = stats.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 86;
  const isOverallWarning = overallPercentage < 75;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ========================================================
            TOP GREETING BANNER (COMMON FOR ALL VIEWS)
            ======================================================== */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-800/40">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Student Portal
                </span>
                <span className="px-3 py-1 bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Active Student
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Hi, {userProfile?.name || "Student"} 👋
              </h1>
              
              <div className="text-blue-200 text-xs sm:text-sm font-medium flex items-center gap-2 flex-wrap">
                <span>{userProfile?.branch || "Engineering"} • {userProfile?.year || "1st"} Year • Sec {userProfile?.section || "A"} (Sem {userProfile?.semester || "1"})</span>
                <span className="text-white font-mono font-bold bg-white/20 px-2 py-0.5 rounded border border-white/20">
                  {userProfile?.regNo ? `Reg No: ${userProfile.regNo}` : `Roll: ${userProfile?.rollNo || userProfile?.tempId || "2401211001"}`}
                </span>
              </div>
            </div>

            {/* Quick Profile Edit & Refresh */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEditProfile}
                className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
              <button
                onClick={fetchStudentStats}
                className="p-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded-xl text-xs font-bold flex items-center justify-center backdrop-blur-md cursor-pointer transition-all"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

          </div>
        </div>

        {/* ========================================================
            VIEW 1: MAIN CAMPUS HUB (LANDING PAGE WITH SERVICE CARDS)
            ======================================================== */}
        {activeView === "hub" && (
          <div className="space-y-6 animate-in fade-in">
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Campus Services</h2>
                <p className="text-xs text-slate-500">Select any service to view details and use its tools.</p>
              </div>
            </div>

            {/* Core Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* 1. ATTENDANCE CARD */}
              <div 
                onClick={() => setActiveView("attendance")}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Award className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Live
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      Attendance Portal
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Classroom live camera QR scanner, subject breakdown &amp; Excel sheets.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Current Total:</span>
                    <span className={`text-lg font-black ${isOverallWarning ? 'text-red-600' : 'text-emerald-700'}`}>
                      {overallPercentage}%
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>Open Attendance Tools</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 2. CENTRAL LIBRARY CARD */}
              <div 
                onClick={() => navigate("/library")}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      No Dues
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Central Library
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Search book catalog, check return due dates, and digital pass.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Issued Books:</span>
                    <span className="text-lg font-black text-slate-900">
                      {issuedBooksCount} Active
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span>Open Library Portal</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* 3. HOSTEL CARD */}
              <div 
                onClick={() => setActiveView("hostel")}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Block A
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                      Hostel &amp; Mess
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Room allocation, warden contacts, daily dining timings and schedule.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">Allocated Room:</span>
                    <span className="text-lg font-black text-blue-700">
                      Room 204
                    </span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                  <span>Open Hostel Info</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            VIEW 2: INDIVIDUAL ATTENDANCE PAGE
            ======================================================== */}
        {activeView === "attendance" && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveView("hub")}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Campus Hub</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAttendanceTab("subjects")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    attendanceTab === "subjects" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Subjects
                </button>
                <button
                  onClick={() => setAttendanceTab("logs")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    attendanceTab === "logs" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  Activity Logs
                </button>
              </div>
            </div>

            {/* Attendance Overview Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Cumulative Classroom Attendance
                </span>
                <div className="flex items-baseline justify-center md:justify-start space-x-3">
                  <span className={`text-4xl sm:text-5xl font-extrabold ${isOverallWarning ? 'text-red-600' : 'text-slate-900'}`}>
                    {overallPercentage}%
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isOverallWarning ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {isOverallWarning ? '⚠️ Below 75% BPUT Limit' : '✅ Eligible for Exams'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Attended <strong>{totalAttended}</strong> out of <strong>{totalClasses}</strong> total lecture sessions.
                </p>
              </div>

              {/* Action Buttons: Scan QR & Export Excel */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex-1 md:flex-none px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>SCAN QR CODE</span>
                </button>

                <button
                  onClick={handleExportMyExcel}
                  className="px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>My Excel</span>
                </button>
              </div>
            </div>

            {/* Attendance Tab 1: Subject Breakdown */}
            {attendanceTab === "subjects" && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Enrolled Subjects ({stats.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stats.map((sub) => (
                    <div
                      key={sub.subjectId}
                      className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                        sub.isWarning ? "border-red-300" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                            {sub.code || "SUB"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{sub.subjectName}</h4>
                        </div>
                        <span className={`text-xs font-black ${sub.isWarning ? "text-red-600" : "text-emerald-700"}`}>
                          {sub.percentage}% {sub.isWarning ? "⚠️" : "✅"}
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3">
                        <div
                          className={`h-full rounded-full ${sub.isWarning ? "bg-red-500" : "bg-blue-600"}`}
                          style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500 mt-2">
                        <span>Attended: <strong>{sub.attendedClasses} / {sub.totalClasses}</strong></span>
                        <span>{sub.isWarning ? "Shortage Risk" : "Good Standing"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attendance Tab 2: Activity Logs */}
            {attendanceTab === "logs" && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Attendance Scan History ({attendanceLogs.length})
                </h3>

                {attendanceLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No attendance scans recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                          <th className="pb-2">Subject</th>
                          <th className="pb-2">Time</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-bold text-slate-900">{log.subjectName}</td>
                            <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                              {new Date(log.markedAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 text-right font-bold text-emerald-600">✅ Present</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            VIEW 3: INDIVIDUAL HOSTEL PAGE
            ======================================================== */}
        {activeView === "hostel" && (
          <div className="space-y-6 animate-in fade-in">
            
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <button
                onClick={() => setActiveView("hub")}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Campus Hub</span>
              </button>
            </div>

            {/* Room Allocation Info */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Hostel Allocation Details</h3>
                  <p className="text-xs text-slate-500">Bhubaneswar Engineering College Residential Campus</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  Room Allocated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hostel Block</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">Block-A (Boys Hostel)</div>
                  <span className="text-[11px] text-slate-500">2nd Floor</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Room Number</span>
                  <div className="text-sm font-extrabold text-blue-700 mt-0.5">Room 204</div>
                  <span className="text-[11px] text-slate-500">Bed 2</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hostel Warden</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">Prof. B. K. Jena</div>
                  <span className="text-[11px] text-slate-500">📞 +91 94370 12345</span>
                </div>
              </div>
            </div>

            {/* Mess Dining Schedule */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold text-slate-900">Mess Dining Timings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <span className="font-bold text-amber-900 block">☕ Morning Breakfast</span>
                  <span className="text-slate-700 font-semibold mt-1 block">07:30 AM – 09:00 AM</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">🍲 Afternoon Lunch</span>
                  <span className="text-slate-700 font-semibold mt-1 block">12:30 PM – 02:00 PM</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                  <span className="font-bold text-indigo-900 block">🍛 Night Dinner</span>
                  <span className="text-slate-700 font-semibold mt-1 block">08:00 PM – 09:30 PM</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        studentProfile={userProfile}
        onSuccess={() => {
          fetchStudentStats();
        }}
      />

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-sm font-black text-slate-900">Edit Profile Details</h4>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                {profileSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">BPUT Permanent Reg No</label>
                <input
                  type="text"
                  placeholder="e.g. 2401211001"
                  value={profileForm.regNo}
                  onChange={(e) => setProfileForm({ ...profileForm, regNo: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
