# Deploy V/J Sync

Hướng dẫn đưa app lên môi trường chạy thật (VPS, máy chủ nội bộ, hoặc Docker local).

## Kiến trúc production (khuyến nghị)

| Thành phần | Cách chạy |
|------------|-----------|
| PostgreSQL | Container `db` hoặc managed DB (Neon, Supabase, RDS) |
| API + Socket.IO + React build | Một container `app` (port **3001**) |
| AI | **Gemini / DeepL** trên cloud (dễ deploy). Ollama chỉ phù hợp VPS có GPU/RAM lớn hoặc chạy trên host |

Frontend build được phục vụ từ cùng origin với API → không cần cấu hình CORS phức tạp, Socket.IO dùng `window.location.origin`.

---

## Cách 1 — Docker Compose (nhanh nhất)

### Yêu cầu

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- File `.env.production` (copy từ mẫu)

### Các bước

```bash
cd V-J-Sync
cp .env.production.example .env.production
```

Sửa `.env.production`:

- `POSTGRES_PASSWORD` — mật khẩu DB mạnh
- `JWT_SECRET` — chuỗi ngẫu nhiên dài (≥ 32 ký tự)
- `CLIENT_URL` — URL người dùng truy cập, ví dụ `http://localhost:3001` hoặc `https://vj.example.com`
- `GEMINI_API_KEY` (hoặc cấu hình Ollama — xem bên dưới)

Chạy:

```bash
docker compose up --build -d
```

Mở trình duyệt: **http://localhost:3001** (hoặc port `APP_PORT` bạn đặt).

Health check: `GET http://localhost:3001/api/health`

### Tài khoản demo

Nếu `RUN_SEED=true` trong `.env.production`, sau lần chạy đầu đăng nhập bằng:

| Email | Mật khẩu |
|-------|----------|
| `admin@vj.local` | `vj123456` |
| `manager@vj.local` | `vj123456` |
| `demo@vj.local` | `vj123456` |

Đổi `RUN_SEED=false` sau khi đã seed xong.

### Lệnh hữu ích

```bash
docker compose logs -f app
docker compose down
docker compose down -v   # xóa cả volume DB (cẩn thận)
docker compose up --build -d app
```

### AI trên Docker

**Gemini (khuyến nghị production):**

```env
AI_PROVIDER=gemini
SUMMARIZE_PROVIDER=gemini
TRANSLATE_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.0-flash
```

**Ollama trên máy host** (Docker Desktop macOS/Windows):

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:latest
```

Trên Linux VPS: cài Ollama trên host, dùng `OLLAMA_BASE_URL=http://172.17.0.1:11434` hoặc network mode `host` (nâng cao).

---

## Cách 2 — VPS (Ubuntu) + Docker

1. Cài Docker trên VPS.
2. Clone repo, tạo `.env.production` với `CLIENT_URL=https://domain-cua-ban.com`.
3. `docker compose up --build -d`.
4. Đặt **Nginx** hoặc **Caddy** reverse proxy HTTPS → `localhost:3001`.

Ví dụ Caddy (`Caddyfile`):

```caddy
vj.example.com {
  reverse_proxy localhost:3001
}
```

Trong `.env.production`:

```env
CLIENT_URL=https://vj.example.com
TRUST_PROXY=1
```

Cookie JWT sẽ dùng `secure: true` khi `NODE_ENV=production`.

---

## Cách 3 — Tách dịch vụ (Railway / Render / Vercel)

| Phần | Gợi ý |
|------|--------|
| Database | [Neon](https://neon.tech), Supabase, Railway Postgres |
| Backend | Railway / Render Web Service — build `backend`, start `npm run start`, set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` |
| Frontend | Vercel/Netlify — build `frontend`, set env nếu API khác origin |

Khi **tách frontend/backend**:

- `CLIENT_URL` = URL frontend (ví dụ `https://app.vercel.app`)
- Frontend cần biến `VITE_API_URL` (nếu bạn bổ sung sau) hoặc proxy — hiện tại code dùng `/api` same-origin; tách host cần chỉnh `vite` + `api.ts` (chưa mặc định trong repo).

**Khuyến nghị:** dùng Docker một cổng (Cách 1/2) cho đến khi cần scale tách riêng.

---

## Cách 4 — Chạy thủ công trên server (không Docker)

```bash
# DB: PostgreSQL đã tạo database vjsync
cd backend
cp .env.example .env
# Sửa DATABASE_URL, JWT_SECRET, CLIENT_URL, AI keys
npm ci
npx prisma db push
npm run db:seed   # tùy chọn
npm run build
NODE_ENV=production SERVE_FRONTEND=1 HOST=0.0.0.0 node dist/index.js
```

Trước đó build frontend:

```bash
cd frontend
npm ci
npm run build
```

Đảm bảo thư mục `frontend/dist` nằm cạnh `backend/dist` như trong repo (backend đọc `../../frontend/dist`).

---

## Biến môi trường production

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DATABASE_URL` | Có | PostgreSQL |
| `JWT_SECRET` | Có | Đổi giá trị mạnh |
| `CLIENT_URL` | Có | URL gốc người dùng mở app (CORS + cookie) |
| `NODE_ENV` | Khuyến nghị | `production` |
| `SERVE_FRONTEND` | Docker / 1 cổng | `1` để phục vụ `frontend/dist` |
| `HOST` | Docker | `0.0.0.0` |
| `TRUST_PROXY` | Sau HTTPS proxy | `1` |
| `RUN_SEED` | Docker lần đầu | `true` rồi tắt |

Chi tiết AI: [`backend/.env.example`](backend/.env.example).

---

## Checklist trước go-live

- [ ] Đổi `JWT_SECRET` và `POSTGRES_PASSWORD`
- [ ] `CLIENT_URL` khớp domain HTTPS (không trộn `localhost` / IP nếu đã dùng domain)
- [ ] Tắt `RUN_SEED` sau khi khởi tạo xong (hoặc xóa tài khoản demo)
- [ ] Cấu hình AI cloud (Gemini/DeepL) nếu không có Ollama trên server
- [ ] Backup volume PostgreSQL (`pgdata`)
- [ ] Firewall: chỉ mở 80/443 (proxy), không expose 5432 ra internet

---

## Xử lý sự cố deploy

| Triệu chứng | Gợi ý |
|-------------|--------|
| 502 / không vào được | `docker compose logs app` — DB chưa sẵn sàng, sai `DATABASE_URL` |
| Đăng nhập không giữ session | `CLIENT_URL` sai scheme/host; HTTPS cần `TRUST_PROXY=1` |
| Socket chat không realtime | Proxy phải hỗ trợ WebSocket (`Upgrade`) tới port 3001 |
| AI lỗi trên server | Dùng Gemini API; Ollama trong container thường không có model |
| Trang trắng sau deploy | Kiểm tra `frontend/dist` có trong image; `SERVE_FRONTEND=1` |
