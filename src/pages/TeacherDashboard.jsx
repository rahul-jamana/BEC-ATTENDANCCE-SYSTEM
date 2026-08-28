import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { ProjectorQRModal } from "../components/ProjectorQRModal";
import { TeacherPhotoModal } from "../components/TeacherPhotoModal";
import { TeacherManualAttendanceModal } from "../components/TeacherManualAttendanceModal";
import { exportAttendancePDF, exportAttendanceExcel, exportTeacherSessionExcel } from "../utils/pdfExporter";
import { 
  QrCode, School, Play, StopCircle, FileText, Download, Users, 
  Sparkles, CheckCircle2, Clock, Filter, BookOpen, Layers, Camera,
  Trash2, Edit3, Save, X, UserCog, Calendar, UserCheck
} from "lucide-react";

export const TeacherDashboard = () => {
  const { userProfile, updateProfile } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSessionTarget, setManualSessionTarget] = useState(null);
  const [pendingSessionData, setPendingSessionData] = useState(null);

  // Subject-wise and Date-wise filter state
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");

  // Edit Profile modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", department: "CSE", email: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Class Selection State (default 1st Year Sem 1)
  const [classForm, setClassForm] = useState({
    branch: "CSE",
    year: "1st",
    section: "A",
    semester: "1",
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
  const handleInitiateSession = async (e) => {
    e.preventDefault();
    const selectedSub = bputSubjects.find(s => s.code === classForm.subjectId) || subjects.find(s => s.id === classForm.subjectId);
    const initialToken = `tok_${Math.random().toString(36).substring(2, 8)}`;
    const subName = selectedSub ? `${selectedSub.name} (${selectedSub.code || ''})` : (classForm.subjectId || "Class Lecture");

    // End any previous active session for this teacher so old QR code is invalidated
    if (activeSession?.id) {
      await DataService.endSession(activeSession.id);
    }

    const sessionPayload = {
      branch: classForm.branch,
      year: classForm.year,
      section: classForm.section,
      semester: classForm.semester,
      subjectId: classForm.subjectId || "SUB101",
      subjectName: subName,
      teacherId: userProfile?.uid || "teacher_01",
      teacherName: userProfile?.name || "Faculty",
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

  // Delete a class session
  const handleDeleteSession = async (sessionId, subjectName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the class session record for "${subjectName}"?\n\nThis will permanently remove the session and its attendance logs.`
    );
    if (!confirmed) return;

    try {
      await DataService.deleteSession(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      await loadTeacherData();
    } catch (e) {
      alert("Failed to delete session: " + e.message);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    setProfileForm({
      name: userProfile?.name || "",
      department: userProfile?.department || "CSE",
      email: userProfile?.email || ""
    });
    setProfileSuccessMsg("");
    setIsEditProfileOpen(true);
  };

  // Save Edited Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        department: profileForm.department.trim(),
        email: profileForm.email.trim()
      });
      setProfileSuccessMsg("✅ Profile updated successfully!");
      setTimeout(() => {
        setIsEditProfileOpen(false);
      }, 1000);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Filtered session records for report generation
  const getSessionAttendanceCount = (sessionId) => {
    return attendanceLogs.filter(a => a.sessionId === sessionId).length;
  };

  const handleExportSessionPDF = async (sess) => {
    const records = attendanceLogs.filter(a => a.sessionId === sess.id);
    await exportAttendancePDF({
      title: `Class Session ${sess.subjectName}`,
      branch: sess.branch,
      year: sess.year,
      section: sess.section,
      semester: sess.semester,
      subject: sess.subjectName,
      records,
      session: sess
    });
  };

  const handleExportSessionExcel = (sess) => {
    const records = attendanceLogs.filter(a => a.sessionId === sess.id);
    exportTeacherSessionExcel({
      session: sess,
      teacherProfile: userProfile,
      records
    });
  };

  // Distinct list of subjects from all recorded sessions
  const distinctSubjects = Array.from(
    new Set(sessions.map(s => s.subjectName).filter(Boolean))
  );

  // Filter sessions by selected subject & date
  const filteredSessions = sessions.filter(sess => {
    if (selectedSubjectFilter !== "all") {
      const matchSub = sess.subjectName === selectedSubjectFilter || sess.subjectId === selectedSubjectFilter;
      if (!matchSub) return false;
    }
    if (selectedDateFilter) {
      const sessDate = sess.createdAt || sess.startedAt;
      if (!sessDate) return false;
      const dStr = new Date(sessDate).toISOString().split("T")[0];
      if (dStr !== selectedDateFilter) return false;
    }
    return true;
  });

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

          <button
            onClick={handleOpenEditProfile}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center space-x-2 backdrop-blur-md cursor-pointer hover:scale-105"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Active Session Live Alert Banner (if a class is currently open) */}
        {activeSession && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center space-x-3.5">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    Live Session Ongoing
                  </span>
                  <span className="text-xs font-mono opacity-90">
                    {activeSession.branch} • {activeSession.year} Year • Sec {activeSession.section} (Sem {activeSession.semester})
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold mt-0.5">
                  {activeSession.subjectName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
              <button
                onClick={() => {
                  setManualSessionTarget(activeSession);
                  setIsManualModalOpen(true);
                }}
                className="flex-1 md:flex-none px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-blue-400"
                title="Manually mark attendance if student QR scanner fails"
              >
                <UserCheck className="w-4 h-4" />
                <span>Manual Attendance</span>
              </button>

              <button
                onClick={() => setIsProjectorOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Show Projector QR</span>
              </button>

              <button
                onClick={() => handleEndSession(activeSession.id)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>End Class Session</span>
              </button>
            </div>
          </div>
        )}

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
                  onChange={(e) => {
                    const yr = e.target.value;
                    const semMap = { "1st": "1", "2nd": "3", "3rd": "5", "4th": "7" };
                    setClassForm(prev => ({
                      ...prev,
                      year: yr,
                      semester: semMap[yr] || prev.semester,
                      subjectId: ""
                    }));
                  }}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Class Session History &amp; Reports</h2>
              <p className="text-xs text-slate-500">Filter, view, and export past classroom attendance reports</p>
            </div>
            
            {/* Subject-Wise & Date-Wise Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="p-0.5 bg-transparent border-0 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                />
                {selectedDateFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedDateFilter("")}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded font-bold text-slate-600 cursor-pointer"
                    title="Clear Date Filter"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Subject Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                <label htmlFor="subject-filter-select" className="text-xs font-bold text-slate-600 whitespace-nowrap">Subject:</label>
                <select
                  id="subject-filter-select"
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="p-0.5 bg-transparent border-0 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer min-w-[140px]"
                >
                  <option value="all">All Subjects ({sessions.length})</option>
                  {distinctSubjects.map(subName => {
                    const count = sessions.filter(s => s.subjectName === subName).length;
                    return (
                      <option key={subName} value={subName}>
                        {subName} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
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
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      {selectedSubjectFilter === "all" 
                        ? "No class sessions recorded yet."
                        : `No sessions recorded for "${selectedSubjectFilter}".`}
                    </td>
                  </tr>
                ) : (
                  filteredSessions.slice().reverse().map((sess) => {
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
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Manual Attendance Fallback */}
                          <button
                            onClick={() => {
                              setManualSessionTarget(sess);
                              setIsManualModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Manually mark attendance for this session"
                          >
                            <UserCheck className="w-3 h-3" /> Manual
                          </button>

                          {/* Export PDF */}
                          <button
                            onClick={() => handleExportSessionPDF(sess)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Export PDF Report"
                          >
                            <FileText className="w-3 h-3" /> PDF
                          </button>

                          {/* Export Excel */}
                          <button
                            onClick={() => handleExportSessionExcel(sess)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Export Excel Sheet"
                          >
                            <Download className="w-3 h-3" /> Excel
                          </button>

                          {/* Delete Session */}
                          <button
                            onClick={() => handleDeleteSession(sess.id, sess.subjectName)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Delete Session Record"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
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

      {/* Teacher Manual Attendance Modal */}
      <TeacherManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setManualSessionTarget(null);
        }}
        session={manualSessionTarget}
        onAttendanceUpdated={loadTeacherData}
      />

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

      {/* Simple Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 relative">
            <div className="gradient-header text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Faculty Profile</h3>
                  <p className="text-[11px] text-blue-100">Update your name &amp; department</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department</label>
                <select
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {branches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Basic Science">Basic Science</option>
                  <option value="Humanities">Humanities</option>
                </select>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="e.g. faculty@bec.edu.in"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
