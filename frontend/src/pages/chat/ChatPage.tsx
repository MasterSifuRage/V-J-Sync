import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { channelAPI, messageAPI, aiAPI } from '../../services/api';
import { Channel, Message } from '../../types';
import io, { Socket } from 'socket.io-client';
import Sidebar from '../../components/layout/Sidebar';
import { getStoredToken } from '../../lib/authToken';
import { getTranslateTarget } from '../../lib/translateTarget';
import './ChatPage.css';

export default function ChatPage() {
  const { channelId: paramChannelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces, hasFetched, isLoading: wsLoading } = useWorkspaceStore();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLang, setFilterLang] = useState('all');
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!hasFetched || wsLoading) return;
    if (!currentWorkspace) navigate('/workspaces', { replace: true });
  }, [hasFetched, wsLoading, currentWorkspace, navigate]);

  useEffect(() => {
    if (!currentWorkspace) return;
    channelAPI.list(currentWorkspace.id).then((res) => {
      const chs = res.data.channels || res.data;
      setChannels(chs);
      if (paramChannelId) {
        const found = chs.find((c: Channel) => c.id === paramChannelId);
        if (found) setSelectedChannel(found);
        else if (chs.length > 0) setSelectedChannel(chs[0]);
      } else if (chs.length > 0) {
        setSelectedChannel(chs[0]);
      }
    });
  }, [currentWorkspace, paramChannelId]);

  useEffect(() => {
    if (!selectedChannel) return;
    setIsLoadingMessages(true);
    messageAPI.list(selectedChannel.id).then((res) => {
      const msgs = res.data.messages || res.data;
      setMessages(msgs);
      setIsLoadingMessages(false);
    }).catch(() => setIsLoadingMessages(false));
  }, [selectedChannel]);

  // Socket.IO connection
  useEffect(() => {
    if (!selectedChannel || !user) return;

    const token = getStoredToken();
    if (!token) return;

    const socket = io(window.location.origin, {
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = socket;

    socket.emit('join_channel', selectedChannel.id);

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit('leave_channel', selectedChannel.id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedChannel, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setTranslations({});
    navigate(`/chat/${channel.id}`, { replace: true });
  };

  const handleSendMessage = useCallback(() => {
    const content = inputRef.current?.innerText?.trim();
    if (!content || !selectedChannel || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      channelId: selectedChannel.id,
      content,
    });

    if (inputRef.current) inputRef.current.innerText = '';
  }, [selectedChannel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTranslate = async (msg: Message) => {
    if (translations[msg.id]) {
      setTranslations((prev) => {
        const copy = { ...prev };
        delete copy[msg.id];
        return copy;
      });
      return;
    }
    try {
      const senderLang =
        msg.sender?.preferredLanguage === 'ja'
          ? 'ja'
          : msg.sender?.preferredLanguage === 'en'
            ? 'en'
            : 'vi';
      const res = await aiAPI.translate({
        text: msg.content,
        from: senderLang,
        to: getTranslateTarget(),
      });
      const translated =
        res.data.translated ?? res.data.translation ?? res.data.text ?? '';
      setTranslations((prev) => ({
        ...prev,
        [msg.id]: translated || '[Không có bản dịch]',
      }));
    } catch (err) {
      const apiMsg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string; details?: string } | undefined)?.error ||
          (err.response?.data as { details?: string } | undefined)?.details
        : undefined;
      setTranslations((prev) => ({
        ...prev,
        [msg.id]: apiMsg ? `[Lỗi dịch] ${apiMsg}` : '[Lỗi dịch]',
      }));
    }
  };

  // Filter messages based on search
  const filteredMessages = messages.filter((msg) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!msg.content.toLowerCase().includes(q) && !msg.sender?.name?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Group messages by date
  const groupedByDate = filteredMessages.reduce<Record<string, Message[]>>((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div className="chat-page">
      {/* 1. Shared Sidebar (position: fixed — không chiếm chỗ trong flex) */}
      <Sidebar />

      {/* 2. Khu vực giống old/chat.html .main-content: margin-left = sidebar */}
      <div className="chat-body">
      {/* Workspace / channel nav */}
      <div className="channel-nav">
        <button
          type="button"
          className="channel-nav-header workspace-switcher"
          onClick={() => navigate('/workspaces')}
          title="Đổi workspace"
        >
          <h2>{currentWorkspace?.name || 'Workspace'}</h2>
          <i className="fas fa-chevron-down workspace-switcher-chevron" aria-hidden />
        </button>

        <div className="channel-section">
          <div className="channel-section-title">
            <span>Channels</span>
            <button title="Thêm channel">+</button>
          </div>
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={`channel-item ${selectedChannel?.id === ch.id ? 'active' : ''}`}
              onClick={() => handleSelectChannel(ch)}
            >
              <span className="channel-hash">#</span>
              <span>{ch.name}</span>
            </div>
          ))}
        </div>

        <div className="channel-section">
          <div className="channel-section-title">
            <span>Direct Messages</span>
            <button title="Tin nhắn mới">+</button>
          </div>
          {/* DMs placeholder - populated from workspace members */}
          <div className="dm-item">
            <span className="dm-status online"></span>
            <span>{user?.name || 'Bạn'} (bạn)</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chat Area */}
      <div className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <h3># {selectedChannel?.name || 'general'}</h3>
            <span className="member-count">
              <i className="fas fa-user"></i> {selectedChannel?._count?.members || 0}
            </span>
          </div>
          <div className="chat-header-actions">
            <input
              type="text"
              placeholder="Tìm kiếm tin nhắn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="vi">Tiếng Việt</option>
              <option value="ja">Tiếng Nhật</option>
            </select>
            <button className="btn-task" onClick={() => navigate('/tasks/create')}>
              Tạo Task
            </button>
            <button className="btn-remind" onClick={() => navigate('/reminders/create')}>
              Nhắc nhở
            </button>
            <button
              className={`btn-info ${showRightSidebar ? 'active' : ''}`}
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              title="Chi tiết kênh"
            >
              <i className="fas fa-info-circle"></i>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {isLoadingMessages && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
              Đang tải tin nhắn...
            </div>
          )}
          {Object.entries(groupedByDate).map(([date, msgs]) => (
            <div key={date}>
              <div className="date-divider">
                <span>{date}</span>
              </div>
              {msgs.map((msg) => (
                <div key={msg.id} className="message-row">
                  <img
                    className="message-avatar"
                    src={msg.sender?.avatarUrl || '/default-avatar.png'}
                    alt={msg.sender?.name}
                  />
                  <div className="message-body">
                    <div className="message-header">
                      <span className="message-sender">{msg.sender?.name}</span>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="message-content">{msg.content}</div>
                    <div className="message-actions">
                      <button onClick={() => handleTranslate(msg)}>
                        <i className="fas fa-language"></i>{' '}
                        {translations[msg.id] ? 'Ẩn dịch' : 'Dịch'}
                      </button>
                    </div>
                    {translations[msg.id] && (
                      <div className="translation-block">
                        <div className="translation-label">
                          <i className="fas fa-globe"></i> Bản dịch AI
                        </div>
                        {translations[msg.id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div className="chat-input-toolbar">
            <button title="Bold"><i className="fas fa-bold"></i></button>
            <button title="Italic"><i className="fas fa-italic"></i></button>
            <button title="List"><i className="fas fa-list-ul"></i></button>
            <button title="Ngôn ngữ"><i className="fas fa-language"></i></button>
          </div>
          <div
            className="chat-input-box"
            ref={inputRef}
            contentEditable
            data-placeholder="Nhập tin nhắn..."
            onKeyDown={handleKeyDown}
          />
          <div className="chat-input-footer">
            <div className="chat-input-footer-left">
              <button title="Đính kèm file"><i className="fas fa-paperclip"></i></button>
              <button title="Emoji"><i className="fas fa-smile"></i></button>
            </div>
            <button className="btn-send" onClick={handleSendMessage}>
              <i className="fas fa-paper-plane"></i> Gửi
            </button>
          </div>
        </div>
      </div>

      {/* 4. Right Sidebar */}
      <div className={`chat-right-sidebar ${showRightSidebar ? '' : 'hidden'}`}>
        <div className="right-sidebar-header">
          <h4>Chi tiết kênh</h4>
          <button onClick={() => setShowRightSidebar(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="right-sidebar-section">
          <h5>Mô tả</h5>
          <p>{selectedChannel?.description || 'Không có mô tả.'}</p>
        </div>
        <div className="right-sidebar-section">
          <h5>Thành viên ({selectedChannel?._count?.members || 0})</h5>
          {/* Members will be fetched in a future iteration */}
        </div>
        <div className="right-sidebar-section">
          <h5>File được chia sẻ</h5>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có file nào.</p>
        </div>
      </div>
      </div>
    </div>
  );
}
