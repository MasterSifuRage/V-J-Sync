# V/J Sync

Nền tảng giao tiếp công sở **Việt–Nhật** tích hợp workspace, chat real-time, quản lý task, nhắc nhở và AI dịch/tóm tắt. Dự án thể hiện kỹ năng xây dựng ứng dụng web real-time, thiết kế API RESTful, tích hợp AI đa provider và xử lý đa ngôn ngữ trong môi trường làm việc quốc tế.

---

## Tổng Quan

**V/J Sync** là monorepo gồm backend API và frontend SPA, phục vụ đội ngũ làm việc song ngữ Việt–Nhật. Người dùng có thể chat theo kênh hoặc tin nhắn riêng, quản lý công việc, đặt nhắc nhở, và sử dụng AI để dịch hoặc tóm tắt nội dung — tất cả trong một workspace thống nhất.

| Thông Tin | Chi Tiết |
|-----------|----------|
| **Frontend** | React 18, TypeScript, Vite, Zustand |
| **Backend** | Node.js, Express 4, TypeScript |
| **Cơ Sở Dữ Liệu** | PostgreSQL, Prisma ORM |
| **Real-time** | Socket.IO |
| **AI** | Ollama (mặc định), Google Gemini, DeepL |
| **Đa Ngôn Ngữ** | Tiếng Việt, Tiếng Nhật (i18next) |
| **Kiến Trúc** | Monorepo (`backend/` + `frontend/`) |

---

## Tính Năng

- **Xác thực & phân quyền** — đăng ký, đăng nhập JWT, RBAC theo workspace (Giám đốc / Quản lý / Nhân viên / Khách)
- **Workspace đa tổ chức** — tạo và chuyển đổi giữa nhiều workspace
- **Chat real-time** — kênh công khai, tin nhắn riêng (DM), thread, ghim, đính kèm file
- **Quản lý Task** — CRUD, trạng thái/ưu tiên/tag, gán người, bình luận, liên kết kênh chat
- **Nhắc nhở** — tạo và theo dõi reminder cho bản thân hoặc đồng nghiệp
- **Dashboard** — thống kê hoạt động, feed cập nhật theo workspace
- **Tìm kiếm toàn cục** — tra cứu tin nhắn, task, reminder
- **AI Dịch & Tóm tắt** — dịch Việt↔Nhật, tóm tắt task/chat, gợi ý nội dung (Ollama/Gemini/DeepL)
- **Giao diện song ngữ** — UI và nội dung hỗ trợ chuyển đổi Việt/Nhật theo preference người dùng

---

## Kiến Trúc Dự Án

```
V-J-Sync/
├── backend/
│   ├── prisma/          # Schema & seed
│   └── src/
│       ├── controllers/ # Auth, Chat, Task, AI, ...
│       ├── routes/      # API routers
│       ├── services/    # AI, translate, summarize
│       ├── socket/      # Socket.IO handlers
│       └── middlewares/ # Auth, RBAC, error
├── frontend/
│   └── src/
│       ├── pages/       # Chat, Tasks, Reminders, ...
│       ├── components/  # Layout, guards
│       ├── store/       # Zustand state
│       └── i18n/        # Locale vi/ja
└── package.json         # Chạy cả hai cùng lúc
```

```mermaid
flowchart TB
    subgraph client [Frontend React]
        SPA[Vite SPA :5173]
    end

    subgraph server [Backend Express]
        API[REST API :3001]
        Socket[Socket.IO]
        AI[AI Services]
    end

    subgraph data [Data Layer]
        DB[(PostgreSQL)]
        Ollama[Ollama :11434]
        Cloud[Gemini / DeepL]
    end

    SPA -->|HTTP /api| API
    SPA -->|WebSocket| Socket
    API --> DB
    Socket --> DB
    AI --> Ollama
    AI --> Cloud
    API --> AI
```

---

## Điểm Kỹ Thuật Nổi Bật

### 1. Real-time Chat với Socket.IO

Tin nhắn kênh và DM được đẩy real-time qua WebSocket. Hỗ trợ thread, ghim tin, đánh dấu đã đọc và upload file đính kèm.

### 2. AI Đa Provider

Backend trừu tượng hóa AI qua service layer — mặc định dùng **Ollama** chạy local, có thể chuyển sang **Google Gemini** hoặc **DeepL** chỉ bằng cách đổi biến môi trường, không cần sửa code.

### 3. Prisma ORM & RBAC

Schema Prisma mô hình hóa quan hệ User–Workspace–Channel–Message–Task–Reminder. Phân quyền kiểm soát ở middleware layer với role-based access control.

### 4. Dịch Thuật Thông Minh

Cache bản dịch, queue xử lý LLM, và dịch theo ngôn ngữ ưu tiên của từng user — tối ưu cho môi trường làm việc Việt–Nhật.

---

## Yêu Cầu Hệ Thống

- **Node.js 20 LTS** (≥ 18)
- **PostgreSQL 14+** đang chạy
- **Ollama** (khuyến nghị — AI dịch/tóm tắt local)
- **Git**

---

## Cách Chạy Dự Án

### Bước 1: Tạo Database

```sql
CREATE DATABASE vjsync;
```

### Bước 2: Cấu hình Backend

```bash
cd backend
cp .env.example .env
```

Sửa `DATABASE_URL` trong `.env`:

```env
DATABASE_URL="postgresql://postgres:MẬT_KHẨU@localhost:5432/vjsync?schema=public"
```

```bash
npm install
npx prisma db push
npx prisma generate
npm run db:seed
```

### Bước 3: Cài Ollama (khuyến nghị)

```bash
# Tải từ https://ollama.com/download hoặc:
brew install ollama          # macOS

ollama pull llama3.1
```

### Bước 4: Cài Frontend

```bash
cd ../frontend
npm install
```

### Bước 5: Chạy Dev

**Hai terminal:**

```bash
# Terminal 1
cd backend && npm run dev    # http://localhost:3001

# Terminal 2
cd frontend && npm run dev     # http://localhost:5173
```

**Hoặc một lệnh từ thư mục gốc:**

```bash
npm install && npm run dev
```

Mở **http://localhost:5173** · Health check: `GET /api/health`

---

## Tài Khoản Demo

Mật khẩu chung: **`vj123456`**

| Email | Vai Trò |
|-------|---------|
| `demo@vj.local` | Nhân viên |
| `manager@vj.local` | Quản lý |
| `admin@vj.local` | Admin / Giám đốc |

---

## Cấu Trúc Thư Mục

```
V-J-Sync/
├── README.md
├── package.json             # Scripts chạy monorepo
├── backend/
│   ├── prisma/schema.prisma # Database schema
│   ├── .env.example         # Mẫu cấu hình
│   └── src/                 # API source code
├── frontend/
│   ├── vite.config.ts       # Proxy /api → :3001
│   └── src/                 # React SPA
├── docs/                    # Tài liệu bổ sung
└── old/                     # Mockup HTML cũ (không dùng khi chạy)
```

---

## Cấu Hình

File mẫu: [`backend/.env.example`](backend/.env.example)

| Biến | Mô Tả |
|------|--------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Khóa ký JWT (production: đổi giá trị mạnh) |
| `CLIENT_URL` | URL frontend, mặc định `http://localhost:5173` |
| `AI_PROVIDER` | Provider AI: `ollama` (mặc định), `gemini` |
| `OLLAMA_BASE_URL` | Mặc định `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Mặc định `llama3.1:latest` |

| Service | Port |
|---------|------|
| Backend API | 3001 |
| Frontend (Vite) | 5173 |
| Ollama | 11434 |
| PostgreSQL | 5432 |

---

## Scripts Hữu Ích

| Lệnh | Thư Mục | Mô Tả |
|------|---------|--------|
| `npm run dev` | gốc / backend / frontend | Dev server |
| `npm run build` | backend / frontend | Build production |
| `npm run db:seed` | backend | Seed dữ liệu demo |
| `npx prisma db push` | backend | Đồng bộ schema sau pull code |
| `npx prisma studio` | backend | GUI xem database |

---

## Kỹ Năng Thể Hiện Qua Dự Án

- **Real-time Web App:** Socket.IO cho chat live, event-driven architecture
- **REST API Design:** Express + TypeScript, middleware auth/RBAC, file upload
- **Database Modeling:** Prisma schema, quan hệ phức tạp, seed data
- **AI Integration:** Multi-provider abstraction (Ollama/Gemini/DeepL), translation cache
- **i18n & Cross-cultural UX:** Giao diện và nội dung song ngữ Việt–Nhật
- **Monorepo Management:** Concurrently chạy backend + frontend, shared workflow
- **Frontend Architecture:** React + Zustand state, protected routes, API service layer

---

## Hướng Phát Triển

- [ ] Cron job tự động gửi reminder theo lịch
- [ ] Thông báo push/email khi có tin nhắn mới
- [ ] Video call tích hợp trong workspace
- [ ] Deploy production (Docker + CI/CD)
- [ ] Mở rộng unit test và E2E test coverage

---

## Xử Lý Sự Cố

| Triệu Chứng | Cách Xử Lý |
|-------------|------------|
| Lỗi kết nối DB | Bật PostgreSQL, kiểm tra `DATABASE_URL`, chạy `npx prisma db push` |
| AI không dịch được | Mở Ollama app → `ollama pull llama3.1` → kiểm tra port 11434 |
| `Cannot find module` | `npm install` trong cả `backend/` và `frontend/` |
| Cookie/CORS lỗi | Dùng nhất quán `localhost` (không trộn `127.0.0.1`) |

Sau `git pull`:

```bash
cd backend && npm install && npx prisma db push && npx prisma generate
cd ../frontend && npm install
```

---

## Giấy Phép

Xem file [LICENSE](LICENSE).
