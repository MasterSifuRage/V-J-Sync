import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
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
        <NavLink to="/workspaces" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-building"></i> <span>Workspace</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-cog"></i> <span>Cài đặt</span>
        </NavLink>
      </div>
    </div>
  );
}
