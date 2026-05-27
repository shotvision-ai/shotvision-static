import { create } from "zustand";

export type MatchVisibilitySnapshot = {
  isPublic: boolean;
};

type MatchVisibilityState = {
  overrides: Record<string, MatchVisibilitySnapshot>;
  /** Set when a visibility toggle should refresh the Explore feed on next focus. */
  exploreStale: boolean;
  /** Set when match data changed — refresh My Matches on next dashboard focus. */
  myMatchesStale: boolean;
  setSnapshot: (matchId: string, snapshot: MatchVisibilitySnapshot) => void;
  markExploreStale: () => void;
  clearExploreStale: () => void;
  markMyMatchesStale: () => void;
  clearMyMatchesStale: () => void;
  markAllListsStale: () => void;
  clearAll: () => void;
};

export const useMatchVisibilityStore = create<MatchVisibilityState>((set) => ({
  overrides: {},
  exploreStale: false,
  myMatchesStale: false,
  setSnapshot: (matchId, snapshot) => {
    const id = matchId.trim();
    if (!id) return;
    set((state) => ({
      overrides: {
        ...state.overrides,
        [id]: { isPublic: snapshot.isPublic },
      },
    }));
  },
  markExploreStale: () => set({ exploreStale: true }),
  clearExploreStale: () => set({ exploreStale: false }),
  markMyMatchesStale: () => set({ myMatchesStale: true }),
  clearMyMatchesStale: () => set({ myMatchesStale: false }),
  markAllListsStale: () => set({ exploreStale: true, myMatchesStale: true }),
  clearAll: () => set({ overrides: {}, exploreStale: false, myMatchesStale: false }),
}));

export function getMatchVisibilitySnapshot(
  matchId: string
): MatchVisibilitySnapshot | undefined {
  const id = matchId.trim();
  if (!id) return undefined;
  return useMatchVisibilityStore.getState().overrides[id];
}
