import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { workspaceAPI } from '../../services/api';
import { Workspace } from '../../types';
import { canCreateWorkspace, canCreateTask } from '../../lib/workspaceRole';
import './WorkspaceSelectPage.css';

export default function WorkspaceSelectPage() {
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, fetchWorkspaces, setCurrentWorkspace } =
    useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDept, setFormDept] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchWorkspaces().finally(() => setLoading(false));
  }, [fetchWorkspaces]);

  const handleEnter = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    navigate('/home');
  };

  const allowCreateWorkspace = canCreateWorkspace(workspaces);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreating(true);
    try {
      await workspaceAPI.create({
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        department: formDept.trim() || undefined,
      });
      await fetchWorkspaces();
      setShowModal(false);
      setFormName('');
      setFormDesc('');
      setFormDept('');
    } catch {
      setError('Không thể tạo workspace.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa workspace này?')) return;
    try {
      await workspaceAPI.delete(id);
      await fetchWorkspaces();
    } catch {
      setError('Không thể xóa workspace.');
    }
  };

  return (
    <div className="workspace-select-page">
      <div className="ws-header">
        <div>
          <h1>Workspace của bạn</h1>
          <p className="ws-subtitle">Chọn workspace để bắt đầu làm việc</p>
        </div>
        {allowCreateWorkspace && (
          <button className="btn-new-ws" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus" /> Tạo Workspace mới
          </button>
        )}
      </div>

      {error && <div className="ws-error">{error}</div>}

      {loading ? (
        <div className="ws-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>Đang tải...</p>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="ws-empty">
          <i className="fas fa-building" />
          <p>Chưa có workspace nào.</p>
          {allowCreateWorkspace ? (
            <button className="btn-new-ws" onClick={() => setShowModal(true)}>
              Tạo Workspace đầu tiên
            </button>
          ) : (
            <p className="ws-empty-hint">
              Liên hệ Giám đốc (Admin) để được mời vào workspace.
            </p>
          )}
        </div>
      ) : (
        <div className="ws-grid">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className={`ws-card ${currentWorkspace?.id === ws.id ? 'ws-card-active' : ''}`}
            >
              {ws.roleId === 1 && (
                <button
                  className="ws-card-delete"
                  title="Xóa workspace"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ws.id);
                  }}
                >
                  <i className="fas fa-trash" />
                </button>
              )}

              <div className="ws-card-icon">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="ws-card-name">{ws.name}</h3>
              {ws.description && (
                <p className="ws-card-desc">{ws.description}</p>
              )}
              <div className="ws-card-meta">
                <span>
                  <i className="fas fa-users" /> {ws.memberCount ?? 0} thành viên
                </span>
                {ws.department && (
                  <span>
                    <i className="fas fa-building" /> {ws.department}
                  </span>
                )}
              </div>
              <div className="ws-card-actions">
                <button type="button" className="btn-enter" onClick={() => handleEnter(ws)}>
                  Vào Workspace
                </button>
                {(ws.roleId === 1 || (canCreateTask(ws.roleId) && ws.roleId === 2)) && (
                  <div
                    className={`ws-card-actions-extra ${
                      ws.roleId === 1 ? 'ws-card-actions-extra--two' : ''
                    }`}
                  >
                    {ws.roleId === 1 && (
                      <button
                        type="button"
                        className="btn-manage"
                        onClick={() => navigate(`/workspaces/${ws.id}/manage`)}
                      >
                        Quản lý WS
                      </button>
                    )}
                    {canCreateTask(ws.roleId) && (ws.roleId === 1 || ws.roleId === 2) && (
                      <button
                        type="button"
                        className="btn-manage btn-manage-manager"
                        onClick={() => {
                          setCurrentWorkspace(ws);
                          navigate('/tasks/create');
                        }}
                      >
                        {ws.roleId === 1 ? 'Tạo công việc' : 'Giao việc'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="ws-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h2>Tạo Workspace mới</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="ws-name">Tên Workspace *</label>
                <input
                  id="ws-name"
                  type="text"
                  placeholder="Nhập tên workspace..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="ws-desc">Mô tả</label>
                <textarea
                  id="ws-desc"
                  placeholder="Mô tả ngắn về workspace..."
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="ws-dept">Phòng ban</label>
                <input
                  id="ws-dept"
                  type="text"
                  placeholder="VD: Kỹ thuật, Kinh doanh..."
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={creating}>
                  {creating ? 'Đang tạo...' : 'Tạo Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
