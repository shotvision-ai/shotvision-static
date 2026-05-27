import type { Match, MatchSet } from "../../types/match";
import type { UpdateMatchInput } from "../services/api/matchService";

type FinishedMatchForm = {
  playerA: string;
  playerB: string;
  matchDate: Date;
  location: string;
  notes: string;
  sets: MatchSet[];
  isPublic: boolean;
};

/**
 * PATCH body for FINISHED matches — only fields being changed (API_CONTRACTS.md).
 * Never sends `status`; omits `isPublic` / `location` when unchanged.
 */
export function buildFinishedMatchPatchInput(
  existing: Pick<Match, "isPublic" | "location">,
  form: FinishedMatchForm
): UpdateMatchInput {
  const patch: UpdateMatchInput = {
    playerA: form.playerA,
    playerB: form.playerB,
    matchDate: form.matchDate.toISOString(),
    notes: form.notes,
    sets: form.sets,
  };

  const location = form.location.trim();
  const prevLocation = (existing.location ?? "").trim();
  if (location !== prevLocation) {
    patch.location = location;
  }

  if (form.isPublic !== existing.isPublic) {
    patch.isPublic = form.isPublic;
  }

  return patch;
}
