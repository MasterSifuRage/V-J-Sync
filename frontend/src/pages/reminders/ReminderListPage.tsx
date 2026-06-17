import { useEffect, useState } from 'react';
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

export default function ReminderListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, tick] = useState(0);

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
    const id = window.setInterval(() => tick((n) => n + 1), 60_000);
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

  const sorted = [...reminders].sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime(),
  );

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

      {loading ? (
        <div className="reminder-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>{t('common.loading')}</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="reminder-empty">
          <i className="fas fa-bell-slash" />
          <p>{t('reminders.empty')}</p>
          {!employeeView && (
            <button type="button" className="btn-create-alt" onClick={() => navigate('/reminders/create')}>
              {t('reminders.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="reminder-list">
          {sorted.map((r) => {
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
