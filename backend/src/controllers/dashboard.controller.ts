import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { ROLE } from '../utils/workspaceRoles';
import { getLastReadAt } from '../utils/chatUnread';

const prisma = new PrismaClient();

type ActivityType = 'task' | 'reminder' | 'message' | 'discussion';

type ActivityItem = {
  type: ActivityType;
  id: string;
  title: string;
  meta: string;
  at: Date;
  href: string;
  priority: number;
  workspaceId: string;
  workspaceName: string;
};

type UnreadChatRow = {
  id: string;
  content: string;
  createdAt: Date;
  href: string;
  meta: string;
};

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

async function fetchUnreadChatForWorkspace(
  userId: string,
  workspaceId: string,
  readFallback: Date,
  channelIdList: string[],
): Promise<{ rows: UnreadChatRow[]; count: number }> {
  const rows: UnreadChatRow[] = [];
  let count = 0;

  await Promise.all(
    channelIdList.map(async (channelId) => {
      const since = await getLastReadAt(userId, workspaceId, 'channel', channelId, readFallback);
      const where = {
        channelId,
        senderId: { not: userId },
        createdAt: { gt: since },
      };
      const [total, msgs] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.findMany({
          where,
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
        }),
      ]);
      count += total;
      for (const m of msgs) {
        rows.push({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          href: `/chat/${m.channelId}`,
          meta: `#${m.channel.name} · ${m.sender.name}`,
        });
      }
    }),
  );

  const otherMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId, userId: { not: userId } },
    select: { userId: true, user: { select: { name: true } } },
  });

  await Promise.all(
    otherMembers.map(async (m: { userId: string; user: { name: string } }) => {
      const since = await getLastReadAt(userId, workspaceId, 'dm', m.userId, readFallback);
      const where = {
        workspaceId,
        senderId: m.userId,
        receiverId: userId,
        createdAt: { gt: since },
      };
      const [total, dms] = await Promise.all([
        prisma.directMessage.count({ where }),
        prisma.directMessage.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, content: true, createdAt: true },
        }),
      ]);
      count += total;
      for (const dm of dms) {
        rows.push({
          id: dm.id,
          content: dm.content,
          createdAt: dm.createdAt,
          href: '/chat',
          meta: `DM · ${m.user.name}`,
        });
      }
    }),
  );

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { rows: rows.slice(0, 6), count };
}

function openTaskFilter(workspaceId: string, userId: string, roleId: number) {
  const base = { workspaceId, status: { not: 'done' as const } };
  if (roleId === ROLE.EMPLOYEE || roleId === ROLE.GUEST) {
    return { ...base, assigneeId: userId };
  }
  return { ...base, creatorId: userId };
}

async function buildDashboardForMember(
  userId: string,
  workspaceId: string,
  workspaceName: string,
  roleId: number,
) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) {
    return {
      stats: { openTasks: 0, remindersToday: 0, newMessages: 0, memberCount: 0 },
      activities: [] as ActivityItem[],
    };
  }

  const readFallback = member.joinedAt;

  const taskWhere = openTaskFilter(workspaceId, userId, roleId);

  const channelIds = await prisma.channel.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const channelIdList = channelIds.map((c: { id: string }) => c.id);

  const unreadChatPromise = fetchUnreadChatForWorkspace(
    userId,
    workspaceId,
    readFallback,
    channelIdList,
  );

  const [
    openTasks,
    remindersToday,
    memberCount,
    recentTasks,
    recentReminders,
    unreadChat,
    recentDiscussions,
  ] = await Promise.all([
    prisma.task.count({ where: taskWhere }),
    prisma.reminder.count({
      where: {
        workspaceId,
        isCompleted: false,
        remindAt: { gte: todayStart },
        OR: [{ creatorId: userId }, { targetUserId: userId }],
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.task.findMany({
      where: taskWhere,
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        assigneeId: true,
        creatorId: true,
      },
    }),
    prisma.reminder.findMany({
      where: {
        workspaceId,
        OR: [{ creatorId: userId }, { targetUserId: userId }],
      },
      orderBy: { remindAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        remindAt: true,
        isCompleted: true,
        targetUserId: true,
        creatorId: true,
      },
    }),
    unreadChatPromise,
    prisma.taskComment.findMany({
      where: {
        userId: { not: userId },
        task: {
          workspaceId,
          OR: [{ assigneeId: userId }, { creatorId: userId }],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { name: true } },
        task: { select: { id: true, title: true, assigneeId: true, creatorId: true } },
      },
    }),
  ]);

  const activities: ActivityItem[] = [];

  for (const t of recentTasks) {
    activities.push({
      type: 'task',
      id: t.id,
      title: t.title,
      meta: t.status,
      at: t.updatedAt,
      href: `/tasks/${t.id}`,
      priority: 80,
      workspaceId,
      workspaceName,
    });
  }

  for (const r of recentReminders) {
    const targeted = r.targetUserId === userId;
    const isToday = r.remindAt >= todayStart && r.remindAt <= todayEnd;
    let priority = 50;
    if (!r.isCompleted && targeted) priority = 100;
    else if (!r.isCompleted && isToday) priority = 90;
    else if (!r.isCompleted) priority = 70;

    activities.push({
      type: 'reminder',
      id: r.id,
      title: r.title,
      meta: r.isCompleted ? 'done' : 'pending',
      at: r.remindAt,
      href: `/reminders/${r.id}`,
      priority,
      workspaceId,
      workspaceName,
    });
  }

  for (const m of unreadChat.rows) {
    activities.push({
      type: 'message',
      id: m.id,
      title: m.content.slice(0, 80),
      meta: m.meta,
      at: m.createdAt,
      href: m.href,
      priority: 75,
      workspaceId,
      workspaceName,
    });
  }

  for (const c of recentDiscussions) {
    const onAssignedTask = c.task.assigneeId === userId;
    activities.push({
      type: 'discussion',
      id: c.id,
      title: c.content.slice(0, 80),
      meta: `${c.task.title} · ${c.user.name}`,
      at: c.createdAt,
      href: `/tasks/${c.task.id}`,
      priority: onAssignedTask ? 85 : 70,
      workspaceId,
      workspaceName,
    });
  }

  return {
    stats: {
      openTasks,
      remindersToday,
      newMessages: unreadChat.count,
      memberCount,
    },
    activities,
  };
}

function serializeActivities(items: ActivityItem[], limit = 12) {
  return items
    .sort((a, b) => b.priority - a.priority || b.at.getTime() - a.at.getTime())
    .slice(0, limit)
    .map((a) => ({
      type: a.type,
      id: a.id,
      title: a.title,
      meta: a.meta,
      at: a.at,
      href: a.href,
      workspaceId: a.workspaceId,
      workspaceName: a.workspaceName,
      priority: a.priority,
    }));
}

export const getWorkspaceDashboard = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = req.user!.id;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: { select: { name: true } } },
  });
  if (!member) {
    return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
  }

  const { stats, activities } = await buildDashboardForMember(
    userId,
    workspaceId,
    member.workspace.name,
    member.roleId,
  );

  return res.json({
    stats,
    activities: serializeActivities(activities),
    scope: 'workspace',
  });
};

export const getAllWorkspacesDashboard = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: { select: { id: true, name: true } } },
  });

  if (memberships.length === 0) {
    return res.json({
      stats: { openTasks: 0, remindersToday: 0, newMessages: 0, workspaceCount: 0 },
      activities: [],
      scope: 'all',
    });
  }

  const parts = await Promise.all(
    memberships.map((m: { workspaceId: string; roleId: number; workspace: { name: string } }) =>
      buildDashboardForMember(userId, m.workspaceId, m.workspace.name, m.roleId),
    ),
  );

  const stats = parts.reduce(
    (acc, p) => ({
      openTasks: acc.openTasks + p.stats.openTasks,
      remindersToday: acc.remindersToday + p.stats.remindersToday,
      newMessages: acc.newMessages + p.stats.newMessages,
      workspaceCount: memberships.length,
    }),
    { openTasks: 0, remindersToday: 0, newMessages: 0, workspaceCount: memberships.length },
  );

  const activities = serializeActivities(parts.flatMap((p) => p.activities), 15);

  return res.json({ stats, activities, scope: 'all' });
};
