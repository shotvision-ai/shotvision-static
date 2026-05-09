import type { CreateMatchInput, UpdateMatchInput } from "./matchService";

/** Backend enum (Spring validation). */
type ApiMatchStatus = "LIVE" | "SCHEDULED" | "FINISHED" | "IN_PROGRESS";

/**
 * Maps app match models to the wire format expected by the Shot Vision API
 * (set rows use `setNumber`, `p1Score`, `p2Score`; status is uppercase).
 */
export function toApiMatchWritePayload(data: CreateMatchInput | UpdateMatchInput): Record<string, unknown> {
  const statusMap: Record<string, ApiMatchStatus> = {
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
    payload.playerA = v;
    /** Wire name used by Spring validation ("Player 1 is required"); keeps UI model as playerA / playerB. */
    payload.player1Name = v;
  }
  if (data.playerB !== undefined) {
    const v = typeof data.playerB === "string" ? data.playerB.trim() : data.playerB;
    payload.playerB = v;
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
  if (data.scheduledDate) {
    payload.scheduledDate = data.scheduledDate;
  }

  return payload;
}
