import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { reminderAPI } from '../../services/api';
import { Reminder } from '../../types';
import './ReminderListPage.css';

export default function ReminderListPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentWorkspace) return;
    setLoading(true);
    reminderAPI
      .list(currentWorkspace.id)
      .then((res) => setReminders(res.data.reminders ?? res.data))
      .catch(() => setError('Không thể tải danh sách nhắc nhở.'))
      .finally(() => setLoading(false));
  }, [currentWorkspace]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="reminder-list-page">
      <div className="reminder-header">
        <div>
          <h1>Danh sách Nhắc nhở</h1>
          <p className="reminder-subtitle">Quản lý tất cả nhắc nhở trong workspace</p>
        </div>
        <button className="btn-create" onClick={() => navigate('/reminders/create')}>
          <i className="fas fa-plus" /> Tạo nhắc nhở
        </button>
      </div>

      {error && <div className="reminder-error">{error}</div>}

      {loading ? (
        <div className="reminder-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>Đang tải...</p>
        </div>
      ) : reminders.length === 0 ? (
        <div className="reminder-empty">
          <i className="fas fa-bell-slash" />
          <p>Chưa có nhắc nhở nào.</p>
          <button className="btn-create-alt" onClick={() => navigate('/reminders/create')}>
            Tạo nhắc nhở đầu tiên
          </button>
        </div>
      ) : (
        <div className="reminder-grid">
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`reminder-card ${r.isCompleted ? 'completed' : ''}`}
              onClick={() => navigate(`/reminders/${r.id}`)}
            >
              <div className="reminder-card-header">
                <h3 className="reminder-card-title">{r.title}</h3>
                <span className={`reminder-status ${r.isCompleted ? 'status-completed' : 'status-pending'}`}>
                  {r.isCompleted ? 'Hoàn thành' : 'Đang chờ'}
                </span>
              </div>

              {r.description && (
                <p className="reminder-card-desc">{r.description}</p>
              )}

              <div className="reminder-card-meta">
                <span className="meta-item">
                  <i className="fas fa-clock" /> {formatDate(r.remindAt)}
                </span>
                {r.target && (
                  <span className="meta-item">
                    <i className="fas fa-user" /> {r.target.name}
                  </span>
                )}
              </div>

              {r.tags.length > 0 && (
                <div className="reminder-card-tags">
                  {r.tags.map((tag, i) => (
                    <span key={i} className="reminder-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
