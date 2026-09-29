// server/routes/api.js
// REST API routes for Boconic platform

import express from "express";
import multer from "multer";
import { db } from "../db.js";
import { 
  evaluateRequestScore, 
  generateFairSchedules, 
  runFairVsFifoSimulation 
} from "../ai/fairScheduler.js";
import { forecastTextbookShortages } from "../ai/shortageForecaster.js";
import { searchLearningMaterialsNL } from "../ai/semanticSearch.js";
import { inspectUploadedFile, inspectLearningMaterialSubmission } from "../ai/guardrail.js";

const router = express.Router();

// Configure Multer memory storage for file upload inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// --- System & Reset ---
router.get("/metrics", (req, res) => {
  res.json({
    success: true,
    data: db.getMetrics()
  });
});

router.post("/reset-demo", (req, res) => {
  db.reset();
  res.json({
    success: true,
    message: "Dữ liệu mẫu demo đã được đặt lại về trạng thái ban đầu.",
    data: db.getMetrics()
  });
});

// --- Schools ---
router.get("/schools", (req, res) => {
  res.json({
    success: true,
    data: db.schools
  });
});

// --- Books ---
router.get("/books", (req, res) => {
  const { schoolId, grade, subject, series, status } = req.query;
  const books = db.getBooks({ schoolId, grade, subject, series, status });
  res.json({
    success: true,
    count: books.length,
    data: books
  });
});

router.get("/books/:id", (req, res) => {
  const book = db.getBookById(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, message: "Không tìm thấy sách yêu cầu." });
  }
  res.json({ success: true, data: book });
});

router.post("/books", upload.single("coverFile"), (req, res) => {
  try {
    // 1. Check if user attempted to upload a file (guardrail verification)
    if (req.file) {
      const fileCheck = inspectUploadedFile(req.file);
      if (!fileCheck.isAllowed) {
        // Record in risk queue
        db.addRiskItem({
          type: fileCheck.flagType,
          target: req.file.originalname,
          submittedBy: req.body.lenderAlias || "Người cho mượn",
          flagReason: fileCheck.reason,
          aiConfidence: fileCheck.confidence,
          status: "CHẶN TỰ ĐỘNG"
        });

        return res.status(400).json({
          success: false,
          errorType: "COPYRIGHT_VIOLATION_BLOCKED",
          message: fileCheck.reason,
          recommendation: fileCheck.recommendation
        });
      }
    }

    const {
      schoolId,
      pickupPointId,
      pickupPointName,
      title,
      grade,
      subject,
      series,
      edition,
      condition,
      lenderAlias,
      availableStartDate,
      availableEndDate
    } = req.body;

    if (!title || !grade || !subject || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ: Tên sách, Khối lớp, Môn học và Trường học."
      });
    }

    const availableRanges = (availableStartDate && availableEndDate)
      ? [{ startDate: availableStartDate, endDate: availableEndDate }]
      : [{ startDate: "2026-10-01", endDate: "2026-10-31" }];

    const newBook = db.addBook({
      schoolId,
      pickupPointId: pickupPointId || "pp_cva_1",
      pickupPointName: pickupPointName || "Bàn tiếp nhận Thư viện trường",
      title,
      grade,
      subject,
      series: series || "Kết nối tri thức với cuộc sống",
      edition: edition || "Tái bản mới nhất",
      condition: condition || "Tốt, nguyên vẹn",
      lenderAlias: lenderAlias || "Thành viên chia sẻ ẩn danh",
      availableRanges
    });

    res.status(201).json({
      success: true,
      message: "Đăng sách cho mượn thành công! Sách đã sẵn sàng được kết nối.",
      data: newBook
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Requests (Demand) ---
router.get("/requests", (req, res) => {
  const { schoolId, grade, subject, status } = req.query;
  const requests = db.getRequests({ schoolId, grade, subject, status });
  res.json({
    success: true,
    count: requests.length,
    data: requests
  });
});

router.post("/requests", (req, res) => {
  try {
    const {
      schoolId,
      studentAlias,
      grade,
      subject,
      series,
      editionNeeded,
      startDate,
      endDate,
      hasClassOn,
      hasDigitalAccess,
      reason
    } = req.body;

    if (!grade || !subject || !schoolId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền thông tin trường, môn học, khối lớp và khoảng ngày cần dùng sách."
      });
    }

    const newRequest = db.addRequest({
      schoolId,
      studentAlias: studentAlias || `Học sinh ẩn danh (${grade})`,
      grade,
      subject,
      series: series || "Kết nối tri thức với cuộc sống",
      editionNeeded: editionNeeded || "Bất kỳ phiên bản hợp lệ",
      startDate,
      endDate,
      hasClassOn: Array.isArray(hasClassOn) ? hasClassOn : (hasClassOn ? [hasClassOn] : [startDate]),
      hasDigitalAccess: hasDigitalAccess === true || hasDigitalAccess === "true",
      reason: reason || "Chờ sách chính thức từ nhà trường"
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký nhu cầu mượn thành công! Hệ thống ghép công bằng đang xử lý.",
      data: newRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- Loans & Concurrency / State Transitions ---
router.get("/loans", (req, res) => {
  const { schoolId, bookId, status } = req.query;
  const loans = db.getLoans({ schoolId, bookId, status });
  res.json({
    success: true,
    count: loans.length,
    data: loans
  });
});

router.post("/loans", (req, res) => {
  try {
    const { bookId, requestId, schoolId, pickupPointName, borrowerAlias, startDate, endDate, notes } = req.body;

    if (!bookId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mã sách (bookId) và khoảng ngày bắt đầu/kết thúc."
      });
    }

    // Creates loan with STRICT OVERLAPPING SCHEDULE PREVENTION
    const newLoan = db.createLoan({
      bookId,
      requestId,
      schoolId,
      pickupPointName,
      borrowerAlias,
      startDate,
      endDate,
      notes
    });

    res.status(201).json({
      success: true,
      message: "Đặt lịch mượn sách thành công! Vui lòng lưu mã nhận sách để đối chiếu tại Thư viện.",
      data: newLoan
    });
  } catch (err) {
    // Overlapping conflict or other business rules
    res.status(409).json({
      success: false,
      conflict: true,
      message: err.message
    });
  }
});

router.post("/loans/:id/transition", (req, res) => {
  try {
    const { action, notes } = req.body; // "PICKUP" | "RETURN" | "OVERDUE" | "CANCEL"
    const updatedLoan = db.transitionLoan(req.params.id, action, notes);
    res.json({
      success: true,
      message: `Chuyển trạng thái mượn trả '${action}' thành công.`,
      data: updatedLoan
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// --- Learning Materials & Semantic Search ---
router.get("/materials", (req, res) => {
  const { q, grade, subject, series } = req.query;

  let materials = db.getMaterials({ grade, subject, series });

  if (q && q.trim()) {
    const searchResult = searchLearningMaterialsNL(materials, q);
    return res.json({
      success: true,
      isNaturalLanguageQuery: true,
      intent: searchResult.intent,
      count: searchResult.totalFound,
      data: searchResult.results.map(r => ({
        ...r.item,
        relevanceScore: r.relevanceScore,
        matchReasons: r.matchReasons
      }))
    });
  }

  res.json({
    success: true,
    isNaturalLanguageQuery: false,
    count: materials.length,
    data: materials
  });
});

router.post("/materials", (req, res) => {
  try {
    const { title, grade, subject, series, provider, officialUrl, accessType, topics, description } = req.body;

    if (!title || !officialUrl || !provider) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp tiêu đề, đường dẫn chính thức và đơn vị xuất bản/chủ sở hữu."
      });
    }

    // Guardrail inspection on link & text
    const check = inspectLearningMaterialSubmission({ title, officialUrl, provider, description });

    if (check.action === "BLOCK") {
      db.addRiskItem({
        type: check.flagType,
        target: officialUrl,
        submittedBy: provider || "Quản trị viên học liệu",
        flagReason: check.reason,
        aiConfidence: check.confidence,
        status: "CHẶN TỰ ĐỘNG"
      });

      return res.status(400).json({
        success: false,
        errorType: "COPYRIGHT_RISK_BLOCKED",
        message: check.reason
      });
    }

    if (check.action === "FLAG_REVIEW") {
      const riskRecord = db.addRiskItem({
        type: check.flagType,
        target: officialUrl,
        submittedBy: provider || "Người đóng góp liên kết",
        flagReason: check.reason,
        aiConfidence: check.confidence,
        status: "ĐANG CHỜ DUYỆT"
      });

      return res.status(202).json({
        success: true,
        pendingReview: true,
        message: "Liên kết đã được tiếp nhận và đưa vào hàng đợi kiểm duyệt để xác thực nguồn gốc chính thức.",
        riskRecord
      });
    }

    // Whitelisted & verified
    const newMaterial = db.addMaterial({
      title,
      grade: grade || "Toàn cấp",
      subject: subject || "Tất cả",
      series: series || "Dùng chung cho các bộ sách",
      provider,
      officialUrl,
      accessType: accessType || "Đọc trực tuyến chính thức",
      topics: Array.isArray(topics) ? topics : (topics ? topics.split(",").map(t => t.trim()) : []),
      description: description || "Học liệu chính thức được ủy quyền truy cập."
    });

    res.status(201).json({
      success: true,
      message: "Học liệu chính thức đã được phê duyệt và lập chỉ mục metadata.",
      data: newMaterial
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- AI Coordinator & Research APIs ---

// 1. Fair Scheduling recommendations
router.get("/coordinator/fair-schedule", (req, res) => {
  const recommendations = generateFairSchedules(db.requests, db.books, db.loans);
  res.json({
    success: true,
    totalRecommendations: recommendations.length,
    matchedCount: recommendations.filter(r => r.recommendedBook !== null).length,
    unmatchedCount: recommendations.filter(r => r.recommendedBook === null).length,
    data: recommendations
  });
});

// Execute one-click auto-match based on top recommendation
router.post("/coordinator/execute-match", (req, res) => {
  try {
    const { requestId, bookId, startDate, endDate } = req.body;
    const reqItem = db.getRequestById(requestId);
    const bookItem = db.getBookById(bookId);

    if (!reqItem || !bookItem) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu hoặc sách tương ứng." });
    }

    const loan = db.createLoan({
      bookId: bookItem.id,
      requestId: reqItem.id,
      schoolId: reqItem.schoolId,
      pickupPointName: bookItem.pickupPointName,
      borrowerAlias: reqItem.studentAlias,
      startDate: startDate || reqItem.startDate,
      endDate: endDate || reqItem.endDate,
      notes: "Ghép tự động bởi Thuật toán Ghép Công Bằng Boconic"
    });

    res.json({
      success: true,
      message: `Đã ghép thành công sách '${bookItem.title}' cho ${reqItem.studentAlias}!`,
      data: loan
    });
  } catch (err) {
    res.status(409).json({ success: false, message: err.message });
  }
});

// 2. Textbook Shortage Forecast
router.get("/coordinator/forecast", (req, res) => {
  const forecastData = forecastTextbookShortages(db.books, db.requests, db.loans, db.schools);
  res.json({
    success: true,
    data: forecastData
  });
});

// 3. AI Research Sandbox: Compare Fair Scheduling vs FIFO
router.get("/ai/simulation", (req, res) => {
  const result = runFairVsFifoSimulation(db.requests, db.books, db.loans);
  res.json({
    success: true,
    data: result
  });
});

// 4. Moderation / Risk Queue Management
router.get("/coordinator/risk-queue", (req, res) => {
  res.json({
    success: true,
    data: db.getRiskQueue()
  });
});

router.post("/coordinator/risk-queue/:id", (req, res) => {
  const { action, resolutionNotes } = req.body; // "CHẤP THUẬN" | "ĐÃ TỪ CHỐI"
  const item = db.updateRiskStatus(req.params.id, action, resolutionNotes);
  if (!item) {
    return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi kiểm duyệt." });
  }
  res.json({
    success: true,
    message: `Đã cập nhật trạng thái kiểm duyệt thành: ${action}`,
    data: item
  });
});

export default router;
