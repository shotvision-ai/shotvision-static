import type { Match } from "../../types/match";
import { getMatchReportSnapshot } from "../stores/matchReportStore";

export function isValidMatchIdForReport(matchId: string): boolean {
  const id = matchId.trim();
  if (!id) return false;
  if (id.startsWith("match-")) return false;
  return true;
}

export function normalizeReportMatchResponse(raw: unknown, fallbackMatchId: string): {
  matchId: string;
  reportedByMe: boolean;
} {
  const r = (raw != null && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const reportedRaw = r.reportedByMe ?? r.reported_by_me ?? r.reported ?? r.isReported;

  return {
    matchId: String(r.matchId ?? r.match_id ?? fallbackMatchId).trim(),
    reportedByMe: Boolean(reportedRaw),
  };
}

export function normalizeUserReportedMatchIds(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item != null && typeof item === "object") {
          const o = item as Record<string, unknown>;
          return String(o.matchId ?? o.match_id ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const lists = [r.matchIds, r.reportedMatchIds, r.items, r.data];
  for (const list of lists) {
    const ids = normalizeUserReportedMatchIds(list);
    if (ids.length > 0) return ids;
  }
  return [];
}

export function resolveMatchReported(
  match: Pick<Match, "id" | "isReported">,
  override?: boolean | null
): boolean {
  if (typeof override === "boolean") return override;
  const snap = getMatchReportSnapshot(match.id);
  if (typeof snap === "boolean") return snap;
  return Boolean(match.isReported);
}

export function applyMatchReportOverrides(match: Match): Match {
  const snap = getMatchReportSnapshot(match.id);
  if (typeof snap !== "boolean") return match;
  return { ...match, isReported: snap };
}

export function applyMatchReportOverridesList(matches: Match[]): Match[] {
  return matches.map(applyMatchReportOverrides);
}
