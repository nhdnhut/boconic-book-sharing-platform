// client/src/pages/LoansHistoryPage.jsx
import React, { useState, useEffect } from "react";
import { Clock, MapPin, CheckCircle, AlertTriangle, XCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function LoansHistoryPage() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    loadLoans();
  }, [filterStatus]);

  const loadLoans = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await api.getLoans(params);
      setLoans(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLoan = async (loanId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đặt lịch mượn sách này để nhường cho bạn khác?")) {
      return;
    }
    try {
      await api.transitionLoan(loanId, "CANCEL", "Học sinh tự hủy trên ứng dụng");
      setActionMsg("Đã hủy lịch mượn thành công. Cuốn sách đã được mở lại cho các bạn khác!");
      loadLoans();
    } catch (err) {
      alert(err.message);
    }
  };

  const getLoanBadge = (status) => {
    switch (status) {
      case "ĐÃ ĐẶT":
        return <span className="badge badge-reserved">ĐÃ ĐẶT LỊCH (CHỜ NHẬN)</span>;
      case "ĐANG MƯỢN":
        return <span className="badge badge-borrowed">ĐANG MƯỢN HỌC</span>;
      case "ĐÃ TRẢ":
        return <span className="badge badge-returned">ĐÃ HOÀN TRẢ ĐỦ</span>;
      case "QUÁ HẠN":
        return <span className="badge badge-overdue">QUÁ HẠN TRẢ</span>;
      case "ĐÃ HỦY":
        return <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>ĐÃ HỦY</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Lịch Sử & Trạng Thái Mượn Sách</h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
          Theo dõi tiến trình mượn trả, kiểm tra mã nhận sách và ngày hẹn hoàn trả tại trường.
        </p>
      </div>

      <MascotCard 
        title="Lưu ý khi đến nhận và trả sách 🥑"
        message="Khi đến Thư viện hoặc bàn điều phối trong trường, bạn chỉ cần đọc mã đối chiếu (BC-xxxx) là có thể nhận sách ngay mà không cần xuất trình giấy tờ cá nhân rườm rà!"
      />

      {actionMsg && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", color: "#166534", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}>
          {actionMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "", label: "Tất cả các lượt" },
          { id: "ĐÃ ĐẶT", label: "Đã đặt (Chờ nhận)" },
          { id: "ĐANG MƯỢN", label: "Đang mượn học" },
          { id: "ĐÃ TRẢ", label: "Đã trả xong" },
          { id: "QUÁ HẠN", label: "Quá hạn" }
        ].map(tab => (
          <button
            key={tab.id}
            className={`btn btn-sm ${filterStatus === tab.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--slate-500)" }}>
          Đang tải dữ liệu mượn trả...
        </div>
      ) : loans.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--slate-500)" }}>Chưa có lượt mượn nào trong mục này.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loans.map(loan => (
            <div key={loan.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--slate-500)", fontWeight: 600 }}>
                    Mã lượt mượn: {loan.id}
                  </div>
                  <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)", marginTop: 2 }}>
                    {loan.bookTitle}
                  </h3>
                  <div style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginTop: 2 }}>
                    Người mượn: <strong>{loan.borrowerAlias}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {getLoanBadge(loan.status)}

                  {/* QR / Token Code */}
                  <div style={{ 
                    background: "#fef3c7", 
                    border: "1px solid #fde68a", 
                    padding: "4px 10px", 
                    borderRadius: 6,
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    color: "#b45309",
                    letterSpacing: "1px"
                  }}>
                    MÃ: {loan.checkinCode}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, background: "var(--slate-50)", padding: 14, borderRadius: "var(--radius-md)", fontSize: "0.85rem" }}>
                <div>
                  <div style={{ color: "var(--slate-500)", fontSize: "0.78rem" }}>Thời gian mượn:</div>
                  <div style={{ fontWeight: 600, color: "var(--slate-800)", marginTop: 2 }}>
                    {loan.startDate} &rarr; {loan.endDate}
                  </div>
                </div>

                <div>
                  <div style={{ color: "var(--slate-500)", fontSize: "0.78rem" }}>Điểm bàn giao trong trường:</div>
                  <div style={{ fontWeight: 600, color: "var(--slate-800)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} color="#15803d" />
                    <span>{loan.pickupPointName}</span>
                  </div>
                </div>

                <div>
                  <div style={{ color: "var(--slate-500)", fontSize: "0.78rem" }}>Nhật ký trạng thái:</div>
                  <div style={{ color: "var(--slate-700)", marginTop: 2 }}>
                    {loan.notes || "Không có ghi chú"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              {loan.status === "ĐÃ ĐẶT" && (
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ color: "#dc2626", borderColor: "#fecaca" }}
                    onClick={() => handleCancelLoan(loan.id)}
                  >
                    <XCircle size={14} />
                    Hủy đặt sách này (để nhường bạn khác)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
