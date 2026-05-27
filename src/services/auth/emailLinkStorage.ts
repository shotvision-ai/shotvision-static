import * as SecureStore from "expo-secure-store";
import { devLog } from "../../utils/devLog";

const PENDING_EMAIL_KEY = "shotvision_email_link_pending_email";

/** Firebase requires the same email on send + complete; stored securely on device. */
export async function savePendingEmailForLink(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  try {
    await SecureStore.setItemAsync(PENDING_EMAIL_KEY, normalized);
  } catch (err) {
    devLog.warn("[emailLinkStorage] save failed:", err);
  }
}

export async function getPendingEmailForLink(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(PENDING_EMAIL_KEY);
    const normalized = raw?.trim().toLowerCase();
    return normalized || null;
  } catch (err) {
    devLog.warn("[emailLinkStorage] load failed:", err);
    return null;
  }
}

export async function clearPendingEmailForLink(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_EMAIL_KEY);
  } catch {
    // ignore
  }
}
