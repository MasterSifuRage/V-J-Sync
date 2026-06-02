import { Router } from 'express';
import { register, login, getMe, logout, verifyForgotPasswordEmail, resetForgotPassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/forgot-password/verify-email', verifyForgotPasswordEmail);
authRouter.post('/forgot-password/reset', resetForgotPassword);
authRouter.get('/me', authenticate, getMe);
authRouter.post('/logout', logout);
