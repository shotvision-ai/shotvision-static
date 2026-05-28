import type { Match } from "../../types/match";
import { getMatchOwnershipSnapshot } from "../stores/matchOwnershipStore";

/** Product rule: finished matches remain editable for 48 hours after completion. */
export const FINISHED_MATCH_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Anchor for the 48h window — only `finishedAt` (completion time), per API contract.
 * List payloads often omit `finishedAt`; session ownership cache may supply it after detail load.
 */
export function getFinishedMatchEditAnchor(
  match: Pick<Match, "finishedAt">
): Date | null {
  const raw = match.finishedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Merge `creatorId` / `finishedAt` from the ownership cache when list rows omit them.
 * Call before any edit-eligibility or owner-action rendering.
 */
export function resolveMatchLifecycleFields(match: Match): Match {
  const snap = getMatchOwnershipSnapshot(match.id);
  const creatorId = match.creatorId?.trim() || snap?.creatorId?.trim() || match.creatorId;
  const finishedAt =
    match.finishedAt != null && String(match.finishedAt).trim() !== ""
      ? match.finishedAt
      : snap?.finishedAt ?? match.finishedAt;

  if (creatorId === match.creatorId && finishedAt === match.finishedAt) {
    return match;
  }
  return { ...match, creatorId, finishedAt };
}

export function isFinishedMatchWithinEditWindow(
  match: Pick<Match, "status" | "finishedAt">
): boolean {
  if (match.status !== "completed") return false;
  const anchor = getFinishedMatchEditAnchor(match);
  if (!anchor) {
    // No completion timestamp on row — allow entry; edit screen loads detail and re-checks.
    return true;
  }
  return Date.now() - anchor.getTime() <= FINISHED_MATCH_EDIT_WINDOW_MS;
}

export function isFinishedMatchEditWindowExpired(
  match: Pick<Match, "status" | "finishedAt">
): boolean {
  if (match.status !== "completed") return false;
  const anchor = getFinishedMatchEditAnchor(match);
  if (!anchor) return false;
  return Date.now() - anchor.getTime() > FINISHED_MATCH_EDIT_WINDOW_MS;
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
  const resolved = resolveMatchLifecycleFields(match as Match);
  const viewerId = currentUserId?.trim();
  if (!viewerId) return undefined;

  if (resolved.creatorId?.trim() === viewerId) {
    return { isOwnDashboardMatch: true };
  }

  const snap = getMatchOwnershipSnapshot(resolved.id);
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
  const resolved =
    match.id?.trim() ? resolveMatchLifecycleFields(match as Match) : (match as Match);
  const viewerId = currentUserId?.trim();
  if (!viewerId) return false;
  if (options?.isOwnDashboardMatch) return true;
  if (resolved.creatorId?.trim() === viewerId) return true;
  const matchId = resolved.id?.trim();
  if (!matchId) return false;
  const snap = getMatchOwnershipSnapshot(matchId);
  return snap?.creatorId === viewerId;
}

export function isMatchEditableByCreator(
  match: Pick<Match, "id" | "status" | "matchDate" | "finishedAt" | "creatorId"> | null | undefined,
  currentUserId: string | null | undefined,
  options?: MatchEditEligibilityOptions
): boolean {
  if (!match) return false;
  const resolved = resolveMatchLifecycleFields(match as Match);
  if (!isMatchOwner(resolved, currentUserId, options)) return false;
  if (resolved.status === "live" || resolved.status === "scheduled") return true;
  if (resolved.status === "completed") return isFinishedMatchWithinEditWindow(resolved);
  return false;
}

export function finishedMatchEditLockMessage(): string {
  return "This match is locked. Finished matches can only be edited within 48 hours of completion.";
}

export function matchEditBlockedMessage(
  match: Pick<Match, "id" | "status" | "finishedAt" | "creatorId"> | null | undefined,
  currentUserId: string | null | undefined,
  options?: MatchEditEligibilityOptions
): string {
  if (!match) return "Match not found.";
  const resolved = resolveMatchLifecycleFields(match as Match);
  if (!isMatchOwner(resolved, currentUserId, options)) {
    return "Only the match creator can edit this match.";
  }
  if (resolved.status === "completed" && isFinishedMatchEditWindowExpired(resolved)) {
    return finishedMatchEditLockMessage();
  }
  return "This match cannot be edited right now.";
}
