import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import AppTopbar from './AppTopbar';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './AppLayout.css';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchWorkspaces, workspaces, hasFetched, isLoading } = useWorkspaceStore();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    if (!hasFetched || isLoading) return;
    if (workspaces.length === 0 && location.pathname !== '/workspaces') {
      navigate('/workspaces', { replace: true });
    }
  }, [hasFetched, isLoading, workspaces.length, location.pathname, navigate]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-shell">
        <AppTopbar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
