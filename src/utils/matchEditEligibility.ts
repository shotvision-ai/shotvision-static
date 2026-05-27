import type { Match } from "../../types/match";
import { getMatchOwnershipSnapshot } from "../stores/matchOwnershipStore";

/** Product rule: finished matches remain editable for 48 hours after completion. */
export const FINISHED_MATCH_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Anchor for the 48h window — only `finishedAt` (completion time), per API contract.
 * List payloads often omit `finishedAt`; callers treat a missing anchor as "unknown" (not expired).
 */
export function getFinishedMatchEditAnchor(
  match: Pick<Match, "finishedAt">
): Date | null {
  const raw = match.finishedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isFinishedMatchWithinEditWindow(
  match: Pick<Match, "status" | "finishedAt">
): boolean {
  if (match.status !== "completed") return false;
  const anchor = getFinishedMatchEditAnchor(match);
  if (!anchor) {
    // Don't block when the API omitted finishedAt on list rows — server enforces on PATCH.
    return true;
  }
  return Date.now() - anchor.getTime() <= FINISHED_MATCH_EDIT_WINDOW_MS;
}

export type MatchEditEligibilityOptions = {
  /** Items from GET `/api/matches/my` — viewer is always the organizer. */
  isOwnDashboardMatch?: boolean;
};

/**
 * Owner context for edit eligibility — uses API `creatorId` or session ownership cache.
 */
export function resolveMatchEditOwnerOptions(
  match: Pick<Match, "id" | "creatorId">,
  currentUserId: string | null | undefined
): MatchEditEligibilityOptions | undefined {
  const viewerId = currentUserId?.trim();
  if (!viewerId) return undefined;

  if (match.creatorId?.trim() === viewerId) {
    return { isOwnDashboardMatch: true };
  }

  const snap = getMatchOwnershipSnapshot(match.id);
  if (snap?.creatorId === viewerId) {
    return { isOwnDashboardMatch: true };
  }

  return undefined;
}

export function isMatchOwner(
  match: Pick<Match, "creatorId"> & { id?: string },
  currentUserId: string | null | undefined,
  options?: MatchEditEligibilityOptions
): boolean {
  const viewerId = currentUserId?.trim();
  if (!viewerId) return false;
  if (options?.isOwnDashboardMatch) return true;
  if (match.creatorId?.trim() === viewerId) return true;
  const matchId = match.id?.trim();
  if (!matchId) return false;
  const snap = getMatchOwnershipSnapshot(matchId);
  return snap?.creatorId === viewerId;
}

export function isMatchEditableByCreator(
  match: Pick<Match, "status" | "matchDate" | "finishedAt" | "creatorId"> | null | undefined,
  currentUserId: string | null | undefined,
  options?: MatchEditEligibilityOptions
): boolean {
  if (!match || !isMatchOwner(match, currentUserId, options)) return false;
  if (match.status === "live" || match.status === "scheduled") return true;
  if (match.status === "completed") return isFinishedMatchWithinEditWindow(match);
  return false;
}

export function finishedMatchEditLockMessage(): string {
  return "This match is locked. Finished matches can only be edited within 48 hours of completion.";
}

export function matchEditBlockedMessage(
  match: Pick<Match, "status" | "finishedAt" | "creatorId"> | null | undefined,
  currentUserId: string | null | undefined,
  options?: MatchEditEligibilityOptions
): string {
  if (!match) return "Match not found.";
  if (!isMatchOwner(match, currentUserId, options)) {
    return "Only the match creator can edit this match.";
  }
  if (match.status === "completed" && !isFinishedMatchWithinEditWindow(match)) {
    return finishedMatchEditLockMessage();
  }
  // live / scheduled owner: should always be editable — caller should not reach this.
  return "This match cannot be edited right now.";
}
