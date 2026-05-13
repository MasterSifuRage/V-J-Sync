import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reminderAPI } from '../../services/api';
import { Reminder } from '../../types';
import './ReminderDetailPage.css';

export default function ReminderDetailPage() {
  const { reminderId } = useParams<{ reminderId: string }>();
  const navigate = useNavigate();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!reminderId) return;
    setLoading(true);
    reminderAPI
      .detail(reminderId)
      .then((res) => setReminder(res.data.reminder ?? res.data))
      .catch(() => setError('Không thể tải chi tiết nhắc nhở.'))
      .finally(() => setLoading(false));
  }, [reminderId]);

  const handleDelete = async () => {
    if (!reminderId || !window.confirm('Bạn có chắc muốn xóa nhắc nhở này?')) return;
    setDeleting(true);
    try {
      await reminderAPI.delete(reminderId);
      navigate('/reminders');
    } catch {
      setError('Không thể xóa nhắc nhở.');
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
      setError('Không thể cập nhật trạng thái.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('vi-VN', {
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
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error && !reminder) {
    return (
      <div className="reminder-detail-page">
        <div className="detail-error">{error}</div>
        <button className="btn-back" onClick={() => navigate('/reminders')}>
          <i className="fas fa-arrow-left" /> Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!reminder) return null;

  return (
    <div className="reminder-detail-page">
      <button className="btn-back" onClick={() => navigate('/reminders')}>
        <i className="fas fa-arrow-left" /> Quay lại danh sách
      </button>

      {error && <div className="detail-inline-error">{error}</div>}

      <div className="detail-card">
        <div className="detail-card-header">
          <div>
            <h1 className="detail-title">{reminder.title}</h1>
            <span className={`detail-status ${reminder.isCompleted ? 'status-completed' : 'status-pending'}`}>
              {reminder.isCompleted ? 'Hoàn thành' : 'Đang chờ'}
            </span>
          </div>
          <div className="detail-actions">
            <button className="btn-toggle" onClick={handleToggleComplete}>
              <i className={`fas ${reminder.isCompleted ? 'fa-undo' : 'fa-check'}`} />
              {reminder.isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
            </button>
            <button className="btn-edit" onClick={() => navigate(`/reminders/${reminderId}`)}>
              <i className="fas fa-edit" /> Chỉnh sửa
            </button>
            <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
              <i className="fas fa-trash" /> {deleting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </div>
        </div>

        {reminder.description && (
          <div className="detail-section">
            <h3>Mô tả</h3>
            <p className="detail-description">{reminder.description}</p>
          </div>
        )}

        <div className="detail-info-grid">
          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-clock" /> Thời gian nhắc</span>
            <span className="info-value">{formatDate(reminder.remindAt)}</span>
          </div>

          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-user-edit" /> Người tạo</span>
            <span className="info-value">{reminder.creator?.name ?? '—'}</span>
          </div>

          {reminder.target && (
            <div className="detail-info-item">
              <span className="info-label"><i className="fas fa-user" /> Người nhận</span>
              <span className="info-value">{reminder.target.name}</span>
            </div>
          )}

          <div className="detail-info-item">
            <span className="info-label"><i className="fas fa-calendar" /> Ngày tạo</span>
            <span className="info-value">{formatDate(reminder.createdAt)}</span>
          </div>
        </div>

        {reminder.tags.length > 0 && (
          <div className="detail-section">
            <h3>Tags</h3>
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
