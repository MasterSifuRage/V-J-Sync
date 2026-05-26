import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { syncChannelMembersFromHistory } from '../utils/channelMembers';

const prisma = new PrismaClient();

export const getChannels = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const channels = await prisma.channel.findMany({
    where: { workspaceId },
    include: { _count: { select: { members: true, messages: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ channels });
};

export const createChannel = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên kênh.' });

  const channel = await prisma.channel.create({
    data: {
      workspaceId, name, description,
      isPrivate: isPrivate || false,
      createdById: req.user!.id,
      members: { create: { userId: req.user!.id } },
    },
  });
  return res.status(201).json({ channel });
};

export const getChannelDetail = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } } },
      _count: { select: { messages: true, members: true } },
    },
  });
  if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });

  await syncChannelMembersFromHistory(prisma, channel.id, channel.name, channel.createdById);

  const refreshed = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      members: { include: { user: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } } },
      _count: { select: { messages: true, members: true } },
    },
  });

  return res.json({ channel: refreshed ?? channel });
};
