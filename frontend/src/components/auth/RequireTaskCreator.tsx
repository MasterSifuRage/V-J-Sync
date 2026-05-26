import { Navigate } from 'react-router-dom';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { canCreateTask } from '../../lib/workspaceRole';

export default function RequireTaskCreator({ children }: { children: React.ReactNode }) {
  const { currentWorkspace } = useWorkspaceStore();
  if (!canCreateTask(currentWorkspace?.roleId)) {
    return <Navigate to="/tasks" replace />;
  }
  return <>{children}</>;
}
