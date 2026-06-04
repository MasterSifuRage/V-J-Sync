import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { channelAPI, messageAPI, workspaceAPI, aiAPI } from '../../services/api';
import { Channel, Message, User, Workspace, WorkspaceMember } from '../../types';
import io, { Socket } from 'socket.io-client';
import Sidebar from '../../components/layout/Sidebar';
import { getStoredToken } from '../../lib/authToken';
import { socketServerUrl } from '../../lib/apiBase';
import { uiDateLocale } from '../../lib/dateLocale';
import { detectTextLang, isValidTranslation, translationPair } from '../../lib/textLang';
import { fetchTranslation, TaskTranslationBlock } from '../tasks/taskDetailHelpers';
import { useTranslateTarget } from '../../hooks/useTranslateTarget';
import { canCreateTask, canModerateAllChatMessages } from '../../lib/workspaceRole';
import { isGeneralChannel } from '../../lib/channelUtils';
import {
  ChatMode,
  ChannelDetail,
  DisplayMessage,
  WorkspaceChannelsMap,
  dmToDisplay,
  messageToDisplay,
  sortWorkspaces,
} from './chatTypes';
import ChatUnreadBadge from './ChatUnreadBadge';
import UserAvatar from '../../components/common/UserAvatar';
import '../tasks/TaskDetailPage.css';
import './ChatPage.css';

const EMOJI_LIST = ['😀', '😂', '👍', '❤️', '🎉', '🙏', '✅', '🔥', '💡', '👋', '😊', '🤔'];

export default function ChatPage() {
  const { t, i18n } = useTranslation();
  const { channelId: paramChannelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { workspaces, currentWorkspace, fetchWorkspaces, setCurrentWorkspace, hasFetched, isLoading: wsLoading } =
    useWorkspaceStore();

  const [channelsByWs, setChannelsByWs] = useState<WorkspaceChannelsMap>({});
  const [expandedWsIds, setExpandedWsIds] = useState<Set<string>>(new Set());
  const [chatMode, setChatMode] = useState<ChatMode>('channel');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedDmUser, setSelectedDmUser] = useState<User | null>(null);
  const [channelDetail, setChannelDetail] = useState<ChannelDetail | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingIds, setTranslatingIds] = useState<Record<string, boolean>>({});
  const translateTarget = useTranslateTarget();

  useEffect(() => {
    setTranslations({});
  }, [translateTarget]);

  const [searchQuery, setSearchQuery] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'pinned' | 'hidden'>('all');
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [channelModalWsId, setChannelModalWsId] = useState<string | null>(null);
  const [creatingChannel, setCreatingChannel] = useState(false);

  const [showDmPicker, setShowDmPicker] = useState(false);
  const [dmPickerWsId, setDmPickerWsId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [unreadChannels, setUnreadChannels] = useState<Record<string, number>>({});
  const [unreadDms, setUnreadDms] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeDmUserIdRef = useRef<string | null>(null);
  const selectedChannelIdRef = useRef<string | null>(null);
  const chatModeRef = useRef<ChatMode>('channel');
  const userIdRef = useRef<string | undefined>(undefined);
  const currentWorkspaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    currentWorkspaceIdRef.current = currentWorkspace?.id ?? null;
  }, [currentWorkspace?.id]);

  const appendMessage = useCallback((item: DisplayMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === item.id) ? prev : [...prev, item]));
  }, []);

  const sortedWorkspaces = useMemo(() => sortWorkspaces(workspaces), [workspaces]);

  const fetchUnread = useCallback(async (workspaceId: string) => {
    try {
      const res = await messageAPI.getUnread(workspaceId);
      setUnreadChannels(res.data.channels ?? {});
      setUnreadDms(res.data.dms ?? {});
    } catch {
      setUnreadChannels({});
      setUnreadDms({});
    }
  }, []);

  const clearChannelUnread = useCallback((channelId: string) => {
    setUnreadChannels((prev) => {
      if (!prev[channelId]) return prev;
      const next = { ...prev };
      delete next[channelId];
      return next;
    });
  }, []);

  const clearDmUnread = useCallback((peerUserId: string) => {
    setUnreadDms((prev) => {
      if (!prev[peerUserId]) return prev;
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
  }, []);

  const markChannelAsRead = useCallback(
    async (channelId: string) => {
      clearChannelUnread(channelId);
      try {
        await messageAPI.markChannelRead(channelId);
      } catch {
        /* ignore */
      }
    },
    [clearChannelUnread]
  );

  const markDmAsRead = useCallback(
    async (workspaceId: string, peerUserId: string) => {
      clearDmUnread(peerUserId);
      try {
        await messageAPI.markDmRead(workspaceId, peerUserId);
      } catch {
        /* ignore */
      }
    },
    [clearDmUnread]
  );

  const loadChannels = useCallback(async (workspaceId: string) => {
    try {
      const res = await channelAPI.list(workspaceId);
      const chs: Channel[] = res.data.channels || res.data;
      setChannelsByWs((prev) => ({ ...prev, [workspaceId]: chs }));
      return chs;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!hasFetched || wsLoading) return;
    if (workspaces.length === 0) {
      navigate('/workspaces', { replace: true });
      return;
    }
    if (!currentWorkspace) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [hasFetched, wsLoading, workspaces, currentWorkspace, navigate, setCurrentWorkspace]);

  useEffect(() => {
    if (!currentWorkspace) return;
    setExpandedWsIds((prev) => new Set(prev).add(currentWorkspace.id));
    loadChannels(currentWorkspace.id);
    fetchUnread(currentWorkspace.id);
  }, [currentWorkspace, loadChannels, fetchUnread]);

  useEffect(() => {
    if (!currentWorkspace || !paramChannelId) return;
    const chs = channelsByWs[currentWorkspace.id];
    if (!chs) return;
    const found = chs.find((c) => c.id === paramChannelId);
    if (found) {
      setChatMode('channel');
      setSelectedChannel(found);
      setSelectedDmUser(null);
    }
  }, [paramChannelId, currentWorkspace, channelsByWs]);

  useEffect(() => {
    if (!currentWorkspace) return;
    workspaceAPI
      .getMembers(currentWorkspace.id)
      .then((res) => setWorkspaceMembers(res.data.members ?? res.data))
      .catch(() => setWorkspaceMembers([]));
  }, [currentWorkspace]);

  const refreshChannelDetail = useCallback(async (channelId: string) => {
    try {
      const res = await channelAPI.detail(channelId);
      setChannelDetail(res.data.channel ?? res.data);
    } catch {
      setChannelDetail(null);
    }
  }, []);

  const refreshChannelDetailRef = useRef(refreshChannelDetail);
  useEffect(() => {
    refreshChannelDetailRef.current = refreshChannelDetail;
  }, [refreshChannelDetail]);

  useEffect(() => {
    if (chatMode !== 'channel' || !selectedChannel) {
      setChannelDetail(null);
      return;
    }
    void refreshChannelDetail(selectedChannel.id);
  }, [chatMode, selectedChannel, refreshChannelDetail]);

  const loadChannelMessages = useCallback(
    async (channelId: string) => {
      setIsLoadingMessages(true);
      try {
        const res = await messageAPI.list(channelId);
        const msgs: Message[] = res.data.messages || res.data;
        setMessages(msgs.map(messageToDisplay));
        await markChannelAsRead(channelId);
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [markChannelAsRead]
  );

  const loadDmMessages = useCallback(
    async (otherUserId: string) => {
      if (!currentWorkspace) return;
      setIsLoadingMessages(true);
      try {
        const res = await messageAPI.getDMs(currentWorkspace.id, otherUserId);
        const raw = res.data.messages || res.data;
        setMessages(
          raw.map((m: Message & { senderId: string }) =>
            dmToDisplay(
              {
                id: m.id,
                workspaceId: currentWorkspace.id,
                senderId: m.senderId,
                receiverId: otherUserId,
                content: m.content,
                createdAt: m.createdAt,
                sender: m.sender,
              },
              user!.id
            )
          )
        );
        await markDmAsRead(currentWorkspace.id, otherUserId);
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [currentWorkspace, user, markDmAsRead]
  );

  useEffect(() => {
    if (chatMode === 'channel' && selectedChannel) {
      loadChannelMessages(selectedChannel.id);
    }
  }, [chatMode, selectedChannel, loadChannelMessages]);

  useEffect(() => {
    if (chatMode === 'dm' && selectedDmUser && currentWorkspace) {
      loadDmMessages(selectedDmUser.id);
    }
  }, [chatMode, selectedDmUser, currentWorkspace, loadDmMessages]);

  useEffect(() => {
    if (!user) return;

    const token = getStoredToken();
    if (!token) return;

    const socket = io(socketServerUrl(), {
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('new_message', (msg: Message) => {
      const uid = userIdRef.current;
      if (!uid) return;

      const viewing =
        chatModeRef.current === 'channel' &&
        selectedChannelIdRef.current === msg.channelId;

      if (viewing) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, messageToDisplay(msg)];
        });
        void refreshChannelDetailRef.current(msg.channelId);
        if (msg.senderId !== uid) {
          void messageAPI.markChannelRead(msg.channelId);
        }
        return;
      }

      if (msg.senderId !== uid) {
        setUnreadChannels((prev) => ({
          ...prev,
          [msg.channelId]: (prev[msg.channelId] || 0) + 1,
        }));
      }
    });

    socket.on('new_dm', (dm: Message & { receiverId: string; workspaceId: string }) => {
      const uid = userIdRef.current;
      if (!uid) return;
      if (dm.senderId !== uid && dm.receiverId !== uid) return;

      const peerId = dm.senderId === uid ? dm.receiverId : dm.senderId;
      const viewing =
        chatModeRef.current === 'dm' &&
        activeDmUserIdRef.current === peerId &&
        currentWorkspaceIdRef.current === dm.workspaceId;

      if (viewing) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === dm.id)) return prev;
          return [...prev, messageToDisplay(dm)];
        });
        if (dm.receiverId === uid && currentWorkspaceIdRef.current) {
          void messageAPI.markDmRead(currentWorkspaceIdRef.current, dm.senderId);
        }
        return;
      }

      if (dm.receiverId === uid) {
        setUnreadDms((prev) => ({
          ...prev,
          [dm.senderId]: (prev[dm.senderId] || 0) + 1,
        }));
      }
    });

    socket.on(
      'message_state_updated',
      (payload: {
        messageId: string;
        isPinned: boolean;
        pinnedByUserId: string | null;
        isHidden: boolean;
        hiddenByUserId: string | null;
      }) => {
        setMessages((prev) => {
          if (!prev.some((m) => m.id === payload.messageId)) return prev;
          return prev.map((m) =>
            m.id === payload.messageId
              ? {
                  ...m,
                  isPinned: payload.isPinned,
                  pinnedByUserId: payload.pinnedByUserId,
                  isHidden: payload.isHidden,
                  hiddenByUserId: payload.hiddenByUserId,
                }
              : m,
          );
        });
      },
    );

    const rejoinRooms = () => {
      if (chatModeRef.current === 'channel' && selectedChannelIdRef.current) {
        socket.emit('join_channel', selectedChannelIdRef.current);
      }
      if (chatModeRef.current === 'dm' && activeDmUserIdRef.current) {
        socket.emit('join_dm', activeDmUserIdRef.current);
      }
    };

    socket.on('connect', rejoinRooms);

    return () => {
      socket.off('message_state_updated');
      socket.off('connect', rejoinRooms);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    activeDmUserIdRef.current = selectedDmUser?.id ?? null;
  }, [selectedDmUser]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannel?.id ?? null;
  }, [selectedChannel]);

  useEffect(() => {
    chatModeRef.current = chatMode;
  }, [chatMode]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user) return;

    const join = () => {
      if (chatMode === 'channel' && selectedChannel) {
        socket.emit('join_channel', selectedChannel.id);
      }
      if (chatMode === 'dm' && selectedDmUser) {
        socket.emit('join_dm', selectedDmUser.id);
      }
    };

    if (socket.connected) join();
    else socket.once('connect', join);

    return () => {
      if (chatMode === 'channel' && selectedChannel) {
        socket.emit('leave_channel', selectedChannel.id);
      }
      socket.off('connect', join);
    };
  }, [chatMode, selectedChannel, selectedDmUser, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleWorkspace = async (ws: Workspace) => {
    const next = new Set(expandedWsIds);
    if (next.has(ws.id)) {
      next.delete(ws.id);
    } else {
      next.add(ws.id);
      if (!channelsByWs[ws.id]) await loadChannels(ws.id);
    }
    setExpandedWsIds(next);
  };

  const selectWorkspace = async (ws: Workspace) => {
    setCurrentWorkspace(ws);
    setExpandedWsIds((prev) => new Set(prev).add(ws.id));
    if (!channelsByWs[ws.id]) await loadChannels(ws.id);
  };

  const handleSelectChannel = (ws: Workspace, channel: Channel) => {
    setCurrentWorkspace(ws);
    setChatMode('channel');
    setSelectedChannel(channel);
    setSelectedDmUser(null);
    setTranslations({});
    clearChannelUnread(channel.id);
    navigate(`/chat/${channel.id}`, { replace: true });
  };

  const handleSelectDm = (ws: Workspace, member: WorkspaceMember) => {
    if (member.userId === user?.id) return;
    setCurrentWorkspace(ws);
    setChatMode('dm');
    setSelectedDmUser(member.user);
    setSelectedChannel(null);
    setTranslations({});
    setShowDmPicker(false);
    clearDmUnread(member.userId);
    navigate('/chat', { replace: true });
  };

  const workspaceUnreadTotal = (wsId: string) => {
    if (wsId !== currentWorkspace?.id) return 0;
    const ch = Object.values(unreadChannels).reduce((a, b) => a + b, 0);
    const dm = Object.values(unreadDms).reduce((a, b) => a + b, 0);
    return ch + dm;
  };

  const handleSendMessage = useCallback(async () => {
    const content = inputRef.current?.innerText?.trim();
    if (!content) return;

    if (chatMode === 'channel' && selectedChannel) {
      if (inputRef.current) inputRef.current.innerText = '';
      setShowEmojiPicker(false);

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('send_message', { channelId: selectedChannel.id, content });
        return;
      }

      try {
        const res = await messageAPI.send(selectedChannel.id, { content });
        const msg: Message = res.data.message ?? res.data;
        appendMessage(messageToDisplay(msg));
        void refreshChannelDetail(selectedChannel.id);
      } catch {
        if (inputRef.current) inputRef.current.innerText = content;
        window.alert(t('chat.sendFailed'));
      }
      return;
    }

    if (chatMode === 'dm' && selectedDmUser && currentWorkspace) {
      if (inputRef.current) inputRef.current.innerText = '';
      setShowEmojiPicker(false);

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('send_dm', {
          workspaceId: currentWorkspace.id,
          receiverId: selectedDmUser.id,
          content,
        });
        return;
      }

      try {
        const res = await messageAPI.sendDM(currentWorkspace.id, selectedDmUser.id, { content });
        const dm: Message & { receiverId: string; workspaceId: string } = {
          ...(res.data.message ?? res.data),
          receiverId: selectedDmUser.id,
          workspaceId: currentWorkspace.id,
        };
        appendMessage(messageToDisplay(dm));
      } catch {
        if (inputRef.current) inputRef.current.innerText = content;
        window.alert(t('chat.sendFailed'));
      }
    }
  }, [chatMode, selectedChannel, selectedDmUser, currentWorkspace, appendMessage, refreshChannelDetail]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const applyFormat = (cmd: string) => {
    document.execCommand(cmd, false);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    inputRef.current.focus();
    document.execCommand('insertText', false, emoji);
    setShowEmojiPicker(false);
  };

  const handleTranslate = async (msg: DisplayMessage) => {
    if (translations[msg.id]) {
      setTranslations((prev) => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
      return;
    }

    const pair = translationPair(detectTextLang(msg.content), translateTarget);
    if (!pair) return;

    setTranslatingIds((prev) => ({ ...prev, [msg.id]: true }));
    try {
      const translated = await fetchTranslation(msg.content, pair.from, pair.to, aiAPI.translate);
      if (translated && isValidTranslation(translated, translateTarget)) {
        setTranslations((prev) => ({ ...prev, [msg.id]: translated }));
      } else {
        setTranslations((prev) => ({
          ...prev,
          [msg.id]: t('chat.translateFailed'),
        }));
      }
    } catch (err) {
      const apiMsg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setTranslations((prev) => ({
        ...prev,
        [msg.id]: apiMsg ? `[${t('chat.translateFailed')}] ${apiMsg}` : t('chat.translateFailed'),
      }));
    } finally {
      setTranslatingIds((prev) => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
    }
  };

  const canTranslateMessage = (content: string) =>
    !!translationPair(detectTextLang(content), translateTarget);

  const openCreateChannel = (wsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChannelModalWsId(wsId);
    setNewChannelName('');
    setNewChannelDesc('');
    setShowChannelModal(true);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelModalWsId || !newChannelName.trim()) return;
    setCreatingChannel(true);
    try {
      const res = await channelAPI.create(channelModalWsId, {
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        description: newChannelDesc.trim() || undefined,
      });
      const ch: Channel = res.data.channel ?? res.data;
      await loadChannels(channelModalWsId);
      const ws = workspaces.find((w) => w.id === channelModalWsId);
      if (ws) handleSelectChannel(ws, ch);
      setShowChannelModal(false);
    } catch {
      window.alert(t('chat.createChannelFailed'));
    } finally {
      setCreatingChannel(false);
    }
  };

  const openDmPicker = (wsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDmPickerWsId(wsId);
    setShowDmPicker(true);
    const ws = workspaces.find((w) => w.id === wsId);
    if (ws) {
      setCurrentWorkspace(ws);
      workspaceAPI
        .getMembers(ws.id)
        .then((res) => setWorkspaceMembers(res.data.members ?? res.data))
        .catch(() => {});
    }
  };

  /** DM: chỉ những người đã gửi tin trong cuộc trò chuyện hiện tại */
  const dmChatParticipants = useMemo(() => {
    if (chatMode !== 'dm' || !user) return [];
    const byId = new Map<string, User>();
    for (const msg of messages) {
      if (msg.sender?.id) byId.set(msg.sender.id, msg.sender);
    }
    if (selectedDmUser) byId.set(selectedDmUser.id, selectedDmUser);
    if (!byId.has(user.id)) {
      byId.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        preferredLanguage: user.preferredLanguage,
      });
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.id === user.id) return 1;
      if (b.id === user.id) return -1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [chatMode, messages, selectedDmUser, user]);

  /** Kênh general: toàn workspace; kênh khác: người tạo + đã chat (từ API + tin đang tải) */
  const channelDisplayMembers = useMemo((): User[] => {
    if (chatMode !== 'channel' || !selectedChannel) return [];
    if (isGeneralChannel(selectedChannel)) {
      return workspaceMembers.map((m) => m.user);
    }
    const byId = new Map<string, User>();
    for (const row of channelDetail?.members ?? []) {
      if (row.user?.id) byId.set(row.user.id, row.user);
    }
    for (const msg of messages) {
      if (msg.sender?.id) byId.set(msg.sender.id, msg.sender);
    }
    return Array.from(byId.values()).sort((a, b) => {
      if (a.id === user?.id) return 1;
      if (b.id === user?.id) return -1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [chatMode, selectedChannel, workspaceMembers, channelDetail, messages, user?.id]);

  const memberCount =
    chatMode === 'channel' ? channelDisplayMembers.length : dmChatParticipants.length;

  const messageTargetType = chatMode === 'channel' ? 'channel' : 'dm';
  const canModerateMessages = canModerateAllChatMessages(currentWorkspace?.roleId);

  const updateMessageLocalState = useCallback(
    (
      messageId: string,
      patch: Partial<
        Pick<DisplayMessage, 'isPinned' | 'pinnedByUserId' | 'isHidden' | 'hiddenByUserId'>
      >,
    ) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const handleTogglePin = async (msg: DisplayMessage) => {
    const next = !msg.isPinned;
    if (
      !next &&
      !canModerateMessages &&
      msg.pinnedByUserId &&
      msg.pinnedByUserId !== user?.id
    ) {
      return;
    }

    const optimistic = {
      isPinned: next,
      pinnedByUserId: next ? (user?.id ?? null) : null,
    };
    updateMessageLocalState(msg.id, optimistic);
    try {
      const res = await messageAPI.updateState(messageTargetType, msg.id, { isPinned: next });
      const updated = res.data.message ?? res.data;
      updateMessageLocalState(msg.id, {
        isPinned: updated.isPinned ?? next,
        pinnedByUserId: updated.pinnedByUserId ?? null,
      });
    } catch {
      updateMessageLocalState(msg.id, {
        isPinned: msg.isPinned,
        pinnedByUserId: msg.pinnedByUserId,
      });
    }
  };

  const handleToggleHide = async (msg: DisplayMessage) => {
    const next = !msg.isHidden;
    if (
      !next &&
      !canModerateMessages &&
      msg.hiddenByUserId &&
      msg.hiddenByUserId !== user?.id
    ) {
      return;
    }

    const optimistic = {
      isHidden: next,
      hiddenByUserId: next ? (user?.id ?? null) : null,
    };
    updateMessageLocalState(msg.id, optimistic);
    try {
      const res = await messageAPI.updateState(messageTargetType, msg.id, { isHidden: next });
      const updated = res.data.message ?? res.data;
      updateMessageLocalState(msg.id, {
        isHidden: updated.isHidden ?? next,
        hiddenByUserId: updated.hiddenByUserId ?? null,
      });
    } catch {
      updateMessageLocalState(msg.id, {
        isHidden: msg.isHidden,
        hiddenByUserId: msg.hiddenByUserId,
      });
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!msg.content.toLowerCase().includes(q) && !msg.sender?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (messageFilter === 'all') return !msg.isHidden;
    if (messageFilter === 'pinned') return msg.isPinned && !msg.isHidden;
    if (messageFilter === 'hidden') return msg.isHidden;
    return true;
  });

  const groupedByDate = filteredMessages.reduce<Record<string, DisplayMessage[]>>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString(uiDateLocale(i18n.language), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  for (const date of Object.keys(groupedByDate)) {
    groupedByDate[date].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  return (
    <div className="chat-page">
      <Sidebar />

      <div className="chat-body">
        <div className="channel-nav">
          <div className="channel-nav-top">
            <h2 className="channel-nav-title">{t('chat.workspace')}</h2>
            <span className="channel-nav-count">{t('common.joinedCount', { count: sortedWorkspaces.length })}</span>
          </div>

          <div className="workspace-list">
            {sortedWorkspaces.map((ws) => {
              const expanded = expandedWsIds.has(ws.id);
              const channels = channelsByWs[ws.id] || [];
              const isActiveWs = currentWorkspace?.id === ws.id;

              return (
                <div key={ws.id} className={`ws-group ${isActiveWs ? 'ws-group-active' : ''}`}>
                  <button
                    type="button"
                    className="ws-group-header"
                    onClick={() => {
                      void selectWorkspace(ws);
                      void toggleWorkspace(ws);
                    }}
                  >
                    <i
                      className={`fas fa-chevron-right ws-group-chevron ${expanded ? 'expanded' : ''}`}
                    />
                    <span className="ws-group-name" title={ws.name}>
                      {ws.name}
                    </span>
                    <span className="ws-group-meta">
                      {workspaceUnreadTotal(ws.id) > 0 ? (
                        <span className="ws-unread-pill">{workspaceUnreadTotal(ws.id)}</span>
                      ) : (
                        ws.memberCount ?? 0
                      )}
                    </span>
                  </button>

                  {expanded && (
                    <div className="ws-group-body">
                      <div className="channel-section">
                        <div className="channel-section-title">
                          <span>{t('chat.channels')}</span>
                          <button
                            type="button"
                            title={t('chat.createChannel')}
                            onClick={(e) => openCreateChannel(ws.id, e)}
                          >
                            +
                          </button>
                        </div>
                        {channels.length === 0 ? (
                          <p className="channel-empty-hint">{t('chat.noChannels')}</p>
                        ) : (
                          channels.map((ch) => (
                            <div
                              key={ch.id}
                              className={`channel-item ${
                                chatMode === 'channel' &&
                                selectedChannel?.id === ch.id &&
                                isActiveWs
                                  ? 'active'
                                  : ''
                              }${isActiveWs && (unreadChannels[ch.id] ?? 0) > 0 ? ' has-unread' : ''}`}
                              onClick={() => handleSelectChannel(ws, ch)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) =>
                                e.key === 'Enter' && handleSelectChannel(ws, ch)
                              }
                            >
                              <span className="channel-hash">#</span>
                              <span className="channel-item-name">{ch.name}</span>
                              {isActiveWs && (
                                <ChatUnreadBadge count={unreadChannels[ch.id] ?? 0} />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {isActiveWs && (
                        <div className="channel-section">
                          <div className="channel-section-title">
                            <span>{t('chat.directMessages')}</span>
                            <button
                              type="button"
                              title={t('chat.pickDm')}
                              onClick={(e) => openDmPicker(ws.id, e)}
                            >
                              +
                            </button>
                          </div>
                          {workspaceMembers
                            .filter((m) => m.userId !== user?.id)
                            .map((m) => (
                              <div
                                key={m.userId}
                                className={`dm-item ${
                                  chatMode === 'dm' && selectedDmUser?.id === m.userId
                                    ? 'active'
                                    : ''
                                }${(unreadDms[m.userId] ?? 0) > 0 ? ' has-unread' : ''}`}
                                onClick={() => handleSelectDm(ws, m)}
                                role="button"
                                tabIndex={0}
                              >
                                <span className="dm-status online" />
                                <span className="dm-item-name">{m.user.name}</span>
                                <ChatUnreadBadge count={unreadDms[m.userId] ?? 0} />
                              </div>
                            ))}
                          {workspaceMembers.filter((m) => m.userId !== user?.id).length ===
                            0 && (
                            <p className="channel-empty-hint">{t('chat.noOtherMembersShort')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-header-info">
              {chatMode === 'channel' ? (
                <>
                  <h3># {selectedChannel?.name || '—'}</h3>
                  <span className="member-count">
                    <i className="fas fa-user" /> {t('common.membersCount', { count: memberCount })}
                  </span>
                  {currentWorkspace && (
                    <span className="chat-header-ws">{currentWorkspace.name}</span>
                  )}
                </>
              ) : (
                <>
                  <h3>
                    <i className="fas fa-at" style={{ fontSize: 14, marginRight: 4 }} />
                    {selectedDmUser?.name || t('chat.selectConversation')}
                  </h3>
                  <span className="member-count">{t('chat.privateMessage')}</span>
                  {currentWorkspace && (
                    <span className="chat-header-ws">{currentWorkspace.name}</span>
                  )}
                </>
              )}
            </div>
            <div className="chat-header-actions">
              <input
                type="text"
                placeholder={t('chat.searchMessages')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                value={messageFilter}
                onChange={(e) => setMessageFilter(e.target.value as 'all' | 'pinned' | 'hidden')}
                title={t('chat.filterMessages')}
              >
                <option value="all">{t('common.all')}</option>
                <option value="pinned">{t('chat.filterPinned')}</option>
                <option value="hidden">{t('chat.filterHidden')}</option>
              </select>
              {canCreateTask(currentWorkspace?.roleId) && (
                <button
                  type="button"
                  className="btn-task"
                  onClick={() => navigate('/tasks/create')}
                >
                  {t('chat.createTask')}
                </button>
              )}
              <button
                type="button"
                className="btn-remind"
                onClick={() => navigate('/reminders/create')}
              >
                {t('chat.reminder')}
              </button>
              <button
                type="button"
                className={`btn-info ${showRightSidebar ? 'active' : ''}`}
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                title={t('chat.details')}
              >
                <i className="fas fa-info-circle" />
              </button>
            </div>
          </div>

          <div className="chat-messages">
            {!selectedChannel && !selectedDmUser && (
              <div className="chat-placeholder">
                <i className="fas fa-comments" />
                <p>{t('chat.pickChannelOrDm')}</p>
              </div>
            )}
            {isLoadingMessages && (
              <div className="chat-loading">{t('chat.loadingMessages')}</div>
            )}
            {!isLoadingMessages &&
              (selectedChannel || selectedDmUser) &&
              messages.length > 0 &&
              filteredMessages.length === 0 && (
                <div className="chat-filter-empty">
                  <i className="fas fa-filter" />
                  <p>{t('chat.noFilteredMessages')}</p>
                </div>
              )}
            {Object.entries(groupedByDate).map(([date, msgs]) => (
              <div key={date}>
                <div className="date-divider">
                  <span>{date}</span>
                </div>
                {msgs.map((msg) => {
                  const showTranslate = canTranslateMessage(msg.content);
                  const isTranslating = !!translatingIds[msg.id];
                  const canTogglePin =
                    canModerateMessages || !msg.isPinned || msg.pinnedByUserId === user?.id;
                  const canToggleHide =
                    canModerateMessages || !msg.isHidden || msg.hiddenByUserId === user?.id;
                  return (
                  <div
                    key={msg.id}
                    className={`message-row ${msg.senderId === user?.id ? 'message-row-own' : ''}${msg.isPinned ? ' message-row-pinned' : ''}${msg.isHidden ? ' message-row-hidden' : ''}`}
                  >
                    <UserAvatar
                      name={msg.sender?.name}
                      avatarUrl={msg.sender?.avatarUrl}
                      size="md"
                      className="message-avatar"
                    />
                    <div className="message-body">
                      <div className="message-header">
                        <span className="message-sender">{msg.sender?.name}</span>
                        {msg.isPinned && (
                          <span className="message-pin-badge">
                            <i className="fas fa-thumbtack" /> {t('chat.pinnedBadge')}
                          </span>
                        )}
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString(uiDateLocale(i18n.language), {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="message-content">{msg.content}</div>
                      <div className="message-actions">
                        {canTogglePin && (
                          <button
                            type="button"
                            className={`message-action-icon${msg.isPinned ? ' is-active' : ''}`}
                            title={msg.isPinned ? t('chat.unpin') : t('chat.pin')}
                            aria-label={msg.isPinned ? t('chat.unpin') : t('chat.pin')}
                            onClick={() => void handleTogglePin(msg)}
                          >
                            <i className="fas fa-thumbtack" aria-hidden="true" />
                          </button>
                        )}
                        {canToggleHide && (
                          <button
                            type="button"
                            className={`message-action-icon${msg.isHidden ? ' is-active' : ''}`}
                            title={msg.isHidden ? t('chat.unhide') : t('chat.hide')}
                            aria-label={msg.isHidden ? t('chat.unhide') : t('chat.hide')}
                            onClick={() => void handleToggleHide(msg)}
                          >
                            <i
                              className={`fas ${msg.isHidden ? 'fa-eye' : 'fa-eye-slash'}`}
                              aria-hidden="true"
                            />
                          </button>
                        )}
                        {showTranslate && (
                          <button
                            type="button"
                            disabled={isTranslating}
                            onClick={() => void handleTranslate(msg)}
                          >
                            <i className={`fas ${isTranslating ? 'fa-spinner fa-spin' : 'fa-language'}`} />{' '}
                            {isTranslating
                              ? t('common.loading')
                              : translations[msg.id]
                                ? t('chat.hideTranslate')
                                : t('chat.translate')}
                          </button>
                        )}
                      </div>
                      {translations[msg.id] && (
                        <TaskTranslationBlock variant={translateTarget}>
                          <div className="chat-translation-text">{translations[msg.id]}</div>
                        </TaskTranslationBlock>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div
            className={`chat-input-area ${!selectedChannel && !selectedDmUser ? 'disabled' : ''}`}
          >
            <div className="chat-input-toolbar">
              <button type="button" title={t('chat.bold')} onClick={() => applyFormat('bold')}>
                <i className="fas fa-bold" />
              </button>
              <button type="button" title={t('chat.italic')} onClick={() => applyFormat('italic')}>
                <i className="fas fa-italic" />
              </button>
              <button type="button" title={t('chat.list')} onClick={() => applyFormat('insertUnorderedList')}>
                <i className="fas fa-list-ul" />
              </button>
              <button
                type="button"
                title={t('chat.translateDraft')}
                onClick={async () => {
                  const text = inputRef.current?.innerText?.trim();
                  if (!text) return;
                  const pair = translationPair(detectTextLang(text), translateTarget);
                  if (!pair) return;
                  try {
                    const translated = await fetchTranslation(text, pair.from, pair.to, aiAPI.translate);
                    if (translated && inputRef.current) {
                      inputRef.current.innerText = translated;
                    }
                  } catch {
                    window.alert(t('chat.translateFailed'));
                  }
                }}
              >
                <i className="fas fa-language" />
              </button>
            </div>
            <div
              className="chat-input-box"
              ref={inputRef}
              contentEditable={!!(selectedChannel || selectedDmUser)}
              data-placeholder={t('chat.inputPlaceholder')}
              onKeyDown={handleKeyDown}
            />
            <div className="chat-input-footer">
              <div className="chat-input-footer-left">
                <div className="emoji-wrap">
                  <button
                    type="button"
                    title={t('chat.insertEmoji')}
                    onClick={() => setShowEmojiPicker((v) => !v)}
                  >
                    <i className="fas fa-smile" />
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker">
                      {EMOJI_LIST.map((em) => (
                        <button key={em} type="button" onClick={() => insertEmoji(em)}>
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-send"
                disabled={!selectedChannel && !selectedDmUser}
                onClick={handleSendMessage}
              >
                <i className="fas fa-paper-plane" /> {t('chat.send')}
              </button>
            </div>
          </div>
        </div>

        <div className={`chat-right-sidebar ${showRightSidebar ? '' : 'hidden'}`}>
          <div className="right-sidebar-header">
            <h4>{chatMode === 'channel' ? t('chat.channelDetails') : t('chat.conversationDetails')}</h4>
            <button type="button" onClick={() => setShowRightSidebar(false)}>
              <i className="fas fa-times" />
            </button>
          </div>
          {currentWorkspace && (
            <div className="right-sidebar-section">
              <h5>{t('chat.workspace')}</h5>
              <p className="right-ws-name">{currentWorkspace.name}</p>
              <p className="right-ws-meta">
                <i className="fas fa-users" /> {t('common.membersCount', { count: currentWorkspace.memberCount ?? 0 })}
              </p>
            </div>
          )}
          <div className="right-sidebar-section">
            <h5>{t('common.description')}</h5>
            <p>
              {chatMode === 'channel'
                ? selectedChannel?.description || channelDetail?.description || t('chat.noDescription')
                : selectedDmUser
                  ? t('chat.dmWith', { name: selectedDmUser.name })
                  : t('chat.selectConversationHint')}
            </p>
          </div>
          <div className="right-sidebar-section">
            <h5>
              {t('chat.membersSection', { count: memberCount })}
            </h5>
            <ul className="right-member-list">
              {chatMode === 'dm' &&
                dmChatParticipants.map((m) => (
                  <li key={m.id}>
                    <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <span>
                      {m.name}
                      {m.id === user?.id ? ` ${t('common.you')}` : ''}
                    </span>
                  </li>
                ))}
              {chatMode === 'dm' && dmChatParticipants.length === 0 && (
                <li className="right-member-empty">{t('chat.noDmMessages')}</li>
              )}
              {chatMode === 'channel' &&
                channelDisplayMembers.map((m) => (
                  <li key={m.id}>
                    <UserAvatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <span>
                      {m.name}
                      {m.id === user?.id ? ` ${t('common.you')}` : ''}
                    </span>
                  </li>
                ))}
              {chatMode === 'channel' && channelDisplayMembers.length === 0 && (
                <li className="right-member-empty">
                  {isGeneralChannel(selectedChannel)
                    ? t('chat.noGeneralMembers')
                    : t('chat.noChannelMembers')}
                </li>
              )}
            </ul>
          </div>
          <div className="right-sidebar-section">
            <h5>{t('chat.sharedFiles')}</h5>
            <p className="right-empty-files">{t('chat.noFiles')}</p>
          </div>
        </div>
      </div>

      {showChannelModal && (
        <div className="chat-modal-overlay" onClick={() => setShowChannelModal(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('chat.createChannelTitle')}</h3>
            <form onSubmit={handleCreateChannel}>
              <label>
                {t('chat.channelName')}
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder={t('chat.channelNamePlaceholder')}
                  required
                />
              </label>
              <label>
                {t('common.description')}
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  rows={2}
                  placeholder={t('chat.channelDescPlaceholder')}
                />
              </label>
              <div className="chat-modal-actions">
                <button type="button" onClick={() => setShowChannelModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={creatingChannel}>
                  {creatingChannel ? t('common.creating') : t('chat.createChannelBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDmPicker && dmPickerWsId && (
        <div className="chat-modal-overlay" onClick={() => setShowDmPicker(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('chat.pickDmTitle')}</h3>
            <ul className="dm-picker-list">
              {workspaceMembers
                .filter((m) => m.userId !== user?.id)
                .map((m) => {
                  const ws = workspaces.find((w) => w.id === dmPickerWsId);
                  if (!ws) return null;
                  return (
                    <li key={m.userId}>
                      <button type="button" onClick={() => handleSelectDm(ws, m)}>
                        <UserAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="sm" />
                        <span>{m.user.name}</span>
                      </button>
                    </li>
                  );
                })}
            </ul>
            {workspaceMembers.filter((m) => m.userId !== user?.id).length === 0 && (
              <p className="channel-empty-hint">{t('chat.noOtherMembers')}</p>
            )}
            <div className="chat-modal-actions">
              <button type="button" onClick={() => setShowDmPicker(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
