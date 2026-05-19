import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { dashboardAPI } from '../../services/api';
import { ROLE_NAMES } from '../../types';
import { canCreateTask, canManageWorkspace, isEmployee } from '../../lib/workspaceRole';
import './HomePage.css';

interface DashboardStats {
  openTasks: number;
  remindersToday: number;
  newMessages: number;
  memberCount: number;
}

interface DashboardActivity {
  type: 'task' | 'reminder' | 'message';
  id: string;
  title: string;
  meta: string;
  at: string;
  href: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang xử lý',
  review: 'Chờ đánh giá',
  done: 'Hoàn thành',
  pending: 'Chưa hoàn thành',
  done_reminder: 'Đã xong',
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const roleId = currentWorkspace?.roleId;
  const roleName = roleId ? ROLE_NAMES[roleId] : 'Thành viên';
  const showCreateTask = canCreateTask(roleId);
  const showManageWs = canManageWorkspace(roleId);
  const employeeHome = isEmployee(roleId);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace) {
      setStats(null);
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    dashboardAPI
      .getWorkspaceStats(currentWorkspace.id)
      .then((res) => {
        setStats(res.data.stats);
        setActivities(res.data.activities ?? []);
      })
      .catch(() => {
        setStats({
          openTasks: 0,
          remindersToday: 0,
          newMessages: 0,
          memberCount: currentWorkspace.memberCount ?? 0,
        });
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const openTasksLabel = employeeHome
    ? 'Việc của tôi chưa xong'
    : 'Công việc đang mở';

  const statCards = [
    {
      key: 'tasks',
      value: stats?.openTasks ?? '—',
      label: openTasksLabel,
      hint: employeeHome ? 'Được giao cho bạn' : 'Trong workspace',
      tone: 'blue',
      icon: 'fa-tasks',
      onClick: () => navigate('/tasks'),
    },
    {
      key: 'reminders',
      value: stats?.remindersToday ?? '—',
      label: 'Nhắc nhở hôm nay',
      hint: 'Liên quan đến bạn',
      tone: 'orange',
      icon: 'fa-bell',
      onClick: () => navigate('/reminders'),
    },
    {
      key: 'messages',
      value: stats?.newMessages ?? '—',
      label: 'Tin nhắn mới',
      hint: '24 giờ qua',
      tone: 'red',
      icon: 'fa-comments',
      onClick: () => navigate('/chat'),
    },
    {
      key: 'members',
      value: stats?.memberCount ?? currentWorkspace?.memberCount ?? '—',
      label: 'Thành viên',
      hint: currentWorkspace?.name ?? 'Workspace',
      tone: 'green',
      icon: 'fa-users',
      onClick: () => navigate('/workspaces'),
    },
  ];

  const activityIcon = (type: DashboardActivity['type']) => {
    if (type === 'task') return 'fa-clipboard-check';
    if (type === 'reminder') return 'fa-bell';
    return 'fa-comment';
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-text">
          <h1>Chào mừng trở lại, {user?.name || 'Người dùng'}!</h1>
          <p className="home-subtitle">
            {roleName}
            {currentWorkspace && (
              <>
                {' '}
                &bull; {currentWorkspace.name}
              </>
            )}
          </p>
        </div>
        {!currentWorkspace && (
          <button type="button" className="home-ws-btn" onClick={() => navigate('/workspaces')}>
            Chọn workspace
          </button>
        )}
      </header>

      {!currentWorkspace ? (
        <div className="home-empty-ws">
          <i className="fas fa-building" />
          <p>Chọn workspace để xem tổng quan công việc và hoạt động.</p>
          <button type="button" onClick={() => navigate('/workspaces')}>
            Đến Workspace
          </button>
        </div>
      ) : (
        <div className="home-layout">
          <section className="home-panel home-panel-stats">
            <div className="home-panel-head">
              <h2 className="section-title">Tổng quan</h2>
              {loading && <span className="home-loading-badge">Đang tải...</span>}
            </div>
            <div className="stats-grid">
              {statCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`stat-card stat-card--${card.tone}`}
                  onClick={card.onClick}
                  disabled={loading}
                >
                  <span className={`stat-icon stat-icon--${card.tone}`}>
                    <i className={`fas ${card.icon}`} />
                  </span>
                  <span className="stat-body">
                    <span className={`stat-number stat-${card.tone}`}>
                      {loading ? '…' : card.value}
                    </span>
                    <span className="stat-label">{card.label}</span>
                    <span className="stat-hint">{card.hint}</span>
                  </span>
                  <i className="fas fa-chevron-right stat-arrow" />
                </button>
              ))}
            </div>
          </section>

          <div className="home-bottom-row">
          <section className="home-panel home-panel-actions">
            <h2 className="section-title">Thao tác nhanh</h2>
            <div className="home-panel-body home-panel-body--actions">
            <div className="actions-grid">
              <button type="button" className="action-card" onClick={() => navigate('/chat')}>
                <span className="action-icon-wrap">
                  <i className="fas fa-comments action-icon" />
                </span>
                <span className="action-label">Mở Chat</span>
                <span className="action-desc">Nhắn tin & dịch AI</span>
              </button>
              {employeeHome ? (
                <button type="button" className="action-card" onClick={() => navigate('/tasks')}>
                  <span className="action-icon-wrap">
                    <i className="fas fa-clipboard-list action-icon" />
                  </span>
                  <span className="action-label">Công việc của tôi</span>
                  <span className="action-desc">Việc được giao</span>
                </button>
              ) : showCreateTask ? (
                <button type="button" className="action-card" onClick={() => navigate('/tasks/create')}>
                  <span className="action-icon-wrap">
                    <i className="fas fa-plus-circle action-icon" />
                  </span>
                  <span className="action-label">Tạo công việc</span>
                  <span className="action-desc">Giao việc cho nhân viên</span>
                </button>
              ) : null}
              <button type="button" className="action-card" onClick={() => navigate('/reminders/create')}>
                <span className="action-icon-wrap">
                  <i className="fas fa-bell action-icon" />
                </span>
                <span className="action-label">Tạo nhắc nhở</span>
                <span className="action-desc">Lịch nhắc quan trọng</span>
              </button>
              {showManageWs && currentWorkspace && (
                <button
                  type="button"
                  className="action-card"
                  onClick={() => navigate(`/workspaces/${currentWorkspace.id}/manage`)}
                >
                  <span className="action-icon-wrap">
                    <i className="fas fa-user-shield action-icon" />
                  </span>
                  <span className="action-label">Quản trị WS</span>
                  <span className="action-desc">Thành viên & quyền</span>
                </button>
              )}
            </div>
            </div>
          </section>

          <section className="home-panel home-panel-activity">
            <h2 className="section-title">Hoạt động gần đây</h2>
            <div className="home-panel-body home-panel-body--activity">
            {loading ? (
              <div className="activity-skeleton">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="activity-skeleton-row" />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="recent-empty">
                <i className="fas fa-history" />
                <p>Chưa có hoạt động trong workspace này.</p>
              </div>
            ) : (
              <ul className="activity-list">
                {activities.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button type="button" className="activity-item" onClick={() => navigate(item.href)}>
                      <span className={`activity-type activity-type--${item.type}`}>
                        <i className={`fas ${activityIcon(item.type)}`} />
                      </span>
                      <span className="activity-content">
                        <span className="activity-title">{item.title}</span>
                        <span className="activity-meta">
                          {item.type === 'task'
                            ? STATUS_LABELS[item.meta] ?? item.meta
                            : item.type === 'reminder'
                              ? item.meta === 'done'
                                ? 'Đã hoàn thành'
                                : 'Sắp tới'
                              : item.meta}
                          {' · '}
                          {formatRelativeTime(item.at)}
                        </span>
                      </span>
                      <i className="fas fa-chevron-right activity-arrow" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </section>
          </div>
        </div>
      )}
    </div>
  );
}
