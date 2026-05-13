import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { reminderAPI, workspaceAPI } from '../../services/api';
import { WorkspaceMember } from '../../types';
import { useEffect } from 'react';
import './ReminderCreatePage.css';

export default function ReminderCreatePage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [tagsInput, setTagsInput] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    if (!title.trim() || !remindAt) {
      setError('Vui lòng điền tiêu đề và thời gian nhắc.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await reminderAPI.create(currentWorkspace.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        remindAt: new Date(remindAt).toISOString(),
        targetUserId: targetUserId || undefined,
        tags,
      });
      navigate('/reminders');
    } catch {
      setError('Không thể tạo nhắc nhở. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reminder-create-page">
      <div className="reminder-create-header">
        <button className="btn-back" onClick={() => navigate('/reminders')}>
          <i className="fas fa-arrow-left" /> Quay lại
        </button>
        <h1>Tạo nhắc nhở mới</h1>
      </div>

      <form className="reminder-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="title">Tiêu đề *</label>
          <input
            id="title"
            type="text"
            placeholder="Nhập tiêu đề nhắc nhở..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Mô tả</label>
          <textarea
            id="description"
            placeholder="Nhập mô tả chi tiết..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="remindAt">Thời gian nhắc *</label>
            <input
              id="remindAt"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetUser">Người nhận</label>
            <select
              id="targetUser"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">-- Chọn người nhận --</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (phân cách bằng dấu phẩy)</label>
          <input
            id="tags"
            type="text"
            placeholder="VD: quan trọng, họp, deadline"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/reminders')}>
            Hủy bỏ
          </button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu lời nhắc'}
          </button>
        </div>
      </form>
    </div>
  );
}
