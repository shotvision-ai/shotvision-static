import { create } from "zustand";
import {
  clearPersistedReportedMatchIds,
  loadPersistedReportedMatchIds,
  savePersistedReportedMatchIds,
} from "../services/profile/matchReportPersistence";

type MatchReportState = {
  /** userId -> matchId -> reported */
  overrides: Record<string, Record<string, boolean>>;
  hydratedForUserId: string | null;
  hydrateForUser: (userId: string, apiMatchIds?: string[]) => Promise<void>;
  setReported: (userId: string, matchId: string, reported: boolean) => Promise<void>;
  mergeReportedIds: (userId: string, matchIds: string[], reported: boolean) => Promise<void>;
  clearAll: () => void;
};

export const useMatchReportStore = create<MatchReportState>((set, get) => ({
  overrides: {},
  hydratedForUserId: null,

  hydrateForUser: async (userId, apiMatchIds = []) => {
    const id = userId.trim();
    if (!id) return;

    const persisted = await loadPersistedReportedMatchIds(id);
    const merged = new Set([...persisted, ...apiMatchIds.map((m) => m.trim()).filter(Boolean)]);
    const map: Record<string, boolean> = {};
    merged.forEach((matchId) => {
      map[matchId] = true;
    });

    set((state) => ({
      hydratedForUserId: id,
      overrides: {
        ...state.overrides,
        [id]: map,
      },
    }));
  },

  setReported: async (userId, matchId, reported) => {
    const uid = userId.trim();
    const mid = matchId.trim();
    if (!uid || !mid) return;

    set((state) => {
      const userMap = { ...(state.overrides[uid] ?? {}) };
      if (reported) {
        userMap[mid] = true;
      } else {
        delete userMap[mid];
      }
      return {
        overrides: {
          ...state.overrides,
          [uid]: userMap,
        },
      };
    });

    const userMap = get().overrides[uid] ?? {};
    await savePersistedReportedMatchIds(
      uid,
      Object.keys(userMap).filter((k) => userMap[k])
    );
  },

  mergeReportedIds: async (userId, matchIds, reported) => {
    for (const matchId of matchIds) {
      await get().setReported(userId, matchId, reported);
    }
  },

  clearAll: () => {
    const uid = get().hydratedForUserId;
    if (uid) {
      void clearPersistedReportedMatchIds(uid);
    }
    set({ overrides: {}, hydratedForUserId: null });
  },
}));

export function getMatchReportSnapshot(matchId: string, userId?: string): boolean | undefined {
  const mid = matchId.trim();
  if (!mid) return undefined;
  const uid = userId ?? useMatchReportStore.getState().hydratedForUserId ?? "";
  if (!uid) return undefined;
  const v = useMatchReportStore.getState().overrides[uid]?.[mid];
  return typeof v === "boolean" ? v : undefined;
}
