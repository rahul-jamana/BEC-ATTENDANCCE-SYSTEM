import * as XLSX from "xlsx";

/**
 * Parses uploaded Excel (.xlsx, .xls, .csv) file for student roster bulk import.
 * Expected columns: Name, Roll No, Email, Branch, Year, Section, Semester
 */
export const parseStudentExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        // Normalize keys and map fields
        const parsedStudents = rawJson.map((row, idx) => {
          const keys = Object.keys(row);
          const getKey = (pattern) => keys.find(k => k.toLowerCase().replace(/[^a-z]/g, "").includes(pattern));

          const nameKey = getKey("name") || keys[0];
          const rollKey = getKey("roll") || keys[1];
          const emailKey = getKey("email") || keys[2];
          const branchKey = getKey("branch") || keys[3];
          const yearKey = getKey("year") || keys[4];
          const sectionKey = getKey("section") || keys[5];
          const semKey = getKey("sem") || keys[6];

          return {
            uid: `uid_bulk_${Date.now()}_${idx}`,
            name: row[nameKey] ? String(row[nameKey]).trim() : `Student ${idx + 1}`,
            rollNo: row[rollKey] ? String(row[rollKey]).trim() : `ROLL${1000 + idx}`,
            email: row[emailKey] ? String(row[emailKey]).trim() : `student${idx + 1}@bec.ac.in`,
            branch: row[branchKey] ? String(row[branchKey]).trim().toUpperCase() : "CSE",
            year: row[yearKey] ? String(row[yearKey]).trim() : "2nd",
            section: row[sectionKey] ? String(row[sectionKey]).trim().toUpperCase() : "A",
            semester: row[semKey] ? String(row[semKey]).trim() : "3",
            role: "student",
            status: "approved", // Bulk uploaded students auto-approved by Admin
            createdAt: new Date().toISOString()
          };
        });

        resolve(parsedStudents);
      } catch (error) {
        reject(new Error("Failed to parse Excel file: " + error.message));
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
