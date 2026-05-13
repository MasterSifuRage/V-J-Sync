import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { globalSearch } from '../controllers/search.controller';

export const searchRouter = Router();

searchRouter.use(authenticate);
searchRouter.get('/', globalSearch);
