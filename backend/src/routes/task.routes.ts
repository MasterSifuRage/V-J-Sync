import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import { getTasks, createTask, getTaskDetail, updateTask, deleteTask, addTaskComment } from '../controllers/task.controller';

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get('/workspace/:workspaceId', getTasks);
taskRouter.post('/workspace/:workspaceId', requireRole(1, 2), createTask);
taskRouter.get('/:taskId', getTaskDetail);
taskRouter.put('/:taskId', updateTask);
taskRouter.delete('/:taskId', deleteTask);
taskRouter.post('/:taskId/comments', addTaskComment);
