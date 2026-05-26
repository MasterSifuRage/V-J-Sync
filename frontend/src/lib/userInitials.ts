/** Lấy 1–2 chữ cái viết tắt từ tên hiển thị (đồng bộ với AppTopbar). */
export function getUserInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Màu nền ổn định theo tên — mỗi user một màu nhất quán. */
export function getAvatarColor(name?: string | null): string {
  const palette = [
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#ea580c',
    '#059669',
    '#0891b2',
    '#4f46e5',
    '#be123c',
  ];
  const s = name?.trim() || '?';
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}
