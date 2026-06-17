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

export const addChannelMember = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: 'Thiếu thành viên cần thêm.' });

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, workspaceId: true },
  });
  if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });
  if (channel.name.trim().toLowerCase() === 'general') {
    return res.status(400).json({ error: 'Kênh general đã gồm tất cả thành viên.' });
  }

  const [requesterMember, targetMember] = await Promise.all([
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId: req.user!.id } },
      select: { id: true },
    }),
    prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId } },
      select: { id: true },
    }),
  ]);
  if (!requesterMember) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });
  if (!targetMember) return res.status(400).json({ error: 'Thành viên không thuộc workspace này.' });

  const member = await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId },
    update: {},
    include: { user: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
  });

  return res.status(201).json({ member });
};
