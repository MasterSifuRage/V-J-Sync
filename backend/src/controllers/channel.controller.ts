import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { canUseChannel, isGeneralChannelName, syncChannelMembersFromHistory } from '../utils/channelMembers';
import { getSocketIo } from '../socket/ioInstance';

const prisma = new PrismaClient();

export const getChannels = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    select: { id: true },
  });
  if (!workspaceMember) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });

  const channels = await prisma.channel.findMany({
    where: {
      workspaceId,
      OR: [
        { name: 'general' },
        { createdById: req.user!.id },
        { members: { some: { userId: req.user!.id } } },
      ],
    },
    include: { _count: { select: { members: true, messages: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ channels });
};

export const createChannel = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên kênh.' });
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: req.user!.id } },
    select: { id: true },
  });
  if (!workspaceMember) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });

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
  if (!(await canUseChannel(prisma, req.user!.id, channel.id))) {
    return res.status(403).json({ error: 'Bạn không thuộc nhóm chat này.' });
  }

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
  if (isGeneralChannelName(channel.name)) {
    return res.status(400).json({ error: 'Kênh general đã gồm tất cả thành viên.' });
  }
  if (!(await canUseChannel(prisma, req.user!.id, channel.id))) {
    return res.status(403).json({ error: 'Bạn không thuộc nhóm chat này.' });
  }

  const targetMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId } },
    select: { id: true },
  });
  if (!targetMember) return res.status(400).json({ error: 'Thành viên không thuộc workspace này.' });

  const member = await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId },
    update: {},
    include: { user: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } } },
  });

  return res.status(201).json({ member });
};

export const removeChannelMember = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const targetUserId = req.params.userId === 'me' ? req.user!.id : routeParam(req.params.userId);

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, workspaceId: true, createdById: true },
  });
  if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });
  if (isGeneralChannelName(channel.name)) {
    return res.status(400).json({ error: 'Không thể rời hoặc xóa thành viên khỏi kênh general.' });
  }

  const requesterMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId: req.user!.id } },
    select: { id: true },
  });
  if (!requesterMember) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });

  const isOwner = channel.createdById === req.user!.id;
  const isSelf = targetUserId === req.user!.id;
  if (!isOwner && !isSelf) {
    return res.status(403).json({ error: 'Bạn không có quyền xóa thành viên khỏi nhóm chat này.' });
  }
  if (targetUserId === channel.createdById) {
    return res.status(400).json({ error: 'Người tạo nhóm không thể bị đuổi. Hãy xóa nhóm chat nếu cần.' });
  }

  const removed = await prisma.channelMember.deleteMany({
    where: { channelId, userId: targetUserId },
  });
  if (removed.count === 0) {
    return res.status(404).json({ error: 'Thành viên không thuộc nhóm chat này.' });
  }

  getSocketIo()?.to(`channel:${channelId}`).emit('channel_member_removed', {
    channelId,
    userId: targetUserId,
  });
  return res.json({ ok: true });
};

export const deleteChannel = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, workspaceId: true, createdById: true },
  });
  if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });
  if (isGeneralChannelName(channel.name)) {
    return res.status(400).json({ error: 'Không thể xóa kênh general.' });
  }

  const requesterMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId: req.user!.id } },
    select: { id: true },
  });
  if (!requesterMember) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });
  if (channel.createdById !== req.user!.id) {
    return res.status(403).json({ error: 'Chỉ người tạo nhóm chat mới có quyền xóa nhóm.' });
  }

  await prisma.channel.delete({ where: { id: channelId } });
  getSocketIo()?.to(`channel:${channelId}`).emit('channel_deleted', { channelId });
  return res.json({ ok: true });
};
