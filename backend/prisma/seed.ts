import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const envPath = path.resolve(__dirname, '..', '.env');
const examplePath = path.resolve(__dirname, '..', '.env.example');

try {
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.warn(
      'Chưa có backend/.env — đã tạo file từ .env.example. Mở .env và chỉnh DATABASE_URL cho đúng PostgreSQL.',
    );
  }
} catch (e) {
  console.warn('Không ghi được backend/.env:', e);
}

dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL?.trim() && fs.existsSync(examplePath)) {
  const parsed = dotenv.parse(fs.readFileSync(examplePath, 'utf8'));
  if (parsed.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = parsed.DATABASE_URL;
    console.warn('DATABASE_URL trong .env trống — seed tạm dùng giá trị từ .env.example.');
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error('Thiếu DATABASE_URL. Tạo backend/.env (copy từ .env.example).');
  console.error(`Đường dẫn: ${envPath}`);
  process.exit(1);
}

const prisma = new PrismaClient();

/** Mật khẩu chung cho tài khoản demo local — đổi trước khi deploy production. */
const DEMO_PASSWORD = 'vj123456';
const WORKSPACE_NAME = 'V/J Sync Demo';

/** roleId: 1=Giám đốc (admin), 2=Quản lý, 3=Nhân viên, 4=Khách */
const DEMO_ACCOUNTS = [
  {
    email: 'demo@vj.local',
    name: 'Nhân viên demo',
    roleId: 3,
    permission: 'chat_view',
    label: 'User (nhân viên)',
  },
  {
    email: 'manager@vj.local',
    name: 'Quản lý demo',
    roleId: 2,
    permission: 'task_remind',
    label: 'Quản lý',
  },
  {
    email: 'admin@vj.local',
    name: 'Admin demo',
    roleId: 1,
    permission: 'full',
    label: 'Admin (giám đốc)',
  },
] as const;

async function upsertDemoUser(email: string, name: string) {
  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { email },
      data: { name, password: hashed },
    });
  }
  return prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      preferredLanguage: 'vi',
    },
  });
}

async function main() {
  const users: Record<string, { id: string; email: string }> = {};

  for (const acc of DEMO_ACCOUNTS) {
    const user = await upsertDemoUser(acc.email, acc.name);
    users[acc.email] = user;
  }

  const adminUser = users['admin@vj.local'];

  let workspace = await prisma.workspace.findFirst({
    where: { name: WORKSPACE_NAME },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: WORKSPACE_NAME,
        description: 'Workspace mẫu — nhân viên, quản lý và admin cùng tham gia (seed)',
        department: 'Demo',
        createdById: adminUser.id,
      },
    });
  }

  const generalChannel = await prisma.channel.findFirst({
    where: { workspaceId: workspace.id, name: 'general' },
  });

  if (!generalChannel) {
    await prisma.channel.create({
      data: {
        workspaceId: workspace.id,
        name: 'general',
        description: 'Kênh chung cho tất cả thành viên',
        createdById: adminUser.id,
      },
    });
  }

  for (const acc of DEMO_ACCOUNTS) {
    const user = users[acc.email];
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
      },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        roleId: acc.roleId,
        permission: acc.permission,
      },
      update: {
        roleId: acc.roleId,
        permission: acc.permission,
      },
    });
  }

  console.log('\n=== Tài khoản demo (local) ===');
  console.log(`Workspace: ${WORKSPACE_NAME}`);
  console.log(`Mật khẩu chung: ${DEMO_PASSWORD}\n`);
  for (const acc of DEMO_ACCOUNTS) {
    console.log(`  [${acc.label}]`);
    console.log(`    Email: ${acc.email}`);
    console.log(`    Vai trò workspace: roleId=${acc.roleId} (${acc.permission})`);
  }
  console.log('\nChạy lại seed an toàn — cập nhật vai trò/thành viên, không xóa user.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
