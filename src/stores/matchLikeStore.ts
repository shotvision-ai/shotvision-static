import { create } from "zustand";

/** Client-side like state when list APIs omit `likesCount` / `likedByMe` (e.g. GET `/api/matches/my`). */
export type MatchLikeSnapshot = {
  likesCount: number;
  isLiked: boolean;
};

type MatchLikeState = {
  overrides: Record<string, MatchLikeSnapshot>;
  setSnapshot: (matchId: string, snapshot: MatchLikeSnapshot) => void;
  clearAll: () => void;
};

export const useMatchLikeStore = create<MatchLikeState>((set) => ({
  overrides: {},
  setSnapshot: (matchId, snapshot) => {
    const id = matchId.trim();
    if (!id) return;
    set((state) => ({
      overrides: {
        ...state.overrides,
        [id]: {
          likesCount: Math.max(0, snapshot.likesCount),
          isLiked: snapshot.isLiked,
        },
      },
    }));
  },
  clearAll: () => set({ overrides: {} }),
}));

export function getMatchLikeSnapshot(matchId: string): MatchLikeSnapshot | undefined {
  const id = matchId.trim();
  if (!id) return undefined;
  return useMatchLikeStore.getState().overrides[id];
}
