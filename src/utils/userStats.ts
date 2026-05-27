import type {
  MonthlyPerformancePoint,
  UserStatsResponse,
} from "../services/api/contracts/user.types";

export type WinRateContext = {
  wins?: number;
  losses?: number;
  totalMatches?: number;
};

/**
 * Canonical win rate from decided outcomes (finished W/L only).
 * Returns a fraction in [0, 1], or 0 when there are no decided matches.
 */
export function deriveWinRateFraction(wins: number, losses: number): number {
  const w = Math.max(0, Math.floor(wins));
  const l = Math.max(0, Math.floor(losses));
  const decided = w + l;
  if (decided <= 0) return 0;
  return Math.min(1, Math.max(0, w / decided));
}

/**
 * Normalizes API `winRate` to a 0–1 fraction.
 * Contract: 0.0–1.0. Some backends send 0–100 (e.g. 42.86 for 42.86%) — handled here.
 */
export function normalizeWinRateFraction(
  raw: unknown,
  context: WinRateContext = {}
): number {
  const wins = Math.max(0, Math.floor(context.wins ?? 0));
  const losses = Math.max(0, Math.floor(context.losses ?? 0));
  const decided = wins + losses;

  if (decided > 0) {
    return deriveWinRateFraction(wins, losses);
  }

  if (raw === null || raw === undefined) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;

  if (n >= 0 && n <= 1) {
    return n;
  }

  if (n > 1 && n <= 100) {
    return n / 100;
  }

  if (n > 100) {
    if (decided > 0) {
      return deriveWinRateFraction(wins, losses);
    }
    return Math.min(1, Math.max(0, n / 10000));
  }

  return 0;
}

/** Display percent 0–100 (integer) from a 0–1 fraction. */
export function winRateFractionToPercent(fraction: number): number {
  if (!Number.isFinite(fraction)) return 0;
  return Math.round(Math.min(100, Math.max(0, fraction * 100)));
}

/** Format win rate for UI from raw API value and optional W/L context. */
export function formatWinRatePercent(raw: unknown, context: WinRateContext = {}): number {
  return winRateFractionToPercent(normalizeWinRateFraction(raw, context));
}

function normalizeMonthlyPoint(point: MonthlyPerformancePoint): MonthlyPerformancePoint {
  const wins = Math.max(0, Math.floor(point.wins ?? 0));
  const losses = Math.max(0, Math.floor(point.losses ?? 0));
  const totalMatches = Math.max(
    0,
    Math.floor(point.totalMatches ?? 0),
    wins + losses
  );

  return {
    month: String(point.month ?? ""),
    wins,
    losses,
    totalMatches,
    winRate: normalizeWinRateFraction(point.winRate, { wins, losses, totalMatches }),
  };
}

/**
 * Normalizes stats from GET `/api/users/me/stats` for consistent UI math.
 * `winRate` on the returned object is always a 0–1 fraction.
 */
export function normalizeUserStatsResponse(raw: UserStatsResponse): UserStatsResponse {
  const wins = Math.max(0, Math.floor(raw.wins ?? 0));
  const losses = Math.max(0, Math.floor(raw.losses ?? 0));
  const totalMatches = Math.max(0, Math.floor(raw.totalMatches ?? 0), wins + losses);
  const streak = Math.floor(raw.streak ?? 0);

  const monthlyPerformance = (raw.monthlyPerformance ?? []).map(normalizeMonthlyPoint);

  return {
    totalMatches,
    wins,
    losses,
    streak,
    winRate: normalizeWinRateFraction(raw.winRate, { wins, losses, totalMatches }),
    monthlyPerformance,
  };
}
