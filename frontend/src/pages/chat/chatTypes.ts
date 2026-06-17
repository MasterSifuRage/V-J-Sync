import { Channel, DirectMsg, Message, User, Workspace } from '../../types';

export type ChatMode = 'channel' | 'dm';

export type DisplayMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: User;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  isPinned: boolean;
  pinnedByUserId: string | null;
  isHidden: boolean;
  hiddenByUserId: string | null;
};

export function messageToDisplay(m: Message): DisplayMessage {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: m.sender,
    fileUrl: m.fileUrl,
    fileName: m.fileName,
    fileType: m.fileType,
    isPinned: m.isPinned ?? false,
    pinnedByUserId: m.pinnedByUserId ?? null,
    isHidden: m.isHidden ?? false,
    hiddenByUserId: m.hiddenByUserId ?? null,
  };
}

export function dmToDisplay(m: DirectMsg, _currentUserId: string): DisplayMessage {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: m.sender,
    fileUrl: m.fileUrl,
    fileName: m.fileName,
    fileType: null,
    isPinned: m.isPinned ?? false,
    pinnedByUserId: m.pinnedByUserId ?? null,
    isHidden: m.isHidden ?? false,
    hiddenByUserId: m.hiddenByUserId ?? null,
  };
}

export interface ChannelDetail extends Channel {
  members?: { user: User }[];
}

export type WorkspaceChannelsMap = Record<string, Channel[]>;

export interface DmPartner {
  user: User;
  lastAt?: string;
}

export function sortWorkspaces(list: Workspace[]): Workspace[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
