import type { Match } from "../../types/match";
import { matchService } from "../services/api/matchService";
import {
  applyMatchSets,
  getMatchSetsSnapshot,
  recordMatchSets,
} from "../stores/matchSetsStore";
import { devLog } from "./devLog";

const HYDRATE_LIMIT = 10;

/**
 * List endpoints often omit per-set scores. Fetch detail for rows still missing sets
 * so My Matches / Explore cards can show all set scores after first paint.
 */
export async function hydrateMissingMatchSets(matches: Match[]): Promise<Match[]> {
  const candidates = matches.filter((m) => {
    if (m.status !== "live" && m.status !== "completed") return false;
    if ((m.sets ?? []).length > 0) return false;
    if (getMatchSetsSnapshot(m.id)?.length) return false;
    return Boolean(m.id.trim());
  });

  if (candidates.length === 0) {
    return matches.map(applyMatchSets);
  }

  const toFetch = candidates.slice(0, HYDRATE_LIMIT);
  await Promise.all(
    toFetch.map(async (m) => {
      try {
        const detail = await matchService.getMatchDetails(m.id);
        if (detail.sets?.length) {
          recordMatchSets(detail.id, detail.sets);
        }
      } catch (err) {
        if (__DEV__) {
          devLog.warn("[hydrateMissingMatchSets] detail fetch failed", m.id, err);
        }
      }
    })
  );

  return matches.map(applyMatchSets);
}
