export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferredLanguage: string;
  department?: string;
  phone?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  department?: string;
  createdById: string;
  roleId?: number;
  permission?: string;
  memberCount?: number;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: number;
  permission: string;
  user: User;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  _count?: { members: number; messages: number };
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  translatedContent?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: string;
  sender: User;
}

export interface DirectMsg {
  id: string;
  workspaceId: string;
  senderId: string;
  receiverId: string;
  content: string;
  translatedContent?: string;
  createdAt: string;
  sender: User;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'normal' | 'high' | 'urgent';
  tags: string[];
  dueDate?: string;
  creatorId: string;
  assigneeId?: string;
  creator: User;
  assignee?: User;
  _count?: { comments: number };
  comments?: TaskComment[];
  createdAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  user: User;
  createdAt: string;
}

export interface Reminder {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  remindAt: string;
  tags: string[];
  isCompleted: boolean;
  creatorId: string;
  targetUserId?: string;
  creator: User;
  target?: User;
  createdAt: string;
}

export const ROLE_NAMES: Record<number, string> = {
  1: 'Giám đốc',
  2: 'Quản lý',
  3: 'Nhân viên',
  4: 'Khách',
};
