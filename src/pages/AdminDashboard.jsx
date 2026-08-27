import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { parseStudentExcel } from "../utils/excelParser";
import { 
  exportAttendancePDF, 
  exportAttendanceExcel, 
  exportSectionMasterAttendanceExcel,
  exportDailySectionAttendanceExcel 
} from "../utils/pdfExporter";
import { 
  Shield, UserCheck, UserX, Users, BookOpen, Upload, FileText, Download, 
  Trash2, Plus, RefreshCw, CheckCircle, AlertCircle, Layers, ClipboardCheck,
  HeartPulse, Sparkles, AlertTriangle, Camera, Image as ImageIcon,
  Search, Filter, GraduationCap, Percent, CheckCircle2, Calendar, Clock, School,
  BarChart3
} from "lucide-react";

export const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [photoFilter, setPhotoFilter] = useState({ branch: "All", year: "All", section: "All", teacher: "All" });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedTeacherReport, setSelectedTeacherReport] = useState(null);

  // Manage Users Roster Filter State
  const [userTabFilter, setUserTabFilter] = useState("all"); // "all" | "admin" | "teacher" | "student"
  const [userBranchFilter, setUserBranchFilter] = useState("all");
  const [userYearFilter, setUserYearFilter] = useState("all");
  const [userSectionFilter, setUserSectionFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Section Master Attendance Excel Export State
  const [secExcelForm, setSecExcelForm] = useState({
    branch: "CSE",
    year: "1st",
    section: "A",
    semester: "1"
  });
  const [secExcelExporting, setSecExcelExporting] = useState(false);

  // Daily Section Attendance Register State (Single Date)
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyBranch, setDailyBranch] = useState("CSE");
  const [dailyYear, setDailyYear] = useState("1st");
  const [dailySection, setDailySection] = useState("A");
  const [dailyExporting, setDailyExporting] = useState(false);
  const [dailyStudentSearchQuery, setDailyStudentSearchQuery] = useState("");

  // Student 360° Attendance Explorer State
  const [explorerBranch, setExplorerBranch] = useState("CSE");
  const [explorerYear, setExplorerYear] = useState("1st");
  const [explorerSection, setExplorerSection] = useState("A");
  const [explorerStudentId, setExplorerStudentId] = useState("");
  const [explorerSearchQuery, setExplorerSearchQuery] = useState("");
  const [explorerStudentStats, setExplorerStudentStats] = useState([]);
  const [explorerLoading, setExplorerLoading] = useState(false);

  // Search Filter State for Medical & Manual Attendance Tabs
  const [medStudentSearchQuery, setMedStudentSearchQuery] = useState("");
  const [attStudentSearchQuery, setAttStudentSearchQuery] = useState("");

  // New Subject Form
  const [newSubForm, setNewSubForm] = useState({ name: "", code: "", branch: "CSE", semester: "3" });

  // Filter state for macro reports
  const [reportFilter, setReportFilter] = useState({ branch: "All", subject: "All" });

  // Bulk Upload feedback
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadError, setUploadError] = useState("");

  // BPUT Curriculum Explorer State
  const [bputExplorerBranch, setBputExplorerBranch] = useState("CSE");
  const [bputExplorerSem, setBputExplorerSem] = useState("3");

  // Admin Attendance Mode: "bulk" (class section) or "medical" (student 75% boost)
  const [attMode, setAttMode] = useState("medical");

  // Admin Attendance Form (Bulk)
  const [attForm, setAttForm] = useState({ branch: "CSE", year: "1st", section: "A", semester: "1", subjectCode: "" });
  const [attSelectedStudents, setAttSelectedStudents] = useState([]);
  const [attMsg, setAttMsg] = useState("");
  const [attError, setAttError] = useState("");
  const [attProcessing, setAttProcessing] = useState(false);

  // Medical Relief / Attendance Override State
  const [medStudentId, setMedStudentId] = useState("");
  const [medTargetPct, setMedTargetPct] = useState("75");
  const [medReason, setMedReason] = useState("Medical Grounds (Hospitalization / Certified Illness)");
  const [medStudentStats, setMedStudentStats] = useState([]);
  const [medLoading, setMedLoading] = useState(false);
  const [medSuccess, setMedSuccess] = useState("");
  const [medError, setMedError] = useState("");

  const loadAdminData = async () => {
    const allUsers = await DataService.getUsers();
    setUsers(allUsers);

    const allSubs = await DataService.getSubjects();
    setSubjects(allSubs);

    const allSess = await DataService.getSessions();
    setSessions(allSess);

    const allAtt = await DataService.getAttendance();
    setAttendance(allAtt);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Filtered pending student signups
  const pendingUsers = users.filter(u => u.status === "pending");

  const handleApprove = async (uid) => {
    await DataService.updateUserStatus(uid, "approved");
    loadAdminData();
  };

  const handleReject = async (uid) => {
    await DataService.updateUserStatus(uid, "rejected");
    loadAdminData();
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      await DataService.deleteUser(uid);
      loadAdminData();
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubForm.name || !newSubForm.code) return;
    await DataService.createSubject(newSubForm);
    setNewSubForm({ name: "", code: "", branch: "CSE", semester: "3" });
    loadAdminData();
  };

  const handleDeleteSubject = async (subId) => {
    if (window.confirm("Delete this subject?")) {
      await DataService.deleteSubject(subId);
      loadAdminData();
    }
  };

  const handleImportBputSubject = async (bputSub) => {
    const existing = subjects.find(s => s.code === bputSub.code && s.branch === bputExplorerBranch);
    if (existing) {
      alert(`Subject "${bputSub.name}" (${bputSub.code}) is already in your active catalog!`);
      return;
    }
    await DataService.createSubject({
      name: bputSub.name,
      code: bputSub.code,
      branch: bputExplorerBranch,
      semester: bputExplorerSem
    });
    loadAdminData();
  };

  const handleImportAllBputForSemester = async () => {
    const list = DataService.getBputSubjectsForBranch(bputExplorerBranch, bputExplorerSem);
    for (const bputSub of list) {
      const existing = subjects.find(s => s.code === bputSub.code && s.branch === bputExplorerBranch);
      if (!existing) {
        await DataService.createSubject({
          name: bputSub.name,
          code: bputSub.code,
          branch: bputExplorerBranch,
          semester: bputExplorerSem
        });
      }
    }
    loadAdminData();
  };

  const handleExcelFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadMsg("");
    setUploadError("");

    try {
      const parsedStudents = await parseStudentExcel(file);
      for (const student of parsedStudents) {
        await DataService.createUser(student);
      }
      setUploadMsg(` Successfully imported ${parsedStudents.length} student records from Excel roster!`);
      loadAdminData();
    } catch (err) {
      setUploadError(err.message || "Failed to process Excel roster.");
    }
  };

  // Filter macro attendance
  const filteredAttendance = attendance.filter(att => {
    if (reportFilter.branch !== "All" && att.branch !== reportFilter.branch) return false;
    if (reportFilter.subject !== "All" && att.subjectName !== reportFilter.subject) return false;
    return true;
  });

  // BPUT subjects for admin attendance form
  const bputSubjectsForForm = DataService.getBputSubjectsForBranch(attForm.branch, attForm.semester);

  // Students matching admin attendance filter
  const matchingStudents = users.filter(
    u => u.role === "student" && u.status === "approved" &&
         u.branch === attForm.branch && u.year === attForm.year && u.section === attForm.section
  );

  const handleSelectAllStudents = (checked) => {
    if (checked) {
      setAttSelectedStudents(matchingStudents.map(s => s.uid));
    } else {
      setAttSelectedStudents([]);
    }
  };

  const toggleStudent = (uid) => {
    setAttSelectedStudents(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAdminMarkAttendance = async () => {
    if (attSelectedStudents.length === 0) {
      setAttError("Please select at least one student.");
      return;
    }
    const selectedSub = bputSubjectsForForm.find(s => s.code === attForm.subjectCode);
    if (!selectedSub) {
      setAttError("Please select a subject.");
      return;
    }

    setAttProcessing(true);
    setAttMsg("");
    setAttError("");

    try {
      // Find or generate a subjectId
      const existingSubjects = await DataService.getSubjects();
      let subjectEntry = existingSubjects.find(s => s.code === selectedSub.code && s.branch === attForm.branch);
      if (!subjectEntry) {
        subjectEntry = await DataService.createSubject({
          name: selectedSub.name,
          code: selectedSub.code,
          branch: attForm.branch,
          semester: attForm.semester
        });
      }

      const result = await DataService.adminBulkMarkAttendance({
        branch: attForm.branch,
        year: attForm.year,
        section: attForm.section,
        semester: attForm.semester,
        subjectId: subjectEntry.id,
        subjectName: selectedSub.name,
        studentIds: attSelectedStudents,
        adminName: userProfile?.name || "Admin"
      });

      setAttMsg(`✅ Attendance marked for ${result.count} student(s) in ${selectedSub.name} (${selectedSub.code})`);
      setAttSelectedStudents([]);
      loadAdminData();
    } catch (err) {
      setAttError(err.message || "Failed to mark attendance.");
    } finally {
      setAttProcessing(false);
    }
  };

  // Load live stats for selected medical student
  useEffect(() => {
    if (medStudentId) {
      const student = users.find(u => u.uid === medStudentId);
      if (student) {
        DataService.getStudentSubjectStats(student).then(setMedStudentStats);
      }
    } else {
      setMedStudentStats([]);
    }
  }, [medStudentId, users, attendance, sessions]);

  // Handle granting medical / special exemption attendance boost
  const handleGrantMedicalExemption = async () => {
    if (!medStudentId) {
      setMedError("Please select a student from the list.");
      return;
    }
    setMedLoading(true);
    setMedSuccess("");
    setMedError("");
    try {
      const res = await DataService.adminBoostAttendanceToTarget({
        studentId: medStudentId,
        targetPercentage: parseInt(medTargetPct, 10),
        reason: medReason,
        adminName: userProfile?.name || "System Administrator"
      });
      setMedSuccess(`🎉 Medical Exemption Applied! ${res.studentName} (${res.rollNo}) boosted to ≥${res.targetPercentage}% across all subjects. (${res.totalRecordsAdded} attendance records recorded)`);
      // Reload stats
      const student = users.find(u => u.uid === medStudentId);
      if (student) {
        const newStats = await DataService.getStudentSubjectStats(student);
        setMedStudentStats(newStats);
      }
      loadAdminData();
    } catch (err) {
      setMedError(err.message || "Failed to boost attendance.");
    } finally {
      setMedLoading(false);
    }
  };

  // Approved students list for medical selection
  const approvedStudents = users.filter(u => u.role === "student" && u.status === "approved");

  // Approved students matching explorer filter
  const explorerMatchingStudents = users.filter(
    u => u.role === "student" && u.status === "approved" &&
         u.branch === explorerBranch && u.year === explorerYear && u.section === explorerSection
  );

  const handleSelectExplorerStudent = (studentId) => {
    setExplorerStudentId(studentId);
    const stud = users.find(u => u.uid === studentId);
    if (stud) {
      if (stud.branch) setExplorerBranch(stud.branch);
      if (stud.year) setExplorerYear(stud.year);
      if (stud.section) setExplorerSection(stud.section);
    }
  };

  // Load live stats for selected student in Student 360° Explorer
  useEffect(() => {
    if (explorerStudentId) {
      const student = users.find(u => u.uid === explorerStudentId);
      if (student) {
        setExplorerLoading(true);
        DataService.getStudentSubjectStats(student)
          .then(setExplorerStudentStats)
          .finally(() => setExplorerLoading(false));
      }
    } else {
      setExplorerStudentStats([]);
    }
  }, [explorerStudentId, users, attendance, sessions]);

  // Section Master Excel Export Handler (Downloads all subjects + final % column)
  const handleExportSectionMasterExcel = async () => {
    setSecExcelExporting(true);
    try {
      const { branch, year, section, semester } = secExcelForm;
      const sectionStudents = users.filter(
        u => u.role === "student" &&
             u.status === "approved" &&
             u.branch === branch &&
             u.year === year &&
             u.section === section
      );

      if (sectionStudents.length === 0) {
        alert(`No approved students found for ${branch} ${year} Sec-${section}.`);
        return;
      }

      const bputSubs = DataService.getBputSubjectsForBranch(branch, semester);
      const customSubs = subjects.filter(s => s.branch === branch && String(s.semester) === String(semester));
      const allSubs = [...bputSubs, ...customSubs.filter(cs => !bputSubs.some(bs => bs.code === cs.code))];

      await exportSectionMasterAttendanceExcel({
        branch,
        year,
        section,
        semester,
        students: sectionStudents,
        subjects: allSubs,
        attendanceRecords: attendance,
        sessions
      });
    } catch (e) {
      alert("Failed to export Section Master Excel: " + e.message);
    } finally {
      setSecExcelExporting(false);
    }
  };

  // Day sessions conducted on selected dailyDate for the chosen branch/year/section
  const dailyMatchingSessions = sessions.filter(s => {
    if (s.branch !== dailyBranch || s.year !== dailyYear || s.section !== dailySection) return false;
    const sessDate = s.createdAt || s.startedAt;
    if (!sessDate) return false;
    const dStr = new Date(sessDate).toISOString().split("T")[0];
    return dStr === dailyDate;
  }).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  // Approved students matching daily section
  const dailyMatchingStudents = users.filter(
    u => u.role === "student" && u.status === "approved" &&
         u.branch === dailyBranch && u.year === dailyYear && u.section === dailySection
  );

  // Daily Section Excel Export Handler
  const handleExportDailySectionExcel = async () => {
    setDailyExporting(true);
    try {
      if (dailyMatchingStudents.length === 0) {
        alert(`No approved students found for ${dailyBranch} ${dailyYear} Sec-${dailySection}.`);
        return;
      }

      await exportDailySectionAttendanceExcel({
        date: dailyDate,
        branch: dailyBranch,
        year: dailyYear,
        section: dailySection,
        students: dailyMatchingStudents,
        daySessions: dailyMatchingSessions,
        attendanceRecords: attendance
      });
    } catch (e) {
      alert("Failed to export Daily Attendance Sheet: " + e.message);
    } finally {
      setDailyExporting(false);
    }
  };


  // Teacher class log entries for Photo Access tab (supports both Cloudinary URLs and data: base64 photos)
  const teacherClassLogs = sessions
    .filter(session => session.teacherPhoto && typeof session.teacherPhoto === "string" && (session.teacherPhoto.startsWith("http") || session.teacherPhoto.startsWith("data:")))
    .filter(session => {
      if (photoFilter.branch !== "All" && session.branch !== photoFilter.branch) return false;
      if (photoFilter.year !== "All" && session.year !== photoFilter.year) return false;
      if (photoFilter.section !== "All" && session.section !== photoFilter.section) return false;
      if (photoFilter.teacher && photoFilter.teacher !== "All" && session.teacherName !== photoFilter.teacher) return false;
      return true;
    })
    .map(session => ({
      id: session.id,
      teacherName: session.teacherName || "Faculty",
      branch: session.branch,
      year: session.year,
      section: session.section,
      semester: session.semester,
      subjectName: session.subjectName,
      imageUrl: session.teacherPhoto,
      createdAt: session.createdAt || session.startedAt,
      studentsPresent: attendance.filter(a => a.sessionId === session.id).length
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Delete teacher class session log & attendance records handler
  const handleDeleteTeacherClassLog = async (sessionId, subjectName, teacherName) => {
    if (!window.confirm(`Are you sure you want to delete the class session log for "${teacherName || "Faculty"} - ${subjectName || "Subject"}"? This will permanently delete the session record, photos, and all student attendance scans for this lecture.`)) return;
    try {
      await DataService.deleteSession(sessionId);
      if (selectedPhoto && selectedPhoto.id === sessionId) {
        setSelectedPhoto(null);
      }
      alert("✅ Class session log and attendance records deleted successfully.");
      loadAdminData();
    } catch (err) {
      alert("Failed to delete session: " + err.message);
    }
  };

  // Distinct teacher names for filter
  const distinctTeacherNames = Array.from(
    new Set(sessions.filter(s => s.teacherName).map(s => s.teacherName))
  );

  // Helper to compute a teacher's full subject and teaching breakdown with robust matching
  const getTeacherStats = (teacherObj) => {
    if (!teacherObj) return null;
    const tUid = (teacherObj.uid || teacherObj.id || "").trim();
    const tName = (teacherObj.name || "").trim().toLowerCase();
    const tEmail = (teacherObj.email || "").trim().toLowerCase();
    const tDept = (teacherObj.department || "").trim().toLowerCase();
    const cleanTName = tName.replace(/[^a-z0-9]/g, "");

    // Find all sessions conducted by this teacher
    const teacherSessions = sessions.filter(s => {
      const sTeacherId = (s.teacherId || "").trim();
      const sName = (s.teacherName || "").trim().toLowerCase();
      const sEmail = (s.teacherEmail || "").trim().toLowerCase();
      const cleanSName = sName.replace(/[^a-z0-9]/g, "");

      // Match by exact UID
      if (tUid && sTeacherId && (sTeacherId === tUid || s.uid === tUid)) return true;

      // Match by Email
      if (tEmail && sEmail && sEmail === tEmail) return true;

      // Match by exact Name
      if (tName && sName && (sName === tName || cleanSName === cleanTName)) return true;

      // Match by partial name
      if (cleanTName.length >= 3 && cleanSName.length >= 3) {
        if (cleanSName.includes(cleanTName) || cleanTName.includes(cleanSName)) return true;
      }

      return false;
    }).sort((a, b) => new Date(b.createdAt || b.startedAt || 0) - new Date(a.createdAt || a.startedAt || 0));

    // Group by Subject + Branch + Year + Section + Semester
    const subjectClassMatrix = {};
    let totalStudentsScanned = 0;

    teacherSessions.forEach(sess => {
      const sub = sess.subjectName || "Subject";
      const branch = sess.branch || teacherObj.department || "General";
      const year = sess.year || "1st";
      const section = sess.section || "A";
      const semester = sess.semester || "1";
      const key = `${sub}__${branch}__${year}__${section}__${semester}`;

      const presentCount = attendance.filter(a => a.sessionId === sess.id).length;
      totalStudentsScanned += presentCount;

      if (!subjectClassMatrix[key]) {
        subjectClassMatrix[key] = {
          key,
          subjectName: sub,
          branch,
          year,
          section,
          semester,
          totalClasses: 0,
          totalStudentsPresent: 0,
          sessions: []
        };
      }

      subjectClassMatrix[key].totalClasses += 1;
      subjectClassMatrix[key].totalStudentsPresent += presentCount;
      subjectClassMatrix[key].sessions.push(sess);
    });

    const breakdownList = Object.values(subjectClassMatrix).sort((a, b) => b.totalClasses - a.totalClasses);
    const uniqueSubjectsList = Array.from(new Set(teacherSessions.map(s => s.subjectName || "Subject")));

    return {
      teacher: teacherObj,
      totalClasses: teacherSessions.length,
      uniqueSubjectsCount: uniqueSubjectsList.length,
      uniqueSubjectsList,
      subjectsList: uniqueSubjectsList,
      totalStudentsScanned,
      breakdownList: breakdownList || [],
      sessionsList: teacherSessions || []
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-sky-50 to-blue-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Admin Header Banner */}
        <div className="gradient-header text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-blue-400/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center font-bold shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-bold uppercase tracking-wider">
                System Administrator
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">BEC System Control Panel</h1>
              <p className="text-xs text-blue-100">Institutional Governance, Student Approvals &amp; Global Roster</p>
            </div>
          </div>

          <button
            onClick={loadAdminData}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl border border-white/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Data
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex space-x-2 border-b border-blue-200/80 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-full text-[10px]">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => setActiveTab("academic")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "academic"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Subjects &amp; Branches</span>
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "bulk"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Excel Upload</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Macro Reports</span>
          </button>

          <button
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "photos"
                ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/25"
                : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photo Access</span>
          </button>
        </div>

        {activeTab === "photos" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Faculty Class Photo Logs</h2>
                  <p className="text-xs text-slate-500">Live-verified faculty photos for each conducted class session, filtered by teacher and class.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={photoFilter.teacher}
                    onChange={(e) => setPhotoFilter({ ...photoFilter, teacher: e.target.value })}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Faculty</option>
                    {distinctTeacherNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select
                    value={photoFilter.branch}
                    onChange={(e) => setPhotoFilter({ ...photoFilter, branch: e.target.value })}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Branches</option>
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select
                    value={photoFilter.year}
                    onChange={(e) => setPhotoFilter({ ...photoFilter, year: e.target.value })}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Years</option>
                    {DataService.getYears().map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select
                    value={photoFilter.section}
                    onChange={(e) => setPhotoFilter({ ...photoFilter, section: e.target.value })}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="All">All Sections</option>
                    {DataService.getSections().map(s => <option key={s} value={s}>Sec {s}</option>)}
                  </select>

                  {photoFilter.teacher !== "All" && (
                    <button
                      onClick={() => setPhotoFilter({ ...photoFilter, teacher: "All" })}
                      className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-lg">
                  Showing: {teacherClassLogs.length} Class Sessions
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-3">Photo</th>
                      <th className="py-3 px-3">Faculty Name</th>
                      <th className="py-3 px-3">Subject / Class</th>
                      <th className="py-3 px-3">Roster (Branch/Yr/Sec)</th>
                      <th className="py-3 px-3">Semester</th>
                      <th className="py-3 px-3">Session Date &amp; Time</th>
                      <th className="py-3 px-3">Students</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {teacherClassLogs.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-10 text-center text-slate-400 text-sm">
                          No faculty class photos found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      teacherClassLogs.map(log => (
                        <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3">
                            <img
                              src={log.imageUrl}
                              alt={log.teacherName}
                              className="w-12 h-12 rounded-xl object-cover border-2 border-blue-200 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                              onClick={() => setSelectedPhoto(log)}
                            />
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{log.teacherName}</span>
                            <br />
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">Faculty</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{log.subjectName || "—"}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[11px]">
                              {log.branch} | {log.year} | Sec {log.section}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">Sem {log.semester}</td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 font-bold">
                              <Users className="w-3.5 h-3.5" /> {log.studentsPresent}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5">
                            <button
                              onClick={() => setSelectedPhoto(log)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title="View Details"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleDeleteTeacherClassLog(log.id, log.subjectName, log.teacherName)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center"
                              title="Delete Class Session Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* Full Photo Detail Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="relative max-w-lg w-full rounded-3xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 z-10 bg-slate-900/80 text-white rounded-full p-2 hover:bg-slate-700 cursor-pointer"
              >
                ✕
              </button>

              {/* If selectedPhoto is an object (teacher class log) show rich detail */}
              {typeof selectedPhoto === "object" ? (
                <div>
                  <img
                    src={selectedPhoto.imageUrl}
                    alt={selectedPhoto.teacherName}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-extrabold text-slate-900">{selectedPhoto.teacherName}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">Faculty Verified ✓</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Subject / Class</p>
                        <p className="font-bold text-slate-800">{selectedPhoto.subjectName || "—"}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Roster</p>
                        <p className="font-bold text-slate-800">{selectedPhoto.branch} | {selectedPhoto.year} | Sec {selectedPhoto.section}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Semester</p>
                        <p className="font-bold text-slate-800">Sem {selectedPhoto.semester}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Students Present</p>
                        <p className="font-bold text-emerald-700">{selectedPhoto.studentsPresent} Students</p>
                      </div>
                      <div className="col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-slate-400 text-[10px] uppercase font-bold mb-0.5">Session Date &amp; Time</p>
                        <p className="font-bold text-slate-800">{selectedPhoto.createdAt ? new Date(selectedPhoto.createdAt).toLocaleString() : "—"}</p>
                      </div>
                    </div>

                    {/* Delete Session Log Button in Modal */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleDeleteTeacherClassLog(selectedPhoto.id, selectedPhoto.subjectName, selectedPhoto.teacherName)}
                        className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Class Session Log &amp; Records</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <img src={selectedPhoto} alt="Selected photo preview" className="w-full max-h-[80vh] object-contain" />
              )}
            </div>
          </div>
        )}

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === "pending" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pending Student Registrations</h2>
                <p className="text-xs text-slate-500">Review student self-signup requests before allowing login access</p>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg">
                Queue: {pendingUsers.length} Pending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-blue-50/60 border-y border-blue-100 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Branch / Year / Sec / Sem</th>
                    <th className="py-3 px-4 text-right">Approval Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No pending student signups in approval queue.
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{u.rollNo}</td>
                        <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {u.branch} | {u.year} | Sec {u.section} (Sem {u.semester})
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(u.uid)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(u.uid)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" /> Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE USERS */}
        {activeTab === "users" && (() => {
          const adminCount = users.filter(u => u.role === "admin").length;
          const teacherCount = users.filter(u => u.role === "teacher").length;
          const studentCount = users.filter(u => u.role === "student").length;

          const filteredAdminUsers = users.filter((u) => {
            if (userTabFilter !== "all" && u.role !== userTabFilter) return false;
            if (userTabFilter === "student" || u.role === "student") {
              if (userBranchFilter !== "all" && u.branch !== userBranchFilter) return false;
              if (userYearFilter !== "all" && u.year !== userYearFilter) return false;
              if (userSectionFilter !== "all" && u.section !== userSectionFilter) return false;
            }
            if (userSearchQuery.trim()) {
              const q = userSearchQuery.toLowerCase().trim();
              const matchName = u.name?.toLowerCase().includes(q);
              const matchEmail = u.email?.toLowerCase().includes(q);
              const matchRoll = u.rollNo?.toLowerCase().includes(q);
              const matchDept = u.department?.toLowerCase().includes(q);
              const matchBranch = u.branch?.toLowerCase().includes(q);
              if (!matchName && !matchEmail && !matchRoll && !matchDept && !matchBranch) return false;
            }
            return true;
          });

          return (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Institutional User Roster</h2>
                  <p className="text-xs text-slate-500">All registered Students, Teachers, and Administrators</p>
                </div>
                <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg">
                  Showing: {filteredAdminUsers.length} of {users.length} Users
                </span>
              </div>

              {/* Role Filter Tabs + Search Bar */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Role Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setUserTabFilter("all"); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        userTabFilter === "all"
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      🌐 All ({users.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => { setUserTabFilter("admin"); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        userTabFilter === "admin"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-purple-50 border border-slate-200"
                      }`}
                    >
                      🛡️ Admins ({adminCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => { setUserTabFilter("teacher"); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        userTabFilter === "teacher"
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
                      }`}
                    >
                      👨‍🏫 Teachers ({teacherCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => { setUserTabFilter("student"); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        userTabFilter === "student"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200"
                      }`}
                    >
                      🎓 Students ({studentCount})
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, roll, email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    />
                    {userSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUserSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Student Sub-Filters (Branch, Year, Section) */}
                {(userTabFilter === "student" || userTabFilter === "all") && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
                    <span className="font-bold text-slate-500 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-blue-600" /> Student Filters:
                    </span>

                    {/* Branch Filter */}
                    <select
                      value={userBranchFilter}
                      onChange={(e) => setUserBranchFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">All Branches</option>
                      {DataService.getDepartments().map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>

                    {/* Year Filter */}
                    <select
                      value={userYearFilter}
                      onChange={(e) => setUserYearFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">All Years</option>
                      {DataService.getYears().map(y => (
                        <option key={y} value={y}>{y} Year</option>
                      ))}
                    </select>

                    {/* Section Filter */}
                    <select
                      value={userSectionFilter}
                      onChange={(e) => setUserSectionFilter(e.target.value)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="all">All Sections</option>
                      {DataService.getSections().map(s => (
                        <option key={s} value={s}>Sec {s}</option>
                      ))}
                    </select>

                    {(userBranchFilter !== "all" || userYearFilter !== "all" || userSectionFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserBranchFilter("all");
                          setUserYearFilter("all");
                          setUserSectionFilter("all");
                        }}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-bold text-[11px] cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50/60 border-y border-blue-100 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Academic Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAdminUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          No users match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{u.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                              u.role === "admin" ? "bg-purple-100 text-purple-800" :
                              u.role === "teacher" ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {u.role === "student" ? (
                              <div>
                                <span className="font-mono text-blue-700 font-bold">{u.rollNo}</span> • <span className="font-semibold text-slate-900">{u.branch}</span> ({u.year} Yr Sec-{u.section} Sem {u.semester || "1"})
                              </div>
                            ) : u.role === "teacher" ? (() => {
                              const tStats = getTeacherStats(u);
                              const totalClasses = tStats?.totalClasses || 0;
                              const subCount = tStats?.uniqueSubjectsCount || 0;
                              return (
                                <div>
                                  <div className="font-semibold text-slate-900">{u.department} Dept • {u.subjectName || "Core Faculty"}</div>
                                  <div className="text-[11px] text-blue-700 font-bold mt-0.5 flex items-center gap-1">
                                    <span>⚡ {totalClasses} {totalClasses === 1 ? "Class Done" : "Classes Done"}</span>
                                    {totalClasses > 0 && (
                                      <span>• {subCount} {subCount === 1 ? "Subject" : "Subjects"}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })() : (
                              <div>Administration / Dean</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                              u.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            {u.role === "teacher" && (
                              <button
                                onClick={() => setSelectedTeacherReport(u)}
                                className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="View Complete Teaching Workload & Subject Breakdown"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>Teaching Report</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Full Faculty Teaching & Subject Workload Report Modal */}
              {selectedTeacherReport && (() => {
                const stats = getTeacherStats(selectedTeacherReport);
                if (!stats) return null;

                return (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4" onClick={() => setSelectedTeacherReport(null)}>
                    <div className="relative max-w-3xl w-full max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                      
                      {/* Modal Header */}
                      <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-lg">
                            {stats.teacher.name?.[0] || "T"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-extrabold">{stats.teacher.name}</h3>
                              <span className="px-2 py-0.5 rounded-full bg-sky-400/20 text-sky-200 border border-sky-400/30 text-[10px] font-bold">
                                {stats.teacher.department || "Faculty"}
                              </span>
                            </div>
                            <p className="text-xs text-sky-200 font-mono">{stats.teacher.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedTeacherReport(null)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                        
                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-purple-900">{stats.totalClasses}</div>
                            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mt-1">Total Classes Taken</div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-blue-900">{stats.uniqueSubjectsCount || stats.subjectsList?.length || 0}</div>
                            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mt-1">Subjects Taught</div>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                            <div className="text-2xl font-black text-emerald-900">{stats.totalStudentsScanned}</div>
                            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-1">Students Attended</div>
                          </div>
                        </div>

                        {/* 1. Subjects & Academic Breakdown Table */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-blue-600" />
                              <span>Academic Subject &amp; Class Section Breakdown:</span>
                            </h4>
                            <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                              {stats.breakdownList.length} Active Teaching Groups
                            </span>
                          </div>

                          {stats.breakdownList.length === 0 ? (
                            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                              No class sessions recorded yet for this faculty member.
                            </div>
                          ) : (
                            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-blue-50/70 border-b border-blue-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    <th className="py-3 px-3.5">#</th>
                                    <th className="py-3 px-3.5">Subject Taught</th>
                                    <th className="py-3 px-3.5">Branch / Dept</th>
                                    <th className="py-3 px-3.5">Year &amp; Semester</th>
                                    <th className="py-3 px-3.5 text-center">Section</th>
                                    <th className="py-3 px-3.5 text-center">Total Classes</th>
                                    <th className="py-3 px-3.5 text-center">Students Present</th>
                                    <th className="py-3 px-3.5 text-center">Avg / Class</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                  {stats.breakdownList.map((item, idx) => {
                                    const avgPerClass = item.totalClasses > 0 ? Math.round(item.totalStudentsPresent / item.totalClasses) : 0;
                                    return (
                                      <tr key={item.key} className="hover:bg-blue-50/40 transition-colors">
                                        <td className="py-3 px-3.5 font-bold text-slate-400">{idx + 1}</td>
                                        <td className="py-3 px-3.5">
                                          <span className="font-extrabold text-slate-900 block text-xs">📖 {item.subjectName}</span>
                                        </td>
                                        <td className="py-3 px-3.5">
                                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold text-[11px]">
                                            {item.branch}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3.5 font-semibold text-slate-700">
                                          {item.year} Year (Sem {item.semester})
                                        </td>
                                        <td className="py-3 px-3.5 text-center">
                                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[11px]">
                                            Sec {item.section}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3.5 text-center">
                                          <span className="px-2.5 py-1 bg-purple-600 text-white font-mono font-bold rounded-lg text-xs">
                                            {item.totalClasses} {item.totalClasses === 1 ? "Class" : "Classes"}
                                          </span>
                                        </td>
                                        <td className="py-3 px-3.5 text-center font-bold text-emerald-700">
                                          👥 {item.totalStudentsPresent}
                                        </td>
                                        <td className="py-3 px-3.5 text-center font-mono font-semibold text-slate-600">
                                          ~{avgPerClass}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* 2. Detailed Lecture Session Log History */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-sky-600" />
                              <span>All Conducted Lectures ({stats.sessionsList.length}):</span>
                            </h4>
                          </div>

                          {stats.sessionsList.length > 0 && (
                            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                                    <th className="py-2.5 px-3">Date &amp; Time</th>
                                    <th className="py-2.5 px-3">Subject</th>
                                    <th className="py-2.5 px-3">Class (Branch/Yr/Sec)</th>
                                    <th className="py-2.5 px-3">Semester</th>
                                    <th className="py-2.5 px-3 text-center">Students</th>
                                    <th className="py-2.5 px-3 text-right">Delete</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {stats.sessionsList.map(s => {
                                    const presentCount = attendance.filter(a => a.sessionId === s.id).length;
                                    return (
                                      <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                          {s.createdAt || s.startedAt ? new Date(s.createdAt || s.startedAt).toLocaleString() : "—"}
                                        </td>
                                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.subjectName || "Subject"}</td>
                                        <td className="py-2.5 px-3">
                                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[11px]">
                                            {s.branch} • {s.year} • Sec {s.section}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600">Sem {s.semester || "1"}</td>
                                        <td className="py-2.5 px-3 text-center">
                                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
                                            👥 {presentCount}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right">
                                          <button
                                            onClick={async () => {
                                              await handleDeleteTeacherClassLog(s.id, s.subjectName, stats.teacher.name);
                                            }}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                            title="Delete Session Log"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => setSelectedTeacherReport(null)}
                          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Close Report
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* TAB 3: SUBJECTS & BRANCHES SETUP */}
        {activeTab === "academic" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Add Subject Form */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-blue-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Add Custom Subject</h3>
              
              <form onSubmit={handleAddSubject} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Management Systems"
                    value={newSubForm.name}
                    onChange={(e) => setNewSubForm({ ...newSubForm, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS207"
                    value={newSubForm.code}
                    onChange={(e) => setNewSubForm({ ...newSubForm, code: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch</label>
                    <select
                      value={newSubForm.branch}
                      onChange={(e) => setNewSubForm({ ...newSubForm, branch: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                    <select
                      value={newSubForm.semester}
                      onChange={(e) => setNewSubForm({ ...newSubForm, semester: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getSemesters().map(sem => <option key={sem} value={sem}>Sem {sem}</option>)}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Add Subject
                </button>
              </form>
            </div>

            {/* Existing Subjects Table */}
            <div className="md:col-span-2 bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-blue-100 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Active Subject Catalog</h3>
                <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                  {subjects.length} Subjects Active
                </span>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50/60 border-y border-blue-100 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Semester</th>
                      <th className="py-2.5 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-blue-50/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{sub.code}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{sub.name}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-600">{sub.branch}</td>
                        <td className="py-2.5 px-3 text-slate-600">Sem {sub.semester}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteSubject(sub.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BPUT Official Curriculum & Syllabus Explorer */}
            <div className="md:col-span-3 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 border border-blue-800/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-blue-800/50 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      BPUT Syllabus Catalog
                    </span>
                    <span className="text-xs text-blue-300/80">All 12 Branches • 8 Semesters</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-1">Biju Patnaik University of Technology (BPUT) Curriculum</h3>
                  <p className="text-xs text-blue-200/70">Browse official course codes and subjects, and import them with 1-click</p>
                </div>

                {/* Branch and Semester Selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={bputExplorerBranch}
                    onChange={(e) => setBputExplorerBranch(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-blue-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b} Engineering</option>)}
                  </select>

                  <select
                    value={bputExplorerSem}
                    onChange={(e) => setBputExplorerSem(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-blue-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    {DataService.getSemesters().map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>

                  <button
                    onClick={handleImportAllBputForSemester}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Import All Sem-{bputExplorerSem} Subjects
                  </button>
                </div>
              </div>

              {/* Subjects List Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {DataService.getBputSubjectsForBranch(bputExplorerBranch, bputExplorerSem).map((sub) => {
                  const isAlreadyAdded = subjects.some(s => s.code === sub.code && s.branch === bputExplorerBranch);
                  return (
                    <div
                      key={sub.code}
                      className="bg-slate-800/80 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between hover:border-blue-400/50 transition-all group"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">
                          {sub.code}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1.5">{sub.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{bputExplorerBranch} • Semester {bputExplorerSem}</p>
                      </div>

                      <button
                        onClick={() => handleImportBputSubject(sub)}
                        disabled={isAlreadyAdded}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAlreadyAdded
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-sm"
                        }`}
                      >
                        {isAlreadyAdded ? "Added ✓" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: ADMIN MARK ATTENDANCE */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            
            {/* Mode Switcher */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Attendance Management &amp; Exemption Control</h2>
                <p className="text-xs text-slate-500">Mark direct class attendance or apply Medical Exemption to boost attendance to ≥75%</p>
              </div>

              <div className="flex items-center space-x-2 bg-blue-50/80 p-1.5 rounded-2xl border border-blue-200/80">
                <button
                  onClick={() => setAttMode("medical")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    attMode === "medical"
                      ? "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-red-500/20"
                      : "text-slate-600 hover:text-blue-700"
                  }`}
                >
                  <HeartPulse className="w-4 h-4" />
                  <span>🩺 Medical Exemption &amp; 75%+ Boost</span>
                </button>

                <button
                  onClick={() => setAttMode("bulk")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    attMode === "bulk"
                      ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-600 hover:text-blue-700"
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>👥 Class Section Bulk Marking</span>
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: MEDICAL EXEMPTION / 75% BOOST */}
            {attMode === "medical" && (
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-rose-100 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] uppercase rounded-lg tracking-wider flex items-center gap-1">
                        <HeartPulse className="w-3.5 h-3.5 text-rose-600" /> Medical &amp; Special Relief
                      </span>
                      <span className="text-xs text-slate-500">BPUT Clause: 75% Minimum Eligibility</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-1">Student Attendance Medical Exemption Tool</h3>
                    <p className="text-xs text-slate-500">If a student has medical issues or official leave, instantly boost their attendance to 75%+ across all subjects</p>
                  </div>
                </div>

                {medSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span>{medSuccess}</span>
                  </div>
                )}
                {medError && (
                  <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>{medError}</span>
                  </div>
                )}

                {/* Step 1: Select Student with Instant Search Filter */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">Select Student for Medical Relief</label>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {approvedStudents.filter(s =>
                          !medStudentSearchQuery ||
                          s.name?.toLowerCase().includes(medStudentSearchQuery.toLowerCase()) ||
                          s.rollNo?.toLowerCase().includes(medStudentSearchQuery.toLowerCase())
                        ).length} matching
                      </span>
                    </div>

                    <div className="relative mb-2">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="🔍 Type Student Name or Roll Number to filter list..."
                        value={medStudentSearchQuery}
                        onChange={(e) => setMedStudentSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-none"
                      />
                      {medStudentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMedStudentSearchQuery("")}
                          className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <select
                      value={medStudentId}
                      onChange={(e) => {
                        setMedStudentId(e.target.value);
                        setMedSuccess("");
                        setMedError("");
                      }}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Student (Roll No / Name) --</option>
                      {approvedStudents
                        .filter(s =>
                          !medStudentSearchQuery ||
                          s.name?.toLowerCase().includes(medStudentSearchQuery.toLowerCase()) ||
                          s.rollNo?.toLowerCase().includes(medStudentSearchQuery.toLowerCase())
                        )
                        .map((s) => (
                          <option key={s.uid} value={s.uid}>
                            {s.name} ({s.rollNo}) — {s.branch} {s.year} Sec-{s.section} (Sem {s.semester || "1"})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">Target Attendance %</label>
                    <select
                      value={medTargetPct}
                      onChange={(e) => setMedTargetPct(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
                    >
                      <option value="75">75% (Minimum BPUT Exam Eligibility)</option>
                      <option value="80">80% (Safe Standard)</option>
                      <option value="85">85% (High Standing)</option>
                      <option value="90">90% (Distinction)</option>
                      <option value="100">100% (Full Attendance Exemption)</option>
                    </select>
                  </div>
                </div>

                {/* Step 2: Reason / Certificate Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">Official Exemption Ground / Medical Certificate Note</label>
                  <input
                    type="text"
                    value={medReason}
                    onChange={(e) => setMedReason(e.target.value)}
                    placeholder="e.g. Certified Medical Hospitalization / Severe Illness / Official College OD"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                {/* Live Subject Breakdown for Selected Student */}
                {medStudentId && medStudentStats.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                      Live Subject Attendance Breakdown
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {medStudentStats.map((st) => (
                        <div
                          key={st.subjectId}
                          className={`p-4 rounded-2xl border transition-all ${
                            st.percentage < 75
                              ? "bg-rose-50/70 border-rose-200 shadow-xs"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {st.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                st.percentage < 75
                                  ? "bg-red-100 text-red-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {st.percentage < 75 ? "⚠️ Below 75%" : "✅ Eligible"}
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-900 text-sm mt-2">{st.subjectName}</h5>

                          <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                            <span>Classes: <strong>{st.attendedClasses} / {st.totalClasses}</strong></span>
                            <span className="font-extrabold text-sm text-slate-900">{st.percentage}%</span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                st.percentage < 75 ? "bg-rose-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(st.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boost Button */}
                <button
                  onClick={handleGrantMedicalExemption}
                  disabled={medLoading || !medStudentId}
                  className="w-full py-4 bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-sm transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HeartPulse className="w-5 h-5 animate-pulse" />
                  <span>
                    {medLoading
                      ? "Applying Medical Exemption & Boost..."
                      : `🩺 Grant Medical Exemption & Boost to ≥${medTargetPct}% All Subjects`}
                  </span>
                </button>
              </div>
            )}

            {/* SUB-VIEW 2: CLASS BULK ATTENDANCE */}
            {attMode === "bulk" && (
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Class Section Bulk Attendance</h2>
                    <p className="text-xs text-slate-500">Mark attendance for an entire class or selected students for a subject lecture</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-[10px] uppercase rounded-lg tracking-wider">BPUT Curriculum</span>
                </div>

                {attMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>{attMsg}</span>
                  </div>
                )}
                {attError && (
                  <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span>{attError}</span>
                  </div>
                )}

                {/* Step 1: Filters */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Branch</label>
                    <select
                      value={attForm.branch}
                      onChange={(e) => { setAttForm({ ...attForm, branch: e.target.value, subjectCode: "" }); setAttSelectedStudents([]); }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Year</label>
                    <select
                      value={attForm.year}
                      onChange={(e) => { setAttForm({ ...attForm, year: e.target.value }); setAttSelectedStudents([]); }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getYears().map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Section</label>
                    <select
                      value={attForm.section}
                      onChange={(e) => { setAttForm({ ...attForm, section: e.target.value }); setAttSelectedStudents([]); }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getSections().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Semester</label>
                    <select
                      value={attForm.semester}
                      onChange={(e) => { setAttForm({ ...attForm, semester: e.target.value, subjectCode: "" }); }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      {DataService.getSemesters().map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subject</label>
                    <select
                      value={attForm.subjectCode}
                      onChange={(e) => setAttForm({ ...attForm, subjectCode: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="">-- Select Subject --</option>
                      {bputSubjectsForForm.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Step 2: Student List with Search */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={matchingStudents.length > 0 && attSelectedStudents.length === matchingStudents.length}
                        onChange={(e) => handleSelectAllStudents(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">Select All Students</span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          placeholder="Filter students by name/roll..."
                          value={attStudentSearchQuery}
                          onChange={(e) => setAttStudentSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {attStudentSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setAttStudentSearchQuery("")}
                            className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold hover:text-slate-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0">
                        {attSelectedStudents.length} / {matchingStudents.length} selected
                      </span>
                    </div>
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-blue-50/60 border-b border-blue-100 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                          <th className="py-2.5 px-4 w-10"></th>
                          <th className="py-2.5 px-4">Roll No</th>
                          <th className="py-2.5 px-4">Student Name</th>
                          <th className="py-2.5 px-4">Branch / Section</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {matchingStudents.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-slate-400">
                              No approved students found for {attForm.branch} — {attForm.year} — Sec {attForm.section}
                            </td>
                          </tr>
                        ) : (
                          matchingStudents
                            .filter(s =>
                              !attStudentSearchQuery ||
                              s.name?.toLowerCase().includes(attStudentSearchQuery.toLowerCase()) ||
                              s.rollNo?.toLowerCase().includes(attStudentSearchQuery.toLowerCase())
                            )
                            .map((s) => (
                              <tr key={s.uid} className={`hover:bg-blue-50/40 transition-colors ${attSelectedStudents.includes(s.uid) ? "bg-blue-50/60" : ""}`}>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="checkbox"
                                    checked={attSelectedStudents.includes(s.uid)}
                                    onChange={() => toggleStudent(s.uid)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{s.rollNo}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-800">{s.name}</td>
                              <td className="py-2.5 px-4 text-slate-600">{s.branch} — {s.year} — Sec {s.section}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step 3: Submit */}
                <button
                  onClick={handleAdminMarkAttendance}
                  disabled={attProcessing || attSelectedStudents.length === 0 || !attForm.subjectCode}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ClipboardCheck className="w-5 h-5" />
                  {attProcessing ? "Processing Attendance..." : `Mark Attendance for ${attSelectedStudents.length} Student(s)`}
                </button>
              </div>
            )}

          </div>
        )}

        {/* TAB 5: BULK EXCEL UPLOAD */}
        {activeTab === "bulk" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Bulk Student Roster Upload (.xlsx / .csv)</h2>
              <p className="text-xs text-slate-500">Upload Excel spreadsheet containing student roster columns: Name, Roll No, Email, Branch, Year, Section, Semester</p>
            </div>

            {uploadMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{uploadMsg}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-4 bg-red-50 border border-red-300 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-3xl p-10 text-center space-y-4 bg-blue-50/40 transition-colors">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <label htmlFor="excel-file" className="cursor-pointer font-bold text-sm text-blue-700 hover:underline">
                  Click to select Excel (.xlsx) file
                </label>
                <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheet files</p>
              </div>
              <input
                id="excel-file"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleExcelFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* TAB 6: MACRO REPORTS & SECTION MASTER ATTENDANCE EXCEL */}
        {activeTab === "reports" && (
          <div className="space-y-8">
            
            {/* 1. SECTION MASTER ATTENDANCE EXCEL EXPORTER */}
            <div className="bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/20 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">Section Master Attendance Excel Exporter</h2>
                  </div>
                  <p className="text-xs text-blue-100">
                    Export a single unified spreadsheet for an entire section with all semester subjects and student overall percentage.
                  </p>
                </div>
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-mono font-bold rounded-xl border border-white/30 backdrop-blur-xs">
                  Institutional Master Export
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Target Branch</label>
                    <select
                      value={secExcelForm.branch}
                      onChange={(e) => setSecExcelForm({ ...secExcelForm, branch: e.target.value })}
                      className="w-full p-2.5 bg-white text-slate-800 font-semibold rounded-xl border-0 focus:ring-2 focus:ring-sky-300"
                    >
                      {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Class Year</label>
                    <select
                      value={secExcelForm.year}
                      onChange={(e) => setSecExcelForm({ ...secExcelForm, year: e.target.value })}
                      className="w-full p-2.5 bg-white text-slate-800 font-semibold rounded-xl border-0 focus:ring-2 focus:ring-sky-300"
                    >
                      {DataService.getYears().map(y => <option key={y} value={y}>{y} Year</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Section</label>
                    <select
                      value={secExcelForm.section}
                      onChange={(e) => setSecExcelForm({ ...secExcelForm, section: e.target.value })}
                      className="w-full p-2.5 bg-white text-slate-800 font-semibold rounded-xl border-0 focus:ring-2 focus:ring-sky-300"
                    >
                      {DataService.getSections().map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Semester</label>
                    <select
                      value={secExcelForm.semester}
                      onChange={(e) => setSecExcelForm({ ...secExcelForm, semester: e.target.value })}
                      className="w-full p-2.5 bg-white text-slate-800 font-semibold rounded-xl border-0 focus:ring-2 focus:ring-sky-300"
                    >
                      {DataService.getSemesters().map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-blue-100">
                    Includes: Roll No, Student Name, all semester subject lecture columns (Attended / Held), total attended, and final percentage column.
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSectionMasterExcel}
                    disabled={secExcelExporting}
                    className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-700 font-black rounded-xl text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {secExcelExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Master Sheet...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Section Master Attendance Sheet (.xlsx)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 2. DAILY SECTION ATTENDANCE REGISTER (Date-wise Report) */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Daily Section Attendance Register</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pick a specific date to view all lectures conducted on that day and export the day's complete period register.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-800 text-xs font-mono font-bold rounded-xl border border-indigo-200">
                    Lectures on Date: {dailyMatchingSessions.length}
                  </span>
                  
                  {dailyMatchingSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportDailySectionExcel}
                      disabled={dailyExporting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {dailyExporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Day Excel (.xlsx)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Daily Filter Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Select Date
                  </label>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="w-full p-2 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-900 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch</label>
                  <select
                    value={dailyBranch}
                    onChange={(e) => setDailyBranch(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Year</label>
                  <select
                    value={dailyYear}
                    onChange={(e) => setDailyYear(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getYears().map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={dailySection}
                    onChange={(e) => setDailySection(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getSections().map(s => <option key={s} value={s}>Sec {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Day's Lectures Summary Badges */}
              {dailyMatchingSessions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Lectures on {new Date(dailyDate).toLocaleDateString("en-IN")}:
                    </span>
                    {dailyMatchingSessions.map((sess, idx) => (
                      <span
                        key={sess.id}
                        className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>P{idx + 1}: {sess.subjectName}</span>
                        <span className="text-[10px] text-indigo-500 font-normal">
                          ({sess.createdAt ? new Date(sess.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""})
                        </span>
                      </span>
                    ))}
                  </div>

                  {/* Daily Period-wise Student Matrix Table Header & Quick Search */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div className="relative max-w-sm w-full">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="🔍 Filter day table by Student Name or Roll No..."
                        value={dailyStudentSearchQuery}
                        onChange={(e) => setDailyStudentSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                      {dailyStudentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setDailyStudentSearchQuery("")}
                          className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-semibold">
                      Showing {dailyMatchingStudents.filter(s =>
                        !dailyStudentSearchQuery ||
                        s.name?.toLowerCase().includes(dailyStudentSearchQuery.toLowerCase()) ||
                        s.rollNo?.toLowerCase().includes(dailyStudentSearchQuery.toLowerCase())
                      ).length} of {dailyMatchingStudents.length} student(s)
                    </span>
                  </div>

                  {/* Daily Period-wise Student Matrix Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Roll No</th>
                          <th className="py-3 px-4">Student Name</th>
                          {dailyMatchingSessions.map((s, idx) => (
                            <th key={s.id} className="py-3 px-4 text-center">
                              P{idx + 1}: {s.subjectName}
                            </th>
                          ))}
                          <th className="py-3 px-4 text-center">Attended</th>
                          <th className="py-3 px-4 text-center">Day %</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {dailyMatchingStudents.length === 0 ? (
                          <tr>
                            <td colSpan={4 + dailyMatchingSessions.length} className="py-6 text-center text-slate-400">
                              No approved students registered in {dailyBranch} {dailyYear} Sec-{dailySection}.
                            </td>
                          </tr>
                        ) : (
                          dailyMatchingStudents
                            .filter(s =>
                              !dailyStudentSearchQuery ||
                              s.name?.toLowerCase().includes(dailyStudentSearchQuery.toLowerCase()) ||
                              s.rollNo?.toLowerCase().includes(dailyStudentSearchQuery.toLowerCase())
                            )
                            .map((stud, idx) => {
                            let studentAttendedToday = 0;

                            return (
                              <tr key={stud.uid} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                                <td className="py-3 px-4 font-mono font-bold text-blue-700">{stud.rollNo}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{stud.name}</td>
                                {dailyMatchingSessions.map((sess) => {
                                  const isPresent = attendance.some(a =>
                                    a.sessionId === sess.id &&
                                    (a.studentId === stud.uid || a.studentRoll === stud.rollNo || a.rollNo === stud.rollNo)
                                  );

                                  if (isPresent) studentAttendedToday += 1;

                                  return (
                                    <td key={sess.id} className="py-3 px-4 text-center">
                                      {isPresent ? (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
                                          ✅ Present
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded font-bold text-[11px]">
                                          ❌ Absent
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}

                                <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                                  {studentAttendedToday} / {dailyMatchingSessions.length}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                                    dailyMatchingSessions.length > 0 && Math.round((studentAttendedToday / dailyMatchingSessions.length) * 100) >= 75
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}>
                                    {dailyMatchingSessions.length > 0
                                      ? `${Math.round((studentAttendedToday / dailyMatchingSessions.length) * 100)}%`
                                      : "100%"}
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    studentAttendedToday === dailyMatchingSessions.length
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : studentAttendedToday === 0
                                      ? "bg-red-100 text-red-800 border border-red-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  }`}>
                                    {studentAttendedToday === dailyMatchingSessions.length
                                      ? "✅ Full Day"
                                      : studentAttendedToday === 0
                                      ? "❌ All Absent"
                                      : "⚠️ Partial"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 bg-slate-50 space-y-1">
                  <p className="font-semibold text-slate-600">No class sessions conducted on this date.</p>
                  <p>
                    There are no recorded class lectures for <span className="font-bold text-slate-700">{dailyBranch} {dailyYear} Sec-{dailySection}</span> on <span className="font-bold text-slate-700">{new Date(dailyDate).toLocaleDateString("en-IN")}</span>. Select a different date above.
                  </p>
                </div>
              )}
            </div>

            {/* 3. STUDENT 360° NUMERICAL ATTENDANCE EXPLORER */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Student 360° Attendance Explorer</h2>
                  </div>
                  <p className="text-xs text-slate-500">
                    Search any student directly or filter by class to view their exact numerical attendance numbers and subject breakdown.
                  </p>
                </div>
                <span className="px-3 py-1 bg-sky-50 text-sky-800 text-xs font-mono font-bold rounded-xl border border-sky-200">
                  Detailed Numerical Metrics
                </span>
              </div>

              {/* Universal Instant Quick Search Bar */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-2xl border border-blue-200 shadow-xs">
                  <Search className="w-5 h-5 text-blue-600 shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="🔍 Instant Student Search: Type any Roll Number (e.g. 2301316029) or Name (e.g. Priyanka)..."
                    value={explorerSearchQuery}
                    onChange={(e) => setExplorerSearchQuery(e.target.value)}
                    className="w-full bg-white px-3.5 py-2.5 border border-blue-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  {explorerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setExplorerSearchQuery("")}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Instant Search Results Dropdown List */}
                {explorerSearchQuery.trim().length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-blue-200 p-2 z-30 max-h-64 overflow-y-auto space-y-1 animate-in fade-in">
                    {approvedStudents.filter(s =>
                      s.name?.toLowerCase().includes(explorerSearchQuery.toLowerCase()) ||
                      s.rollNo?.toLowerCase().includes(explorerSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No student found matching "{explorerSearchQuery}"
                      </div>
                    ) : (
                      approvedStudents.filter(s =>
                        s.name?.toLowerCase().includes(explorerSearchQuery.toLowerCase()) ||
                        s.rollNo?.toLowerCase().includes(explorerSearchQuery.toLowerCase())
                      ).map(stud => (
                        <div
                          key={stud.uid}
                          onClick={() => {
                            setExplorerStudentId(stud.uid);
                            setExplorerBranch(stud.branch || "CSE");
                            setExplorerYear(stud.year || "1st");
                            setExplorerSection(stud.section || "A");
                            setExplorerSearchQuery("");
                          }}
                          className="p-3 hover:bg-blue-50/80 rounded-xl flex items-center justify-between cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {stud.name?.[0] || "S"}
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-900 block">{stud.name}</span>
                              <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {stud.rollNo}
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-lg">
                            {stud.branch} • {stud.year} • Sec {stud.section}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Class & Student Filter Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch</label>
                  <select
                    value={explorerBranch}
                    onChange={(e) => { setExplorerBranch(e.target.value); setExplorerStudentId(""); }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
                  <select
                    value={explorerYear}
                    onChange={(e) => { setExplorerYear(e.target.value); setExplorerStudentId(""); }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getYears().map(y => <option key={y} value={y}>{y} Year</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Section</label>
                  <select
                    value={explorerSection}
                    onChange={(e) => { setExplorerSection(e.target.value); setExplorerStudentId(""); }}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 cursor-pointer"
                  >
                    {DataService.getSections().map(s => <option key={s} value={s}>Sec {s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Select Student</label>
                  <select
                    value={explorerStudentId}
                    onChange={(e) => handleSelectExplorerStudent(e.target.value)}
                    className="w-full p-2 bg-white border border-blue-300 rounded-xl font-bold text-blue-900 cursor-pointer focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Choose Student ({explorerMatchingStudents.length}) --</option>
                    {explorerMatchingStudents.map(s => (
                      <option key={s.uid} value={s.uid}>
                        {s.name} ({s.rollNo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Student Attendance Breakdown Display */}
              {explorerLoading ? (
                <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Computing subject attendance records...</span>
                </div>
              ) : explorerStudentId && explorerStudentStats.length > 0 ? (() => {
                const selectedStudent = users.find(u => u.uid === explorerStudentId);
                const totalAtt = explorerStudentStats.reduce((a, c) => a + (c.attendedClasses || 0), 0);
                const totalHeld = explorerStudentStats.reduce((a, c) => a + (c.totalClasses || 0), 0);
                const overallPct = totalHeld > 0 ? Math.round((totalAtt / totalHeld) * 100) : 100;
                const isEligible = overallPct >= 75;

                return (
                  <div className="space-y-6 pt-2">
                    
                    {/* Overview Banner Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900">{selectedStudent?.name}</h3>
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-mono font-bold">
                            {selectedStudent?.rollNo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          {selectedStudent?.branch} • {selectedStudent?.year} Year • Section {selectedStudent?.section} (Semester {selectedStudent?.semester || "1"})
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 font-semibold">Total Attendance</div>
                          <div className="text-lg font-black text-slate-900 font-mono">
                            {totalAtt} <span className="text-xs text-slate-400 font-normal">/ {totalHeld} Classes</span>
                          </div>
                        </div>

                        <div className={`p-3 rounded-2xl border text-center min-w-[100px] ${
                          isEligible
                            ? "bg-emerald-100/80 text-emerald-900 border-emerald-300"
                            : "bg-red-100/80 text-red-900 border-red-300"
                        }`}>
                          <div className="text-xl font-black">{overallPct}%</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider">
                            {isEligible ? "✅ Eligible" : "⚠️ Shortage"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Numerical Breakdown Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Subject Code</th>
                            <th className="py-3 px-4">Subject Name</th>
                            <th className="py-3 px-4 text-center">Total Held</th>
                            <th className="py-3 px-4 text-center">Classes Attended</th>
                            <th className="py-3 px-4 text-center">Percentage</th>
                            <th className="py-3 px-4 text-center">BPUT Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {explorerStudentStats.map((sub, idx) => (
                            <tr key={sub.code || idx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-3 px-4 font-mono font-bold text-blue-700">{sub.code || "—"}</td>
                              <td className="py-3 px-4 font-bold text-slate-800">{sub.subjectName}</td>
                              <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                                {sub.totalClasses || 0}
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                                {sub.attendedClasses || 0}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-1 rounded-lg font-mono font-extrabold text-xs ${
                                  sub.percentage >= 75
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {sub.percentage || 0}%
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  sub.isWarning
                                    ? "bg-red-100 text-red-800 border border-red-200"
                                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                }`}>
                                  {sub.isWarning ? "⚠️ Shortage (<75%)" : "✅ Eligible"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 bg-slate-50">
                  Select a student from the dropdown above to view their complete numerical attendance numbers and subject breakdown.
                </div>
              )}
            </div>

            {/* 3. GLOBAL ATTENDANCE AUDIT LOGS */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Wide Attendance Scan Stream</h2>
                  <p className="text-xs text-slate-500">Live attendance log entries across all branches and subjects</p>
                </div>

                {/* Filters & Export Buttons */}
                <div className="flex items-center space-x-2">
                  <select
                    value={reportFilter.branch}
                    onChange={(e) => setReportFilter({ ...reportFilter, branch: e.target.value })}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="All">All Branches</option>
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                  </select>

                  <button
                    onClick={() => exportAttendancePDF({ title: "Global Macro Report", branch: reportFilter.branch, records: filteredAttendance })}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>

                  <button
                    onClick={() => exportAttendanceExcel({ title: "Global Macro Report", branch: reportFilter.branch, records: filteredAttendance })}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50/60 border-y border-blue-100 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Branch / Sec</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Marked Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">
                          No attendance logs match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.slice().reverse().map((att) => (
                        <tr key={att.id} className="hover:bg-blue-50/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{att.rollNo}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{att.studentName}</td>
                          <td className="py-3 px-4 text-slate-700">{att.branch} Sec-{att.section}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{att.subjectName}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(att.markedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
