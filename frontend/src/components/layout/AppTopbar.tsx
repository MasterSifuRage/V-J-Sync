import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './AppTopbar.css';

export default function AppTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="app-topbar">
      <div className="app-topbar-left">
        {currentWorkspace ? (
          <Link to="/workspaces" className="app-topbar-ws" title="Đổi workspace">
            <i className="fas fa-layer-group app-topbar-ws-icon" aria-hidden />
            <span className="app-topbar-ws-name">{currentWorkspace.name}</span>
          </Link>
        ) : (
          <span className="app-topbar-ws app-topbar-ws--muted">
            <i className="fas fa-layer-group app-topbar-ws-icon" aria-hidden />
            Chọn workspace
          </span>
        )}
      </div>
      <div className="app-topbar-center">
        <label className="app-topbar-search-wrap">
          <i className="fas fa-search app-topbar-search-icon" aria-hidden />
          <input type="search" className="app-topbar-search" placeholder="Tìm kiếm…" aria-label="Tìm kiếm" />
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
            aria-label="Menu tài khoản"
          >
            <div className="app-topbar-user">
              <span className="app-topbar-user-name">{user?.name ?? '—'}</span>
              <span className="app-topbar-user-email">{user?.email ?? ''}</span>
            </div>
            <span className="app-topbar-avatar">{initials}</span>
            <i className="fas fa-chevron-down app-topbar-chevron" aria-hidden />
          </button>

          {menuOpen && (
            <div className="app-topbar-dropdown" role="menu">
              <div className="app-topbar-dropdown-header">
                <span className="app-topbar-dropdown-avatar">{initials}</span>
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
                Tài khoản cá nhân
              </Link>
              <div className="app-topbar-dropdown-divider" />
              <button
                type="button"
                className="app-topbar-dropdown-item app-topbar-dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt" aria-hidden />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
