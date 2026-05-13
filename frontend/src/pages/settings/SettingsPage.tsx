import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { userAPI } from '../../services/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('vi');
  const [translateLanguage, setTranslateLanguage] = useState('ja');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiGrammar, setAiGrammar] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
  }, [user]);

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await userAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage,
      });
      setUser(res.data.user ?? res.data);
      setSuccess('Đã lưu thay đổi thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Không thể lưu thay đổi. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Cài đặt</h1>
        <p className="settings-subtitle">Quản lý hồ sơ và tùy chọn cá nhân</p>
      </div>

      {error && <div className="settings-error">{error}</div>}
      {success && <div className="settings-success">{success}</div>}

      {/* Card 1: Profile */}
      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-user-circle" /> Hồ sơ cá nhân
        </h2>
        <div className="profile-section">
          <div className="avatar-wrapper">
            <div className="avatar-circle">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={name} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button className="avatar-edit" title="Đổi ảnh đại diện">
              <i className="fas fa-camera" />
            </button>
          </div>
          <div className="profile-grid">
            <div className="form-group">
              <label htmlFor="s-name">Họ và tên</label>
              <input
                id="s-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Họ và tên"
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-phone">Số điện thoại</label>
              <input
                id="s-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại"
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-role">Vai trò</label>
              <input
                id="s-role"
                type="text"
                value={user?.email || ''}
                disabled
                className="input-disabled"
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-dept">Phòng ban</label>
              <input
                id="s-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Phòng ban"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Language */}
      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-language" /> Ngôn ngữ & Dịch thuật
        </h2>
        <div className="language-grid">
          <div className="form-group">
            <label htmlFor="s-lang">Ngôn ngữ giao diện</label>
            <select
              id="s-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="s-translate">Ngôn ngữ dịch sang</label>
            <select
              id="s-translate"
              value={translateLanguage}
              onChange={(e) => setTranslateLanguage(e.target.value)}
            >
              <option value="ja">日本語</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <div className="toggle-list">
          <div className="toggle-item">
            <div>
              <span className="toggle-label">Tự động dịch tin nhắn</span>
              <span className="toggle-desc">Dịch tự động khi nhận tin nhắn</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="toggle-item">
            <div>
              <span className="toggle-label">Kiểm tra ngữ pháp AI</span>
              <span className="toggle-desc">AI tự động kiểm tra và gợi ý sửa ngữ pháp</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={aiGrammar}
                onChange={(e) => setAiGrammar(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Card 3: Notifications */}
      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-bell" /> Thông báo
        </h2>
        <div className="toggle-list">
          <div className="toggle-item">
            <div>
              <span className="toggle-label">Tin nhắn mới</span>
              <span className="toggle-desc">Nhận thông báo khi có tin nhắn mới</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifyMessages}
                onChange={(e) => setNotifyMessages(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="toggle-item">
            <div>
              <span className="toggle-label">Nhắc nhở công việc</span>
              <span className="toggle-desc">Nhận thông báo nhắc nhở task và deadline</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifyReminders}
                onChange={(e) => setNotifyReminders(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="toggle-item">
            <div>
              <span className="toggle-label">Âm thanh thông báo</span>
              <span className="toggle-desc">Phát âm thanh khi nhận thông báo</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifySound}
                onChange={(e) => setNotifySound(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <button className="btn-cancel" onClick={handleCancel}>
          Hủy
        </button>
        <button className="btn-save-all" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
        </button>
      </div>
    </div>
  );
}
