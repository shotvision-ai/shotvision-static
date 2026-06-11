import { create } from "zustand";
import type { Match, MatchSet } from "../../types/match";

interface MatchSetsState {
  byMatchId: Record<string, MatchSet[]>;
  recordSets: (matchId: string, sets: MatchSet[]) => void;
  syncFromMatches: (matches: Match[]) => void;
  clearAll: () => void;
}

function normalizeId(id: string): string {
  return id.trim();
}

export const useMatchSetsStore = create<MatchSetsState>((set) => ({
  byMatchId: {},

  recordSets: (matchId, sets) => {
    const id = normalizeId(matchId);
    if (!id || !sets.length) return;
    set((state) => ({
      byMatchId: { ...state.byMatchId, [id]: sets },
    }));
  },

  syncFromMatches: (matches) => {
    const next: Record<string, MatchSet[]> = {};
    for (const m of matches) {
      const id = normalizeId(m.id);
      const sets = m.sets ?? [];
      if (id && sets.length > 0) {
        next[id] = sets;
      }
    }
    if (Object.keys(next).length === 0) return;
    set((state) => ({
      byMatchId: { ...state.byMatchId, ...next },
    }));
  },

  clearAll: () => set({ byMatchId: {} }),
}));

export function getMatchSetsSnapshot(matchId: string): MatchSet[] | undefined {
  return useMatchSetsStore.getState().byMatchId[normalizeId(matchId)];
}

/** List rows often omit `sets`; merge from detail/create cache when available. */
export function applyMatchSets(match: Match): Match {
  const existing = match.sets ?? [];
  if (existing.length > 0) {
    return match;
  }

  const cached = getMatchSetsSnapshot(match.id);
  if (!cached?.length) return match;

  return { ...match, sets: cached };
}

export function recordMatchSets(matchId: string, sets: MatchSet[] | undefined): void {
  if (!sets?.length) return;
  useMatchSetsStore.getState().recordSets(matchId, sets);
}

export function syncMatchSetsFromMatches(matches: Match[]): void {
  useMatchSetsStore.getState().syncFromMatches(matches);
}
