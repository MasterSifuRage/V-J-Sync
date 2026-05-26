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
import { dashboardRouter } from './routes/dashboard.routes';
import { setupSocket } from './socket/chat.socket';
import { setSocketIo } from './socket/ioInstance';
import { errorHandler } from './middlewares/error.middleware';
import {
  isAiConfigured,
  ollamaBaseUrl,
  ollamaModel,
  resolveSummarizeProvider,
  resolveTranslateProvider,
} from './services/aiConfig';

dotenv.config();

if (isAiConfigured()) {
  console.log(
    `[V/J Sync] AI — tóm tắt: ${resolveSummarizeProvider() ?? '—'}, dịch: ${resolveTranslateProvider() ?? '—'}`,
  );
  if (resolveSummarizeProvider() === 'ollama' || resolveTranslateProvider() === 'ollama') {
    console.log(`[V/J Sync] Ollama ${ollamaBaseUrl()} model=${ollamaModel()}`);
  }
} else {
  console.warn(
    '[V/J Sync] Chưa cấu hình AI — đặt AI_PROVIDER=ollama + OLLAMA_BASE_URL trong backend/.env',
  );
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
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

setupSocket(io);
setSocketIo(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[V/J Sync] Server running on http://localhost:${PORT}`);
});

export { io };
