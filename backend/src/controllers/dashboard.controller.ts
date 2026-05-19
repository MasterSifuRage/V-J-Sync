import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { ROLE } from '../utils/workspaceRoles';

const prisma = new PrismaClient();

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export const getWorkspaceDashboard = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = req.user!.id;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) {
    return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
  }

  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const taskWhere: Record<string, unknown> = {
    workspaceId,
    status: { not: 'done' },
  };
  if (member.roleId === ROLE.EMPLOYEE) {
    taskWhere.assigneeId = userId;
  }

  const channelIds = await prisma.channel.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const channelIdList = channelIds.map((c) => c.id);

  const [
    openTasks,
    remindersToday,
    memberCount,
    newChannelMessages,
    newDmMessages,
    recentTasks,
    recentReminders,
    recentMessages,
  ] = await Promise.all([
    prisma.task.count({ where: taskWhere }),
    prisma.reminder.count({
      where: {
        workspaceId,
        isCompleted: false,
        remindAt: { gte: todayStart, lte: todayEnd },
        OR: [{ creatorId: userId }, { targetUserId: userId }],
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    channelIdList.length > 0
      ? prisma.message.count({
          where: {
            channelId: { in: channelIdList },
            senderId: { not: userId },
            createdAt: { gte: last24h },
          },
        })
      : Promise.resolve(0),
    prisma.directMessage.count({
      where: {
        workspaceId,
        receiverId: userId,
        createdAt: { gte: last24h },
      },
    }),
    prisma.task.findMany({
      where: taskWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        assignee: { select: { name: true } },
      },
    }),
    prisma.reminder.findMany({
      where: {
        workspaceId,
        OR: [{ creatorId: userId }, { targetUserId: userId }],
      },
      orderBy: { remindAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        remindAt: true,
        isCompleted: true,
      },
    }),
    channelIdList.length > 0
      ? prisma.message.findMany({
          where: { channelId: { in: channelIdList } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            content: true,
            createdAt: true,
            channelId: true,
            sender: { select: { name: true } },
            channel: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const newMessages = newChannelMessages + newDmMessages;

  const activities = [
    ...recentTasks.map((t) => ({
      type: 'task' as const,
      id: t.id,
      title: t.title,
      meta: t.status,
      at: t.updatedAt,
      href: `/tasks/${t.id}`,
    })),
    ...recentReminders.map((r) => ({
      type: 'reminder' as const,
      id: r.id,
      title: r.title,
      meta: r.isCompleted ? 'done' : 'pending',
      at: r.remindAt,
      href: `/reminders/${r.id}`,
    })),
    ...recentMessages.map((m) => ({
      type: 'message' as const,
      id: m.id,
      title: m.content.slice(0, 80),
      meta: `#${m.channel.name} · ${m.sender.name}`,
      at: m.createdAt,
      href: `/chat/${m.channelId}`,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return res.json({
    stats: {
      openTasks,
      remindersToday,
      newMessages,
      memberCount,
    },
    activities,
    meta: {
      newMessagesNote: 'Tin nhắn mới từ người khác trong 24 giờ qua',
    },
  });
};
