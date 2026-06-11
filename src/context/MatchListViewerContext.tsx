import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  useCurrentUserAvatarProps,
  type CurrentUserAvatarProps,
} from "../hooks/useCurrentUserAvatar";
import type { UserProfile } from "../services/api/profileService";

export type MatchListViewerContextValue = {
  user: UserProfile | null;
  avatar: CurrentUserAvatarProps;
};

const MatchListViewerContext = createContext<MatchListViewerContextValue | null>(null);

/** Single auth/avatar subscription for match list screens (avoids per-card hook work). */
export function MatchListViewerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const avatar = useCurrentUserAvatarProps(user?.id);

  const value = useMemo(
    () => ({
      user,
      avatar,
    }),
    [user, avatar]
  );

  return (
    <MatchListViewerContext.Provider value={value}>{children}</MatchListViewerContext.Provider>
  );
}

export function useMatchListViewer(): MatchListViewerContextValue {
  const ctx = useContext(MatchListViewerContext);
  if (!ctx) {
    throw new Error("useMatchListViewer must be used within MatchListViewerProvider");
  }
  return ctx;
}
