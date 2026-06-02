# V/J Sync

Nền tảng giao tiếp công sở Việt–Nhật: workspace, chat, task, nhắc nhở, AI dịch/tóm tắt.

Monorepo: **`backend/`** (Express + Prisma + PostgreSQL) · **`frontend/`** (React + Vite)

## Yêu cầu

| Công cụ | Ghi chú |
|---------|---------|
| [Node.js](https://nodejs.org/) 20 LTS (≥18) | Kèm `npm` |
| [PostgreSQL](https://www.postgresql.org/download/) 14+ | Service phải đang chạy |
| [Ollama](https://ollama.com/download) | **Khuyến nghị** — dịch/tóm tắt AI mặc định chạy local; có thể thay bằng Gemini/DeepL |
| [Git](https://git-scm.com/) | Clone repo |

## Cài đặt nhanh

```bash
git clone <URL-repo>.git
cd V-J-Sync
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

File `backend/.env` (copy từ `.env.example`) mặc định đã bật Ollama:

```env
AI_PROVIDER=ollama
SUMMARIZE_PROVIDER=ollama
TRANSLATE_PROVIDER=ollama
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.1:latest"
```

### 2b. Ollama — AI dịch & tóm tắt (khuyến nghị)

Project dùng Ollama **chạy trên máy bạn** (không phải cloud). Backend gọi `http://127.0.0.1:11434` khi dịch chat, mô tả task, nhắc nhở, v.v.

#### Cài Ollama

| Hệ điều hành | Cách cài |
|--------------|----------|
| **macOS** | Tải [ollama.com/download](https://ollama.com/download) hoặc `brew install ollama` |
| **Windows** | Tải installer từ [ollama.com/download](https://ollama.com/download), cài và mở app Ollama |
| **Linux** | `curl -fsSL https://ollama.com/install.sh \| sh` |

Sau khi cài, mở app **Ollama** (hoặc chạy service) để server lắng nghe port **11434**.

#### Tải model (bắt buộc lần đầu)

Model mặc định trong `.env` là `llama3.1:latest` (~5 GB):

```bash
ollama pull llama3.1
```

#### Kiểm tra Ollama đã sẵn sàng

```bash
ollama --version
ollama list                    # phải thấy llama3.1
curl http://127.0.0.1:11434/api/tags
```

Nếu lệnh cuối trả JSON có `models` → Ollama OK.

#### Khi chạy backend

Log khởi động nên có dạng:

```text
[V/J Sync] Ollama http://127.0.0.1:11434 model=llama3.1:latest
```

Nếu không có dòng trên hoặc dịch/tóm tắt lỗi → xem [Xử lý sự cố](#xử-lý-sự-cố) mục AI.

### 3. Frontend

```bash
cd ../frontend
npm install
```

### 4. Chạy dev

> Trước khi test **Dịch** / **tóm tắt AI**: đảm bảo Ollama đang chạy và đã `ollama pull llama3.1`.

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

Chi tiết cài đặt: mục **[2b. Ollama](#2b-ollama--ai-dịch--tóm-tắt-khuyến-nghị)** ở trên.

Tóm tắt:

1. Cài Ollama → mở app / service  
2. `ollama pull llama3.1`  
3. Giữ port `11434` chạy khi dev  
4. `backend/.env` giữ `AI_PROVIDER=ollama` và `OLLAMA_BASE_URL`

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
| AI không dịch được | Ollama: mở app → `ollama pull llama3.1` → `curl http://127.0.0.1:11434/api/tags`. Hoặc đổi `AI_PROVIDER` / `TRANSLATE_PROVIDER` sang Gemini/DeepL trong `.env` |
| `OLLAMA_HTTP_...` / connection refused | Ollama chưa chạy — macOS: mở Ollama; Linux: `ollama serve` |
| Model chưa có | `ollama list` trống → chạy `ollama pull llama3.1` (khớp `OLLAMA_MODEL` trong `.env`) |
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

