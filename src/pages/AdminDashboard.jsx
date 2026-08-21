import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DataService } from "../services/dataService";
import { parseStudentExcel } from "../utils/excelParser";
import { exportAttendancePDF, exportAttendanceExcel } from "../utils/pdfExporter";
import { 
  Shield, UserCheck, UserX, Users, BookOpen, Upload, FileText, Download, 
  Trash2, Plus, RefreshCw, CheckCircle, AlertCircle, Layers, ClipboardCheck
} from "lucide-react";

export const AdminDashboard = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");

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

  // Admin Attendance Form
  const [attForm, setAttForm] = useState({ branch: "CSE", year: "1st", section: "A", semester: "1", subjectCode: "" });
  const [attSelectedStudents, setAttSelectedStudents] = useState([]);
  const [attMsg, setAttMsg] = useState("");
  const [attError, setAttError] = useState("");
  const [attProcessing, setAttProcessing] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Admin Header Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                System Administrator
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">BEC System Control Panel</h1>
              <p className="text-xs text-slate-400">Institutional Governance, Student Approvals &amp; Global Roster</p>
            </div>
          </div>

          <button
            onClick={loadAdminData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Data
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex space-x-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "pending"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
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
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => setActiveTab("academic")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "academic"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Subjects &amp; Branches</span>
          </button>

          <button
            onClick={() => setActiveTab("bulk")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "bulk"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Excel Upload</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "attendance"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Macro Reports</span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVALS */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
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
                  <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
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
                      <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{u.rollNo}</td>
                        <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {u.branch} | {u.year} | Sec {u.section} (Sem {u.semester})
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(u.uid)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(u.uid)}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Institutional User Roster</h2>
                <p className="text-xs text-slate-500">All registered Students, Teachers, and Administrators</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-lg text-slate-600">
                Total Users: {users.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Academic Details</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          u.role === "admin" ? "bg-purple-100 text-purple-800" :
                          u.role === "teacher" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
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
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono"
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
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Subject
                </button>
              </form>
            </div>

            {/* Existing Subjects Table */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900">Active Subject Catalog</h3>
                <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-lg">
                  {subjects.length} Subjects Active
                </span>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">Semester</th>
                      <th className="py-2.5 px-3 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{sub.code}</td>
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
            <div className="md:col-span-3 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 border border-purple-800/40">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-purple-800/50 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-purple-500/30 text-purple-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                      BPUT Syllabus Catalog
                    </span>
                    <span className="text-xs text-purple-300/80">All 12 Branches • 8 Semesters</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-white mt-1">Biju Patnaik University of Technology (BPUT) Curriculum</h3>
                  <p className="text-xs text-purple-200/70">Browse official course codes and subjects, and import them with 1-click</p>
                </div>

                {/* Branch and Semester Selectors */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={bputExplorerBranch}
                    onChange={(e) => setBputExplorerBranch(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-purple-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {DataService.getDepartments().map(b => <option key={b} value={b}>{b} Engineering</option>)}
                  </select>

                  <select
                    value={bputExplorerSem}
                    onChange={(e) => setBputExplorerSem(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-purple-500/40 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-purple-400 cursor-pointer"
                  >
                    {DataService.getSemesters().map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>

                  <button
                    onClick={handleImportAllBputForSemester}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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
                      className="bg-slate-800/80 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between hover:border-purple-400/50 transition-all group"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
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
                            : "bg-purple-600 hover:bg-purple-500 text-white shadow-sm"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Admin Bulk Attendance</h2>
                <p className="text-xs text-slate-500">Mark attendance for students directly — no QR scanning needed</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-[10px] uppercase rounded-lg tracking-wider">BPUT Curriculum</span>
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
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 accent-purple-600"
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
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
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
                        <tr key={s.uid} className={`hover:bg-slate-50/80 transition-colors ${attSelectedStudents.includes(s.uid) ? "bg-purple-50/50" : ""}`}>
                          <td className="py-2.5 px-4">
                            <input
                              type="checkbox"
                              checked={attSelectedStudents.includes(s.uid)}
                              onChange={() => toggleStudent(s.uid)}
                              className="w-4 h-4 rounded border-slate-300 text-purple-600 accent-purple-600"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-purple-700">{s.rollNo}</td>
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
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-sm transition-all shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ClipboardCheck className="w-5 h-5" />
              {attProcessing ? "Processing Attendance..." : `Mark Attendance for ${attSelectedStudents.length} Student(s)`}
            </button>
          </div>
        )}

        {/* TAB 5: BULK EXCEL UPLOAD */}
        {activeTab === "bulk" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
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

            <div className="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-3xl p-10 text-center space-y-4 bg-slate-50 transition-colors">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <label htmlFor="excel-file" className="cursor-pointer font-bold text-sm text-purple-700 hover:underline">
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

        {/* TAB 5: MACRO REPORTS */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
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
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>

                <button
                  onClick={() => exportAttendanceExcel({ title: "Global Macro Report", branch: reportFilter.branch, records: filteredAttendance })}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
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
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-purple-700">{att.rollNo}</td>
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
