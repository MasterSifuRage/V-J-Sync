import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';

const mockUpdate = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: { update: mockUpdate },
  })),
}));

describe('updateAvatar', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
  });

  it('trả 400 khi không có file', async () => {
    const { updateAvatar } = await import('./user.controller');
    const req = { user: { id: 'user-1' } } as AuthRequest;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;

    await updateAvatar(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Vui lòng chọn ảnh.' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('lưu avatarUrl và trả user khi có file', async () => {
    const { updateAvatar } = await import('./user.controller');
    const req = {
      user: { id: 'user-1' },
      file: { filename: '123456789-test.png' },
    } as AuthRequest & { file: { filename: string } };
    const json = vi.fn();
    const res = { json } as unknown as Response;

    mockUpdate.mockResolvedValue({
      id: 'user-1',
      name: 'Demo',
      avatarUrl: '/uploads/123456789-test.png',
    });

    await updateAvatar(req, res);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: '/uploads/123456789-test.png' },
      select: { id: true, name: true, avatarUrl: true },
    });
    expect(json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        name: 'Demo',
        avatarUrl: '/uploads/123456789-test.png',
      },
    });
  });
});
