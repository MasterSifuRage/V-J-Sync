import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { workspaceAPI } from '../../services/api';
import { WorkspaceMember } from '../../types';
import { ROLE_I18N_KEYS } from '../../lib/dateLocale';
import { normalizeUILanguage } from '../../lib/uiLanguage';
import UserAvatar from '../../components/common/UserAvatar';
import './WorkspaceManagementPage.css';

interface SecuritySettings {
  encryption: boolean;
  fileSharingLimits: boolean;
  autoDeleteHistory: boolean;
}

interface PickableUser {
  id: string;
  name: string;
  email: string;
  preferredLanguage?: string;
}

const ROLE_OPTIONS = [1, 2, 3, 4] as const;
const PERMISSION_OPTIONS = [
  { value: 'admin', key: 'permissionAdmin' },
  { value: 'write', key: 'permissionWrite' },
  { value: 'read', key: 'permissionRead' },
] as const;

/** Giá trị permission cũ trong DB → giá trị select UI */
function permissionSelectValue(permission: string): string {
  if (permission === 'full') return 'admin';
  if (permission === 'task_remind') return 'write';
  if (permission === 'chat_view' || permission === 'view_only') return 'read';
  return permission;
}

export default function WorkspaceManagementPage() {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(null);
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
  const [newRole, setNewRole] = useState(3);
  const [newPermission, setNewPermission] = useState('read');
  const [adding, setAdding] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<PickableUser[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      workspaceAPI.list(),
      workspaceAPI.getMembers(workspaceId),
    ])
      .then(([wsRes, memRes]) => {
        const wsList = wsRes.data.workspaces ?? wsRes.data;
        const ws = wsList.find((w: { id: string; roleId?: number; createdById?: string }) => w.id === workspaceId);
        if (!ws || ws.roleId !== 1) {
          navigate('/workspaces', { replace: true });
          return;
        }
        setWorkspaceOwnerId(ws.createdById ?? null);
        setName(ws.name || '');
        setDepartment(ws.department || '');
        setDescription(ws.description || '');
        setMembers(memRes.data.members ?? memRes.data);
      })
      .catch(() => setError(t('wsManage.loadError')))
      .finally(() => setLoading(false));
  }, [workspaceId, navigate]);

  useEffect(() => {
    if (!showAddModal || !workspaceId) return;
    setLoadingAvailable(true);
    workspaceAPI
      .getAvailableUsers(workspaceId)
      .then((res) => setAvailableUsers(res.data.users ?? []))
      .catch(() => setAvailableUsers([]))
      .finally(() => setLoadingAvailable(false));
  }, [showAddModal, workspaceId]);

  const resetAddMemberForm = () => {
    setNewEmail('');
    setNewName('');
    setNewRole(3);
    setNewPermission('read');
    setShowUserPicker(false);
    setPickedUserId(null);
  };

  const openAddMemberModal = () => {
    resetAddMemberForm();
    setShowAddModal(true);
  };

  const handlePickUser = (u: PickableUser) => {
    setPickedUserId(u.id);
    setNewEmail(u.email);
    setNewName(u.name);
  };

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
      setSuccess(t('wsManage.saveSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('wsManage.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async (
    userId: string,
    field: 'roleId' | 'permission' | 'preferredLanguage',
    value: string | number
  ) => {
    if (!workspaceId) return;
    try {
      const payload =
        field === 'preferredLanguage'
          ? { preferredLanguage: value }
          : field === 'roleId'
            ? { roleId: value }
            : { permission: value };
      const res = await workspaceAPI.updateMember(workspaceId, userId, payload);
      const updated: WorkspaceMember = res.data.member ?? res.data;
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? updated : m))
      );
    } catch {
      setError(t('wsManage.updateMemberError'));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspaceId || !window.confirm(t('wsManage.confirmRemoveMember')))
      return;
    try {
      await workspaceAPI.removeMember(workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      setError(t('wsManage.removeMemberError'));
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
        roleId: newRole,
        permission: newPermission,
      });
      const res = await workspaceAPI.getMembers(workspaceId);
      setMembers(res.data.members ?? res.data);
      setShowAddModal(false);
      resetAddMemberForm();
    } catch {
      setError(t('wsManage.addMemberError'));
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="ws-manage-page">
        <div className="manage-loading">
          <i className="fas fa-spinner fa-spin" />
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-manage-page">
      <div className="manage-header">
        <div className="manage-header-left">
          <button className="btn-back" onClick={() => navigate('/workspaces')}>
            <i className="fas fa-arrow-left" /> {t('wsManage.back')}
          </button>
          <h1>{t('wsManage.title')}</h1>
          <span className="badge-director">{t('wsManage.directorBadge')}</span>
        </div>
        <button className="btn-save-header" onClick={handleSave} disabled={saving}>
          <i className="fas fa-save" /> {saving ? t('common.saving') : t('wsManage.saveChanges')}
        </button>
      </div>

      {error && <div className="manage-error">{error}</div>}
      {success && <div className="manage-success">{success}</div>}

      <div className="manage-card">
        <h2 className="card-title">
          <i className="fas fa-info-circle" /> {t('wsManage.generalInfo')}
        </h2>
        <div className="info-grid">
          <div className="form-group">
            <label htmlFor="ws-name">{t('wsManage.wsName')}</label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wsManage.wsNamePlaceholder')}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ws-dept">{t('settings.department')}</label>
            <input
              id="ws-dept"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={t('wsManage.deptPlaceholder')}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="ws-desc">{t('common.description')}</label>
            <textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('wsManage.manageDescPlaceholder')}
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="manage-card">
        <div className="card-title-row">
          <h2 className="card-title">
            <i className="fas fa-users" /> {t('wsManage.membersTitle')}
          </h2>
          <button className="btn-add-member" onClick={openAddMemberModal}>
            <i className="fas fa-plus" /> {t('wsManage.addMember')}
          </button>
        </div>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>{t('wsManage.colMember')}</th>
                <th>{t('wsManage.colLanguage')}</th>
                <th>{t('wsManage.colRole')}</th>
                <th>{t('wsManage.colPermission')}</th>
                <th>{t('wsManage.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="member-cell">
                      <UserAvatar
                        name={m.user.name}
                        avatarUrl={m.user.avatarUrl}
                        size="sm"
                        className="member-avatar"
                      />
                      <div>
                        <div className="member-name">{m.user.name}</div>
                        <div className="member-email">{m.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="member-ui-lang-select"
                      value={normalizeUILanguage(m.user.preferredLanguage)}
                      title={t('wsManage.langGlobalHint')}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'preferredLanguage', e.target.value)
                      }
                    >
                      <option value="vi">{t('settings.langVi')}</option>
                      <option value="ja">{t('settings.langJa')}</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={m.roleId}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'roleId', Number(e.target.value))
                      }
                    >
                      {ROLE_OPTIONS.map((roleId) => (
                        <option key={roleId} value={roleId}>
                          {t(`roles.${ROLE_I18N_KEYS[roleId]}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={permissionSelectValue(m.permission)}
                      onChange={(e) =>
                        handleUpdateMember(m.userId, 'permission', e.target.value)
                      }
                    >
                      {PERMISSION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(`wsManage.${opt.key}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {workspaceOwnerId && m.userId === workspaceOwnerId ? (
                      <span className="member-owner-label">{t('wsManage.ownerLabel')}</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-remove-member"
                        onClick={() => handleRemoveMember(m.userId)}
                        title={t('wsManage.removeMemberTitle')}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {t('wsManage.emptyMembers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="manage-card">
        <h2 className="card-title">
          <i className="fas fa-shield-alt" /> {t('wsManage.securityTitle')}
        </h2>
        <div className="security-list">
          <div className="security-item">
            <div>
              <span className="security-label">{t('wsManage.encryption')}</span>
              <span className="security-desc">{t('wsManage.encryptionDesc')}</span>
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
              <span className="security-label">{t('wsManage.fileSharingLimits')}</span>
              <span className="security-desc">{t('wsManage.fileSharingDesc')}</span>
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
              <span className="security-label">{t('wsManage.autoDeleteHistory')}</span>
              <span className="security-desc">{t('wsManage.autoDeleteDesc')}</span>
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

      {showAddModal && (
        <div
          className="ws-modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            resetAddMemberForm();
          }}
        >
          <div className="ws-modal ws-modal-add-member" onClick={(e) => e.stopPropagation()}>
            <div className="ws-modal-header">
              <h2>{t('wsManage.addMemberModal')}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddMemberForm();
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="quick-pick-block">
                <button
                  type="button"
                  className="btn-quick-pick-toggle"
                  onClick={() => setShowUserPicker((v) => !v)}
                  aria-expanded={showUserPicker}
                >
                  <i className={`fas fa-chevron-${showUserPicker ? 'up' : 'down'}`} />
                  {t('wsManage.quickPick')}
                  {availableUsers.length > 0 && (
                    <span className="quick-pick-count">{availableUsers.length}</span>
                  )}
                </button>
                {showUserPicker && (
                  <div className="user-pick-list-wrap">
                    {loadingAvailable ? (
                      <p className="user-pick-hint">
                        <i className="fas fa-spinner fa-spin" /> {t('wsManage.loadingUsers')}
                      </p>
                    ) : availableUsers.length === 0 ? (
                      <p className="user-pick-hint">{t('wsManage.allUsersInWs')}</p>
                    ) : (
                      <ul className="user-pick-list" role="listbox" aria-label={t('wsManage.pickMemberAria')}>
                        {availableUsers.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={pickedUserId === u.id}
                              className={`user-pick-item${pickedUserId === u.id ? ' selected' : ''}`}
                              onClick={() => handlePickUser(u)}
                            >
                              {u.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="form-divider">
                <span>{t('wsManage.orManual')}</span>
              </div>
              <div className="form-group">
                <label htmlFor="mem-email">{t('common.email')} *</label>
                <input
                  id="mem-email"
                  type="email"
                  placeholder="email@company.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setPickedUserId(null);
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="mem-name">{t('wsManage.memberName')}</label>
                <input
                  id="mem-name"
                  type="text"
                  placeholder={t('wsManage.memberNamePlaceholder')}
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setPickedUserId(null);
                  }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="mem-role">{t('wsManage.colRole')}</label>
                  <select
                    id="mem-role"
                    value={newRole}
                    onChange={(e) => setNewRole(Number(e.target.value))}
                  >
                    {ROLE_OPTIONS.map((roleId) => (
                      <option key={roleId} value={roleId}>
                        {t(`roles.${ROLE_I18N_KEYS[roleId]}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="mem-perm">{t('wsManage.colPermission')}</label>
                  <select
                    id="mem-perm"
                    value={newPermission}
                    onChange={(e) => setNewPermission(e.target.value)}
                  >
                    {PERMISSION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(`wsManage.${opt.key}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddModal(false);
                    resetAddMemberForm();
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-save" disabled={adding}>
                  {adding ? t('wsManage.adding') : t('wsManage.addMember')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
