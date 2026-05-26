import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './Sidebar.css';

export default function Sidebar() {
  const { t } = useTranslation();
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
          <i className="fas fa-home"></i> <span>{t('nav.home')}</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-comments"></i> <span>{t('nav.chat')}</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-tasks"></i> <span>{t('nav.tasks')}</span>
        </NavLink>
        <NavLink to="/reminders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-bell"></i> <span>{t('nav.reminders')}</span>
        </NavLink>
        {roleId === 1 && wsId && (
          <NavLink
            to={`/workspaces/${wsId}/manage`}
            className={({ isActive }) => `nav-item nav-item-admin ${isActive ? 'active' : ''}`}
          >
            <i className="fas fa-user-shield"></i> <span>{t('nav.wsAdmin')}</span>
          </NavLink>
        )}
        <NavLink
          to="/workspaces"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <i className="fas fa-building"></i> <span>{t('nav.workspace')}</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <i className="fas fa-cog"></i> <span>{t('nav.settings')}</span>
        </NavLink>
      </div>
    </div>
  );
}
