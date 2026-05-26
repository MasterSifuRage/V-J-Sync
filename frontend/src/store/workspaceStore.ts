import { create } from 'zustand';
import { Workspace } from '../types';
import { workspaceAPI } from '../services/api';

export type DashboardScope = 'current' | 'all';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  dashboardScope: DashboardScope;
  isLoading: boolean;
  hasFetched: boolean;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: Workspace) => void;
  setDashboardScope: (scope: DashboardScope) => void;
}

const readDashboardScope = (): DashboardScope => {
  try {
    return localStorage.getItem('dashboardScope') === 'all' ? 'all' : 'current';
  } catch {
    return 'current';
  }
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  dashboardScope: readDashboardScope(),
  isLoading: false,
  hasFetched: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const res = await workspaceAPI.list();
      const workspaces: Workspace[] = res.data.workspaces || [];
      const saved = localStorage.getItem('currentWorkspaceId');
      let current: Workspace | null = null;
      if (saved) {
        current = workspaces.find((w) => w.id === saved) ?? null;
      }
      if (!current && workspaces.length > 0) {
        current = workspaces[0];
        localStorage.setItem('currentWorkspaceId', current.id);
      }
      set({
        workspaces,
        currentWorkspace: current,
        dashboardScope: readDashboardScope(),
        isLoading: false,
        hasFetched: true,
      });
    } catch {
      set({ isLoading: false, hasFetched: true });
    }
  },

  setCurrentWorkspace: (ws) => {
    localStorage.setItem('currentWorkspaceId', ws.id);
    set({ currentWorkspace: ws, dashboardScope: 'current' });
    localStorage.setItem('dashboardScope', 'current');
  },

  setDashboardScope: (scope) => {
    localStorage.setItem('dashboardScope', scope);
    set({ dashboardScope: scope });
  },
}));
