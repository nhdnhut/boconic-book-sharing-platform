// client/src/components/Header.jsx
import React from "react";
import { 
  BookOpen, 
  Search, 
  PlusCircle, 
  HelpCircle, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  RotateCcw 
} from "lucide-react";

export default function Header({ activeTab, setActiveTab, onResetDemo, isResetting }) {
  const navItems = [
    { id: "home", label: "Trang chủ", icon: BookOpen },
    { id: "search", label: "Tìm sách", icon: Search },
    { id: "lend", label: "Cho mượn sách", icon: PlusCircle },
    { id: "request", label: "Yêu cầu mượn", icon: HelpCircle },
    { id: "loans", label: "Lịch sử & Nhận sách", icon: Clock },
    { id: "materials", label: "Học liệu chính thức", icon: ExternalLink },
    { id: "coordinator", label: "Bàn Điều phối Thư viện", icon: Sliders, special: true },
    { id: "sandbox", label: "Thực nghiệm AI", icon: Sparkles },
    { id: "rules", label: "Bản quyền & Riêng tư", icon: ShieldCheck }
  ];

  return (
    <>
      {/* Demo Notification Bar */}
      <div className="demo-banner">
        <div>
          <span>🥑 <strong>Boconic Demo (2026-2027)</strong>: Đang chạy với dữ liệu mô phỏng 2 trường THCS, 3 khối lớp và kịch bản hàng đợi nhiều học sinh chờ 1 cuốn sách.</span>
        </div>
        <div className="demo-banner-actions">
          <button 
            className="btn-reset-demo" 
            onClick={onResetDemo}
            disabled={isResetting}
            title="Khôi phục trạng thái mẫu ban đầu"
          >
            <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
            {isResetting ? "Đang đặt lại..." : "Đặt lại dữ liệu mẫu"}
          </button>
        </div>
      </div>

      <header className="app-header">
        <div className="header-inner">
          {/* Logo & Mascot */}
          <div className="logo-group" onClick={() => setActiveTab("home")}>
            <img 
              src="/mascot_bo.jpg" 
              alt="Linh vật Bơ Boconic" 
              className="logo-avatar"
            />
            <div>
              <div className="logo-text-title">
                Boconic
                <span className="logo-badge">Linh vật Bơ 🥑</span>
              </div>
              <div className="logo-tagline">
                Kết nối sách giáo khoa in & Học liệu số chính thức
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="nav-links">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSpecial = item.special;

              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? "active" : ""} ${isSpecial ? "nav-item-coordinator" : ""}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
