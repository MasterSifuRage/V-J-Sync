# V/J Sync

Nền tảng giao tiếp công sở Việt–Nhật: workspace, chat, task, nhắc nhở, AI dịch/tóm tắt.

Monorepo: **`backend/`** (Express + Prisma + PostgreSQL) · **`frontend/`** (React + Vite)

## Yêu cầu

| Công cụ | Ghi chú |
|---------|---------|
| [Node.js](https://nodejs.org/) 20 LTS (≥18) | Kèm `npm` |
| [PostgreSQL](https://www.postgresql.org/download/) 14+ | Service phải đang chạy |
| [Ollama](https://ollama.com/download) | Tùy chọn — mặc định dùng cho AI; có thể thay bằng API cloud |
| [Git](https://git-scm.com/) | Clone repo |

## Cài đặt nhanh

```bash
git clone <URL-repo>.git
cd "VJ Sync"
```

### 1. PostgreSQL — tạo database rỗng

Prisma **không** tự tạo database, chỉ tạo bảng bên trong DB đã có.

**SQL (pgAdmin):**

```sql
CREATE DATABASE vjsync;
```

**Hoặc CLI:**

```bash
createdb -U postgres vjsync
# psql -U postgres -c "CREATE DATABASE vjsync;"
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # Windows CMD: copy .env.example .env
```

Sửa `DATABASE_URL` trong `.env` cho đúng user/password PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:MẬT_KHẨU@localhost:5432/vjsync?schema=public"
```

Cài package, đồng bộ schema (Prisma), seed dữ liệu demo:

```bash
npm install
npx prisma db push
npx prisma generate
npm run db:seed
```

> Bảng/cột: `prisma db push` đọc `prisma/schema.prisma` — **không cần** SQL tạo bảng hay `init_schema.sql`.  
> Nhóm dùng migration: thay `db push` bằng `npx prisma migrate dev`.

### 3. Frontend

```bash
cd ../frontend
npm install
```

### 4. Chạy dev

**Hai terminal:**

```bash
# Terminal 1
cd backend && npm run dev    # http://localhost:3001

# Terminal 2
cd frontend && npm run dev   # http://localhost:5173
```

**Hoặc một lệnh từ thư mục gốc:**

```bash
npm install && npm run dev   # chạy backend + frontend
```

Mở **http://localhost:5173** · Health check: `GET /api/health`

## Tài khoản demo

Mật khẩu chung: **`vj123456`**

| Email | Vai trò |
|-------|---------|
| `demo@vj.local` | Nhân viên |
| `manager@vj.local` | Quản lý |
| `admin@vj.local` | Admin |

## Cấu hình

File mẫu: [`backend/.env.example`](backend/.env.example) — không commit `backend/.env`.

| Biến | Mô tả |
|------|--------|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Khóa JWT (production: đổi giá trị mạnh) |
| `CLIENT_URL` | URL frontend, mặc định `http://localhost:5173` |
| `AI_PROVIDER` / `SUMMARIZE_PROVIDER` / `TRANSLATE_PROVIDER` | AI: mặc định `ollama` |
| `OLLAMA_BASE_URL` | Mặc định `http://127.0.0.1:11434` |

### AI — Ollama (mặc định)

```bash
ollama pull llama3.1
```

Giữ app Ollama chạy nền (port `11434`) khi dùng dịch/tóm tắt.

### AI — Cloud (không cần Ollama)

Ví dụ Gemini — sửa `backend/.env` rồi restart backend:

```env
AI_PROVIDER=gemini
SUMMARIZE_PROVIDER=gemini
TRANSLATE_PROVIDER=gemini
GEMINI_API_KEY="your-key"
GEMINI_MODEL="gemini-2.0-flash"
```

Dịch qua DeepL: `TRANSLATE_PROVIDER=deepl` + `DEEPL_API_KEY`. Xem thêm comment trong `.env.example`.

## Scripts

| Lệnh | Thư mục | Mô tả |
|------|---------|--------|
| `npm run dev` | `backend` / `frontend` / gốc | Dev server |
| `npm run build` | `backend` / `frontend` | Build production |
| `npm run db:seed` | `backend` | Seed/cập nhật data demo |
| `npx prisma db push` | `backend` | Đồng bộ schema sau pull code |
| `npx prisma studio` | `backend` | GUI xem DB |

## Cấu trúc

```
backend/     API, prisma/, .env.example
frontend/    React SPA (Vite proxy /api → :3001)
old/         Mockup HTML cũ (không dùng khi chạy app)
```

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
|-------------|------------|
| `npm` lỗi trên PowerShell | Dùng CMD hoặc `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `Cannot find module ...` | `npm install` trong `backend/` và `frontend/` |
| Lỗi DB / đăng nhập 503 | Bật PostgreSQL, kiểm tra `DATABASE_URL`, chạy `npx prisma db push` + `npm run db:seed` |
| `The column ... does not exist` | `npx prisma db push` |
| AI không dịch được | Bật Ollama + `ollama pull llama3.1`, hoặc đổi sang API cloud trong `.env` |
| Cookie/CORS | Dùng nhất quán `localhost` (không trộn `127.0.0.1`) · `CLIENT_URL` khớp URL trình duyệt |

Sau `git pull`:

```bash
cd backend && npm install && npx prisma db push && npx prisma generate
cd ../frontend && npm install
```

## Tech stack

React · Vite · Express · Prisma · PostgreSQL · Socket.IO · Ollama / Gemini / DeepL

## License

LICENSE
