import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { avatarUpload } from '../utils/fileUpload';
import { updateProfile, updateAvatar, changePassword } from '../controllers/user.controller';

const upload = avatarUpload;

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.put('/me', updateProfile);
userRouter.put('/me/password', changePassword);
userRouter.put('/me/avatar', upload.single('avatar'), updateAvatar);
