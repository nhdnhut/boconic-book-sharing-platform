// server/tests/fairScheduler.test.js
// Tests the Fair Matching & Scheduling algorithm and simulation engine.

import test from "node:test";
import assert from "node:assert";
import { evaluateRequestScore, generateFairSchedules, runFairVsFifoSimulation } from "../ai/fairScheduler.js";
import { db } from "../db.js";

test("Thuật toán ghép công bằng: Ưu tiên học sinh có tiết học gấp và không có internet/máy tính ở nhà", () => {
  const currentTime = new Date("2026-10-02T08:00:00Z");

  // Học sinh 1: Tiết học ngày mai (03/10), KHÔNG có thiết bị đọc trực tuyến
  const reqUrgentNeedy = {
    id: "req_test_1",
    studentAlias: "Học sinh Nam",
    startDate: "2026-10-02",
    endDate: "2026-10-06",
    hasClassOn: ["2026-10-03"],
    hasDigitalAccess: false,
    createdAt: "2026-10-01T12:00:00Z"
  };

  // Học sinh 2: Tiết học sau 6 ngày (08/10), CÓ máy tính bảng đọc online taphuan.nxbgd.vn
  const reqLessUrgentDigital = {
    id: "req_test_2",
    studentAlias: "Học sinh Hoàng",
    startDate: "2026-10-02",
    endDate: "2026-10-06",
    hasClassOn: ["2026-10-08"],
    hasDigitalAccess: true,
    createdAt: "2026-09-30T10:00:00Z" // Nộp đơn sớm hơn
  };

  const score1 = evaluateRequestScore(reqUrgentNeedy, null, currentTime);
  const score2 = evaluateRequestScore(reqLessUrgentDigital, null, currentTime);

  assert.ok(
    score1.finalScore > score2.finalScore,
    `Điểm ưu tiên của HS cần gấp không có internet (${score1.finalScore}) phải cao hơn HS có internet (${score2.finalScore})`
  );

  assert.strictEqual(score1.breakdown.equity.score, 1.0, "Điểm công bằng cho HS không có thiết bị phải là 1.0");
  assert.strictEqual(score1.breakdown.urgency.score, 1.0, "Điểm khẩn cấp cho HS có tiết học trong 24h phải là 1.0");
});

test("Mô phỏng Thử nghiệm: So sánh Ghép Công bằng Boconic vs Đến Trước Nhận Trước (FIFO)", () => {
  db.reset();

  const simResult = runFairVsFifoSimulation(db.requests, db.books, db.loans);

  assert.ok(simResult.fair, "Phải có kết quả cho thuật toán Fair");
  assert.ok(simResult.fifo, "Phải có kết quả cho thuật toán FIFO");

  // Check metrics exist
  assert.ok(simResult.fair.beforeClassRatePercent >= 0);
  assert.ok(simResult.fair.nonDigitalCoveragePercent >= 0);
  assert.ok(simResult.summaryImprovement, "Phải có tóm tắt cải tiến định lượng");
});
