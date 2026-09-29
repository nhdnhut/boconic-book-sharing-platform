// client/src/components/MascotCard.jsx
import React from "react";
import { Sparkles } from "lucide-react";

export default function MascotCard({ message, title = "Lời nhắn từ Bơ 🥑", actionText, onAction }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
      border: "1.5px solid #bbf7d0",
      borderRadius: "var(--radius-lg)",
      padding: "18px 22px",
      display: "flex",
      alignItems: "center",
      gap: "18px",
      boxShadow: "var(--shadow-sm)",
      marginBottom: "24px"
    }}>
      <div style={{ flexShrink: 0 }}>
        <img 
          src="/mascot_bo.jpg" 
          alt="Bơ" 
          style={{ 
            width: "60px", 
            height: "60px", 
            borderRadius: "50%", 
            border: "2px solid #22c55e",
            boxShadow: "0 2px 8px rgba(34, 197, 94, 0.2)"
          }} 
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "var(--primary-800)", fontSize: "0.95rem" }}>
          <Sparkles size={16} color="#16a34a" />
          <span>{title}</span>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--slate-700)", marginTop: "4px", lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      {actionText && onAction && (
        <button 
          className="btn btn-primary btn-sm" 
          onClick={onAction}
          style={{ flexShrink: 0 }}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
