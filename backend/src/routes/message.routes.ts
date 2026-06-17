import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { chatAttachmentUpload } from '../utils/fileUpload';
import {
  getMessages,
  createMessage,
  getDMs,
  createDM,
  getUnreadCounts,
  markChannelRead,
  markDmRead,
  updateMessageState,
  uploadChatAttachment,
  getChannelFiles,
  getDmFiles,
} from '../controllers/message.controller';
import { requireWorkspaceMember } from '../middlewares/rbac.middleware';

export const messageRouter = Router();

messageRouter.use(authenticate);

messageRouter.get('/unread/:workspaceId', requireWorkspaceMember, getUnreadCounts);
messageRouter.post('/read/channel/:channelId', markChannelRead);
messageRouter.post('/read/dm/:workspaceId/:userId', markDmRead);

messageRouter.post(
  '/workspace/:workspaceId/attachments',
  requireWorkspaceMember,
  chatAttachmentUpload.single('file'),
  uploadChatAttachment,
);

messageRouter.get('/channel/:channelId/files', getChannelFiles);
messageRouter.get('/channel/:channelId', getMessages);
messageRouter.post('/channel/:channelId', createMessage);
messageRouter.get('/dm/:workspaceId/:userId/files', getDmFiles);
messageRouter.get('/dm/:workspaceId/:userId', getDMs);
messageRouter.post('/dm/:workspaceId/:userId', createDM);
messageRouter.patch('/state/:targetType/:targetId', updateMessageState);
