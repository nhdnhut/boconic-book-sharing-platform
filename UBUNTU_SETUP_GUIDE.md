# HƯỚNG DẪN CÀI ĐẶT VÀ TRIỂN KHAI BOCONIC TRÊN UBUNTU LINUX

Tài liệu này hướng dẫn chi tiết cách cài đặt, cấu hình và khởi chạy toàn bộ nền tảng Boconic từ thư mục mã nguồn sạch này trên hệ điều hành Ubuntu (22.04 LTS hoặc 24.04 LTS).

---

## 1. Yêu cầu hệ thống (Prerequisites)

Cập nhật hệ thống và cài đặt các gói cần thiết:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv build-essential libpq-dev git curl
```

*(Kiểm tra phiên bản Python: yêu cầu Python 3.11 hoặc 3.12+)*:
```bash
python3 --version
```

---

## 2. Chuẩn bị môi trường Python & Cài đặt thư viện

Tại thư mục dự án `Boconic`:

```bash
# 1. Tạo môi trường ảo (virtual environment)
python3 -m venv .venv

# 2. Kích hoạt môi trường ảo
source .venv/bin/activate

# 3. Nâng cấp pip và cài đặt dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 3. Cấu hình biến môi trường (.env)

Tạo tệp `.env` từ mẫu có sẵn:

```bash
cp .env.example .env
nano .env   # hoặc vim / gedit
```

Các thông số quan trọng cần lưu ý trong `.env`:
- `DATABASE_URL`:
  - Mặc định sử dụng SQLite cục bộ: `sqlite+aiosqlite:///./data/boconic.db` (không cần cài đặt database ngoài).
  - Hoặc nếu dùng PostgreSQL: `postgresql+asyncpg://boconic:password@localhost:5432/boconic`.
- `BOT_TOKEN`: Token Telegram Bot từ @BotFather.
- `BOT_USERNAME`: Username của Bot (ví dụ: `BoconicBot`).
- `ADMIN_USERNAME`: Username Telegram của Quản trị viên chính (ví dụ: `nhutnhd`).
- `ADMIN_TELEGRAM_ID`: ID số Telegram của Admin (nếu có).
- `SECRET_KEY`: Chuỗi bí mật ngẫu nhiên tối thiểu 32 ký tự.
- `BOT_API_KEY`: Khóa API bảo mật giữa Bot và FastAPI backend (tối thiểu 32 ký tự).

---

## 4. Khởi tạo Cơ sở dữ liệu & Tài khoản Quản trị viên (Setup)

Chạy kịch bản khởi tạo hệ thống tự động:

```bash
source .venv/bin/activate
python scripts/setup.py
```

Kịch bản này sẽ tự động:
1. Chạy toàn bộ **Alembic Migrations** tạo đầy đủ bảng và quan hệ dữ liệu.
2. Khởi tạo hệ thống **RBAC Roles & Permissions** (Super Admin, Librarian, Moderator, Member).
3. Tạo tài khoản **Super Admin mặc định**:
   - **Tài khoản**: `admin`
   - **Mật khẩu**: `Boconic@2026`

---

## 5. Khởi động hệ thống

### Cách 1: Sử dụng kịch bản khởi động tổng hợp (Khuyên dùng)
Kịch bản `start.sh` tự động kích hoạt môi trường và khởi chạy đồng thời:
1. FastAPI Backend & Admin Console (Port 8000)
2. Telegram Bot Gateway (Polling)
3. Background Outbox Job Worker

```bash
chmod +x start.sh
./start.sh
```

### Cách 2: Triển khai bằng Docker Compose
Nếu máy Ubuntu đã cài đặt Docker & Docker Compose:

```bash
# Khởi chạy toàn bộ hệ thống (FastAPI + PostgreSQL + Bot + Worker):
docker compose up -d --build

# Xem logs:
docker compose logs -f
```

### Cách 3: Chạy từng dịch vụ thủ công (Dành cho Debug / Phát triển)
Mở 3 terminal riêng biệt:

- **Terminal 1 — API & Admin Console**:
  ```bash
  source .venv/bin/activate
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

- **Terminal 2 — Telegram Bot**:
  ```bash
  source .venv/bin/activate
  python -m app.bot.main
  ```

- **Terminal 3 — Background Job Worker**:
  ```bash
  source .venv/bin/activate
  python -m app.jobs.worker
  ```

---

## 6. Kiểm tra & Xác nhận hệ thống

Sau khi khởi chạy, bạn có thể truy cập:
- **Giao diện Quản trị (Admin Console)**: `http://<IP_MAY_UBUNTU>:8000/admin`
  - Đăng nhập: `admin` / `Boconic@2026`
- **Tài liệu API (Swagger UI)**: `http://<IP_MAY_UBUNTU>:8000/docs`
- **Kiểm tra sức khỏe hệ thống (Health Check)**: `http://<IP_MAY_UBUNTU>:8000/health/live`

### Chạy kiểm thử tự động (Smoke Test & Unit Tests):
```bash
source .venv/bin/activate

# 1. Chạy End-to-End Smoke Test
python scripts/smoke_test.py

# 2. Chạy toàn bộ 64 Unit Tests
pytest tests/ -v
```

---

## 7. Cấu trúc thư mục sạch (Data-Clean State)

Thư mục này là bản sao mã nguồn nguyên bản, **hoàn toàn sạch dữ liệu**:
- Không chứa cơ sở dữ liệu cũ (`*.db`).
- Không chứa tệp lưu trữ/tải lên thử nghiệm (`data/storage/`, `data/backups/`).
- Không chứa tệp bộ nhớ cache (`__pycache__`, `.pytest_cache`).
- Toàn bộ tệp thực thi shell và cấu hình đã được chuẩn hóa định dạng dòng **Unix LF** để chạy mượt mà trên Ubuntu mà không bị lỗi ký tự `\r`.
