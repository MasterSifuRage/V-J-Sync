import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { taskAPI, aiAPI } from '../../services/api';
import { canCreateTask, isEmployee } from '../../lib/workspaceRole';
import { uiDateLocale } from '../../lib/dateLocale';
import {
  detectTextLang,
  isValidTranslation,
  translationPair,
  type ContentLang,
} from '../../lib/textLang';
import { useTranslateTarget } from '../../hooks/useTranslateTarget';
import { Task, TaskComment } from '../../types';
import UserAvatar from '../../components/common/UserAvatar';
import MarkdownContent from '../../components/common/MarkdownContent';
import TaskAttachmentList from '../../components/tasks/TaskAttachmentList';
import {
  TaskTranslationBlock,
  AiDisclaimerNote,
  taskShortId,
  fetchTranslation,
} from './taskDetailHelpers';
import './TaskDetailPage.css';

const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done'] as const;
const EMPLOYEE_STATUS_OPTIONS = ['todo', 'in_progress', 'review'] as const;

function getTagClass(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes('sprint')) return 'tag-sprint';
  if (lower.includes('bug')) return 'tag-bug';
  if (lower.includes('feature') || lower.includes('tính năng')) return 'tag-feature';
  return 'tag-default';
}

function DescriptionText({ text }: { text: string }) {
  return <div className="task-description-content">{text}</div>;
}

export default function TaskDetailPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const roleId = currentWorkspace?.roleId;
  const employeeView = isEmployee(roleId);
  const canManageTask = canCreateTask(roleId);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentExpanded, setCommentExpanded] = useState<Record<string, boolean>>({});
  const [commentTranslations, setCommentTranslations] = useState<Record<string, string>>({});
  const [commentTranslating, setCommentTranslating] = useState<Record<string, boolean>>({});
  const translateTarget = useTranslateTarget();
  const [summaryTranslation, setSummaryTranslation] = useState<string | null>(null);
  const [descTranslation, setDescTranslation] = useState<string | null>(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [summaryTranslating, setSummaryTranslating] = useState(false);
  const [descTranslating, setDescTranslating] = useState(false);

  const dateLocale = uiDateLocale(i18n.language);

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('common.notSet');
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const fetchTask = async () => {
    if (!taskId) return;
    try {
      const res = await taskAPI.detail(taskId);
      setTask(res.data.task ?? res.data);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCommentExpanded({});
    setCommentTranslations({});
    setSummaryExpanded(false);
    setDescExpanded(false);
    setSummaryTranslation(null);
    setDescTranslation(null);
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (!task?.description?.trim() || !task.autoTranslateJa) {
      setSummaryTranslation(null);
      setDescTranslation(null);
      setTranslationLoading(false);
      return;
    }

    let cancelled = false;

    const description = task.description!.trim();
    const loadTranslations = async () => {
      const target = translateTarget;
      const summaryText = task.summary ?? null;
      const summaryLang: ContentLang = 'vi';
      const descLang = detectTextLang(description);

      const summaryPair = translationPair(summaryLang, target);
      const descPair = translationPair(descLang, target);

      if (!summaryPair && !descPair) {
        setSummaryTranslation(null);
        setDescTranslation(null);
        return;
      }

      setTranslationLoading(true);

      const fetchIfNeeded = async (
        text: string | null | undefined,
        pair: { from: ContentLang; to: ContentLang } | null,
        stored?: string | null,
      ): Promise<string | null> => {
        if (!text?.trim() || !pair) return null;
        const cached = stored?.trim() && isValidTranslation(stored, pair.to) ? stored.trim() : null;
        if (cached) return cached;
        return fetchTranslation(text, pair.from, pair.to, aiAPI.translate);
      };

      try {
        const [sTrans, dTrans] = await Promise.all([
          fetchIfNeeded(
            summaryText,
            summaryPair,
            target === 'ja' ? task.summaryJa : undefined,
          ),
          fetchIfNeeded(
            description,
            descPair,
            target === 'ja' ? task.descriptionJa : undefined,
          ),
        ]);
        if (!cancelled) {
          setSummaryTranslation(sTrans);
          setDescTranslation(dTrans);
        }
      } finally {
        if (!cancelled) setTranslationLoading(false);
      }
    };

    void loadTranslations();
    return () => {
      cancelled = true;
    };
  }, [task, translateTarget]);

  const toggleSummaryTranslate = async () => {
    if (!task) return;
    if (summaryExpanded) {
      setSummaryExpanded(false);
      return;
    }
    const summaryText = task.summary ?? null;
    if (!summaryText?.trim()) return;
    const pair = translationPair('vi', translateTarget);
    if (!pair) return;

    const cached =
      summaryTranslation ??
      (translateTarget === 'ja' ? task.summaryJa?.trim() : undefined);
    if (cached && isValidTranslation(cached, translateTarget)) {
      setSummaryTranslation(cached);
      setSummaryExpanded(true);
      return;
    }

    setSummaryTranslating(true);
    const translated = await fetchTranslation(summaryText, pair.from, pair.to, aiAPI.translate);
    setSummaryTranslating(false);
    if (translated) {
      setSummaryTranslation(translated);
      setSummaryExpanded(true);
    }
  };

  const toggleDescTranslate = async () => {
    if (!task?.description?.trim()) return;
    if (descExpanded) {
      setDescExpanded(false);
      return;
    }
    const description = task.description.trim();
    const pair = translationPair(detectTextLang(description), translateTarget);
    if (!pair) return;

    const cached =
      descTranslation ??
      (translateTarget === 'ja' ? task.descriptionJa?.trim() : undefined);
    if (cached && isValidTranslation(cached, translateTarget)) {
      setDescTranslation(cached);
      setDescExpanded(true);
      return;
    }

    setDescTranslating(true);
    const translated = await fetchTranslation(description, pair.from, pair.to, aiAPI.translate);
    setDescTranslating(false);
    if (translated) {
      setDescTranslation(translated);
      setDescExpanded(true);
    }
  };

  const renderTranslateButton = (
    expanded: boolean,
    translating: boolean,
    onClick: () => void,
    canTranslate: boolean,
  ) => {
    if (!canTranslate) return null;
    return (
      <div className="task-content-actions">
        <button
          type="button"
          className="comment-translate-btn"
          disabled={translating}
          onClick={() => void onClick()}
        >
          <i className={`fas ${translating ? 'fa-spinner fa-spin' : 'fa-language'}`} />
          {translating ? t('common.loading') : expanded ? t('chat.hideTranslate') : t('chat.translate')}
        </button>
      </div>
    );
  };

  const handleAddComment = async () => {
    if (!taskId || !comment.trim()) return;
    setSendingComment(true);
    try {
      await taskAPI.addComment(taskId, { content: comment.trim() });
      setComment('');
      await fetchTask();
    } catch {
      // silently fail
    } finally {
      setSendingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!taskId || !task || task.status === newStatus) return;
    setActionLoading(true);
    try {
      await taskAPI.update(taskId, { status: newStatus });
      await fetchTask();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    if (!window.confirm(t('tasks.confirmDelete'))) return;
    setActionLoading(true);
    try {
      await taskAPI.delete(taskId);
      navigate('/tasks');
    } catch {
      setActionLoading(false);
    }
  };

  const getCommentTranslationTarget = (content: string): { from: ContentLang; to: ContentLang } | null => {
    const sourceLang = detectTextLang(content);
    return translationPair(sourceLang, translateTarget);
  };

  const toggleCommentTranslate = async (c: TaskComment) => {
    if (commentExpanded[c.id]) {
      setCommentExpanded((prev) => ({ ...prev, [c.id]: false }));
      return;
    }

    const cached = commentTranslations[c.id] ?? c.translatedContent?.trim();
    if (cached && isValidTranslation(cached, translateTarget)) {
      setCommentTranslations((prev) => ({ ...prev, [c.id]: cached }));
      setCommentExpanded((prev) => ({ ...prev, [c.id]: true }));
      return;
    }

    setCommentTranslating((prev) => ({ ...prev, [c.id]: true }));
    const pair = getCommentTranslationTarget(c.content);
    if (!pair) {
      setCommentTranslating((prev) => ({ ...prev, [c.id]: false }));
      return;
    }
    const translated = await fetchTranslation(c.content, pair.from, pair.to, aiAPI.translate);
    setCommentTranslating((prev) => ({ ...prev, [c.id]: false }));
    if (translated) {
      setCommentTranslations((prev) => ({ ...prev, [c.id]: translated }));
      setCommentExpanded((prev) => ({ ...prev, [c.id]: true }));
    }
  };

  const renderComment = (c: TaskComment) => {
    const isYou = c.userId === user?.id;
    const expanded = !!commentExpanded[c.id];
    const translation = commentTranslations[c.id] ?? c.translatedContent?.trim();
    const translating = !!commentTranslating[c.id];
    const pair = getCommentTranslationTarget(c.content);
    const canTranslate = !!pair;

    return (
      <div className="comment-item" key={c.id}>
        <UserAvatar
          name={c.user.name}
          avatarUrl={c.user.avatarUrl}
          size="md"
          className="comment-avatar"
        />
        <div className="comment-body">
          <div className="comment-header">
            <span className="comment-author">
              {c.user.name}
              {isYou ? ` ${t('common.you')}` : ''}
            </span>
            <span className="comment-time">{formatDateTime(c.createdAt)}</span>
          </div>
          <div className="comment-content">{c.content}</div>
          <div className="comment-actions">
            {canTranslate && (
              <button
                type="button"
                className="comment-translate-btn"
                disabled={translating}
                onClick={() => void toggleCommentTranslate(c)}
              >
                <i className={`fas ${translating ? 'fa-spinner fa-spin' : 'fa-language'}`} />
                {translating
                  ? t('common.loading')
                  : expanded
                    ? t('chat.hideTranslate')
                    : t('chat.translate')}
              </button>
            )}
          </div>
          {expanded && translation && isValidTranslation(translation, translateTarget) && (
            <TaskTranslationBlock variant={translateTarget}>
              <DescriptionText text={translation} />
            </TaskTranslationBlock>
          )}
        </div>
      </div>
    );
  };

  const displaySummary = task?.summary ?? null;
  const autoTranslateEnabled = !!task?.autoTranslateJa;
  const summaryNeedsTranslation = !!displaySummary && !!translationPair('vi', translateTarget);
  const descNeedsTranslation =
    !!task?.description && !!translationPair(detectTextLang(task.description), translateTarget);
  const aiLoading = loading || (autoTranslateEnabled && translationLoading);
  const showSummaryTranslation = summaryExpanded && !!summaryTranslation;
  const showDescTranslation = descExpanded && !!descTranslation;

  const renderTranslationBlock = (text: string | null) => {
    if (!text?.trim()) return null;
    return (
      <TaskTranslationBlock variant={translateTarget}>
        <DescriptionText text={text} />
      </TaskTranslationBlock>
    );
  };

  if (loading) {
    return <div className="task-detail-loading">{t('tasks.detailLoading')}</div>;
  }

  if (!task) {
    return <div className="task-detail-loading">{t('tasks.notFound')}</div>;
  }

  return (
    <div className="task-detail-page">
      <div className="task-detail-breadcrumb">
        <Link to="/tasks">{t('tasks.breadcrumb')}</Link>
        <span className="separator">&gt;</span>
        <span>{t('tasks.details')}</span>
      </div>

      <div className="task-detail-header">
        <div className="task-detail-title-block">
          <div className="task-detail-id">{taskShortId(task.id)}</div>
          <h1 className="task-detail-title">{task.title}</h1>
        </div>
        <div className="task-detail-badges">
          <span className={`badge badge-${task.status}`}>
            {t(`taskStatus.${task.status}`)}
          </span>
          <span className={`badge badge-${task.priority}`}>
            {t(`taskPriority.${task.priority}`)}
          </span>
        </div>
      </div>

      <div className="task-detail-layout">
        <div className="task-detail-main">
          {(task.description || (task.attachments?.length ?? 0) > 0) && (
            <>
              {task.description && (
              <div className="task-detail-card">
                <h3 className="section-title">
                  <i className="fas fa-file-alt" /> {t('tasks.summaryTitle')}
                </h3>
                {aiLoading && !displaySummary ? (
                  <div className="task-ai-loading">
                    <i className="fas fa-spinner fa-spin" /> {t('tasks.aiProcessing')}
                  </div>
                ) : displaySummary ? (
                  <>
                    <DescriptionText text={displaySummary} />
                    {displaySummary.trim() ? <AiDisclaimerNote kind="summary" /> : null}
                    {renderTranslateButton(
                      summaryExpanded,
                      summaryTranslating,
                      toggleSummaryTranslate,
                      summaryNeedsTranslation,
                    )}
                    {summaryNeedsTranslation && showSummaryTranslation
                      ? renderTranslationBlock(summaryTranslation)
                      : summaryExpanded && summaryNeedsTranslation && autoTranslateEnabled && translationLoading ? (
                        <div className="task-ai-loading task-ai-loading--inline">
                          <i className="fas fa-spinner fa-spin" /> {t('tasks.aiProcessing')}
                        </div>
                      ) : null}
                  </>
                ) : (
                  <div className="task-description-empty">{t('tasks.noSummary')}</div>
                )}
              </div>
              )}

              <div className="task-detail-card">
                <h3 className="section-title">
                  <i className="fas fa-align-left" /> {t('tasks.detailDescription')}
                </h3>
                {task.description ? (
                  <MarkdownContent markdown={task.description} className="task-description-content" />
                ) : (
                  <div className="task-description-empty">{t('tasks.noDescription')}</div>
                )}
                {task.attachments?.length ? <TaskAttachmentList attachments={task.attachments} /> : null}
                {task.description &&
                  renderTranslateButton(
                    descExpanded,
                    descTranslating,
                    toggleDescTranslate,
                    descNeedsTranslation,
                  )}
                {task.description && descNeedsTranslation && showDescTranslation
                  ? renderTranslationBlock(descTranslation)
                  : descExpanded && task.description && descNeedsTranslation && autoTranslateEnabled && translationLoading ? (
                    <div className="task-ai-loading task-ai-loading--inline">
                      <i className="fas fa-spinner fa-spin" /> {t('tasks.aiProcessing')}
                    </div>
                  ) : null}
              </div>
            </>
          )}

          {!task.description && !(task.attachments?.length ?? 0) && (
            <div className="task-detail-card">
              <h3 className="section-title">
                <i className="fas fa-align-left" /> {t('tasks.detailDescription')}
              </h3>
              <div className="task-description-empty">{t('tasks.noDescription')}</div>
            </div>
          )}

          <div className="task-detail-card">
            <h3 className="section-title">
              <i className="fas fa-comments" />{' '}
              {t('tasks.discussion', { count: task.comments?.length ?? 0 })}
            </h3>
            <div className="comments-section">
              {task.comments && task.comments.length > 0 ? (
                <div className="comment-list">{task.comments.map(renderComment)}</div>
              ) : (
                <div className="comments-empty">{t('tasks.noComments')}</div>
              )}

              <div className="comment-form">
                <UserAvatar
                  name={user?.name}
                  avatarUrl={user?.avatarUrl}
                  size="md"
                  className="comment-avatar"
                />
                <textarea
                  className="comment-input"
                  placeholder={t('tasks.commentPlaceholderAi')}
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-send-comment btn-send-icon"
                  disabled={!comment.trim() || sendingComment}
                  onClick={handleAddComment}
                  title={t('common.send')}
                >
                  <i className="fas fa-paper-plane" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="task-detail-sidebar">
          <div className="task-info-panel">
            <div className="task-meta-item">
              <span className="meta-label">{t('tasks.assignee')}</span>
              <div className="meta-value">
                {task.assignee ? (
                  <div className="meta-user">
                    <UserAvatar
                      name={task.assignee.name}
                      avatarUrl={task.assignee.avatarUrl}
                      size="sm"
                      className="avatar-sm"
                    />
                    <span>{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="meta-empty">{t('tasks.unassigned')}</span>
                )}
              </div>
            </div>

            <div className="task-meta-item">
              <span className="meta-label">{t('tasks.creator')}</span>
              <div className="meta-value">
                <div className="meta-user">
                  <UserAvatar
                    name={task.creator.name}
                    avatarUrl={task.creator.avatarUrl}
                    size="sm"
                    className="avatar-sm"
                  />
                  <span>{task.creator.name}</span>
                </div>
              </div>
            </div>

            <div className="task-meta-item">
              <span className="meta-label">{t('tasks.dueDate')}</span>
              <span className="meta-value">{formatDate(task.dueDate)}</span>
            </div>

            <div className="task-meta-item">
              <span className="meta-label">{t('tasks.createdAt')}</span>
              <span className="meta-value">{formatDateTime(task.createdAt)}</span>
            </div>

            {task.tags.length > 0 && (
              <div className="task-meta-item">
                <span className="meta-label">{t('common.tags')}</span>
                <div className="meta-tags">
                  {task.tags.map((tag) => (
                    <span key={tag} className={`tag ${getTagClass(tag)}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="task-sidebar-actions">
              {employeeView ? (
                <div className="task-employee-status-form">
                  <label htmlFor="task-status-select">{t('tasks.updateProgress')}</label>
                  {task.status === 'done' ? (
                    <p className="task-progress-locked">{t('tasks.progressLocked')}</p>
                  ) : (
                    <select
                      id="task-status-select"
                      value={task.status}
                      disabled={actionLoading}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      {EMPLOYEE_STATUS_OPTIONS.map((key) => (
                        <option key={key} value={key}>
                          {t(`taskStatus.${key}`)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : canManageTask ? (
                <div className="task-employee-status-form">
                  <label htmlFor="task-status-select">{t('tasks.updateProgress')}</label>
                  <select
                    id="task-status-select"
                    value={task.status}
                    disabled={actionLoading}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((key) => (
                      <option key={key} value={key}>
                        {t(`taskStatus.${key}`)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {canManageTask && (
                <button
                  type="button"
                  className="btn-delete btn-sidebar"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <i className="fas fa-trash" /> {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
