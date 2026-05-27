import type { CreateMatchInput, UpdateMatchInput } from "./matchService";
import type { MatchStatus } from "./contracts/match.types";

/**
 * Maps app match models to the wire format expected by the Shot Vision API
 * (set rows use `setNumber`, `p1Score`, `p2Score`; status is uppercase).
 */
export type MatchWritePayloadOptions = {
  /** When true, do not send `status` — required for PATCH on already-finished matches. */
  omitStatus?: boolean;
  /** When true, apply create defaults (`isPublic: false`, `sets: []`) for omitted fields. */
  forCreate?: boolean;
};

export function toApiMatchWritePayload(
  data: CreateMatchInput | UpdateMatchInput,
  options?: MatchWritePayloadOptions
): Record<string, unknown> {
  const statusMap: Record<string, MatchStatus> = {
    live: "LIVE",
    scheduled: "SCHEDULED",
    completed: "FINISHED",
  };

  const payload: Record<string, unknown> = {};

  if (data.isPublic !== undefined) {
    payload.isPublic = data.isPublic;
  } else if (options?.forCreate) {
    payload.isPublic = false;
  }

  const writeStatus =
    !options?.omitStatus && data.status != null ? String(data.status).toLowerCase() : undefined;
  const setsForApi =
    data.sets !== undefined
      ? writeStatus === "scheduled"
        ? []
        : data.sets
      : undefined;

  if (setsForApi !== undefined) {
    payload.sets = setsForApi.map((set, index) => ({
      setNumber: index + 1,
      p1Score: set.playerAScore,
      p2Score: set.playerBScore,
    }));
  } else if (options?.forCreate) {
    payload.sets = [];
  }

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
  if (
    !options?.omitStatus &&
    data.status !== undefined &&
    data.status !== null
  ) {
    payload.status = statusMap[String(data.status)] ?? "LIVE";
  }
  if (data.location !== undefined && String(data.location).trim() !== "") {
    payload.location = String(data.location).trim();
  }
  if (data.notes !== undefined) {
    const trimmed = String(data.notes).trim();
    payload.notes = trimmed.length > 0 ? trimmed : null;
  }

  return payload;
}
