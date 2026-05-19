import { Channel, DirectMsg, Message, User, Workspace } from '../../types';

export type ChatMode = 'channel' | 'dm';

export type DisplayMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: User;
};

export function messageToDisplay(m: Message): DisplayMessage {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: m.sender,
  };
}

export function dmToDisplay(m: DirectMsg, currentUserId: string): DisplayMessage {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    sender: m.sender,
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
