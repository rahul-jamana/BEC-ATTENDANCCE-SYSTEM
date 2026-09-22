import { db, isLiveFirebaseConfigured } from "../firebase/config";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy
} from "firebase/firestore";

const STORAGE_KEY_BOOKS = "bec_library_books_v1";
const STORAGE_KEY_RECORDS = "bec_library_records_v1";
const STORAGE_KEY_NOTES = "bec_library_notes_v1";

// Default Seed Books across Branches for Bhubaneswar Engineering College (BPUT Curriculum)
const INITIAL_BOOKS = [
  {
    id: "book_cs_01",
    title: "Introduction to Algorithms (CLRS)",
    author: "Thomas H. Cormen, Charles E. Leiserson",
    isbn: "978-0262033848",
    department: "CSE",
    category: "Core Engineering",
    semester: "4",
    shelfLocation: "Rack 3, Shelf A",
    totalCopies: 8,
    availableCopies: 6,
    coverColor: "bg-blue-700",
    description: "Standard reference for algorithm design and complexity analysis."
  },
  {
    id: "book_cs_02",
    title: "Operating System Concepts",
    author: "Abraham Silberschatz, Peter B. Galvin",
    isbn: "978-1118063330",
    department: "CSE",
    category: "Core Engineering",
    semester: "5",
    shelfLocation: "Rack 3, Shelf B",
    totalCopies: 10,
    availableCopies: 8,
    coverColor: "bg-indigo-700",
    description: "Covers process management, threads, concurrency, and virtual memory."
  },
  {
    id: "book_cs_03",
    title: "Computer Networks",
    author: "Andrew S. Tanenbaum, Nick Feamster",
    isbn: "978-0133594140",
    department: "CSE",
    category: "Core Engineering",
    semester: "5",
    shelfLocation: "Rack 3, Shelf C",
    totalCopies: 6,
    availableCopies: 5,
    coverColor: "bg-cyan-700",
    description: "Fundamentals of network protocols, OSI and TCP/IP stack layers."
  },
  {
    id: "book_cs_04",
    title: "Database System Concepts",
    author: "Abraham Silberschatz, Henry F. Korth",
    isbn: "978-0073523323",
    department: "CSE",
    category: "Core Engineering",
    semester: "4",
    shelfLocation: "Rack 4, Shelf A",
    totalCopies: 8,
    availableCopies: 7,
    coverColor: "bg-emerald-700",
    description: "SQL, Relational database design, Normalization, and Transaction management."
  },
  {
    id: "book_gen_01",
    title: "Higher Engineering Mathematics",
    author: "Dr. B. S. Grewal",
    isbn: "978-8193328491",
    department: "Common (1st Year)",
    category: "Mathematics",
    semester: "1",
    shelfLocation: "Rack 1, Shelf A",
    totalCopies: 15,
    availableCopies: 12,
    coverColor: "bg-purple-700",
    description: "Essential textbook for 1st and 2nd semester Engineering Mathematics."
  },
  {
    id: "book_gen_02",
    title: "Engineering Physics",
    author: "H. K. Malik, A. K. Singh",
    isbn: "978-0070671539",
    department: "Common (1st Year)",
    category: "Physics",
    semester: "1",
    shelfLocation: "Rack 1, Shelf B",
    totalCopies: 12,
    availableCopies: 10,
    coverColor: "bg-amber-700",
    description: "Optics, Lasers, Quantum Mechanics, and Fiber Optics for engineering students."
  },
  {
    id: "book_gen_03",
    title: "Programming in ANSI C",
    author: "E. Balagurusamy",
    isbn: "978-9353165130",
    department: "Common (1st Year)",
    category: "Core Engineering",
    semester: "1",
    shelfLocation: "Rack 2, Shelf A",
    totalCopies: 14,
    availableCopies: 11,
    coverColor: "bg-teal-700",
    description: "Beginner to advanced C programming for first-year engineering students."
  },
  {
    id: "book_ece_01",
    title: "Electronic Devices and Circuit Theory",
    author: "Robert L. Boylestad, Louis Nashelsky",
    isbn: "978-0132622264",
    department: "ECE",
    category: "Core Engineering",
    semester: "3",
    shelfLocation: "Rack 5, Shelf A",
    totalCopies: 8,
    availableCopies: 6,
    coverColor: "bg-rose-700",
    description: "Semiconductor diodes, BJT, FET transistors, and amplifier design."
  },
  {
    id: "book_me_01",
    title: "A Textbook of Engineering Mechanics",
    author: "R. S. Khurmi",
    isbn: "978-8121925242",
    department: "Mechanical",
    category: "Core Engineering",
    semester: "2",
    shelfLocation: "Rack 6, Shelf A",
    totalCopies: 10,
    availableCopies: 9,
    coverColor: "bg-slate-700",
    description: "Statics, dynamics, friction, kinematics, and moment of inertia."
  },
  {
    id: "book_ee_01",
    title: "Basic Electrical Engineering",
    author: "D. C. Kulshreshtha",
    isbn: "978-0070147386",
    department: "EEE",
    category: "Core Engineering",
    semester: "1",
    shelfLocation: "Rack 2, Shelf B",
    totalCopies: 10,
    availableCopies: 8,
    coverColor: "bg-orange-700",
    description: "DC circuits, AC fundamentals, transformers, and electrical machines."
  }
];

// Initial Seed Digital Notes & Question Papers
const INITIAL_NOTES = [
  {
    id: "note_01",
    title: "Mathematics-I Complete Unit-Wise Lecture Notes",
    subject: "Mathematics-I (MA101)",
    department: "Common (1st Year)",
    semester: "1",
    fileType: "PDF",
    uploadedBy: "Prof. S. K. Nayak",
    fileUrl: "https://bput.ac.in/syllabus.html",
    downloadUrl: "#",
    createdAt: new Date().toISOString(),
    fileSize: "4.2 MB"
  },
  {
    id: "note_02",
    title: "Programming in C & Data Structures Lab Manual",
    subject: "Programming Lab (CS191)",
    department: "Common (1st Year)",
    semester: "1",
    fileType: "PDF",
    uploadedBy: "Prof. P. Mohanty",
    fileUrl: "https://bput.ac.in/syllabus.html",
    downloadUrl: "#",
    createdAt: new Date().toISOString(),
    fileSize: "2.8 MB"
  },
  {
    id: "note_03",
    title: "Operating Systems 5-Year Solved BPUT Question Papers",
    subject: "Operating Systems (CS301)",
    department: "CSE",
    semester: "5",
    fileType: "PDF",
    uploadedBy: "CSE Dept",
    fileUrl: "https://bput.ac.in/syllabus.html",
    downloadUrl: "#",
    createdAt: new Date().toISOString(),
    fileSize: "6.1 MB"
  }
];

export const LibraryService = {
  // Helper to load/save local cache
  _getLocal(key, fallback = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },

  _setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("LibraryService localStorage save failed:", e);
    }
  },

  // ==========================================
  // 📚 1. BOOKS MANAGEMENT
  // ==========================================
  async getBooks() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "library_books"));
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          this._setLocal(STORAGE_KEY_BOOKS, list);
          return list;
        } else {
          // Auto-seed Firestore on first run
          for (const book of INITIAL_BOOKS) {
            await setDoc(doc(db, "library_books", book.id), book);
          }
          this._setLocal(STORAGE_KEY_BOOKS, INITIAL_BOOKS);
          return INITIAL_BOOKS;
        }
      } catch (e) {
        console.warn("Firestore getBooks error, falling back to local:", e);
      }
    }

    let local = this._getLocal(STORAGE_KEY_BOOKS, null);
    if (!local || local.length === 0) {
      local = INITIAL_BOOKS;
      this._setLocal(STORAGE_KEY_BOOKS, local);
    }
    return local;
  },

  async addBook(bookData) {
    const id = bookData.id || `book_${Date.now()}`;
    const newBook = {
      ...bookData,
      id,
      totalCopies: parseInt(bookData.totalCopies || 1, 10),
      availableCopies: parseInt(bookData.availableCopies ?? bookData.totalCopies ?? 1, 10),
      createdAt: new Date().toISOString()
    };

    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "library_books", id), newBook);
      } catch (e) {
        console.warn("Firestore addBook error:", e);
      }
    }

    const books = this._getLocal(STORAGE_KEY_BOOKS, INITIAL_BOOKS);
    const updated = [newBook, ...books.filter(b => b.id !== id)];
    this._setLocal(STORAGE_KEY_BOOKS, updated);
    return newBook;
  },

  async updateBook(id, bookData) {
    const updated = {
      ...bookData,
      totalCopies: parseInt(bookData.totalCopies || 1, 10),
      availableCopies: parseInt(bookData.availableCopies ?? 1, 10),
      updatedAt: new Date().toISOString()
    };

    if (isLiveFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "library_books", id), updated);
      } catch (e) {
        console.warn("Firestore updateBook error:", e);
      }
    }

    const books = this._getLocal(STORAGE_KEY_BOOKS, INITIAL_BOOKS);
    const list = books.map(b => (b.id === id ? { ...b, ...updated } : b));
    this._setLocal(STORAGE_KEY_BOOKS, list);
    return { id, ...updated };
  },

  async deleteBook(id) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "library_books", id));
      } catch (e) {
        console.warn("Firestore deleteBook error:", e);
      }
    }

    const books = this._getLocal(STORAGE_KEY_BOOKS, INITIAL_BOOKS);
    const list = books.filter(b => b.id !== id);
    this._setLocal(STORAGE_KEY_BOOKS, list);
    return true;
  },

  // ==========================================
  // 🔄 2. ISSUE & RETURN CIRCULATION
  // ==========================================
  async getBorrowRecords() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "library_records"));
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort by issueDate descending
          list.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
          this._setLocal(STORAGE_KEY_RECORDS, list);
          return list;
        }
      } catch (e) {
        console.warn("Firestore getBorrowRecords error:", e);
      }
    }

    const list = this._getLocal(STORAGE_KEY_RECORDS, []);
    return list.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  },

  async getStudentBorrowRecords(studentId, rollNo) {
    const all = await this.getBorrowRecords();
    return all.filter(r => 
      (studentId && r.studentId === studentId) ||
      (rollNo && r.rollNo && r.rollNo.toLowerCase() === rollNo.toLowerCase())
    );
  },

  async issueBook({ bookId, student, loanDays = 14, notes = "" }) {
    const books = await this.getBooks();
    const book = books.find(b => b.id === bookId);

    if (!book) {
      throw new Error("Book not found in library catalog.");
    }
    if (book.availableCopies <= 0) {
      throw new Error("Sorry, no copies of this book are currently available.");
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + parseInt(loanDays, 10));

    const recordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRecord = {
      id: recordId,
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookIsbn: book.isbn || "",
      shelfLocation: book.shelfLocation || "",
      studentId: student.uid || student.id || student.rollNo,
      studentName: student.name,
      rollNo: student.rollNo || "",
      branch: student.branch || "",
      year: student.year || "",
      section: student.section || "",
      issueDate: issueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      returnDate: null,
      status: "issued", // "issued" | "returned" | "overdue"
      fineAmount: 0,
      finePaid: false,
      notes: notes || ""
    };

    // Update book available copies
    const updatedAvailable = Math.max(0, book.availableCopies - 1);
    await this.updateBook(book.id, { availableCopies: updatedAvailable });

    // Save record
    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "library_records", recordId), newRecord);
      } catch (e) {
        console.warn("Firestore issueBook error:", e);
      }
    }

    const records = this._getLocal(STORAGE_KEY_RECORDS, []);
    this._setLocal(STORAGE_KEY_RECORDS, [newRecord, ...records]);

    return newRecord;
  },

  async returnBook({ recordId, finePaid = false, remarks = "" }) {
    const records = await this.getBorrowRecords();
    const record = records.find(r => r.id === recordId);

    if (!record) {
      throw new Error("Borrow record not found.");
    }
    if (record.status === "returned") {
      throw new Error("This book has already been marked as returned.");
    }

    const returnDate = new Date();
    const dueDate = new Date(record.dueDate);
    
    // Calculate fine (₹2 per day overdue)
    let fineAmount = 0;
    if (returnDate > dueDate) {
      const diffTime = Math.abs(returnDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * 2;
    }

    const updatedRecord = {
      ...record,
      returnDate: returnDate.toISOString(),
      status: "returned",
      fineAmount,
      finePaid: fineAmount > 0 ? finePaid : true,
      returnRemarks: remarks || ""
    };

    // Update record in Firestore / local
    if (isLiveFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "library_records", recordId), updatedRecord);
      } catch (e) {
        console.warn("Firestore returnBook record update error:", e);
      }
    }

    const updatedRecords = records.map(r => r.id === recordId ? updatedRecord : r);
    this._setLocal(STORAGE_KEY_RECORDS, updatedRecords);

    // Increase available copies for the book
    const books = await this.getBooks();
    const book = books.find(b => b.id === record.bookId);
    if (book) {
      const newAvailable = Math.min(book.totalCopies, (book.availableCopies || 0) + 1);
      await this.updateBook(book.id, { availableCopies: newAvailable });
    }

    return updatedRecord;
  },

  // ==========================================
  // 📑 3. DIGITAL NOTES & QUESTION PAPERS
  // ==========================================
  async getDigitalNotes() {
    if (isLiveFirebaseConfigured && db) {
      try {
        const snap = await getDocs(collection(db, "library_notes"));
        if (!snap.empty) {
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          this._setLocal(STORAGE_KEY_NOTES, list);
          return list;
        } else {
          for (const note of INITIAL_NOTES) {
            await setDoc(doc(db, "library_notes", note.id), note);
          }
          this._setLocal(STORAGE_KEY_NOTES, INITIAL_NOTES);
          return INITIAL_NOTES;
        }
      } catch (e) {
        console.warn("Firestore getDigitalNotes error:", e);
      }
    }

    let list = this._getLocal(STORAGE_KEY_NOTES, null);
    if (!list || list.length === 0) {
      list = INITIAL_NOTES;
      this._setLocal(STORAGE_KEY_NOTES, list);
    }
    return list;
  },

  async addDigitalNote(noteData) {
    const id = noteData.id || `note_${Date.now()}`;
    const newNote = {
      ...noteData,
      id,
      createdAt: new Date().toISOString()
    };

    if (isLiveFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "library_notes", id), newNote);
      } catch (e) {
        console.warn("Firestore addDigitalNote error:", e);
      }
    }

    const notes = this._getLocal(STORAGE_KEY_NOTES, INITIAL_NOTES);
    const updated = [newNote, ...notes.filter(n => n.id !== id)];
    this._setLocal(STORAGE_KEY_NOTES, updated);
    return newNote;
  },

  async deleteDigitalNote(id) {
    if (isLiveFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, "library_notes", id));
      } catch (e) {
        console.warn("Firestore deleteDigitalNote error:", e);
      }
    }

    const notes = this._getLocal(STORAGE_KEY_NOTES, INITIAL_NOTES);
    const list = notes.filter(n => n.id !== id);
    this._setLocal(STORAGE_KEY_NOTES, list);
    return true;
  }
};
