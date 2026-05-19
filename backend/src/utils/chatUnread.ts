import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getLastReadAt(
  userId: string,
  workspaceId: string,
  targetType: 'channel' | 'dm',
  targetId: string,
  fallback: Date
): Promise<Date> {
  const state = await prisma.chatReadState.findUnique({
    where: {
      userId_workspaceId_targetType_targetId: {
        userId,
        workspaceId,
        targetType,
        targetId,
      },
    },
  });
  return state?.lastReadAt ?? fallback;
}

export async function markChatRead(
  userId: string,
  workspaceId: string,
  targetType: 'channel' | 'dm',
  targetId: string
) {
  return prisma.chatReadState.upsert({
    where: {
      userId_workspaceId_targetType_targetId: {
        userId,
        workspaceId,
        targetType,
        targetId,
      },
    },
    create: { userId, workspaceId, targetType, targetId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function countUnreadForWorkspace(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) return { channels: {}, dms: {} };

  const fallback = member.joinedAt;

  const channels = await prisma.channel.findMany({
    where: { workspaceId },
    select: { id: true },
  });

  const channelUnread: Record<string, number> = {};
  await Promise.all(
    channels.map(async (ch) => {
      const since = await getLastReadAt(userId, workspaceId, 'channel', ch.id, fallback);
      const count = await prisma.message.count({
        where: {
          channelId: ch.id,
          senderId: { not: userId },
          createdAt: { gt: since },
        },
      });
      if (count > 0) channelUnread[ch.id] = count;
    })
  );

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId, userId: { not: userId } },
    select: { userId: true },
  });

  const dmUnread: Record<string, number> = {};
  await Promise.all(
    members.map(async (m) => {
      const since = await getLastReadAt(userId, workspaceId, 'dm', m.userId, fallback);
      const count = await prisma.directMessage.count({
        where: {
          workspaceId,
          senderId: m.userId,
          receiverId: userId,
          createdAt: { gt: since },
        },
      });
      if (count > 0) dmUnread[m.userId] = count;
    })
  );

  return { channels: channelUnread, dms: dmUnread };
}
