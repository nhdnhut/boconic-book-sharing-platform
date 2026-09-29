// client/src/pages/LendBookPage.jsx
import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { PlusCircle, ShieldAlert, CheckCircle, MapPin, UploadCloud, AlertTriangle } from "lucide-react";
import { api } from "../api";
import MascotCard from "../components/MascotCard";

export default function LendBookPage({ setActiveTab }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [pickupPoints, setPickupPoints] = useState([]);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState("");

  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("Lớp 6");
  const [subject, setSubject] = useState("Toán");
  const [series, setSeries] = useState("Kết nối tri thức với cuộc sống");
  const [edition, setEdition] = useState("Tái bản 2024 (Chuẩn 2026-2027)");
  const [condition, setCondition] = useState("Còn tốt 90%, đủ trang, có bọc bìa");
  const [lenderAlias, setLenderAlias] = useState("");
  const [availableStartDate, setAvailableStartDate] = useState("2026-10-01");
  const [availableEndDate, setAvailableEndDate] = useState("2026-10-30");

  const [coverFile, setCoverFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guardrailError, setGuardrailError] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    api.getSchools().then(res => {
      setSchools(res.data);
      if (res.data.length > 0) {
        setSelectedSchoolId(res.data[0].id);
        setPickupPoints(res.data[0].pickupPoints);
        if (res.data[0].pickupPoints.length > 0) {
          setSelectedPickupPointId(res.data[0].pickupPoints[0].id);
        }
      }
    });
  }, []);

  const handleSchoolChange = (e) => {
    const sId = e.target.value;
    setSelectedSchoolId(sId);
    const sch = schools.find(s => s.id === sId);
    if (sch) {
      setPickupPoints(sch.pickupPoints);
      if (sch.pickupPoints.length > 0) {
        setSelectedPickupPointId(sch.pickupPoints[0].id);
      }
    }
  };

  const handleFileChange = (e) => {
    setGuardrailError("");
    const file = e.target.files[0];
    if (!file) return;

    // Instant client-side inspection before upload
    const filename = file.name.toLowerCase();
    if (filename.endsWith(".pdf") || filename.endsWith(".epub") || filename.endsWith(".zip")) {
      setGuardrailError(`Hệ thống từ chối tệp '${file.name}'. Boconic KHÔNG lưu trữ hoặc nhận tải lên tệp PDF sách/bản số hóa theo quy định bảo vệ bản quyền.`);
      e.target.value = null;
      return;
    }

    if (filename.includes("scan") || filename.includes("trang_")) {
      setGuardrailError(`Tệp '${file.name}' có dấu hiệu bản chụp quét trang sách. Vui lòng chỉ chụp ảnh bìa ngoài nếu muốn xác nhận tình trạng sách.`);
      e.target.value = null;
      return;
    }

    setCoverFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardrailError("");

    if (!title || !selectedSchoolId) {
      setGuardrailError("Vui lòng điền tên sách và chọn trường học.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPoint = pickupPoints.find(p => p.id === selectedPickupPointId);

      const formData = new FormData();
      formData.append("schoolId", selectedSchoolId);
      formData.append("pickupPointId", selectedPickupPointId);
      formData.append("pickupPointName", selectedPoint ? selectedPoint.name : "Thư viện trường");
      formData.append("title", title);
      formData.append("grade", grade);
      formData.append("subject", subject);
      formData.append("series", series);
      formData.append("edition", edition);
      formData.append("condition", condition);
      formData.append("lenderAlias", lenderAlias || "Phụ huynh / Học sinh chia sẻ");
      formData.append("availableStartDate", availableStartDate);
      formData.append("availableEndDate", availableEndDate);
      if (coverFile) {
        formData.append("coverFile", coverFile);
      }

      const res = await api.lendBook(formData);
      setSuccessResult(res.data);
      confetti({
        particleCount: 70,
        spread: 60
      });
    } catch (err) {
      setGuardrailError(err.message || "Lỗi khi đăng sách.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Đăng Cho Mượn Sách Giáo Khoa</h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
          Mỗi cuốn sách bạn chia sẻ sẽ giúp các bạn cùng trường kịp học bài trong lúc chờ sách chính thức được cung ứng.
        </p>
      </div>

      <MascotCard 
        title="Gợi ý từ Bạn Bơ 🥑"
        message="Bạn chỉ cần gửi sách đến tủ sách/bàn thư viện tại trường đã chọn. Hệ thống không yêu cầu chụp ảnh nội dung trang sách để tôn trọng bản quyền của tác giả và NXB."
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
          <h2 style={{ fontSize: "1.4rem", color: "#166534" }}>Cảm ơn bạn đã đóng góp cho tủ sách học đường!</h2>
          <p style={{ color: "var(--slate-600)", margin: "10px auto 24px", maxWidth: 520, fontSize: "0.95rem" }}>
            Sách <strong>{successResult.title}</strong> ({successResult.series}) đã được ghi nhận vào hệ thống Boconic.
          </p>

          <div style={{ background: "var(--slate-50)", border: "1px solid var(--slate-200)", padding: 20, borderRadius: "var(--radius-md)", maxWidth: 500, margin: "0 auto 24px", textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: "var(--slate-800)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={16} color="#15803d" />
              Điểm bàn giao sách tại trường:
            </div>
            <div style={{ fontSize: "0.92rem", color: "var(--slate-900)", fontWeight: 600 }}>
              {successResult.pickupPointName}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--slate-500)", marginTop: 6 }}>
              Bạn có thể mang sách gửi tại điểm này vào giờ hành chính để thầy/cô phụ trách dán tem mã QR nhận diện.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => setSuccessResult(null)}>
              Đăng thêm cuốn khác
            </button>
            <button className="btn btn-primary" onClick={() => setActiveTab("search")}>
              Xem sách trên hệ thống &rarr;
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: "28px" }}>
          {/* Guardrail Rejection Alert */}
          {guardrailError && (
            <div style={{ 
              background: "#fef2f2", 
              border: "1.5px solid #f87171", 
              color: "#991b1b", 
              padding: "14px 18px", 
              borderRadius: "var(--radius-md)", 
              marginBottom: 24,
              display: "flex",
              alignItems: "flex-start",
              gap: 12
            }}>
              <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.94rem" }}>Cảnh Báo Kiểm Duyệt Bản Quyền</div>
                <div style={{ fontSize: "0.86rem", marginTop: 4, lineHeight: 1.5 }}>{guardrailError}</div>
              </div>
            </div>
          )}

          {/* School & Point */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Chọn trường của bạn *</label>
              <select 
                className="form-select"
                value={selectedSchoolId}
                onChange={handleSchoolChange}
                required
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.address})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Điểm giao nhận chỉ định trong trường *</label>
              <select 
                className="form-select"
                value={selectedPickupPointId}
                onChange={(e) => setSelectedPickupPointId(e.target.value)}
                required
              >
                {pickupPoints.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Title & Grade & Subject */}
          <div className="form-group">
            <label className="form-label">Tên sách giáo khoa *</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="Ví dụ: Toán 6 - Tập 1 hoặc Ngữ văn 7 - Tập 2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

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
              <label className="form-label">Bộ sách *</label>
              <select className="form-select" value={series} onChange={(e) => setSeries(e.target.value)}>
                <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức với cuộc sống</option>
                <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
                <option value="Cánh Diều">Cánh Diều</option>
              </select>
            </div>
          </div>

          {/* Edition & Condition */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Năm xuất bản / Phiên bản</label>
              <input 
                type="text" 
                className="form-control"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="Ví dụ: Tái bản 2024 (chuẩn 2026-2027)"
              />
            </div>

            <div>
              <label className="form-label">Tình trạng sách</label>
              <input 
                type="text" 
                className="form-control"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Ví dụ: Tốt, có bọc bìa, không rách hay gạch xóa"
              />
            </div>
          </div>

          {/* Dates & Alias */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label className="form-label">Cho mượn từ ngày</label>
              <input 
                type="date" 
                className="form-control"
                value={availableStartDate}
                onChange={(e) => setAvailableStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Đến hết ngày</label>
              <input 
                type="date" 
                className="form-control"
                value={availableEndDate}
                onChange={(e) => setAvailableEndDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">Tên hiển thị chia sẻ</label>
              <input 
                type="text" 
                className="form-control"
                value={lenderAlias}
                onChange={(e) => setLenderAlias(e.target.value)}
                placeholder="Ví dụ: Phụ huynh Khang (6A1)"
              />
            </div>
          </div>

          {/* File inspection block (Guardrail) */}
          <div style={{ background: "var(--slate-50)", border: "1px dashed var(--slate-300)", borderRadius: "var(--radius-md)", padding: 18, marginBottom: 24 }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <UploadCloud size={16} color="var(--primary-700)" />
              Ảnh bìa nhận diện sách (Tùy chọn - KHÔNG bắt buộc)
            </label>
            <input 
              type="file" 
              accept="image/*"
              className="form-control"
              onChange={handleFileChange}
            />
            <div style={{ fontSize: "0.78rem", color: "var(--slate-500)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldAlert size={14} color="#f59e0b" />
              <span>Hệ thống tự động từ chối file PDF sách, ebook, hoặc ảnh chụp quét nội dung các trang bài học.</span>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "14px" }} disabled={isSubmitting}>
            <PlusCircle size={18} />
            {isSubmitting ? "Đang ghi nhận..." : "Đăng sách vào Tủ sách trường"}
          </button>
        </form>
      )}
    </div>
  );
}
