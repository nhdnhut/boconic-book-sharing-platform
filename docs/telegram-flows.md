# Boconic — Telegram Bot Flows & UX Specification

**Version:** 2.0  
**Date:** 01/10/2026

## 1. UX Principles & Tone
- **Language:** Idiomatic, respectful, warm Vietnamese ("Chào bạn! Boconic sẵn sàng kết nối bạn với nguồn sách phù hợp.").
- **Navigation:** Clear breadcrumbs, one question per step, explicit "Quay lại" (Back) and "Hủy bỏ" (Cancel) on every prompt.
- **Privacy:** Private chat by default for all operations. Group chats only allow catalog search and deep-link buttons back to private chat.
- **Data Limits:** Telegram inline button `callback_data` is strictly limited to 64 bytes. State identifiers use compact prefixes (e.g., `req:acc:<short_id>`).

## 2. Command Set & Main Menu

```
/start     - Chào mừng, đăng ký tài khoản và mở menu chính
/help      - Hướng dẫn mượn sách, cho mượn và bảo mật
/search    - Tìm kiếm sách theo tên, tác giả, ISBN, lớp, môn
/addbook   - Đăng sách của bạn để cho cộng đồng mượn
/mybooks   - Danh sách các bản sách bạn đang sở hữu
/loans     - Xem các sách bạn đang mượn (tiến độ, hạn trả)
/requests  - Yêu cầu mượn bạn đã gửi hoặc đang nhận được
/need      - Đăng nhu cầu tìm sách khi chưa có bản phù hợp
/nearby    - Xem sách đang có sẵn quanh khu vực của bạn
/library   - Danh mục thư viện và trường học đối tác
/resources - Tài nguyên số và học liệu mở đã kiểm duyệt
/profile   - Cập nhật biệt danh, khu vực và quyền riêng tư
/settings  - Cài đặt thông báo và nhận tin
/report    - Báo cáo sự cố hoặc vi phạm
/block     - Chặn người dùng làm phiền
/cancel    - Hủy thao tác nhập liệu hiện tại
```

### Main Menu Grid (Reply Keyboard / Persistent Menu)
```
[ 🔎 Tìm sách ]      [ 📖 Sách của tôi ]
[ 🤝 Đang mượn ]     [ 📤 Đang cho mượn ]
[ 📢 Tôi đang cần ]  [ 📍 Gần tôi ]
[ 🏛 Thư viện ]      [ 🔗 Tài nguyên mở ]
[ 👤 Hồ sơ & Cài đặt ]
```

## 3. Interactive User Journeys

### Flow A: Tìm kiếm và Yêu cầu Mượn (Borrow Journey)
1. User clicks `🔎 Tìm sách` or sends `/search`.
2. Bot asks: "Nhập tên sách, tác giả, môn học hoặc mã ISBN:".
3. User enters query (e.g. "Toán 12").
4. Bot queries internal API, formats results with pagination (3 books per page):
   - Title, edition, authors, grade level.
   - Available copies count, coarse location (e.g. "Quận 10, TP.HCM").
5. User clicks `[ Chi tiết & Mượn ]`.
6. Bot lists available copies with condition (`Mới`, `Tốt`, `Khá`), owner alias (`User #3A9B`), and max loan days.
7. User selects a copy -> Clicks `[ Gửi yêu cầu mượn ]`.
8. Bot asks for proposed duration (e.g. 7, 14, 30 days) and brief note.
9. Backend creates `BorrowRequest` (status: `pending`).
10. Owner receives real-time notification with `[ Chấp nhận ]` and `[ Từ chối ]` buttons.

### Flow B: Handover & Return Dual-Handshake
1. **Acceptance:** Owner clicks `[ Chấp nhận ]`. Loan state becomes `reserved`. Both receive chat deep link / coordinated meeting area.
2. **Handover:**
   - Lender meets borrower, clicks `[ Đã giao sách cho người mượn ]`.
   - Borrower clicks `[ Đã nhận được sách ]`.
   - Backend registers both confirmations -> Loan becomes `active`. Countdown starts from actual handover time!
3. **Return:**
   - Either party clicks `[ Yêu cầu hoàn trả ]` -> State becomes `return_pending`.
   - Both meet, check book condition, click `[ Đã nhận lại sách ]` / `[ Đã trả sách ]`.
   - Backend registers both confirmations -> Loan becomes `returned`.
   - Copy circulation status reverts to `available`. Trust metric incremented once.
