import { create } from "zustand";
import type { Match } from "../../types/match";

export type MatchOwnershipSnapshot = {
  creatorId: string;
  /** From GET match details — used when list payloads omit `finishedAt`. */
  finishedAt?: string | null;
};

interface MatchOwnershipState {
  /** Known organizer id per match (from my-matches, create, or detail). */
  byMatchId: Record<string, MatchOwnershipSnapshot>;
  recordOwnership: (matchId: string, creatorId: string, finishedAt?: string | null) => void;
  syncFromMatches: (matches: Match[]) => void;
  clearAll: () => void;
}

function normalizeId(id: string): string {
  return id.trim();
}

export const useMatchOwnershipStore = create<MatchOwnershipState>((set, get) => ({
  byMatchId: {},

  recordOwnership: (matchId, creatorId, finishedAt) => {
    const id = normalizeId(matchId);
    const creator = normalizeId(creatorId);
    if (!id || !creator) return;
    set((state) => ({
      byMatchId: {
        ...state.byMatchId,
        [id]: {
          creatorId: creator,
          finishedAt: finishedAt ?? state.byMatchId[id]?.finishedAt,
        },
      },
    }));
  },

  syncFromMatches: (matches) => {
    const next: Record<string, MatchOwnershipSnapshot> = {};
    for (const m of matches) {
      const id = normalizeId(m.id);
      const creator = normalizeId(m.creatorId);
      if (id && creator) {
        next[id] = {
          creatorId: creator,
          finishedAt: m.finishedAt ?? get().byMatchId[id]?.finishedAt,
        };
      }
    }
    if (Object.keys(next).length === 0) return;
    set((state) => ({
      byMatchId: { ...state.byMatchId, ...next },
    }));
  },

  clearAll: () => set({ byMatchId: {} }),
}));

export function getMatchOwnershipSnapshot(
  matchId: string
): MatchOwnershipSnapshot | undefined {
  return useMatchOwnershipStore.getState().byMatchId[normalizeId(matchId)];
}
