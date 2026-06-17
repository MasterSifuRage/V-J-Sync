import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import UserAvatar from '../common/UserAvatar';
import './AppTopbar.css';

export default function AppTopbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    currentWorkspace,
    workspaces,
    dashboardScope,
    fetchWorkspaces,
    setCurrentWorkspace,
    setDashboardScope,
  } = useWorkspaceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!menuOpen && !wsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setWsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen, wsOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  const selectAllOverview = () => {
    setDashboardScope('all');
    setWsOpen(false);
    if (location.pathname !== '/home') navigate('/home');
  };

  const selectWorkspace = (ws: (typeof workspaces)[0]) => {
    setCurrentWorkspace(ws);
    setWsOpen(false);
    if (location.pathname !== '/home') navigate('/home');
  };

  const wsLabel =
    dashboardScope === 'all'
      ? t('home.allWorkspacesShort')
      : currentWorkspace?.name ?? t('topbar.selectWorkspace');

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        <div className="app-topbar-ws-menu" ref={wsRef}>
          <button
            type="button"
            className={`app-topbar-ws app-topbar-ws-btn ${wsOpen ? 'is-open' : ''} ${dashboardScope === 'all' ? 'app-topbar-ws--all' : ''}`}
            onClick={() => setWsOpen((v) => !v)}
            aria-expanded={wsOpen}
            aria-haspopup="true"
            title={t('topbar.switchWorkspace')}
          >
            <i className="fas fa-layer-group app-topbar-ws-icon" aria-hidden />
            <span className="app-topbar-ws-name">{wsLabel}</span>
            <i className="fas fa-chevron-down app-topbar-ws-chevron" aria-hidden />
          </button>

          {wsOpen && (
            <div className="app-topbar-ws-dropdown" role="menu">
              <button
                type="button"
                className={`app-topbar-ws-item app-topbar-ws-item--all ${dashboardScope === 'all' ? 'is-active' : ''}`}
                role="menuitem"
                onClick={selectAllOverview}
              >
                <i className="fas fa-globe-asia" aria-hidden />
                <span>{t('home.allWorkspacesOverview')}</span>
              </button>
              <div className="app-topbar-ws-divider" />
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={`app-topbar-ws-item ${dashboardScope === 'current' && currentWorkspace?.id === ws.id ? 'is-active' : ''}`}
                  role="menuitem"
                  onClick={() => selectWorkspace(ws)}
                >
                  <i className="fas fa-layer-group" aria-hidden />
                  <span>{ws.name}</span>
                </button>
              ))}
              <div className="app-topbar-ws-divider" />
              <Link
                to="/workspaces"
                className="app-topbar-ws-item app-topbar-ws-item--link"
                role="menuitem"
                onClick={() => setWsOpen(false)}
              >
                <i className="fas fa-cog" aria-hidden />
                <span>{t('topbar.manageWorkspaces')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="app-topbar-center">
        <label className="app-topbar-search-wrap">
          <i className="fas fa-search app-topbar-search-icon" aria-hidden />
          <input
            type="search"
            className="app-topbar-search"
            placeholder={t('topbar.search')}
            aria-label={t('topbar.searchLabel')}
          />
        </label>
      </div>
      <div className="app-topbar-right">
        <div className="app-topbar-user-menu" ref={menuRef}>
          <button
            type="button"
            className={`app-topbar-user-trigger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label={t('topbar.accountMenu')}
          >
            <div className="app-topbar-user">
              <span className="app-topbar-user-name">{user?.name ?? '—'}</span>
              <span className="app-topbar-user-email">{user?.email ?? ''}</span>
            </div>
            <UserAvatar
              name={user?.name}
              avatarUrl={user?.avatarUrl}
              size="sm"
              className="app-topbar-avatar"
            />
            <i className="fas fa-chevron-down app-topbar-chevron" aria-hidden />
          </button>

          {menuOpen && (
            <div className="app-topbar-dropdown" role="menu">
              <div className="app-topbar-dropdown-header">
                <UserAvatar
                  name={user?.name}
                  avatarUrl={user?.avatarUrl}
                  size="md"
                  className="app-topbar-dropdown-avatar"
                />
                <div>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
              </div>
              <div className="app-topbar-dropdown-divider" />
              <Link
                to="/profile"
                className="app-topbar-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                <i className="fas fa-user" aria-hidden />
                {t('topbar.profile')}
              </Link>
              <div className="app-topbar-dropdown-divider" />
              <button
                type="button"
                className="app-topbar-dropdown-item app-topbar-dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt" aria-hidden />
                {t('topbar.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
