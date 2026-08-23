import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { QRScannerModal } from "../components/QRScannerModal";
import { exportStudentCompleteExcel, exportClassTotalExcel } from "../utils/pdfExporter";
import { 
  Camera, QrCode, AlertTriangle, CheckCircle2, BookOpen, GraduationCap, 
  BarChart3, RefreshCw, Sparkles, Award, Clock, FileText, HeartPulse, 
  User, Calendar, ShieldCheck, ChevronRight, Layers, TrendingUp, Download, X
} from "lucide-react";

export const StudentDashboard = () => {
  const { userProfile, refreshProfile } = useAuth();
  const [stats, setStats] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "subjects" | "logs"
  const [previewPhoto, setPreviewPhoto] = useState(null);

  const fetchStudentStats = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = await DataService.getStudentSubjectStats(userProfile);
      setStats(data);

      const allAttendance = await DataService.getAttendance();
      const studentLogs = allAttendance
        .filter(a => a.studentId === userProfile.uid || a.rollNo === userProfile.rollNo)
        .sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));
      setAttendanceLogs(studentLogs);
    } catch (e) {
      console.error("Failed to load subject statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentStats();
  }, [userProfile]);

  const handleExportMyExcel = () => {
    exportStudentCompleteExcel({
      studentProfile,
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

  // Total Cumulative Attendance Calculations
  const totalAttended = stats.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const totalClasses = stats.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const isOverallWarning = overallPercentage < 75;
  const atRiskCount = stats.filter(s => s.isWarning).length;
  const goodStandingCount = stats.filter(s => !s.isWarning).length;
  const medicalExemptionsCount = attendanceLogs.filter(l => l.medicalExemption || l.markedByAdmin).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-50 to-blue-100 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* ========================================================
            HERO GREETING BANNER & INSTANT SCAN QR PROMINENT ACTION
            ======================================================== */}
        <div className="gradient-header text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-400/30">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Student Portal
                </span>
                <span className="px-3 py-1 bg-emerald-400/30 text-emerald-100 border border-emerald-400/40 rounded-full text-xs font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Account Verified &amp; Active
                </span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Hi, {userProfile?.name?.split(" ")[0]} 👋
              </h1>
              
              <p className="text-blue-100 text-sm font-medium">
                {userProfile?.branch} Engineering • {userProfile?.year} Year • Section {userProfile?.section} (Sem {userProfile?.semester}) • Roll: <span className="font-mono text-white font-bold bg-white/15 px-2 py-0.5 rounded-md">{userProfile?.rollNo}</span>
              </p>
            </div>

            {/* SUPER PROMINENT SCAN QR CODE & EXCEL DOWNLOAD BUTTONS */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-8 py-5 bg-white hover:bg-blue-50 text-blue-900 font-black text-base sm:text-lg rounded-2xl shadow-2xl shadow-blue-950/40 transition-all hover:scale-105 hover:shadow-cyan-400/30 flex items-center justify-center space-x-3 cursor-pointer group ring-4 ring-white/30"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-widest leading-none">Instant Attendance</div>
                  <div className="text-base sm:text-xl font-extrabold tracking-wide">SCAN QR CODE</div>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping ml-2"></div>
              </button>

              <button
                onClick={handleExportMyExcel}
                className="px-5 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl border border-emerald-400 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                title="Download My Personal Attendance Excel Sheet"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">My Excel</span>
              </button>

              <button
                onClick={fetchStudentStats}
                className="px-3.5 py-4 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-2xl border border-white/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Refresh Statistics"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Low Attendance Warning Alert (<75%) */}
        {isOverallWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 shadow-sm flex items-start space-x-4 animate-in fade-in">
            <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <span>⚠️ Mandatory Attendance Shortage Alert (&lt;75%)</span>
                <span className="text-xs bg-red-200 text-red-900 px-2.5 py-0.5 rounded-full font-extrabold">{overallPercentage}% Current</span>
              </h3>
              <p className="text-xs text-red-700 leading-relaxed">
                Your cumulative attendance is currently <strong>{overallPercentage}%</strong>, below the required <strong>75% BPUT exam eligibility threshold</strong>. Please scan QR codes in every ongoing lecture or contact the administrator if you have medical exemptions.
              </p>
            </div>
          </div>
        )}

        {/* ========================================================
            SIDEBAR & MAIN CONTENT LAYOUT
            ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ==========================================
              LEFT SIDEBAR: NAVIGATION & QUICK STATS
              ========================================== */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Navigation Menu Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-4 sm:p-5 shadow-sm border border-blue-100 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1 block">
                Dashboard Menu
              </span>

              {/* Tab 1: Overview */}
              <button
                onClick={() => setActiveTab("overview")}
                className={`w-full px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-4 h-4" />
                  <span>Overview &amp; Metrics</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "overview" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                }`}>
                  {overallPercentage}%
                </span>
              </button>

              {/* Tab 2: Subject-Wise Attendance */}
              <button
                onClick={() => setActiveTab("subjects")}
                className={`w-full px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "subjects"
                    ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-4 h-4" />
                  <span>Subject Wise Attendance</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "subjects" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                }`}>
                  {stats.length} Subs
                </span>
              </button>

              {/* Tab 3: Active Activity Logs */}
              <button
                onClick={() => setActiveTab("logs")}
                className={`w-full px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  activeTab === "logs"
                    ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                    : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4" />
                  <span>Active Activity Logs</span>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "logs" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                }`}>
                  {attendanceLogs.length}
                </span>
              </button>
            </div>

            {/* Sidebar Quick Scanner CTA Card */}
            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-3xl p-5 shadow-lg border border-blue-400/30 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Classroom QR Scanner</h4>
                  <p className="text-[11px] text-blue-200">Live camera scan</p>
                </div>
              </div>
              <p className="text-xs text-blue-100 leading-relaxed">
                In class right now? Open camera scanner to record your attendance instantly.
              </p>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full py-3 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-blue-700" />
                <span>Open Scanner</span>
              </button>
            </div>

            {/* Sidebar Excel Export Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-emerald-200 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Excel Reports (.xlsx)</h4>
                  <p className="text-[11px] text-slate-500">Download official sheets</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export complete subject breakdown &amp; total class attendance roster in Excel format.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleExportMyExcel}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>My Attendance Excel</span>
                </button>
                <button
                  onClick={handleExportClassExcel}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-600" />
                  <span>Total Class Roster Excel</span>
                </button>
              </div>
            </div>

            {/* Sidebar Student Academic Profile Summary */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-sm border border-blue-100 space-y-3 text-xs">
              <h4 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2">Academic Profile</h4>
              <div className="space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Branch:</span>
                  <span className="font-bold text-slate-800">{userProfile?.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Year / Section:</span>
                  <span className="font-bold text-slate-800">{userProfile?.year} Yr / Sec {userProfile?.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Semester:</span>
                  <span className="font-mono font-bold text-blue-700">Sem {userProfile?.semester || "1"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Roll No:</span>
                  <span className="font-mono font-bold text-slate-900">{userProfile?.rollNo}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-400">Exemptions:</span>
                  <span className="font-bold text-emerald-700">{medicalExemptionsCount} Medical/Admin</span>
                </div>
              </div>
            </div>

          </div>

          {/* ==========================================
              RIGHT MAIN AREA: DYNAMIC TAB PANELS
              ========================================== */}
          <div className="lg:col-span-3 space-y-6">

            {/* ----------------------------------------------------
                TAB 1: OVERVIEW & KEY STAT CARDS
                ---------------------------------------------------- */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* Metric 1: Overall % */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-blue-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Attendance
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <div className="my-4 flex items-baseline space-x-3">
                      <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${isOverallWarning ? 'text-red-600' : 'text-slate-900'}`}>
                        {overallPercentage}%
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isOverallWarning ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {isOverallWarning ? '⚠️ Below 75%' : '✅ Good Standing'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-3">
                      <div 
                        className={`h-full transition-all duration-1000 ${isOverallWarning ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-sky-400'}`} 
                        style={{ width: `${Math.min(overallPercentage, 100)}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                      Exam Status: <span className="font-bold text-slate-800">{isOverallWarning ? "⚠️ Ineligible for Exams" : "✅ Eligible for Exams"}</span>
                    </div>
                  </div>

                  {/* Metric 2: Classes Count */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-blue-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Lectures Attended
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="my-4">
                      <div className="text-3xl font-extrabold text-slate-900">
                        {totalAttended} <span className="text-base text-slate-400 font-normal">/ {totalClasses} classes</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Across all {stats.length} subjects in Semester {userProfile?.semester || "1"}.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>Missed: <strong>{Math.max(0, totalClasses - totalAttended)} classes</strong></span>
                      <span className="font-mono text-blue-700 font-bold">BPUT Standard</span>
                    </div>
                  </div>

                  {/* Metric 3: Subject Health */}
                  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-blue-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Subject Health
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="my-4 grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                        <span className="text-2xl font-bold text-emerald-700 block">{goodStandingCount}</span>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Safe (&ge;75%)</span>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                        <span className="text-2xl font-bold text-red-700 block">{atRiskCount}</span>
                        <span className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Shortage (&lt;75%)</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                      {atRiskCount > 0 ? `⚠️ ${atRiskCount} subject(s) require attendance` : `✨ All ${stats.length} subjects compliant`}
                    </div>
                  </div>

                </div>

                {/* Quick Subject Highlights */}
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Enrolled Subjects Snapshot</h3>
                      <p className="text-xs text-slate-500">Fast preview of your subjects &amp; attendance percentage</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("subjects")}
                      className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Detailed Breakdown</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stats.map((sub) => (
                      <div
                        key={sub.subjectId}
                        className={`p-4 rounded-2xl border transition-all ${
                          sub.isWarning ? "bg-red-50/50 border-red-200" : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {sub.code}
                          </span>
                          <span className={`text-xs font-extrabold ${sub.isWarning ? "text-red-700" : "text-emerald-700"}`}>
                            {sub.percentage}% {sub.isWarning ? "⚠️" : "✅"}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5">{sub.subjectName}</h4>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${sub.isWarning ? "bg-red-500" : "bg-blue-600"}`}
                            style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ----------------------------------------------------
                TAB 2: DETAILED SUBJECT-WISE BREAKDOWN
                ---------------------------------------------------- */}
            {activeTab === "subjects" && (
              <div className="space-y-6">
                
                <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-blue-100 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">Subject Wise Attendance Breakdown</h2>
                      <p className="text-xs text-slate-500">Calculated automatically from total class sessions held for {userProfile?.branch} Sec-{userProfile?.section}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleExportMyExcel}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
                      </button>
                      <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold">
                        {stats.length} Subjects Enrolled
                      </span>
                    </div>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-pulse h-40"></div>
                      ))}
                    </div>
                  ) : stats.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 space-y-2">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-sm">No subjects found for your branch ({userProfile?.branch}).</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {stats.map((sub) => (
                        <div
                          key={sub.subjectId}
                          className={`bg-white rounded-3xl border p-6 transition-all shadow-xs hover:shadow-md relative overflow-hidden ${
                            sub.isWarning ? "border-red-300 ring-2 ring-red-100" : "border-slate-200"
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wider inline-block">
                                Code: {sub.code || "SUB"}
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 mt-1.5">{sub.subjectName}</h3>
                            </div>

                            {sub.isWarning ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> {sub.percentage}% ⚠️
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {sub.percentage}% ✅
                              </span>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-5 space-y-2">
                            <div className="flex justify-between text-xs text-slate-600 font-medium">
                              <span>Classes Attended</span>
                              <span className="font-bold text-slate-900">
                                {sub.attendedClasses} / {sub.totalClasses}
                              </span>
                            </div>

                            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-1000 ${
                                  sub.isWarning ? "bg-gradient-to-r from-red-500 to-amber-500" : "bg-gradient-to-r from-blue-600 to-sky-400"
                                }`}
                                style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <span>Status: <strong className={sub.isWarning ? "text-red-700" : "text-emerald-700"}>{sub.isWarning ? "Shortage Risk" : "Exam Eligible"}</strong></span>
                            <span className="font-mono text-slate-400">Total Held: {sub.totalClasses}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ----------------------------------------------------
                TAB 3: ACTIVE ATTENDANCE ACTIVITY LOGS
                ---------------------------------------------------- */}
            {activeTab === "logs" && (
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Active Attendance Logs &amp; QR History</h2>
                    <p className="text-xs text-slate-500">Chronological timeline of all verified lecture attendance for {userProfile?.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleExportMyExcel}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel Log
                    </button>
                    <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold">
                      Total Logs: {attendanceLogs.length}
                    </span>
                  </div>
                </div>

                {attendanceLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-medium space-y-3">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No attendance activity recorded yet.</p>
                    <p className="text-slate-400">Click "Scan QR Code" during your lectures to start logging attendance!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-blue-50/60 border-y border-blue-100 text-[11px] font-bold text-slate-600 uppercase">
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Date &amp; Time</th>
                          <th className="py-3 px-4">Class Target</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {attendanceLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div className="flex items-center space-x-2">
                                {log.livePhoto && (
                                  <img
                                    src={log.livePhoto}
                                    alt="Live Selfie"
                                    onClick={() => setPreviewPhoto(log.livePhoto)}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-xs cursor-pointer hover:scale-110 transition-transform shrink-0"
                                    title="Click to preview verified selfie"
                                  />
                                )}
                                <span>{log.subjectName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                              {new Date(log.markedAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {log.branch} {log.year} (Sec {log.section})
                            </td>
                            <td className="py-3.5 px-4">
                              {log.medicalExemption ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                                  <HeartPulse className="w-3 h-3 text-rose-600" /> Medical
                                </span>
                              ) : log.markedByAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
                                  <QrCode className="w-3 h-3 text-blue-600" /> QR Scan {log.livePhoto ? "📸" : ""}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

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

      {/* Live Photo Lightbox Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="bg-white p-5 rounded-3xl max-w-sm w-full space-y-4 relative border border-slate-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-slate-900 text-sm">Verified Live Selfie Photo</h4>
              </div>
              <button onClick={() => setPreviewPhoto(null)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-[340px] flex items-center justify-center">
              <img src={previewPhoto} alt="Live Selfie Full View" className="w-full h-auto max-h-[340px] object-contain" />
            </div>

            <div className="text-center space-y-0.5">
              <p className="text-xs font-extrabold text-emerald-700">✅ Biometric Live Verification Complete</p>
              <p className="text-[11px] text-slate-400 font-mono">Cloudinary CDN Secured URL</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
