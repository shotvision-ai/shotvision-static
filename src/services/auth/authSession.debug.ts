/** Dev-only auth session traces — never logs token values. */

export function logAuthSession(event: string, detail: string): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log(`[authSession] ${event} ${detail}`);
  }
}
