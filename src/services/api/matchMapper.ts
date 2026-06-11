import { Match, MatchParticipantGender, MatchSet, MatchStatus } from "../../../types/match";
import { coalesceProfileImageUrl } from "../../utils/profileImageUrl";
import { recordMatchSets } from "../../stores/matchSetsStore";
import { AppError } from "./apiErrors";
import { devLog } from "../../utils/devLog";

function mapStatus(raw: unknown): MatchStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "FINISHED" || s === "COMPLETED") return "completed";
  if (s === "CANCELED" || s === "CANCELLED") return "cancelled";
  if (s === "SCHEDULED") return "scheduled";
  if (s === "IN_PROGRESS" || s === "LIVE") return "live";
  return "live";
}

function mapWinner(raw: unknown): "playerA" | "playerB" | undefined {
  const w = String(raw ?? "").toUpperCase();
  if (w === "PLAYER_1" || w === "PLAYERA" || w === "PLAYER_A" || w === "P1") return "playerA";
  if (w === "PLAYER_2" || w === "PLAYERB" || w === "PLAYER_B" || w === "P2") return "playerB";
  const lower = w.toLowerCase();
  if (lower === "playera" || lower === "player_a" || lower === "player1") return "playerA";
  if (lower === "playerb" || lower === "player_b" || lower === "player2") return "playerB";
  return undefined;
}

function mapParticipantGender(raw: unknown): MatchParticipantGender | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const u = s.toUpperCase();
  if (u === "FEMALE" || u === "F") return "female";
  if (u === "MALE" || u === "M") return "male";
  const lower = s.toLowerCase();
  if (lower === "female") return "female";
  if (lower === "male") return "male";
  return undefined;
}

function optionalUserId(raw: unknown): string | undefined {
  const s = String(raw ?? "").trim();
  return s || undefined;
}

function mapMatchImage(r: Record<string, unknown>, ...keys: string[]): string {
  const candidates = keys.map((k) => {
    const v = r[k];
    return typeof v === "string" ? v : undefined;
  });
  return coalesceProfileImageUrl(...candidates) ?? "";
}

function mapSetRow(row: unknown): MatchSet | null {
  if (row == null || typeof row !== "object") return null;
  const x = row as Record<string, unknown>;
  const aRaw =
    x.playerAScore ??
    x.score_a ??
    x.scoreA ??
    x.p1Score ??
    x.player_a_score ??
    x.player1Score;
  const bRaw =
    x.playerBScore ??
    x.score_b ??
    x.scoreB ??
    x.p2Score ??
    x.player_b_score ??
    x.player2Score;
  if (aRaw === undefined && bRaw === undefined) return null;
  return {
    playerAScore: Number(aRaw ?? 0),
    playerBScore: Number(bRaw ?? 0),
  };
}

function mapSets(raw: unknown): MatchSet[] {
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      return mapSets(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const out: MatchSet[] = [];
  for (const row of raw) {
    const mapped = mapSetRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}

function extractSetsFromRecord(r: Record<string, unknown>): MatchSet[] {
  const sources = [
    r.sets,
    r.setScores,
    r.matchSets,
    r.set_scores,
    r.scores,
    r.score,
  ];
  for (const src of sources) {
    const mapped = mapSets(src);
    if (mapped.length > 0) return mapped;
  }
  return [];
}

/**
 * Maps `/api/matches/*` JSON (camelCase / snake_case / Spring enums) to the UI `Match` model.
 */
export function normalizeMatch(raw: unknown): Match {
  if (raw == null || typeof raw !== "object") {
    throw new AppError("Invalid match response", 502, "INVALID_MATCH");
  }
  const r = raw as Record<string, unknown>;

  const id = String(r.id ?? r.matchId ?? "").trim();

  const sets = extractSetsFromRecord(r);
  if (sets.length > 0 && id) {
    recordMatchSets(id, sets);
  }

  const playerA = String(r.playerA ?? r.player1Name ?? r.player1 ?? "");
  const playerB = String(r.playerB ?? r.player2Name ?? r.player2 ?? "");

  return {
    id,
    creatorId:
      optionalUserId(
        r.creatorId ??
          r.createdBy ??
          r.organizerId ??
          r.organizer_id ??
          r.createdByUserId ??
          r.ownerId ??
          r.userId
      ) ?? "",
    creatorName: String(r.creatorName ?? r.organizerName ?? ""),
    creatorImage: mapMatchImage(
      r,
      "creatorImage",
      "creator_image",
      "organizerImage",
      "organizer_image",
      "organizerProfileImage",
      "createdByProfileImage"
    ),
    creatorGender: mapParticipantGender(
      r.creatorGender ?? r.creator_gender ?? r.organizerGender ?? r.organizer_gender
    ),
    playerA,
    playerAImage: mapMatchImage(
      r,
      "playerAImage",
      "player_a_image",
      "playerAProfileImage",
      "player1ProfileImage",
      "player1Image",
      "player1_profile_image",
      "p1ProfileImage"
    ),
    playerB,
    playerBImage: mapMatchImage(
      r,
      "playerBImage",
      "player_b_image",
      "playerBProfileImage",
      "player2ProfileImage",
      "player2Image",
      "player2_profile_image",
      "p2ProfileImage"
    ),
    playerAUserId: optionalUserId(
      r.playerAUserId ?? r.playerAId ?? r.player1Id ?? r.player1UserId ?? r.player_a_id
    ),
    playerBUserId: optionalUserId(
      r.playerBUserId ?? r.playerBId ?? r.player2Id ?? r.player2UserId ?? r.player_b_id
    ),
    playerAGender: mapParticipantGender(
      r.playerAGender ?? r.player_a_gender ?? r.player1Gender ?? r.player1_gender
    ),
    playerBGender: mapParticipantGender(
      r.playerBGender ?? r.player_b_gender ?? r.player2Gender ?? r.player2_gender
    ),
    status: mapStatus(r.status),
    matchDate: String(r.matchDate ?? r.match_date ?? r.createdAt ?? new Date().toISOString()),
    createdAt:
      typeof r.createdAt === "string"
        ? r.createdAt
        : typeof r.created_at === "string"
          ? r.created_at
          : undefined,
    finishedAt:
      typeof r.finishedAt === "string"
        ? r.finishedAt
        : typeof r.finished_at === "string"
          ? r.finished_at
          : null,
    location: typeof r.location === "string" ? r.location : undefined,
    isPublic: Boolean(r.isPublic ?? r.is_public ?? r.public ?? false),
    sets,
    notes: typeof r.notes === "string" ? r.notes : undefined,
    cancellationReason:
      typeof r.cancellationReason === "string"
        ? r.cancellationReason
        : typeof r.cancellation_reason === "string"
          ? r.cancellation_reason
          : undefined,
    winner: r.winner !== undefined && r.winner !== null ? mapWinner(r.winner) : undefined,
    scheduledDate: typeof r.scheduledDate === "string" ? r.scheduledDate : undefined,
    likesCount:
      typeof r.likesCount === "number"
        ? r.likesCount
        : typeof r.likes_count === "number"
          ? r.likes_count
          : undefined,
    isLiked: Boolean(r.isLiked ?? r.likedByMe ?? r.liked ?? false),
    isReported: Boolean(r.isReported ?? r.reportedByMe ?? r.reported_by_me ?? r.reported ?? false),
  };
}

/**
 * Maps GET `/api/matches/explore` rows (ExploreMatchItem — no `isPublic` field; feed is public-only).
 */
export function normalizeExploreMatch(raw: unknown): Match {
  const base = normalizeMatch(raw);
  return { ...base, isPublic: true };
}

/** Maps explore list items; skips invalid rows instead of failing the whole list. */
function logMatchRowWithoutSetsOnce(raw: unknown, context: string): void {
  if (!__DEV__ || raw == null || typeof raw !== "object") return;
  const r = raw as Record<string, unknown>;
  const status = String(r.status ?? "").toUpperCase();
  if (
    status !== "LIVE" &&
    status !== "IN_PROGRESS" &&
    status !== "FINISHED" &&
    status !== "COMPLETED"
  ) {
    return;
  }
  devLog.info(`[match:mapper] ${context} row missing sets — see console`);
  console.log("Match data:", JSON.stringify(r, null, 2));
}

export function normalizeExploreMatchList(raw: unknown[]): Match[] {
  const out: Match[] = [];
  let skippedInvalid = 0;
  let skippedMissingId = 0;
  let loggedMissingSets = false;
  for (let i = 0; i < raw.length; i++) {
    try {
      const m = normalizeExploreMatch(raw[i]);
      if (!loggedMissingSets && m.sets.length === 0 && (m.status === "live" || m.status === "completed")) {
        logMatchRowWithoutSetsOnce(raw[i], "explore");
        loggedMissingSets = true;
      }
      if (!m.id.trim()) {
        skippedMissingId += 1;
        continue;
      }
      out.push(m);
    } catch {
      skippedInvalid += 1;
    }
  }
  if (__DEV__ && (skippedInvalid > 0 || skippedMissingId > 0)) {
    devLog.warn(
      `[explore:mapper] dropped invalid=${skippedInvalid} missingId=${skippedMissingId} kept=${out.length}`
    );
  }
  return out;
}

/** Maps list items; skips invalid rows instead of failing the whole list. */
export function normalizeMatchList(raw: unknown[]): Match[] {
  const out: Match[] = [];
  let loggedMissingSets = false;
  for (let i = 0; i < raw.length; i++) {
    try {
      let m = normalizeMatch(raw[i]);
      if (!loggedMissingSets && m.sets.length === 0 && (m.status === "live" || m.status === "completed")) {
        logMatchRowWithoutSetsOnce(raw[i], "my-matches");
        loggedMissingSets = true;
      }
      if (!m.id.trim()) {
        m = { ...m, id: `match-${i}` };
      }
      out.push(m);
    } catch {
      // skip invalid row
    }
  }
  return out;
}
