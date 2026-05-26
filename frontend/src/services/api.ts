import axios from 'axios';
import { clearStoredToken, getStoredToken } from '../lib/authToken';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isAuthPage) {
        clearStoredToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string; department?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Workspace
export const workspaceAPI = {
  list: () => api.get('/workspaces'),
  create: (data: { name: string; description?: string; department?: string }) =>
    api.post('/workspaces', data),
  update: (id: string, data: any) => api.put(`/workspaces/${id}`, data),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
  getMembers: (id: string) => api.get(`/workspaces/${id}/members`),
  getAvailableUsers: (id: string) => api.get(`/workspaces/${id}/available-users`),
  addMember: (id: string, data: any) => api.post(`/workspaces/${id}/members`, data),
  updateMember: (wsId: string, userId: string, data: any) =>
    api.put(`/workspaces/${wsId}/members/${userId}`, data),
  removeMember: (wsId: string, userId: string) =>
    api.delete(`/workspaces/${wsId}/members/${userId}`),
};

// Channel
export const channelAPI = {
  list: (workspaceId: string) => api.get(`/channels/workspace/${workspaceId}`),
  create: (workspaceId: string, data: { name: string; description?: string; isPrivate?: boolean }) =>
    api.post(`/channels/workspace/${workspaceId}`, data),
  detail: (channelId: string) => api.get(`/channels/${channelId}`),
};

// Message
export const messageAPI = {
  list: (channelId: string, page = 1) => api.get(`/messages/channel/${channelId}?page=${page}`),
  send: (channelId: string, data: { content: string; fileUrl?: string; fileName?: string; fileType?: string }) =>
    api.post(`/messages/channel/${channelId}`, data),
  getDMs: (workspaceId: string, userId: string, page = 1) =>
    api.get(`/messages/dm/${workspaceId}/${userId}?page=${page}`),
  sendDM: (workspaceId: string, userId: string, data: { content: string }) =>
    api.post(`/messages/dm/${workspaceId}/${userId}`, data),
  getUnread: (workspaceId: string) => api.get(`/messages/unread/${workspaceId}`),
  markChannelRead: (channelId: string) => api.post(`/messages/read/channel/${channelId}`),
  markDmRead: (workspaceId: string, peerUserId: string) =>
    api.post(`/messages/read/dm/${workspaceId}/${peerUserId}`),
  updateState: (
    targetType: 'channel' | 'dm',
    targetId: string,
    data: { isPinned?: boolean; isHidden?: boolean },
  ) => api.patch(`/messages/state/${targetType}/${targetId}`, data),
};

// Task
export const taskAPI = {
  list: (workspaceId: string, params?: any) =>
    api.get(`/tasks/workspace/${workspaceId}`, { params }),
  create: (workspaceId: string, data: any) =>
    api.post(`/tasks/workspace/${workspaceId}`, data),
  detail: (taskId: string) => api.get(`/tasks/${taskId}`),
  update: (taskId: string, data: any) => api.put(`/tasks/${taskId}`, data),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
  addComment: (taskId: string, data: { content: string }) =>
    api.post(`/tasks/${taskId}/comments`, data),
};

// Reminder
export const reminderAPI = {
  list: (workspaceId: string, params?: any) =>
    api.get(`/reminders/workspace/${workspaceId}`, { params }),
  create: (workspaceId: string, data: any) =>
    api.post(`/reminders/workspace/${workspaceId}`, data),
  detail: (reminderId: string) => api.get(`/reminders/${reminderId}`),
  update: (reminderId: string, data: any) => api.put(`/reminders/${reminderId}`, data),
  delete: (reminderId: string) => api.delete(`/reminders/${reminderId}`),
};

// AI
export const aiAPI = {
  translate: (data: { text: string; from?: string; to?: string; senderRole?: string; receiverRole?: string }) =>
    api.post('/ai/translate', data),
  decodeIntent: (data: { text: string; language?: string }) =>
    api.post('/ai/decode-intent', data),
  summarize: (data: { messages?: any[]; type?: string; text?: string }) =>
    api.post('/ai/summarize', data),
  suggest: (data: { text: string; context?: string; targetLanguage?: string }) =>
    api.post('/ai/suggest', data),
};

// Dashboard
export const dashboardAPI = {
  getWorkspaceStats: (workspaceId: string) =>
    api.get(`/dashboard/workspace/${workspaceId}`),
  getAllStats: () => api.get('/dashboard/all'),
};

// Search
export const searchAPI = {
  search: (q: string, workspaceId: string) =>
    api.get(`/search?q=${encodeURIComponent(q)}&workspaceId=${workspaceId}`),
};

// User
export const userAPI = {
  updateProfile: (data: any) => api.put('/users/me', data),
  updateAvatar: (formData: FormData) =>
    api.put('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
