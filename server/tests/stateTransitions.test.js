// server/tests/stateTransitions.test.js
// Tests the complete lifecycle and transition rules for book loans:
// SẴN CÓ -> ĐÃ ĐẶT -> ĐANG MƯỢN -> ĐÃ TRẢ, including CANCEL and OVERDUE states.

import test from "node:test";
import assert from "node:assert";
import { db } from "../db.js";

test("Kiểm thử vòng đời trạng thái mượn trả sách (Happy path & Edge cases)", () => {
  db.reset();

  const book = db.getBookById("bk_003"); // SẴN CÓ ban đầu
  assert.strictEqual(book.status, "SẴN CÓ");

  // 1. Tạo đặt lịch mượn -> Chuyển sang ĐÃ ĐẶT
  const loan = db.createLoan({
    bookId: book.id,
    borrowerAlias: "Học sinh Khánh",
    startDate: "2026-10-05",
    endDate: "2026-10-10"
  });

  assert.strictEqual(loan.status, "ĐÃ ĐẶT");
  assert.strictEqual(book.status, "ĐÃ ĐẶT");

  // Không thể hoàn trả ngay khi chưa nhận sách (chặn chuyển trạng thái sai logic)
  assert.throws(() => {
    db.transitionLoan(loan.id, "RETURN");
  }, /Không thể hoàn tất trả sách từ trạng thái 'ĐÃ ĐẶT'/);

  // 2. Học sinh đến thư viện nhận sách -> PICKUP -> Chuyển sang ĐANG MƯỢN
  db.transitionLoan(loan.id, "PICKUP", "Đã quét mã nhận sách tại bàn thư viện");
  assert.strictEqual(loan.status, "ĐANG MƯỢN");
  assert.strictEqual(book.status, "ĐANG MƯỢN");
  assert.ok(loan.actualPickupAt, "Phải ghi nhận thời điểm nhận sách thực tế");

  // 3. Đánh dấu quá hạn (OVERDUE) khi quá ngày hẹn
  db.transitionLoan(loan.id, "OVERDUE", "Học sinh chưa trả theo hạn 10/10");
  assert.strictEqual(loan.status, "QUÁ HẠN");

  // 4. Học sinh mang trả lại sách -> RETURN -> Chuyển sang ĐÃ TRẢ & Sách quay lại SẴN CÓ
  db.transitionLoan(loan.id, "RETURN", "Đã nhận lại sách đầy đủ");
  assert.strictEqual(loan.status, "ĐÃ TRẢ");
  assert.strictEqual(book.status, "SẴN CÓ", "Sách phải trở về trạng thái SẴN CÓ để phục vụ học sinh tiếp theo");
  assert.strictEqual(book.currentLoanId, null);
  assert.ok(loan.actualReturnAt, "Phải ghi nhận thời điểm trả sách thực tế");
});

test("Kiểm thử hủy đặt lịch (CANCEL): Sách phải được hoàn lại trạng thái SẴN CÓ", () => {
  db.reset();

  const book = db.getBookById("bk_004");
  const loan = db.createLoan({
    bookId: book.id,
    borrowerAlias: "Học sinh Tùng",
    startDate: "2026-10-05",
    endDate: "2026-10-09"
  });

  assert.strictEqual(book.status, "ĐÃ ĐẶT");

  // Hủy lượt mượn
  db.transitionLoan(loan.id, "CANCEL", "Học sinh đã mượn được bạn cùng lớp");
  assert.strictEqual(loan.status, "ĐÃ HỦY");
  assert.strictEqual(book.status, "SẴN CÓ", "Sách phải lập tức mở lại cho người khác mượn");
});
