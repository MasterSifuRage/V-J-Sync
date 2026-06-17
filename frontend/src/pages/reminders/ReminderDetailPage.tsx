import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reminderAPI } from '../../services/api';
import { Reminder } from '../../types';
import { uiDateLocale } from '../../lib/dateLocale';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { isEmployee } from '../../lib/workspaceRole';
import { getCountdown } from '../../lib/reminderTime';
import { useDescriptionTranslation } from '../../hooks/useDescriptionTranslation';
import { TaskTranslationBlock } from '../tasks/taskDetailHelpers';
import '../tasks/TaskDetailPage.css';
import './ReminderDetailPage.css';

export default function ReminderDetailPage() {
  const { t, i18n } = useTranslation();
  const { reminderId } = useParams<{ reminderId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [, setTick] = useState(0);

  const { translation, loading: translationLoading, translateTarget, needsTranslation } =
    useDescriptionTranslation(reminder?.description);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!reminderId) return;
    setLoading(true);
    reminderAPI
      .detail(reminderId)
      .then((res) => setReminder(res.data.reminder ?? res.data))
      .catch(() => setError(t('reminders.detailLoadError')))
      .finally(() => setLoading(false));
  }, [reminderId, t]);

  const handleDelete = async () => {
    if (!reminderId || !window.confirm(t('reminders.confirmDelete'))) return;
    setDeleting(true);
    try {
      await reminderAPI.delete(reminderId);
      navigate('/reminders');
    } catch {
      setError(t('reminders.deleteError'));
      setDeleting(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!reminder || !reminderId) return;
    try {
      const res = await reminderAPI.update(reminderId, {
        isCompleted: !reminder.isCompleted,
      });
      setReminder(res.data.reminder ?? res.data);
    } catch {
      setError(t('reminders.updateError'));
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(uiDateLocale(i18n.language), {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="reminder-detail-page">
        <div className="detail-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !reminder) {
    return (
      <div className="reminder-detail-page">
        <div className="detail-error">{error}</div>
        <button className="btn-back" onClick={() => navigate('/reminders')}>
          <i className="fas fa-arrow-left" /> {t('common.backToList')}
        </button>
      </div>
    );
  }

  if (!reminder) return null;

  const countdown = getCountdown(reminder.remindAt, reminder.isCompleted, t);
  const employeeView = isEmployee(currentWorkspace?.roleId);

  return (
    <div className="reminder-detail-page">
      <button className="btn-back" onClick={() => navigate('/reminders')}>
        <i className="fas fa-arrow-left" /> {t('common.backToList')}
      </button>

      {error && <div className="detail-inline-error">{error}</div>}

      <div className="detail-card">
        <div className="detail-card-header">
          <div>
            <h1 className="detail-title">{reminder.title}</h1>
            <div className="detail-title-meta">
              <span className={`detail-status ${reminder.isCompleted ? 'status-completed' : 'status-pending'}`}>
                {reminder.isCompleted ? t('reminders.completed') : t('reminders.pending')}
              </span>
              <span className={`reminder-countdown reminder-countdown--${countdown.variant}`}>
                <i className="fas fa-hourglass-half" /> {countdown.text}
              </span>
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn-toggle" onClick={handleToggleComplete}>
              <i className={`fas ${reminder.isCompleted ? 'fa-undo' : 'fa-check'}`} />
              {reminder.isCompleted ? t('reminders.markIncomplete') : t('reminders.markComplete')}
            </button>
            {!employeeView && (
              <button className="btn-edit" onClick={() => navigate(`/reminders/${reminderId}/edit`)}>
                <i className="fas fa-edit" /> {t('common.edit')}
              </button>
            )}
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
              <i className="fas fa-trash" /> {deleting ? t('common.deleting') : t('common.delete')}
            </button>
          </div>
        </div>

        {reminder.description && (
          <div className="detail-section">
            <h3>{t('common.description')}</h3>
            <p className="detail-description">{reminder.description}</p>
            {needsTranslation && translation ? (
              <TaskTranslationBlock variant={translateTarget}>
                <p className="detail-description">{translation}</p>
              </TaskTranslationBlock>
            ) : needsTranslation && translationLoading ? (
              <div className="reminder-translation-loading">
                <i className="fas fa-spinner fa-spin" /> {t('tasks.aiProcessing')}
              </div>
            ) : null}
          </div>
        )}

        <div className="detail-info-grid">
          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-clock" /> {t('reminders.remindTime')}</span>
            <span className="info-value">{formatDate(reminder.remindAt)}</span>
          </div>

          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-user-edit" /> {t('reminders.createdBy')}</span>
            <span className="info-value">{reminder.creator?.name ?? '—'}</span>
          </div>

          {reminder.target && (
            <div className="detail-info-item">
              <span className="info-label"><i className="fas fa-user" /> {t('reminders.recipient')}</span>
              <span className="info-value">{reminder.target.name}</span>
            </div>
          )}

          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-calendar" /> {t('reminders.createdAt')}</span>
            <span className="info-value">{formatDate(reminder.createdAt)}</span>
          </div>
        </div>

        {reminder.tags.length > 0 && (
          <div className="detail-section">
            <h3>{t('common.tags')}</h3>
            <div className="detail-tags">
              {reminder.tags.map((tag, i) => (
                <span key={i} className="detail-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
