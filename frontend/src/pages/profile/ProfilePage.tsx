import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { userAPI } from '../../services/api';
import { ROLE_NAMES } from '../../types';
import UserAvatar from '../../components/common/UserAvatar';
import './ProfilePage.css';

type ModalState = null | { type: 'success' | 'error'; title: string; message: string };

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('vi');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
  }, [user]);

  const dirty = useMemo(
    () =>
      !!user &&
      (name.trim() !== (user.name || '') ||
        phone.trim() !== (user.phone || '') ||
        department.trim() !== (user.department || '') ||
        preferredLanguage !== (user.preferredLanguage || 'vi')),
    [user, name, phone, department, preferredLanguage],
  );

  const roleLabel = currentWorkspace?.roleId
    ? ROLE_NAMES[currentWorkspace.roleId]
    : null;

  const handleSave = async () => {
    if (!name.trim()) {
      setModal({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Họ và tên không được để trống.',
      });
      return;
    }
    setSaving(true);
    try {
      const res = await userAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage,
      });
      setUser(res.data.user ?? res.data);
      setModal({
        type: 'success',
        title: 'Đã lưu',
        message: 'Thông tin tài khoản cá nhân đã được cập nhật.',
      });
    } catch {
      setModal({
        type: 'error',
        title: 'Lưu thất bại',
        message: 'Không thể lưu thay đổi. Vui lòng thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
  };

  return (
    <div className="profile-page">
        <header className="profile-header">
          <h1>Tài khoản cá nhân</h1>
          <p className="profile-subtitle">Xem và chỉnh sửa thông tin hồ sơ của bạn</p>
        </header>

        <section className="profile-card profile-card-hero">
          <UserAvatar
            name={name || user?.name}
            avatarUrl={user?.avatarUrl}
            size="lg"
            className="profile-avatar-lg"
          />
          <div className="profile-hero-text">
            <h2>{user?.name || '—'}</h2>
            <p>{user?.email}</p>
            {roleLabel && currentWorkspace && (
              <span className="profile-role-badge">
                {roleLabel} · {currentWorkspace.name}
              </span>
            )}
          </div>
        </section>

        <section className="profile-card">
          <h3 className="profile-card-title">
            <i className="fas fa-id-card" /> Thông tin cơ bản
          </h3>
          <div className="profile-form-grid">
            <div className="form-group">
              <label htmlFor="p-name">Họ và tên</label>
              <input
                id="p-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Họ và tên"
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-email">Email</label>
              <input id="p-email" type="email" value={user?.email || ''} disabled className="input-disabled" />
            </div>
            <div className="form-group">
              <label htmlFor="p-phone">Số điện thoại</label>
              <input
                id="p-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại"
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-dept">Phòng ban</label>
              <input
                id="p-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Phòng ban"
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="p-lang">Ngôn ngữ ưu tiên</label>
              <select
                id="p-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="ja">日本語</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </section>

        <div className="profile-actions">
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={!dirty || saving}>
            Hoàn tác
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        <p className="profile-more">
          <Link to="/settings">
            <i className="fas fa-cog" /> Cài đặt ứng dụng (ngôn ngữ dịch, thông báo…)
          </Link>
        </p>

        {modal && (
          <div
            className="profile-modal-overlay"
            role="presentation"
            onClick={() => setModal(null)}
          >
            <div
              className={`profile-modal profile-modal--${modal.type}`}
              role="alertdialog"
              aria-labelledby="profile-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 id="profile-modal-title">{modal.title}</h4>
              <p>{modal.message}</p>
              <button type="button" className="btn-primary" onClick={() => setModal(null)}>
                Đóng
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
