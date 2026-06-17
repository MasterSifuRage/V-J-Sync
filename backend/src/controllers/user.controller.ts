import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, phone, department, preferredLanguage, translateToLanguage } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(department !== undefined && { department }),
      ...(preferredLanguage && { preferredLanguage }),
      ...(translateToLanguage === 'vi' || translateToLanguage === 'ja'
        ? { translateToLanguage }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      preferredLanguage: true,
      translateToLanguage: true,
      department: true,
      phone: true,
    },
  });

  return res.json({ user });
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn ảnh.' });

  const avatarUrl = `/uploads/${req.file.filename}`;
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl },
    select: { id: true, name: true, avatarUrl: true },
  });

  return res.json({ user });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { password: true },
  });
  if (!user) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });

  const validPassword = await bcrypt.compare(currentPassword, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password: hashedPassword },
  });

  return res.json({ message: 'Đã đổi mật khẩu thành công.' });
};
