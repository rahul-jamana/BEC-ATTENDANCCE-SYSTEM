import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { LibraryService } from "../services/libraryService";
import { DataService } from "../services/dataService";
import * as XLSX from "xlsx";
import { QRCodeSVG } from "qrcode.react";
import jsQR from "jsqr";
import {
  BookOpen, Search, ArrowLeft, Plus, CheckCircle2, AlertCircle, Clock,
  BookMarked, Users, RefreshCw, Download, FileText, Library,
  Sparkles, Shield, Bookmark, User, Calendar, Tag, Layers, ChevronRight,
  AlertTriangle, Check, Trash2, Edit3, X, ExternalLink, QrCode, Camera, SwitchCamera
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LibraryPage = () => {
  const { userProfile, role } = useAuth();
  const navigate = useNavigate();

  const isAdmin = role === "admin";

  // Data States
  const [books, setBooks] = useState([]);
  const [records, setRecords] = useState([]);
  const [notes, setNotes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student active tab ("browse" | "my_books" | "notes" | "id_card")
  // Admin active tab ("catalog" | "issue" | "records" | "notes")
  const [activeTab, setActiveTab] = useState(isAdmin ? "catalog" : "browse");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Admin Modal States
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookFormData, setBookFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    department: "CSE",
    category: "Core Engineering",
    semester: "1",
    shelfLocation: "Rack 1, Shelf A",
    totalCopies: 5,
    availableCopies: 5,
    description: ""
  });

  // Issue Form State (Admin)
  const [issueStudentSearch, setIssueStudentSearch] = useState("");
  const [selectedStudentForIssue, setSelectedStudentForIssue] = useState(null);
  const [selectedBookForIssue, setSelectedBookForIssue] = useState(null);
  const [loanDays, setLoanDays] = useState(14);
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Return & Clear Due Modal State (Admin)
  const [returnModalRecord, setReturnModalRecord] = useState(null);
  const [returnPaymentMode, setReturnPaymentMode] = useState("Cash");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnProcessing, setReturnProcessing] = useState(false);

  // Camera QR / Barcode Scanner State (Admin)
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerFacingMode, setScannerFacingMode] = useState("environment");
  const [scannerError, setScannerError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  const startCameraScanner = () => {
    setScannerError("");
    setIsScannerOpen(true);
  };

  const stopCameraScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
  };

  useEffect(() => {
    if (!isScannerOpen) return;

    let active = true;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: scannerFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          requestAnimationFrame(scanQRCodeTick);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setScannerError("Camera permission denied or camera not found.");
      }
    };

    const scanQRCodeTick = () => {
      if (!active || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
          const raw = code.data.trim();
          const matched = students.find(s =>
            (s.rollNo && s.rollNo.toUpperCase() === raw.toUpperCase()) ||
            (s.uid && s.uid === raw) ||
            (s.tempId && s.tempId.toUpperCase() === raw.toUpperCase()) ||
            (s.regNo && s.regNo.toUpperCase() === raw.toUpperCase()) ||
            raw.includes(s.rollNo)
          );

          if (matched) {
            setSelectedStudentForIssue(matched);
            showToast("success", `Scanned Pass for: ${matched.name} (${matched.rollNo})`);
            stopCameraScanner();
            return;
          } else {
            setScannerError(`Scanned code: "${raw}", but no matching student found.`);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanQRCodeTick);
    };

    initCamera();

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [isScannerOpen, scannerFacingMode, students]);

  // Digital Note Modal State
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteFormData, setNoteFormData] = useState({
    title: "",
    subject: "",
    department: "Common (1st Year)",
    semester: "1",
    fileUrl: "",
    fileSize: "2.5 MB"
  });

  // Toast / Feedback Message
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: "", message: "" }), 4000);
  };

  // Open Return & Clear Due Modal
  const openReturnModal = (record) => {
    const isOverdue = new Date() > new Date(record.dueDate);
    let fineAmount = 0;
    if (isOverdue) {
      const diffTime = Math.abs(new Date() - new Date(record.dueDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * 2;
    }

    setReturnModalRecord({
      ...record,
      calculatedFine: fineAmount,
      isOverdue
    });
    setReturnPaymentMode("Cash");
    setReturnRemarks("");
  };

  // Confirm Return & Clear Due
  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!returnModalRecord) return;

    setReturnProcessing(true);
    try {
      await LibraryService.returnBook({
        recordId: returnModalRecord.id,
        finePaid: true,
        remarks: `${returnPaymentMode} payment. ${returnRemarks}`.trim()
      });
      showToast("success", `Cleared dues and returned "${returnModalRecord.bookTitle}".`);
      setReturnModalRecord(null);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to process return.");
    } finally {
      setReturnProcessing(false);
    }
  };

  // Load All Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedBooks, fetchedRecords, fetchedNotes, allUsers] = await Promise.all([
        LibraryService.getBooks(),
        LibraryService.getBorrowRecords(),
        LibraryService.getDigitalNotes(),
        DataService.getUsers()
      ]);
      const fetchedStudents = (allUsers || []).filter(u => u.role === "student" && u.status === "approved");
      setBooks(fetchedBooks);
      setRecords(fetchedRecords);
      setNotes(fetchedNotes);
      setStudents(fetchedStudents || []);
    } catch (e) {
      console.error("Failed to load library data:", e);
      showToast("error", "Failed to fetch library information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesSearch =
        (b.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.isbn || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBranch =
        selectedBranch === "All" ||
        b.department === selectedBranch ||
        (selectedBranch === "1st Year" && (b.department === "Common (1st Year)" || b.semester === "1" || b.semester === "2"));

      const matchesCategory =
        selectedCategory === "All" || b.category === selectedCategory;

      return matchesSearch && matchesBranch && matchesCategory;
    });
  }, [books, searchQuery, selectedBranch, selectedCategory]);

  // Student specific records
  const myIssuedRecords = useMemo(() => {
    if (!userProfile) return [];
    return records.filter(r =>
      (userProfile.uid && r.studentId === userProfile.uid) ||
      (userProfile.rollNo && r.rollNo && r.rollNo.toLowerCase() === userProfile.rollNo.toLowerCase())
    );
  }, [records, userProfile]);

  const myActiveLoans = useMemo(() => {
    return myIssuedRecords.filter(r => r.status === "issued");
  }, [myIssuedRecords]);

  // Filtered Students for Issue Search (Admin)
  const filteredStudentsForIssue = useMemo(() => {
    if (!issueStudentSearch.trim()) return [];
    const query = issueStudentSearch.toLowerCase();
    return students.filter(s =>
      (s.name || "").toLowerCase().includes(query) ||
      (s.rollNo || "").toLowerCase().includes(query) ||
      (s.regNo || "").toLowerCase().includes(query)
    ).slice(0, 6);
  }, [students, issueStudentSearch]);

  // Handle Add/Edit Book Submit
  const handleSaveBook = async (e) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await LibraryService.updateBook(editingBook.id, bookFormData);
        showToast("success", `Updated "${bookFormData.title}" successfully.`);
      } else {
        await LibraryService.addBook(bookFormData);
        showToast("success", `Added "${bookFormData.title}" to catalog.`);
      }
      setIsAddBookOpen(false);
      setEditingBook(null);
      setBookFormData({
        title: "",
        author: "",
        isbn: "",
        department: "CSE",
        category: "Core Engineering",
        semester: "1",
        shelfLocation: "Rack 1, Shelf A",
        totalCopies: 5,
        availableCopies: 5,
        description: ""
      });
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to save book.");
    }
  };

  // Handle Delete Book
  const handleDeleteBook = async (book) => {
    if (!window.confirm(`Are you sure you want to remove "${book.title}" from library inventory?`)) return;
    try {
      await LibraryService.deleteBook(book.id);
      showToast("success", "Book removed from catalog.");
      loadData();
    } catch (err) {
      showToast("error", "Failed to delete book.");
    }
  };

  // Handle Issue Book Submit
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentForIssue) {
      showToast("error", "Please select a student to issue the book to.");
      return;
    }
    if (!selectedBookForIssue) {
      showToast("error", "Please select a book from the list.");
      return;
    }

    setIssueSubmitting(true);
    try {
      await LibraryService.issueBook({
        bookId: selectedBookForIssue.id,
        student: selectedStudentForIssue,
        loanDays
      });
      showToast("success", `Issued "${selectedBookForIssue.title}" to ${selectedStudentForIssue.name}.`);
      setSelectedStudentForIssue(null);
      setSelectedBookForIssue(null);
      setIssueStudentSearch("");
      loadData();
      setActiveTab("records");
    } catch (err) {
      showToast("error", err.message || "Failed to issue book.");
    } finally {
      setIssueSubmitting(false);
    }
  };

  // Handle Return Book
  const handleReturnRecord = async (record) => {
    const isOverdue = new Date() > new Date(record.dueDate);
    let fineMsg = "";
    if (isOverdue) {
      const diffTime = Math.abs(new Date() - new Date(record.dueDate));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const fine = diffDays * 2;
      fineMsg = ` Book is ${diffDays} days overdue (Late fine: ₹${fine}).`;
    }

    if (!window.confirm(`Confirm return of "${record.bookTitle}" by ${record.studentName}?${fineMsg}`)) return;

    try {
      await LibraryService.returnBook({ recordId: record.id, finePaid: true });
      showToast("success", `Returned "${record.bookTitle}". Book copy returned to stock.`);
      loadData();
    } catch (err) {
      showToast("error", err.message || "Failed to return book.");
    }
  };

  // Handle Add Digital Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    try {
      await LibraryService.addDigitalNote({
        ...noteFormData,
        uploadedBy: userProfile?.name || "Library Admin"
      });
      showToast("success", "Uploaded study resource successfully.");
      setIsAddNoteOpen(false);
      setNoteFormData({
        title: "",
        subject: "",
        department: "Common (1st Year)",
        semester: "1",
        fileUrl: "",
        fileSize: "2.5 MB"
      });
      loadData();
    } catch (err) {
      showToast("error", "Failed to add digital note.");
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (note) => {
    if (!window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await LibraryService.deleteDigitalNote(note.id);
      showToast("success", "Resource removed.");
      loadData();
    } catch (err) {
      showToast("error", "Failed to delete resource.");
    }
  };

  // Export Catalog to Excel
  const exportCatalogToExcel = () => {
    const rows = books.map((b, idx) => ({
      "SL No": idx + 1,
      "Book Title": b.title,
      "Author": b.author,
      "ISBN / Code": b.isbn || "N/A",
      "Department": b.department,
      "Category": b.category,
      "Semester": b.semester,
      "Shelf Location": b.shelfLocation || "General",
      "Total Copies": b.totalCopies,
      "Available Copies": b.availableCopies,
      "Status": b.availableCopies > 0 ? "Available" : "Out of Stock"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Library Catalog");
    XLSX.writeFile(wb, `BEC_Library_Catalog_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Export Circulation Records to Excel
  const exportRecordsToExcel = () => {
    const rows = records.map((r, idx) => ({
      "SL No": idx + 1,
      "Book Title": r.bookTitle,
      "Student Name": r.studentName,
      "Roll No / USN": r.rollNo,
      "Branch": r.branch,
      "Issue Date": new Date(r.issueDate).toLocaleDateString(),
      "Due Date": new Date(r.dueDate).toLocaleDateString(),
      "Return Date": r.returnDate ? new Date(r.returnDate).toLocaleDateString() : "Not Returned",
      "Status": r.status.toUpperCase(),
      "Fine (₹)": r.fineAmount || 0
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Borrow Records");
    XLSX.writeFile(wb, `BEC_Library_Circulation_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Overall Stats
  const totalBooksCount = books.length;
  const totalCopiesCount = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
  const activeIssuedCount = records.filter(r => r.status === "issued").length;
  const overdueCount = records.filter(r => r.status === "issued" && new Date() > new Date(r.dueDate)).length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Library className="w-3.5 h-3.5 text-blue-600" /> BEC Central Library
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Library Portal & Knowledge Hub
              </h1>
              <p className="text-sm text-slate-500">
                Explore books, check loan status, and access digital study materials.
              </p>
            </div>

            {/* Role indicator & Refresh */}
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="Refresh Library Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingBook(null);
                    setBookFormData({
                      title: "",
                      author: "",
                      isbn: "",
                      department: "CSE",
                      category: "Core Engineering",
                      semester: "1",
                      shelfLocation: "Rack 1, Shelf A",
                      totalCopies: 5,
                      availableCopies: 5,
                      description: ""
                    });
                    setIsAddBookOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Book</span>
                </button>
              )}
            </div>
          </div>

          {/* KPI Mini Cards (For Admin) */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Titles</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{totalBooksCount}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Copies</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block">{totalCopiesCount}</span>
              </div>
              <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Currently Issued</span>
                <span className="text-xl font-bold text-blue-800 mt-1 block">{activeIssuedCount}</span>
              </div>
              <div className={`rounded-xl p-3.5 border ${overdueCount > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider block">Overdue Books</span>
                <span className="text-xl font-bold mt-1 block">{overdueCount}</span>
              </div>
            </div>
          )}

          {/* Student Quick Summary Pill */}
          {!isAdmin && myActiveLoans.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-900">
                    You currently have {myActiveLoans.length} {myActiveLoans.length === 1 ? "book" : "books"} borrowed.
                  </h4>
                  <p className="text-xs text-blue-700">
                    Check return due dates in the "My Issued Books" tab to avoid late fees.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("my_books")}
                className="px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50 transition-colors"
              >
                View Borrowed Books →
              </button>
            </div>
          )}
        </div>

        {/* Feedback Alert Toast */}
        {feedback.message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          {/* Tabs for Students */}
          {!isAdmin ? (
            <>
              <button
                onClick={() => setActiveTab("browse")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "browse"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Browse Catalog</span>
              </button>

              <button
                onClick={() => setActiveTab("my_books")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === "my_books"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookMarked className="w-4 h-4" />
                <span>My Issued Books</span>
                {myActiveLoans.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === "my_books" ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                  }`}>
                    {myActiveLoans.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "notes"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Notes & Question Papers</span>
              </button>

              <button
                onClick={() => setActiveTab("id_card")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "id_card"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Library Digital Pass</span>
              </button>
            </>
          ) : (
            // Tabs for Admin / Librarian
            <>
              <button
                onClick={() => setActiveTab("catalog")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "catalog"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Book Catalog</span>
              </button>

              <button
                onClick={() => setActiveTab("issue")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "issue"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Issue Book</span>
              </button>

              <button
                onClick={() => setActiveTab("records")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === "records"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <BookMarked className="w-4 h-4" />
                <span>Circulation Records</span>
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
                    {overdueCount} Overdue
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("notes")}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "notes"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Study Materials & PYQs</span>
              </button>
            </>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: BROWSE / CATALOG VIEW (For Both Students & Admin)
        ────────────────────────────────────────────────────────────── */}
        {(activeTab === "browse" || activeTab === "catalog") && (
          <div className="space-y-6">
            {/* Search & Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Title, Author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden"
                >
                  <option value="All">All Departments</option>
                  <option value="Common (1st Year)">1st Year (Common)</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden"
                >
                  <option value="All">All Categories</option>
                  <option value="Core Engineering">Core Engineering</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Reference">Reference</option>
                </select>

                {isAdmin && (
                  <button
                    onClick={exportCatalogToExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    title="Export to Excel"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel</span>
                  </button>
                )}
              </div>
            </div>

            {/* Books Grid */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-500">Loading library collection...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No books found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => {
                  const isAvailable = book.availableCopies > 0;
                  return (
                    <div
                      key={book.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        {/* Tags / Header */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {book.department}
                          </span>
                          
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {isAvailable ? `${book.availableCopies} Available` : "Checked Out"}
                          </span>
                        </div>

                        {/* Title & Author */}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {book.title}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            By {book.author}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                          {book.isbn && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">ISBN / Code:</span>
                              <span className="font-mono text-[11px] font-semibold text-slate-700">{book.isbn}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Location:</span>
                            <span className="font-medium text-slate-700 text-[11px] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                              📍 {book.shelfLocation || "Rack 1"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 text-[11px]">Category:</span>
                            <span className="text-slate-700 font-medium text-[11px]">{book.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (Admin edit/delete or Student view) */}
                      {isAdmin ? (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedBookForIssue(book);
                              setActiveTab("issue");
                            }}
                            disabled={!isAvailable}
                            className="flex-1 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors text-center"
                          >
                            Issue Book
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingBook(book);
                              setBookFormData(book);
                              setIsAddBookOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Book"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteBook(book)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Book"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                          <span className="text-[11px] text-slate-400 block">
                            Visit Central Library counter with your Roll No to borrow.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: MY ISSUED BOOKS (For Students)
        ────────────────────────────────────────────────────────────── */}
        {!isAdmin && activeTab === "my_books" && (
          <div className="space-y-4">
            {/* Library Clearance / No-Dues Official Status Card */}
            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              myActiveLoans.length === 0
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  myActiveLoans.length === 0 ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {myActiveLoans.length === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Library Clearance Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      myActiveLoans.length === 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900"
                    }`}>
                      {myActiveLoans.length === 0 ? "NO DUES CLEAR" : "DUES PENDING"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-90">
                    {myActiveLoans.length === 0
                      ? "All library books returned and no pending late fines. Eligible for semester & exam clearance."
                      : `You have ${myActiveLoans.length} active borrowed book(s). Please return them to obtain complete No-Dues clearance.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-1">My Borrowed Books History</h2>
              <p className="text-xs text-slate-500">
                Track your active and returned library books.
              </p>

              {myIssuedRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <BookMarked className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No books currently borrowed</p>
                  <p className="text-xs text-slate-500 mt-0.5">You don't have any active or past library loan records.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {myIssuedRecords.map((record) => {
                    const isReturned = record.status === "returned";
                    const dueDate = new Date(record.dueDate);
                    const now = new Date();
                    const isOverdue = !isReturned && now > dueDate;
                    
                    const diffDays = Math.ceil(Math.abs(dueDate - now) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={record.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isReturned
                            ? "bg-slate-50/70 border-slate-200 opacity-80"
                            : isOverdue
                            ? "bg-red-50/60 border-red-200"
                            : "bg-white border-blue-100 shadow-2xs"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isReturned
                                  ? "bg-slate-200 text-slate-700"
                                  : isOverdue
                                  ? "bg-red-600 text-white"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {isReturned ? "Returned" : isOverdue ? `Overdue by ${diffDays} days` : `Active Loan (${diffDays} days left)`}
                              </span>
                              {record.shelfLocation && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  📍 {record.shelfLocation}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{record.bookTitle}</h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Author: {record.bookAuthor || "N/A"}
                            </p>
                          </div>

                          <div className="text-left sm:text-right text-xs space-y-1">
                            <div className="text-slate-600">
                              <span className="text-slate-400">Issued On:</span>{" "}
                              <span className="font-semibold">{new Date(record.issueDate).toLocaleDateString()}</span>
                            </div>
                            <div className={isOverdue ? "text-red-700 font-bold" : "text-slate-700"}>
                              <span className="text-slate-400">Due Date:</span>{" "}
                              <span className="font-semibold">{dueDate.toLocaleDateString()}</span>
                            </div>
                            {isReturned && record.returnDate && (
                              <div className="text-emerald-700 text-[11px] font-medium">
                                Returned on {new Date(record.returnDate).toLocaleDateString()}
                              </div>
                            )}
                            {isOverdue && (
                              <div className="text-xs font-bold text-red-600">
                                Estimated Late Fine: ₹{diffDays * 2} (₹2/day)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: ISSUE BOOK FORM (For Admin)
        ────────────────────────────────────────────────────────────── */}
        {isAdmin && activeTab === "issue" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Issue Book to Student</h2>
            <p className="text-xs text-slate-500 mb-6">
              Search and select a student and an available book from the library catalog.
            </p>

            <form onSubmit={handleIssueSubmit} className="space-y-6">
              {/* Step 1: Select Student */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>1. Select Student (Search by Name or Roll No)</span>
                  {selectedStudentForIssue && (
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForIssue(null)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Clear Selection
                    </button>
                  )}
                </label>

                {selectedStudentForIssue ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">{selectedStudentForIssue.name}</h4>
                      <p className="text-[11px] text-blue-700">
                        Roll No: {selectedStudentForIssue.rollNo} • Branch: {selectedStudentForIssue.branch} • Year: {selectedStudentForIssue.year}
                      </p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Type student name or roll number..."
                          value={issueStudentSearch}
                          onChange={(e) => setIssueStudentSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={startCameraScanner}
                        className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                        title="Scan Student QR / Digital Pass with Camera"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Scan QR Pass</span>
                      </button>
                    </div>

                    {filteredStudentsForIssue.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-sm max-h-48 overflow-y-auto">
                        {filteredStudentsForIssue.map((s) => (
                          <div
                            key={s.id || s.uid || s.rollNo}
                            onClick={() => {
                              setSelectedStudentForIssue(s);
                              setIssueStudentSearch("");
                            }}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-500">
                                Roll No: {s.rollNo} • Branch: {s.branch} • Sec: {s.section}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600">Select →</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Select Book */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Select Book to Issue
                </label>
                <select
                  value={selectedBookForIssue?.id || ""}
                  onChange={(e) => {
                    const book = books.find(b => b.id === e.target.value);
                    setSelectedBookForIssue(book || null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Choose an Available Book --</option>
                  {books.map((b) => (
                    <option
                      key={b.id}
                      value={b.id}
                      disabled={b.availableCopies <= 0}
                    >
                      {b.title} ({b.department}) - {b.availableCopies > 0 ? `${b.availableCopies} available` : "Out of stock"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Loan Duration */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  3. Loan Duration (Days)
                </label>
                <div className="flex items-center gap-3">
                  {[7, 14, 21, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setLoanDays(days)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        loanDays === days
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={issueSubmitting || !selectedStudentForIssue || !selectedBookForIssue}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {issueSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Issue Book</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: CIRCULATION RECORDS & RETURNS (For Admin)
        ────────────────────────────────────────────────────────────── */}
        {isAdmin && activeTab === "records" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Circulation & Return Desk</h2>
                <p className="text-xs text-slate-500">
                  Track active issues, mark returned books, and record late fines.
                </p>
              </div>
              <button
                onClick={exportRecordsToExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Loan Records</span>
              </button>
            </div>

            {records.length === 0 ? (
              <div className="py-12 text-center">
                <BookMarked className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No circulation records yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">Book Title</th>
                      <th className="py-3 px-3">Student Name & Roll No</th>
                      <th className="py-3 px-3">Issue Date</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {records.map((r) => {
                      const isReturned = r.status === "returned";
                      const isOverdue = !isReturned && new Date() > new Date(r.dueDate);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{r.bookTitle}</span>
                            <span className="text-[10px] text-slate-400">{r.shelfLocation || "General"}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 block">{r.studentName}</span>
                            <span className="text-[10px] text-slate-500">{r.rollNo} • {r.branch}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(r.issueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className={isOverdue ? "font-bold text-red-600" : "text-slate-600"}>
                              {new Date(r.dueDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isReturned
                                ? "bg-slate-100 text-slate-700"
                                : isOverdue
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {isReturned ? "Returned" : isOverdue ? "Overdue" : "Issued"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {!isReturned ? (
                              <button
                                onClick={() => openReturnModal(r)}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                  isOverdue
                                    ? "bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border-red-200"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border-emerald-200"
                                }`}
                              >
                                {isOverdue ? "Clear Due & Return" : "Process Return"}
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Returned
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: DIGITAL NOTES & QUESTION PAPERS (Both Roles)
        ────────────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Digital Notes, Syllabus & PYQs</h2>
                  <p className="text-xs text-slate-500">
                    Download official lecture notes, previous year question papers, and lab manuals.
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setIsAddNoteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Resource</span>
                  </button>
                )}
              </div>

              {notes.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No digital materials uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                            {note.department} • Sem {note.semester}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {note.fileSize || "PDF"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {note.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Subject: {note.subject}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <a
                          href={note.fileUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download / View</span>
                        </a>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteNote(note)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-md"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 6: DIGITAL STUDENT LIBRARY PASS / ID CARD (Student)
        ────────────────────────────────────────────────────────────── */}
        {!isAdmin && activeTab === "id_card" && userProfile && (
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-blue-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-white text-xs">
                    BEC
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-tight">BHUBANESWAR ENGG. COLLEGE</h3>
                    <p className="text-[10px] text-blue-200 tracking-wider uppercase">Digital Library Pass</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>

              {/* Student Details */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-blue-200/70 uppercase tracking-wider block">Member Name</span>
                  <span className="text-base font-extrabold text-white tracking-wide block">{userProfile.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-blue-200/70 uppercase block">Roll / Reg No</span>
                    <span className="font-mono font-bold text-blue-100">{userProfile.rollNo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-200/70 uppercase block">Department</span>
                    <span className="font-bold text-blue-100">{userProfile.branch} ({userProfile.year} Yr)</span>
                  </div>
                </div>
              </div>

              {/* QR Code & Barcode Scannable Area */}
              <div className="mt-6 pt-4 border-t border-white/10 bg-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                <div className="bg-white p-3 rounded-2xl shadow-md">
                  <QRCodeSVG
                    value={userProfile.rollNo || userProfile.uid || "STUDENT"}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="font-mono text-xs font-black tracking-widest text-blue-100 uppercase">
                    {userProfile.rollNo || userProfile.uid}
                  </p>
                  <p className="text-[10px] text-blue-200/80 mt-0.5">
                    Scan this QR at the library counter to issue/return books
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-center text-blue-200/60 mt-3">
                Show this digital pass to the librarian for instant camera scanning.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT BOOK (Admin)
      ────────────────────────────────────────────────────────────── */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingBook ? "Edit Library Book" : "Add Book to Library"}
              </h3>
              <button
                onClick={() => setIsAddBookOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Algorithms"
                  value={bookFormData.title}
                  onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cormen, Leiserson, Rivest"
                  value={bookFormData.author}
                  onChange={(e) => setBookFormData({ ...bookFormData, author: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={bookFormData.department}
                    onChange={(e) => setBookFormData({ ...bookFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Common (1st Year)">Common (1st Year)</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={bookFormData.category}
                    onChange={(e) => setBookFormData({ ...bookFormData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Core Engineering">Core Engineering</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Reference">Reference</option>
                    <option value="Competitive Exam">Competitive Exam</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ISBN / Code</label>
                  <input
                    type="text"
                    placeholder="978-..."
                    value={bookFormData.isbn}
                    onChange={(e) => setBookFormData({ ...bookFormData, isbn: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Copies</label>
                  <input
                    type="number"
                    min="1"
                    value={bookFormData.totalCopies}
                    onChange={(e) => setBookFormData({
                      ...bookFormData,
                      totalCopies: e.target.value,
                      availableCopies: editingBook ? bookFormData.availableCopies : e.target.value
                    })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Shelf Location</label>
                  <input
                    type="text"
                    placeholder="Rack 2, Shelf A"
                    value={bookFormData.shelfLocation}
                    onChange={(e) => setBookFormData({ ...bookFormData, shelfLocation: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBookOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  {editingBook ? "Save Changes" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD DIGITAL NOTE (Admin)
      ────────────────────────────────────────────────────────────── */}
      {isAddNoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upload Digital Resource</h3>
              <button
                onClick={() => setIsAddNoteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics-I Solved Question Bank"
                  value={noteFormData.title}
                  onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics-I (MA101)"
                  value={noteFormData.subject}
                  onChange={(e) => setNoteFormData({ ...noteFormData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={noteFormData.department}
                    onChange={(e) => setNoteFormData({ ...noteFormData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    <option value="Common (1st Year)">Common (1st Year)</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={noteFormData.semester}
                    onChange={(e) => setNoteFormData({ ...noteFormData, semester: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                  >
                    {[1,2,3,4,5,6,7,8].map(s => (
                      <option key={s} value={String(s)}>Sem {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Download / File URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://... (Google Drive, Cloudinary, or PDF link)"
                  value={noteFormData.fileUrl}
                  onChange={(e) => setNoteFormData({ ...noteFormData, fileUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddNoteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  Upload Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: RETURN BOOK & CLEAR DUE (Admin)
      ────────────────────────────────────────────────────────────── */}
      {returnModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  returnModalRecord.isOverdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {returnModalRecord.isOverdue ? "Clear Overdue Late Fee & Return" : "Process Book Return"}
                  </h3>
                  <p className="text-[10px] text-slate-500">Central Library Circulation Counter</p>
                </div>
              </div>
              <button
                onClick={() => setReturnModalRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="mt-4 space-y-4">
              {/* Summary Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Book Title:</span>
                  <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{returnModalRecord.bookTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-semibold text-slate-800">{returnModalRecord.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Roll No / USN:</span>
                  <span className="font-mono font-semibold text-slate-800">{returnModalRecord.rollNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="font-semibold text-slate-800">{new Date(returnModalRecord.dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Late Fee Calculation Box */}
              {returnModalRecord.isOverdue ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900">Calculated Late Fee Due:</span>
                    <span className="text-lg font-black text-red-700">₹{returnModalRecord.calculatedFine}.00</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    Rate: ₹2.00 per day after loan period. Please collect this amount before clearing dues.
                  </p>

                  <div className="pt-2 border-t border-red-200/60 space-y-1">
                    <label className="text-[11px] font-bold text-red-900 block">Payment Mode Collected:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Cash", "UPI / Online", "Fee Waived"].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setReturnPaymentMode(mode)}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all ${
                            returnPaymentMode === mode
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-slate-700 border-red-200 hover:bg-red-100"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold">
                    Returned on time! No late fee or dues required.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnProcessing}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {returnProcessing ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Return &amp; Clear Due</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CAMERA SCANNER (Admin Student ID / Pass Scan)
      ────────────────────────────────────────────────────────────── */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scan Student Digital Pass</h3>
                  <p className="text-[10px] text-slate-500">Point camera at the student's phone screen</p>
                </div>
              </div>
              <button
                onClick={stopCameraScanner}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Video Camera Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border-2 border-dashed border-blue-400">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Target overlay reticle */}
                <div className="absolute inset-8 border-2 border-blue-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                  </div>
                  <p className="text-center text-[10px] font-bold text-white bg-slate-900/60 py-0.5 px-2 rounded-full mx-auto backdrop-blur-xs">
                    Align QR Code inside frame
                  </p>
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {scannerError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scannerError}</span>
                </div>
              )}

              {/* Camera Switch & Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setScannerFacingMode(prev => prev === "environment" ? "user" : "environment")}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span>Switch Camera</span>
                </button>

                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors cursor-pointer"
                >
                  Close Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
