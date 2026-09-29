// client/src/components/BookingModal.jsx
import React, { useState } from "react";
import confetti from "canvas-confetti";
import { X, Calendar, MapPin, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { api } from "../api";

export default function BookingModal({ book, onClose, onSuccess }) {
  const [borrowerAlias, setBorrowerAlias] = useState("");
  const [startDate, setStartDate] = useState(
    book.availableRanges && book.availableRanges[0] ? book.availableRanges[0].startDate : "2026-10-02"
  );
  const [endDate, setEndDate] = useState(
    book.availableRanges && book.availableRanges[0] ? "2026-10-06" : "2026-10-06"
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!startDate || !endDate) {
      setErrorMsg("Vui lòng chọn khoảng ngày bắt đầu và kết thúc.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createLoan({
        bookId: book.id,
        borrowerAlias: borrowerAlias.trim() || "Học sinh đăng ký tại cổng",
        startDate,
        endDate,
        schoolId: book.schoolId,
        pickupPointName: book.pickupPointName,
        notes: notes.trim()
      });

      setSuccessData(res.data);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setErrorMsg(err.message || "Không thể đặt lịch mượn sách. Vui lòng kiểm tra lại thời gian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: "1.18rem", color: "var(--slate-900)" }}>
              {successData ? "Đặt Lịch Mượn Thành Công! 🎉" : "Đăng Ký Mượn Sách"}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--slate-500)", marginTop: 2 }}>
              Mã sách: <strong>{book.id}</strong> • {book.grade} - {book.subject}
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate-400)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {successData ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ 
                width: 64, 
                height: 64, 
                background: "#dcfce7", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                margin: "0 auto 16px" 
              }}>
                <CheckCircle size={36} color="#16a34a" />
              </div>
              <h4 style={{ fontSize: "1.2rem", color: "#166534" }}>Xác nhận lịch giữ sách thành công!</h4>
              <p style={{ fontSize: "0.9rem", color: "var(--slate-600)", margin: "8px 0 20px" }}>
                Cuốn <strong>{book.title}</strong> đã được xếp lịch cho bạn từ <strong>{successData.startDate}</strong> đến <strong>{successData.endDate}</strong>.
              </p>

              <div style={{ 
                background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)", 
                border: "2px dashed #f59e0b", 
                borderRadius: "var(--radius-md)", 
                padding: "16px",
                marginBottom: "20px"
              }}>
                <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "#b45309" }}>
                  Mã nhận sách tại Thư viện
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#b45309", letterSpacing: "2px", margin: "6px 0" }}>
                  {successData.checkinCode}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#92400e" }}>
                  Đưa mã này cho thầy/cô phụ trách tại điểm giao nhận để nhận sách.
                </div>
              </div>

              <div style={{ background: "var(--slate-50)", padding: 14, borderRadius: "var(--radius-sm)", textAlign: "left", fontSize: "0.84rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--slate-700)", marginBottom: 4 }}>
                  <MapPin size={15} color="#15803d" />
                  Điểm giao nhận chỉ định trong trường:
                </div>
                <div style={{ color: "var(--slate-900)", fontWeight: 700 }}>
                  {successData.pickupPointName}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--slate-500)", marginTop: 6 }}>
                  * Lưu ý: Vì lý do bảo vệ sự riêng tư của học sinh, việc giao nhận chỉ diễn ra tại các điểm do nhà trường quy định.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Book Info Summary */}
              <div style={{ background: "var(--slate-50)", padding: 14, borderRadius: "var(--radius-md)", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, color: "var(--slate-900)", fontSize: "0.96rem" }}>
                  {book.title}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--slate-600)", marginTop: 4 }}>
                  Bộ sách: <strong>{book.series}</strong> • Phiên bản: {book.edition}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--slate-600)", marginTop: 6 }}>
                  <MapPin size={14} color="#16a34a" />
                  <span>Điểm giao nhận: <strong>{book.pickupPointName}</strong></span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#15803d", marginTop: 4 }}>
                  Lịch người cho mượn có thể chia sẻ: {book.availableRanges && book.availableRanges.map(r => `${r.startDate} đến ${r.endDate}`).join(", ")}
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div style={{ 
                  background: "#fee2e2", 
                  border: "1px solid #fecaca", 
                  color: "#b91c1c", 
                  padding: "10px 14px", 
                  borderRadius: "var(--radius-sm)", 
                  fontSize: "0.85rem",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Input: Alias */}
              <div className="form-group">
                <label className="form-label">Tên gọi đại diện / Lớp (Không cần số điện thoại cá nhân)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ví dụ: Học sinh Tuấn (6A2) hoặc Phụ huynh bé Lan"
                  value={borrowerAlias}
                  onChange={(e) => setBorrowerAlias(e.target.value)}
                />
                <div className="form-help">
                  Boconic bảo mật danh tính: Học sinh khác không nhìn thấy số điện thoại hay địa chỉ nhà của bạn.
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Ngày cần bắt đầu</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày dự kiến hoàn trả</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Concurrency guarantee notice */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--slate-500)", background: "#f8fafc", padding: "8px 12px", borderRadius: 6 }}>
                <ShieldCheck size={16} color="#0284c7" />
                <span>Hệ thống tự động kiểm tra chống trùng lịch với các học sinh khác.</span>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {successData ? (
            <button className="btn btn-primary" onClick={onClose}>
              Đã hiểu & Đóng
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Hủy bỏ
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Đang xếp lịch..." : "Xác nhận mượn sách"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
