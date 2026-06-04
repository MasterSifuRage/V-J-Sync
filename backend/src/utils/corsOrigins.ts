/** CLIENT_URL có thể nhiều origin, phân tách bằng dấu phẩy (Vercel preview + production). */
export function getAllowedClientOrigins(): string[] {
  const raw =
    process.env.CLIENT_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:5173';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : ['http://localhost:5173'];
}

export function isClientOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return getAllowedClientOrigins().includes(origin);
}
