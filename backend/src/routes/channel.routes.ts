import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getChannels, createChannel, getChannelDetail, addChannelMember } from '../controllers/channel.controller';

export const channelRouter = Router();

channelRouter.use(authenticate);

channelRouter.get('/workspace/:workspaceId', getChannels);
channelRouter.post('/workspace/:workspaceId', createChannel);
channelRouter.get('/:channelId', getChannelDetail);
channelRouter.post('/:channelId/members', addChannelMember);
