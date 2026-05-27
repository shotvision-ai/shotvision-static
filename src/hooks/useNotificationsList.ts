import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { InAppNotification } from "~/types/notification";
import { notificationService } from "../services/api/notificationService";
import { NOTIFICATIONS_API_ENABLED } from "../config/featureFlags";
import {
  isNotificationsApiKnownUnavailable,
  isNotificationsApiUnavailableError,
  markNotificationsApiUnavailableForSession,
} from "../utils/notificationsAvailability";
import {
  getNotificationLoadFailureUI,
  type NotificationLoadFailureUI,
} from "../utils/notificationsLoadError";

export type NotificationsListPhase =
  | "disabled"
  | "unavailable"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export function useNotificationsList() {
  const [phase, setPhase] = useState<NotificationsListPhase>(() => {
    if (!NOTIFICATIONS_API_ENABLED) return "disabled";
    if (isNotificationsApiKnownUnavailable()) return "unavailable";
    return "loading";
  });
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failureUI, setFailureUI] = useState<NotificationLoadFailureUI | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadInFlightRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!NOTIFICATIONS_API_ENABLED) {
      setPhase("disabled");
      return;
    }
    if (isNotificationsApiKnownUnavailable() && !opts?.force) {
      setPhase("unavailable");
      return;
    }
    if (loadInFlightRef.current) return;

    loadInFlightRef.current = true;
    try {
      setFailureUI(null);
      if (!opts?.silent) setPhase("loading");

      const list = await notificationService.list();
      setNotifications(list);
      hasLoadedRef.current = true;
      setPhase(list.length > 0 ? "ready" : "empty");
    } catch (err) {
      if (isNotificationsApiUnavailableError(err)) {
        markNotificationsApiUnavailableForSession();
        setPhase("unavailable");
        return;
      }
      setFailureUI(getNotificationLoadFailureUI(err));
      setPhase("error");
    } finally {
      loadInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!NOTIFICATIONS_API_ENABLED || isNotificationsApiKnownUnavailable()) {
        return;
      }
      if (!hasLoadedRef.current) {
        void load({ silent: false });
      }
    }, [load])
  );

  const onRefresh = useCallback(() => {
    if (!NOTIFICATIONS_API_ENABLED || isNotificationsApiKnownUnavailable()) {
      return;
    }
    setIsRefreshing(true);
    void load({ silent: true, force: true });
  }, [load]);

  const retry = useCallback(() => {
    void load({ silent: false, force: true });
  }, [load]);

  return {
    phase,
    notifications,
    isRefreshing,
    failureUI,
    isMutating,
    setIsMutating,
    setNotifications,
    load,
    onRefresh,
    retry,
    showInitialLoading: phase === "loading" && !isRefreshing && notifications.length === 0,
  };
}
