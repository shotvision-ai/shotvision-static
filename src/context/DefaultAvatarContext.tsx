import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clampAvatarId } from "../../lib/defaultAvatars";
import {
  loadPreferredAvatarId,
  savePreferredAvatarId,
} from "../services/profile/defaultAvatarPreference";

type DefaultAvatarContextValue = {
  /** 1–8, persisted locally */
  preferredAvatarId: number;
  /** Hydration finished — avoid flashing wrong avatar before load */
  ready: boolean;
  setPreferredAvatarId: (id: number) => Promise<void>;
};

const DefaultAvatarContext = createContext<DefaultAvatarContextValue | undefined>(undefined);

export function DefaultAvatarProvider({ children }: { children: React.ReactNode }) {
  const [preferredAvatarId, setPreferredAvatarIdState] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const id = await loadPreferredAvatarId();
      if (!cancelled) {
        setPreferredAvatarIdState(id);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreferredAvatarId = useCallback(async (id: number) => {
    const v = clampAvatarId(id);
    setPreferredAvatarIdState(v);
    await savePreferredAvatarId(v);
  }, []);

  const value = useMemo(
    () => ({ preferredAvatarId, ready, setPreferredAvatarId }),
    [preferredAvatarId, ready, setPreferredAvatarId]
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
