import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { authRouter } from './routes/auth.routes';
import { workspaceRouter } from './routes/workspace.routes';
import { channelRouter } from './routes/channel.routes';
import { messageRouter } from './routes/message.routes';
import { taskRouter } from './routes/task.routes';
import { reminderRouter } from './routes/reminder.routes';
import { aiRouter } from './routes/ai.routes';
import { userRouter } from './routes/user.routes';
import { searchRouter } from './routes/search.routes';
import { setupSocket } from './socket/chat.socket';
import { errorHandler } from './middlewares/error.middleware';
import { resolveLLM, readGeminiApiKey } from './services/llmChat';

dotenv.config();

const llm = resolveLLM();
if (llm) console.log(`[V/J Sync] AI provider: ${llm}`);
else console.warn('[V/J Sync] Chưa cấu hình AI — thêm GEMINI_API_KEY hoặc OPENAI_API_KEY (sk-...) trong backend/.env');

if (llm === 'openai') {
  const geminiOk = readGeminiApiKey();
  if (!geminiOk) {
    const raw = (process.env.GEMINI_API_KEY ?? '').trim();
    if (raw.includes('your-google-ai-studio')) {
      console.warn(
        '[V/J Sync] GEMINI_API_KEY vẫn là placeholder từ .env.example. Thay bằng key thật (AIza...) từ https://aistudio.google.com/apikey rồi restart.',
      );
    } else if (raw && !raw.replace(/^["']|["']$/g, '').trim().startsWith('AIza')) {
      console.warn(
        '[V/J Sync] GEMINI_API_KEY có vẻ sai định dạng — key Google AI Studio thường bắt đầu bằng AIza.',
      );
    } else if (!raw) {
      console.warn(
        '[V/J Sync] Chưa có GEMINI_API_KEY hợp lệ — đang dùng OpenAI. Thêm vào backend/.env: GEMINI_API_KEY=AIza... hoặc AI_PROVIDER=gemini cùng key.',
      );
    }
  }
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/channels', channelRouter);
app.use('/api/messages', messageRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/reminders', reminderRouter);
app.use('/api/ai', aiRouter);
app.use('/api/search', searchRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

setupSocket(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[V/J Sync] Server running on http://localhost:${PORT}`);
});

export { io };
