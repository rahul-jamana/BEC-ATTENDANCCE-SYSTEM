import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Fetches any image URL (Cloudinary CDN or Base64 dataURL) and returns { base64, extension } */
const fetchImageBase64 = async (url) => {
  if (!url) return null;
  try {
    // Already a base64 data URL
    if (url.startsWith("data:")) {
      const base64 = url.split(",")[1];
      const extension = url.includes("png") ? "png" : "jpeg";
      return { base64, extension };
    }
    // Remote URL (Cloudinary CDN, etc.)
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        const extension = blob.type.includes("png") ? "png" : "jpeg";
        resolve({ base64, extension });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/** Triggers browser file download for an ExcelJS workbook */
const downloadExcelWorkbook = async (wb, filename) => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Shared header fill & font styles */
const BEC_BLUE = "FF1565C0";
const BEC_BLUE_LIGHT = "FF1976D2";
const WHITE = "FFFFFFFF";
const GREEN = "FF2E7D32";
const STRIPE = "FFF0F8FF";

const headerFill = (argb = BEC_BLUE) => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});
const boldWhite = (size = 11) => ({ bold: true, color: { argb: WHITE }, size });
const centerMiddle = { horizontal: "center", vertical: "middle" };

/** Applies BEC college banner to a worksheet (rows 1-2) */
const applyCollegeBanner = (ws, totalCols) => {
  const endCol = String.fromCharCode(64 + totalCols);
  ws.mergeCells(`A1:${endCol}1`);
  const title = ws.getCell("A1");
  title.value = "BHUBANESWAR ENGINEERING COLLEGE (BEC)";
  title.fill = headerFill();
  title.font = boldWhite(15);
  title.alignment = centerMiddle;
  ws.getRow(1).height = 38;

  ws.mergeCells(`A2:${endCol}2`);
  const subtitle = ws.getCell("A2");
  subtitle.value = "Official BEC Attendance Management System — Biometric Verified Report";
  subtitle.fill = headerFill(BEC_BLUE_LIGHT);
  subtitle.font = boldWhite(10);
  subtitle.alignment = centerMiddle;
  ws.getRow(2).height = 22;
};

/** Applies styled column header row */
const applyTableHeader = (ws, rowNum, headers) => {
  const hRow = ws.getRow(rowNum);
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = h;
    cell.fill = headerFill();
    cell.font = boldWhite(10);
    cell.alignment = centerMiddle;
    cell.border = { bottom: { style: "thin", color: { argb: "FF90CAF9" } } };
  });
  hRow.height = 28;
};


// ─────────────────────────────────────────────
// PDF EXPORT (unchanged)
// ─────────────────────────────────────────────

export const exportAttendancePDF = async ({ title, branch, year, section, semester, subject, records, session }) => {
  const doc = new jsPDF();

  // ── Header Banner ──
  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("BHUBANESWAR ENGINEERING COLLEGE (BEC)", 14, 13);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Official Attendance Report — ${title || "Class Summary"}`, 14, 21);

  // ── Session/Class Info Row ──
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  let infoY = 36;

  // If session has teacher photo, embed it
  if (session?.teacherPhoto) {
    try {
      const tImg = await fetchImageBase64(session.teacherPhoto);
      if (tImg) {
        doc.addImage(`data:image/${tImg.extension};base64,${tImg.base64}`, tImg.extension.toUpperCase(), 165, 31, 22, 22, undefined, "FAST");
        doc.setDrawColor(21, 101, 192);
        doc.setLineWidth(0.5);
        doc.roundedRect(164.5, 30.5, 23, 23, 2, 2, "S");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(21, 101, 192);
        doc.text("Faculty ✓", 170, 56);
      }
    } catch (_) {}
  }

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  if (session?.teacherName) {
    doc.text(`Faculty: ${session.teacherName}`, 14, infoY);
    infoY += 6;
  }
  doc.text(`Branch: ${branch || "All"} | Year: ${year || "All"} | Section: ${section || "All"}`, 14, infoY);
  infoY += 6;
  doc.text(`Semester: ${semester || "All"} | Subject: ${subject || "All"} | Date: ${new Date().toLocaleDateString()}`, 14, infoY);
  infoY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total Students Present: ${records.length}`, 14, infoY);
  infoY += 6;

  // ── Student Table (text columns) ──
  const tableColumn = ["#", "Roll No", "Student Name", "Branch", "Section", "Status", "Time Marked"];
  const tableRows = records.map((rec, index) => [
    index + 1,
    rec.rollNo || "N/A",
    rec.studentName || "N/A",
    rec.branch || "-",
    rec.section || "-",
    rec.status ? rec.status.toUpperCase() : "PRESENT",
    rec.markedAt ? new Date(rec.markedAt).toLocaleString() : "-",
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: infoY,
    theme: "striped",
    headStyles: { fillColor: [21, 101, 192], textColor: 255, fontSize: 9, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2, minCellHeight: 10 },
    alternateRowStyles: { fillColor: [240, 246, 255] },
  });

  // ── Student Photo Grid Page ──
  const photosToEmbed = records.filter(r => r.livePhoto);
  if (photosToEmbed.length > 0) {
    doc.addPage();
    doc.setFillColor(21, 101, 192);
    doc.rect(0, 0, 210, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Student Live Verification Photos", 14, 11);

    let px = 14;
    let py = 22;
    const imgW = 28;
    const imgH = 28;
    const labelH = 12;
    const gapX = 6;
    const gapY = 8;
    const colsPerRow = 5;
    let col = 0;

    for (const rec of photosToEmbed) {
      try {
        const imgData = await fetchImageBase64(rec.livePhoto);
        if (imgData) {
          // Blue border around photo
          doc.setDrawColor(21, 101, 192);
          doc.setLineWidth(0.4);
          doc.roundedRect(px - 0.5, py - 0.5, imgW + 1, imgH + 1, 1, 1, "S");

          doc.addImage(
            `data:image/${imgData.extension};base64,${imgData.base64}`,
            imgData.extension.toUpperCase(),
            px, py, imgW, imgH, undefined, "FAST"
          );

          // Name + Roll label under photo
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          const nameText = (rec.studentName || "Student").substring(0, 16);
          doc.text(nameText, px + imgW / 2, py + imgH + 4, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(rec.rollNo || "", px + imgW / 2, py + imgH + 7.5, { align: "center" });
          doc.text(
            rec.markedAt ? new Date(rec.markedAt).toLocaleTimeString() : "",
            px + imgW / 2, py + imgH + 10.5, { align: "center" }
          );
        }
      } catch (_) {}

      col++;
      if (col >= colsPerRow) {
        col = 0;
        px = 14;
        py += imgH + labelH + gapY;
        // New page if needed
        if (py + imgH + labelH > 285) {
          doc.addPage();
          py = 14;
        }
      } else {
        px += imgW + gapX;
      }
    }
  }

  const filename = `BEC_Attendance_${branch || "All"}_${subject || "Report"}_${Date.now()}.pdf`;
  doc.save(filename);
};


// ─────────────────────────────────────────────
// TEACHER SESSION EXCEL — with Teacher Photo + Student Selfies
// ─────────────────────────────────────────────

export const exportTeacherSessionExcel = async ({ session, teacherProfile, records }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BEC Attendance System";
  wb.created = new Date();

  // ── Sheet 1: Session Info & Teacher Details ──────────────────────
  const infoSheet = wb.addWorksheet("Session Info");

  applyCollegeBanner(infoSheet, 5);

  // Column widths for info sheet
  [18, 28, 22, 22, 20].forEach((w, i) => {
    infoSheet.getColumn(i + 1).width = w;
  });

  // Teacher live photo (top-left, rows 4-9)
  const teacherImgData = session?.teacherPhoto
    ? await fetchImageBase64(session.teacherPhoto)
    : null;

  if (teacherImgData) {
    const imgId = wb.addImage({ base64: teacherImgData.base64, extension: teacherImgData.extension });
    infoSheet.addImage(imgId, { tl: { col: 0, row: 3 }, ext: { width: 110, height: 110 } });
    for (let r = 4; r <= 10; r++) infoSheet.getRow(r).height = 18;
  }

  // Label row
  const labelRow = infoSheet.getRow(3);
  labelRow.getCell(2).value = "FACULTY VERIFIED LIVE PHOTO";
  labelRow.getCell(2).font = { bold: true, color: { argb: BEC_BLUE }, size: 11 };
  labelRow.getCell(2).alignment = { vertical: "middle" };
  labelRow.height = 20;

  // Teacher & session details starting from col B row 4
  const sessionDetails = [
    ["Faculty Name", session?.teacherName || teacherProfile?.name || ""],
    ["Department", teacherProfile?.department || "CSE"],
    ["Subject", session?.subjectName || ""],
    ["Branch / Year / Section", `${session?.branch || ""} | ${session?.year || ""} | Sec-${session?.section || ""}`],
    ["Semester", `Semester ${session?.semester || ""}`],
    ["Session Date & Time", session?.createdAt ? new Date(session.createdAt).toLocaleString("en-IN") : ""],
    ["Total Students Present", records?.length || 0],
    ["Report Generated", new Date().toLocaleString("en-IN")],
  ];

  sessionDetails.forEach(([label, value], i) => {
    const row = infoSheet.getRow(4 + i);
    const labelCell = row.getCell(2);
    const valCell = row.getCell(3);
    labelCell.value = label;
    labelCell.font = { bold: true, color: { argb: BEC_BLUE } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
    labelCell.border = { right: { style: "thin", color: { argb: "FFBBDEFB" } } };
    valCell.value = String(value);
    valCell.font = { bold: false, size: 10 };
    row.height = 18;
  });

  // ── Sheet 2: Student Attendance with Live Selfie Photos ────────────
  const attSheet = wb.addWorksheet("Student Attendance");

  applyCollegeBanner(attSheet, 10);

  // Column widths
  const attCols = [10, 6, 14, 24, 10, 10, 10, 22, 20, 18, 12];
  attCols.forEach((w, i) => { attSheet.getColumn(i + 1).width = w; });

  // Table header at row 3
  applyTableHeader(attSheet, 3, [
    "📸 Selfie", "S.No", "Roll No", "Student Name",
    "Branch", "Section", "Sem", "Subject",
    "Verification", "Time Marked", "Status",
  ]);

  // Data rows starting at row 4
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 4; // 1-based Excel row
    const exRow = attSheet.getRow(rowNum);
    exRow.height = 58;

    const cells = [
      [2, i + 1],
      [3, rec.rollNo || ""],
      [4, rec.studentName || ""],
      [5, rec.branch || ""],
      [6, rec.section || ""],
      [7, `Sem ${rec.semester || ""}`],
      [8, rec.subjectName || ""],
      [9, rec.medicalExemption ? "Medical" : rec.markedByAdmin ? "Admin" : "Live Photo + QR"],
      [10, rec.markedAt ? new Date(rec.markedAt).toLocaleString("en-IN") : ""],
      [11, "✅ PRESENT"],
    ];

    cells.forEach(([col, val]) => {
      const cell = exRow.getCell(col);
      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: col === 4 ? "left" : "center" };
      if (col === 11) cell.font = { color: { argb: GREEN }, bold: true };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
      }
    });

    // Student live selfie photo in column A
    if (rec.livePhoto) {
      const imgData = await fetchImageBase64(rec.livePhoto);
      if (imgData) {
        const imgId = wb.addImage({ base64: imgData.base64, extension: imgData.extension });
        // 0-based: row = rowNum - 1, col = 0 (column A)
        attSheet.addImage(imgId, {
          tl: { col: 0, row: rowNum - 1 },
          ext: { width: 52, height: 52 },
        });
      }
    }

    exRow.commit();
  }

  const filename = `BEC_Teacher_Session_${session?.subjectName || "Report"}_${session?.branch || ""}_Sec${session?.section || ""}_${Date.now()}.xlsx`;
  await downloadExcelWorkbook(wb, filename);
};


// ─────────────────────────────────────────────
// GENERAL SESSION ATTENDANCE EXCEL (for older export button)
// ─────────────────────────────────────────────

export const exportAttendanceExcel = async ({ title, branch, subject, records, session }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BEC Attendance System";

  const ws = wb.addWorksheet("Attendance Log");
  applyCollegeBanner(ws, 9);

  // Meta row
  const meta = ws.getRow(3);
  meta.getCell(1).value = `${title || "Class Attendance"} | Branch: ${branch || "All"} | Subject: ${subject || "All"} | Generated: ${new Date().toLocaleString("en-IN")}`;
  meta.getCell(1).font = { bold: true, size: 10, color: { argb: BEC_BLUE } };
  ws.mergeCells("A3:I3");
  meta.height = 20;

  const cols = [10, 6, 14, 24, 10, 10, 22, 20, 14];
  cols.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  applyTableHeader(ws, 4, [
    "📸 Photo", "S.No", "Roll No", "Student Name",
    "Branch", "Section", "Subject", "Time Marked", "Status",
  ]);

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 5;
    const exRow = ws.getRow(rowNum);
    exRow.height = 58;

    [
      [2, i + 1],
      [3, rec.rollNo || ""],
      [4, rec.studentName || ""],
      [5, rec.branch || ""],
      [6, rec.section || ""],
      [7, rec.subjectName || subject || ""],
      [8, rec.markedAt ? new Date(rec.markedAt).toLocaleString("en-IN") : ""],
      [9, "✅ PRESENT"],
    ].forEach(([col, val]) => {
      const cell = exRow.getCell(col);
      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: col === 4 ? "left" : "center" };
      if (col === 9) cell.font = { color: { argb: GREEN }, bold: true };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
    });

    if (rec.livePhoto) {
      const imgData = await fetchImageBase64(rec.livePhoto);
      if (imgData) {
        const imgId = wb.addImage({ base64: imgData.base64, extension: imgData.extension });
        ws.addImage(imgId, { tl: { col: 0, row: rowNum - 1 }, ext: { width: 52, height: 52 } });
      }
    }

    exRow.commit();
  }

  const filename = `BEC_Attendance_${branch || "All"}_${subject || "Report"}_${Date.now()}.xlsx`;
  await downloadExcelWorkbook(wb, filename);
};


// ─────────────────────────────────────────────
// STUDENT PERSONAL COMPLETE EXCEL — with selfie per log row
// ─────────────────────────────────────────────

export const exportStudentCompleteExcel = async ({ studentProfile, stats, records }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BEC Attendance System";

  const totalAttended = stats.reduce((a, c) => a + (c.attendedClasses || 0), 0);
  const totalClasses = stats.reduce((a, c) => a + (c.totalClasses || 0), 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

  // ── Sheet 1: Overview Summary ─────────────────
  const summarySheet = wb.addWorksheet("Overview Summary");
  applyCollegeBanner(summarySheet, 3);

  summarySheet.getColumn(1).width = 32;
  summarySheet.getColumn(2).width = 30;
  summarySheet.getColumn(3).width = 20;

  const summaryRows = [
    ["Student Name", studentProfile?.name || ""],
    ["Roll Number", studentProfile?.rollNo || ""],
    ["Branch & Section", `${studentProfile?.branch || ""} – Sec ${studentProfile?.section || ""}`],
    ["Year & Semester", `${studentProfile?.year || ""} Year (Sem ${studentProfile?.semester || ""})`],
    ["Total Classes Held", totalClasses],
    ["Total Classes Attended", totalAttended],
    ["Overall Attendance %", `${overallPct}%`],
    ["BPUT Eligibility Status", overallPct >= 75 ? "✅ ELIGIBLE (≥75%)" : "❌ SHORTAGE (<75%)"],
    ["Report Generated", new Date().toLocaleString("en-IN")],
  ];

  summaryRows.forEach(([label, value], i) => {
    const row = summarySheet.getRow(i + 3);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: BEC_BLUE } };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F4FF" } };
    row.getCell(2).value = String(value);
    if (i === 7) {
      row.getCell(2).font = { bold: true, color: { argb: overallPct >= 75 ? GREEN : "FFCC0000" } };
    }
    row.height = 20;
  });

  // ── Sheet 2: Subject Breakdown ────────────────
  const subSheet = wb.addWorksheet("Subject Breakdown");
  applyCollegeBanner(subSheet, 7);

  [6, 8, 28, 18, 18, 20, 20].forEach((w, i) => { subSheet.getColumn(i + 1).width = w; });
  applyTableHeader(subSheet, 3, ["S.No", "Code", "Subject Name", "Attended", "Total Held", "Percentage", "Eligibility"]);

  stats.forEach((sub, i) => {
    const row = subSheet.getRow(i + 4);
    [
      [1, i + 1],
      [2, sub.code || "-"],
      [3, sub.subjectName || ""],
      [4, sub.attendedClasses || 0],
      [5, sub.totalClasses || 0],
      [6, `${sub.percentage || 0}%`],
      [7, sub.isWarning ? "❌ SHORTAGE" : "✅ GOOD"],
    ].forEach(([col, val]) => {
      const cell = row.getCell(col);
      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: col === 3 ? "left" : "center" };
      if (col === 7) cell.font = { bold: true, color: { argb: sub.isWarning ? "FFCC0000" : GREEN } };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
    });
    row.height = 22;
  });

  // ── Sheet 3: Activity Log with Selfie Photos ──
  const logSheet = wb.addWorksheet("Attendance Activity Log");
  applyCollegeBanner(logSheet, 9);

  [10, 6, 24, 20, 10, 10, 10, 20, 14].forEach((w, i) => { logSheet.getColumn(i + 1).width = w; });
  applyTableHeader(logSheet, 3, [
    "📸 Selfie", "S.No", "Date & Time", "Subject",
    "Branch", "Section", "Sem", "Verification", "Status",
  ]);

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 4;
    const exRow = logSheet.getRow(rowNum);
    exRow.height = 58;

    [
      [2, i + 1],
      [3, rec.markedAt ? new Date(rec.markedAt).toLocaleString("en-IN") : "-"],
      [4, rec.subjectName || "-"],
      [5, rec.branch || ""],
      [6, rec.section || ""],
      [7, `Sem ${rec.semester || ""}`],
      [8, rec.medicalExemption ? "Medical Exemption" : rec.markedByAdmin ? "Admin Override" : "Live Photo + QR Scan"],
      [9, "✅ PRESENT"],
    ].forEach(([col, val]) => {
      const cell = exRow.getCell(col);
      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: [3, 4, 8].includes(col) ? "left" : "center" };
      if (col === 9) cell.font = { bold: true, color: { argb: GREEN } };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
    });

    if (rec.livePhoto) {
      const imgData = await fetchImageBase64(rec.livePhoto);
      if (imgData) {
        const imgId = wb.addImage({ base64: imgData.base64, extension: imgData.extension });
        logSheet.addImage(imgId, { tl: { col: 0, row: rowNum - 1 }, ext: { width: 52, height: 52 } });
      }
    }

    exRow.commit();
  }

  const filename = `BEC_Student_Attendance_${studentProfile?.rollNo || "Report"}_${Date.now()}.xlsx`;
  await downloadExcelWorkbook(wb, filename);
};


// ─────────────────────────────────────────────
// CLASS TOTAL EXCEL — with student selfie column
// ─────────────────────────────────────────────

export const exportClassTotalExcel = async ({ branch, year, section, semester, subject, records }) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BEC Attendance System";

  const ws = wb.addWorksheet("Class Total Attendance");
  applyCollegeBanner(ws, 10);

  const meta = ws.getRow(3);
  meta.getCell(1).value = `Class: ${branch || ""} | ${year || ""} | Sec-${section || ""} | Sem-${semester || ""} | Subject: ${subject || "All"} | Generated: ${new Date().toLocaleString("en-IN")}`;
  meta.getCell(1).font = { bold: true, size: 10, color: { argb: BEC_BLUE } };
  ws.mergeCells("A3:J3");
  meta.height = 20;

  [10, 6, 14, 24, 10, 10, 10, 22, 20, 14].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  applyTableHeader(ws, 4, [
    "📸 Photo", "S.No", "Roll No", "Student Name",
    "Branch", "Section", "Sem", "Subject", "Time Marked", "Status",
  ]);

  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const rowNum = i + 5;
    const exRow = ws.getRow(rowNum);
    exRow.height = 58;

    [
      [2, i + 1],
      [3, rec.rollNo || ""],
      [4, rec.studentName || ""],
      [5, rec.branch || branch || ""],
      [6, rec.section || section || ""],
      [7, `Sem ${rec.semester || semester || ""}`],
      [8, rec.subjectName || subject || ""],
      [9, rec.markedAt ? new Date(rec.markedAt).toLocaleString("en-IN") : ""],
      [10, "✅ PRESENT"],
    ].forEach(([col, val]) => {
      const cell = exRow.getCell(col);
      cell.value = val;
      cell.alignment = { vertical: "middle", horizontal: col === 4 ? "left" : "center" };
      if (col === 10) cell.font = { bold: true, color: { argb: GREEN } };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
    });

    if (rec.livePhoto) {
      const imgData = await fetchImageBase64(rec.livePhoto);
      if (imgData) {
        const imgId = wb.addImage({ base64: imgData.base64, extension: imgData.extension });
        ws.addImage(imgId, { tl: { col: 0, row: rowNum - 1 }, ext: { width: 52, height: 52 } });
      }
    }

    exRow.commit();
  }

  const filename = `BEC_Total_Class_Attendance_${branch || "Class"}_Sec${section || "A"}_${Date.now()}.xlsx`;
  await downloadExcelWorkbook(wb, filename);
};
