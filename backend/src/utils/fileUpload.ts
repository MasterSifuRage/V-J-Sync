import multer from 'multer';
import path from 'path';
import fs from 'fs';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Multer gửi tên file UTF-8 dưới dạng latin1 — chuyển lại để hiển thị đúng tiếng Việt/Nhật. */
export function decodeUploadedFileName(name: string): string {
  if (!name) return name;
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  } catch {
    return name;
  }
}

function diskStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join('uploads', subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const original = decodeUploadedFileName(file.originalname);
      const ext = path.extname(original) || '';
      const base = path.basename(original, ext).replace(/[^\w\u00C0-\u024F\u3040-\u30FF\u4E00-\u9FFF.-]+/g, '_').slice(0, 80);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base || 'file'}${ext}`);
    },
  });
}

export const avatarUpload = multer({
  storage: diskStorage(''),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const taskAttachmentUpload = multer({
  storage: diskStorage('tasks'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const chatAttachmentUpload = multer({
  storage: diskStorage('chat'),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function publicUploadUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/^\/+/, '')}`;
}
