import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { translate, decodeIntent, summarize, suggest } from '../controllers/ai.controller';

export const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post('/translate', translate);
aiRouter.post('/decode-intent', decodeIntent);
aiRouter.post('/summarize', summarize);
aiRouter.post('/suggest', suggest);
