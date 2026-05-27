import { reportService } from "../api/reportService";
import { useMatchReportStore } from "../../stores/matchReportStore";
import { devLog } from "../../utils/devLog";

/** Sync reported-match IDs from API + SecureStore after auth. */
export async function hydrateMatchReportsForUser(userId: string): Promise<void> {
  const id = userId.trim();
  if (!id) return;

  try {
    const apiIds = await reportService.getMyReportedMatchIds();
    await useMatchReportStore.getState().hydrateForUser(id, apiIds);
    if (__DEV__) {
      devLog.info("[matchReports]", `hydrated userId=${id} apiCount=${apiIds.length}`);
    }
  } catch (err) {
    devLog.warn("[hydrateMatchReports] API list failed, using local cache:", err);
    await useMatchReportStore.getState().hydrateForUser(id, []);
  }
}
