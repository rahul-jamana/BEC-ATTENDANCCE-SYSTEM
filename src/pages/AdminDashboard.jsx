import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { parseStudentExcel } from "../utils/excelParser";
import { exportAttendancePDF, exportAttendanceExcel } from "../utils/pdfExporter";
import { 
  Shield, UserCheck, UserX, Users, BookOpen, Upload, FileText, Download, 
  Trash2, Plus, RefreshCw, CheckCircle, AlertCircle, Layers, ClipboardCheck,
  HeartPulse, Sparkles, AlertTriangle, Camera, Image as ImageIcon
} from "lucide-react";

export const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [photoFilter, setPhotoFilter] = useState({ branch: "All", year: "All", section: "All" });
  const [selectedPhoto, setSelectedPhoto] = useState(null);

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

  const studentPhotoEntries = attendance
    .filter(record => record.livePhoto && record.livePhoto.startsWith("http"))
    .filter(record => {
      if (photoFilter.branch !== "All" && record.branch !== photoFilter.branch) return false;
      if (photoFilter.year !== "All" && record.year !== photoFilter.year) return false;
      if (photoFilter.section !== "All" && record.section !== photoFilter.section) return false;
      return true;
    })
    .map(record => ({
      id: record.id,
      type: "student",
      name: record.studentName || "Student",
      rollNo: record.rollNo,
      branch: record.branch,
      year: record.year,
      section: record.section,
      semester: record.semester,
      subjectName: record.subjectName,
      imageUrl: record.livePhoto,
      markedAt: record.markedAt
    }))
    .sort((a, b) => new Date(b.markedAt) - new Date(a.markedAt));

  const teacherPhotoEntries = sessions
    .filter(session => session.teacherPhoto && typeof session.teacherPhoto === "string" && session.teacherPhoto.startsWith("http"))
    .filter(session => {
      if (photoFilter.branch !== "All" && session.branch !== photoFilter.branch) return false;
      if (photoFilter.year !== "All" && session.year !== photoFilter.year) return false;
      if (photoFilter.section !== "All" && session.section !== photoFilter.section) return false;
      return true;
    })
    .map(session => ({
      id: session.id,
      type: "teacher",
      name: session.teacherName || "Faculty",
      branch: session.branch,
      year: session.year,
      section: session.section,
      semester: session.semester,
      subjectName: session.subjectName,
      imageUrl: session.teacherPhoto,
      markedAt: session.createdAt || session.startedAt
    }))
    .sort((a, b) => new Date(b.markedAt || 0) - new Date(a.markedAt || 0));

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
                <h2 className="text-xl font-bold text-slate-900">Admin Photo Review</h2>
                <p className="text-xs text-slate-500">Cloudinary-only student and faculty photo access, separated by role and filtered by class.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={photoFilter.branch}
                  onChange={(e) => setPhotoFilter({ ...photoFilter, branch: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="All">All Branches</option>
                  {DataService.getDepartments().map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  value={photoFilter.year}
                  onChange={(e) => setPhotoFilter({ ...photoFilter, year: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="All">All Years</option>
                  {DataService.getYears().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={photoFilter.section}
                  onChange={(e) => setPhotoFilter({ ...photoFilter, section: e.target.value })}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  <option value="All">All Sections</option>
                  {DataService.getSections().map(s => <option key={s} value={s}>Sec {s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-blue-600" /> Student Live Photos</h3>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg">{studentPhotoEntries.length}</span>
                </div>

                {studentPhotoEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No student photos found for the selected filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {studentPhotoEntries.map(item => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover cursor-pointer" onClick={() => setSelectedPhoto(item.imageUrl)} />
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Student</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-mono">{item.rollNo || "Roll N/A"}</p>
                          <p className="text-[11px] text-slate-600">{item.branch} • {item.year} • Sec {item.section}</p>
                          <p className="text-[11px] text-slate-600">{item.subjectName}</p>
                          <p className="text-[10px] text-slate-500">{new Date(item.markedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Camera className="w-4 h-4 text-sky-600" /> Teacher Photos</h3>
                  <span className="text-xs font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-lg">{teacherPhotoEntries.length}</span>
                </div>

                {teacherPhotoEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No teacher photos found for the selected filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {teacherPhotoEntries.map(item => (
                      <div key={item.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover cursor-pointer" onClick={() => setSelectedPhoto(item.imageUrl)} />
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">Faculty</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{item.branch} • {item.year} • Sec {item.section}</p>
                          <p className="text-[11px] text-slate-600">{item.subjectName}</p>
                          <p className="text-[10px] text-slate-500">{new Date(item.markedAt || Date.now()).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="relative max-w-3xl w-full rounded-3xl bg-white p-3 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 z-10 bg-slate-900/80 text-white rounded-full p-2 hover:bg-slate-700"
              >
                ✕
              </button>
              <img src={selectedPhoto} alt="Selected photo preview" className="w-full max-h-[80vh] object-contain rounded-2xl" />
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
        {activeTab === "users" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Institutional User Roster</h2>
                <p className="text-xs text-slate-500">All registered Students, Teachers, and Administrators</p>
              </div>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg">
                Total Users: {users.length}
              </span>
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
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          u.role === "admin" ? "bg-blue-100 text-blue-800" :
                          u.role === "teacher" ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {u.role === "student" ? `${u.rollNo} • ${u.branch} ${u.year} Sec-${u.section}` : u.department || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                          u.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.uid)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

                {/* Step 1: Select Student */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">Select Student for Medical Relief</label>
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
                      {approvedStudents.map((s) => (
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

                {/* Step 2: Student List */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={matchingStudents.length > 0 && attSelectedStudents.length === matchingStudents.length}
                        onChange={(e) => handleSelectAllStudents(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-700">Select All Students</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {attSelectedStudents.length} / {matchingStudents.length} selected
                    </span>
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
                          matchingStudents.map((s) => (
                            <tr key={s.uid} className={`hover:bg-blue-50/40 transition-colors ${attSelectedStudents.includes(s.uid) ? "bg-blue-50/60" : ""}`}>
                              <td className="py-2.5 px-4">
                                <input
                                  type="checkbox"
                                  checked={attSelectedStudents.includes(s.uid)}
                                  onChange={() => toggleStudent(s.uid)}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
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

        {/* TAB 6: MACRO REPORTS */}
        {activeTab === "reports" && (
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-sm border border-blue-100 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">System Wide Attendance Analytics &amp; Downloads</h2>
                <p className="text-xs text-slate-500">Filtered logs across all branches and sections</p>
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
        )}

      </div>
    </div>
  );
};
