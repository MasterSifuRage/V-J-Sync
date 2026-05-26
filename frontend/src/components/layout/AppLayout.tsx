import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import AppTopbar from './AppTopbar';
import PageContainer from './PageContainer';
import { useWorkspaceStore } from '../../store/workspaceStore';
import './AppLayout.css';

function LayoutOutlet() {
  const { pathname } = useLocation();
  let width: 'default' | 'wide' | 'narrow' | 'full' = 'default';
  if (pathname.startsWith('/tasks') || pathname.startsWith('/workspaces')) {
    width = 'wide';
  }
  if (pathname === '/profile') {
    width = 'narrow';
  }
  return (
    <PageContainer width={width}>
      <Outlet />
    </PageContainer>
  );
}

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
          <LayoutOutlet />
        </main>
      </div>
    </div>
  );
}
