import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
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
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
