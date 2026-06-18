import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { canUseChannel, ensureChannelMemberOnChat } from '../utils/channelMembers';

const prisma = new PrismaClient();

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
}

function parseChannelId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload) return payload;
  if (payload && typeof payload === 'object' && 'channelId' in payload) {
    const id = (payload as { channelId: unknown }).channelId;
    if (typeof id === 'string' && id) return id;
  }
  return null;
}

async function isWorkspaceMember(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  return Boolean(member);
}

async function canUseDm(userId: string, peerUserId: string, workspaceId: string) {
  if (userId === peerUserId) return false;
  const [senderMember, receiverMember] = await Promise.all([
    isWorkspaceMember(userId, workspaceId),
    isWorkspaceMember(peerUserId, workspaceId),
  ]);
  return senderMember && receiverMember;
}

export function setupSocket(io: Server) {
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, name: true } });
      if (!user) return next(new Error('User not found'));

      socket.userId = user.id;
      socket.userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`[Socket] ${socket.userName} connected`);

    socket.on('join_channel', async (payload: unknown) => {
      const channelId = parseChannelId(payload);
      if (!channelId) return;
      if (!socket.userId || !(await canUseChannel(prisma, socket.userId, channelId))) return;
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] ${socket.userName} joined channel:${channelId}`);
    });

    socket.on('leave_channel', (payload: unknown) => {
      const channelId = parseChannelId(payload);
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
    });

    socket.on('send_message', async (data: { channelId: string; content: string; fileUrl?: string; fileName?: string; fileType?: string }) => {
      try {
        if (!data.content?.trim() && !data.fileUrl) {
          socket.emit('error', { message: 'Nội dung tin nhắn không được trống.' });
          return;
        }
        if (!socket.userId || !(await canUseChannel(prisma, socket.userId, data.channelId))) {
          socket.emit('error', { message: 'Bạn không thuộc workspace của kênh này.' });
          return;
        }
        const message = await prisma.message.create({
          data: {
            channelId: data.channelId,
            senderId: socket.userId!,
            content: data.content || '',
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileType: data.fileType || 'text',
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } },
          },
        });

        await ensureChannelMemberOnChat(prisma, data.channelId, socket.userId!);

        io.to(`channel:${data.channelId}`).emit('new_message', message);
        // Luôn trả tin cho người gửi (kể cả chưa join room kịp)
        socket.emit('new_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Không thể gửi tin nhắn.' });
      }
    });

    socket.on('send_dm', async (data: { workspaceId: string; receiverId: string; content: string; fileUrl?: string; fileName?: string }) => {
      try {
        if (!data.content?.trim() && !data.fileUrl) {
          socket.emit('error', { message: 'Nội dung tin nhắn không được trống.' });
          return;
        }
        if (!socket.userId || !(await canUseDm(socket.userId, data.receiverId, data.workspaceId))) {
          socket.emit('error', { message: 'Hai người dùng không cùng workspace.' });
          return;
        }
        const dm = await prisma.directMessage.create({
          data: {
            workspaceId: data.workspaceId,
            senderId: socket.userId!,
            receiverId: data.receiverId,
            content: data.content || '',
            fileUrl: data.fileUrl,
            fileName: data.fileName,
          },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, preferredLanguage: true } },
          },
        });

        const roomId = [socket.userId, data.receiverId].sort().join(':');
        io.to(`dm:${roomId}`).emit('new_dm', dm);
        socket.emit('new_dm', dm);
      } catch {
        socket.emit('error', { message: 'Không thể gửi tin nhắn.' });
      }
    });

    socket.on('join_dm', (otherUserId: string) => {
      const roomId = [socket.userId, otherUserId].sort().join(':');
      socket.join(`dm:${roomId}`);
    });

    socket.on('typing', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        channelId: data.channelId,
      });
    });

    socket.on('stop_typing', (data: { channelId: string }) => {
      socket.to(`channel:${data.channelId}`).emit('user_stop_typing', {
        userId: socket.userId,
        channelId: data.channelId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ${socket.userName} disconnected`);
    });
  });
}
