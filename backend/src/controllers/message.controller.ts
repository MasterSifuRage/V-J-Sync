import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { countUnreadForWorkspace, markChatRead } from '../utils/chatUnread';
import { ensureChannelMemberOnChat } from '../utils/channelMembers';
import { getSocketIo } from '../socket/ioInstance';
import { canModerateAllChatMessages, getWorkspaceMember } from '../utils/workspaceRoles';

const prisma = new PrismaClient();

const senderSelect = { id: true, name: true, avatarUrl: true, preferredLanguage: true } as const;

function emitMessageStateUpdate(
  targetType: 'channel' | 'dm',
  message: {
    id: string;
    channelId?: string;
    workspaceId?: string;
    senderId?: string;
    receiverId?: string;
    isPinned: boolean;
    pinnedByUserId: string | null;
    isHidden: boolean;
    hiddenByUserId: string | null;
  },
) {
  const io = getSocketIo();
  if (!io) return;

  const payload = {
    targetType,
    messageId: message.id,
    isPinned: message.isPinned,
    pinnedByUserId: message.pinnedByUserId,
    isHidden: message.isHidden,
    hiddenByUserId: message.hiddenByUserId,
  };

  if (targetType === 'channel' && message.channelId) {
    io.to(`channel:${message.channelId}`).emit('message_state_updated', {
      ...payload,
      channelId: message.channelId,
    });
    return;
  }

  if (targetType === 'dm' && message.senderId && message.receiverId) {
    const roomId = [message.senderId, message.receiverId].sort().join(':');
    io.to(`dm:${roomId}`).emit('message_state_updated', {
      ...payload,
      workspaceId: message.workspaceId,
      senderId: message.senderId,
      receiverId: message.receiverId,
    });
  }
}

export const getMessages = async (req: AuthRequest, res: Response) => {
  const channelId = routeParam(req.params.channelId);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { channelId },
      include: { sender: { select: senderSelect } },
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
    include: { sender: { select: senderSelect } },
  });
  await ensureChannelMemberOnChat(prisma, channelId, req.user!.id);
  return res.status(201).json({ message });
};

export const getDMs = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = routeParam(req.params.userId);
  const viewerId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const messages = await prisma.directMessage.findMany({
    where: {
      workspaceId,
      OR: [
        { senderId: viewerId, receiverId: userId },
        { senderId: userId, receiverId: viewerId },
      ],
    },
    include: { sender: { select: senderSelect } },
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
    include: { sender: { select: senderSelect } },
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

export const updateMessageState = async (req: AuthRequest, res: Response) => {
  const targetType = routeParam(req.params.targetType);
  const targetId = routeParam(req.params.targetId);
  const userId = req.user!.id;
  const { isPinned, isHidden } = req.body as { isPinned?: boolean; isHidden?: boolean };

  if (targetType !== 'channel' && targetType !== 'dm') {
    return res.status(400).json({ error: 'Loại tin nhắn không hợp lệ.' });
  }
  if (typeof isPinned !== 'boolean' && typeof isHidden !== 'boolean') {
    return res.status(400).json({ error: 'Thiếu trạng thái cần cập nhật.' });
  }

  if (targetType === 'channel') {
    const existing = await prisma.message.findUnique({ where: { id: targetId } });
    if (!existing) return res.status(404).json({ error: 'Tin nhắn không tồn tại.' });

    const channel = await prisma.channel.findUnique({
      where: { id: existing.channelId },
      select: { workspaceId: true },
    });
    if (!channel) return res.status(404).json({ error: 'Kênh không tồn tại.' });

    const member = await getWorkspaceMember(userId, channel.workspaceId);
    if (!member) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });
    const canModerate = canModerateAllChatMessages(member.roleId);

    const data: Record<string, unknown> = {};

    if (typeof isPinned === 'boolean') {
      if (isPinned) {
        data.isPinned = true;
        data.pinnedByUserId = userId;
      } else if (!canModerate && existing.pinnedByUserId !== userId) {
        return res.status(403).json({ error: 'Chỉ người ghim mới có thể bỏ ghim tin nhắn này.' });
      } else {
        data.isPinned = false;
        data.pinnedByUserId = null;
      }
    }

    if (typeof isHidden === 'boolean') {
      if (isHidden) {
        data.isHidden = true;
        data.hiddenByUserId = userId;
      } else if (!canModerate && existing.hiddenByUserId !== userId) {
        return res.status(403).json({ error: 'Chỉ người ẩn mới có thể hiện lại tin nhắn này.' });
      } else {
        data.isHidden = false;
        data.hiddenByUserId = null;
      }
    }

    const message = await prisma.message.update({
      where: { id: targetId },
      data,
      include: { sender: { select: senderSelect } },
    });

    emitMessageStateUpdate('channel', {
      id: message.id,
      channelId: message.channelId,
      isPinned: message.isPinned,
      pinnedByUserId: message.pinnedByUserId,
      isHidden: message.isHidden,
      hiddenByUserId: message.hiddenByUserId,
    });

    return res.json({ message });
  }

  const existing = await prisma.directMessage.findUnique({ where: { id: targetId } });
  if (!existing) return res.status(404).json({ error: 'Tin nhắn không tồn tại.' });
  if (existing.senderId !== userId && existing.receiverId !== userId) {
    return res.status(403).json({ error: 'Bạn không có quyền thao tác tin nhắn này.' });
  }

  const member = await getWorkspaceMember(userId, existing.workspaceId);
  if (!member) return res.status(403).json({ error: 'Bạn không thuộc workspace này.' });
  const canModerate = canModerateAllChatMessages(member.roleId);

  const data: Record<string, unknown> = {};

  if (typeof isPinned === 'boolean') {
    if (isPinned) {
      data.isPinned = true;
      data.pinnedByUserId = userId;
    } else if (!canModerate && existing.pinnedByUserId !== userId) {
      return res.status(403).json({ error: 'Chỉ người ghim mới có thể bỏ ghim tin nhắn này.' });
    } else {
      data.isPinned = false;
      data.pinnedByUserId = null;
    }
  }

  if (typeof isHidden === 'boolean') {
    if (isHidden) {
      data.isHidden = true;
      data.hiddenByUserId = userId;
    } else if (!canModerate && existing.hiddenByUserId !== userId) {
      return res.status(403).json({ error: 'Chỉ người ẩn mới có thể hiện lại tin nhắn này.' });
    } else {
      data.isHidden = false;
      data.hiddenByUserId = null;
    }
  }

  const message = await prisma.directMessage.update({
    where: { id: targetId },
    data,
    include: { sender: { select: senderSelect } },
  });

  emitMessageStateUpdate('dm', {
    id: message.id,
    workspaceId: message.workspaceId,
    senderId: message.senderId,
    receiverId: message.receiverId,
    isPinned: message.isPinned,
    pinnedByUserId: message.pinnedByUserId,
    isHidden: message.isHidden,
    hiddenByUserId: message.hiddenByUserId,
  });

  return res.json({ message });
};
