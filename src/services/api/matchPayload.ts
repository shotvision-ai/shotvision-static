import type { CreateMatchInput, UpdateMatchInput } from "./matchService";
import type { MatchStatus } from "./contracts/match.types";

/**
 * Maps app match models to the wire format expected by the Shot Vision API
 * (set rows use `setNumber`, `p1Score`, `p2Score`; status is uppercase).
 */
export function toApiMatchWritePayload(data: CreateMatchInput | UpdateMatchInput): Record<string, unknown> {
  const statusMap: Record<string, MatchStatus> = {
    live: "LIVE",
    scheduled: "SCHEDULED",
    completed: "FINISHED",
  };

  const sets = (data.sets ?? []).map((set, index) => ({
    setNumber: index + 1,
    p1Score: set.playerAScore,
    p2Score: set.playerBScore,
  }));

  const payload: Record<string, unknown> = {
    isPublic: data.isPublic ?? false,
    sets,
  };

  if (data.playerA !== undefined) {
    const v = typeof data.playerA === "string" ? data.playerA.trim() : data.playerA;
    payload.player1Name = v;
  }
  if (data.playerB !== undefined) {
    const v = typeof data.playerB === "string" ? data.playerB.trim() : data.playerB;
    payload.player2Name = v;
  }
  if (data.matchDate !== undefined) {
    payload.matchDate = data.matchDate;
  }
  if (data.status !== undefined && data.status !== null) {
    payload.status = statusMap[String(data.status)] ?? "LIVE";
  }
  if (data.location !== undefined && String(data.location).trim() !== "") {
    payload.location = String(data.location).trim();
  }
  if (data.notes !== undefined && String(data.notes).trim() !== "") {
    payload.notes = String(data.notes).trim();
  }

  return payload;
}
