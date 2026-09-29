// client/src/pages/ExperimentSandboxPage.jsx
import React, { useState, useEffect } from "react";
import { Sparkles, BarChart2, CheckCircle2, TrendingUp, ShieldCheck, Scale, ArrowRight, RotateCcw } from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function ExperimentSandboxPage() {
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runSim();
  }, []);

  const runSim = async () => {
    setLoading(true);
    try {
      const res = await api.getSimulationComparison();
      setSimulation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fef3c7", color: "#92400e", fontSize: "0.8rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, marginBottom: 6 }}>
            <Scale size={14} />
            <span>NGHIÊN CỨU & THỰC NGHIỆM THUẬT TOÁN</span>
          </div>
          <h1 style={{ fontSize: "1.85rem", color: "var(--slate-900)" }}>
            Thực Nghiệm So Sánh: Ghép Công Bằng AI vs FIFO
          </h1>
          <p style={{ color: "var(--slate-600)", fontSize: "0.95rem" }}>
            Đánh giá hiệu quả giữa Thuật toán Tối ưu Đa mục tiêu Boconic và Quy tắc truyền thống "Ai đến trước nhận trước" (FIFO).
          </p>
        </div>

        <button className="btn btn-secondary" onClick={runSim} disabled={loading}>
          <RotateCcw size={15} />
          {loading ? "Đang tính toán..." : "Chạy lại mô phỏng"}
        </button>
      </div>

      <MascotCard 
        title="Góc nhìn Nghiên cứu từ Bơ 🥑"
        message="Trong điều kiện thiếu sách giáo khoa, quy tắc 'ai nhanh tay đăng ký trước thì lấy trước' (FIFO) sẽ vô tình đẩy các bạn không có điện thoại/máy tính chịu thiệt thòi khi sắp đến giờ kiểm tra. Thuật toán của Boconic giải quyết triệt để vấn đề này!"
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px", color: "var(--slate-500)" }}>
          Đang chạy mô phỏng thuật toán trên tập dữ liệu trường học...
        </div>
      ) : simulation ? (
        <div>
          {/* Comparison Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            
            {/* Card 1: FIFO */}
            <div className="card" style={{ borderTop: "4px solid #94a3b8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: "1.15rem", color: "var(--slate-700)" }}>
                  Quy tắc FIFO (Ai đến trước nhận trước)
                </h3>
                <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>Truyền thống</span>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--slate-500)", marginBottom: 18 }}>
                Xếp hàng theo thứ tự thời gian nộp đơn mà không quan tâm đến lịch học hay hoàn cảnh thiết bị.
              </p>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--slate-600)" }}>Có sách TRƯỚC GIỜ HỌC:</span>
                    <strong style={{ color: "#d97706" }}>{simulation.fifo.beforeClassRatePercent}%</strong>
                  </div>
                  <div style={{ background: "var(--slate-200)", height: 10, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${simulation.fifo.beforeClassRatePercent}%`, background: "#f59e0b", height: "100%" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--slate-600)" }}>Tỷ lệ đáp ứng HS KHÔNG có Internet:</span>
                    <strong style={{ color: "#dc2626" }}>{simulation.fifo.nonDigitalCoveragePercent}%</strong>
                  </div>
                  <div style={{ background: "var(--slate-200)", height: 10, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${simulation.fifo.nonDigitalCoveragePercent}%`, background: "#ef4444", height: "100%" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "var(--slate-50)", padding: 12, borderRadius: 8, fontSize: "0.82rem", marginTop: 6 }}>
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Thời gian chờ TB:</span>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--slate-800)" }}>{simulation.fifo.averageWaitHours} giờ</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate-500)" }}>Chênh lệch công bằng:</span>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#dc2626" }}>{simulation.fifo.equityGapPercent}% (Bất lợi)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Boconic Fair Scheduling */}
            <div className="card" style={{ borderTop: "4px solid #16a34a", boxShadow: "var(--shadow-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: "1.15rem", color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={18} color="#16a34a" />
                  Ghép Công Bằng Boconic
                </h3>
                <span className="badge badge-available">Tối ưu AI Đa mục tiêu</span>
              </div>
              <p style={{ fontSize: "0.84rem", color: "var(--slate-500)", marginBottom: 18 }}>
                Cân bằng đa mục tiêu: Ưu tiên giờ học khẩn cấp, bù đắp khoảng cách số và chống đói hàng đợi.
              </p>

              {/* Metrics */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--slate-600)" }}>Có sách TRƯỚC GIỜ HỌC:</span>
                    <strong style={{ color: "#15803d" }}>{simulation.fair.beforeClassRatePercent}% (Tối ưu)</strong>
                  </div>
                  <div style={{ background: "var(--slate-200)", height: 10, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${simulation.fair.beforeClassRatePercent}%`, background: "#16a34a", height: "100%" }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 4 }}>
                    <span style={{ color: "var(--slate-600)" }}>Tỷ lệ đáp ứng HS KHÔNG có Internet:</span>
                    <strong style={{ color: "#15803d" }}>{simulation.fair.nonDigitalCoveragePercent}%</strong>
                  </div>
                  <div style={{ background: "var(--slate-200)", height: 10, borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${simulation.fair.nonDigitalCoveragePercent}%`, background: "#22c55e", height: "100%" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 12, borderRadius: 8, fontSize: "0.82rem", marginTop: 6 }}>
                  <div>
                    <span style={{ color: "var(--slate-600)" }}>Thời gian chờ TB:</span>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#166534" }}>{simulation.fair.averageWaitHours} giờ</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--slate-600)" }}>Chênh lệch công bằng:</span>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#166534" }}>{simulation.fair.equityGapPercent}% (Cân bằng)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Research Insight Callout */}
          <div className="card" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1.5px solid #86efac", padding: 24, marginBottom: 32 }}>
            <h3 style={{ fontSize: "1.15rem", color: "#166534", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={20} />
              Kết Luận Thực Nghiệm Định Lượng
            </h3>
            <p style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--slate-700)" }}>
              {simulation.summaryImprovement.equityProtectionNote}
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.85rem", color: "#14532d", fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>Tăng tỷ lệ học sinh có sách trước giờ học lên <strong>+{simulation.summaryImprovement.beforeClassGainPercent}%</strong></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>100% học sinh không có thiết bị/internet được ưu tiên giải quyết trước</span>
              </div>
            </div>
          </div>

          {/* Mathematical Formulation Explanation */}
          <div className="card" style={{ padding: 26 }}>
            <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)", marginBottom: 14 }}>
              Hàm Mục Tiêu & Công Thức Tính Điểm Ưu Tiên (Explainable Formula)
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 16 }}>
              Thuật toán sử dụng phương pháp Chấm điểm Đa mục tiêu Tuyến tính có trọng số để mỗi quyết định ghép sách đều minh bạch, kiểm chứng được và tránh tình trạng "hộp đen":
            </p>

            <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "16px 20px", borderRadius: 10, fontFamily: "monospace", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 16 }}>
              Score(req, book) = 0.35 &times; Urgency(req) + 0.30 &times; Equity(req) + 0.20 &times; WaitTime(req) + 0.15 &times; DateFit(req, book)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: "0.82rem" }}>
              <div style={{ background: "var(--slate-50)", padding: 12, borderRadius: 8 }}>
                <strong>Urgency (35%):</strong>
                <p style={{ color: "var(--slate-600)", marginTop: 2 }}>Khoảng cách ngày tới tiết học thực tế trong thời khóa biểu.</p>
              </div>
              <div style={{ background: "var(--slate-50)", padding: 12, borderRadius: 8 }}>
                <strong>Equity (30%):</strong>
                <p style={{ color: "var(--slate-600)", marginTop: 2 }}>Trọng số bù đắp cho học sinh không có máy tính/internet ở nhà.</p>
              </div>
              <div style={{ background: "var(--slate-50)", padding: 12, borderRadius: 8 }}>
                <strong>Wait Time (20%):</strong>
                <p style={{ color: "var(--slate-600)", marginTop: 2 }}>Chuẩn hóa số giờ chờ đợi để tránh hiện tượng bỏ quên đơn cũ (starvation).</p>
              </div>
              <div style={{ background: "var(--slate-50)", padding: 12, borderRadius: 8 }}>
                <strong>Date Fit (15%):</strong>
                <p style={{ color: "var(--slate-600)", marginTop: 2 }}>Độ khớp với khoảng ngày người cho mượn có thể chia sẻ.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
