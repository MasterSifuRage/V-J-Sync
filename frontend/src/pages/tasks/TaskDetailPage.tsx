import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { taskAPI } from '../../services/api';
import { Task } from '../../types';
import './TaskDetailPage.css';

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang xử lý',
  review: 'Chờ đánh giá',
  done: 'Hoàn thành',
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: 'Bình thường',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

function getTagClass(tag: string): string {
  const lower = tag.toLowerCase();
  if (lower.includes('sprint')) return 'tag-sprint';
  if (lower.includes('bug')) return 'tag-bug';
  if (lower.includes('feature') || lower.includes('tính năng')) return 'tag-feature';
  return 'tag-default';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Chưa đặt';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
    fetchTask();
  }, [taskId]);

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

  const handleMarkDone = async () => {
    if (!taskId || !task || task.status === 'done') return;
    setActionLoading(true);
    try {
      await taskAPI.update(taskId, { status: 'done' });
      await fetchTask();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    if (!window.confirm('Bạn có chắc muốn xóa công việc này?')) return;
    setActionLoading(true);
    try {
      await taskAPI.delete(taskId);
      navigate('/tasks');
    } catch {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="task-detail-loading">Đang tải chi tiết...</div>;
  }

  if (!task) {
    return <div className="task-detail-loading">Không tìm thấy công việc.</div>;
  }

  return (
    <div className="task-detail-page">
      <div className="task-detail-breadcrumb">
        <Link to="/tasks">Công việc</Link>
        <span className="separator">&gt;</span>
        <span>{task.title}</span>
      </div>

      {/* Header */}
      <div className="task-detail-header">
        <div className="task-detail-title-row">
          <h1 className="task-detail-title">{task.title}</h1>
          <div className="task-detail-badges">
            <span className={`badge badge-${task.status}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className={`badge badge-${task.priority}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="task-detail-card">
        <h3>Mô tả</h3>
        {task.description ? (
          <div className="task-description-content">{task.description}</div>
        ) : (
          <div className="task-description-empty">Chưa có mô tả cho công việc này.</div>
        )}
      </div>

      {/* Meta */}
      <div className="task-detail-card">
        <h3>Thông tin chi tiết</h3>
        <div className="task-meta-grid">
          <div className="task-meta-item">
            <span className="meta-label">Người thực hiện</span>
            <div className="meta-value">
              {task.assignee ? (
                <div className="meta-user">
                  <div className="avatar-sm">
                    {task.assignee.avatarUrl ? (
                      <img src={task.assignee.avatarUrl} alt="" />
                    ) : (
                      getInitials(task.assignee.name)
                    )}
                  </div>
                  <span>{task.assignee.name}</span>
                </div>
              ) : (
                <span style={{ color: '#94a3b8' }}>Chưa giao</span>
              )}
            </div>
          </div>

          <div className="task-meta-item">
            <span className="meta-label">Người tạo</span>
            <div className="meta-value">
              <div className="meta-user">
                <div className="avatar-sm">
                  {task.creator.avatarUrl ? (
                    <img src={task.creator.avatarUrl} alt="" />
                  ) : (
                    getInitials(task.creator.name)
                  )}
                </div>
                <span>{task.creator.name}</span>
              </div>
            </div>
          </div>

          <div className="task-meta-item">
            <span className="meta-label">Hạn hoàn thành</span>
            <span className="meta-value">{formatDate(task.dueDate)}</span>
          </div>

          <div className="task-meta-item">
            <span className="meta-label">Ngày tạo</span>
            <span className="meta-value">{formatDateTime(task.createdAt)}</span>
          </div>

          {task.tags.length > 0 && (
            <div className="task-meta-item" style={{ gridColumn: '1 / -1' }}>
              <span className="meta-label">Tags</span>
              <div className="meta-tags">
                {task.tags.map((tag) => (
                  <span key={tag} className={`tag ${getTagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="task-detail-card">
        <h3>Bình luận ({task.comments?.length ?? 0})</h3>
        <div className="comments-section">
          {task.comments && task.comments.length > 0 ? (
            <div className="comment-list">
              {task.comments.map((c) => (
                <div className="comment-item" key={c.id}>
                  <div className="comment-avatar">
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" />
                    ) : (
                      getInitials(c.user.name)
                    )}
                  </div>
                  <div className="comment-body">
                    <div className="comment-header">
                      <span className="comment-author">{c.user.name}</span>
                      <span className="comment-time">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="comments-empty">Chưa có bình luận nào.</div>
          )}

          <div className="comment-form">
            <textarea
              className="comment-input"
              placeholder="Viết bình luận..."
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
              className="btn-send-comment"
              disabled={!comment.trim() || sendingComment}
              onClick={handleAddComment}
            >
              {sendingComment ? 'Gửi...' : 'Gửi'}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="task-detail-actions">
        <button
          className={`btn-complete ${task.status === 'done' ? 'already-done' : ''}`}
          disabled={task.status === 'done' || actionLoading}
          onClick={handleMarkDone}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {task.status === 'done' ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
        </button>
        <button
          className="btn-delete"
          onClick={handleDelete}
          disabled={actionLoading}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Xóa
        </button>
      </div>
    </div>
  );
}
