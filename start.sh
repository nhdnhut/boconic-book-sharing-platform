#!/usr/bin/env bash
set -e

# ==============================================================================
#                      BOCONIC PLATFORM - KHỞI ĐỘNG HỆ THỐNG
# ==============================================================================

# 1. Hỗ trợ chế độ Docker
if [ "$1" = "docker" ] || [ "$1" = "--docker" ] || [ "$1" = "-d" ]; then
    echo "🐳 Đang khởi chạy hệ thống bằng Docker Compose..."
    docker compose up --build
    exit 0
fi

# 2. Kiểm tra tệp cấu hình .env
if [ ! -f ".env" ]; then
    echo "⚠️  Tệp .env chưa tồn tại. Đang sao chép từ .env.example..."
    cp .env.example .env
    echo "✅ Đã tạo tệp .env."
fi

mkdir -p data/storage data/backups

# 3. Phát hiện môi trường Python
PYTHON_BIN=""
if [ -f ".venv/Scripts/python.exe" ]; then
    PYTHON_BIN=".venv/Scripts/python.exe"
    echo "🐍 Đang sử dụng môi trường ảo: .venv (Windows)"
elif [ -f ".venv/bin/python" ]; then
    PYTHON_BIN=".venv/bin/python"
    echo "🐍 Đang sử dụng môi trường ảo: .venv"
elif [ -f "venv/Scripts/python.exe" ]; then
    PYTHON_BIN="venv/Scripts/python.exe"
    echo "🐍 Đang sử dụng môi trường ảo: venv (Windows)"
elif [ -f "venv/bin/python" ]; then
    PYTHON_BIN="venv/bin/python"
    echo "🐍 Đang sử dụng môi trường ảo: venv"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="python3"
    echo "🐍 Đang sử dụng Python hệ thống: $(which python3)"
elif command -v python &>/dev/null; then
    PYTHON_BIN="python"
    echo "🐍 Đang sử dụng Python hệ thống: $(which python)"
else
    echo "❌ LỖI: Không tìm thấy Python! Vui lòng cài đặt Python 3.11+."
    exit 1
fi

# 3.1 Kiểm tra thư viện dependencies
if ! $PYTHON_BIN -c "import fastapi, sqlalchemy, aiosqlite, alembic" &>/dev/null; then
    echo "⚠️  Các thư viện Python chưa được cài đặt đầy đủ."
    echo "📦 Đang tự động cài đặt thư viện từ requirements.txt..."
    $PYTHON_BIN -m pip install -r requirements.txt || {
        echo "❌ Lỗi khi cài đặt requirements.txt. Vui lòng chạy thủ công: pip install -r requirements.txt"
        exit 1
    }
fi

# 4. Khởi tạo CSDL, Migrations & RBAC
echo ""
echo "⚙️  Đang kiểm tra và đồng bộ cơ sở dữ liệu (Alembic & Setup)..."
$PYTHON_BIN scripts/setup.py || {
    echo "❌ LỖI trong quá trình thiết lập cơ sở dữ liệu!"
    echo "👉 Gợi ý: Hãy kiểm tra biến DATABASE_URL trong tệp .env."
    echo "👉 Mặc định nên sử dụng SQLite: DATABASE_URL=sqlite+aiosqlite:///./data/boconic.db"
    exit 1
}

echo ""
echo "=============================================================================="
echo "               ĐANG KHỞI CHẠY TẤT CẢ DỊCH VỤ BOCONIC..."
echo "=============================================================================="

# Hàm dọn dẹp khi nhận tín hiệu dừng (Ctrl+C hoặc kill)
cleanup() {
    echo ""
    echo "🛑 Đang dừng tất cả các dịch vụ Boconic..."
    kill -TERM "$API_PID" 2>/dev/null || true
    kill -TERM "$BOT_PID" 2>/dev/null || true
    kill -TERM "$WORKER_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    echo "✅ Toàn bộ dịch vụ đã dừng an toàn."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 5. Khởi chạy 3 dịch vụ nền
echo "🚀 [1/3] Khởi chạy FastAPI Backend & Admin Console (Port 8000)..."
$PYTHON_BIN -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "🚀 [2/3] Khởi chạy Telegram Bot Gateway..."
$PYTHON_BIN -m app.bot.main &
BOT_PID=$!

echo "🚀 [3/3] Khởi chạy Background Job Worker..."
$PYTHON_BIN -m app.jobs.worker &
WORKER_PID=$!

echo ""
echo "=============================================================================="
echo "                         HỆ THỐNG ĐÃ SẴN SÀNG!"
echo "=============================================================================="
echo " 🌐 Admin Web Console : http://127.0.0.1:8000/admin"
echo "    • Tài khoản mặc định : admin"
echo "    • Mật khẩu mặc định : Boconic@2026"
echo ""
echo " 📖 API Documentation : http://127.0.0.1:8000/docs"
echo " 🩺 Health Probe      : http://127.0.0.1:8000/health/live"
echo " 🤖 Telegram Bot      : Đang chạy polling"
echo " ⚙️  Job Worker        : Đang chạy xử lý outbox queue"
echo "=============================================================================="
echo "👉 Nhấn Ctrl + C để dừng tất cả dịch vụ bất cứ lúc nào."
echo ""

# Đợi tất cả tiến trình con
wait
