import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { QRScannerModal } from "../components/QRScannerModal";
import { 
  Camera, AlertTriangle, CheckCircle2, BookOpen, GraduationCap, 
  BarChart3, RefreshCw, Sparkles, Award
} from "lucide-react";

export const StudentDashboard = () => {
  const { userProfile, refreshProfile } = useAuth();
  const [stats, setStats] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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

  // Total Cumulative Attendance Calculations
  const totalAttended = stats.reduce((acc, curr) => acc + (curr.attendedClasses || 0), 0);
  const totalClasses = stats.reduce((acc, curr) => acc + (curr.totalClasses || 0), 0);
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;
  const isOverallWarning = overallPercentage < 75;
  const atRiskCount = stats.filter(s => s.isWarning).length;
  const goodStandingCount = stats.filter(s => !s.isWarning).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Student Greeting Banner */}
        <div className="gradient-blue-bg text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  Student Portal
                </span>
                <span className="px-3 py-1 bg-emerald-400/30 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-semibold">
                  Account Approved ✅
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Hi {userProfile?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-blue-100 text-sm font-medium">
                {userProfile?.branch} | {userProfile?.year} Year | Section {userProfile?.section} (Sem {userProfile?.semester}) • Roll: <span className="font-mono text-white font-bold">{userProfile?.rollNo}</span>
              </p>
            </div>

            {/* Big Action Button: SCAN QR CODE */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="w-full md:w-auto px-8 py-4 bg-white text-blue-800 hover:bg-blue-50 font-extrabold text-base rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <span className="tracking-wide">📷 SCAN QR CODE</span>
            </button>
          </div>
        </div>

        {/* --- OVERALL TOTAL ATTENDANCE METRICS BAR --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Overall Attendance % Metric Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Overall Total Attendance
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
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
                className={`h-full transition-all duration-1000 ${isOverallWarning ? 'bg-red-500' : 'bg-blue-600'}`} 
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              ></div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Institutional Status: <span className="font-bold text-slate-800">{isOverallWarning ? "Restricted Exam Risk" : "Eligible for Examinations"}</span>
            </div>
          </div>

          {/* Total Classes Attended Metric Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Classes Attended
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-4">
              <div className="text-3xl font-extrabold text-slate-900">
                {totalAttended} <span className="text-base text-slate-400 font-normal">/ {totalClasses} classes</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total lectures attended across all {stats.length} enrolled subjects.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Section: {userProfile?.branch}-{userProfile?.section}</span>
              <span className="font-mono text-blue-600 font-bold">Sem {userProfile?.semester}</span>
            </div>
          </div>

          {/* Subject Health Summary Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Subject Health Breakdown
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            <div className="my-4 grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <span className="text-2xl font-bold text-emerald-700 block">{goodStandingCount}</span>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Good (&ge;75%)</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-100 rounded-2xl">
                <span className="text-2xl font-bold text-red-700 block">{atRiskCount}</span>
                <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider">Shortage (&lt;75%)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              {atRiskCount > 0 ? `⚠️ Action needed: ${atRiskCount} subject(s) below threshold` : `✨ Great job! All ${stats.length} subjects above 75%`}
            </div>
          </div>

        </div>

        {/* Low Attendance Warning Alert (<75%) */}
        {isOverallWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm flex items-start space-x-4 animate-in fade-in">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900">⚠️ Mandatory Attendance Shortage Warning (&lt;75%)</h3>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Your overall cumulative attendance is <strong>{overallPercentage}%</strong>, which is below the mandatory <strong>75% institutional requirement</strong> for Bhubaneswar Engineering College. Scan QR codes regularly during scheduled lectures to restore your eligibility.
              </p>
            </div>
          </div>
        )}

        {/* Main Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Subject Wise Attendance Breakdown</h2>
            <p className="text-xs text-slate-500">Calculated automatically from total class sessions held for {userProfile?.branch} Sec-{userProfile?.section}</p>
          </div>

          <button
            onClick={fetchStudentStats}
            className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Stats</span>
          </button>
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-40"></div>
            ))}
          </div>
        ) : stats.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-sm">No subject records found for your branch ({userProfile?.branch}).</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.map((sub) => (
              <div
                key={sub.subjectId}
                className={`bg-white rounded-2xl border p-6 transition-all shadow-xs hover:shadow-md relative overflow-hidden ${
                  sub.isWarning ? "border-red-300 ring-2 ring-red-100" : "border-slate-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Code: {sub.code || "SUB"}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{sub.subjectName}</h3>
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

                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
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
                  <span>Status: {sub.isWarning ? "Shortage Risk" : "Good Standing"}</span>
                  <span className="font-mono text-slate-400">Total Held: {sub.totalClasses}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- RECENT SCANNED ATTENDANCE LOG TIMELINE --- */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Recent Attendance Activity Log</h2>
              <p className="text-xs text-slate-500">Verified QR code scan records for {userProfile?.name}</p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              Total Recorded Scans: {attendanceLogs.length}
            </span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs font-medium">
              No QR scans recorded yet. Click "Scan QR Code" above during class to mark attendance!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-semibold bg-slate-50">
                    <th className="py-3 px-4 rounded-l-xl">Subject</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Class Target</th>
                    <th className="py-3 px-4 rounded-r-xl text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {attendanceLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.subjectName || "DBMS"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(log.markedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {log.branch} - {log.year} Yr (Sec {log.section})
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-[11px]">
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
    </div>
  );
};
