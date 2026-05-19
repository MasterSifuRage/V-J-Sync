import { PrismaClient } from '@prisma/client';

export function isGeneralChannelName(name: string): boolean {
  return name.trim().toLowerCase() === 'general';
}

/** Kênh thường: thêm người gửi tin vào ChannelMember (general thì không). */
export async function ensureChannelMemberOnChat(
  prisma: PrismaClient,
  channelId: string,
  userId: string
): Promise<void> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { name: true },
  });
  if (!channel || isGeneralChannelName(channel.name)) return;

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId } },
    create: { channelId, userId },
    update: {},
  });
}

/** Đồng bộ thành viên từ lịch sử chat (người tạo + mọi người đã gửi tin). */
export async function syncChannelMembersFromHistory(
  prisma: PrismaClient,
  channelId: string,
  channelName: string,
  createdById: string
): Promise<void> {
  if (isGeneralChannelName(channelName)) return;

  const senders = await prisma.message.findMany({
    where: { channelId },
    select: { senderId: true },
    distinct: ['senderId'],
  });

  const userIds = new Set<string>([createdById, ...senders.map((s) => s.senderId)]);

  await Promise.all(
    Array.from(userIds).map((uid) =>
      prisma.channelMember.upsert({
        where: { channelId_userId: { channelId, userId: uid } },
        create: { channelId, userId: uid },
        update: {},
      })
    )
  );
}
