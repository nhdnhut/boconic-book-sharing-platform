// server/ai/fairScheduler.js
// Fair Matching & Explainable Scheduling Engine for Boconic
// Balances urgent class schedule needs, equity for students lacking digital access, and wait time.

import { Database } from "../db.js";

/**
 * Weights for Multi-Objective Scoring:
 * Total = 1.0
 */
export const SCHEDULER_WEIGHTS = {
  URGENCY: 0.35,     // Proximity to student's timetable class day
  EQUITY: 0.30,      // Lack of digital / home internet access (no alternative e-book reading)
  WAIT_TIME: 0.20,   // Prevent queue starvation
  DATE_FIT: 0.15     // Compatibility between book availability and request window
};

/**
 * Calculates days difference between two dates
 */
function diffInDays(targetDateStr, baseDateStr = new Date().toISOString().split("T")[0]) {
  const t = new Date(targetDateStr).getTime();
  const b = new Date(baseDateStr).getTime();
  return Math.round((t - b) / (1000 * 60 * 60 * 24));
}

/**
 * Computes an explainable priority score for a single demand request given a candidate book
 */
export function evaluateRequestScore(request, book, currentTime = new Date()) {
  const explanations = [];

  // 1. URGENCY SCORE (0 to 1)
  // How soon is the student's next class on this subject?
  let urgencyScore = 0.2;
  if (request.hasClassOn && request.hasClassOn.length > 0) {
    const todayStr = currentTime.toISOString().split("T")[0];
    const upcomingDays = request.hasClassOn
      .map(d => diffInDays(d, todayStr))
      .filter(d => d >= 0);

    if (upcomingDays.length > 0) {
      const minDaysToClass = Math.min(...upcomingDays);
      if (minDaysToClass <= 1) {
        urgencyScore = 1.0;
        explanations.push("Tiết học diễn ra rất gần (trong 24-48 giờ tới, mức khẩn cấp tối đa)");
      } else if (minDaysToClass <= 3) {
        urgencyScore = 0.75;
        explanations.push(`Tiết học diễn ra sau ${minDaysToClass} ngày nữa`);
      } else if (minDaysToClass <= 7) {
        urgencyScore = 0.45;
        explanations.push(`Tiết học diễn ra trong tuần này (${minDaysToClass} ngày)`);
      } else {
        urgencyScore = 0.2;
        explanations.push(`Tiết học ở tuần kế tiếp (${minDaysToClass} ngày)`);
      }
    }
  }

  // 2. EQUITY SCORE (0 or 1)
  // Students without digital access / home internet cannot read taphuan.nxbgd.vn
  let equityScore = 0.2;
  if (request.hasDigitalAccess === false) {
    equityScore = 1.0;
    explanations.push("Học sinh không có thiết bị/internet ở nhà để đọc bản số (ưu tiên hỗ trợ công bằng giáo dục)");
  } else {
    equityScore = 0.3;
    explanations.push("Học sinh có thiết bị hỗ trợ đọc tạm thời bản điện tử chính thức");
  }

  // 3. WAIT TIME SCORE (0 to 1)
  // Hours waiting since request creation / 72 hours max norm
  const waitMs = currentTime.getTime() - new Date(request.createdAt).getTime();
  const waitHours = Math.max(0, waitMs / (1000 * 60 * 60));
  const waitScore = Math.min(1.0, waitHours / 72); // saturates at 3 days wait
  explanations.push(`Đã chờ ${waitHours.toFixed(1)} giờ trong danh sách (${(waitScore * 100).toFixed(0)}% điểm chờ)`);

  // 4. DATE FIT & AVAILABILITY
  let fitScore = 1.0;
  if (book && book.availableRanges) {
    const rStart = new Date(request.startDate).getTime();
    const rEnd = new Date(request.endDate).getTime();
    const fits = book.availableRanges.some(rng => {
      const bStart = new Date(rng.startDate).getTime();
      const bEnd = new Date(rng.endDate).getTime();
      return rStart >= bStart && rEnd <= bEnd;
    });
    fitScore = fits ? 1.0 : 0.4;
  }

  const finalScore = (
    SCHEDULER_WEIGHTS.URGENCY * urgencyScore +
    SCHEDULER_WEIGHTS.EQUITY * equityScore +
    SCHEDULER_WEIGHTS.WAIT_TIME * waitScore +
    SCHEDULER_WEIGHTS.DATE_FIT * fitScore
  );

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    breakdown: {
      urgency: { score: urgencyScore, weight: SCHEDULER_WEIGHTS.URGENCY, weighted: Math.round(urgencyScore * SCHEDULER_WEIGHTS.URGENCY * 100) / 100 },
      equity: { score: equityScore, weight: SCHEDULER_WEIGHTS.EQUITY, weighted: Math.round(equityScore * SCHEDULER_WEIGHTS.EQUITY * 100) / 100 },
      waitTime: { score: Math.round(waitScore * 100) / 100, weight: SCHEDULER_WEIGHTS.WAIT_TIME, weighted: Math.round(waitScore * SCHEDULER_WEIGHTS.WAIT_TIME * 100) / 100, waitHours: Math.round(waitHours * 10) / 10 },
      dateFit: { score: fitScore, weight: SCHEDULER_WEIGHTS.DATE_FIT, weighted: Math.round(fitScore * SCHEDULER_WEIGHTS.DATE_FIT * 100) / 100 }
    },
    explanations
  };
}

/**
 * Runs the Fair Scheduler on all waiting requests against candidate books
 * Returns optimized recommendations with full explainability.
 */
export function generateFairSchedules(requests, books, existingLoans, currentTime = new Date()) {
  const waitingRequests = requests.filter(r => r.status === "CHỜ GHÉP");
  const recommendations = [];

  // Group books by (schoolId, grade, subject, series)
  for (const req of waitingRequests) {
    // Find compatible books in same school
    const compatibleBooks = books.filter(b => 
      b.schoolId === req.schoolId &&
      b.grade === req.grade &&
      b.subject === req.subject &&
      (!req.series || b.series === req.series)
    );

    // Score all candidates
    const scoredBooks = [];
    for (const b of compatibleBooks) {
      // Check if book has existing overlapping loans
      const activeLoans = existingLoans.filter(l => 
        l.bookId === b.id && 
        (l.status === "ĐÃ ĐẶT" || l.status === "ĐANG MƯỢN")
      );

      const hasConflict = activeLoans.some(l => 
        Database.isDateOverlap(req.startDate, req.endDate, l.startDate, l.endDate)
      );

      if (!hasConflict) {
        const scoreInfo = evaluateRequestScore(req, b, currentTime);
        scoredBooks.push({
          book: b,
          scoreInfo
        });
      }
    }

    // Sort candidate books by fit & condition
    scoredBooks.sort((a, b) => b.scoreInfo.finalScore - a.scoreInfo.finalScore);

    if (scoredBooks.length > 0) {
      const topMatch = scoredBooks[0];
      recommendations.push({
        requestId: req.id,
        studentAlias: req.studentAlias,
        schoolId: req.schoolId,
        subject: req.subject,
        grade: req.grade,
        series: req.series,
        dateWindow: `${req.startDate} -> ${req.endDate}`,
        recommendedBook: {
          id: topMatch.book.id,
          title: topMatch.book.title,
          pickupPointName: topMatch.book.pickupPointName,
          condition: topMatch.book.condition
        },
        priorityScore: topMatch.scoreInfo.finalScore,
        breakdown: topMatch.scoreInfo.breakdown,
        reasons: topMatch.scoreInfo.explanations
      });
    } else {
      // Unmatched demand - flagged for supply alert
      recommendations.push({
        requestId: req.id,
        studentAlias: req.studentAlias,
        schoolId: req.schoolId,
        subject: req.subject,
        grade: req.grade,
        series: req.series,
        dateWindow: `${req.startDate} -> ${req.endDate}`,
        recommendedBook: null,
        priorityScore: evaluateRequestScore(req, null, currentTime).finalScore,
        breakdown: evaluateRequestScore(req, null, currentTime).breakdown,
        reasons: ["Hiện chưa có cuốn sách nào trống lịch phù hợp trong trường. Cần huy động thêm nguồn sách."]
      });
    }
  }

  // Sort overall recommendations by priority score descending
  recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

  return recommendations;
}

/**
 * AI Research Simulation:
 * Compares Fair Scheduling vs FIFO (First-Come, First-Served)
 * Evaluates 4 key metrics:
 * 1. % students who receive book BEFORE class
 * 2. Average wait time (hours)
 * 3. Total book turnaround / reuse cycles
 * 4. Equity index (% served among non-digital vs digital students)
 */
export function runFairVsFifoSimulation(requestsInput, booksInput, existingLoansInput) {
  const requests = JSON.parse(JSON.stringify(requestsInput));
  const books = JSON.parse(JSON.stringify(booksInput));

  // --- 1. SIMULATE FIFO (First-In, First-Out) ---
  // Sort requests strictly by createdAt ascending
  const fifoRequests = [...requests].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const fifoLoans = JSON.parse(JSON.stringify(existingLoansInput));

  let fifoSatisfiedBeforeClass = 0;
  let fifoTotalWaitHours = 0;
  let fifoNonDigitalServed = 0;
  let fifoDigitalServed = 0;
  let fifoServedCount = 0;

  for (const req of fifoRequests) {
    const candidateBook = books.find(b => {
      if (b.schoolId !== req.schoolId || b.grade !== req.grade || b.subject !== req.subject) return false;
      if (req.series && b.series !== req.series) return false;
      const overlaps = fifoLoans.some(l => 
        l.bookId === b.id && 
        (l.status === "ĐÃ ĐẶT" || l.status === "ĐANG MƯỢN") && 
        Database.isDateOverlap(req.startDate, req.endDate, l.startDate, l.endDate)
      );
      return !overlaps;
    });

    if (candidateBook) {
      fifoServedCount++;
      // Register loan
      fifoLoans.push({
        id: "sim_fifo_" + req.id,
        bookId: candidateBook.id,
        startDate: req.startDate,
        endDate: req.endDate,
        status: "ĐÃ ĐẶT"
      });

      // Calculate wait hours
      const waitHours = Math.max(1, (new Date(req.startDate).getTime() - new Date(req.createdAt).getTime()) / (1000 * 3600));
      fifoTotalWaitHours += waitHours;

      // Check if received before class
      const earliestClass = req.hasClassOn && req.hasClassOn.length > 0 ? req.hasClassOn[0] : req.startDate;
      if (new Date(req.startDate).getTime() <= new Date(earliestClass).getTime()) {
        fifoSatisfiedBeforeClass++;
      }

      if (req.hasDigitalAccess === false) {
        fifoNonDigitalServed++;
      } else {
        fifoDigitalServed++;
      }
    }
  }

  // --- 2. SIMULATE FAIR SCHEDULING (Multi-Objective Optimization) ---
  const fairRequests = [...requests].sort((a, b) => {
    const scoreA = evaluateRequestScore(a, null).finalScore;
    const scoreB = evaluateRequestScore(b, null).finalScore;
    return scoreB - scoreA; // higher priority first
  });
  const fairLoans = JSON.parse(JSON.stringify(existingLoansInput));

  let fairSatisfiedBeforeClass = 0;
  let fairTotalWaitHours = 0;
  let fairNonDigitalServed = 0;
  let fairDigitalServed = 0;
  let fairServedCount = 0;

  for (const req of fairRequests) {
    const candidateBook = books.find(b => {
      if (b.schoolId !== req.schoolId || b.grade !== req.grade || b.subject !== req.subject) return false;
      if (req.series && b.series !== req.series) return false;
      const overlaps = fairLoans.some(l => 
        l.bookId === b.id && 
        (l.status === "ĐÃ ĐẶT" || l.status === "ĐANG MƯỢN") && 
        Database.isDateOverlap(req.startDate, req.endDate, l.startDate, l.endDate)
      );
      return !overlaps;
    });

    if (candidateBook) {
      fairServedCount++;
      fairLoans.push({
        id: "sim_fair_" + req.id,
        bookId: candidateBook.id,
        startDate: req.startDate,
        endDate: req.endDate,
        status: "ĐÃ ĐẶT"
      });

      const waitHours = Math.max(1, (new Date(req.startDate).getTime() - new Date(req.createdAt).getTime()) / (1000 * 3600));
      fairTotalWaitHours += waitHours;

      const earliestClass = req.hasClassOn && req.hasClassOn.length > 0 ? req.hasClassOn[0] : req.startDate;
      if (new Date(req.startDate).getTime() <= new Date(earliestClass).getTime()) {
        fairSatisfiedBeforeClass++;
      }

      if (req.hasDigitalAccess === false) {
        fairNonDigitalServed++;
      } else {
        fairDigitalServed++;
      }
    }
  }

  const totalNonDigitalReqs = requests.filter(r => r.hasDigitalAccess === false).length || 1;
  const totalDigitalReqs = requests.filter(r => r.hasDigitalAccess === true).length || 1;
  const totalReqs = requests.length || 1;

  return {
    fifo: {
      name: "Đến trước - Phục vụ trước (FIFO chuẩn)",
      servedCount: fifoServedCount,
      servedRatePercent: Math.round((fifoServedCount / totalReqs) * 100),
      beforeClassRatePercent: Math.round((fifoSatisfiedBeforeClass / Math.max(1, fifoServedCount)) * 100),
      averageWaitHours: Math.round((fifoTotalWaitHours / Math.max(1, fifoServedCount)) * 10) / 10,
      nonDigitalCoveragePercent: Math.round((fifoNonDigitalServed / totalNonDigitalReqs) * 100),
      digitalCoveragePercent: Math.round((fifoDigitalServed / totalDigitalReqs) * 100),
      equityGapPercent: Math.abs(Math.round(((fifoDigitalServed / totalDigitalReqs) - (fifoNonDigitalServed / totalNonDigitalReqs)) * 100))
    },
    fair: {
      name: "Ghép công bằng Boconic (Multi-Objective AI)",
      servedCount: fairServedCount,
      servedRatePercent: Math.round((fairServedCount / totalReqs) * 100),
      beforeClassRatePercent: Math.round((fairSatisfiedBeforeClass / Math.max(1, fairServedCount)) * 100),
      averageWaitHours: Math.round((fairTotalWaitHours / Math.max(1, fairServedCount)) * 10) / 10,
      nonDigitalCoveragePercent: Math.round((fairNonDigitalServed / totalNonDigitalReqs) * 100),
      digitalCoveragePercent: Math.round((fairDigitalServed / totalDigitalReqs) * 100),
      equityGapPercent: Math.abs(Math.round(((fairDigitalServed / totalDigitalReqs) - (fairNonDigitalServed / totalNonDigitalReqs)) * 100))
    },
    summaryImprovement: {
      beforeClassGainPercent: Math.round(
        ((fairSatisfiedBeforeClass / Math.max(1, fairServedCount)) - (fifoSatisfiedBeforeClass / Math.max(1, fifoServedCount))) * 100
      ),
      equityProtectionNote: "Thuật toán công bằng giúp học sinh không có internet ở nhà được ưu tiên giải quyết sách bản in kịp thời trước giờ học, giảm thiệt thòi học tập so với quy tắc FIFO ngẫu nhiên."
    }
  };
}
