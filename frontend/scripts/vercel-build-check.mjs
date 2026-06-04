/** Fail Vercel build nếu thiếu VITE_API_URL (tránh deploy frontend không gọi được backend). */
const url = process.env.VITE_API_URL?.trim();
if (!url) {
  console.error(
    '\n[Vercel] Thiếu VITE_API_URL.\n' +
      '  Settings → Environment Variables → VITE_API_URL = https://your-backend.up.railway.app\n' +
      '  (không thêm /api ở cuối). Sau đó Redeploy.\n',
  );
  process.exit(1);
}
console.log('[Vercel] VITE_API_URL OK:', url.replace(/\/$/, ''));
