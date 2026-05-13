import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware';
import { routeParam } from '../utils/routeParam';

const prisma = new PrismaClient();

// Role IDs: 1=GiamDoc, 2=QuanLy, 3=NhanVien, 4=Khach
export const requireRole = (...allowedRoles: number[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rawWs = req.params.workspaceId;
      const workspaceId =
        routeParam(rawWs) || (typeof req.body.workspaceId === 'string' ? req.body.workspaceId : '');
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Chưa xác thực.' });
      }

      if (!workspaceId) {
        return res.status(400).json({ error: 'Thiếu workspaceId.' });
      }

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId },
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
      }

      if (!allowedRoles.includes(member.roleId)) {
        return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
      }

      (req as any).workspaceMember = member;
      next();
    } catch {
      return res.status(500).json({ error: 'Lỗi kiểm tra quyền.' });
    }
  };
};

export const requireWorkspaceMember = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rawWs = req.params.workspaceId;
    const workspaceId =
      routeParam(rawWs) || (typeof req.body.workspaceId === 'string' ? req.body.workspaceId : '');
    const userId = req.user?.id;

    if (!userId || !workspaceId) {
      return res.status(400).json({ error: 'Thiếu thông tin xác thực hoặc workspaceId.' });
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Bạn không phải thành viên của workspace này.' });
    }

    (req as any).workspaceMember = member;
    next();
  } catch {
    return res.status(500).json({ error: 'Lỗi kiểm tra quyền.' });
  }
};
