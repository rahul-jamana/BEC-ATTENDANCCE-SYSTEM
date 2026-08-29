import React, { useState, useEffect } from "react";
import { DataService } from "../services/dataService";
import { 
  X, CheckCircle2, Search, Users, UserCheck, AlertCircle, 
  Sparkles, ShieldCheck, Check, Filter, Layers, BookOpen,
  UserX, RefreshCw
} from "lucide-react";

export const TeacherManualAttendanceModal = ({ isOpen, onClose, session, onAttendanceUpdated }) => {
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all"); // "all" | "present" | "absent"
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [successToast, setSuccessToast] = useState("");

  const isCombinedSession = 
    session?.section?.toLowerCase().includes("ab") || 
    session?.section?.toLowerCase().includes("combine") || 
    session?.isCombined;

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const allUsers = await DataService.getUsers();
      const allAtt = await DataService.getAttendance();

      const normalizeStr = (v) => String(v || "").trim().toLowerCase().replace(/[\s-_+]/g, "");
      const sessionYear = normalizeStr(session.year);
      const sessionBranch = normalizeStr(session.branch);
      const sessionSection = normalizeStr(session.section);

      // Filter matching students
      const enrolled = allUsers.filter(u => {
        if (u.role !== "student") return false;
        const uYear = normalizeStr(u.year);
        const uSec = normalizeStr(u.section);
        const uBranch = normalizeStr(u.branch);

        if (sessionYear && uYear && sessionYear !== uYear) return false;

        if (isCombinedSession) {
          // In A+B combine, include Section A and Section B
          return uSec === "a" || uSec === "b";
        }

        const secMatch = !sessionSection || uSec === sessionSection;
        const branchMatch = session.year === "1st" ? true : (!sessionBranch || uBranch === sessionBranch);
        return secMatch && branchMatch;
      });

      // Sort alphabetically by name
      enrolled.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setStudents(enrolled);

      // Filter attendance records for this session
      const sessionAtt = allAtt.filter(a => a.sessionId === session.id);
      setAttendanceRecords(sessionAtt);
    } catch (err) {
      console.error("Failed to load students for manual attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && session) {
      loadData();
      setSearchQuery("");
      setSelectedSectionFilter("all");
      setSelectedStatusFilter("all");
    }
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const isStudentPresent = (student) => {
    return attendanceRecords.some(
      a => a.studentId === student.uid || 
           (a.rollNo && (a.rollNo === student.rollNo || a.rollNo === student.tempId))
    );
  };

  const handleMarkPresent = async (student) => {
    setActionLoadingId(student.uid);
    try {
      await DataService.teacherManualMarkAttendance({
        session,
        student,
        teacherName: session.teacherName || "Faculty",
        reason: "Manual Attendance (Faculty Verified)"
      });

      setSuccessToast(`Marked ${student.name} as Present!`);
      setTimeout(() => setSuccessToast(""), 3000);

      // Reload local records
      const allAtt = await DataService.getAttendance();
      setAttendanceRecords(allAtt.filter(a => a.sessionId === session.id));

      if (onAttendanceUpdated) {
        onAttendanceUpdated();
      }
    } catch (err) {
      alert("Failed to mark attendance: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAbsent = async (student) => {
    setActionLoadingId(student.uid);
    try {
      await DataService.teacherManualRemoveAttendance({
        sessionId: session.id,
        studentId: student.uid,
        rollNo: student.rollNo || student.tempId
      });

      setSuccessToast(`Marked ${student.name} as Absent!`);
      setTimeout(() => setSuccessToast(""), 3000);

      const allAtt = await DataService.getAttendance();
      setAttendanceRecords(allAtt.filter(a => a.sessionId === session.id));

      if (onAttendanceUpdated) {
        onAttendanceUpdated();
      }
    } catch (err) {
      alert("Failed to mark absent: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    const unpresent = filteredStudents.filter(s => !isStudentPresent(s));
    if (unpresent.length === 0) {
      alert("All students in this view are already marked present!");
      return;
    }

    const confirm = window.confirm(`Mark ${unpresent.length} absent students as Present?`);
    if (!confirm) return;

    setLoading(true);
    try {
      for (const student of unpresent) {
        await DataService.teacherManualMarkAttendance({
          session,
          student,
          teacherName: session.teacherName || "Faculty"
        });
      }
      setSuccessToast(`Successfully marked ${unpresent.length} students as Present!`);
      setTimeout(() => setSuccessToast(""), 3500);

      const allAtt = await DataService.getAttendance();
      setAttendanceRecords(allAtt.filter(a => a.sessionId === session.id));

      if (onAttendanceUpdated) {
        onAttendanceUpdated();
      }
    } catch (err) {
      alert("Error marking bulk attendance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAbsent = async () => {
    const presentList = filteredStudents.filter(isStudentPresent);
    if (presentList.length === 0) {
      alert("All students in this view are already absent!");
      return;
    }

    const confirm = window.confirm(`Mark all ${presentList.length} present students as Absent (revoke attendance)?`);
    if (!confirm) return;

    setLoading(true);
    try {
      for (const student of presentList) {
        await DataService.teacherManualRemoveAttendance({
          sessionId: session.id,
          studentId: student.uid,
          rollNo: student.rollNo || student.tempId
        });
      }
      setSuccessToast(`Successfully marked ${presentList.length} students as Absent!`);
      setTimeout(() => setSuccessToast(""), 3500);

      const allAtt = await DataService.getAttendance();
      setAttendanceRecords(allAtt.filter(a => a.sessionId === session.id));

      if (onAttendanceUpdated) {
        onAttendanceUpdated();
      }
    } catch (err) {
      alert("Error clearing attendance: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchQuery = 
      (s.name || "").toLowerCase().includes(query) ||
      (s.rollNo || "").toLowerCase().includes(query) ||
      (s.tempId || "").toLowerCase().includes(query) ||
      (s.regNo || "").toLowerCase().includes(query) ||
      (s.email || "").toLowerCase().includes(query);

    const matchSection = 
      selectedSectionFilter === "all" || 
      (s.section || "").toLowerCase() === selectedSectionFilter.toLowerCase();

    const present = isStudentPresent(s);
    const matchStatus = 
      selectedStatusFilter === "all" ||
      (selectedStatusFilter === "present" && present) ||
      (selectedStatusFilter === "absent" && !present);

    return matchQuery && matchSection && matchStatus;
  });

  const presentCount = students.filter(isStudentPresent).length;
  const totalCount = students.length;
  const absentCount = totalCount - presentCount;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Manual Attendance Mode
              </span>
              {isCombinedSession && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-black flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Combined Class (Sec A + Sec B)
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black">{session.subjectName || "Class Attendance"}</h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              {session.branch} • {session.year} Year • Section {session.section} (Sem {session.semester}) • Faculty: {session.teacherName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast("")} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar: Stats, Filters & Bulk Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          
          {/* Top Row: Attendance Pill and Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 text-xs font-bold text-slate-700">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Total: {totalCount}</span>
                <span className="text-emerald-700">Present: {presentCount}</span>
                <span className="text-rose-700">Absent: {absentCount}</span>
                <span className="text-blue-700">({attendancePercentage}%)</span>
              </div>

              {/* Status Filter Tabs: All, Present, Absent */}
              <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter("present")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === "present" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-white/60"
                  }`}
                >
                  ✅ Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatusFilter("absent")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedStatusFilter === "absent" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-white/60"
                  }`}
                >
                  ❌ Absent ({absentCount})
                </button>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllPresent}
                disabled={loading || absentCount === 0}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark all absent students as present"
              >
                <Check className="w-3.5 h-3.5" /> Mark All Present
              </button>

              <button
                onClick={handleMarkAllAbsent}
                disabled={loading || presentCount === 0}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset / mark all students as absent"
              >
                <UserX className="w-3.5 h-3.5" /> Mark All Absent
              </button>
            </div>
          </div>

          {/* Bottom Row: Search Box and Section Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student by name, roll no, reg no, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {isCombinedSession && (
              <select
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Sections (A &amp; B)</option>
                <option value="a">Section A (CSE)</option>
                <option value="b">Section B (Data Science)</option>
              </select>
            )}
          </div>

        </div>

        {/* Student Roster Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-semibold">Loading student roster...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-bold text-slate-600">No students found matching the filter</p>
              <p className="text-xs">Try adjusting your search query, status tab, or section filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredStudents.map((student, idx) => {
                const present = isStudentPresent(student);
                const isUpdating = actionLoadingId === student.uid;

                return (
                  <div
                    key={student.uid || idx}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                      present
                        ? "bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300"
                        : "bg-rose-50/40 border-rose-100 hover:border-rose-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          present
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {present ? <Check className="w-4 h-4" /> : "✕"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {student.name}
                          </h4>
                          <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {student.rollNo || student.tempId}
                          </span>
                          {student.regNo && (
                            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Reg: {student.regNo}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            Sec {student.section}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium hidden md:inline">
                            {student.branch}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate font-mono">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Mark Present vs Mark Absent */}
                    <div className="flex items-center gap-2 shrink-0">
                      {present ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
                          </span>
                          <button
                            onClick={() => handleMarkAbsent(student)}
                            disabled={isUpdating}
                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Unmark attendance (Change to Absent)"
                          >
                            <UserX className="w-3 h-3 text-rose-500" />
                            <span>{isUpdating ? "Updating..." : "Mark Absent"}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold">
                            ❌ Absent
                          </span>
                          <button
                            onClick={() => handleMarkPresent(student)}
                            disabled={isUpdating}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-105 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            title="Mark student as Present"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isUpdating ? "Marking..." : "Mark Present"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filteredStudents.length}</strong> of {totalCount} students ({presentCount} Present, {absentCount} Absent)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
