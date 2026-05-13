import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getMessages, createMessage, getDMs, createDM } from '../controllers/message.controller';

export const messageRouter = Router();

messageRouter.use(authenticate);

messageRouter.get('/channel/:channelId', getMessages);
messageRouter.post('/channel/:channelId', createMessage);
messageRouter.get('/dm/:workspaceId/:userId', getDMs);
messageRouter.post('/dm/:workspaceId/:userId', createDM);
