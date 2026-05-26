import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { dashboardAPI } from '../../services/api';
import { canCreateTask, canManageWorkspace, isEmployee } from '../../lib/workspaceRole';
import './HomePage.css';

interface DashboardStats {
  openTasks: number;
  remindersToday: number;
  newMessages: number;
  memberCount?: number;
  workspaceCount?: number;
}

interface DashboardActivity {
  type: 'task' | 'reminder' | 'message' | 'discussion';
  id: string;
  title: string;
  meta: string;
  at: string;
  href: string;
  workspaceId?: string;
  workspaceName?: string;
  priority?: number;
}

const STATUS_KEYS = ['todo', 'in_progress', 'review', 'done', 'pending'] as const;

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace, dashboardScope, fetchWorkspaces, workspaces } = useWorkspaceStore();

  const formatRelativeTime = (iso: string): string => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minsAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    return d.toLocaleDateString(i18n.language === 'ja' ? 'ja-JP' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const taskStatusLabel = (key: string) => {
    if (STATUS_KEYS.includes(key as (typeof STATUS_KEYS)[number])) {
      return t(`taskStatus.${key}`);
    }
    return key;
  };

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const roleId = currentWorkspace?.roleId;
  const roleName =
    roleId === 1
      ? t('roles.director')
      : roleId === 2
        ? t('roles.manager')
        : roleId === 3
          ? t('roles.employee')
          : roleId === 4
            ? t('roles.guest')
            : t('roles.member');
  const showCreateTask = canCreateTask(roleId);
  const showManageWs = canManageWorkspace(roleId);
  const employeeHome = isEmployee(roleId);
  const isAllScope = dashboardScope === 'all';

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (isAllScope) {
      if (workspaces.length === 0) {
        setStats(null);
        setActivities([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      dashboardAPI
        .getAllStats()
        .then((res) => {
          setStats(res.data.stats);
          setActivities(res.data.activities ?? []);
        })
        .catch(() => {
          setStats({ openTasks: 0, remindersToday: 0, newMessages: 0, workspaceCount: workspaces.length });
          setActivities([]);
        })
        .finally(() => setLoading(false));
      return;
    }

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
  }, [currentWorkspace, dashboardScope, isAllScope, workspaces.length]);

  const statCards = [
    {
      key: 'tasks',
      value: stats?.openTasks ?? '—',
      label: t('home.myOpenTasks'),
      hint: isAllScope ? t('home.allWorkspaces') : t('home.assignedToYou'),
      tone: 'blue',
      icon: 'fa-tasks',
      onClick: () => navigate('/tasks'),
    },
    {
      key: 'reminders',
      value: stats?.remindersToday ?? '—',
      label: t('home.remindersUpcoming'),
      hint: t('home.relatedToYou'),
      tone: 'orange',
      icon: 'fa-bell',
      onClick: () => navigate('/reminders'),
    },
    {
      key: 'messages',
      value: stats?.newMessages ?? '—',
      label: t('home.newMessages'),
      hint: isAllScope ? t('home.allWorkspaces') : t('home.updates24h'),
      tone: 'red',
      icon: 'fa-comments',
      onClick: () => navigate('/chat'),
    },
    {
      key: 'members',
      value: isAllScope
        ? (stats?.workspaceCount ?? workspaces.length)
        : (stats?.memberCount ?? currentWorkspace?.memberCount ?? '—'),
      label: isAllScope ? t('home.workspaceCount') : t('home.members'),
      hint: isAllScope ? t('home.allWorkspaces') : (currentWorkspace?.name ?? 'Workspace'),
      tone: 'green',
      icon: isAllScope ? 'fa-layer-group' : 'fa-users',
      onClick: () => navigate('/workspaces'),
    },
  ];

  const activityIcon = (type: DashboardActivity['type']) => {
    if (type === 'task') return 'fa-clipboard-check';
    if (type === 'reminder') return 'fa-bell';
    if (type === 'discussion') return 'fa-comments';
    return 'fa-comment';
  };

  const activityTypeLabel = (type: DashboardActivity['type']) => {
    if (type === 'discussion') return t('home.activityDiscussion');
    if (type === 'message') return t('home.activityChat');
    if (type === 'reminder') return t('home.activityReminder');
    return t('home.activityTask');
  };

  const formatActivityMeta = (item: DashboardActivity) => {
    let detail = '';
    if (item.type === 'task') detail = taskStatusLabel(item.meta);
    else if (item.type === 'reminder') {
      detail = item.meta === 'done' ? t('home.reminderDone') : t('home.reminderUpcoming');
    } else {
      detail = item.meta;
    }
    if (isAllScope && item.workspaceName) {
      return `${item.workspaceName} · ${detail}`;
    }
    return detail;
  };

  const hasDashboard = isAllScope ? workspaces.length > 0 : !!currentWorkspace;

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-text">
          <h1>{t('home.welcome', { name: user?.name || t('home.userFallback') })}</h1>
          <p className="home-subtitle">
            {isAllScope ? (
              <span className="home-scope-badge">{t('home.allWorkspacesOverview')}</span>
            ) : (
              <>
                {roleName}
                {currentWorkspace && (
                  <>
                    {' '}
                    &bull; {currentWorkspace.name}
                  </>
                )}
              </>
            )}
          </p>
        </div>
        {!hasDashboard && (
          <button type="button" className="home-ws-btn" onClick={() => navigate('/workspaces')}>
            {t('home.selectWorkspaceBtn')}
          </button>
        )}
      </header>

      {!hasDashboard ? (
        <div className="home-empty-ws">
          <i className="fas fa-building" />
          <p>{t('home.emptyWsHint')}</p>
          <button type="button" onClick={() => navigate('/workspaces')}>
            {t('home.goWorkspace')}
          </button>
        </div>
      ) : (
        <div className="home-layout">
          <section className="home-panel home-panel-stats">
            <div className="home-panel-head">
              <h2 className="section-title">{t('home.overview')}</h2>
              {loading && <span className="home-loading-badge">{t('home.loading')}</span>}
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
              <h2 className="section-title">{t('home.quickActions')}</h2>
              <div className="home-panel-body home-panel-body--actions">
                <div className="actions-grid">
                  <button type="button" className="action-card" onClick={() => navigate('/chat')}>
                    <span className="action-icon-wrap">
                      <i className="fas fa-comments action-icon" />
                    </span>
                    <span className="action-label">{t('home.openChat')}</span>
                    <span className="action-desc">{t('home.openChatDesc')}</span>
                  </button>
                  {employeeHome ? (
                    <button type="button" className="action-card" onClick={() => navigate('/tasks')}>
                      <span className="action-icon-wrap">
                        <i className="fas fa-clipboard-list action-icon" />
                      </span>
                      <span className="action-label">{t('home.myTasks')}</span>
                      <span className="action-desc">{t('home.myTasksDesc')}</span>
                    </button>
                  ) : showCreateTask ? (
                    <button type="button" className="action-card" onClick={() => navigate('/tasks/create')}>
                      <span className="action-icon-wrap">
                        <i className="fas fa-plus-circle action-icon" />
                      </span>
                      <span className="action-label">{t('home.createTask')}</span>
                      <span className="action-desc">{t('home.createTaskDesc')}</span>
                    </button>
                  ) : null}
                  <button type="button" className="action-card" onClick={() => navigate('/reminders/create')}>
                    <span className="action-icon-wrap">
                      <i className="fas fa-bell action-icon" />
                    </span>
                    <span className="action-label">{t('home.createReminder')}</span>
                    <span className="action-desc">{t('home.createReminderDesc')}</span>
                  </button>
                  {showManageWs && currentWorkspace && !isAllScope && (
                    <button
                      type="button"
                      className="action-card"
                      onClick={() => navigate(`/workspaces/${currentWorkspace.id}/manage`)}
                    >
                      <span className="action-icon-wrap">
                        <i className="fas fa-user-shield action-icon" />
                      </span>
                      <span className="action-label">{t('home.wsAdmin')}</span>
                      <span className="action-desc">{t('home.wsAdminDesc')}</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="home-panel home-panel-activity">
              <h2 className="section-title">{t('home.recentActivity')}</h2>
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
                    <p>{t('home.noActivity')}</p>
                  </div>
                ) : (
                  <ul className="activity-list">
                    {activities.map((item) => (
                      <li key={`${item.type}-${item.id}-${item.workspaceId ?? ''}`}>
                        <button type="button" className="activity-item" onClick={() => navigate(item.href)}>
                          <span className={`activity-type activity-type--${item.type}`}>
                            <i className={`fas ${activityIcon(item.type)}`} />
                          </span>
                          <span className="activity-content">
                            <span className="activity-title-row">
                              <span className="activity-kind">{activityTypeLabel(item.type)}</span>
                              <span className="activity-title">{item.title}</span>
                            </span>
                            <span className="activity-meta">
                              {formatActivityMeta(item)}
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
