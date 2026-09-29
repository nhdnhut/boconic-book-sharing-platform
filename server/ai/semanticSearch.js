// server/ai/semanticSearch.js
// Natural Language Intent & Semantic Search for Authorized Learning Materials.
// Strict Copyright Boundary: Operates strictly on approved metadata, topics, and official URLs.
// Never ingests or indexes pirated / scanned copyrighted textbook bodies.

/**
 * Normalizes Vietnamese text for accent-insensitive and lowercase token comparison
 */
export function normalizeVietnamese(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts student learning intent, grade, subject, and topic terms from natural language
 */
export function extractLearningIntent(queryText) {
  const norm = normalizeVietnamese(queryText);

  // Grade detection (lớp 6, lop 6, grade 6, l6...)
  let detectedGrade = null;
  const gradeMatch = norm.match(/(?:lop|khoi|grade)\s*([0-9]{1,2})/) || norm.match(/\b([6-9]|1[0-2])\b/);
  if (gradeMatch) {
    detectedGrade = `Lớp ${gradeMatch[1]}`;
  }

  // Subject detection
  let detectedSubject = null;
  const subjectMap = [
    { name: "Toán", aliases: ["toan", "hinh hoc", "dai so", "phan so", "so tu nhien", "tinh toan", "hinh hoc truc quan"] },
    { name: "Ngữ văn", aliases: ["van", "ngu van", "tap lam van", "tho", "truyen", "tieng viet"] },
    { name: "Khoa học tự nhiên", aliases: ["khtn", "khoa hoc tu nhien", "vat ly", "hoa hoc", "sinh hoc"] },
    { name: "Lịch sử và Địa lí", aliases: ["lich su", "dia ly", "dia li", "su dia"] },
    { name: "Tiếng Anh", aliases: ["tieng anh", "anh van", "english", "global success"] },
    { name: "Tin học", aliases: ["tin hoc", "may tinh", "lap trinh"] },
    { name: "Giáo dục công dân", aliases: ["gdcd", "giao duc cong dan"] }
  ];

  for (const s of subjectMap) {
    if (s.aliases.some(alias => norm.includes(alias))) {
      detectedSubject = s.name;
      break;
    }
  }

  // Book Series detection
  let detectedSeries = null;
  if (norm.includes("ket noi") || norm.includes("kntt")) {
    detectedSeries = "Kết nối tri thức với cuộc sống";
  } else if (norm.includes("chan troi") || norm.includes("ctst")) {
    detectedSeries = "Chân trời sáng tạo";
  } else if (norm.includes("canh dieu") || norm.includes("cd")) {
    detectedSeries = "Cánh Diều";
  }

  // Topic keywords extraction
  const topicKeywords = [];
  const candidateTopics = ["phan so", "so tu nhien", "so thap phan", "hinh hoc", "chinh ly", "2026", "2027", "video bai giang", "tap huan", "on tap"];
  for (const t of candidateTopics) {
    if (norm.includes(t)) {
      topicKeywords.push(t);
    }
  }

  return {
    rawQuery: queryText,
    normalized: norm,
    detectedGrade,
    detectedSubject,
    detectedSeries,
    topicKeywords
  };
}

/**
 * Searches authorized learning materials using natural language query matching
 */
export function searchLearningMaterialsNL(materials, queryText) {
  if (!queryText || queryText.trim() === "") {
    return materials.map(m => ({ item: m, relevanceScore: 1.0, matchReasons: ["Danh sách học liệu chính thức mặc định"] }));
  }

  const intent = extractLearningIntent(queryText);
  const queryTokens = intent.normalized.split(" ").filter(t => t.length > 1);

  const scoredResults = materials.map(mat => {
    let score = 0;
    const matchReasons = [];

    const matNormTitle = normalizeVietnamese(mat.title);
    const matNormDesc = normalizeVietnamese(mat.description);
    const matNormProvider = normalizeVietnamese(mat.provider);
    const matNormTopics = (mat.topics || []).map(normalizeVietnamese);

    // 1. Grade match
    if (intent.detectedGrade) {
      if (mat.grade === "Toàn cấp" || mat.grade.includes(intent.detectedGrade)) {
        score += 35;
        matchReasons.push(`Khớp khối lớp: ${intent.detectedGrade}`);
      }
    }

    // 2. Subject match
    if (intent.detectedSubject) {
      if (mat.subject === "Tất cả" || mat.subject.includes(intent.detectedSubject)) {
        score += 35;
        matchReasons.push(`Khớp môn học: ${intent.detectedSubject}`);
      }
    }

    // 3. Series match
    if (intent.detectedSeries) {
      if (mat.series === intent.detectedSeries || mat.series.includes("Dùng chung")) {
        score += 20;
        matchReasons.push(`Khớp bộ sách: ${intent.detectedSeries}`);
      }
    }

    // 4. Topic & Token matches
    let tokenMatches = 0;
    for (const token of queryTokens) {
      if (matNormTitle.includes(token)) {
        score += 8;
        tokenMatches++;
      } else if (matNormTopics.some(t => t.includes(token))) {
        score += 10;
        tokenMatches++;
      } else if (matNormDesc.includes(token)) {
        score += 4;
        tokenMatches++;
      }
    }

    if (tokenMatches > 0) {
      matchReasons.push(`Khớp từ khóa nội dung: ${tokenMatches} từ khóa`);
    }

    return {
      item: mat,
      relevanceScore: score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ["Khớp thông tin tham khảo bổ trợ"]
    };
  });

  // Filter out zero relevance and sort descending
  const relevant = scoredResults
    .filter(r => r.relevanceScore > 5)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    query: queryText,
    intent,
    totalFound: relevant.length,
    results: relevant
  };
}
