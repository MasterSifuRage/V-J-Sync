import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { requireWorkspaceMember } from '../middlewares/rbac.middleware';
import { getAllWorkspacesDashboard, getWorkspaceDashboard } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/all', getAllWorkspacesDashboard);
dashboardRouter.get('/workspace/:workspaceId', requireWorkspaceMember, getWorkspaceDashboard);
