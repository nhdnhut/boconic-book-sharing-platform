// client/src/components/Footer.jsx
import React from "react";
import { ShieldCheck, Heart, ExternalLink, BookCheck } from "lucide-react";

export default function Footer({ setActiveTab }) {
  return (
    <footer style={{ background: "#0f172a", color: "#94a3b8", padding: "48px 20px 32px", marginTop: "auto", borderTop: "1px solid #1e293b" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
        
        {/* Col 1: Mission & Mascot */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <img src="/mascot_bo.jpg" alt="Bơ" style={{ width: 36, height: 36, borderRadius: "50%" }} />
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "white" }}>Boconic</span>
          </div>
          <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "#cbd5e1" }}>
            Giải pháp chuyển tiếp học đường giúp học sinh tiếp tục học tập khi chưa được cung ứng đủ sách giáo khoa. Kết nối sách in hợp pháp và dẫn nguồn học liệu chính thức.
          </p>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#86efac" }}>
            <Heart size={14} fill="#86efac" />
            <span>Đồng hành cùng học sinh và phụ huynh Việt Nam</span>
          </div>
        </div>

        {/* Col 2: Official Publishers Links */}
        <div>
          <h4 style={{ color: "white", fontSize: "0.96rem", marginBottom: 14 }}>Học Liệu Xuất Bản Chính Thức</h4>
          <ul style={{ listStyle: "none", padding: 0, fontSize: "0.86rem", display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              <a 
                href="https://taphuan.nxbgd.vn/" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Cổng Tập huấn SGK - NXB Giáo dục VN <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <a 
                href="https://nxbgd.vn/bai-viet/nha-xuat-ban-giao-duc-viet-nam-thong-bao-ve-viec-su-dung-sach-giao-khoa-nam-hoc-2026-2027" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Thông báo SGK năm học 2026–2027 <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <a 
                href="https://hoc10.vn/" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Hệ sinh thái học liệu số Cánh Diều (VEPIC) <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <a 
                href="https://moet.gov.vn/" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                Cổng Thông tin Điện tử Bộ GD&ĐT <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Strict Legal Boundaries */}
        <div>
          <h4 style={{ color: "white", fontSize: "0.96rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={16} color="#4ade80" />
            Ranh Giới Bản Quyền Bắt Buộc
          </h4>
          <p style={{ fontSize: "0.82rem", lineHeight: 1.6, color: "#94a3b8" }}>
            Boconic <strong>tuyệt đối không</strong> lưu trữ PDF sách, không nhận tải lên các bản quét toàn văn sách giáo khoa. Giới hạn sao chép học tập cá nhân không phải giấy phép phân phối. Học liệu ngoài chỉ lưu dưới dạng siêu dữ liệu và liên kết mở trực tiếp tại trang gốc.
          </p>
          <div style={{ marginTop: 12 }}>
            <button 
              onClick={() => setActiveTab("rules")}
              style={{ background: "transparent", border: "1px solid #475569", color: "#e2e8f0", padding: "4px 10px", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer" }}
            >
              Xem chi tiết Quy định Pháp lý & Riêng tư &rarr;
            </button>
          </div>
        </div>

      </div>

      <div style={{ maxWidth: 1240, margin: "32px auto 0", paddingTop: 20, borderTop: "1px solid #1e293b", textAlign: "center", fontSize: "0.78rem", color: "#64748b" }}>
        &copy; 2026-2027 Boconic (Book Connect - Linh vật Bơ). Dự án Công nghệ Phục vụ Cộng đồng Học đường.
      </div>
    </footer>
  );
}
