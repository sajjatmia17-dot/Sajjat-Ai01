import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  Check, 
  X, 
  Download, 
  Eye, 
  FileText, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Book,
  GraduationCap
} from "lucide-react";
import { BookItem } from "../../types";
import { 
  subscribeToBooks, 
  saveBook, 
  updateBook, 
  deleteBook, 
  uploadPdfFile 
} from "../../firebase";

interface AdminBookLibraryProps {
  onPreviewBook?: (book: BookItem) => void;
}

const CLASSES = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "SSC / Class 9-10", "HSC / Class 11-12", "Alim / Dakhil", "General / সাধারণ"
];

const SUBJECTS = [
  "গণিত (Mathematics)",
  "উচ্চতর গণিত (Higher Math)",
  "বাংলা ১ম পত্র (Bangla 1st)",
  "বাংলা ২য় পত্র (Bangla 2nd)",
  "English 1st Paper",
  "English 2nd Paper",
  "পদার্থবিজ্ঞান (Physics)",
  "রসায়ন (Chemistry)",
  "জীববিজ্ঞান (Biology)",
  "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
  "বাংলাদেশ ও বিশ্বপরিচয় (BGS)",
  "ইসলাম ও নৈতিক শিক্ষা",
  "সাধারণ বিজ্ঞান (General Science)",
  "ইতিহাস ও পৌরনীতি",
  "অন্যান্য (Other)"
];

export const AdminBookLibrary: React.FC<AdminBookLibraryProps> = ({ onPreviewBook }) => {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [bookName, setBookName] = useState("");
  const [bookClass, setBookClass] = useState(CLASSES[10]); // Default SSC
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড)");
  const [publicationYear, setPublicationYear] = useState("2026");
  const [chapter, setChapter] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileSize, setPdfFileSize] = useState<number | undefined>(undefined);
  const [enabled, setEnabled] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Subscribe to real-time books collection
  useEffect(() => {
    const unsub = subscribeToBooks((fetchedBooks) => {
      setBooks(fetchedBooks);
    });
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBookId(null);
    setBookName("");
    setBookClass(CLASSES[10]);
    setSubject(SUBJECTS[0]);
    setAuthor("জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড");
    setPublisher("NCTB (জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড)");
    setPublicationYear("2026");
    setChapter("সকল অধ্যায় (Full Book)");
    setDescription("");
    setPdfUrl("");
    setPdfFileName("");
    setPdfFileSize(undefined);
    setEnabled(true);
    setSelectedFile(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (book: BookItem) => {
    setEditingBookId(book.id);
    setBookName(book.name);
    setBookClass(book.class);
    setSubject(book.subject);
    setAuthor(book.author || "");
    setPublisher(book.publisher || "");
    setPublicationYear(book.year || "2026");
    setChapter(book.chapters || "");
    setDescription(book.description || "");
    setPdfUrl(book.pdfUrl);
    setPdfFileName(book.pdfFileName || "");
    setPdfFileSize(book.pdfFileSize);
    setEnabled(book.enabled);
    setSelectedFile(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMessage("অনুগ্রহ করে শুধুমাত্র PDF ফাইল নির্বাচন করুন।");
        return;
      }
      setSelectedFile(file);
      setPdfFileName(file.name);
      setPdfFileSize(file.size);
      setErrorMessage(null);
    }
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) {
      setErrorMessage("বইয়ের নাম (Book Name) আবশ্যক।");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let finalPdfUrl = pdfUrl.trim();
      let finalFileName = pdfFileName;
      let finalFileSize = pdfFileSize;

      // If user chose a file, upload it to Firebase Storage / base64 store
      if (selectedFile) {
        setUploadProgress(10);
        const uploaded = await uploadPdfFile(selectedFile, (pct) => {
          setUploadProgress(pct);
        });
        finalPdfUrl = uploaded.url;
        finalFileName = uploaded.fileName || selectedFile.name;
        finalFileSize = uploaded.fileSize || selectedFile.size;
      }

      if (!finalPdfUrl) {
        // Fallback default placeholder link
        finalPdfUrl = "https://nctb.gov.bd";
      }

      const bookData: Omit<BookItem, "id" | "createdAt" | "updatedAt"> = {
        name: bookName.trim(),
        class: bookClass,
        subject,
        author: author.trim() || undefined,
        publisher: publisher.trim() || undefined,
        year: publicationYear.trim() || undefined,
        chapters: chapter.trim() || undefined,
        description: description.trim() || undefined,
        pdfUrl: finalPdfUrl,
        pdfFileName: finalFileName || `${bookName}.pdf`,
        pdfFileSize: finalFileSize,
        enabled
      };

      if (editingBookId) {
        await updateBook(editingBookId, bookData);
        setSuccessMessage("বইটির তথ্য সফলভাবে আপডেট করা হয়েছে।");
      } else {
        await saveBook(bookData);
        setSuccessMessage("নতুন বই সফলভাবে লাইব্রেরিতে যোগ করা হয়েছে।");
      }

      setTimeout(() => {
        setSuccessMessage(null);
        setIsModalOpen(false);
      }, 1200);

    } catch (err: any) {
      console.error("Save book error:", err);
      setErrorMessage(err?.message || "বই সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSaving(false);
      setUploadProgress(null);
    }
  };

  const handleToggleEnable = async (book: BookItem) => {
    try {
      await updateBook(book.id, { enabled: !book.enabled });
    } catch (err) {
      console.error("Error toggling book status:", err);
    }
  };

  const handleDeleteBook = async (bookId: string, bookName: string) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে "${bookName}" বইটি মুছে ফেলতে চান?`)) {
      try {
        await deleteBook(bookId);
      } catch (err) {
        console.error("Error deleting book:", err);
      }
    }
  };

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.class && b.class.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesClass = selectedClass === "all" || b.class === selectedClass;
    const matchesSubject = selectedSubject === "all" || b.subject === selectedSubject;

    return matchesSearch && matchesClass && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Book / PDF Library ম্যানেজমেন্ট
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">
                    {books.length} টি বই
                  </span>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  শিক্ষার্থীদের জন্য পাঠ্যবই ও PDF পরিচালনা করুন। ব্যবহারকারীরা চ্যাট থেকে এগুলো দেখতে ও পড়তে পারবে।
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            নতুন PDF / বই যোগ করুন
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বইয়ের নাম, শ্রেণি বা বিষয় খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">সব শ্রেণি (All Classes)</option>
              {CLASSES.map((c, idx) => (
                <option key={`adm_filter_c_${c}_${idx}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">সব বিষয় (All Subjects)</option>
              {SUBJECTS.map((s, idx) => (
                <option key={`adm_filter_s_${s}_${idx}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Book Grid / List */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Book className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">কোনো বই পাওয়া যায়নি</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            আপনার অনুসন্ধান বা ফিল্টারের সাথে মিলে এমন কোনো বই নেই। নতুন বই যোগ করতে উপরের বাটনে চাপুন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book, bIdx) => (
            <div
              key={book.id ? `adm_book_${book.id}` : `adm_book_idx_${bIdx}`}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                book.enabled
                  ? "border-zinc-200 dark:border-zinc-800"
                  : "border-red-200 dark:border-red-900/40 bg-zinc-50/50 dark:bg-zinc-950/50 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {book.class}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEnable(book)}
                    title={book.enabled ? "সক্রিয় রয়েছে (ক্লিক করে বন্ধ করুন)" : "নিষ্ক্রিয় রয়েছে (ক্লিক করে চালু করুন)"}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                      book.enabled
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {book.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {book.enabled ? "Active" : "Disabled"}
                  </button>
                </div>

                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-3 line-clamp-1">
                  {book.name}
                </h3>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                  {book.subject}
                </p>

                {book.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {book.description}
                  </p>
                )}

                <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                  {book.author && (
                    <div className="flex items-center justify-between">
                      <span>লেখক:</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{book.author}</span>
                    </div>
                  )}
                  {book.publisher && (
                    <div className="flex items-center justify-between">
                      <span>প্রকাশক:</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]">{book.publisher}</span>
                    </div>
                  )}
                  {book.year && (
                    <div className="flex items-center justify-between">
                      <span>সংস্করণ:</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{book.year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                <a
                  href={book.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  PDF দেখুন
                </a>

                <button
                  onClick={() => handleOpenEditModal(book)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors"
                  title="সম্পাদনা করুন"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteBook(book.id, book.name)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500 rounded-lg transition-colors"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingBookId ? "বইয়ের তথ্য সম্পাদনা করুন" : "নতুন বই / PDF আপলোড করুন"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveBook} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Book Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Book Name / বইয়ের নাম <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookName}
                    onChange={(e) => setBookName(e.target.value)}
                    placeholder="যেমন: মাধ্যমিক গণিত (SSC Mathematics)"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Class / শ্রেণি <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bookClass}
                    onChange={(e) => setBookClass(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CLASSES.map((c, idx) => (
                      <option key={`adm_modal_c_${c}_${idx}`} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Subject / বিষয় <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {SUBJECTS.map((s, idx) => (
                      <option key={`adm_modal_s_${s}_${idx}`} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Author */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Author / লেখক
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Publisher */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Publisher / প্রকাশক
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="NCTB"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Publication Year */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Publication Year / প্রকাশনার সাল
                  </label>
                  <input
                    type="text"
                    value={publicationYear}
                    onChange={(e) => setPublicationYear(e.target.value)}
                    placeholder="2026"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Chapter / অধ্যায়
                  </label>
                  <input
                    type="text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="যেমন: সম্পূর্ণ বই / ১ম থেকে ১৬শ অধ্যায়"
                    className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="বইটি সম্পর্কে সংক্ষিপ্ত বিবরণ লিখুন..."
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* PDF Upload / Direct Link */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  PDF File Upload অথবা Direct Link
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    <span>PDF ফাইল সিলেক্ট করুন</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {selectedFile && (
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-xs">
                      📁 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                    অথবা সরাসরি অনলাইন PDF URL লিঙ্ক দিন:
                  </span>
                  <input
                    type="url"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://example.com/books/math-class-9.pdf"
                    className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {uploadProgress !== null && (
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Enable / Disable toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    বইটির সক্রিয় অবস্থা (Enable in Library)
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    চালু থাকলে শিক্ষার্থীরা চ্যাটে এই বইটি অনুসন্ধান ও পড়তে পারবে।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  বাতিল করুন
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? "সংরক্ষণ হচ্ছে..." : editingBookId ? "আপডেট করুন" : "বই যোগ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
