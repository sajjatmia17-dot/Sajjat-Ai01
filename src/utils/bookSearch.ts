import { BookItem } from "../types";

/**
 * Detects if a query is searching for or inquiring about books / PDFs
 */
export function isBookSearchQuery(rawQuery: string): boolean {
  if (!rawQuery) return false;
  const q = rawQuery.toLowerCase().trim();
  
  const bookKeywords = [
    "বই",
    "book",
    "pdf",
    "পিডিএফ",
    "পাঠ্যবই",
    "লাইব্রেরি",
    "library",
    "টেক্সটবুক",
    "textbook",
    "বই চাই",
    "বই দিন",
    "বই দেন",
    "বইগুলো",
    "বইয়ের তালিকা",
    "বইয়ের তালিকা",
    "বই আছে",
    "বই পড়ব",
    "বই পড়তে চাই"
  ];

  return bookKeywords.some(keyword => q.includes(keyword));
}

/**
 * Searches through the available books collection and returns matched books
 */
export function searchBooks(rawQuery: string, books: BookItem[]): BookItem[] {
  if (!books || books.length === 0) return [];
  const activeBooks = books.filter(b => b.enabled !== false);
  if (activeBooks.length === 0) return [];

  const q = rawQuery.toLowerCase().trim();

  // 1. Direct matching on name, subject, class, chapters, author
  const matched = activeBooks.filter(book => {
    const nameMatch = book.name.toLowerCase().includes(q) || q.includes(book.name.toLowerCase());
    const subjectMatch = book.subject.toLowerCase().includes(q) || q.includes(book.subject.toLowerCase());
    const classMatch = book.class && (book.class.toLowerCase().includes(q) || q.includes(book.class.toLowerCase()));
    const authorMatch = book.author && (book.author.toLowerCase().includes(q) || q.includes(book.author.toLowerCase()));
    const chapterMatch = book.chapters && book.chapters.toLowerCase().includes(q);

    // Keyword specific matchers
    const isMathQuery = (q.includes("গণিত") || q.includes("math")) && (book.subject.includes("গণিত") || book.name.includes("গণিত") || book.subject.toLowerCase().includes("math"));
    const isScienceQuery = (q.includes("বিজ্ঞান") || q.includes("science")) && (book.subject.includes("বিজ্ঞান") || book.name.includes("বিজ্ঞান") || book.subject.toLowerCase().includes("science"));
    const isBanglaQuery = (q.includes("বাংলা") || q.includes("bangla")) && (book.subject.includes("বাংলা") || book.name.includes("বাংলা"));
    const isEnglishQuery = (q.includes("ইংরেজি") || q.includes("english")) && (book.subject.includes("ইংরেজি") || book.name.includes("English") || book.name.toLowerCase().includes("english"));
    const isIctQuery = (q.includes("তথ্য") || q.includes("আইসিটি") || q.includes("ict")) && (book.subject.includes("আইসিটি") || book.name.includes("তথ্য") || book.subject.toLowerCase().includes("ict"));

    return nameMatch || subjectMatch || classMatch || authorMatch || chapterMatch || isMathQuery || isScienceQuery || isBanglaQuery || isEnglishQuery || isIctQuery;
  });

  if (matched.length > 0) {
    return matched;
  }

  // If the query is just a generic book search ("বই চাই", "সব বই", "বই লাইব্রেরি"), return all active books
  if (isBookSearchQuery(q)) {
    return activeBooks.slice(0, 5);
  }

  return [];
}

/**
 * Formats matched books into a clean, markdown-rich response for the user
 */
export function formatBookSearchResponse(matchedBooks: BookItem[], userQuery: string): string {
  if (matchedBooks.length === 0) {
    return `দুঃখিত, আপনার অনুসন্ধানের সাথে মিলে এমন কোনো বই বর্তমানে আমাদের লাইব্রেরিতে পাওয়া যায়নি।\n\nআপনি কী ধরনের বই বা কোন শ্রেণির বই খুঁজছেন তা নির্দিষ্ট করে বলুন (যেমন: **"৯ম শ্রেণির গণিত বই"**, **"বিজ্ঞান বই"** বা **"ইংরেজি বই"**)।`;
  }

  let response = `📚 **আপনার জন্য বই লাইব্রেরি থেকে ${matchedBooks.length}টি বই পাওয়া গেছে:**\n\n`;

  matchedBooks.forEach((book, index) => {
    response += `### ${index + 1}. ${book.name}\n`;
    response += `- 🎓 **শ্রেণি:** ${book.class}\n`;
    response += `- 📖 **বিষয়:** ${book.subject}\n`;
    if (book.author) response += `- ✍️ **লেখক / বোর্ড:** ${book.author}\n`;
    if (book.year) response += `- 📅 **সংস্করণ:** ${book.year}\n`;
    if (book.chapters) {
      const shortChapters = book.chapters.length > 120 ? book.chapters.substring(0, 120) + "..." : book.chapters;
      response += `- 📑 **অধ্যায়সমূহ:** ${shortChapters}\n`;
    }
    
    if (book.pdfUrl) {
      response += `\n🔗 **[📖 বইটি পড়ুন / PDF ডাউনলোড করুন](${book.pdfUrl})**\n\n`;
    }
    response += `---\n`;
  });

  response += `\n💡 **পরামর্শ:** আপনি যেকোনো বইয়ের নির্দিষ্ট অধ্যায় বা বিষয় সম্পর্কে বিস্তারিত জানতে আমাকে সরাসরি প্রশ্ন করতে পারেন (যেমন: *"গণিত বইয়ের ২য় অধ্যায় বুঝিয়ে দাও"* বা *"বিজ্ঞান বইয়ের হৃদযন্ত্রের কাজ কি?"*)।`;

  return response;
}
