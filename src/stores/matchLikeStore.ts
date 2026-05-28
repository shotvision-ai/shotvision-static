import { create } from "zustand";
import {
  clearPersistedMatchLikes,
  loadPersistedMatchLikes,
  savePersistedMatchLikes,
} from "../services/profile/matchLikePersistence";
import { devLog } from "../utils/devLog";

/** Centralized per-match like engagement snapshot. */
export type MatchLikeSnapshot = {
  likesCount: number;
  isLiked: boolean;
};

export type LikeApiContext = "explore" | "dashboard" | "detail" | "toggle";

export type LikeApiPayload = {
  likesCount?: number;
  /** When false, list APIs omitted `likedByMe` (mapper default) — do not treat as authoritative. */
  isLiked?: boolean;
  likedByMeProvided?: boolean;
};

type MatchLikeState = {
  overrides: Record<string, MatchLikeSnapshot>;
  /** In-flight like/unlike — blocks API reconcile from clobbering optimistic state. */
  pendingIds: Record<string, true>;
  /** Bumps on every snapshot change — use in FlatList `extraData`. */
  revision: number;
  hydratedForUserId: string | null;

  hydrateForUser: (userId: string) => Promise<void>;
  beginPending: (matchId: string) => void;
  endPending: (matchId: string) => void;
  isPending: (matchId: string) => boolean;
  setSnapshot: (matchId: string, snapshot: MatchLikeSnapshot, source?: string) => void;
  applyToggleResult: (
    matchId: string,
    result: { likesCount: number; likedByMe: boolean }
  ) => void;
  reconcileFromApi: (matchId: string, api: LikeApiPayload, context: LikeApiContext) => void;
  clearAll: () => void;
};

function bumpRevision(revision: number): number {
  return revision + 1;
}

async function persistOverrides(userId: string | null, overrides: Record<string, MatchLikeSnapshot>) {
  if (!userId?.trim()) return;
  await savePersistedMatchLikes(userId, overrides);
}

function normalizeApiCount(api: LikeApiPayload): number | undefined {
  return typeof api.likesCount === "number" && !Number.isNaN(api.likesCount)
    ? Math.max(0, api.likesCount)
    : undefined;
}

export const useMatchLikeStore = create<MatchLikeState>((set, get) => ({
  overrides: {},
  pendingIds: {},
  revision: 0,
  hydratedForUserId: null,

  hydrateForUser: async (userId) => {
    const id = userId.trim();
    if (!id) return;
    const persisted = await loadPersistedMatchLikes(id);
    set((state) => ({
      hydratedForUserId: id,
      overrides: { ...persisted, ...state.overrides },
      revision: bumpRevision(state.revision),
    }));
    devLog.info("[like:store] hydrated", {
      userId: id,
      persistedCount: Object.keys(persisted).length,
    });
  },

  beginPending: (matchId) => {
    const id = matchId.trim();
    if (!id) return;
    set((state) => ({
      pendingIds: { ...state.pendingIds, [id]: true },
      revision: bumpRevision(state.revision),
    }));
  },

  endPending: (matchId) => {
    const id = matchId.trim();
    if (!id) return;
    set((state) => {
      const next = { ...state.pendingIds };
      delete next[id];
      return { pendingIds: next, revision: bumpRevision(state.revision) };
    });
  },

  isPending: (matchId) => {
    const id = matchId.trim();
    return id ? Boolean(get().pendingIds[id]) : false;
  },

  setSnapshot: (matchId, snapshot, source = "set") => {
    const id = matchId.trim();
    if (!id) return;
    const normalized: MatchLikeSnapshot = {
      likesCount: Math.max(0, snapshot.likesCount),
      isLiked: snapshot.isLiked,
    };
    const existing = get().overrides[id];
    if (
      existing?.likesCount === normalized.likesCount &&
      existing?.isLiked === normalized.isLiked
    ) {
      return;
    }
    set((state) => ({
      overrides: { ...state.overrides, [id]: normalized },
      revision: bumpRevision(state.revision),
    }));
    devLog.info(`[like:store] ${source}`, { matchId: id, ...normalized });
    void persistOverrides(get().hydratedForUserId, get().overrides);
  },

  applyToggleResult: (matchId, result) => {
    get().setSnapshot(
      matchId,
      { likesCount: result.likesCount, isLiked: result.likedByMe },
      "toggle"
    );
  },

  reconcileFromApi: (matchId, api, context) => {
    const id = matchId.trim();
    if (!id) return;
    if (get().pendingIds[id]) {
      devLog.info("[like:store] reconcile skipped (pending)", { matchId: id, context });
      return;
    }

    const existing = get().overrides[id];
    const apiCount = normalizeApiCount(api);
    const apiLikedProvided = api.likedByMeProvided === true;
    const apiLiked = apiLikedProvided ? Boolean(api.isLiked) : undefined;

    // Dashboard rows often omit like fields — avoid seeding {0, false} overrides.
    if (context === "dashboard" && !existing && apiCount === undefined && !apiLikedProvided) {
      return;
    }

    let likesCount: number;
    if (context === "explore" || context === "detail" || context === "toggle") {
      likesCount = apiCount ?? existing?.likesCount ?? 0;
    } else {
      likesCount = apiCount ?? existing?.likesCount ?? 0;
    }

    let isLiked: boolean;
    if (context === "detail" || context === "toggle") {
      isLiked = apiLiked ?? existing?.isLiked ?? false;
    } else if (context === "explore") {
      // Explore exposes likesCount but not likedByMe — never clear a known local like.
      isLiked = existing?.isLiked ?? apiLiked ?? false;
    } else {
      isLiked = existing?.isLiked ?? apiLiked ?? false;
    }

    const next: MatchLikeSnapshot = { likesCount, isLiked };
    const unchanged =
      existing?.likesCount === next.likesCount && existing?.isLiked === next.isLiked;
    if (unchanged) return;

    get().setSnapshot(id, next, `reconcile:${context}`);
  },

  clearAll: () => {
    const uid = get().hydratedForUserId;
    if (uid) {
      void clearPersistedMatchLikes(uid);
    }
    set({ overrides: {}, pendingIds: {}, revision: 0, hydratedForUserId: null });
    devLog.info("[like:store] cleared");
  },
}));

export function getMatchLikeSnapshot(matchId: string): MatchLikeSnapshot | undefined {
  const id = matchId.trim();
  if (!id) return undefined;
  return useMatchLikeStore.getState().overrides[id];
}

export function getMatchLikeRevision(): number {
  return useMatchLikeStore.getState().revision;
}
