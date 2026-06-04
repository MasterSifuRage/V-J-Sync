import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
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
import { getAllowedClientOrigins, isClientOriginAllowed } from './utils/corsOrigins';

dotenv.config();

const allowedOrigins = getAllowedClientOrigins();
const corsOriginCheck: cors.CorsOptions['origin'] = (origin, callback) => {
  if (isClientOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS blocked: ${origin ?? 'unknown'}`));
  }
};

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
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(cors({
  origin: corsOriginCheck,
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

const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const serveFrontend =
  process.env.SERVE_FRONTEND === '1' ||
  (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist));

if (serveFrontend) {
  app.use(express.static(frontendDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  console.log(`[V/J Sync] Serving frontend from ${frontendDist}`);
}

app.use(errorHandler);

setupSocket(io);
setSocketIo(io);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`[V/J Sync] Server running on http://${HOST}:${PORT}`);
});

export { io };
