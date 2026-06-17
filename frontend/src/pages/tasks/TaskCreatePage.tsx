import { useState, useEffect, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { taskAPI, workspaceAPI } from '../../services/api';
import { WorkspaceMember, TaskAttachment } from '../../types';
import { ROLE } from '../../lib/workspaceRole';
import MarkdownEditor from '../../components/common/MarkdownEditor';
import './TaskCreatePage.css';

const PRIORITY_OPTIONS = ['normal', 'high', 'urgent'] as const;

export default function TaskCreatePage() {
  const { t } = useTranslation();
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    workspaceAPI
      .getMembers(currentWorkspace.id)
      .then((res) => setMembers(res.data.members ?? res.data))
      .catch(() => {});
  }, [currentWorkspace]);

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,/g, '');
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((item) => item !== tag));
  };

  const assignableMembers = members.filter((m) => m.roleId === ROLE.EMPLOYEE);

  const handleSubmit = async () => {
    if (!currentWorkspace || !title.trim()) return;
    if (!assigneeId) {
      setError(t('tasks.assigneeRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await taskAPI.create(currentWorkspace.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        tags,
        dueDate: dueDate || undefined,
        assigneeId,
        autoTranslate,
        attachments: attachments.map(({ fileName, fileUrl, fileSize, mimeType }) => ({
          fileName,
          fileUrl,
          fileSize,
          mimeType,
        })),
      });
      navigate('/tasks');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('tasks.createError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentWorkspace) {
    return <div className="task-list-loading">{t('common.selectWorkspaceFirst')}</div>;
  }

  return (
    <div className="task-create-page">
      <div className="task-create-breadcrumb">
        <Link to="/tasks">{t('tasks.breadcrumb')}</Link>
        <span className="separator">&gt;</span>
        <span>{t('tasks.createNew')}</span>
      </div>

      {error && <div className="task-create-error">{error}</div>}

      <div className="task-create-layout">
        <div className="task-create-left">
          <h2 className="section-title">{t('tasks.contentSection')}</h2>

          <div className="form-group">
            <label>{t('tasks.titleLabel')}</label>
            <input
              type="text"
              className="task-title-input"
              placeholder={t('tasks.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('common.description')}</label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={t('tasks.descPlaceholder')}
              workspaceId={currentWorkspace.id}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              disabled={submitting}
            />
          </div>

          <label
            className="ai-translate-box"
            onClick={() => setAutoTranslate(!autoTranslate)}
          >
            <svg className="ai-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.69.914 1.005a1 1 0 11-1.42 1.42 16.853 16.853 0 01-.803-.87 18.964 18.964 0 01-3.105 2.888 1 1 0 11-1.16-1.626 16.964 16.964 0 002.89-2.677A18.867 18.867 0 013.5 6H2a1 1 0 010-2h3V3a1 1 0 011-1zm7.5 4a1 1 0 01.894.553l3.5 7a1 1 0 01-1.788.894L16.236 13h-3.472l-.87 1.447a1 1 0 11-1.788-.894l3.5-7A1 1 0 0114.5 6zm0 3.236L13.382 11h2.236L14.5 9.236z" />
            </svg>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => {
                e.stopPropagation();
                setAutoTranslate(e.target.checked);
              }}
            />
            <span className="ai-label">{t('tasks.autoTranslateJa')}</span>
          </label>
        </div>

        <div className="task-create-right">
          <h2 className="section-title">{t('tasks.settingsSection')}</h2>

          <div className="form-group">
            <label>{t('tasks.assigneeLabel')}</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">{t('tasks.selectAssignee')}</option>
              {assignableMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
            {assignableMembers.length === 0 && (
              <p className="form-hint">{t('tasks.noEmployeesHint')}</p>
            )}
          </div>

          <div className="form-group">
            <label>{t('tasks.dueDate')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('tasks.priorityLabel')}</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITY_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {t(`taskPriority.${key}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('common.tags')}</label>
            <div className="tags-input-wrapper">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={tags.length === 0 ? t('tasks.tagPlaceholder') : ''}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="task-create-footer">
        <button className="btn-cancel" onClick={() => navigate('/tasks')}>
          {t('common.cancelAlt')}
        </button>
        <button
          className="btn-submit-task"
          disabled={!title.trim() || !assigneeId || submitting}
          onClick={handleSubmit}
        >
          {submitting ? t('common.creating') : t('tasks.submit')}
        </button>
      </div>
    </div>
  );
}
