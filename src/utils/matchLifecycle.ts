import type { Href } from "expo-router";

/** Query param for edit-match completion-focused flow. */
export const MATCH_COMPLETE_FOCUS = "complete";

export function getEditMatchHref(matchId: string): Href {
  const id = encodeURIComponent(matchId.trim());
  return `/edit-match/${id}` as Href;
}

export function getEditMatchCompleteHref(matchId: string): Href {
  return `${getEditMatchHref(matchId)}?focus=${MATCH_COMPLETE_FOCUS}` as Href;
}
