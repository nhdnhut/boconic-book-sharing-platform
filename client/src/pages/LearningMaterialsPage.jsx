// client/src/pages/LearningMaterialsPage.jsx
import React, { useState, useEffect } from "react";
import { Search, ExternalLink, ShieldCheck, Sparkles, Plus, CheckCircle, AlertTriangle, BookOpen } from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function LearningMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIntent, setSearchIntent] = useState(null);

  // Propose Material Modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeUrl, setProposeUrl] = useState("");
  const [proposeProvider, setProposeProvider] = useState("");
  const [proposeDesc, setProposeDesc] = useState("");
  const [proposeGrade, setProposeGrade] = useState("Lớp 6");
  const [proposeSubject, setProposeSubject] = useState("Toán");
  const [modalFeedback, setModalFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async (query = "") => {
    setLoading(true);
    try {
      const params = {};
      if (query.trim()) params.q = query.trim();
      const res = await api.getMaterials(params);
      setMaterials(res.data);
      setSearchIntent(res.intent || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMaterials(searchQuery);
  };

  const handleQuickQuery = (q) => {
    setSearchQuery(q);
    loadMaterials(q);
  };

  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    setModalFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await api.addMaterial({
        title: proposeTitle,
        officialUrl: proposeUrl,
        provider: proposeProvider,
        description: proposeDesc,
        grade: proposeGrade,
        subject: proposeSubject,
        accessType: "Học liệu mở được đề xuất"
      });

      setModalFeedback({
        type: res.pendingReview ? "warning" : "success",
        message: res.message
      });

      if (!res.pendingReview) {
        loadMaterials();
      }
    } catch (err) {
      setModalFeedback({
        type: "error",
        message: err.message || "Không thể đề xuất liên kết này."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Kho Liên Kết Học Liệu Xuất Bản Chính Thức</h1>
          <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
            Tổng hợp và dẫn liên kết đến các cổng sách điện tử, tập huấn và tài liệu giáo khoa từ Nhà xuất bản và Cơ quan Giáo dục.
          </p>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => setShowProposeModal(true)}
        >
          <Plus size={16} />
          Đề xuất liên kết học liệu
        </button>
      </div>

      <MascotCard 
        title="Ranh giới học liệu mở Boconic 🥑"
        message="Boconic không sao chép, không lưu trữ tệp PDF trên máy chủ. Mọi liên kết sẽ mở trực tiếp tại trang web chính thức của Nhà xuất bản Giáo dục Việt Nam (taphuan.nxbgd.vn) hoặc cơ quan tác quyền."
      />

      {/* Natural Language Search Bar */}
      <div className="card" style={{ marginBottom: 28, padding: 22, background: "white" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: 14, color: "var(--slate-400)" }} />
            <input 
              type="text" 
              className="form-control"
              style={{ paddingLeft: 42, fontSize: "0.98rem" }}
              placeholder="Tìm kiếm bằng ngôn ngữ tự nhiên, ví dụ: 'tuần sau tôi học phân số lớp 6' hoặc 'video khtn cánh diều'..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "0 24px" }}>
            <Sparkles size={16} />
            Tìm thông minh
          </button>
        </form>

        {/* Query Suggestions */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "0.82rem" }}>
          <span style={{ color: "var(--slate-500)", fontWeight: 600 }}>Gợi ý mẫu:</span>
          {[
            "tuần sau tôi học phân số lớp 6",
            "thông báo năm học 2026-2027",
            "khoa học tự nhiên cánh diều",
            "tiếng anh 7 kết nối tri thức"
          ].map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickQuery(sample)}
              style={{
                background: "var(--slate-100)",
                border: "1px solid var(--slate-200)",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                color: "var(--slate-700)",
                cursor: "pointer",
                fontSize: "0.8rem"
              }}
            >
              {sample}
            </button>
          ))}
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => { setSearchQuery(""); loadMaterials(""); }}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", marginLeft: 8 }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>

        {/* Intent extraction breakdown */}
        {searchIntent && (
          <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: 8, fontSize: "0.82rem" }}>
            <span style={{ fontWeight: 700, color: "#166534" }}>Phân tích ý định tìm kiếm AI:</span>
            {searchIntent.detectedGrade && <span style={{ marginLeft: 8, background: "#dcfce7", padding: "2px 8px", borderRadius: 4, color: "#14532d" }}>Khối: {searchIntent.detectedGrade}</span>}
            {searchIntent.detectedSubject && <span style={{ marginLeft: 6, background: "#dcfce7", padding: "2px 8px", borderRadius: 4, color: "#14532d" }}>Môn: {searchIntent.detectedSubject}</span>}
            {searchIntent.detectedSeries && <span style={{ marginLeft: 6, background: "#dcfce7", padding: "2px 8px", borderRadius: 4, color: "#14532d" }}>Bộ: {searchIntent.detectedSeries}</span>}
            {searchIntent.topicKeywords && searchIntent.topicKeywords.length > 0 && (
              <span style={{ marginLeft: 6, background: "#fef3c7", padding: "2px 8px", borderRadius: 4, color: "#92400e" }}>Chủ đề: {searchIntent.topicKeywords.join(", ")}</span>
            )}
          </div>
        )}
      </div>

      {/* Materials List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--slate-500)" }}>
          Đang tra cứu cơ sở dữ liệu học liệu...
        </div>
      ) : materials.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--slate-500)" }}>Không tìm thấy học liệu khớp với truy vấn của bạn.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {materials.map(mat => (
            <div key={mat.id} className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, background: "#dcfce7", color: "#14532d", padding: "2px 8px", borderRadius: 4 }}>
                      {mat.grade}
                    </span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--slate-500)" }}>
                      Môn: {mat.subject} • {mat.series}
                    </span>
                    {mat.relevanceScore && (
                      <span style={{ fontSize: "0.75rem", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                        Độ khớp: {mat.relevanceScore} điểm
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: "1.2rem", color: "var(--slate-900)" }}>
                    {mat.title}
                  </h3>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "#15803d", fontWeight: 700, background: "#f0fdf4", padding: "4px 10px", borderRadius: "var(--radius-full)", border: "1px solid #bbf7d0" }}>
                  <ShieldCheck size={14} />
                  <span>NGUỒN ĐÃ XÁC THỰC</span>
                </div>
              </div>

              <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.6, marginBottom: 14 }}>
                {mat.description}
              </p>

              {mat.matchReasons && (
                <div style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 12, background: "#f0fdf4", padding: "6px 10px", borderRadius: 6 }}>
                  Lý do khớp kết quả: {mat.matchReasons.join(" • ")}
                </div>
              )}

              {/* Meta details */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 14, borderTop: "1px solid var(--slate-100)", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--slate-500)" }}>Đơn vị cung cấp: </span>
                  <strong style={{ color: "var(--slate-800)" }}>{mat.provider}</strong>
                  <span style={{ margin: "0 8px", color: "var(--slate-300)" }}>•</span>
                  <span style={{ color: "var(--slate-500)" }}>Quyền truy cập: </span>
                  <span style={{ color: "#0284c7", fontWeight: 600 }}>{mat.accessType}</span>
                </div>

                <a 
                  href={mat.officialUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: "none" }}
                >
                  <span>Mở trang chính thức</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Propose Modal with Guardrail */}
      {showProposeModal && (
        <div className="modal-overlay" onClick={() => setShowProposeModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Đề Xuất Liên Kết Học Liệu Mở</h3>
              <button onClick={() => setShowProposeModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div className="modal-body">
              {modalFeedback ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: "50%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    margin: "0 auto 14px",
                    background: modalFeedback.type === "success" ? "#dcfce7" : (modalFeedback.type === "warning" ? "#fef3c7" : "#fee2e2")
                  }}>
                    {modalFeedback.type === "success" && <CheckCircle size={32} color="#16a34a" />}
                    {modalFeedback.type === "warning" && <AlertTriangle size={32} color="#d97706" />}
                    {modalFeedback.type === "error" && <AlertTriangle size={32} color="#dc2626" />}
                  </div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: 8 }}>
                    {modalFeedback.type === "success" ? "Đã duyệt và lập chỉ mục!" : (modalFeedback.type === "warning" ? "Đã chuyển vào hàng đợi kiểm duyệt" : "Hệ thống từ chối")}
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: "var(--slate-600)", lineHeight: 1.5 }}>
                    {modalFeedback.message}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleProposeSubmit}>
                  <div className="form-group">
                    <label className="form-label">Tiêu đề học liệu *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Ví dụ: Cổng tập huấn SGK Toán 6 NXB GDVN"
                      value={proposeTitle}
                      onChange={e => setProposeTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đường dẫn URL chính thức *</label>
                    <input 
                      type="url" 
                      className="form-control"
                      placeholder="https://taphuan.nxbgd.vn/ hoặc https://hoc10.vn/..."
                      value={proposeUrl}
                      onChange={e => setProposeUrl(e.target.value)}
                      required
                    />
                    <div className="form-help">
                      * Chặn tự động các link chia sẻ file lậu (Mega, Google Drive folder không rõ nguồn, Fshare).
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chủ sở hữu / Đơn vị cung cấp *</label>
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Ví dụ: Nhà xuất bản Giáo dục Việt Nam hoặc Tổ chuyên môn THCS"
                      value={proposeProvider}
                      onChange={e => setProposeProvider(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mô tả tóm tắt nội dung</label>
                    <textarea 
                      className="form-control"
                      rows={3}
                      placeholder="Mô tả phạm vi sử dụng, điều kiện xem..."
                      value={proposeDesc}
                      onChange={e => setProposeDesc(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="form-label">Khối lớp</label>
                      <select className="form-select" value={proposeGrade} onChange={e => setProposeGrade(e.target.value)}>
                        <option value="Lớp 6">Lớp 6</option>
                        <option value="Lớp 7">Lớp 7</option>
                        <option value="Lớp 8">Lớp 8</option>
                        <option value="Toàn cấp">Toàn cấp</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Môn học</label>
                      <select className="form-select" value={proposeSubject} onChange={e => setProposeSubject(e.target.value)}>
                        <option value="Toán">Toán</option>
                        <option value="Ngữ văn">Ngữ văn</option>
                        <option value="Khoa học tự nhiên">Khoa học tự nhiên</option>
                        <option value="Tất cả">Tất cả</option>
                      </select>
                    </div>
                  </div>
                </form>
              )}
            </div>
            <div className="modal-footer">
              {modalFeedback ? (
                <button className="btn btn-primary" onClick={() => { setShowProposeModal(false); setModalFeedback(null); }}>
                  Đóng
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowProposeModal(false)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleProposeSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Đang kiểm tra AI Guardrail..." : "Gửi kiểm duyệt"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
