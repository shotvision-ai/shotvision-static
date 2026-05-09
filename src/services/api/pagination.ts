/** Unified list envelope for match APIs (Spring `Page` maps here). */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  /** 1-based page index (first page = 1). */
  page: number;
  limit: number;
  totalPages: number;
  /** Prefer when API sends it (e.g. Spring `Page.hasNext`). */
  hasNext?: boolean;
}

/**
 * Normalizes Spring `Page` / other backends into `PaginatedResponse`.
 * Backend often sends `content` + `totalElements` + `number` (0-based) instead of `items` + `page`.
 */
export function normalizePaginatedResponse<T>(raw: unknown, fallbackLimit = 10): PaginatedResponse<T> {
  const empty: PaginatedResponse<T> = {
    items: [],
    total: 0,
    page: 1,
    limit: fallbackLimit,
    totalPages: 0,
  };

  if (raw == null) return empty;

  // Some backends nest the Spring `Page` once more under `data`.
  let payload: unknown = raw;
  if (typeof payload === "object" && payload !== null) {
    const r = payload as Record<string, unknown>;
    const nested = r.data;
    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      (Array.isArray((nested as Record<string, unknown>).content) ||
        Array.isArray((nested as Record<string, unknown>).items) ||
        typeof (nested as Record<string, unknown>).totalElements === "number")
    ) {
      payload = nested;
    }
  }

  if (Array.isArray(payload)) {
    const items = payload as T[];
    return {
      items,
      total: items.length,
      page: 1,
      limit: fallbackLimit,
      totalPages: 1,
    };
  }

  if (typeof payload !== "object") return empty;

  const r = payload as Record<string, unknown>;

  let items: T[] = [];
  if (Array.isArray(r.items)) items = r.items as T[];
  else if (Array.isArray(r.content)) items = r.content as T[];
  else if (Array.isArray(r.data)) items = r.data as T[];
  else if (Array.isArray(r.matches)) items = r.matches as T[];
  else if (Array.isArray(r.list)) items = r.list as T[];
  else if (Array.isArray(r.results)) items = r.results as T[];

  const total =
    typeof r.total === "number"
      ? r.total
      : typeof r.totalElements === "number"
        ? r.totalElements
        : typeof r.totalCount === "number"
          ? r.totalCount
          : items.length;

  const limit =
    typeof r.limit === "number"
      ? r.limit
      : typeof r.size === "number"
        ? r.size
        : typeof r.pageSize === "number"
          ? r.pageSize
          : fallbackLimit;

  // Spring `Page`: `number` is 0-based. Some APIs expose the same index as `page` (0 = first).
  let page = 1;
  if (typeof r.number === "number") {
    page = r.number + 1;
  } else if (typeof r.page === "number") {
    page = r.page + 1;
  }

  let totalPages = 0;
  if (typeof r.totalPages === "number") totalPages = r.totalPages;
  else if (limit > 0) totalPages = Math.ceil(total / limit);

  let hasNext: boolean | undefined;
  if (typeof r.hasNext === "boolean") hasNext = r.hasNext;
  else if (typeof r.last === "boolean") hasNext = !r.last;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNext,
  };
}
