import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/rbac.middleware';
import {
  getMyWorkspaces, createWorkspace, deleteWorkspace, updateWorkspace,
  getWorkspaceMembers,
  getAvailableUsers,
  addWorkspaceMember,
  updateWorkspaceMember,
  removeWorkspaceMember,
} from '../controllers/workspace.controller';

export const workspaceRouter = Router();

workspaceRouter.use(authenticate);

workspaceRouter.get('/', getMyWorkspaces);
workspaceRouter.post('/', createWorkspace);

workspaceRouter.put('/:workspaceId', requireRole(1), updateWorkspace);
workspaceRouter.delete('/:workspaceId', requireRole(1), deleteWorkspace);

workspaceRouter.get('/:workspaceId/members', getWorkspaceMembers);
workspaceRouter.get('/:workspaceId/available-users', requireRole(1), getAvailableUsers);
workspaceRouter.post('/:workspaceId/members', requireRole(1), addWorkspaceMember);
workspaceRouter.put('/:workspaceId/members/:userId', requireRole(1), updateWorkspaceMember);
workspaceRouter.delete('/:workspaceId/members/:userId', requireRole(1), removeWorkspaceMember);
