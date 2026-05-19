import { NavLink } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './Sidebar.css';

export default function Sidebar() {
  const { currentWorkspace } = useWorkspaceStore();
  const roleId = currentWorkspace?.roleId;
  const wsId = currentWorkspace?.id;

  return (
    <div className="sidebar">
      <div className="logo-container">
        <img src="/vj-logo.png" alt="V/J Sync Logo" />
        <span>V/J Sync</span>
      </div>
      <div className="nav-menu">
        <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-home"></i> <span>Trang chủ</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-comments"></i> <span>Chat</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tasks"></i> <span>Công việc</span>
        </NavLink>
        <NavLink to="/reminders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-bell"></i> <span>Nhắc nhở</span>
        </NavLink>
        {roleId === 1 && wsId && (
          <NavLink
            to={`/workspaces/${wsId}/manage`}
            className={({ isActive }) => `nav-item nav-item-admin ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-user-shield"></i> <span>Quản trị WS</span>
          </NavLink>
        )}
        <NavLink
          to="/workspaces"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <i className="fas fa-building"></i> <span>Workspace</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-cog"></i> <span>Cài đặt</span>
        </NavLink>
      </div>
    </div>
  );
}
