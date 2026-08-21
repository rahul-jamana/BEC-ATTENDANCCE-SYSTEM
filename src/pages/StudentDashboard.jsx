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
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchStudentStats = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = await DataService.getStudentSubjectStats(userProfile);
      setStats(data);
    } catch (e) {
      console.error("Failed to load subject statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentStats();
  }, [userProfile]);

  const hasLowAttendance = stats.some(s => s.isWarning);

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

        {/* Low Attendance Warning Alert (<75%) */}
        {hasLowAttendance && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm flex items-start space-x-4 animate-in fade-in">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900">⚠️ Low Attendance Warning (&lt;75%)</h3>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                Your attendance in one or more subjects is currently below the mandatory <strong>75% institutional threshold</strong>. Please scan class QR codes regularly to avoid exam eligibility restriction.
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
            className="p-2 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors text-xs font-semibold flex items-center space-x-1"
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
