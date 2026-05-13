import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/auth.middleware';
import { updateProfile, updateAvatar } from '../controllers/user.controller';

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${file.originalname.substring(file.originalname.lastIndexOf('.'))}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.put('/me', updateProfile);
userRouter.put('/me/avatar', upload.single('avatar'), updateAvatar);
