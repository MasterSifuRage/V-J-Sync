import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** 1=Giám đốc, 2=Quản lý, 3=Nhân viên, 4=Khách */
export const ROLE = {
  ADMIN: 1,
  MANAGER: 2,
  EMPLOYEE: 3,
  GUEST: 4,
} as const;

export function canCreateTask(roleId: number): boolean {
  return roleId === ROLE.ADMIN || roleId === ROLE.MANAGER;
}

export function canManageWorkspace(roleId: number): boolean {
  return roleId === ROLE.ADMIN;
}

export async function getWorkspaceMember(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function userIsAdminSomewhere(userId: string): Promise<boolean> {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId, roleId: ROLE.ADMIN },
  });
  return !!m;
}

export async function getTaskMemberForUser(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, workspaceId: true, assigneeId: true, creatorId: true },
  });
  if (!task) return { task: null, member: null };
  const member = await getWorkspaceMember(userId, task.workspaceId);
  return { task, member };
}
