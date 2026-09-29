// client/src/pages/RequestBookPage.jsx
import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { HelpCircle, CheckCircle, ShieldCheck, Sparkles, AlertCircle, Clock } from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function RequestBookPage({ setActiveTab }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [studentAlias, setStudentAlias] = useState("");
  const [grade, setGrade] = useState("Lớp 6");
  const [subject, setSubject] = useState("Toán");
  const [series, setSeries] = useState("Kết nối tri thức với cuộc sống");
  const [editionNeeded, setEditionNeeded] = useState("Bản 2024 hoặc mới hơn");
  const [startDate, setStartDate] = useState("2026-10-02");
  const [endDate, setEndDate] = useState("2026-10-06");
  const [classDate, setClassDate] = useState("2026-10-03"); // Next class day
  const [hasDigitalAccess, setHasDigitalAccess] = useState(false);
  const [reason, setReason] = useState("Chưa mua được sách, chờ nhà trường cung ứng đợt bổ sung");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    api.getSchools().then(res => {
      setSchools(res.data);
      if (res.data.length > 0) {
        setSelectedSchoolId(res.data[0].id);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedSchoolId || !startDate || !endDate) {
      setErrorMsg("Vui lòng điền đầy đủ trường học và khoảng ngày cần dùng.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createRequest({
        schoolId: selectedSchoolId,
        studentAlias: studentAlias || `Học sinh (${grade})`,
        grade,
        subject,
        series,
        editionNeeded,
        startDate,
        endDate,
        hasClassOn: [classDate],
        hasDigitalAccess,
        reason
      });

      setSuccessResult(res.data);
      confetti({
        particleCount: 70,
        spread: 60
      });
    } catch (err) {
      setErrorMsg(err.message || "Lỗi gửi yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Đăng Ký Nhu Cầu Mượn Sách Giáo Khoa</h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
          Nếu thư viện trường hiện chưa có cuốn sách bạn cần, hãy gửi yêu cầu để thuật toán ghép công bằng ưu tiên kết nối ngay khi có sách hoàn trả.
        </p>
      </div>

      <MascotCard 
        title="Quyền riêng tư học sinh là trên hết 🥑"
        message="Hệ thống KHÔNG công khai danh sách 'học sinh thiếu sách' hay hoàn cảnh gia đình. Thông tin chỉ dùng nội bộ cho thuật toán ghép lịch công bằng và thầy cô phụ trách thư viện hỗ trợ."
      />

      {successResult ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ 
            width: 72, 
            height: 72, 
            background: "#dcfce7", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            margin: "0 auto 16px" 
          }}>
            <CheckCircle size={40} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: "1.35rem", color: "#166534" }}>Yêu cầu đã được đưa vào Danh Sách Chờ Ghép!</h2>
          <p style={{ color: "var(--slate-600)", margin: "10px auto 20px", maxWidth: 520, fontSize: "0.95rem" }}>
            Hệ thống đã ghi nhận nhu cầu sách <strong>{successResult.subject} ({successResult.grade})</strong> của bạn.
          </p>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 18, borderRadius: "var(--radius-md)", maxWidth: 520, margin: "0 auto 24px", textAlign: "left", fontSize: "0.88rem" }}>
            <div style={{ fontWeight: 700, color: "#166534", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} />
              Cơ chế ghép lịch công bằng Boconic:
            </div>
            <div style={{ color: "var(--slate-700)", lineHeight: 1.5 }}>
              Nếu ngày có tiết học của bạn diễn ra sớm ({classDate}) và bạn chưa có thiết bị đọc trực tuyến, hệ thống sẽ tự động gán điểm ưu tiên cao hơn để ghép sách ngay khi có sách hoàn trả tại thư viện.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setSuccessResult(null)}>
              Đăng ký thêm môn khác
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab("materials")}>
              Xem tạm học liệu số chính thức trong khi chờ &rarr;
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: "28px" }}>
          {errorMsg && (
            <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", padding: "12px", borderRadius: 8, marginBottom: 20 }}>
              {errorMsg}
            </div>
          )}

          {/* School & Alias */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Chọn trường của bạn *</label>
              <select 
                className="form-select"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                required
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Tên gọi / Lớp của học sinh</label>
              <input 
                type="text" 
                className="form-control"
                placeholder="Ví dụ: Học sinh Nam (6A3)"
                value={studentAlias}
                onChange={(e) => setStudentAlias(e.target.value)}
              />
              <div className="form-help">Không cần nhập họ tên đầy đủ hay số điện thoại.</div>
            </div>
          </div>

          {/* Grade, Subject, Series */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Khối lớp *</label>
              <select className="form-select" value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="Lớp 6">Lớp 6</option>
                <option value="Lớp 7">Lớp 7</option>
                <option value="Lớp 8">Lớp 8</option>
              </select>
            </div>

            <div>
              <label className="form-label">Môn học *</label>
              <select className="form-select" value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="Toán">Toán</option>
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Khoa học tự nhiên">Khoa học tự nhiên</option>
                <option value="Lịch sử và Địa lí">Lịch sử và Địa lí</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
              </select>
            </div>

            <div>
              <label className="form-label">Bộ sách cần học *</label>
              <select className="form-select" value={series} onChange={(e) => setSeries(e.target.value)}>
                <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức với cuộc sống</option>
                <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
                <option value="Cánh Diều">Cánh Diều</option>
              </select>
            </div>
          </div>

          {/* Dates & Class Timetable */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Cần mượn từ ngày *</label>
              <input 
                type="date" 
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Đến hết ngày *</label>
              <input 
                type="date" 
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ color: "#b45309", fontWeight: 700 }}>
                Ngày có tiết học môn này *
              </label>
              <input 
                type="date" 
                className="form-control"
                value={classDate}
                onChange={(e) => setClassDate(e.target.value)}
                style={{ borderColor: "#f59e0b" }}
                required
              />
              <div className="form-help" style={{ color: "#b45309" }}>
                Dùng để tính độ khẩn cấp giúp bạn kịp có sách trước giờ lên lớp.
              </div>
            </div>
          </div>

          {/* Equity & Digital Access Switch */}
          <div style={{ 
            background: hasDigitalAccess ? "#f8fafc" : "#fffbeb", 
            border: hasDigitalAccess ? "1px solid var(--slate-200)" : "1.5px solid #fde68a", 
            borderRadius: "var(--radius-md)", 
            padding: "16px 20px", 
            marginBottom: 20 
          }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={hasDigitalAccess}
                onChange={(e) => setHasDigitalAccess(e.target.checked)}
                style={{ marginTop: 4, width: 18, height: 18, cursor: "pointer" }}
              />
              <div>
                <div style={{ fontWeight: 700, color: "var(--slate-800)", fontSize: "0.92rem" }}>
                  Gia đình có thiết bị (máy tính/máy tính bảng) và internet để đọc sách điện tử tạm thời
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--slate-600)", marginTop: 4, lineHeight: 1.5 }}>
                  {hasDigitalAccess ? (
                    "Học sinh có thể xem trước nội dung chính thức tại taphuan.nxbgd.vn trong lúc chờ sách bản in."
                  ) : (
                    <strong style={{ color: "#b45309" }}>
                      ⚠️ Chưa có thiết bị/internet ở nhà: Thuật toán Boconic sẽ tự động cộng điểm ưu tiên công bằng (Equity Weight) để bạn được nhận sách in sớm nhất!
                    </strong>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Ghi chú thêm (Tùy chọn)</label>
            <input 
              type="text" 
              className="form-control"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Đang đợi nhà trường phát sách bổ sung"
            />
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-amber" style={{ width: "100%", padding: "14px" }} disabled={isSubmitting}>
            <HelpCircle size={18} />
            {isSubmitting ? "Đang xử lý..." : "Gửi yêu cầu vào Danh sách chờ ghép"}
          </button>
        </form>
      )}
    </div>
  );
}
