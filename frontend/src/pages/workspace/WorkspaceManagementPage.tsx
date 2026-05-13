import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workspaceAPI } from '../../services/api';
import { WorkspaceMember } from '../../types';
import './WorkspaceManagementPage.css';

interface SecuritySettings {
  encryption: boolean;
  fileSharingLimits: boolean;
  autoDeleteHistory: boolean;
}

export default function WorkspaceManagementPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [security, setSecurity] = useState<SecuritySettings>({
    encryption: true,
    fileSharingLimits: false,
    autoDeleteHistory: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newLanguage, setNewLanguage] = useState('vi');
  const [newRole, setNewRole] = useState(3);
  const [newPermission, setNewPermission] = useState('read');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      workspaceAPI.list(),
      workspaceAPI.getMembers(workspaceId),
    ])
      .then(([wsRes, memRes]) => {
        const wsList = wsRes.data.workspaces ?? wsRes.data;
        const ws = wsList.find((w: any) => w.id === workspaceId);
        if (ws) {
          setName(ws.name || '');
          setDepartment(ws.department || '');
          setDescription(ws.description || '');
        }
        setMembers(memRes.data.members ?? memRes.data);
      })
      .catch(() => setError('Không thể tải dữ liệu workspace.'))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await workspaceAPI.update(workspaceId, {
        name: name.trim(),
        department: department.trim() || undefined,
        description: description.trim() || undefined,
      });
      setSuccess('Đã lưu thay đổi thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async (
    userId: string,
    field: string,
    value: any
  ) => {
    if (!workspaceId) return;
    try {
      await workspaceAPI.updateMember(workspaceId, userId, { [field]: value });
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId ? { ...m, [field]: value } : m
        )
      );
    } catch {
      setError('Không thể cập nhật thành viên.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId || !window.confirm('Xóa thành viên này khỏi workspace?'))
      return;
    try {
      await workspaceAPI.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      setError('Không thể xóa thành viên.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !newEmail.trim()) return;
    setAdding(true);
    try {
      await workspaceAPI.addMember(workspaceId, {
        email: newEmail.trim(),
        name: newName.trim() || undefined,
        preferredLanguage: newLanguage,
        roleId: newRole,
        permission: newPermission,
      });
      const res = await workspaceAPI.getMembers(workspaceId);
      setMembers(res.data.members ?? res.data);
      setShowAddModal(false);
      setNewEmail('');
      setNewName('');
      setNewLanguage('vi');
      setNewRole(3);
      setNewPermission('read');
    } catch {
      setError('Không thể thêm thành viên. Kiểm tra lại email.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-manage-page">
        <div className="manage-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-manage-page">
      {/* Header */}
      <div className="manage-header">
        <div className="manage-header-left">
          <button className="btn-back" onClick={() => navigate('/workspaces')}>
            <i className="fas fa-arrow-left" /> Quay lại
          </button>
          <h1>Quản lý Workspace</h1>
          <span className="badge-director">Director Access</span>
        </div>
        <button className="btn-save-header" onClick={handleSave} disabled={saving}>
          <i className="fas fa-save" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {error && <div className="manage-error">{error}</div>}
      {success && <div className="manage-success">{success}</div>}

      {/* Card 1: General Info */}
      <div className="manage-card">
        <h2 className="card-title">
          <i className="fas fa-info-circle" /> Thông tin chung
        </h2>
        <div className="info-grid">
          <div className="form-group">
            <label htmlFor="ws-name">Tên Workspace</label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên workspace"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ws-dept">Phòng ban</label>
            <input
              id="ws-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Phòng ban"
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="ws-desc">Mô tả</label>
            <textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả workspace..."
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Card 2: Members */}
      <div className="manage-card">
        <div className="card-title-row">
          <h2 className="card-title">
            <i className="fas fa-users" /> Quản lý thành viên
          </h2>
          <button className="btn-add-member" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus" /> Thêm thành viên
          </button>
        </div>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Ngôn ngữ</th>
                <th>Vai trò</th>
                <th>Quyền hạn</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <div className="member-avatar">
                        {m.user.name
                          ? m.user.name.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                      <div>
                        <div className="member-name">{m.user.name}</div>
                        <div className="member-email">{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={m.user.preferredLanguage || 'vi'}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'preferredLanguage', e.target.value)
                      }
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="ja">日本語</option>
                      <option value="en">English</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={m.roleId}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'roleId', Number(e.target.value))
                      }
                    >
                      <option value={1}>Giám đốc</option>
                      <option value={2}>Quản lý</option>
                      <option value={3}>Nhân viên</option>
                      <option value={4}>Khách</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={m.permission}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'permission', e.target.value)
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="write">Ghi</option>
                      <option value="read">Đọc</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn-remove-member"
                      onClick={() => handleRemoveMember(m.userId)}
                      title="Xóa thành viên"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Chưa có thành viên nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: Security */}
      <div className="manage-card">
        <h2 className="card-title">
          <i className="fas fa-shield-alt" /> Bảo mật dữ liệu
        </h2>
        <div className="security-list">
          <div className="security-item">
            <div>
              <span className="security-label">Mã hóa dữ liệu</span>
              <span className="security-desc">Mã hóa toàn bộ dữ liệu trong workspace</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={security.encryption}
                onChange={(e) => setSecurity({ ...security, encryption: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="security-item">
            <div>
              <span className="security-label">Giới hạn chia sẻ file</span>
              <span className="security-desc">Hạn chế tải lên và chia sẻ file ra ngoài</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={security.fileSharingLimits}
                onChange={(e) => setSecurity({ ...security, fileSharingLimits: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="security-item">
            <div>
              <span className="security-label">Tự động xóa lịch sử</span>
              <span className="security-desc">Xóa lịch sử chat sau 90 ngày</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={security.autoDeleteHistory}
                onChange={(e) => setSecurity({ ...security, autoDeleteHistory: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="ws-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h2>Thêm thành viên</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label htmlFor="mem-email">Email *</label>
                <input
                  id="mem-email"
                  type="email"
                  placeholder="email@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="mem-name">Tên</label>
                <input
                  id="mem-name"
                  type="text"
                  placeholder="Tên thành viên"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mem-lang">Ngôn ngữ</label>
                  <select
                    id="mem-lang"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mem-role">Vai trò</label>
                  <select
                    id="mem-role"
                    value={newRole}
                    onChange={(e) => setNewRole(Number(e.target.value))}
                  >
                    <option value={1}>Giám đốc</option>
                    <option value={2}>Quản lý</option>
                    <option value={3}>Nhân viên</option>
                    <option value={4}>Khách</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="mem-perm">Quyền hạn</label>
                <select
                  id="mem-perm"
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="write">Ghi</option>
                  <option value="read">Đọc</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-save" disabled={adding}>
                  {adding ? 'Đang thêm...' : 'Thêm thành viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
