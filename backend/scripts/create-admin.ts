/**
 * Tạo 1 tài khoản Giám đốc (admin) trên DB hiện tại (local hoặc Render).
 *
 * Dùng:
 *   DATABASE_URL="postgresql://..." \
 *   ADMIN_EMAIL="you@email.com" \
 *   ADMIN_PASSWORD="mat-khau-manh" \
 *   ADMIN_NAME="Tên hiển thị" \
 *   npx ts-node --transpile-only scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const WORKSPACE_NAME = process.env.ADMIN_WORKSPACE_NAME?.trim() || 'V/J Sync Demo';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || 'Admin';

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('Thiếu DATABASE_URL (chuỗi PostgreSQL từ Render → vjsync-db → External).');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('ADMIN_PASSWORD phải có ít nhất 6 ký tự.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, password: hashed, preferredLanguage: 'vi' },
    update: { name, password: hashed },
  });

  let workspace = await prisma.workspace.findFirst({ where: { name: WORKSPACE_NAME } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: WORKSPACE_NAME,
        description: 'Workspace chính — tạo bởi create-admin',
        createdById: user.id,
      },
    });
    console.log(`Đã tạo workspace: ${WORKSPACE_NAME}`);
  }

  const channel = await prisma.channel.findFirst({
    where: { workspaceId: workspace.id, name: 'general' },
  });
  if (!channel) {
    await prisma.channel.create({
      data: {
        workspaceId: workspace.id,
        name: 'general',
        description: 'Kênh chung',
        createdById: user.id,
      },
    });
    console.log('Đã tạo kênh general');
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      roleId: 1,
      permission: 'full',
    },
    update: { roleId: 1, permission: 'full' },
  });

  console.log('\n=== Tài khoản admin đã sẵn sàng ===');
  console.log(`URL app: đăng nhập bằng email + mật khẩu bạn vừa đặt`);
  console.log(`Email:    ${email}`);
  console.log(`Workspace: ${WORKSPACE_NAME}`);
  console.log(`Vai trò:  Giám đốc (roleId=1, Toàn quyền)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
