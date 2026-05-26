import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { userAPI } from '../../services/api';
import { ROLE_I18N_KEYS } from '../../lib/dateLocale';
import UserAvatar from '../../components/common/UserAvatar';
import './ProfilePage.css';

type ModalState = null | { type: 'success' | 'error'; title: string; message: string };

export default function ProfilePage() {
  const { t } = useTranslation();
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

  const roleLabel =
    currentWorkspace?.roleId && ROLE_I18N_KEYS[currentWorkspace.roleId]
      ? t(`roles.${ROLE_I18N_KEYS[currentWorkspace.roleId]}`)
      : null;

  const handleSave = async () => {
    if (!name.trim()) {
      setModal({
        type: 'error',
        title: t('profile.missingNameTitle'),
        message: t('profile.missingNameMessage'),
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
        title: t('profile.savedTitle'),
        message: t('profile.savedMessage'),
      });
    } catch {
      setModal({
        type: 'error',
        title: t('profile.saveErrorTitle'),
        message: t('profile.saveErrorMessage'),
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
          <h1>{t('profile.title')}</h1>
          <p className="profile-subtitle">{t('profile.subtitle')}</p>
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
            <i className="fas fa-id-card" /> {t('profile.basicInfo')}
          </h3>
          <div className="profile-form-grid">
            <div className="form-group">
              <label htmlFor="p-name">{t('settings.fullName')}</label>
              <input
                id="p-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.fullName')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-email">{t('common.email')}</label>
              <input id="p-email" type="email" value={user?.email || ''} disabled className="input-disabled" />
            </div>
            <div className="form-group">
              <label htmlFor="p-phone">{t('settings.phone')}</label>
              <input
                id="p-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('settings.phone')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-dept">{t('settings.department')}</label>
              <input
                id="p-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t('settings.department')}
              />
            </div>
            <div className="form-group form-group-full">
              <label htmlFor="p-lang">{t('profile.preferredLanguage')}</label>
              <select
                id="p-lang"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="vi">{t('settings.langVi')}</option>
                <option value="ja">{t('settings.langJa')}</option>
              </select>
            </div>
          </div>
        </section>

        <div className="profile-actions">
          <button type="button" className="btn-secondary" onClick={handleReset} disabled={!dirty || saving}>
            {t('common.reset')}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? t('common.saving') : t('profile.saveChanges')}
          </button>
        </div>

        <p className="profile-more">
          <Link to="/settings">
            <i className="fas fa-cog" /> {t('profile.settingsLink')}
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
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
