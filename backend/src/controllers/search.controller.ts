import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

export const globalSearch = async (req: AuthRequest, res: Response) => {
  const { q, workspaceId } = req.query;
  if (!q || !workspaceId) return res.status(400).json({ error: 'Thiếu từ khóa hoặc workspaceId.' });

  const query = q as string;
  const wsId = workspaceId as string;

  const [messages, tasks, reminders] = await Promise.all([
    prisma.message.findMany({
      where: {
        channel: { workspaceId: wsId },
        content: { contains: query, mode: 'insensitive' },
      },
      include: { sender: { select: { id: true, name: true } }, channel: { select: { id: true, name: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: {
        workspaceId: wsId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { assignee: { select: { id: true, name: true } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reminder.findMany({
      where: {
        workspaceId: wsId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return res.json({ messages, tasks, reminders });
};
