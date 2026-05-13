import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';

const prisma = new PrismaClient();

export const getReminders = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { completed } = req.query;

  const where: any = {
    workspaceId,
    OR: [{ creatorId: req.user!.id }, { targetUserId: req.user!.id }],
  };
  if (completed !== undefined) where.isCompleted = completed === 'true';

  const reminders = await prisma.reminder.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      target: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { remindAt: 'asc' },
  });
  return res.json({ reminders });
};

export const createReminder = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { title, description, remindAt, tags, targetUserId } = req.body;
  if (!title || !remindAt) return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và thời gian nhắc nhở.' });

  const reminder = await prisma.reminder.create({
    data: {
      workspaceId, title, description,
      remindAt: new Date(remindAt),
      tags: tags || [],
      creatorId: req.user!.id,
      targetUserId,
    },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      target: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return res.status(201).json({ reminder });
};

export const getReminderDetail = async (req: AuthRequest, res: Response) => {
  const reminderId = routeParam(req.params.reminderId);
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      target: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  if (!reminder) return res.status(404).json({ error: 'Nhắc nhở không tồn tại.' });
  return res.json({ reminder });
};

export const updateReminder = async (req: AuthRequest, res: Response) => {
  const reminderId = routeParam(req.params.reminderId);
  const { title, description, remindAt, tags, isCompleted, targetUserId } = req.body;

  const reminder = await prisma.reminder.update({
    where: { id: reminderId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(remindAt && { remindAt: new Date(remindAt) }),
      ...(tags && { tags }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(targetUserId !== undefined && { targetUserId }),
    },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      target: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return res.json({ reminder });
};

export const deleteReminder = async (req: AuthRequest, res: Response) => {
  const reminderId = routeParam(req.params.reminderId);
  await prisma.reminder.delete({ where: { id: reminderId } });
  return res.json({ message: 'Đã xóa nhắc nhở.' });
};
