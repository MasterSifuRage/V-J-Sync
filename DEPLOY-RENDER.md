# Deploy V/J Sync trên Render (database online + 1 link app)

Hướng dẫn deploy **một lần** — PostgreSQL **lưu dữ liệu lâu dài** trên cloud, frontend + backend + chat trên **một URL**.

---

## Bạn sẽ có gì sau khi xong?

| Thành phần | Trên Render |
|------------|-------------|
| PostgreSQL | Database `vjsync-db` — dữ liệu user, chat, task, nhắc nhở **lưu online** |
| Web Service `vjsync` | API + Socket.IO + giao diện React |
| URL truy cập | `https://vjsync-xxxx.onrender.com` |

Không cần Vercel. Không lỗi 405 (cùng một domain).

---

## Chuẩn bị (trên máy)

### 1. Đẩy code lên GitHub

```bash
cd "/Users/ductwan/Developer/ITSS nhat/V-J-Sync"
git add .
git commit -m "Add Render deploy config"
git push origin Project_Update
```

(Đổi tên nhánh nếu bạn dùng nhánh khác.)

### 2. AI (tùy chọn — **không bắt buộc Gemini**)

| Bạn muốn | Làm gì |
|----------|--------|
| **Không dùng AI** | Bỏ qua bước API key — vẫn deploy được (xem bên dưới) |
| **Dịch / tóm tắt bằng Gemini** | Tạo key tại [Google AI Studio](https://aistudio.google.com/apikey) |
| **Chỉ dịch (DeepL)** | Thêm `DEEPL_API_KEY` + `TRANSLATE_PROVIDER=deepl` trên Render sau deploy |

> Render **không** chạy Ollama trên server free. Ollama chỉ dùng được nếu bạn có URL Ollama public (ngrok, VPS riêng) — không khuyến nghị lúc đầu.

---

## Bước 1 — Tạo Blueprint trên Render

1. Mở **[dashboard.render.com](https://dashboard.render.com)** → đăng nhập (GitHub).
2. **New +** → **Blueprint**.
3. Connect repository **V-J-Sync** (org/user `MasterSifuRage`).
4. Render đọc file **`render.yaml`** ở root repo.
5. Bạn sẽ thấy tạo:
   - **Database** `vjsync-db` (PostgreSQL)
   - **Web Service** `vjsync`

### Biến môi trường khi deploy

| Biến | Bắt buộc? |
|------|-----------|
| `DATABASE_URL`, `JWT_SECRET` | Render **tự gán** từ Blueprint |
| `GEMINI_API_KEY` | **Không** — file `render.yaml` hiện tại không yêu cầu |

Nếu màn hình Blueprint vẫn hỏi `GEMINI_API_KEY` (bản cũ): để **trống** hoặc bấm **Skip** nếu có.

6. Bấm **Apply** / **Deploy Blueprint** → đợi **10–15 phút** (build frontend + backend lần đầu).

---

## Không dùng Gemini — app vẫn chạy gì?

| Có | Không (cần AI sau) |
|----|---------------------|
| Đăng nhập / đăng ký | Nút **Dịch** tin nhắn |
| Chat (gửi/nhận tin) | Tóm tắt AI công việc |
| Task, nhắc nhở, workspace | Dịch tự động mô tả |
| **Database lưu online** | |

Log backend có thể ghi: *Chưa cấu hình AI* — bình thường.

### Bật Gemini sau (không cần deploy lại Blueprint)

Render → **vjsync** → **Environment** → thêm:

```env
GEMINI_API_KEY=your-key
AI_PROVIDER=gemini
SUMMARIZE_PROVIDER=gemini
TRANSLATE_PROVIDER=gemini
GEMINI_MODEL=gemini-2.0-flash
```

→ **Manual Deploy** → Redeploy.

### Chỉ dịch bằng DeepL (không Gemini)

```env
TRANSLATE_PROVIDER=deepl
DEEPL_API_KEY=your-deepl-key
```

(Tóm tắt task vẫn cần Gemini/OpenAI/Ollama nếu bật auto-translate.)

---

## Bước 2 — Kiểm tra sau khi Live

1. Mở URL service (ví dụ `https://vjsync.onrender.com`).
2. Kiểm tra API: `https://vjsync.onrender.com/api/health`  
   → `{"status":"ok",...}`

### Tạo tài khoản admin để test (chọn 1 cách)

#### Cách 1 — Demo có sẵn (`db:seed`)

Lấy **External Database URL** từ Render → **vjsync-db** → Connect, chạy trên máy:

```bash
cd backend
export DATABASE_URL="postgresql://...dán-từ-render..."
npm run db:seed
```

| Email | Mật khẩu |
|-------|----------|
| `admin@vj.local` | `vj123456` |

Workspace: **V/J Sync Demo**

#### Cách 2 — Email/mật khẩu tự đặt (`create-admin`)

```bash
cd backend
export DATABASE_URL="postgresql://...dán-từ-render..."
export ADMIN_EMAIL="email-cua-ban@gmail.com"
export ADMIN_PASSWORD="mat-khau-test-123"
export ADMIN_NAME="Admin"
npm run create-admin
```

Đăng nhập link Render bằng email/mật khẩu vừa đặt.

#### Cách 3 — Shell trên Render

```bash
cd backend && npm run db:seed
```

Dữ liệu seed và mọi dữ liệu bạn tạo sau đó **nằm trong PostgreSQL Render** — không mất khi redeploy app (chỉ mất nếu xóa database).

---

## Database lưu online — giải thích ngắn

- **Render PostgreSQL** (`vjsync-db`): volume riêng, **không** reset khi bạn deploy lại code.
- Prisma `db push` chỉ **cập nhật bảng/cột**, không xóa dữ liệu có sẵn (trừ khi bạn đổi schema gây conflict — hiếm).
- **Không** xóa database trên dashboard nếu muốn giữ data.
- Backup: Render → Database → backups (tùy plan).

### Dùng Neon thay Render DB (tùy chọn)

Nếu Blueprint không tạo được Postgres free:

1. Dùng [Neon](https://neon.tech) → copy `DATABASE_URL`
2. Sửa `render.yaml`: xóa khối `databases:`, đặt `DATABASE_URL` với `sync: false`
3. Khi deploy, dán chuỗi Neon vào biến `DATABASE_URL`

Neon cũng **lưu online lâu dài**.

---

## Biến môi trường (Settings → Environment)

| Biến | Mô tả |
|------|--------|
| `DATABASE_URL` | Tự từ Postgres (hoặc Neon) |
| `JWT_SECRET` | Tự sinh — không đổi lung tung sau khi có user |
| `GEMINI_API_KEY` | Tùy chọn — chỉ khi bật AI |
| `SERVE_FRONTEND` | `1` — phục vụ React build |
| `RENDER_EXTERNAL_URL` | Render tự set — dùng cho CORS |
| `CLIENT_URL` | Tùy chọn — nếu trống, backend dùng `RENDER_EXTERNAL_URL` |

Sau khi sửa env → **Manual Deploy** → **Clear build cache & deploy**.

---

## Deploy lại sau khi sửa code

```bash
git push origin Project_Update
```

Render tự build lại (nếu bật Auto-Deploy). Hoặc **Manual Deploy** trên dashboard.

---

## Lưu ý Render free

| | |
|---|---|
| Cold start | ~30–60s lần đầu sau khi app ngủ (không ai truy cập ~15 phút) |
| Postgres free | Có thể có giới hạn / hết hạn theo chính sách Render — production nên plan trả phí hoặc Neon |
| Upload file | Thư mục `uploads/` trên server — redeploy có thể mất file upload (DB vẫn giữ metadata) |

---

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Build fail | **Logs** → lỗi `npm ci` / TypeScript — sửa code, push lại |
| `Can't reach database` | Đợi DB **Available**; kiểm tra `DATABASE_URL` |
| Đăng nhập 401/503 | Chạy `db:seed` trong Shell; kiểm tra `DATABASE_URL` |
| AI không dịch | Thêm/sửa `GEMINI_API_KEY`, redeploy |
| Trang trắng | Logs → `SERVE_FRONTEND=1`; build frontend có trong log |

---

## Cách khác: 2 service (API + static riêng)

File cũ 2 service vẫn mô tả trong git history; khuyến nghị dùng **`render.yaml` hiện tại (1 service + DB)** cho đơn giản.

Xem thêm: [DEPLOY.md](DEPLOY.md) (Docker local) · [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md).
