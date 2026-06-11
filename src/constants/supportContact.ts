/** App support inbox (Settings → Get Help, FAQs, feedback, legal). */
export const SUPPORT_EMAIL = "rahulsai.apps@gmail.com";

export function supportMailto(params?: { subject?: string; body?: string }): string {
  const search = new URLSearchParams();
  if (params?.subject) search.set("subject", params.subject);
  if (params?.body) search.set("body", params.body);
  const query = search.toString();
  return `mailto:${SUPPORT_EMAIL}${query ? `?${query}` : ""}`;
}
