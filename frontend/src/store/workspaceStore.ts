import { create } from 'zustand';
import { Workspace } from '../types';
import { workspaceAPI } from '../services/api';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  hasFetched: boolean;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
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
      set({ workspaces, currentWorkspace: current, isLoading: false, hasFetched: true });
    } catch {
      set({ isLoading: false, hasFetched: true });
    }
  },

  setCurrentWorkspace: (ws) => {
    localStorage.setItem('currentWorkspaceId', ws.id);
    set({ currentWorkspace: ws });
  },
}));
