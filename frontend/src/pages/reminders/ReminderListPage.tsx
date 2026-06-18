import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { reminderAPI } from '../../services/api';
import { Reminder } from '../../types';
import { uiDateLocale } from '../../lib/dateLocale';
import { isEmployee } from '../../lib/workspaceRole';
import UserAvatar from '../../components/common/UserAvatar';
import {
  formatReminderClock,
  formatReminderDateLabel,
  formatReminderSchedule,
  getCountdown,
  getTimezoneLabel,
} from '../../lib/reminderTime';
import './ReminderListPage.css';

type ReminderStatusFilter = 'all' | 'pending' | 'completed';
type ReminderTimeFilter = 'all' | 'today' | 'upcoming' | 'overdue';

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ReminderListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReminderStatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<ReminderTimeFilter>('all');
  const [timeTick, setTimeTick] = useState(0);

  const dateLocale = uiDateLocale(i18n.language);
  const employeeView = isEmployee(currentWorkspace?.roleId);

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    reminderAPI
      .list(currentWorkspace.id)
      .then((res) => setReminders(res.data.reminders ?? res.data))
      .catch(() => setError(t('reminders.loadError')))
      .finally(() => setLoading(false));
  }, [currentWorkspace, t]);

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleToggleComplete = async (r: Reminder, isCompleted: boolean) => {
    try {
      const res = await reminderAPI.update(r.id, { isCompleted });
      const updated = res.data.reminder ?? res.data;
      setReminders((prev) => prev.map((item) => (item.id === r.id ? updated : item)));
    } catch {
      setError(t('reminders.updateError'));
    }
  };

  const filteredReminders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return reminders
      .filter((r) => {
        if (query) {
          const haystack = [
            r.title,
            r.description ?? '',
            r.creator?.name ?? '',
            r.target?.name ?? '',
            ...r.tags,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }

        if (statusFilter === 'completed' && !r.isCompleted) return false;
        if (statusFilter === 'pending' && r.isCompleted) return false;

        const remindAt = new Date(r.remindAt);
        if (timeFilter === 'today' && !isSameDate(remindAt, now)) return false;
        if (timeFilter === 'overdue' && (r.isCompleted || remindAt.getTime() > now.getTime())) return false;
        if (timeFilter === 'upcoming' && (r.isCompleted || remindAt.getTime() <= now.getTime())) return false;

        return true;
      })
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }, [reminders, search, statusFilter, timeFilter, timeTick]);

  return (
    <div className="reminder-list-page">
      <div className="reminder-header">
        <div>
          <h1>{t('reminders.title')}</h1>
          <p className="reminder-subtitle">{t('reminders.subtitle')}</p>
        </div>
        {!employeeView && (
          <button type="button" className="btn-create" onClick={() => navigate('/reminders/create')}>
            <i className="fas fa-plus" /> {t('reminders.create')}
          </button>
        )}
      </div>

      {error && <div className="reminder-error">{error}</div>}

      <div className="reminder-filters" aria-label={t('reminders.filterLabel')}>
        <div className="reminder-search-wrap">
          <i className="fas fa-search" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('reminders.searchPlaceholder')}
            aria-label={t('common.searchLabel')}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReminderStatusFilter)}
          aria-label={t('reminders.statusFilter')}
        >
          <option value="all">{t('reminders.filterAllStatus')}</option>
          <option value="pending">{t('reminders.pending')}</option>
          <option value="completed">{t('reminders.completed')}</option>
        </select>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as ReminderTimeFilter)}
          aria-label={t('reminders.timeFilter')}
        >
          <option value="all">{t('reminders.filterAllTime')}</option>
          <option value="today">{t('reminders.filterToday')}</option>
          <option value="upcoming">{t('reminders.filterUpcoming')}</option>
          <option value="overdue">{t('reminders.filterOverdue')}</option>
        </select>
      </div>

      {loading ? (
        <div className="reminder-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>{t('common.loading')}</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="reminder-empty">
          <i className="fas fa-bell-slash" />
          <p>{reminders.length === 0 ? t('reminders.empty') : t('reminders.emptyFiltered')}</p>
          {!employeeView && reminders.length === 0 && (
            <button type="button" className="btn-create-alt" onClick={() => navigate('/reminders/create')}>
              {t('reminders.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="reminder-list">
          {filteredReminders.map((r) => {
            const countdown = getCountdown(r.remindAt, r.isCompleted, t);
            return (
              <article
                key={r.id}
                className={`reminder-row-card ${r.isCompleted ? 'completed' : ''}`}
                onClick={() => navigate(`/reminders/${r.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/reminders/${r.id}`);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="reminder-row-time">
                  <div className="reminder-row-clock">{formatReminderClock(r.remindAt, dateLocale)}</div>
                  <div className="reminder-row-date-label">
                    {formatReminderDateLabel(r.remindAt, dateLocale, t)}
                  </div>
                </div>

                <div className="reminder-row-body">
                  <div className="reminder-row-top">
                    <h3 className="reminder-row-title">{r.title}</h3>
                    <span className={`reminder-countdown reminder-countdown--${countdown.variant}`}>
                      <i className="fas fa-hourglass-half" />
                      {countdown.text}
                    </span>
                  </div>

                  <div className="reminder-row-meta">
                    <span className="reminder-meta-item">
                      <i className="fas fa-globe-asia" /> {getTimezoneLabel(i18n.language, t)}
                    </span>
                    <span className="reminder-meta-item">
                      <i className="fas fa-calendar-alt" /> {formatReminderSchedule(r.remindAt, dateLocale, t)}
                    </span>
                  </div>

                  <div className="reminder-row-footer">
                    <div className="reminder-row-chips">
                      {r.tags.map((tag) => (
                        <span key={tag} className="reminder-chip reminder-chip--tag">
                          #{tag}
                        </span>
                      ))}
                      {r.target && (
                        <span className="reminder-chip reminder-chip--user">
                          <UserAvatar
                            name={r.target.name}
                            avatarUrl={r.target.avatarUrl}
                            size="xs"
                          />
                          {r.target.name}
                        </span>
                      )}
                    </div>

                    <label
                      className="reminder-toggle"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={r.isCompleted}
                        onChange={(e) => {
                          e.stopPropagation();
                          void handleToggleComplete(r, e.target.checked);
                        }}
                        aria-label={r.isCompleted ? t('reminders.markIncomplete') : t('reminders.markComplete')}
                      />
                      <span className="reminder-toggle-slider" />
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
