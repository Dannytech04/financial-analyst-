import { UserGoals } from '@/types';

/**
 * Storage Service
 * Strictly restricted to non-critical client preferences (UI theme, sidebar, widget layout).
 * 
 * INVARIANT: Trade data, user profiles, subscription states, and AI usage counts 
 * must NEVER be persisted to or trusted from localStorage.
 * Firestore is the sole authoritative source of persistent financial and account data.
 */

const PREFERENCE_KEYS = {
  THEME: 'fx_ui_theme',
  SIDEBAR_COLLAPSED: 'fx_sidebar_collapsed',
  DASHBOARD_LAYOUT: 'fx_dashboard_layout',
};

export const defaultGoals: UserGoals = {
  monthlyProfitTarget: 5000,
  winRateTarget: 60,
  tradesPerMonthTarget: 30
};

export const storageService = {
  getTheme(): 'dark' | 'light' {
    try {
      const theme = localStorage.getItem(PREFERENCE_KEYS.THEME);
      return theme === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  },

  setTheme(theme: 'dark' | 'light'): void {
    try {
      localStorage.setItem(PREFERENCE_KEYS.THEME, theme);
    } catch (e) {
      console.warn("Failed to persist theme preference:", e);
    }
  },

  getSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(PREFERENCE_KEYS.SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  },

  setSidebarCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(PREFERENCE_KEYS.SIDEBAR_COLLAPSED, String(collapsed));
    } catch (e) {
      console.warn("Failed to persist sidebar preference:", e);
    }
  },

  clearPreferences(): void {
    try {
      localStorage.removeItem(PREFERENCE_KEYS.THEME);
      localStorage.removeItem(PREFERENCE_KEYS.SIDEBAR_COLLAPSED);
      localStorage.removeItem(PREFERENCE_KEYS.DASHBOARD_LAYOUT);
    } catch (e) {
      console.warn("Failed to clear local UI preferences:", e);
    }
  }
};
