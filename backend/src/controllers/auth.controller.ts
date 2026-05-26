import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

const prisma = new PrismaClient();

const registerSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập họ tên'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  department: z.string().optional(),
  preferredLanguage: z.enum(['vi', 'ja']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'secret';
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as SignOptions;
  return jwt.sign({ userId }, secret, options);
}

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng.' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        department: data.department,
        preferredLanguage: data.preferredLanguage || 'vi',
      },
      select: { id: true, name: true, email: true, preferredLanguage: true, translateToLanguage: true, department: true },
    });

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('[auth/register]', err);
    return res.status(503).json({
      error:
        'Không thể ghi cơ sở dữ liệu. Kiểm tra PostgreSQL đang chạy, DATABASE_URL trong backend/.env, và đã chạy migration/seed.',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const validPassword = await bcrypt.compare(data.password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        translateToLanguage: user.translateToLanguage,
        avatarUrl: user.avatarUrl,
        department: user.department,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('[auth/login]', err);
    return res.status(503).json({
      error:
        'Không kết nối được cơ sở dữ liệu hoặc lỗi máy chủ. Kiểm tra PostgreSQL, DATABASE_URL, và chạy npm run db:seed trong thư mục backend.',
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, email: true, avatarUrl: true,
      preferredLanguage: true, translateToLanguage: true, department: true, phone: true, createdAt: true,
    },
  });
  return res.json({ user });
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ message: 'Đăng xuất thành công.' });
};
