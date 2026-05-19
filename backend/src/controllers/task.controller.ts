import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';
import {
  ROLE,
  canCreateTask,
  getWorkspaceMember,
  getTaskMemberForUser,
} from '../utils/workspaceRoles';

const prisma = new PrismaClient();

export const getTasks = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = req.user!.id;
  const { status, assigneeId, search } = req.query;

  const member = await getWorkspaceMember(userId, workspaceId);
  if (!member) {
    return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
  }

  const where: Record<string, unknown> = { workspaceId };
  if (status) where.status = status;
  if (search) where.title = { contains: search as string, mode: 'insensitive' };

  if (member.roleId === ROLE.EMPLOYEE) {
    where.assigneeId = userId;
  } else if (assigneeId) {
    where.assigneeId = assigneeId;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ tasks });
};

export const createTask = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const userId = req.user!.id;
  const member = await getWorkspaceMember(userId, workspaceId);

  if (!member) {
    return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
  }
  if (!canCreateTask(member.roleId)) {
    return res.status(403).json({ error: 'Chỉ Quản lý hoặc Giám đốc mới có thể tạo công việc.' });
  }

  const { title, description, status, priority, tags, dueDate, assigneeId, channelId } = req.body;
  if (!title) return res.status(400).json({ error: 'Vui lòng nhập tên công việc.' });

  const task = await prisma.task.create({
    data: {
      workspaceId,
      title,
      description,
      status: status || 'todo',
      priority: priority || 'normal',
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : null,
      creatorId: userId,
      assigneeId,
      channelId,
    },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return res.status(201).json({ task });
};

export const getTaskDetail = async (req: AuthRequest, res: Response) => {
  const taskId = routeParam(req.params.taskId);
  const userId = req.user!.id;
  const { task: taskMeta, member } = await getTaskMemberForUser(userId, taskId);

  if (!taskMeta || !member) {
    return res.status(404).json({ error: 'Công việc không tồn tại hoặc bạn không có quyền truy cập.' });
  }
  if (member.roleId === ROLE.EMPLOYEE && taskMeta.assigneeId !== userId) {
    return res.status(403).json({ error: 'Bạn chỉ có thể xem công việc được giao cho mình.' });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      comments: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task) return res.status(404).json({ error: 'Công việc không tồn tại.' });
  return res.json({ task });
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const taskId = routeParam(req.params.taskId);
  const userId = req.user!.id;
  const { task: taskMeta, member } = await getTaskMemberForUser(userId, taskId);

  if (!taskMeta || !member) {
    return res.status(404).json({ error: 'Công việc không tồn tại hoặc bạn không có quyền truy cập.' });
  }

  const { title, description, status, priority, tags, dueDate, assigneeId } = req.body;

  if (member.roleId === ROLE.EMPLOYEE) {
    if (taskMeta.assigneeId !== userId) {
      return res.status(403).json({ error: 'Bạn chỉ có thể cập nhật công việc được giao cho mình.' });
    }
    if (title || description !== undefined || priority || tags || dueDate !== undefined || assigneeId !== undefined) {
      return res.status(403).json({ error: 'Nhân viên chỉ có thể cập nhật trạng thái công việc.' });
    }
    if (!status) {
      return res.status(400).json({ error: 'Vui lòng chọn trạng thái cần cập nhật.' });
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(tags && { tags }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId }),
    },
    include: {
      creator: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  });
  return res.json({ task });
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const taskId = routeParam(req.params.taskId);
  const userId = req.user!.id;
  const { task: taskMeta, member } = await getTaskMemberForUser(userId, taskId);

  if (!taskMeta || !member) {
    return res.status(404).json({ error: 'Công việc không tồn tại hoặc bạn không có quyền truy cập.' });
  }
  if (!canCreateTask(member.roleId)) {
    return res.status(403).json({ error: 'Chỉ Quản lý hoặc Giám đốc mới có thể xóa công việc.' });
  }

  await prisma.task.delete({ where: { id: taskId } });
  return res.json({ message: 'Đã xóa công việc.' });
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  const taskId = routeParam(req.params.taskId);
  const userId = req.user!.id;
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Nội dung bình luận không được trống.' });

  const { task: taskMeta, member } = await getTaskMemberForUser(userId, taskId);
  if (!taskMeta || !member) {
    return res.status(404).json({ error: 'Công việc không tồn tại hoặc bạn không có quyền truy cập.' });
  }
  if (member.roleId === ROLE.EMPLOYEE && taskMeta.assigneeId !== userId) {
    return res.status(403).json({ error: 'Bạn chỉ có thể bình luận trên công việc được giao cho mình.' });
  }

  const comment = await prisma.taskComment.create({
    data: { taskId, userId, content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return res.status(201).json({ comment });
};
