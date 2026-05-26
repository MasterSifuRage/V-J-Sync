import { Navigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { canManageWorkspace } from '../../lib/workspaceRole';

export default function RequireWorkspaceAdmin({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceStore();
  if (!canManageWorkspace(currentWorkspace?.roleId)) {
    return <Navigate to="/workspaces" replace />;
  }
  return <>{children}</>;
}
