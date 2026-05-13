# V/J Sync

Nền tảng giao tiếp công sở (workspace, chat theo kênh, task, nhắc nhở) cho môi trường Việt–Nhật, có tích hợp AI qua OpenAI API.

Repo này là **monorepo**: **`backend/`** (API + WebSocket + PostgreSQL) và **`frontend/`** (React + Vite).

---

## Yêu cầu môi trường

| Phần mềm | Phiên bản gợi ý | Ghi chú |
|----------|-----------------|--------|
| [Node.js](https://nodejs.org/) | **20.x LTS** (tối thiểu 18.x) | Kèm `npm` |
| [PostgreSQL](https://www.postgresql.org/download/) | **14+** | Tạo database tên `vjsync` (hoặc đổi trong `DATABASE_URL`) |
| Tài khoản [OpenAI](https://platform.openai.com/) | — | Cần **API key** nếu dùng dịch / phân tích / tóm tắt |

---

## Clone repository

```bash
git clone <URL-repo-của-bạn>.git
cd VJ-Sync   # hoặc tên thư mục sau khi clone
```

---

## Cấu trúc thư mục (tóm tắt)

```
.
├── backend/                 # API Node.js (Express + TypeScript + Prisma)
│   ├── prisma/            # schema.prisma, init_schema.sql (tạo bảng thủ công)
│   ├── src/                 # mã nguồn server
│   └── .env.example         # mẫu biến môi trường → copy thành .env
├── frontend/                # SPA React (Vite + TypeScript)
│   ├── public/              # static (ví dụ: vj-logo.png)
│   └── src/
├── old/                     # **Archive**: mockup HTML + đặc tả cũ (không dùng khi chạy app)
│   └── README.md
└── README.md
```

---

## Backend — cài đặt và chạy

### 1. Tạo database PostgreSQL

Ví dụ (Windows có thể dùng `psql` hoặc pgAdmin):

```sql
CREATE DATABASE vjsync;
```

Hoặc CLI:

```bash
createdb vjsync
```

### 1b. Tạo bảng bằng `psql` (tùy chọn)

Nếu bạn muốn chạy script SQL thủ công thay vì `prisma migrate dev`, dùng file:

**[`backend/prisma/init_schema.sql`](backend/prisma/init_schema.sql)**

```bash
psql -U postgres -d vjsync -f backend/prisma/init_schema.sql
```

Sau đó vẫn chạy `npx prisma generate`. **Không** cần `prisma migrate dev` nếu DB đã có đủ bảng — có thể bỏ qua bước migration lần đầu, hoặc sau này dùng `prisma migrate diff` để đồng bộ lịch sử migration nếu nhóm dùng Prisma migrate nghiêm ngặt.

### 2. Cấu hình biến môi trường

Trong thư mục `backend/`:

```bash
cd backend
copy .env.example .env    # Windows CMD
# hoặc: cp .env.example .env   # macOS / Linux / Git Bash
```

Mở **`backend/.env`** và chỉnh tối thiểu các dòng sau:

| Biến | Ý nghĩa | Ví dụ |
|------|---------|--------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://postgres:MẬT_KHẨU@localhost:5432/vjsync?schema=public` |
| `JWT_SECRET` | Khóa ký JWT | Chuỗi dài, ngẫu nhiên (production **bắt buộc** đổi) |
| `OPENAI_API_KEY` | Khóa OpenAI | `sk-...` |
| `PORT` | Cổng API | `3001` |
| `CLIENT_URL` | Origin của frontend (CORS) | Development: `http://localhost:5173` |

**Lưu ý:** Không commit file `backend/.env` (đã có trong `.gitignore`).

### 3. Cài package và migration

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
```

- Lần đầu: `migrate dev` tạo bảng theo `prisma/schema.prisma`.
- Nếu chỉ cần client sau khi pull code: `npx prisma generate`.

### 4. Chạy development

```bash
npm run dev
```

- API mặc định: **http://localhost:3001**
- Kiểm tra nhanh: **GET** `http://localhost:3001/api/health` → JSON `{ "status": "ok", ... }`.

### Lệnh npm hữu ích (backend)

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy server dev (ts-node-dev) |
| `npm run build` | Build TypeScript → `dist/` |
| `npm start` | Chạy bản build (`node dist/index.js`) |
| `npx prisma studio` | GUI xem/sửa dữ liệu |

---

## Frontend — cài đặt và chạy

### 1. Cài package

```bash
cd frontend
npm install
```

### 2. Chạy development

```bash
npm run dev
```

- Ứng dụng: **http://localhost:5173**
- Trong `vite.config.ts` đã cấu hình **proxy** `/api` và `/uploads` sang backend `http://localhost:3001`, nên frontend gọi API đường dẫn tương đối `/api/...` là đủ khi dev.

### Lệnh npm hữu ích (frontend)

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server Vite |
| `npm run build` | Build production → `dist/` |
| `npm run preview` | Xem thử bản build |

---

## Chạy full stack (hai terminal)

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Mở trình duyệt: **http://localhost:5173** → đăng ký / đăng nhập → dùng workspace, chat, task, v.v.

---

## WebSocket (chat real-time)

Client Socket.IO kết nối qua cùng origin khi dev (proxy). Đảm bảo backend đang chạy và `CLIENT_URL` trong `backend/.env` trùng với URL frontend (mặc định `http://localhost:5173`).

---

## Xử lý sự cố thường gặp

- **`npm` không nhận lệnh:** Cài [Node.js LTS](https://nodejs.org/), đóng mở lại terminal / IDE.
- **Lỗi kết nối database:** Kiểm tra PostgreSQL đã bật, `DATABASE_URL` đúng user/password/port/tên DB.
- **Migration lỗi:** Xóa DB test và tạo lại, hoặc dùng `npx prisma migrate reset` (⚠️ mất dữ liệu cục bộ).
- **CORS / cookie:** `CLIENT_URL` phải khớp URL bạn mở frontend; không trộn `127.0.0.1` và `localhost` nếu cookie strict.
- **AI không hoạt động:** Kiểm tra `OPENAI_API_KEY` hợp lệ và có quota.

---

## Công nghệ sử dụng

- **Frontend:** React 18, TypeScript, Vite, React Router, Zustand, Axios, Socket.IO Client  
- **Backend:** Express, TypeScript, Prisma ORM, PostgreSQL, JWT, Socket.IO, Multer  
- **AI:** OpenAI API (mô hình cấu hình trong code backend, ví dụ `gpt-4o-mini`)

---

## Giấy phép

Thêm file `LICENSE` nếu repo công khai cần quy định rõ bản quyền.
