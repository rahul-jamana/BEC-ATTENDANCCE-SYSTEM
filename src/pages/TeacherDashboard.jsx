import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { ProjectorQRModal } from "../components/ProjectorQRModal";
import { TeacherPhotoModal } from "../components/TeacherPhotoModal";
import { exportAttendancePDF, exportAttendanceExcel, exportTeacherSessionExcel } from "../utils/pdfExporter";
import { 
  QrCode, School, Play, StopCircle, FileText, Download, Users, 
  Sparkles, CheckCircle2, Clock, Filter, BookOpen, Layers, Camera
} from "lucide-react";

export const TeacherDashboard = () => {
  const { userProfile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState(null);

  // Class Selection State
  const [classForm, setClassForm] = useState({
    branch: "CSE",
    year: "2nd",
    section: "A",
    semester: "3",
    subjectId: ""
  });

  const branches = DataService.getDepartments();
  const years = DataService.getYears();
  const sections = DataService.getSections();
  const semesters = DataService.getSemesters();

  const loadTeacherData = async () => {
    const allSubs = await DataService.getSubjects();
    setSubjects(allSubs);

    if (allSubs.length > 0 && !classForm.subjectId) {
      setClassForm(prev => ({ ...prev, subjectId: allSubs[0].id }));
    }

    const allSess = await DataService.getSessions();
    setSessions(allSess);

    const allAtt = await DataService.getAttendance();
    setAttendanceLogs(allAtt);

    // Check if there is an active session ongoing
    const currentActive = allSess.find(s => s.teacherId === userProfile?.uid && s.isActive);
    if (currentActive) {
      setActiveSession(currentActive);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, [userProfile]);

  const bputSubjects = DataService.getBputSubjectsForBranch(classForm.branch, classForm.semester);

  // Step 1: Form submission opens Teacher Photo Capture Modal
  const handleInitiateSession = (e) => {
    e.preventDefault();
    const selectedSub = bputSubjects.find(s => s.code === classForm.subjectId) || subjects.find(s => s.id === classForm.subjectId);
    const initialToken = `tok_${Math.random().toString(36).substring(2, 8)}`;
    const subName = selectedSub ? `${selectedSub.name} (${selectedSub.code || ''})` : (classForm.subjectId || "Class Lecture");

    const sessionPayload = {
      branch: classForm.branch,
      year: classForm.year,
      section: classForm.section,
      semester: classForm.semester,
      subjectId: classForm.subjectId || "SUB101",
      subjectName: subName,
      teacherId: userProfile?.uid || "teacher_01",
      teacherName: userProfile?.name || "Dr. Rajesh Sharma",
      token: initialToken,
      tokenGeneratedAt: Date.now(),
      expiresAt: Date.now() + 600000 // 10 min session duration
    };

    setPendingSessionData(sessionPayload);
    setIsPhotoModalOpen(true);
  };

  // Step 2: Faculty confirms live photo -> create session & launch projector
  const handleTeacherPhotoConfirmed = async (teacherPhotoUrl) => {
    if (!pendingSessionData) return;

    const newSess = await DataService.createSession({
      ...pendingSessionData,
      teacherPhoto: teacherPhotoUrl
    });

    setIsPhotoModalOpen(false);
    setPendingSessionData(null);
    setActiveSession(newSess);
    setIsProjectorOpen(true);
    loadTeacherData();
  };

  const handleEndSession = async (sessionId) => {
    await DataService.endSession(sessionId);
    setActiveSession(null);
    loadTeacherData();
  };

  // Filtered session records for report generation
  const getSessionAttendanceCount = (sessionId) => {
    return attendanceLogs.filter(a => a.sessionId === sessionId).length;
  };

  const handleExportSessionPDF = (sess) => {
    const records = attendanceLogs.filter(a => a.sessionId === sess.id);
    exportAttendancePDF({
      title: `Class Session ${sess.subjectName}`,
      branch: sess.branch,
      year: sess.year,
      section: sess.section,
      semester: sess.semester,
      subject: sess.subjectName,
      records
    });
  };

  const handleExportSessionExcel = (sess) => {
    const records = attendanceLogs.filter(a => a.sessionId === sess.id);
    // Use new teacher Excel with embedded teacher photo + student selfies
    exportTeacherSessionExcel({
      session: sess,
      teacherProfile: userProfile,
      records
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-50 to-blue-100 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Faculty Header Banner */}
        <div className="gradient-header text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-blue-400/30">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Faculty Dashboard
            </span>
            <h1 className="text-3xl font-extrabold">{userProfile?.name}</h1>
            <p className="text-blue-100 text-sm">
              Department: {userProfile?.department || "CSE"} • Faculty Portal &amp; Dynamic QR Class Generator
            </p>
          </div>
        </div>

        {/* Start Class Form Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Start New Class Session</h2>
              <p className="text-xs text-slate-500">Select branch &amp; BPUT subject to generate dynamic 30s rotating QR code</p>
            </div>
          </div>

          <form onSubmit={handleInitiateSession} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* Branch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Branch</label>
                <select
                  value={classForm.branch}
                  onChange={(e) => setClassForm({ ...classForm, branch: e.target.value, subjectId: "" })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Year</label>
                <select
                  value={classForm.year}
                  onChange={(e) => setClassForm({ ...classForm, year: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section</label>
                <select
                  value={classForm.section}
                  onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Semester</label>
                <select
                  value={classForm.semester}
                  onChange={(e) => setClassForm({ ...classForm, semester: e.target.value, subjectId: "" })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {semesters.map(sem => <option key={sem} value={sem}>Sem {sem}</option>)}
                </select>
              </div>

              {/* Subject (Integrated with full BPUT Curriculum) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">BPUT Subject</label>
                <select
                  value={classForm.subjectId}
                  onChange={(e) => setClassForm({ ...classForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Choose Subject --</option>
                  {bputSubjects.map(sub => (
                    <option key={sub.code} value={sub.code}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                  {subjects.filter(s => s.branch === classForm.branch).map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!classForm.subjectId}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md shadow-blue-500/25 flex items-center space-x-2 cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>STEP 1: CAPTURE LIVE PHOTO &amp; START CLASS</span>
              </button>
            </div>
          </form>
        </div>

        {/* Past Class Sessions & Reports Log */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Class Session History &amp; Reports</h2>
              <p className="text-xs text-slate-500">Filter, view, and export past classroom attendance reports</p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-600">
              Total Sessions: {sessions.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Roster (Branch/Yr/Sec)</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Session Date</th>
                  <th className="py-3 px-4">Students Present</th>
                  <th className="py-3 px-4 text-right">Actions / Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No class sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  sessions.slice().reverse().map((sess) => {
                    const count = getSessionAttendanceCount(sess.id);
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {sess.subjectName}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">
                            {sess.branch} | {sess.year} | Sec {sess.section}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">Sem {sess.semester}</td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(sess.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                            <Users className="w-3.5 h-3.5" /> {count} Students
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleExportSessionPDF(sess)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3" /> PDF
                          </button>

                          <button
                            onClick={() => handleExportSessionExcel(sess)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3 h-3" /> Excel
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Teacher Live Photo Verification Modal */}
      <TeacherPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setPendingSessionData(null);
        }}
        onConfirmPhoto={handleTeacherPhotoConfirmed}
        sessionDetails={pendingSessionData}
      />

      {/* Projector Mode Large QR Modal */}
      <ProjectorQRModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
        session={activeSession}
        onEndSession={handleEndSession}
      />
    </div>
  );
};
