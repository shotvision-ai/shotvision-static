/**
 * Dev-only logging — prevents auth/API noise and PII leakage in production builds.
 */

function isDevLoggingEnabled(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

export const devLog = {
  error(tag: string, ...args: unknown[]): void {
    if (isDevLoggingEnabled()) {
      console.error(tag, ...args);
    }
  },
  warn(tag: string, ...args: unknown[]): void {
    if (isDevLoggingEnabled()) {
      console.warn(tag, ...args);
    }
  },
  info(tag: string, ...args: unknown[]): void {
    if (isDevLoggingEnabled()) {
      console.log(tag, ...args);
    }
  },
};
