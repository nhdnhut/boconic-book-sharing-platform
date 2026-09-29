// client/src/pages/SearchBooksPage.jsx
import React, { useState, useEffect } from "react";
import { Search, Filter, BookOpen, MapPin, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../api";
import BookingModal from "../components/BookingModal";
import MascotCard from "../components/MascotCard";

export default function SearchBooksPage({ setActiveTab }) {
  const [books, setBooks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Modal
  const [selectedBookForLoan, setSelectedBookForLoan] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [selectedSchool, selectedGrade, selectedSubject, selectedSeries, selectedStatus]);

  const loadData = async () => {
    try {
      const [schoolsRes, booksRes] = await Promise.all([
        api.getSchools(),
        api.getBooks()
      ]);
      setSchools(schoolsRes.data);
      setBooks(booksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    try {
      const params = {};
      if (selectedSchool) params.schoolId = selectedSchool;
      if (selectedGrade) params.grade = selectedGrade;
      if (selectedSubject) params.subject = selectedSubject;
      if (selectedSeries) params.series = selectedSeries;
      if (selectedStatus) params.status = selectedStatus;

      const res = await api.getBooks(params);
      setBooks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "SẴN CÓ":
        return <span className="badge badge-available">● SẴN CÓ CHO MƯỢN</span>;
      case "ĐÃ ĐẶT":
        return <span className="badge badge-reserved">● ĐÃ CÓ NGƯỜI ĐẶT</span>;
      case "ĐANG MƯỢN":
        return <span className="badge badge-borrowed">● ĐANG ĐƯỢC MƯỢN</span>;
      default:
        return <span className="badge badge-returned">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.8rem", color: "var(--slate-900)" }}>Tra Cứu Sách Giáo Khoa Trong Trường</h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
          Tìm các đầu sách bản in do phụ huynh và học sinh chia sẻ tại trường. Chỉ bàn giao tại các điểm tiếp nhận chính thức.
        </p>
      </div>

      <MascotCard 
        title="Lưu ý khi mượn sách 🥑"
        message="Một cuốn sách có thể phục vụ nhiều bạn theo từng khoảng ngày nối tiếp. Hãy chọn đúng khoảng ngày bạn thật sự cần dùng để nhường lượt cho các bạn khác nữa nhé!"
      />

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 28, padding: 20, background: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "var(--slate-800)", marginBottom: 16 }}>
          <Filter size={18} color="var(--primary-700)" />
          <span>Bộ Lọc Sách</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {/* School */}
          <div>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Trường học</label>
            <select 
              className="form-select"
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
            >
              <option value="">Tất cả các trường</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Grade */}
          <div>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Khối lớp</label>
            <select 
              className="form-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">Tất cả các khối</option>
              <option value="Lớp 6">Lớp 6</option>
              <option value="Lớp 7">Lớp 7</option>
              <option value="Lớp 8">Lớp 8</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Môn học</label>
            <select 
              className="form-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Tất cả các môn</option>
              <option value="Toán">Toán</option>
              <option value="Ngữ văn">Ngữ văn</option>
              <option value="Khoa học tự nhiên">Khoa học tự nhiên</option>
              <option value="Lịch sử và Địa lí">Lịch sử và Địa lí</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
            </select>
          </div>

          {/* Series */}
          <div>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Bộ sách</label>
            <select 
              className="form-select"
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
            >
              <option value="">Tất cả các bộ sách</option>
              <option value="Kết nối tri thức với cuộc sống">Kết nối tri thức với cuộc sống</option>
              <option value="Chân trời sáng tạo">Chân trời sáng tạo</option>
              <option value="Cánh Diều">Cánh Diều</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="form-label" style={{ fontSize: "0.82rem" }}>Trạng thái</label>
            <select 
              className="form-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="SẴN CÓ">Sẵn có ngay</option>
              <option value="ĐÃ ĐẶT">Đã có lịch đặt</option>
              <option value="ĐANG MƯỢN">Đang được mượn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: "0.95rem", color: "var(--slate-600)" }}>
          Tìm thấy <strong>{books.length}</strong> cuốn sách phù hợp
        </div>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setSelectedSchool("");
            setSelectedGrade("");
            setSelectedSubject("");
            setSelectedSeries("");
            setSelectedStatus("");
          }}
        >
          Xóa toàn bộ lọc
        </button>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--slate-500)" }}>
          Đang tải dữ liệu sách...
        </div>
      ) : books.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>📚</div>
          <h3 style={{ fontSize: "1.1rem", color: "var(--slate-800)" }}>Không tìm thấy sách theo bộ lọc này</h3>
          <p style={{ color: "var(--slate-500)", fontSize: "0.9rem", margin: "8px auto 20px", maxWidth: 450 }}>
            Bạn có thể đăng ký nhu cầu để hệ thống ghép tự động khi có bạn khác mang sách tới trường cho mượn!
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab("request")}>
            Đăng ký nhu cầu mượn cuốn này &rarr;
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {books.map(book => {
            const isAvailable = book.status === "SẴN CÓ";

            return (
              <div key={book.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--primary-700)", textTransform: "uppercase" }}>
                        {book.grade} • {book.subject}
                      </span>
                      <h3 style={{ fontSize: "1.15rem", color: "var(--slate-900)", marginTop: 4 }}>
                        {book.title}
                      </h3>
                    </div>
                    {getStatusBadge(book.status)}
                  </div>

                  <div style={{ fontSize: "0.86rem", color: "var(--slate-600)", marginBottom: 10 }}>
                    Bộ sách: <strong>{book.series}</strong>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: "var(--slate-500)", marginBottom: 8 }}>
                    Phiên bản: {book.edition}
                  </div>

                  <div style={{ background: "var(--slate-50)", padding: 10, borderRadius: 8, fontSize: "0.82rem", marginBottom: 12 }}>
                    <div style={{ color: "var(--slate-700)", fontWeight: 600, marginBottom: 4 }}>
                      Tình trạng: {book.condition}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--slate-600)" }}>
                      <MapPin size={13} color="#15803d" />
                      <span>{book.pickupPointName}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.78rem", color: "var(--slate-500)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Calendar size={13} />
                    <span>Lịch có thể mượn: {book.availableRanges && book.availableRanges.map(r => `${r.startDate} -> ${r.endDate}`).join(", ")}</span>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--slate-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--slate-500)" }}>
                    Đã phục vụ: <strong>{book.totalLoansCompleted || 0}</strong> lượt
                  </span>

                  <button 
                    className={`btn btn-sm ${isAvailable ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setSelectedBookForLoan(book)}
                  >
                    {isAvailable ? "Đặt mượn sách này" : "Xem / Xếp lịch nối tiếp"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedBookForLoan && (
        <BookingModal 
          book={selectedBookForLoan} 
          onClose={() => setSelectedBookForLoan(null)}
          onSuccess={() => {
            loadBooks();
          }}
        />
      )}
    </div>
  );
}
