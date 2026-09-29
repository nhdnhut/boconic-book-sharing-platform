// client/src/pages/CopyrightPrivacyPage.jsx
import React from "react";
import { ShieldCheck, Lock, AlertTriangle, ExternalLink, HeartHandshake, EyeOff } from "lucide-react";
import MascotCard from "../components/MascotCard";

export default function CopyrightPrivacyPage() {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.85rem", color: "var(--slate-900)" }}>
          Quy Tắc Bản Quyền & Chính Sách Quyền Riêng Tư
        </h1>
        <p style={{ color: "var(--slate-600)", fontSize: "0.95rem", marginTop: 4 }}>
          Cam kết pháp lý bắt buộc và nguyên tắc bảo vệ quyền riêng tư cho học sinh tại nền tảng Boconic.
        </p>
      </div>

      <MascotCard 
        title="Cam kết đạo đức từ Boconic 🥑"
        message="Boconic ra đời từ tinh thần chia sẻ sách in học đường và hỗ trợ các em học sinh có hoàn cảnh khó khăn kịp có sách bài học. Nền tảng tôn trọng tuyệt đối quyền tác giả và bảo mật tối đa danh tính trẻ em."
      />

      {/* Section 1: Copyright */}
      <div className="card" style={{ marginBottom: 28, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#166534", marginBottom: 16 }}>
          <ShieldCheck size={26} />
          <h2 style={{ fontSize: "1.35rem" }}>1. Ranh Giới Bản Quyền Bắt Buộc</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "0.92rem", lineHeight: 1.7, color: "var(--slate-700)" }}>
          <div style={{ background: "#fef2f2", borderLeft: "4px solid #ef4444", padding: "14px 18px", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ color: "#991b1b" }}>Tuyệt đối không xây dựng tính năng 'gom sách':</strong>
            <p style={{ marginTop: 4, color: "#7f1d1d" }}>
              Nền tảng nghiêm cấm và không cung cấp bất kỳ công cụ nào cho phép nhiều người dùng tải lên mỗi người 10% cuốn sách để hệ thống ghép lại thành toàn bộ cuốn sách số.
            </p>
          </div>

          <div>
            <strong>Hiểu đúng về Giới hạn Quyền tác giả:</strong>
            <p style={{ marginTop: 4 }}>
              Quy định về ngoại lệ sao chép phục vụ nghiên cứu, học tập cá nhân theo Luật Sở hữu Trí tuệ <em>không phải là giấy phép</em> để một nền tảng công nghệ thu thập, tái tạo, số hóa hay phân phối sách giáo khoa ra cộng đồng.
            </p>
          </div>

          <div>
            <strong>Không lưu trữ PDF hay ảnh quét (scan) trang sách:</strong>
            <p style={{ marginTop: 4 }}>
              Máy chủ của Boconic hoàn toàn không lưu trữ tệp PDF sách giáo khoa, không lưu ảnh chụp các trang nội dung sách. Người cho mượn chỉ đăng tải thông tin siêu dữ liệu (tên sách, bộ sách, lớp, năm xuất bản, tình trạng bìa) và điểm giao nhận vật lý.
            </p>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: 8 }}>
            <strong style={{ color: "#14532d" }}>Nguyên tắc liên kết học liệu số chính thức:</strong>
            <p style={{ marginTop: 4, color: "#166534" }}>
              Kho học liệu Boconic chỉ lưu trữ dạng <strong>siêu dữ liệu liên kết (URL)</strong>, ghi rõ đơn vị cung cấp, phiên bản và điều kiện sử dụng. Khi học sinh nhấp vào, nội dung sẽ được mở trực tiếp tại trang web chính thức của nhà xuất bản hoặc cơ quan giáo dục:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8, color: "#14532d" }}>
              <li>
                Cổng Tập huấn SGK Nhà xuất bản Giáo dục Việt Nam:{" "}
                <a href="https://taphuan.nxbgd.vn/" target="_blank" rel="noreferrer" style={{ color: "#0369a1", fontWeight: 600 }}>
                  https://taphuan.nxbgd.vn/ <ExternalLink size={12} style={{ display: "inline" }} />
                </a>
              </li>
              <li>
                Thông báo SGK năm học 2026–2027:{" "}
                <a href="https://nxbgd.vn/bai-viet/nha-xuat-ban-giao-duc-viet-nam-thong-bao-ve-viec-su-dung-sach-giao-khoa-nam-hoc-2026-2027" target="_blank" rel="noreferrer" style={{ color: "#0369a1", fontWeight: 600 }}>
                  Thông báo chính thức NXB GDVN <ExternalLink size={12} style={{ display: "inline" }} />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 2: Privacy */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0369a1", marginBottom: 16 }}>
          <Lock size={24} />
          <h2 style={{ fontSize: "1.35rem" }}>2. Bảo Vệ Dữ Liệu Cá Nhân & Quyền Riêng Tư Của Trẻ Em</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "0.92rem", lineHeight: 1.7, color: "var(--slate-700)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <EyeOff size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong>Không hiển thị công khai danh sách học sinh thiếu sách:</strong>
              <p style={{ marginTop: 2 }}>
                Để tránh tạo tâm lý mặc cảm hoặc phân biệt đối xử trong môi trường học đường, Boconic không có bất kỳ trang công khai nào liệt kê danh sách học sinh có hoàn cảnh khó khăn hoặc chưa có sách.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <HeartHandshake size={20} color="#15803d" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong>Không chia sẻ số điện thoại hay địa chỉ nhà riêng:</strong>
              <p style={{ marginTop: 2 }}>
                Các bạn học sinh và phụ huynh khi trao đổi sách chỉ nhìn thấy tên gọi đại diện (ví dụ: <em>Học sinh Nam - 6A3</em>). Không có địa chỉ nhà riêng, không có số điện thoại cá nhân nào bị tiết lộ ra ngoài.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <ShieldCheck size={20} color="#7c3aed" style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <strong>Chỉ giao nhận tại các điểm trường quy định:</strong>
              <p style={{ marginTop: 2 }}>
                Mọi hoạt động bàn giao sách in đều được tổ chức tại các vị trí công cộng, an toàn trong khuôn viên trường học: <em>Bàn tiếp nhận Thư viện, Tủ sách chia sẻ Phòng Giám thị, hoặc Văn phòng Đoàn Đội</em> dưới sự giám sát của điều phối viên.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
