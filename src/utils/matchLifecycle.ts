import type { Href } from "expo-router";

/** Query param for edit-match completion-focused flow. */
export const MATCH_COMPLETE_FOCUS = "complete";
export const MATCH_NAV_SOURCE_DETAIL = "detail";

export function getEditMatchHref(matchId: string): Href {
  const id = encodeURIComponent(matchId.trim());
  return `/edit-match/${id}` as Href;
}

export function getEditMatchCompleteHref(
  matchId: string,
  source?: typeof MATCH_NAV_SOURCE_DETAIL
): Href {
  const query = new URLSearchParams({ focus: MATCH_COMPLETE_FOCUS });
  if (source) {
    query.set("source", source);
  }
  return `${getEditMatchHref(matchId)}?${query.toString()}` as Href;
}
