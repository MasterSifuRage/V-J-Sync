import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { userAPI } from '../../services/api';
import { getTranslateTarget, setTranslateTarget, type TranslateTargetLang } from '../../lib/translateTarget';
import './SettingsPage.css';

type ModalState =
  | null
  | {
      type: 'success' | 'error' | 'info' | 'confirm-cancel';
      title?: string;
      message: string;
    };

function translateLangLabel(v: TranslateTargetLang): string {
  if (v === 'ja') return '日本語';
  if (v === 'en') return 'English';
  return 'Tiếng Việt';
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('vi');
  const [translateLanguage, setTranslateLanguage] = useState<TranslateTargetLang>(() => getTranslateTarget());
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiGrammar, setAiGrammar] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  /** Giá trị “đã lưu / khi mở trang” để Hủy và Kiểm tra thay đổi */
  const translateBaseline = useRef<TranslateTargetLang>(getTranslateTarget());
  const togglesBaseline = useRef({
    autoTranslate: true,
    aiGrammar: false,
    notifyMessages: true,
    notifyReminders: true,
    notifySound: true,
  });

  useEffect(() => {
    const t = getTranslateTarget();
    translateBaseline.current = t;
    setTranslateLanguage(t);
    togglesBaseline.current = {
      autoTranslate: true,
      aiGrammar: false,
      notifyMessages: true,
      notifyReminders: true,
      notifySound: true,
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
  }, [user]);

  const profileDirty = useMemo(
    () =>
      !!user &&
      (name.trim() !== (user.name || '') ||
        phone.trim() !== (user.phone || '') ||
        department.trim() !== (user.department || '') ||
        preferredLanguage !== (user.preferredLanguage || 'vi')),
    [user, name, phone, department, preferredLanguage],
  );

  const togglesDirty = useMemo(
    () =>
      autoTranslate !== togglesBaseline.current.autoTranslate ||
      aiGrammar !== togglesBaseline.current.aiGrammar ||
      notifyMessages !== togglesBaseline.current.notifyMessages ||
      notifyReminders !== togglesBaseline.current.notifyReminders ||
      notifySound !== togglesBaseline.current.notifySound,
    [autoTranslate, aiGrammar, notifyMessages, notifyReminders, notifySound],
  );

  const translateDirty = useMemo(
    () => translateLanguage !== translateBaseline.current,
    [translateLanguage],
  );

  const hasUnsavedChanges = profileDirty || togglesDirty || translateDirty;

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const resetFormFromBaseline = () => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(user.preferredLanguage || 'vi');
    const t0 = translateBaseline.current;
    setTranslateLanguage(t0);
    setTranslateTarget(t0);
    const tb = togglesBaseline.current;
    setAutoTranslate(tb.autoTranslate);
    setAiGrammar(tb.aiGrammar);
    setNotifyMessages(tb.notifyMessages);
    setNotifyReminders(tb.notifyReminders);
    setNotifySound(tb.notifySound);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage,
      });
      setUser(res.data.user ?? res.data);
      togglesBaseline.current = {
        autoTranslate,
        aiGrammar,
        notifyMessages,
        notifyReminders,
        notifySound,
      };
      translateBaseline.current = getTranslateTarget();
      setModal({
        type: 'success',
        title: 'Đã lưu',
        message:
          'Hồ sơ đã được lưu trên máy chủ. Ngôn ngữ dịch và các công tắc trên trang được coi là đã đồng bộ với phiên làm việc hiện tại.',
      });
    } catch {
      setModal({
        type: 'error',
        title: 'Lưu thất bại',
        message: 'Không thể lưu thay đổi. Kiểm tra kết nối và thử lại.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setModal({
        type: 'confirm-cancel',
        title: 'Hủy thay đổi?',
        message:
          'Có thay đổi chưa lưu (hồ sơ, thông báo, hoặc ngôn ngữ dịch). Bạn có chắc muốn hoàn tác và khôi phục như lúc mở trang / sau lần lưu gần nhất?',
      });
      return;
    }
    setModal({
      type: 'info',
      title: 'Thông báo',
      message: 'Không có thay đổi nào để hủy.',
    });
  };

  const confirmDiscard = () => {
    resetFormFromBaseline();
    setModal({
      type: 'info',
      title: 'Đã hoàn tác',
      message: 'Các thay đổi đã được khôi phục về trạng thái trước đó.',
    });
  };

  const onTranslateChange = (v: TranslateTargetLang) => {
    setTranslateLanguage(v);
    setTranslateTarget(v);
    setModal({
      type: 'info',
      title: 'Đã cập nhật',
      message: `Ngôn ngữ dịch sang: ${translateLangLabel(v)} (lưu trên trình duyệt; áp dụng ngay trong chat).`,
    });
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Cài đặt</h1>
        <p className="settings-subtitle">Quản lý hồ sơ và tùy chọn cá nhân</p>
      </div>

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
            <button type="button" className="avatar-edit" title="Đổi ảnh đại diện">
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
              onChange={(e) => onTranslateChange(e.target.value as TranslateTargetLang)}
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

      <div className="settings-footer">
        <button type="button" className="btn-cancel" onClick={handleCancelClick}>
          Hủy
        </button>
        <button type="button" className="btn-save-all" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}
        </button>
      </div>

      {modal && (
        <div
          className="settings-modal-overlay"
          role="presentation"
          onClick={() => modal.type !== 'confirm-cancel' && setModal(null)}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="settings-modal-title" className="settings-modal-title">
              {modal.title ||
                (modal.type === 'success' ? 'Thành công' : modal.type === 'error' ? 'Lỗi' : 'Thông báo')}
            </h3>
            <p className="settings-modal-message">{modal.message}</p>
            <div className="settings-modal-actions">
              {modal.type === 'confirm-cancel' ? (
                <>
                  <button type="button" className="settings-modal-btn secondary" onClick={() => setModal(null)}>
                    Tiếp tục chỉnh sửa
                  </button>
                  <button type="button" className="settings-modal-btn danger" onClick={confirmDiscard}>
                    Hủy thay đổi
                  </button>
                </>
              ) : (
                <button type="button" className="settings-modal-btn primary" onClick={() => setModal(null)}>
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
