import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const { name, phone, department, preferredLanguage } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(name && { name }),
      ...(phone !== undefined && { phone }),
      ...(department !== undefined && { department }),
      ...(preferredLanguage && { preferredLanguage }),
    },
    select: { id: true, name: true, email: true, avatarUrl: true, preferredLanguage: true, department: true, phone: true },
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
