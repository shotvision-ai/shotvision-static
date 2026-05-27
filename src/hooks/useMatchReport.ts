import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import type { Match } from "../../types/match";
import { reportService } from "../services/api/reportService";
import { getUserFriendlyErrorMessage } from "../services/api/userFriendlyErrors";
import { AppError } from "../services/api/apiErrors";
import { useAuth } from "../context/AuthContext";
import { useMatchReportStore } from "../stores/matchReportStore";
import { isValidMatchIdForReport, resolveMatchReported } from "../utils/matchReport";
import { devLog } from "../utils/devLog";

export function useMatchReport(match: Match) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const setReported = useMatchReportStore((s) => s.setReported);
  const override = useMatchReportStore((s) =>
    userId ? s.overrides[userId]?.[match.id] : undefined
  );

  const [isReported, setIsReported] = useState(() =>
    resolveMatchReported(match, override)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const snap = userId
      ? useMatchReportStore.getState().overrides[userId]?.[match.id]
      : undefined;
    setIsReported(resolveMatchReported(match, snap));
  }, [match.id, match.isReported, override, userId]);

  const submitReport = useCallback(
    async (reason: string, notes?: string) => {
      if (!userId) {
        Alert.alert("Sign in required", "Please sign in to report a match.");
        return false;
      }
      if (!isValidMatchIdForReport(match.id)) {
        Alert.alert("Error", "This match cannot be reported right now. Try refreshing the feed.");
        return false;
      }
      if (isSubmitting) return false;

      setIsSubmitting(true);
      try {
        const result = await reportService.reportMatch(match.id, { reason, notes });
        const reported = result.reportedByMe !== false;
        await setReported(userId, match.id, reported);
        setIsReported(reported);
        return true;
      } catch (error) {
        if (error instanceof AppError && (error.statusCode === 409 || error.code === "ALREADY_REPORTED")) {
          await setReported(userId, match.id, true);
          setIsReported(true);
          return true;
        }
        devLog.error("[useMatchReport] submit failed:", error);
        Alert.alert(
          "Report failed",
          getUserFriendlyErrorMessage(error, "Could not submit your report. Please try again.")
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, match.id, setReported, userId]
  );

  const undoReport = useCallback(async () => {
    if (!userId || isSubmitting) return false;
    if (!isValidMatchIdForReport(match.id)) return false;

    setIsSubmitting(true);
    try {
      const result = await reportService.undoReport(match.id);
      const reported = Boolean(result.reportedByMe);
      await setReported(userId, match.id, reported);
      setIsReported(reported);
      return !reported;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        await setReported(userId, match.id, false);
        setIsReported(false);
        return true;
      }
      devLog.error("[useMatchReport] undo failed:", error);
      Alert.alert(
        "Could not withdraw report",
        getUserFriendlyErrorMessage(error, "Please try again.")
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, match.id, setReported, userId]);

  return {
    isReported,
    isSubmitting,
    submitReport,
    undoReport,
  };
}
