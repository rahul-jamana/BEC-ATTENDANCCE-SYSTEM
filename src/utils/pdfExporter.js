import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

/**
 * Exports Attendance Report as a PDF with BEC College branding header
 */
export const exportAttendancePDF = ({ title, branch, year, section, semester, subject, records }) => {
  const doc = new jsPDF();

  // Header Colors & Title
  doc.setFillColor(21, 101, 192); // #1565C0 Royal Blue
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BHUBANESWAR ENGINEERING COLLEGE (BEC)", 14, 13);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Official Attendance Report — ${title || "Class Summary"}`, 14, 21);

  // Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  doc.text(`Branch: ${branch || "All"} | Year: ${year || "All"} | Section: ${section || "All"}`, 14, 36);
  doc.text(`Semester: ${semester || "All"} | Subject: ${subject || "All"} | Date: ${new Date().toLocaleDateString()}`, 14, 42);

  // Table Columns & Rows
  const tableColumn = ["#", "Roll No", "Student Name", "Branch", "Section", "Status", "Time Marked"];
  const tableRows = records.map((rec, index) => [
    index + 1,
    rec.rollNo || "N/A",
    rec.studentName || "N/A",
    rec.branch || "-",
    rec.section || "-",
    rec.status ? rec.status.toUpperCase() : "PRESENT",
    rec.markedAt ? new Date(rec.markedAt).toLocaleString() : "-"
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 48,
    theme: "striped",
    headStyles: {
      fillColor: [21, 101, 192],
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold"
    },
    styles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [240, 246, 255] }
  });

  // Save File
  const filename = `BEC_Attendance_${branch || "All"}_${subject || "Report"}_${Date.now()}.pdf`;
  doc.save(filename);
};

/**
 * Exports Attendance Report as Excel (.xlsx) file
 */
export const exportAttendanceExcel = ({ title, branch, subject, records }) => {
  const exportData = records.map((rec, index) => ({
    "S.No": index + 1,
    "Roll Number": rec.rollNo || "",
    "Student Name": rec.studentName || "",
    "Branch": rec.branch || "",
    "Year": rec.year || "",
    "Section": rec.section || "",
    "Semester": rec.semester || "",
    "Subject": rec.subjectName || subject || "",
    "Attendance Status": rec.status ? rec.status.toUpperCase() : "PRESENT",
    "Marked Timestamp": rec.markedAt ? new Date(rec.markedAt).toLocaleString() : ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");

  const filename = `BEC_Attendance_${branch || "All"}_${subject || "Report"}_${Date.now()}.xlsx`;
  XLSX.writeFile(workbook, filename);
};
