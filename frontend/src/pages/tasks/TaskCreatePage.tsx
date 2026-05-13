import { useState, useEffect, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { taskAPI, workspaceAPI } from '../../services/api';
import { WorkspaceMember } from '../../types';
import './TaskCreatePage.css';

export default function TaskCreatePage() {
  const { currentWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('todo');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<string>('normal');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
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
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!currentWorkspace || !title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await taskAPI.create(currentWorkspace.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        tags,
        dueDate: dueDate || undefined,
        assigneeId: assigneeId || undefined,
        autoTranslate,
      });
      navigate('/tasks');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo công việc. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentWorkspace) {
    return <div className="task-list-loading">Vui lòng chọn một workspace trước.</div>;
  }

  return (
    <div className="task-create-page">
      <div className="task-create-breadcrumb">
        <Link to="/tasks">Công việc</Link>
        <span className="separator">&gt;</span>
        <span>Tạo công việc mới</span>
      </div>

      {error && <div className="task-create-error">{error}</div>}

      <div className="task-create-layout">
        {/* Left card */}
        <div className="task-create-left">
          <h2 className="section-title">Nội dung công việc</h2>

          <div className="form-group">
            <label>Tiêu đề</label>
            <input
              type="text"
              className="task-title-input"
              placeholder="Nhập tiêu đề công việc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Mô tả</label>
            <div className="description-editor">
              <div className="description-toolbar">
                <button type="button" title="Bold">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  </svg>
                </button>
                <button type="button" title="Italic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="4" x2="10" y2="4" />
                    <line x1="14" y1="20" x2="5" y2="20" />
                    <line x1="15" y1="4" x2="9" y2="20" />
                  </svg>
                </button>
                <button type="button" title="List">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </button>
                <button type="button" title="Đính kèm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
              </div>
              <textarea
                className="description-textarea"
                placeholder="Nhập mô tả chi tiết công việc..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
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
            <span className="ai-label">Tự động dịch sang Tiếng Nhật</span>
          </label>
        </div>

        {/* Right card */}
        <div className="task-create-right">
          <h2 className="section-title">Cài đặt</h2>

          <div className="form-group">
            <label>Trạng thái</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">Cần làm</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="review">Chờ đánh giá</option>
              <option value="done">Hoàn thành</option>
            </select>
          </div>

          <div className="form-group">
            <label>Người thực hiện</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">-- Chọn người thực hiện --</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Hạn hoàn thành</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Độ ưu tiên</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tags</label>
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
                placeholder={tags.length === 0 ? 'Nhập tag rồi nhấn Enter...' : ''}
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
          Hủy bỏ
        </button>
        <button
          className="btn-submit-task"
          disabled={!title.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Đang tạo...' : 'Tạo công việc'}
        </button>
      </div>
    </div>
  );
}
