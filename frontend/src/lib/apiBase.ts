/** URL gốc backend (không có /api). Dev để trống → dùng proxy Vite cùng origin. */
export function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL?.trim() || '';
  return raw.replace(/\/$/, '');
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
