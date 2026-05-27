import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clampAvatarId } from "../../lib/defaultAvatars";
import {
  loadPreferredAvatarId,
  loadUseBuiltInAvatar,
  savePreferredAvatarId,
  saveUseBuiltInAvatar,
} from "../services/profile/defaultAvatarPreference";

type DefaultAvatarContextValue = {
  preferredAvatarId: number;
  /** When true, built-in avatar wins over OAuth/upload URL in ProfileAvatar. */
  useBuiltInAvatar: boolean;
  /** Bumps on every avatar display change — forces ProfileAvatar remount / cache key. */
  displayRevision: number;
  ready: boolean;
  setPreferredAvatarId: (id: number) => Promise<void>;
  /** After a successful profile-image upload, show the remote URL immediately. */
  preferUploadedProfileImage: () => Promise<void>;
};

const DefaultAvatarContext = createContext<DefaultAvatarContextValue | undefined>(undefined);

export function DefaultAvatarProvider({ children }: { children: React.ReactNode }) {
  const [preferredAvatarId, setPreferredAvatarIdState] = useState(1);
  const [useBuiltInAvatar, setUseBuiltInAvatarState] = useState(true);
  const [displayRevision, setDisplayRevision] = useState(0);
  const [ready, setReady] = useState(false);

  const bumpDisplayRevision = useCallback(() => {
    setDisplayRevision((r) => r + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [id, useBuiltIn] = await Promise.all([
        loadPreferredAvatarId(),
        loadUseBuiltInAvatar(),
      ]);
      if (!cancelled) {
        setPreferredAvatarIdState(id);
        setUseBuiltInAvatarState(useBuiltIn);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreferredAvatarId = useCallback(
    async (id: number) => {
      const v = clampAvatarId(id);
      setPreferredAvatarIdState(v);
      setUseBuiltInAvatarState(true);
      bumpDisplayRevision();
      await Promise.all([savePreferredAvatarId(v), saveUseBuiltInAvatar(true)]);
    },
    [bumpDisplayRevision]
  );

  const preferUploadedProfileImage = useCallback(async () => {
    setUseBuiltInAvatarState(false);
    bumpDisplayRevision();
    await saveUseBuiltInAvatar(false);
  }, [bumpDisplayRevision]);

  const value = useMemo(
    () => ({
      preferredAvatarId,
      useBuiltInAvatar,
      displayRevision,
      ready,
      setPreferredAvatarId,
      preferUploadedProfileImage,
    }),
    [
      preferredAvatarId,
      useBuiltInAvatar,
      displayRevision,
      ready,
      setPreferredAvatarId,
      preferUploadedProfileImage,
    ]
  );

  return (
    <DefaultAvatarContext.Provider value={value}>{children}</DefaultAvatarContext.Provider>
  );
}

export function useDefaultAvatar(): DefaultAvatarContextValue {
  const ctx = useContext(DefaultAvatarContext);
  if (!ctx) {
    throw new Error("useDefaultAvatar must be used within DefaultAvatarProvider");
  }
  return ctx;
}
