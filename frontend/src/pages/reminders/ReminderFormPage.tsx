import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { reminderAPI, workspaceAPI } from '../../services/api';
import { WorkspaceMember } from '../../types';
import { toDatetimeLocalValue } from '../../lib/reminderTime';
import './ReminderCreatePage.css';

export default function ReminderFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reminderId } = useParams<{ reminderId?: string }>();
  const isEdit = Boolean(reminderId);
  const { currentWorkspace } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    workspaceAPI
      .getMembers(currentWorkspace.id)
      .then((res) => setMembers(res.data.members ?? res.data))
      .catch(() => {});
  }, [currentWorkspace]);

  useEffect(() => {
    if (!isEdit || !reminderId) return;
    setLoading(true);
    reminderAPI
      .detail(reminderId)
      .then((res) => {
        const r = res.data.reminder ?? res.data;
        setTitle(r.title ?? '');
        setDescription(r.description ?? '');
        setRemindAt(r.remindAt ? toDatetimeLocalValue(r.remindAt) : '');
        setTargetUserId(r.targetUserId ?? '');
        setTagsInput(Array.isArray(r.tags) ? r.tags.join(', ') : '');
      })
      .catch(() => setError(t('reminders.detailLoadError')))
      .finally(() => setLoading(false));
  }, [isEdit, reminderId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    if (!title.trim() || !remindAt) {
      setError(t('reminders.formError'));
      return;
    }
    setSubmitting(true);
    setError('');
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      remindAt: new Date(remindAt).toISOString(),
      targetUserId: targetUserId || undefined,
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    try {
      if (isEdit && reminderId) {
        await reminderAPI.update(reminderId, payload);
        navigate(`/reminders/${reminderId}`);
      } else {
        await reminderAPI.create(currentWorkspace.id, payload);
        navigate('/reminders');
      }
    } catch {
      setError(isEdit ? t('reminders.updateFormError') : t('reminders.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="reminder-create-page">
        <div className="reminder-form-loading">
          <i className="fas fa-spinner fa-spin" /> {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="reminder-create-page">
      <div className="reminder-create-header">
        <button
          type="button"
          className="btn-back"
          onClick={() => navigate(isEdit && reminderId ? `/reminders/${reminderId}` : '/reminders')}
        >
          <i className="fas fa-arrow-left" /> {t('reminders.back')}
        </button>
        <h1>{isEdit ? t('reminders.editTitle') : t('reminders.createTitle')}</h1>
      </div>

      <form className="reminder-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="title">{t('reminders.titleLabel')}</label>
          <input
            id="title"
            type="text"
            placeholder={t('reminders.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">{t('common.description')}</label>
          <textarea
            id="description"
            placeholder={t('reminders.descPlaceholder')}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="remindAt">{t('reminders.remindAt')}</label>
            <input
              id="remindAt"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetUser">{t('reminders.recipient')}</label>
            <select
              id="targetUser"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">{t('reminders.selectRecipient')}</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags">{t('reminders.tagsHint')}</label>
          <input
            id="tags"
            type="text"
            placeholder={t('reminders.tagsPlaceholder')}
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate(isEdit && reminderId ? `/reminders/${reminderId}` : '/reminders')}
          >
            {t('common.cancelAlt')}
          </button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? t('common.saving') : isEdit ? t('reminders.saveChanges') : t('reminders.saveReminder')}
          </button>
        </div>
      </form>
    </div>
  );
}
