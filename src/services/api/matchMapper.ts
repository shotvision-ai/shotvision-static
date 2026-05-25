import { Match, MatchParticipantGender, MatchSet, MatchStatus } from "../../../types/match";
import { AppError } from "./apiErrors";

function mapStatus(raw: unknown): MatchStatus {
  const s = String(raw ?? "").toUpperCase();
  if (s === "FINISHED" || s === "COMPLETED") return "completed";
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

function mapSets(raw: unknown): MatchSet[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const x = row as Record<string, unknown>;
    return {
      playerAScore: Number(x.playerAScore ?? x.p1Score ?? x.player1Score ?? 0),
      playerBScore: Number(x.playerBScore ?? x.p2Score ?? x.player2Score ?? 0),
    };
  });
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

  const sets = mapSets(r.sets ?? r.setScores ?? r.matchSets);

  const playerA = String(r.playerA ?? r.player1Name ?? r.player1 ?? "");
  const playerB = String(r.playerB ?? r.player2Name ?? r.player2 ?? "");

  return {
    id,
    creatorId: String(r.creatorId ?? r.createdBy ?? r.organizerId ?? ""),
    creatorName: String(r.creatorName ?? r.organizerName ?? ""),
    creatorImage: String(r.creatorImage ?? r.creator_image ?? ""),
    creatorGender: mapParticipantGender(
      r.creatorGender ?? r.creator_gender ?? r.organizerGender ?? r.organizer_gender
    ),
    playerA,
    playerAImage: String(r.playerAImage ?? r.player_a_image ?? r.playerAProfileImage ?? ""),
    playerB,
    playerBImage: String(r.playerBImage ?? r.player_b_image ?? r.playerBProfileImage ?? ""),
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
    location: typeof r.location === "string" ? r.location : undefined,
    isPublic: Boolean(r.isPublic ?? r.public ?? false),
    sets,
    notes: typeof r.notes === "string" ? r.notes : undefined,
    winner: r.winner !== undefined && r.winner !== null ? mapWinner(r.winner) : undefined,
    scheduledDate: typeof r.scheduledDate === "string" ? r.scheduledDate : undefined,
    likesCount:
      typeof r.likesCount === "number"
        ? r.likesCount
        : typeof r.likes_count === "number"
          ? r.likes_count
          : undefined,
    isLiked: Boolean(r.isLiked ?? r.likedByMe ?? r.liked ?? false),
  };
}

/** Maps list items; skips invalid rows instead of failing the whole list. */
export function normalizeMatchList(raw: unknown[]): Match[] {
  const out: Match[] = [];
  for (let i = 0; i < raw.length; i++) {
    try {
      let m = normalizeMatch(raw[i]);
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
