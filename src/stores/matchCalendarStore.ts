import { create } from "zustand";
import {
  hydrateMatchCalendarPreferences,
  setDeviceCalendarSyncEnabled,
  syncAllScheduledMatchesToDeviceCalendar,
} from "../services/calendar/matchCalendarSync";
import { devLog } from "../utils/devLog";

type MatchCalendarState = {
  enabled: boolean;
  hydratedForUserId: string | null;
  isSyncing: boolean;

  hydrateForUser: (userId: string) => Promise<void>;
  setEnabled: (userId: string, enabled: boolean) => Promise<"granted" | "denied" | "ok">;
  syncAll: (userId: string) => Promise<void>;
  clearAll: () => void;
};

export const useMatchCalendarStore = create<MatchCalendarState>((set, get) => ({
  enabled: false,
  hydratedForUserId: null,
  isSyncing: false,

  hydrateForUser: async (userId) => {
    const id = userId.trim();
    if (!id) return;
    const enabled = await hydrateMatchCalendarPreferences(id);
    set({ enabled, hydratedForUserId: id });
  },

  setEnabled: async (userId, enabled) => {
    const id = userId.trim();
    if (!id) return "denied";

    set({ isSyncing: true });
    try {
      const result = await setDeviceCalendarSyncEnabled(id, enabled);
      if (!result.ok && result.reason === "permission_denied") {
        set({ enabled: false, hydratedForUserId: id });
        return "denied";
      }
      set({ enabled, hydratedForUserId: id });
      return result.ok ? "ok" : "denied";
    } finally {
      set({ isSyncing: false });
    }
  },

  syncAll: async (userId) => {
    const id = userId.trim();
    if (!id || !get().enabled) return;

    set({ isSyncing: true });
    try {
      const stats = await syncAllScheduledMatchesToDeviceCalendar(id);
      if (__DEV__) {
        devLog.info("[matchCalendarStore] syncAll", stats);
      }
    } finally {
      set({ isSyncing: false });
    }
  },

  clearAll: () => {
    set({ enabled: false, hydratedForUserId: null, isSyncing: false });
  },
}));
