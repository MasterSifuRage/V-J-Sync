import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { countUnreadForWorkspace, markChatRead } from '../utils/chatUnread';
import { ensureChannelMemberOnChat } from '../utils/channelMembers';

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
  await ensureChannelMemberOnChat(prisma, channelId, req.user!.id);
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

export const getUnreadCounts = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = req.user!.id;
  const unread = await countUnreadForWorkspace(userId, workspaceId);
  return res.json(unread);
};

export const markChannelRead = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const userId = req.user!.id;

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true },
  });
  if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });

  await markChatRead(userId, channel.workspaceId, 'channel', channelId);
  return res.json({ ok: true });
};

export const markDmRead = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const peerUserId = routeParam(req.params.userId);
  const userId = req.user!.id;

  await markChatRead(userId, workspaceId, 'dm', peerUserId);
  return res.json({ ok: true });
};
