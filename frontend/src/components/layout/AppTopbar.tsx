import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './AppTopbar.css';

export default function AppTopbar() {
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

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
        <div className="app-topbar-user">
          <span className="app-topbar-user-name">{user?.name ?? '—'}</span>
          <span className="app-topbar-user-email">{user?.email ?? ''}</span>
        </div>
        <Link to="/settings" className="app-topbar-avatar" title="Cài đặt">
          {initials}
        </Link>
      </div>
    </header>
  );
}
