import type { Href } from "expo-router";

/** Query param for edit-match notes-focused flow (see `getEditMatchNotesHref`). */
export const MATCH_NOTES_FOCUS = "notes";

export function getEditMatchNotesHref(matchId: string): Href {
  const id = encodeURIComponent(matchId.trim());
  return `/edit-match/${id}?focus=${MATCH_NOTES_FOCUS}` as Href;
}
