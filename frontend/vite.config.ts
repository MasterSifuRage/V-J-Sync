import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
  '/uploads': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
  '/socket.io': {
    target: 'http://localhost:3001',
    ws: true,
  },
} as const;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: devProxy,
  },
  preview: {
    proxy: devProxy,
  },
});
