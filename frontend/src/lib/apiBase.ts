/** URL gốc backend (không có /api). Dev để trống → dùng proxy Vite cùng origin. */
export function apiOrigin(): string {
  let raw = import.meta.env.VITE_API_URL?.trim() || '';
  raw = raw.replace(/\/$/, '');
  if (raw && !/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  return raw;
}

/** baseURL cho axios — luôn kết thúc bằng /api */
export function axiosApiBaseURL(): string {
  const origin = apiOrigin();
  return origin ? `${origin}/api` : '/api';
}

/** Socket.IO server (cùng host với API) */
export function socketServerUrl(): string {
  const origin = apiOrigin();
  return origin || window.location.origin;
}

/** URL hiển thị cho file tĩnh backend (ví dụ /uploads/avatar.png). */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path?.trim()) return undefined;
  const normalized = path.trim();
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const relative = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const origin = apiOrigin();
  return origin ? `${origin}${relative}` : relative;
}
