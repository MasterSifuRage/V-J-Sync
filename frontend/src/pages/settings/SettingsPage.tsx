import { useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { userAPI } from '../../services/api';
import { getTranslateTarget, setTranslateTarget, normalizeTranslateTarget, type TranslateTargetLang } from '../../lib/translateTarget';
import { normalizeUILanguage, type UILanguage } from '../../lib/uiLanguage';
import { applyUILanguage } from '../../i18n';
import UserAvatar from '../../components/common/UserAvatar';
import './SettingsPage.css';

type ModalState =
  | null
  | {
      type: 'success' | 'error' | 'info' | 'confirm-cancel';
      title?: string;
      message: string;
    };

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<UILanguage>('vi');
  const [translateLanguage, setTranslateLanguage] = useState<TranslateTargetLang>('ja');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [aiGrammar, setAiGrammar] = useState(false);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const translateBaseline = useRef<TranslateTargetLang>('ja');
  const togglesBaseline = useRef({
    autoTranslate: true,
    aiGrammar: false,
    notifyMessages: true,
    notifyReminders: true,
    notifySound: true,
  });

  const translateLangLabel = (v: TranslateTargetLang) =>
    v === 'ja' ? t('settings.langJa') : t('settings.langVi');

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPreferredLanguage(normalizeUILanguage(user.preferredLanguage));
    const tr = normalizeTranslateTarget(user.translateToLanguage ?? getTranslateTarget(user.id));
    setTranslateTarget(user.id, tr);
    translateBaseline.current = tr;
    setTranslateLanguage(tr);
    togglesBaseline.current = {
      autoTranslate: true,
      aiGrammar: false,
      notifyMessages: true,
      notifyReminders: true,
      notifySound: true,
    };
  }, [user]);

  const profileDirty = useMemo(
    () =>
      !!user &&
      (name.trim() !== (user.name || '') ||
        phone.trim() !== (user.phone || '') ||
        department.trim() !== (user.department || '') ||
        preferredLanguage !== normalizeUILanguage(user.preferredLanguage)),
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

  const resetFormFromBaseline = () => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    const lang = normalizeUILanguage(user.preferredLanguage);
    setPreferredLanguage(lang);
    void applyUILanguage(lang);
    const t0 = translateBaseline.current;
    setTranslateLanguage(t0);
    if (user) setTranslateTarget(user.id, t0);
    const tb = togglesBaseline.current;
    setAutoTranslate(tb.autoTranslate);
    setAiGrammar(tb.aiGrammar);
    setNotifyMessages(tb.notifyMessages);
    setNotifyReminders(tb.notifyReminders);
    setNotifySound(tb.notifySound);
  };

  const handleUILanguageChange = (v: string) => {
    const lang = normalizeUILanguage(v);
    setPreferredLanguage(lang);
    void applyUILanguage(lang);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await userAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        preferredLanguage,
        translateToLanguage: translateLanguage,
      });
      const updated = res.data.user ?? res.data;
      setUser(updated);
      if (updated.id) {
        setTranslateTarget(updated.id, normalizeTranslateTarget(updated.translateToLanguage));
      }
      togglesBaseline.current = {
        autoTranslate,
        aiGrammar,
        notifyMessages,
        notifyReminders,
        notifySound,
      };
      translateBaseline.current = normalizeTranslateTarget(updated.translateToLanguage);
      setTranslateLanguage(translateBaseline.current);
      setModal({
        type: 'success',
        title: t('settings.savedTitle'),
        message: t('settings.savedMessage'),
      });
    } catch {
      setModal({
        type: 'error',
        title: t('settings.saveErrorTitle'),
        message: t('settings.saveErrorMessage'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = () => {
    if (!uploadingAvatar) avatarInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setModal({
        type: 'error',
        title: t('settings.error'),
        message: t('settings.avatarInvalidType'),
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModal({
        type: 'error',
        title: t('settings.error'),
        message: t('settings.avatarTooLarge'),
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await userAPI.updateAvatar(formData);
      const updated = res.data.user ?? res.data;
      setUser({ ...user, ...updated });
      setModal({
        type: 'success',
        title: t('settings.avatarUpdatedTitle'),
        message: t('settings.avatarUpdatedMessage'),
      });
    } catch {
      setModal({
        type: 'error',
        title: t('settings.saveErrorTitle'),
        message: t('settings.avatarErrorMessage'),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setModal({
        type: 'confirm-cancel',
        title: t('settings.cancelConfirmTitle'),
        message: t('settings.cancelConfirmMessage'),
      });
      return;
    }
    setModal({
      type: 'info',
      title: t('settings.noChangesTitle'),
      message: t('settings.noChangesMessage'),
    });
  };

  const confirmDiscard = () => {
    resetFormFromBaseline();
    setModal({
      type: 'info',
      title: t('settings.discardedTitle'),
      message: t('settings.discardedMessage'),
    });
  };

  const onTranslateChange = async (v: TranslateTargetLang) => {
    if (!user) return;
    setTranslateLanguage(v);
    setTranslateTarget(user.id, v);
    try {
      const res = await userAPI.updateProfile({ translateToLanguage: v });
      const updated = res.data.user ?? res.data;
      setUser(updated);
      translateBaseline.current = v;
      setModal({
        type: 'info',
        title: t('settings.translateUpdatedTitle'),
        message: t('settings.translateUpdatedMessage', { lang: translateLangLabel(v) }),
      });
    } catch {
      const rollback = translateBaseline.current;
      setTranslateLanguage(rollback);
      setTranslateTarget(user.id, rollback);
      setModal({
        type: 'error',
        title: t('settings.saveErrorTitle'),
        message: t('settings.saveErrorMessage'),
      });
    }
  };

  const modalTitle =
    modal?.title ??
    (modal?.type === 'success'
      ? t('settings.success')
      : modal?.type === 'error'
        ? t('settings.error')
        : t('settings.notice'));

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>{t('settings.title')}</h1>
        <p className="settings-subtitle">{t('settings.subtitle')}</p>
      </div>

      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-user-circle" /> {t('settings.profile')}
        </h2>
        <div className="profile-section">
          <div className="avatar-wrapper">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarFileChange}
            />
            <UserAvatar
              name={name || user?.name}
              avatarUrl={user?.avatarUrl}
              size="lg"
              className="avatar-circle"
            />
            <button
              type="button"
              className="avatar-edit"
              title={t('settings.changeAvatar')}
              onClick={handleAvatarPick}
              disabled={uploadingAvatar}
            >
              <i className={uploadingAvatar ? 'fas fa-spinner fa-spin' : 'fas fa-camera'} />
            </button>
          </div>
          <div className="profile-grid">
            <div className="form-group">
              <label htmlFor="s-name">{t('settings.fullName')}</label>
              <input
                id="s-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('settings.fullName')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-phone">{t('settings.phone')}</label>
              <input
                id="s-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('settings.phone')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-email">{t('common.email')}</label>
              <input
                id="s-email"
                type="text"
                value={user?.email || ''}
                disabled
                className="input-disabled"
              />
            </div>
            <div className="form-group">
              <label htmlFor="s-dept">{t('settings.department')}</label>
              <input
                id="s-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder={t('settings.department')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-language" /> {t('settings.languageSection')}
        </h2>
        <div className="language-grid">
          <div className="form-group">
            <label htmlFor="s-lang">{t('settings.uiLanguage')}</label>
            <select
              id="s-lang"
              value={preferredLanguage}
              onChange={(e) => handleUILanguageChange(e.target.value)}
            >
              <option value="vi">{t('settings.langVi')}</option>
              <option value="ja">{t('settings.langJa')}</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="s-translate">{t('settings.translateTo')}</label>
            <select
              id="s-translate"
              value={translateLanguage}
              onChange={(e) => onTranslateChange(e.target.value as TranslateTargetLang)}
            >
              <option value="ja">{t('settings.langJa')}</option>
              <option value="vi">{t('settings.langVi')}</option>
            </select>
          </div>
        </div>
        <div className="toggle-list">
          <div className="toggle-item">
            <div>
              <span className="toggle-label">{t('settings.autoTranslate')}</span>
              <span className="toggle-desc">{t('settings.autoTranslateDesc')}</span>
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
              <span className="toggle-label">{t('settings.aiGrammar')}</span>
              <span className="toggle-desc">{t('settings.aiGrammarDesc')}</span>
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

      <div className="settings-card">
        <h2 className="card-title">
          <i className="fas fa-bell" /> {t('settings.notifications')}
        </h2>
        <div className="toggle-list">
          <div className="toggle-item">
            <div>
              <span className="toggle-label">{t('settings.notifyMessages')}</span>
              <span className="toggle-desc">{t('settings.notifyMessagesDesc')}</span>
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
              <span className="toggle-label">{t('settings.notifyReminders')}</span>
              <span className="toggle-desc">{t('settings.notifyRemindersDesc')}</span>
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
              <span className="toggle-label">{t('settings.notifySound')}</span>
              <span className="toggle-desc">{t('settings.notifySoundDesc')}</span>
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
          {t('settings.cancel')}
        </button>
        <button type="button" className="btn-save-all" onClick={handleSave} disabled={saving}>
          {saving ? t('settings.saving') : t('settings.saveAll')}
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
              {modalTitle}
            </h3>
            <p className="settings-modal-message">{modal.message}</p>
            <div className="settings-modal-actions">
              {modal.type === 'confirm-cancel' ? (
                <>
                  <button type="button" className="settings-modal-btn secondary" onClick={() => setModal(null)}>
                    {t('settings.continueEdit')}
                  </button>
                  <button type="button" className="settings-modal-btn danger" onClick={confirmDiscard}>
                    {t('settings.confirmDiscard')}
                  </button>
                </>
              ) : (
                <button type="button" className="settings-modal-btn primary" onClick={() => setModal(null)}>
                  {t('settings.close')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
