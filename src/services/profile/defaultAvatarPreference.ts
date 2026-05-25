import * as SecureStore from "expo-secure-store";
import { clampAvatarId } from "../../../lib/defaultAvatars";

const STORAGE_KEY = "shotvision_default_avatar_id";

export async function loadPreferredAvatarId(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw == null || raw === "") return 1;
    const n = parseInt(raw, 10);
    return clampAvatarId(n);
  } catch {
    return 1;
  }
}

export async function savePreferredAvatarId(id: number): Promise<void> {
  const v = clampAvatarId(id);
  await SecureStore.setItemAsync(STORAGE_KEY, String(v));
}
