// client/src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  HelpCircle, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  Sparkles, 
  ExternalLink 
} from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function HomePage({ setActiveTab }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await api.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error("Lỗi tải metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)",
        borderRadius: "var(--radius-lg)",
        padding: "44px 36px",
        color: "white",
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
        marginBottom: "32px"
      }}>
        <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 8, 
              background: "rgba(255, 255, 255, 0.16)", 
              padding: "6px 14px", 
              borderRadius: "var(--radius-full)", 
              fontSize: "0.84rem",
              fontWeight: 600,
              marginBottom: 16,
              backdropFilter: "blur(6px)"
            }}>
              <Sparkles size={15} color="#fef08a" />
              <span>Giải pháp chuyển tiếp học đường • Năm học 2026–2027</span>
            </div>

            <h1 style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1.2, color: "white", marginBottom: 14 }}>
              Không để học sinh gián đoạn học tập vì thiếu sách giáo khoa
            </h1>

            <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "#dcfce7", maxWidth: "680px", marginBottom: 26 }}>
              Boconic kết nối sách in hợp pháp giữa các gia đình trong cùng trường học, lập lịch để <strong>1 cuốn sách phục vụ tuần tự nhiều học sinh</strong>, đồng thời dẫn link học liệu số chính thức từ Nhà xuất bản Giáo dục Việt Nam.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <button 
                className="btn btn-amber"
                onClick={() => setActiveTab("search")}
                style={{ fontSize: "0.98rem", padding: "12px 24px" }}
              >
                <BookOpen size={18} />
                Tìm sách đang có sẵn
              </button>
              <button 
                className="btn" 
                onClick={() => setActiveTab("lend")}
                style={{ background: "rgba(255,255,255,0.92)", color: "#14532d", fontSize: "0.98rem", padding: "12px 24px" }}
              >
                <PlusCircle size={18} />
                Đăng cho mượn sách
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab("request")}
                style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.4)" }}
              >
                <HelpCircle size={18} />
                Đăng ký cần mượn sách
              </button>
            </div>
          </div>

          {/* Mascot Showcase */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ 
              position: "relative",
              background: "white", 
              padding: 8, 
              borderRadius: "50%", 
              boxShadow: "0 12px 32px rgba(0,0,0,0.25)" 
            }}>
              <img 
                src="/mascot_bo.jpg" 
                alt="Linh vật Bơ Boconic" 
                style={{ width: "160px", height: "160px", borderRadius: "50%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute",
                bottom: 0,
                right: 4,
                background: "#f59e0b",
                color: "white",
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: "var(--radius-full)",
                border: "2px solid white"
              }}>
                Bơ 🥑
              </div>
            </div>
            <span style={{ fontSize: "0.82rem", color: "#bbf7d0", marginTop: 10, fontWeight: 600 }}>
              Linh vật Bạn Bơ tri thức
            </span>
          </div>
        </div>
      </section>

      {/* Mascot Tip */}
      <MascotCard 
        title="Bơ mách nhỏ cùng bạn 🥑"
        message="Boconic không thu phí, không chia sẻ file sách lậu. Mỗi cuốn sách bạn cho mượn tại tủ sách thư viện trường sẽ giúp ít nhất 2 đến 3 bạn cùng khối kịp học bài trước khi có sách mới!"
        actionText="Xem quy tắc bản quyền & bảo mật"
        onAction={() => setActiveTab("rules")}
      />

      {/* Live Metrics Grid */}
      <h2 style={{ fontSize: "1.3rem", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <TrendingUp size={20} color="var(--primary-700)" />
        Chỉ số Sách & Nhu cầu thời gian thực
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 36 }}>
        {/* Metric 1 */}
        <div className="card" style={{ borderLeft: "4px solid #16a34a" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--slate-500)" }}>
            Sách đang sẵn sàng
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#166534", margin: "6px 0" }}>
            {loading ? "..." : metrics?.availableBooks || 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-600)" }}>
            Sách in tại các tủ sách trường
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--slate-500)" }}>
            Nhu cầu đang chờ sách
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#b45309", margin: "6px 0" }}>
            {loading ? "..." : metrics?.waitingRequests || 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-600)" }}>
            Học sinh trong danh sách chờ ghép
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ borderLeft: "4px solid #7c3aed" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--slate-500)" }}>
            Đang được mượn học
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#7c3aed", margin: "6px 0" }}>
            {loading ? "..." : metrics?.borrowedBooks || 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-600)" }}>
            Lượt sách đang luân chuyển
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ borderLeft: "4px solid #0284c7" }}>
          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--slate-500)" }}>
            Học liệu số chính thức
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0284c7", margin: "6px 0" }}>
            {loading ? "..." : metrics?.verifiedMaterials || 0}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--slate-600)" }}>
            Nguồn NXB GDVN & Bộ GD&ĐT
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 40 }}>
        
        {/* Box 1: Ghép công bằng */}
        <div className="card">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Sparkles size={22} color="#15803d" />
          </div>
          <h3 style={{ fontSize: "1.12rem", marginBottom: 8 }}>Ghép và lập lịch mượn công bằng</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 16 }}>
            Thuật toán tối ưu có thể giải thích (Explainable Multi-Objective Optimization): Ưu tiên học sinh có tiết học gấp và không có internet ở nhà, giảm thiểu thời gian chờ đợi thay vì chỉ dựa vào ai đăng ký trước.
          </p>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab("sandbox")}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span>Xem so sánh thực nghiệm AI vs FIFO</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Box 2: Ranh giới bản quyền */}
        <div className="card">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <ShieldCheck size={22} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: "1.12rem", marginBottom: 8 }}>Bảo vệ bản quyền & Riêng tư trẻ em</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 16 }}>
            Không thu thập hay ghép file quét 10%. Không lưu trữ PDF. Toàn bộ học liệu ngoài được mở trực tiếp tại trang web nhà xuất bản. Học sinh chỉ giao nhận tại điểm chỉ định của trường, bảo mật thông tin riêng.
          </p>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab("rules")}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span>Tìm hiểu các giới hạn pháp lý</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Box 3: Bàn điều phối thư viện */}
        <div className="card">
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Users size={22} color="#86198f" />
          </div>
          <h3 style={{ fontSize: "1.12rem", marginBottom: 8 }}>Bàn Điều phối & Thư viện trường</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 16 }}>
            Thầy cô thư viện và cán bộ Đoàn Đội xác nhận nhận/trả sách, xem dự báo các môn có nguy cơ thiếu trong tuần tới để chủ động vận động phụ huynh và điều chuyển hợp lý.
          </p>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab("coordinator")}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <span>Truy cập Bảng điều phối thư viện</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
}
