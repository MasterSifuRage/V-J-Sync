import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { routeParam } from '../utils/routeParam';

const prisma = new PrismaClient();

export const getTasks = async (req: AuthRequest, res: Response) => {
  const workspaceId = routeParam(req.params.workspaceId);
  const { status, assigneeId, search } = req.query;

  const where: any = { workspaceId };
  if (status) where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;
  if (search) where.title = { contains: search as string, mode: 'insensitive' };

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
  const { title, description, status, priority, tags, dueDate, assigneeId, channelId } = req.body;
  if (!title) return res.status(400).json({ error: 'Vui lòng nhập tên công việc.' });

  const task = await prisma.task.create({
    data: {
      workspaceId, title, description,
      status: status || 'todo',
      priority: priority || 'normal',
      tags: tags || [],
      dueDate: dueDate ? new Date(dueDate) : null,
      creatorId: req.user!.id,
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
  const { title, description, status, priority, tags, dueDate, assigneeId } = req.body;

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
  await prisma.task.delete({ where: { id: taskId } });
  return res.json({ message: 'Đã xóa công việc.' });
};

export const addTaskComment = async (req: AuthRequest, res: Response) => {
  const taskId = routeParam(req.params.taskId);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Nội dung bình luận không được trống.' });

  const comment = await prisma.taskComment.create({
    data: { taskId, userId: req.user!.id, content },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });
  return res.status(201).json({ comment });
};
