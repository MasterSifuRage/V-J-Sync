import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { getReminders, createReminder, getReminderDetail, updateReminder, deleteReminder } from '../controllers/reminder.controller';

export const reminderRouter = Router();

reminderRouter.use(authenticate);

reminderRouter.get('/workspace/:workspaceId', getReminders);
reminderRouter.post('/workspace/:workspaceId', createReminder);
reminderRouter.get('/:reminderId', getReminderDetail);
reminderRouter.put('/:reminderId', updateReminder);
reminderRouter.delete('/:reminderId', deleteReminder);
