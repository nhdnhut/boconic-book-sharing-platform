// server/tests/bookingConflict.test.js
// Tests concurrency rule: No two people can book the same book for overlapping time intervals!

import test from "node:test";
import assert from "node:assert";
import { db } from "../db.js";

test("Kiểm thử đặt lịch: Ngăn chặn tuyệt đối 2 người đặt trùng khoảng thời gian trên cùng 1 cuốn sách", () => {
  db.reset();

  const targetBookId = "bk_001"; // Toán 6 - Tập 1 (available 2026-10-01 to 2026-10-25)

  // 1. First borrower books from Oct 02 to Oct 06
  const loan1 = db.createLoan({
    bookId: targetBookId,
    borrowerAlias: "Học sinh A",
    startDate: "2026-10-02",
    endDate: "2026-10-06",
    notes: "Lượt mượn 1"
  });

  assert.strictEqual(loan1.status, "ĐÃ ĐẶT", "Lượt mượn 1 phải được đặt thành công");

  // 2. Second borrower attempts to book an overlapping range: Oct 04 to Oct 08 (overlaps Oct 04-06)
  assert.throws(
    () => {
      db.createLoan({
        bookId: targetBookId,
        borrowerAlias: "Học sinh B (Trùng lặp)",
        startDate: "2026-10-04",
        endDate: "2026-10-08",
        notes: "Cố tình đặt trùng"
      });
    },
    /bị trùng lặp với lượt mượn đã được đặt trước/i,
    "Hệ thống phải ném lỗi và từ chối khi khoảng ngày bị trùng lặp"
  );

  // 3. Third borrower attempts inside existing range: Oct 03 to Oct 05
  assert.throws(
    () => {
      db.createLoan({
        bookId: targetBookId,
        borrowerAlias: "Học sinh C (Bên trong)",
        startDate: "2026-10-03",
        endDate: "2026-10-05"
      });
    },
    /bị trùng lặp với lượt mượn đã được đặt trước/i,
    "Hệ thống phải từ chối khi khoảng ngày nằm hoàn toàn bên trong lịch đặt cũ"
  );

  // 4. Non-overlapping sequential booking: Oct 08 to Oct 12 SHOULD SUCCEED!
  // (Demonstrating sequential serving of multiple students with 1 book)
  const loan2 = db.createLoan({
    bookId: targetBookId,
    borrowerAlias: "Học sinh D (Nối tiếp hợp lệ)",
    startDate: "2026-10-08",
    endDate: "2026-10-12",
    notes: "Lượt mượn nối tiếp hợp lệ"
  });

  assert.ok(loan2.id, "Lượt mượn kế tiếp hợp lệ không trùng lịch phải được chấp thuận");
  assert.strictEqual(loan2.startDate, "2026-10-08");
});
