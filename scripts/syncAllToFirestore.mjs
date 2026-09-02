import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDocs, collection } from "firebase/firestore";
import { FIRST_YEAR_STUDENTS } from "../src/data/students1stYear.js";

const firebaseConfig = {
  apiKey: "AIzaSyC8-xW8PG4xDf-UI9pBH0jMwrWIIfk2mUQ",
  authDomain: "bec-at-system.firebaseapp.com",
  projectId: "bec-at-system",
  storageBucket: "bec-at-system.firebasestorage.app",
  messagingSenderId: "5275309105",
  appId: "1:5275309105:web:051261270458c3695bb110"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_ADMIN_USERS = [
  {
    uid: "admin_01",
    email: "admin@bec.ac.in",
    name: "BEC System Administrator",
    role: "admin",
    department: "Administration",
    password: "demo123",
    status: "approved",
    createdAt: new Date().toISOString()
  },
  {
    uid: "teacher_01",
    email: "teacher@bec.ac.in",
    name: "Dr. Rajesh Sharma",
    role: "teacher",
    department: "CSE",
    password: "demo123",
    status: "approved",
    createdAt: new Date().toISOString()
  }
];

async function syncAllToFirestore() {
  console.log(`Starting Firestore sync of ${FIRST_YEAR_STUDENTS.length} students + default users...`);

  // 1. Sync default admin and teacher accounts
  for (const adminUser of DEFAULT_ADMIN_USERS) {
    try {
      await setDoc(doc(db, "users", adminUser.uid), adminUser, { merge: true });
      console.log(`✓ Synced admin/teacher: ${adminUser.name} (${adminUser.email})`);
    } catch (err) {
      console.error(`✗ Failed to sync ${adminUser.email}:`, err.message);
    }
  }

  // 2. Sync all 183 1st Year Students
  let successCount = 0;
  let failCount = 0;

  for (const student of FIRST_YEAR_STUDENTS) {
    try {
      const studentDoc = {
        ...student,
        email: (student.email || "").trim().toLowerCase(),
        rollNo: (student.rollNo || student.tempId || "").trim().toUpperCase(),
        tempId: (student.tempId || student.rollNo || "").trim().toUpperCase(),
        regNo: (student.regNo || "").trim().toUpperCase(),
        password: student.password || student.dob || "demo123",
        dob: student.dob || student.password || "",
        status: student.status || "approved",
        role: "student",
        syncedToFirestoreAt: new Date().toISOString()
      };

      await setDoc(doc(db, "users", student.uid), studentDoc, { merge: true });
      successCount++;
      if (successCount % 25 === 0 || successCount === FIRST_YEAR_STUDENTS.length) {
        console.log(`Progress: ${successCount}/${FIRST_YEAR_STUDENTS.length} students synced...`);
      }
    } catch (err) {
      console.error(`✗ Error syncing student ${student.name} (${student.uid}):`, err.message);
      failCount++;
    }
  }

  console.log(`\n🎉 Sync Complete! Successfully synced ${successCount} students. Failed: ${failCount}`);

  // 3. Verify total count in Firestore
  const snap = await getDocs(collection(db, "users"));
  console.log(`📊 Total documents now in Firestore 'users' collection: ${snap.docs.length}`);
  process.exit(0);
}

syncAllToFirestore().catch(err => {
  console.error("Fatal sync error:", err);
  process.exit(1);
});
