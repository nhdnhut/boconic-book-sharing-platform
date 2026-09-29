// server/tests/guardrailBlocker.test.js
// Tests strict enforcement of Copyright Boundaries:
// Rejection of book file uploads (PDF/scans), piracy keywords, and suspicious lockers.

import test from "node:test";
import assert from "node:assert";
import { inspectUploadedFile, inspectLearningMaterialSubmission } from "../ai/guardrail.js";

test("Kiểm duyệt tệp tải lên: Chặn dứt khoát PDF, EPUB, ZIP sách giáo khoa", () => {
  // Test PDF upload attempt
  const fakePdf = {
    originalname: "Toan_6_Ket_Noi_Tri_Thuc_Scan.pdf",
    mimetype: "application/pdf"
  };
  const pdfResult = inspectUploadedFile(fakePdf);
  assert.strictEqual(pdfResult.isAllowed, false, "Phải chặn tệp PDF");
  assert.strictEqual(pdfResult.flagType, "BLOCKED_FILE_UPLOAD");
  assert.ok(pdfResult.reason.includes("Boconic KHÔNG lưu trữ"), "Thông báo phải giải thích rõ lý do bản quyền");

  // Test EPUB upload attempt
  const fakeEpub = {
    originalname: "tieng_anh_7.epub",
    mimetype: "application/epub+zip"
  };
  const epubResult = inspectUploadedFile(fakeEpub);
  assert.strictEqual(epubResult.isAllowed, false, "Phải chặn tệp EPUB");

  // Test scanned page photo upload attempt
  const fakeScanPhoto = {
    originalname: "scan_trang_50_to_60.jpg",
    mimetype: "image/jpeg"
  };
  const scanResult = inspectUploadedFile(fakeScanPhoto);
  assert.strictEqual(scanResult.isAllowed, false, "Phải chặn ảnh chụp quét trang sách");
  assert.strictEqual(scanResult.flagType, "SUSPICIOUS_IMAGE_SCAN");

  // Legitimate book cover photo SHOULD be allowed (without scanned content)
  const fakeCoverPhoto = {
    originalname: "bia_truoc_sach_toan.jpg",
    mimetype: "image/jpeg"
  };
  const coverResult = inspectUploadedFile(fakeCoverPhoto);
  assert.strictEqual(coverResult.isAllowed, true, "Ảnh chụp bìa sách nhận diện tình trạng sách được phép tải");
});

test("Kiểm duyệt học liệu: Chặn từ khóa chia sẻ lậu và gắn cờ kho lưu trữ không rõ bản quyền", () => {
  // 1. Dấu hiệu gom sách chia sẻ lậu
  const piracyAttempt = inspectLearningMaterialSubmission({
    title: "Tải sách bản scan full 100% PDF miễn phí",
    officialUrl: "https://somewebsite.com/sach-giao-khoa.pdf",
    provider: "Cộng đồng chia sẻ tài liệu"
  });
  assert.strictEqual(piracyAttempt.action, "BLOCK", "Phải chặn hành vi chia sẻ từ khóa 'scan full'");
  assert.strictEqual(piracyAttempt.flagType, "COPYRIGHT_RISK_KEYWORD");

  // 2. Link dẫn đến kho cá nhân Mega / Fshare
  const suspiciousLocker = inspectLearningMaterialSubmission({
    title: "Kho bài tập tham khảo",
    officialUrl: "https://mega.nz/folder/abc123bookfolder",
    provider: "Ẩn danh"
  });
  assert.strictEqual(suspiciousLocker.action, "FLAG_REVIEW", "Phải đưa vào hàng đợi kiểm duyệt nếu là kho lưu trữ cá nhân");
  assert.strictEqual(suspiciousLocker.flagType, "SUSPICIOUS_STORAGE_HOST");

  // 3. Link chính thức từ Nhà xuất bản Giáo dục Việt Nam -> Chấp thuận ngay
  const officialNXB = inspectLearningMaterialSubmission({
    title: "Học liệu tập huấn SGK Toán 6",
    officialUrl: "https://taphuan.nxbgd.vn/",
    provider: "Nhà xuất bản Giáo dục Việt Nam"
  });
  assert.strictEqual(officialNXB.action, "ALLOW", "Phải tự động phê duyệt liên kết từ cổng chính thức taphuan.nxbgd.vn");
  assert.strictEqual(officialNXB.isTrusted, true);
});
