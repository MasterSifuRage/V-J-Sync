import { PrismaClient } from '@prisma/client';

export function isGeneralChannelName(name: string): boolean {
  return name.trim().toLowerCase() === 'general';
}

export async function canUseChannel(
  prisma: PrismaClient,
  userId: string,
  channelId: string
): Promise<boolean> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true, name: true, createdById: true },
  });
  if (!channel) return false;

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: channel.workspaceId, userId } },
    select: { id: true },
  });
  if (!workspaceMember) return false;
  if (isGeneralChannelName(channel.name)) return true;
  if (channel.createdById === userId) return true;

  const channelMember = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId } },
    select: { id: true },
  });
  return Boolean(channelMember);
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

/** Bảo toàn người tạo trong ChannelMember, không tự thêm lại người đã rời/bị đuổi. */
export async function syncChannelMembersFromHistory(
  prisma: PrismaClient,
  channelId: string,
  channelName: string,
  createdById: string
): Promise<void> {
  if (isGeneralChannelName(channelName)) return;

  await prisma.channelMember.upsert({
    where: { channelId_userId: { channelId, userId: createdById } },
    create: { channelId, userId: createdById },
    update: {},
  });
}
