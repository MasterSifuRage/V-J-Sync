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
      'Chưa có backend/.env — đã tạo file từ .env.example. Mở .env và chỉnh DATABASE_URL (user/mật khẩu/port/tên DB) cho đúng PostgreSQL của bạn.',
    );
  }
} catch (e) {
  console.warn('Không ghi được backend/.env (quyền thư mục?):', e);
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
  console.error(
    'Thiếu DATABASE_URL. Tạo backend/.env (copy từ .env.example) và đặt chuỗi kết nối PostgreSQL.',
  );
  console.error(`Đường dẫn: ${envPath}`);
  process.exit(1);
}

const prisma = new PrismaClient();

/** Tài khoản dev — chỉ dùng môi trường local, đổi mật khẩu trước khi public. */
const DEMO_EMAIL = 'demo@vjsync.local';
const DEMO_PASSWORD = 'vjsync123';
const DEMO_NAME = 'Tài khoản demo';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Đã có user ${DEMO_EMAIL} — không ghi đè.`);
    console.log(`Đăng nhập: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    return;
  }

  const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      password: hashed,
      preferredLanguage: 'vi',
    },
  });

  await prisma.workspace.create({
    data: {
      name: 'Workspace demo',
      description: 'Không gian làm việc mẫu (tạo bởi seed)',
      createdById: user.id,
      members: {
        create: { userId: user.id, roleId: 1, permission: 'full' },
      },
      channels: {
        create: {
          name: 'general',
          description: 'Kênh chung cho tất cả thành viên',
          createdById: user.id,
        },
      },
    },
  });

  console.log('Đã tạo tài khoản demo:');
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Mật khẩu: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
