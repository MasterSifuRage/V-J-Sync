import { create } from 'zustand';
import { User } from '../types';
import { authAPI } from '../services/api';
import { clearStoredToken, setStoredToken } from '../lib/authToken';
import { applyUILanguage } from '../i18n';
import { normalizeUILanguage } from '../lib/uiLanguage';
import { applyTranslateTarget } from '../lib/translateTarget';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; department?: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data.token) setStoredToken(res.data.token);
    const user = res.data.user;
    void applyUILanguage(normalizeUILanguage(user.preferredLanguage));
    applyTranslateTarget(user.id, user.translateToLanguage);
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await authAPI.register(data);
    if (res.data.token) setStoredToken(res.data.token);
    const user = res.data.user;
    void applyUILanguage(normalizeUILanguage(user.preferredLanguage));
    applyTranslateTarget(user.id, user.translateToLanguage);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await authAPI.logout();
    clearStoredToken();
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.getMe();
      const user = res.data.user;
      void applyUILanguage(normalizeUILanguage(user.preferredLanguage));
      applyTranslateTarget(user.id, user.translateToLanguage);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearStoredToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => {
    void applyUILanguage(normalizeUILanguage(user.preferredLanguage));
    applyTranslateTarget(user.id, user.translateToLanguage);
    set({ user });
  },
}));
