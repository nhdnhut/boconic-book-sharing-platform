// client/src/pages/CoordinatorDashboardPage.jsx
import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  Sliders, 
  CheckCircle, 
  RotateCcw, 
  AlertTriangle, 
  Sparkles, 
  TrendingDown, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  ArrowRight,
  Filter
} from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function CoordinatorDashboardPage({ setActiveTab }) {
  const [activeSubTab, setActiveSubTab] = useState("matching"); // "matching" | "loans" | "forecast" | "riskQueue"
  const [fairSchedules, setFairSchedules] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [riskQueue, setRiskQueue] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    loadAllCoordinatorData();
  }, []);

  const loadAllCoordinatorData = async () => {
    setLoading(true);
    try {
      const [schedRes, foreRes, riskRes, loansRes] = await Promise.all([
        api.getFairSchedules(),
        api.getShortageForecast(),
        api.getRiskQueue(),
        api.getLoans()
      ]);
      setFairSchedules(schedRes.data || []);
      setForecastData(foreRes.data || null);
      setRiskQueue(riskRes.data || []);
      setLoans(loansRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. One-click execute match
  const handleExecuteMatch = async (item) => {
    if (!item.recommendedBook) {
      alert("Chưa có sách phù hợp để ghép cho học sinh này.");
      return;
    }

    try {
      const dates = item.dateWindow.split(" -> ");
      const res = await api.executeMatch({
        requestId: item.requestId,
        bookId: item.recommendedBook.id,
        startDate: dates[0].trim(),
        endDate: dates[1].trim()
      });

      confetti({ particleCount: 70, spread: 60 });
      setActionNotice(res.message);
      loadAllCoordinatorData();
    } catch (err) {
      alert(err.message || "Lỗi ghép sách.");
    }
  };

  // 2. Transition loan
  const handleLoanTransition = async (loanId, action) => {
    try {
      const res = await api.transitionLoan(loanId, action, "Điều phối viên xử lý tại bàn thư viện");
      setActionNotice(res.message);
      loadAllCoordinatorData();
    } catch (err) {
      alert(err.message || "Lỗi cập nhật trạng thái.");
    }
  };

  // 3. Resolve risk item
  const handleResolveRisk = async (id, action) => {
    try {
      const res = await api.resolveRiskItem(id, action, "Quản trị viên đã kiểm tra tính pháp lý");
      setActionNotice(res.message);
      loadAllCoordinatorData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, background: "#fdf4ff", color: "#86198f", padding: "3px 10px", borderRadius: 4, border: "1px solid #f5d0fe" }}>
            DÀNH CHO THƯ VIỆN & ĐIỀU PHỐI VIÊN TRƯỜNG
          </span>
        </div>
        <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Bàn Điều Phối & Quản Lý Sách Học Đường</h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem" }}>
          Tối ưu hóa luân chuyển sách, duyệt ghép công bằng, xử lý giao nhận và quản lý hàng đợi cảnh báo rủi ro bản quyền.
        </p>
      </div>

      <MascotCard 
        title="Trợ lý Bơ cho Điều phối viên 🥑"
        message="Hệ thống tự động chấm điểm độ khẩn cấp (ngày có tiết học) và tính công bằng (học sinh không có internet ở nhà). Thầy cô có thể duyệt ghép chỉ với 1 click!"
      />

      {actionNotice && (
        <div style={{ background: "#dcfce7", border: "1.5px solid #86efac", color: "#166534", padding: "12px 18px", borderRadius: 8, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice("")} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#166534" }}>✕</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "2px solid var(--slate-200)", paddingBottom: 12, marginBottom: 24, overflowX: "auto" }}>
        {[
          { id: "matching", label: `Đề xuất Ghép Công bằng (${fairSchedules.length})`, icon: Sparkles },
          { id: "loans", label: `Giao nhận & Mượn trả (${loans.length})`, icon: Clock },
          { id: "forecast", label: `Dự báo Thiếu sách (${forecastData?.forecasts?.length || 0})`, icon: TrendingDown },
          { id: "riskQueue", label: `Cảnh báo Rủi ro (${riskQueue.length})`, icon: ShieldAlert }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
              style={{ borderRadius: "var(--radius-full)" }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px", color: "var(--slate-500)" }}>
          Đang tải dữ liệu điều phối...
        </div>
      ) : (
        <>
          {/* TAB 1: FAIR SCHEDULING RECOMMENDATIONS */}
          {activeSubTab === "matching" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)" }}>
                  Danh Sách Đề Xuất Ghép Lịch Tối Ưu Có Thể Giải Thích
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginTop: 2 }}>
                  Điểm ưu tiên = <strong>35% Khẩn cấp</strong> (tiết học gần) + <strong>30% Công bằng</strong> (không có internet) + <strong>20% Thời gian chờ</strong> + <strong>15% Độ khớp lịch</strong>.
                </p>
              </div>

              {fairSchedules.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 32 }}>
                  Hiện không có yêu cầu nào đang chờ ghép.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {fairSchedules.map((item, idx) => {
                    const isMatched = item.recommendedBook !== null;
                    const isHighPriority = item.priorityScore >= 0.70;

                    return (
                      <div 
                        key={idx} 
                        className="card"
                        style={{ 
                          borderLeft: `5px solid ${isHighPriority ? "#16a34a" : "#f59e0b"}`,
                          padding: 20 
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ 
                                background: isHighPriority ? "#dcfce7" : "#fef3c7", 
                                color: isHighPriority ? "#14532d" : "#92400e",
                                fontWeight: 800,
                                fontSize: "0.85rem",
                                padding: "2px 10px",
                                borderRadius: 6
                              }}>
                                ĐIỂM ƯU TIÊN: {(item.priorityScore * 100).toFixed(0)}/100
                              </span>
                              <span style={{ fontSize: "0.82rem", color: "var(--slate-500)", fontWeight: 600 }}>
                                #{item.requestId} • {item.grade} - {item.subject} ({item.series})
                              </span>
                            </div>
                            <h4 style={{ fontSize: "1.15rem", color: "var(--slate-900)", marginTop: 6 }}>
                              Học sinh: {item.studentAlias}
                            </h4>
                          </div>

                          {isMatched ? (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleExecuteMatch(item)}
                            >
                              <CheckCircle size={14} />
                              Xác nhận duyệt ghép ngay &rarr;
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "#b91c1c", fontWeight: 700, background: "#fee2e2", padding: "4px 10px", borderRadius: 6 }}>
                              ⚠️ Chưa có sách trống lịch phù hợp
                            </span>
                          )}
                        </div>

                        {/* Explainable factors */}
                        <div style={{ background: "var(--slate-50)", padding: 12, borderRadius: 8, marginBottom: 12, fontSize: "0.82rem" }}>
                          <div style={{ fontWeight: 700, color: "var(--slate-700)", marginBottom: 4 }}>
                            Giải trình thuật toán AI (Explainable Factors):
                          </div>
                          <ul style={{ paddingLeft: 18, color: "var(--slate-600)", lineHeight: 1.5 }}>
                            {item.reasons.map((r, rIdx) => (
                              <li key={rIdx}>{r}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Matched book preview */}
                        {isMatched ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 8, fontSize: "0.84rem" }}>
                            <div>
                              <span style={{ color: "#14532d", fontWeight: 700 }}>Sách đề xuất ghép: </span>
                              <strong style={{ color: "var(--slate-900)" }}>{item.recommendedBook.title}</strong>
                              <span style={{ color: "var(--slate-500)", marginLeft: 6 }}>({item.recommendedBook.condition})</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#15803d", fontWeight: 600 }}>
                              <MapPin size={13} />
                              <span>{item.recommendedBook.pickupPointName}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.82rem", color: "#b45309", background: "#fffbeb", padding: "8px 12px", borderRadius: 6 }}>
                            Đã tự động gửi thông báo đến mô đun Dự báo thiếu sách để vận động quyên góp bổ sung.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOANS MANAGEMENT & PICKUP/RETURN */}
          {activeSubTab === "loans" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)" }}>
                  Quản Lý Giao Nhận & Trạng Thái Mượn Trả
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginTop: 2 }}>
                  Xác nhận học sinh nhận sách tại điểm hẹn trong trường, hoàn trả sách hoặc xử lý quá hạn.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {loans.map(loan => (
                  <div key={loan.id} className="card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "var(--slate-500)" }}>
                          {loan.id} • Mã đối chiếu: <strong style={{ color: "#b45309" }}>{loan.checkinCode}</strong>
                        </div>
                        <h4 style={{ fontSize: "1.1rem", color: "var(--slate-900)", marginTop: 2 }}>
                          {loan.bookTitle} &mdash; <span style={{ color: "#166534" }}>{loan.borrowerAlias}</span>
                        </h4>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge badge-reserved">{loan.status}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.84rem", color: "var(--slate-600)", marginBottom: 12 }}>
                      Thời hạn: <strong>{loan.startDate} &rarr; {loan.endDate}</strong> | Điểm giao nhận: <strong>{loan.pickupPointName}</strong>
                    </div>

                    {/* Operational Actions */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid var(--slate-100)" }}>
                      {loan.status === "ĐÃ ĐẶT" && (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleLoanTransition(loan.id, "PICKUP")}
                        >
                          <CheckCircle size={14} />
                          Xác nhận HS đã nhận sách (Chuyển sang ĐANG MƯỢN)
                        </button>
                      )}

                      {(loan.status === "ĐANG MƯỢN" || loan.status === "QUÁ HẠN") && (
                        <button 
                          className="btn btn-amber btn-sm"
                          onClick={() => handleLoanTransition(loan.id, "RETURN")}
                        >
                          <RotateCcw size={14} />
                          Xác nhận HS đã trả sách (Sách quay lại SẴN CÓ)
                        </button>
                      )}

                      {loan.status === "ĐANG MƯỢN" && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#dc2626", borderColor: "#fecaca" }}
                          onClick={() => handleLoanTransition(loan.id, "OVERDUE")}
                        >
                          <AlertTriangle size={14} />
                          Báo quá hạn trả
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TEXTBOOK SHORTAGE FORECAST */}
          {activeSubTab === "forecast" && forecastData && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)" }}>
                  Dự Báo Thiếu Sách Giáo Khoa 7–14 Ngày Tới
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginTop: 2 }}>
                  Mô hình ước tính dựa trên tỷ lệ nhu cầu chưa đáp ứng, số sách hiện có và lịch học thực tế.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                {forecastData.forecasts.map(fc => (
                  <div key={fc.id} className="card" style={{ borderLeft: `5px solid ${fc.badgeColor === 'red' ? '#dc2626' : (fc.badgeColor === 'orange' ? '#f59e0b' : '#16a34a')}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", color: "var(--slate-500)", fontWeight: 600 }}>
                          {fc.schoolName}
                        </div>
                        <h4 style={{ fontSize: "1.15rem", color: "var(--slate-900)", marginTop: 2 }}>
                          {fc.grade} &mdash; {fc.subject}
                        </h4>
                        <div style={{ fontSize: "0.82rem", color: "var(--slate-600)" }}>
                          Bộ: {fc.series}
                        </div>
                      </div>

                      <span className={`badge ${fc.badgeColor === 'red' ? 'badge-risk-high' : (fc.badgeColor === 'orange' ? 'badge-risk-medium' : 'badge-risk-low')}`}>
                        NGUY CƠ: {fc.riskLevel}
                      </span>
                    </div>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: "var(--slate-50)", padding: 10, borderRadius: 8, textAlign: "center", margin: "12px 0", fontSize: "0.82rem" }}>
                      <div>
                        <div style={{ color: "var(--slate-500)" }}>Sẵn có</div>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#166534" }}>{fc.availableSupply}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--slate-500)" }}>Đang chờ</div>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#b45309" }}>{fc.pendingDemand}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--slate-500)" }}>Dự báo thiếu</div>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#b91c1c" }}>{fc.projectedDeficit}</div>
                      </div>
                    </div>

                    {/* Actionable recommendations */}
                    <div style={{ fontSize: "0.8rem", color: "var(--slate-700)" }}>
                      <strong>Khuyến nghị xử lý:</strong>
                      <ul style={{ paddingLeft: 16, marginTop: 4, lineHeight: 1.5 }}>
                        {fc.recommendations.map((rec, rIdx) => (
                          <li key={rIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div style={{ marginTop: 20, background: "#f8fafc", border: "1px solid var(--slate-200)", padding: 14, borderRadius: 8, fontSize: "0.78rem", color: "var(--slate-500)" }}>
                <strong>Ghi chú giới hạn kỹ thuật:</strong> {forecastData.forecasts[0]?.modelMetadata?.limitations}
              </div>
            </div>
          )}

          {/* TAB 4: RISK & COPYRIGHT AUDIT QUEUE */}
          {activeSubTab === "riskQueue" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)" }}>
                  Hàng Đợi Cảnh Báo Rủi Ro Bản Quyền & Tệp Đã Chặn
                </h3>
                <p style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginTop: 2 }}>
                  Theo dõi các nỗ lực tải tệp PDF/ảnh scan bị chặn tự động và phê duyệt liên kết ngoài đáng ngờ.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {riskQueue.map(item => (
                  <div key={item.id} className="card" style={{ padding: 18, borderLeft: "5px solid #dc2626" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 4 }}>
                          {item.type}
                        </span>
                        <h4 style={{ fontSize: "1.05rem", color: "var(--slate-900)", marginTop: 4 }}>
                          Mục tiêu bị gắn cờ: <code>{item.target}</code>
                        </h4>
                      </div>

                      <span className="badge" style={{ background: item.status === "CHẶN TỰ ĐỘNG" ? "#fee2e2" : "#fef3c7", color: item.status === "CHẶN TỰ ĐỘNG" ? "#991b1b" : "#92400e" }}>
                        {item.status}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.85rem", color: "var(--slate-700)", lineHeight: 1.5, marginBottom: 10 }}>
                      <strong>Lý do gắn cờ:</strong> {item.flagReason}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--slate-500)", borderTop: "1px solid var(--slate-100)", paddingTop: 10 }}>
                      <div>
                        Độ tin cậy AI: <strong>{(item.aiConfidence * 100).toFixed(0)}%</strong> • Người gửi: {item.submittedBy}
                      </div>

                      {item.status === "ĐANG CHỜ DUYỆT" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleResolveRisk(item.id, "ĐÃ TỪ CHỐI")}>
                            Từ chối vi phạm
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleResolveRisk(item.id, "CHẤP THUẬN")}>
                            Xác thực an toàn
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
