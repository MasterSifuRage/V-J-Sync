import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import { userIsAdminSomewhere } from '../utils/workspaceRoles';

const prisma = new PrismaClient();

export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user!.id },
    include: {
      workspace: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    roleId: m.roleId,
    permission: m.permission,
    memberCount: m.workspace._count.members,
  }));

  return res.json({ workspaces });
};

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  const { name, description, department } = req.body;
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên Workspace.' });

  const canCreate = await userIsAdminSomewhere(req.user!.id);
  if (!canCreate) {
    return res.status(403).json({
      error: 'Chỉ Giám đốc (Admin) mới có thể tạo workspace mới. Vui lòng liên hệ quản trị viên.',
    });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name, description, department,
      createdById: req.user!.id,
      members: { create: { userId: req.user!.id, roleId: 1, permission: 'full' } },
      channels: { create: { name: 'general', description: 'Kênh chung cho tất cả thành viên', createdById: req.user!.id } },
    },
    include: { _count: { select: { members: true } } },
  });

  return res.status(201).json({ workspace });
};

export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return res.status(404).json({ error: 'Workspace không tồn tại.' });
  await prisma.workspace.delete({ where: { id: workspaceId } });
  return res.json({ message: 'Đã xóa workspace thành công.' });
};

export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { name, description, department } = req.body;
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { ...(name && { name }), ...(description !== undefined && { description }), ...(department !== undefined && { department }) },
  });
  return res.json({ workspace });
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, preferredLanguage: true } } },
  });
  return res.json({ members });
};

/** Người dùng trong DB chưa thuộc workspace — dùng chọn nhanh khi thêm thành viên */
export const getAvailableUsers = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });
  const memberIds = members.map((m) => m.userId);

  const users = await prisma.user.findMany({
    where: memberIds.length > 0 ? { id: { notIn: memberIds } } : undefined,
    select: { id: true, name: true, email: true, preferredLanguage: true },
    orderBy: { name: 'asc' },
  });

  return res.json({ users });
};

export const addWorkspaceMember = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { email, name, roleId, permission, preferredLanguage } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Vui lòng nhập email và tên.' });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const bcrypt = await import('bcrypt');
    const pw = await bcrypt.hash('vj123456', 12);
    user = await prisma.user.create({ data: { email, name, password: pw, preferredLanguage: preferredLanguage || 'vi' } });
  }

  const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: user.id } } });
  if (existing) return res.status(400).json({ error: 'Người dùng đã là thành viên.' });

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: user.id, roleId: roleId || 3, permission: permission || 'chat_view' },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, preferredLanguage: true } } },
  });
  return res.status(201).json({ member });
};

export const updateWorkspaceMember = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = routeParam(req.params.userId);
  const { roleId, permission, preferredLanguage } = req.body;

  if (preferredLanguage === 'vi' || preferredLanguage === 'ja') {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage },
    });
  }

  const member = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { ...(roleId && { roleId }), ...(permission && { permission }) },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, preferredLanguage: true } } },
  });
  return res.json({ member });
};

export const removeWorkspaceMember = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = routeParam(req.params.userId);
  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId, userId } } });
  return res.json({ message: 'Đã xóa thành viên.' });
};
