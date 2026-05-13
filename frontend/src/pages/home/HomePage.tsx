import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ROLE_NAMES } from '../../types';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspace, fetchWorkspaces } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const roleName = currentWorkspace?.roleId
    ? ROLE_NAMES[currentWorkspace.roleId]
    : 'Thành viên';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <div className="home-page">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-text">
          <h1>Chào mừng trở lại, {user?.name || 'Người dùng'}!</h1>
          <p className="home-subtitle">
            {roleName}
            {currentWorkspace && <> &bull; {currentWorkspace.name}</>}
          </p>
        </div>
        <div className="home-avatar" title={user?.name}>
          {initials}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number stat-blue">12</span>
          <span className="stat-label">Công việc đang mở</span>
        </div>
        <div className="stat-card">
          <span className="stat-number stat-orange">3</span>
          <span className="stat-label">Nhắc nhở hôm nay</span>
        </div>
        <div className="stat-card">
          <span className="stat-number stat-red">5</span>
          <span className="stat-label">Tin nhắn chưa đọc</span>
        </div>
        <div className="stat-card">
          <span className="stat-number stat-green">
            {currentWorkspace?.memberCount ?? '--'}
          </span>
          <span className="stat-label">Thành viên Workspace</span>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="section-title">Thao tác nhanh</h2>
      <div className="actions-grid">
        <div className="action-card" onClick={() => navigate('/chat')}>
          <i className="fas fa-comments action-icon" />
          <span className="action-label">Mở Chat ngay</span>
          <span className="action-desc">Nhắn tin & dịch AI</span>
        </div>
        <div className="action-card" onClick={() => navigate('/tasks/create')}>
          <i className="fas fa-plus-circle action-icon" />
          <span className="action-label">Tạo công việc mới</span>
          <span className="action-desc">Giao việc cho thành viên</span>
        </div>
        <div className="action-card" onClick={() => navigate('/reminders/create')}>
          <i className="fas fa-bell action-icon" />
          <span className="action-label">Tạo nhắc nhở</span>
          <span className="action-desc">Đặt lịch nhắc quan trọng</span>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="section-title">Hoạt động gần đây</h2>
      <div className="recent-placeholder">
        <i className="fas fa-history" />
        <p>Chưa có hoạt động nào gần đây.</p>
      </div>
    </div>
  );
}
