import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Search, 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Filter, 
  GraduationCap,
  Sparkles,
  BookMarked
} from "lucide-react";
import { BookItem } from "../types";
import { subscribeToBooks } from "../firebase";

interface BookViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAboutBook?: (bookName: string, subject: string) => void;
}

export const BookViewerModal: React.FC<BookViewerModalProps> = ({
  isOpen,
  onClose,
  onAskAboutBook
}) => {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");

  useEffect(() => {
    if (isOpen) {
      const unsub = subscribeToBooks((fetched) => {
        // Show only enabled books for users
        setBooks(fetched.filter(b => b.enabled));
      });
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allClasses = Array.from(new Set(books.map(b => b.class))).filter(Boolean);
  const allSubjects = Array.from(new Set(books.map(b => b.subject))).filter(Boolean);

  const filtered = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      b.name.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      (b.author && b.author.toLowerCase().includes(q)) ||
      (b.class && b.class.toLowerCase().includes(q));

    const matchClass = selectedClass === "all" || b.class === selectedClass;
    const matchSubject = selectedSubject === "all" || b.subject === selectedSubject;

    return matchSearch && matchClass && matchSubject;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Sajjat AI Book & PDF Library 📚
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  {books.length} টি বই
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড (NCTB) অনুমোদিত পাঠ্যবই ও নোটবুক কালেকশন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="বই, বিষয় বা শ্রেণি খুঁজুন..."
              className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">সকল শ্রেণি (All Classes)</option>
              {allClasses.map((c, idx) => (
                <option key={`book_cls_${c}_${idx}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">সকল বিষয় (All Subjects)</option>
              {allSubjects.map((s, idx) => (
                <option key={`book_subj_${s}_${idx}`} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Books List Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookMarked className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">কোনো বই পাওয়া যায়নি</h4>
              <p className="text-xs text-zinc-400 mt-1">অন্য কি-ওয়ার্ড বা ফিল্টার নির্বাচন করে পুনরায় চেষ্টা করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((book, bIdx) => (
                <div
                  key={book.id ? `viewer_book_${book.id}` : `viewer_book_idx_${bIdx}`}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600/60 rounded-2xl p-4 shadow-sm transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            {book.class}
                          </span>
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-1">
                            {book.name}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">
                      {book.subject}
                    </p>

                    {book.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}

                    <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
                      {book.publisher && <p>প্রকাশক: {book.publisher}</p>}
                      {book.chapters && <p>অধ্যায়: {book.chapters}</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      PDF পড়ুন / ডাউনলোড
                    </a>

                    {onAskAboutBook && (
                      <button
                        onClick={() => {
                          onAskAboutBook(book.name, book.subject);
                          onClose();
                        }}
                        className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="এই বই নিয়ে AI-কে প্রশ্ন করুন"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI সাহায্য
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
