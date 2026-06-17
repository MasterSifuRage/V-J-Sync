import multer from 'multer';
import path from 'path';
import fs from 'fs';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function diskStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join('uploads', subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const base = path.basename(file.originalname, ext).replace(/[^\w.-]+/g, '_').slice(0, 80);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
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

export function publicUploadUrl(relativePath: string): string {
  return `/uploads/${relativePath.replace(/^\/+/, '')}`;
}
