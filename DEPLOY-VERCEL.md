# Deploy V/J Sync lên Vercel

Vercel phù hợp cho **frontend (React/Vite)**. App này còn **Express API + Socket.IO + PostgreSQL** — không chạy trọn trên Vercel serverless được.

## Kiến trúc đề xuất

```
[Vercel]  frontend (https://vj-sync.vercel.app)
              │  VITE_API_URL
              ▼
[Railway / Render]  backend (https://vj-sync-api.up.railway.app)
              │
              ▼
[Neon / Supabase]  PostgreSQL
```

| Phần | Nền tảng |
|------|----------|
| Frontend | **Vercel** |
| Backend + WebSocket | **Railway** hoặc **Render** (free tier có giới hạn) |
| Database | **Neon** (free PostgreSQL) |
| AI | **Gemini** / DeepL (không dùng Ollama trên Vercel) |

---

## Bước 1 — Database (Neon)

1. Tạo project tại [neon.tech](https://neon.tech).
2. Copy connection string dạng:
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
3. Đổi tên DB thành `vjsync` hoặc dùng DB mặc định — chỉ cần URL hợp lệ cho Prisma.

---

## Bước 2 — Backend (Railway)

### Tạo service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → chọn repo `V-J-Sync`.
2. **Settings** → **Root Directory**: `backend`
3. **Build Command** (hoặc Railway Nixpacks tự nhận):

   ```bash
   npm ci && npx prisma generate && npm run build
   ```

4. **Start Command**:

   ```bash
   npx prisma db push && npm run start
   ```

5. **Variables** (Railway → Variables):

   | Biến | Giá trị |
   |------|---------|
   | `DATABASE_URL` | Chuỗi Neon (ở trên) |
   | `JWT_SECRET` | Chuỗi ngẫu nhiên dài |
   | `NODE_ENV` | `production` |
   | `HOST` | `0.0.0.0` |
   | `PORT` | `${{PORT}}` (Railway tự inject) hoặc để trống nếu Railway set PORT |
   | `CLIENT_URL` | URL Vercel (bước 3), ví dụ `https://vj-sync.vercel.app` — có thể thêm preview: `https://vj-sync.vercel.app,https://vj-sync-xxx.vercel.app` |
   | `AI_PROVIDER` | `gemini` |
   | `SUMMARIZE_PROVIDER` | `gemini` |
   | `TRANSLATE_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | API key của bạn |
   | `GEMINI_MODEL` | `gemini-2.0-flash` |
   | `TRUST_PROXY` | `1` |

6. **Networking** → tạo **Public URL**, ví dụ `https://vj-sync-production.up.railway.app`
7. Chạy seed một lần (Railway shell hoặc local trỏ `DATABASE_URL`):

   ```bash
   cd backend && npm run db:seed
   ```

### Render (thay Railway)

- **New Web Service** → repo → Root: `backend`
- Build: `npm install && npx prisma generate && npm run build`
- Start: `npx prisma db push && npm run start`
- Thêm biến môi trường giống bảng trên.

---

## Bước 3 — Frontend (Vercel)

### Import project

1. [vercel.com](https://vercel.com) → **Add New Project** → import GitHub repo.
2. **Root Directory**: `frontend` (quan trọng).
3. Framework: **Vite** (tự nhận từ `frontend/vercel.json`).

### Environment Variables (Vercel → Settings → Environment Variables)

| Name | Value |
|------|--------|
| `VITE_API_URL` | URL public backend **không** có `/api` ở cuối, ví dụ `https://vj-sync-production.up.railway.app` |

Áp dụng cho **Production**, **Preview**, **Development**.

### Deploy

- **Deploy** → sau vài phút có URL dạng `https://vj-sync.vercel.app`

### Cập nhật backend

Quay lại Railway/Render, sửa `CLIENT_URL` đúng URL Vercel (HTTPS, không slash cuối):

```env
CLIENT_URL=https://vj-sync.vercel.app
```

Redeploy backend nếu cần.

---

## Bước 4 — Kiểm tra

1. Mở URL Vercel → trang đăng nhập.
2. `https://<backend>/api/health` → `{"status":"ok",...}`
3. Đăng nhập `admin@vj.local` / `vj123456` (nếu đã seed).
4. Mở **Chat** — tin nhắn realtime cần WebSocket tới backend (đã cấu hình qua `VITE_API_URL`).

---

## Deploy bằng Vercel CLI (tùy chọn)

```bash
cd frontend
npm i -g vercel
vercel login
vercel link
vercel env add VITE_API_URL production
# nhập URL Railway
vercel --prod
```

---

## Lỗi 405 khi đăng nhập trên Vercel

**Nguyên nhân:** Frontend gửi `POST /api/auth/login` lên **chính domain Vercel**. Vercel chỉ host file tĩnh → trả **405 Method Not Allowed** (không có API).

**Cách sửa:**

1. Deploy backend (Railway/Render) và có URL public, ví dụ `https://vj-sync-production.up.railway.app`
2. Vercel → Project → **Settings** → **Environment Variables**
3. Thêm:

   | Name | Value |
   |------|--------|
   | `VITE_API_URL` | `https://vj-sync-production.up.railway.app` |

   ⚠️ **Không** gõ `/api` ở cuối.

4. Chọn **Production** + **Preview** → Save
5. **Deployments** → ⋮ → **Redeploy** (bắt buộc — Vite nhúng biến lúc **build**)
6. Railway: `CLIENT_URL` = URL Vercel, ví dụ `https://vj-sync.vercel.app`

Kiểm tra backend: mở `https://<backend>/api/health` → `{"status":"ok",...}`

---

## Lưu ý

| Vấn đề | Giải thích |
|--------|------------|
| **Lỗi 405 đăng nhập** | Thiếu `VITE_API_URL` hoặc chưa Redeploy sau khi thêm biến |
| Chỉ deploy Vercel, không backend | API 404 / CORS — bắt buộc có backend riêng |
| Chat không realtime | Sai `VITE_API_URL` hoặc `CLIENT_URL` trên backend |
| Đăng nhập lỗi CORS | `CLIENT_URL` phải khớp chính xác origin Vercel (https) |
| Cookie / 401 | App dùng Bearer token trong `localStorage` — ổn cross-origin nếu CORS đúng |
| Ollama | Không chạy trên Vercel/Railway free — dùng Gemini |
| Upload file | Backend `uploads/` trên Railway — volume hoặc S3 (chưa có trên Vercel) |

---

## Tóm tắt biến môi trường

**Vercel (`frontend`):**

```env
VITE_API_URL=https://your-backend.up.railway.app
```

**Railway (`backend`):**

```env
DATABASE_URL=postgresql://...@neon.tech/...
JWT_SECRET=...
CLIENT_URL=https://your-app.vercel.app
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

Xem thêm deploy một máy (Docker): [DEPLOY.md](DEPLOY.md).
