import { db, isLiveFirebaseConfigured } from "../firebase/config";
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, addDoc 
} from "firebase/firestore";

const STORAGE_KEYS = {
  USERS: "bec_users_db",
  SUBJECTS: "bec_subjects_db",
  SESSIONS: "bec_sessions_db",
  ATTENDANCE: "bec_attendance_db",
  DEPARTMENTS: "bec_departments_db"
};

// Initial Seed Data for Instant Local Development & Testing
const DEFAULT_DEPARTMENTS = ["CSE", "ECE", "MECH", "CIVIL", "EEE"];
const DEFAULT_YEARS = ["1st", "2nd", "3rd", "4th"];
const DEFAULT_SECTIONS = ["A", "B", "C", "D"];
const DEFAULT_SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const DEFAULT_USERS = [
  {
    uid: "admin_01",
    email: "admin@bec.ac.in",
    name: "System Administrator",
    role: "admin",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "teacher_01",
    email: "teacher@bec.ac.in",
    name: "Dr. Rajesh Sharma",
    role: "teacher",
    department: "CSE",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "student_rahul",
    email: "rahul@bec.ac.in",
    name: "Rahul Kumar",
    rollNo: "2201CS045",
    branch: "CSE",
    year: "2nd",
    section: "A",
    semester: "3",
    role: "student",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "student_priya",
    email: "priya@bec.ac.in",
    name: "Priya Patel",
    rollNo: "2201CS048",
    branch: "CSE",
    year: "2nd",
    section: "A",
    semester: "3",
    role: "student",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "student_amit",
    email: "amit@bec.ac.in",
    name: "Amit Singh",
    rollNo: "2201ECE012",
    branch: "ECE",
    year: "1st",
    section: "B",
    semester: "1",
    role: "student",
    status: "pending",
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_SUBJECTS = [
  { id: "sub_dbms", name: "DBMS", code: "CS301", branch: "CSE", semester: "3" },
  { id: "sub_maths", name: "Maths", code: "MA301", branch: "CSE", semester: "3" },
  { id: "sub_physics", name: "Physics", code: "PY301", branch: "CSE", semester: "3" },
  { id: "sub_dsa", name: "DSA", code: "CS302", branch: "CSE", semester: "3" },
  { id: "sub_signals", name: "Signals & Systems", code: "EC301", branch: "ECE", semester: "3" }
];

// Helper to seed localStorage
const initializeLocalStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
    // Seed past 20 DBMS sessions for CSE/2nd/A/3 to enable realistic % calculation
    const pastSessions = [];
    const pastAttendance = [];
    const subjectsToSeed = [
      { id: "sub_dbms", name: "DBMS", count: 20, rahulAttended: 17, priyaAttended: 14 },
      { id: "sub_maths", name: "Maths", count: 18, rahulAttended: 13, priyaAttended: 16 }, // 13/18 = 72% (Red Alert!)
      { id: "sub_physics", name: "Physics", count: 15, rahulAttended: 14, priyaAttended: 15 },
      { id: "sub_dsa", name: "DSA", count: 22, rahulAttended: 20, priyaAttended: 18 }
    ];

    subjectsToSeed.forEach(sub => {
      for (let i = 1; i <= sub.count; i++) {
        const sessId = `sess_${sub.id}_${i}`;
        const sessDate = new Date(Date.now() - (sub.count - i) * 86400000 * 2).toISOString();
        pastSessions.push({
          id: sessId,
          branch: "CSE",
          year: "2nd",
          section: "A",
          semester: "3",
          subjectId: sub.id,
          subjectName: sub.name,
          teacherId: "teacher_01",
          teacherName: "Dr. Rajesh Sharma",
          token: `tok_${i}`,
          tokenGeneratedAt: Date.now(),
          expiresAt: Date.now() + 600000,
          isActive: false,
          createdAt: sessDate
        });

        // Add Attendance records
        if (i <= sub.rahulAttended) {
          pastAttendance.push({
            id: `${sessId}_student_rahul`,
            sessionId: sessId,
            studentId: "student_rahul",
            rollNo: "2201CS045",
            studentName: "Rahul Kumar",
            subjectId: sub.id,
            subjectName: sub.name,
            branch: "CSE",
            year: "2nd",
            section: "A",
            semester: "3",
            markedAt: sessDate,
            status: "present"
          });
        }

        if (i <= sub.priyaAttended) {
          pastAttendance.push({
            id: `${sessId}_student_priya`,
            sessionId: sessId,
            studentId: "student_priya",
            rollNo: "2201CS048",
            studentName: "Priya Patel",
            subjectId: sub.id,
            subjectName: sub.name,
            branch: "CSE",
            year: "2nd",
            section: "A",
            semester: "3",
            markedAt: sessDate,
            status: "present"
          });
        }
      }
    });

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(pastSessions));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(pastAttendance));
  }
};

initializeLocalStorage();

// --- DATA SERVICE API ---

export const DataService = {
  // --- USERS ---
  async getUsers() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "users"));
        return snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn("Firestore error, reading local:", e);
      }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
  },

  async getUserById(uid) {
    const users = await this.getUsers();
    return users.find(u => u.uid === uid) || null;
  },

  async createUser(userData) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "users", userData.uid), userData);
        return userData;
      } catch (e) {
        console.warn("Firestore user create failed, saving local:", e);
      }
    }
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    users.push(userData);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return userData;
  },

  async updateUserStatus(uid, status) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "users", uid), { status });
      } catch (e) {
        console.warn("Firestore update user status failed:", e);
      }
    }
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    const idx = users.findIndex(u => u.uid === uid);
    if (idx !== -1) {
      users[idx].status = status;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
    return true;
  },

  async deleteUser(uid) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "users", uid));
      } catch (e) {
        console.warn("Firestore delete user failed:", e);
      }
    }
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    users = users.filter(u => u.uid !== uid);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  },

  // --- SUBJECTS ---
  async getSubjects() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "subjects"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn("Firestore subjects fetch failed:", e);
      }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || "[]");
  },

  async createSubject(subjectData) {
    const newId = `sub_${Date.now()}`;
    const newSub = { id: newId, ...subjectData };
    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "subjects", newId), newSub);
        return newSub;
      } catch (e) {
        console.warn("Firestore subject create failed:", e);
      }
    }
    const subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || "[]");
    subjects.push(newSub);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    return newSub;
  },

  async deleteSubject(subjectId) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "subjects", subjectId));
      } catch (e) {
        console.warn("Firestore delete subject failed:", e);
      }
    }
    let subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || "[]");
    subjects = subjects.filter(s => s.id !== subjectId);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    return true;
  },

  // --- SESSIONS ---
  async getSessions() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "sessions"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn("Firestore sessions fetch failed:", e);
      }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]");
  },

  async createSession(sessionData) {
    const sessionId = `sess_${Date.now()}`;
    const newSession = {
      id: sessionId,
      ...sessionData,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "sessions", sessionId), newSession);
        return newSession;
      } catch (e) {
        console.warn("Firestore create session failed:", e);
      }
    }

    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]");
    sessions.push(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    return newSession;
  },

  async updateSessionToken(sessionId, token) {
    const updateData = { token, tokenGeneratedAt: Date.now() };
    if (isLiveFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), updateData);
      } catch (e) {
        console.warn("Firestore update session token failed:", e);
      }
    }
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]");
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].token = token;
      sessions[idx].tokenGeneratedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    }
  },

  async endSession(sessionId) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "sessions", sessionId), { isActive: false });
      } catch (e) {
        console.warn("Firestore end session failed:", e);
      }
    }
    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || "[]");
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].isActive = false;
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    }
    return true;
  },

  // --- ATTENDANCE ---
  async getAttendance() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "attendance"));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e) {
        console.warn("Firestore attendance fetch failed:", e);
      }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || "[]");
  },

  async markAttendance({ student, session, token }) {
    // 1. Verify student branch + year + section exact match
    if (
      student.branch !== session.branch ||
      student.year !== session.year ||
      student.section !== session.section
    ) {
      throw new Error(
        `This class is not for your section! Required: ${session.branch} ${session.year} Sec ${session.section}`
      );
    }

    // 2. Check if session is active & token valid
    if (!session.isActive) {
      throw new Error("This class session has ended.");
    }
    if (session.token !== token) {
      throw new Error("QR Expired or Invalid token!");
    }

    const attendanceRecords = await this.getAttendance();
    const docId = `${session.id}_${student.uid}`;

    // 3. Check duplicate attendance
    const alreadyMarked = attendanceRecords.some(
      a => a.sessionId === session.id && a.studentId === student.uid
    );
    if (alreadyMarked) {
      throw new Error("Attendance Already Marked for this class!");
    }

    const newRecord = {
      id: docId,
      sessionId: session.id,
      studentId: student.uid,
      studentName: student.name,
      rollNo: student.rollNo,
      branch: student.branch,
      year: student.year,
      section: student.section,
      semester: session.semester,
      subjectId: session.subjectId,
      subjectName: session.subjectName,
      markedAt: new Date().toISOString(),
      status: "present"
    };

    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "attendance", docId), newRecord);
        return newRecord;
      } catch (e) {
        console.warn("Firestore mark attendance failed:", e);
      }
    }

    attendanceRecords.push(newRecord);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
    return newRecord;
  },

  // --- ATTENDANCE STATS CALCULATION ---
  async getStudentSubjectStats(student) {
    const allSessions = await this.getSessions();
    const allAttendance = await this.getAttendance();
    const allSubjects = await this.getSubjects();

    // Relevant subjects for student's branch & semester
    const branchSubjects = allSubjects.filter(
      s => s.branch === student.branch && (s.semester === student.semester || !s.semester)
    );

    // Calculate percentage per subject
    const stats = branchSubjects.map(sub => {
      // Total classes held for this branch + year + section + subject
      const totalClasses = allSessions.filter(
        sess =>
          sess.branch === student.branch &&
          sess.year === student.year &&
          sess.section === student.section &&
          sess.subjectId === sub.id
      ).length;

      // Attended classes by this student for this subject
      const attendedClasses = allAttendance.filter(
        att => att.studentId === student.uid && att.subjectId === sub.id
      ).length;

      const percentage = totalClasses > 0 
        ? Math.round((attendedClasses / totalClasses) * 100) 
        : 100;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        code: sub.code,
        totalClasses,
        attendedClasses,
        percentage,
        isWarning: percentage < 75
      };
    });

    return stats;
  },

  // Constant getters
  getDepartments() {
    return DEFAULT_DEPARTMENTS;
  },
  getYears() {
    return DEFAULT_YEARS;
  },
  getSections() {
    return DEFAULT_SECTIONS;
  },
  getSemesters() {
    return DEFAULT_SEMESTERS;
  }
};
