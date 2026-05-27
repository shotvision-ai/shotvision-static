import * as SecureStore from "expo-secure-store";
import { clampAvatarId } from "../../../lib/defaultAvatars";

const AVATAR_ID_KEY = "shotvision_default_avatar_id";
const USE_BUILTIN_KEY = "shotvision_use_builtin_avatar";

export async function loadPreferredAvatarId(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(AVATAR_ID_KEY);
    if (raw == null || raw === "") return 1;
    const n = parseInt(raw, 10);
    return clampAvatarId(n);
  } catch {
    return 1;
  }
}

export async function savePreferredAvatarId(id: number): Promise<void> {
  const v = clampAvatarId(id);
  await SecureStore.setItemAsync(AVATAR_ID_KEY, String(v));
}

/** When true, show the user's chosen built-in avatar instead of OAuth/upload URL. */
export async function loadUseBuiltInAvatar(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(USE_BUILTIN_KEY);
    if (raw == null || raw === "") return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export async function saveUseBuiltInAvatar(useBuiltIn: boolean): Promise<void> {
  await SecureStore.setItemAsync(USE_BUILTIN_KEY, useBuiltIn ? "1" : "0");
}
