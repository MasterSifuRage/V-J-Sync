import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/home/HomePage';
import LandingPage from './pages/home/LandingPage';
import ChatPage from './pages/chat/ChatPage';
import TaskListPage from './pages/tasks/TaskListPage';
import TaskCreatePage from './pages/tasks/TaskCreatePage';
import TaskDetailPage from './pages/tasks/TaskDetailPage';
import ReminderListPage from './pages/reminders/ReminderListPage';
import ReminderCreatePage from './pages/reminders/ReminderCreatePage';
import ReminderDetailPage from './pages/reminders/ReminderDetailPage';
import WorkspaceSelectPage from './pages/workspace/WorkspaceSelectPage';
import WorkspaceManagementPage from './pages/workspace/WorkspaceManagementPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import RequireTaskCreator from './components/auth/RequireTaskCreator';
import RequireWorkspaceAdmin from './components/auth/RequireWorkspaceAdmin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Đang tải...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected with sidebar layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/tasks" element={<TaskListPage />} />
        <Route path="/tasks/create" element={<RequireTaskCreator><TaskCreatePage /></RequireTaskCreator>} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/reminders" element={<ReminderListPage />} />
        <Route path="/reminders/create" element={<ReminderCreatePage />} />
        <Route path="/reminders/:reminderId" element={<ReminderDetailPage />} />
        <Route path="/workspaces" element={<WorkspaceSelectPage />} />
        <Route path="/workspaces/:workspaceId/manage" element={<RequireWorkspaceAdmin><WorkspaceManagementPage /></RequireWorkspaceAdmin>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Chat has its own layout (no padding) */}
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/chat/:channelId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
