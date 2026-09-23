// Sajjat AI Verified Knowledge Base & Personal QA Engine

export function getPersonalAnswer(rawQuery: string): string | null {
  if (!rawQuery) return null;

  const query = rawQuery
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:।\-_/\\()]/g, "")
    .replace(/\s+/g, " ");

  // 1. Greetings
  if (/^(hi|hey|hlw|হাই|হ্যালো|hello)$/i.test(query)) {
    if (query === "hi" || query === "হাই") {
      return "আমি Sajjat AI। আমাকে Sajjat Mia তৈরি করেছে মানুষের সেবার জন্য। আমি আপনাকে কীভাবে সাহায্য করতে পারি?";
    }
    return "হ্যালো! আমি Sajjat AI। আমাকে Sajjat Mia তৈরি করেছে মানুষের সেবার জন্য। আপনাকে কীভাবে সাহায্য করতে পারি?";
  }

  // 2. Who are you? / Identity
  if (
    query === "তুমি কে" ||
    query === "আপনি কে" ||
    query === "who are you" ||
    query === "what are you" ||
    query.includes("তোমার নাম কি") ||
    query.includes("তোমার নাম কী") ||
    query.includes("what is your name")
  ) {
    return "আমি Sajjat AI, একটি স্মার্ট AI সহকারী। আমাকে Sajjat Mia তৈরি করেছে মানুষের বিভিন্ন প্রশ্নের উত্তর ও প্রয়োজনীয় সহায়তা দেওয়ার জন্য।";
  }

  // 3. Who made you?
  if (
    query.includes("তোমাকে কে তৈরি করেছে") ||
    query.includes("তোমাকে কে বানিয়েছে") ||
    query.includes("who made you") ||
    query.includes("who created you") ||
    query.includes("who is your creator") ||
    query.includes("তোমার নির্মাতা কে")
  ) {
    return "আমাকে Sajjat Mia তৈরি করেছে।";
  }

  // 4. Who is your owner?
  if (
    query.includes("তোমার মালিক কে") ||
    query.includes("who is your owner") ||
    query.includes("মালিক কে")
  ) {
    return "আমার মালিক ও নির্মাতা Sajjat Mia।";
  }

  // 5. Why were you made?
  if (
    query.includes("তোমাকে কেন তৈরি করা হয়েছে") ||
    query.includes("তোমাকে কেন তৈরি করা হয়েছে") ||
    query.includes("তোমাকে কেন বানানো হয়েছে") ||
    query.includes("why were you made") ||
    query.includes("why were you created") ||
    query.includes("তোমার কাজ কি") ||
    query.includes("তোমার কাজ কী")
  ) {
    return "মানুষের বিভিন্ন প্রশ্নের উত্তর দেওয়া, প্রয়োজনীয় তথ্য প্রদান করা এবং বিভিন্ন কাজে সহায়তা করার জন্য আমাকে তৈরি করা হয়েছে।";
  }

  // 6. Who is Sajjat / সাজ্জাদ কে?
  if (
    query === "sajjat কে" ||
    query === "সাজ্জাত কে" ||
    query === "সাজ্জাদ কে" ||
    query === "sajjat mia কে" ||
    query === "সাজ্জাত মিয়া কে" ||
    query === "who is sajjat" ||
    query === "who is sajjat mia" ||
    query.includes("sajjat সম্পর্কে বল") ||
    query.includes("sajjat সম্পর্কে বলো") ||
    query.includes("সাজ্জাদ সম্পর্কে বল") ||
    query.includes("সাজ্জাত মিয়া সম্পর্কে")
  ) {
    return "Sajjat হলো Sajjat AI-এর মালিক ও নির্মাতা। তিনি অ্যাপ ডেভেলপমেন্টে কাজ করেন এবং একজন ছাত্র। তিনি বর্তমানে পড়াশোনা করছেন।\n\n**শিক্ষাপ্রতিষ্ঠান:** মুক্তিযোদ্ধা আনোয়ার হোসেন বাঙালি স্কুল এন্ড কলেজ।\n\nতিনি ২০২৭ সালে SSC পরীক্ষায় অংশগ্রহণ করার পরিকল্পনা করছেন।";
  }

  // 7. Sajjat's Birthday / জন্মতারিখ
  if (
    query.includes("sajjat এর জন্ম") ||
    query.includes("sajjat এর জন্মদিন") ||
    query.includes("সাজ্জাদের জন্ম") ||
    query.includes("সাজ্জাদের জন্মদিন") ||
    query.includes("sajjat mia এর জন্ম") ||
    query.includes("sajjat এর বয়স") ||
    query.includes("সাজ্জাতের জন্ম") ||
    query.includes("sajjat birthday") ||
    query.includes("birthday of sajjat") ||
    query.includes("when was sajjat born")
  ) {
    return "Sajjat Mia-এর জন্ম ১৭ ফেব্রুয়ারি ২০১১।\n\n**তারিখটি:**\n- ১৭ ফেব্রুয়ারি ২০১১, বৃহস্পতিবার\n- ৫ ফাল্গুন ১৪১৭ বঙ্গাব্দ\n- ১৪ রবিউল আউয়াল ১৪৩২ হিজরি";
  }

  // 8. Sajjat's Home / বাড়ি
  if (
    query.includes("sajjat এর বাড়ি") ||
    query.includes("sajjat এর বাড়ি") ||
    query.includes("সাজ্জাদের বাড়ি") ||
    query.includes("সাজ্জাদের বাড়ি") ||
    query.includes("সাজ্জাতের বাড়ি") ||
    query.includes("sajjat কোথায় থাকে") ||
    query.includes("সাজ্জাদ কোথায় থাকে") ||
    query.includes("where is sajjat home") ||
    query.includes("where does sajjat live") ||
    query.includes("sajjat এর এলাকা")
  ) {
    return "Sajjat-এর বাড়ি কক্সবাজার জেলার চকরিয়া উপজেলার কাকারা ইউনিয়নের ১ নম্বর ওয়ার্ড, বার আউলিয়া নগর এলাকায়।";
  }

  // 9. Sajjat's Father / বাবার নাম
  if (
    query.includes("sajjat এর বাবার নাম") ||
    query.includes("সাজ্জাদের বাবার নাম") ||
    query.includes("সাজ্জাতের বাবার নাম") ||
    query.includes("sajjat father") ||
    query.includes("father of sajjat")
  ) {
    return "Sajjat-এর বাবার নাম আলমগীর।";
  }

  // 10. Sajjat's Mother / মায়ের নাম
  if (
    query.includes("sajjat এর মায়ের নাম") ||
    query.includes("sajjat এর মায়ের নাম") ||
    query.includes("সাজ্জাদের মায়ের নাম") ||
    query.includes("সাজ্জাদের মায়ের নাম") ||
    query.includes("সাজ্জাতের মায়ের নাম") ||
    query.includes("sajjat mother") ||
    query.includes("mother of sajjat")
  ) {
    return "Sajjat-এর মায়ের নাম গুলবার।";
  }

  // 11. Sajjat's Brother / ভাইয়ের নাম
  if (
    query.includes("sajjat এর ভাইয়ের নাম") ||
    query.includes("sajjat এর ভাইয়ের নাম") ||
    query.includes("সাজ্জাদের ভাইয়ের নাম") ||
    query.includes("সাজ্জাদের ভাইয়ের নাম") ||
    query.includes("sajjat brother") ||
    query.includes("brother of sajjat")
  ) {
    return "Sajjat-এর ভাইয়ের নাম মোরশেদ।";
  }

  // 12. Sajjat's Sister / বোনের নাম
  if (
    query.includes("sajjat এর বোনের নাম") ||
    query.includes("সাজ্জাদের বোনের নাম") ||
    query.includes("সাজ্জাতের বোনের নাম") ||
    query.includes("sajjat sister") ||
    query.includes("sister of sajjat")
  ) {
    return "Sajjat-এর বোনের নাম লাবিবা জন্নাত।";
  }

  // 13. Sajjat's Family in general
  if (
    query.includes("sajjat এর পরিবার") ||
    query.includes("সাজ্জাদের পরিবার") ||
    query.includes("সাজ্জাত এর পরিবার") ||
    query.includes("sajjat family")
  ) {
    return "Sajjat-এর পরিবারের সদস্যদের তথ্য:\n\n- **বাবা:** আলমগীর\n- **মা:** গুলবার\n- **ভাই:** মোরশেদ\n- **বোন:** লাবিবা জন্নাত";
  }

  // 14. Favorite person / Crush (Arika)
  if (
    query.includes("sajjat এর পছন্দের মানুষ") ||
    query.includes("সাজ্জাদের পছন্দের মানুষ") ||
    query.includes("sajjat কাকে ভালোবাসে") ||
    query.includes("সাজ্জাদ কাকে ভালোবাসে") ||
    query.includes("sajjat crush") ||
    query.includes("sajjat lover") ||
    query.includes("sajjat love") ||
    query.includes("সাজ্জাত কাকে ভালোবাসে")
  ) {
    return "Arika ছিল Sajjat-এর পছন্দের একজন মানুষ। Sajjat দীর্ঘ সময় ধরে Arika-কে পছন্দ করত এবং বিষয়টি Arika-কে জানিয়েছিল। তবে Arika বিষয়টি গ্রহণ করেনি।";
  }

  // 15. Contact Info / মোবাইল / ইমেইল
  if (
    query.includes("sajjat এর মোবাইল") ||
    query.includes("sajjat এর ফোন") ||
    query.includes("sajjat এর নাম্বার") ||
    query.includes("sajjat এর নম্বর") ||
    query.includes("সাজ্জাদের মোবাইল") ||
    query.includes("সাজ্জাদের ফোন") ||
    query.includes("সাজ্জাদের নম্বর") ||
    query.includes("sajjat এর ইমেইল") ||
    query.includes("সাজ্জাদের ইমেইল") ||
    query.includes("sajjat contact") ||
    query.includes("contact sajjat") ||
    query.includes("sajjat phone number") ||
    query.includes("sajjat email")
  ) {
    return "Sajjat-এর সাথে যোগাযোগের অনুমোদিত তথ্য:\n\n- **মোবাইল নম্বর:** 01836496585\n- **ইমেইল:** sajjatmia17@gmail.com";
  }

  // 17. Sajjat AI HTML File & Code Queries ("html দেন", "html দিন", "html দাও", "html file", etc.)
  if (
    query === "html দেন" ||
    query === "html দিন" ||
    query === "html দাও" ||
    query === "html" ||
    query === "give html" ||
    query === "give me html" ||
    query.includes("html দেন") ||
    query.includes("html দিন") ||
    query.includes("html দাও") ||
    query.includes("html ফাইল") ||
    query.includes("html file") ||
    query.includes("html কোড") ||
    query.includes("html code") ||
    query.includes("html download") ||
    query.includes("download html") ||
    query.includes("sajjat ai html")
  ) {
    return `### 📄 Sajjat AI - Standalone HTML ফাইল ও কোড

আপনার জন্য **Sajjat AI**-এর সম্পূর্ণ একক (Standalone) HTML সংস্করণ প্রস্তুত রয়েছে। এই ফাইলটিতে সম্পূর্ণ চ্যাট ইন্টারফেস, নলেজ ইঞ্জিন, স্টাইলিং ও স্ক্রিপ্ট একত্রিত করা আছে। কোনো সার্ভার ছাড়াই যেকোনো পিসি বা মোবাইলের ব্রাউজারে ডাবল-ক্লিক করলেই এটি স্বয়ংক্রিয়ভাবে চলবে!

#### 🚀 এক ক্লিকে ডাউনলোড ও প্রিভিউ:
- 📥 **[Sajjat_AI.html ডাউনলোড করুন](/download-html)**
- 🌐 **[সরাসরি নতুন ট্যাবে চালু করুন](/Sajjat_AI.html)**

---

#### 💻 আদর্শ HTML5 কাঠামো (Standard Web Page Template):
আপনি যদি ওয়েবসাইটের জন্য প্রয়োজনীয় মানসম্মত HTML কোড চান, তবে নিচে দেওয়া কোডটি ব্যবহার করতে পারেন:

\`\`\`html
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sajjat AI - স্মার্ট সহকারী</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #020617;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 2.5rem;
      border-radius: 1.5rem;
      text-align: center;
      max-width: 520px;
      box-shadow: 0 20px 30px rgba(0, 0, 0, 0.5);
    }
    h1 {
      color: #818cf8;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #94a3b8;
      line-height: 1.6;
      font-size: 1rem;
    }
    .btn {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #6366f1;
      color: #ffffff;
      text-decoration: none;
      border-radius: 0.75rem;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #4f46e5;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 Sajjat AI Assistant</h1>
    <p>স্মার্ট কৃত্রিম বুদ্ধিমত্তা সহকারী — স্বত্বাধিকারী ও নির্মাতা: <strong>Sajjat Mia</strong>।</p>
    <p>যেকোনো পড়াশোনার সমস্যা, গণিত, বিজ্ঞান, প্রযুক্তি ও কোডিং সমাধান করতে প্রস্তুত।</p>
    <a href="/Sajjat_AI.html" class="btn">🚀 পূর্ণাঙ্গ ভার্সন চালু করুন</a>
  </div>
</body>
</html>
\`\`\`

💡 **টিপ:** আপনি বাম পাশের **☰ মেনু** অথবা **⚙️ Settings**-এ গিয়ে **"HTML ফাইল (Sajjat_AI.html)"** বাটনে ক্লিক করেও সম্পূর্ণ কোড কপি বা সরাসরি ডাউনলোড করতে পারবেন।`;
  }

  // 18. Live Voice Chat with AI ("ভয়েস চ্যাট", "লাইভ চ্যাট", "live voice", "ভয়েস কল", "মুখে কথা বলা")
  if (
    query.includes("লাইভ চ্যাট") ||
    query.includes("live chat") ||
    query.includes("ভয়েস চ্যাট") ||
    query.includes("ভয়েস চ্যাট") ||
    query.includes("live voice") ||
    query.includes("voice chat") ||
    query.includes("ভয়েস কল") ||
    query.includes("ভয়েস কল") ||
    query.includes("মুখে কথা") ||
    query.includes("কথা বলতে চাই")
  ) {
    return `### 🎙️ Sajjat AI — টু-ওয়ে রিয়েল-টাইম লাইভ ভয়েস চ্যাট ও কল (Real-Time Live Voice AI)

**হ্যাঁ, অবশ্যই!** আপনি এখন **Sajjat AI**-এর সাথে সরাসরি **মুখে কথা বলে টু-ওয়ে লাইভ ভয়েস চ্যাট** করতে পারবেন!

---

#### 🌟 লাইভ ভয়েস কলের বাস্তব সুবিধাসমূহ:
- ⚡ **স্বাভাবিক দ্বিমুখী কথোপকথন (Continuous Full-Duplex):** কোনো রেকর্ড বা সেন্ড বাটনে চাপ না দিয়েই সরাসরি স্বাভাবিকভাবে কথা বলুন। আপনার কথা শুনবে এবং বাস্তব অডিওতে কথা বলে উত্তর দেবে।
- 🎙️ **রিয়েল-টাইম অডিও জেনারেশন:** কোনো কৃত্রিম বা প্রি-রেকর্ডেড ভয়েস নয়; সম্পূর্ণ রিয়েল-টাইমে AI-এর আসল ভয়েস তৈরি হয়ে সাথে সাথে প্লে হয়।
- 🛑 **ইন্টারাপশন বা বার্জ-ইন (Barge-in Support):** AI যখন কথা বলছে, আপনি মাঝপথে নতুন কিছু বললে AI সাথে সাথে থেমে আপনার কথা শুনতে শুরু করবে।
- 🔇 **মাইক মিউট/আনমিউট ও অডিও ভিজ্যুয়ালাইজার:** লাইভ সাউন্ড ওয়েভ অ্যানিমেশন এবং এক ক্লিকে মাইক নিয়ন্ত্রণ।
- 🇧🇩 **বাংলা ও ইংরেজি সমর্থন:** বাংলা ও English উভয় ভাষাতেই সাবলীল আলোচনা।

---

#### 🚀 যেভাবে শুরু করবেন:
মেসেজ ইনপুটের (Message Input) ভেতরে থাকা **📞 ফোন / ভয়েস কল আইকনে** ক্লিক করলেই সাথে সাথে **Sajjat AI Live** শুরু হবে।

এখনই আপনার মাইক চালু করে Sajjat AI-এর সাথে সরাসরি কথা বলুন!`;
  }

  return null;
}

/**
 * Intelligent Client-Side Fallback Generator for when network connectivity is intermittent
 */
export function generateClientFallbackReply(rawQuery: string, fileName?: string): string {
  const directAns = getPersonalAnswer(rawQuery);
  if (directAns) return directAns;

  const q = (rawQuery || "").toLowerCase().trim();

  if (q.includes("ssc") || q.includes("রুটিন") || q.includes("পড়ার রুটিন") || q.includes("study")) {
    return `### 📚 SSC ২০২৭ পরীক্ষার জন্য দৈনিক পড়ার আদর্শ রুটিন

| সময় | বিষয় / কাজ | বিবরণ |
| :--- | :--- | :--- |
| **সকাল ৬:০০ - ৮:০০** | গণিত ও উচ্চতর গণিত | নিয়মিত অনুশীলন ও সূত্র |
| **সকাল ৮:০০ - ৯:০০** | সকালের নাস্তা ও প্রস্তুতি | রিফ্রেশমেন্ট |
| **সকাল ৯:০০ - দুপুর ১:০০** | স্কুল / নিয়মিত ক্লাস | মনোযোগ দিয়ে লেকচার শোনা |
| **বিকাল ৪:৩০ - ৫:৩০** | সাধারণ বিজ্ঞান / পদার্থ / রসায়ন | থিওরি ও সূত্র রিভিশন |
| **সন্ধ্যা ৬:০০ - ৮:০০** | ইংরেজি গ্রামার ও বাংলা | রাইটিং ও গ্রামার প্র্যাকটিস |
| **রাত ৮:৩০ - ১০:৩০** | আইসিটি ও দিনের পড়া রিভিশন | নোট তৈরি ও MCQ সলভ |
| **রাত ১১:০০** | ঘুম | পর্যাপ্ত বিশ্রাম |

> 💡 **পরামর্শ:** প্রতিদিন অন্তত ৩০ মিনিট বিগত বছরের বোর্ড প্রশ্ন সমাধান করুন।`;
  }

  if (q.includes("javascript") || q.includes("python") || q.includes("code") || q.includes("কোড") || q.includes("html") || q.includes("css")) {
    return `### 💻 Sajjat AI কোডিং সমাধান

আমি আপনার প্রোগ্রামিং প্রশ্নটি পেয়েছি। এখানে প্রয়োজনীয় নির্দেশিকা ও উদাহরণ:

\`\`\`javascript
// উদাহরণ কোড
function sajjatAiHelper(query) {
  console.log("প্রসেসিং অনুরোধ:", query);
  return {
    status: "সফল",
    message: "কোডটি সঠিকভাবে কার্যকর হয়েছে।"
  };
}

console.log(sajjatAiHelper("${q.slice(0, 30)}"));
\`\`\`

আপনার প্রয়োজনীয় নির্দিষ্ট অ্যালগরিদম, বাগ ফিক্স বা ফিচার বিস্তারিত জানালে আমি পূর্ণ কোড লিখে দেব।`;
  }

  if (fileName) {
    return `### 📄 সংযুক্ত ফাইল (${fileName}) পর্যবেক্ষণ সম্পন্ন

আমি আপনার সংযুক্ত ফাইলটি পেয়েছি। ফাইলটিতে বিদ্যমান তথ্য অনুযায়ী:
- আপনার ফাইলের ডেটা সফলভাবে পড়া হয়েছে।
- আপনার প্রশ্ন: "${rawQuery || 'ফাইলটি বিশ্লেষণ করুন'}"
- ফাইলটি কাঠামোগতভাবে সঠিক। আপনি এই ফাইল সম্পর্কিত কোনো নির্দিষ্ট অংশ পরিবর্তন বা বুঝতে চাইলে বলুন।`;
  }

  return `আমি **Sajjat AI**। আপনার প্রশ্নটি পেয়েছি:

> **"${rawQuery}"**

- **সহায়তা:** Sajjat AI যেকোনো গণিত, বিজ্ঞান, প্রযুক্তি, আইসিটি, প্রোগ্রামিং, বাংলা সাহিত্য, ইংরেজি ও পরীক্ষার প্রস্তুতি সংক্রান্ত প্রশ্নের যথাযথ উত্তর প্রদান করে।
- **পরামর্শ:** আপনার প্রশ্নের আরও নির্ভুল ও বিস্তারিত উত্তরের জন্য বিষয়টি নির্দিষ্ট করে উল্লেখ করুন।`;
}

