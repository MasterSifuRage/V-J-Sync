import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';

const prisma = new PrismaClient();

export const getMessages = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { channelId },
      include: { sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
      orderBy: { createdAt: 'asc' },
      skip, take: limit,
    }),
    prisma.message.count({ where: { channelId } }),
  ]);

  return res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
};

export const createMessage = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const { content, parentId, fileUrl, fileName, fileType } = req.body;
  if (!content && !fileUrl) return res.status(400).json({ error: 'Nội dung tin nhắn không được trống.' });

  const message = await prisma.message.create({
    data: { channelId, senderId: req.user!.id, content: content || '', parentId, fileUrl, fileName, fileType: fileType || 'text' },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
  });
  return res.status(201).json({ message });
};

export const getDMs = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = routeParam(req.params.userId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const messages = await prisma.directMessage.findMany({
    where: {
      workspaceId,
      OR: [
        { senderId: req.user!.id, receiverId: userId },
        { senderId: userId, receiverId: req.user!.id },
      ],
    },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
    orderBy: { createdAt: 'asc' },
    skip, take: limit,
  });
  return res.json({ messages });
};

export const createDM = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = routeParam(req.params.userId);
  const { content, fileUrl, fileName } = req.body;

  const dm = await prisma.directMessage.create({
    data: { workspaceId, senderId: req.user!.id, receiverId: userId, content: content || '', fileUrl, fileName },
    include: { sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
  });
  return res.status(201).json({ message: dm });
};
