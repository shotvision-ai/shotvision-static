# Explore feed — status filtering architecture

> **Status:** Client-side filter on `GET /api/matches/explore` (MVP).  
> **Contract:** Explore supports only `page` and `size` — no `status` query param (`API_CONTRACTS.md` §7).

---

## Current flow

```
Explore UI (SegmentedControl)
    → useMatches({ type: "explore", status })
    → matchService.getExploreMatches(page, size, status)
    → GET /api/matches/explore?page=&size=   (no status)
    → normalizeMatchList(items)
    → filterMatchesByStatus(items, status)   ← client only
    → FlatList + server hasNext for pagination
```

**Dashboard (`/api/matches/my`)** sends `status` to the server — behavior is consistent there.

---

## MVP verdict: acceptable temporarily

| Factor | Assessment |
|--------|------------|
| Expected public match volume (early product) | Low hundreds, not millions |
| Page size | 10 (default), max 50 per contract |
| Filter tabs | 4 (all / live / finished / scheduled) |
| Engineering cost of backend change | Small but requires deploy + contract update |

**Recommendation:** Keep client-side filtering for MVP. Plan server-side `status` on explore when any trigger below is hit.

---

## Tradeoff analysis

| | Client-side (current) | Server-side `status` param |
|--|----------------------|----------------------------|
| **Correct pagination** | Weak — `hasNext` / `totalElements` are for unfiltered feed | Strong — metadata matches visible rows |
| **UX** | Empty tabs while more pages exist; “load more” confusing | Predictable empty states and counts |
| **API cost** | Fetches full pages; may scan many rows to fill a filter | Fetches only matching rows |
| **Implementation** | Already shipped | Mirror `GET /api/matches/my` |
| **Contract risk** | None | Requires doc + backend alignment |
| **IN_PROGRESS vs LIVE** | Both map to UI `live` client-side; server would need clear enum rules |

---

## Pagination inconsistencies (quantified)

Assume page `size=10`, true distribution 70% FINISHED / 20% LIVE / 10% SCHEDULED.

| Scenario | What user sees | Server says |
|----------|----------------|-------------|
| Filter **Live**, page 0 | ~2 items | `hasNext: true`, `totalElements: 150` |
| User taps load more | +0–3 live from page 1 | Still `hasNext: true` |
| Filter **Live**, exhausted 15 pages | Maybe 30 live total | `hasNext: false` after 15 requests |
| Filter **All** | 10 items / page | Consistent |

**Implications:**

- `totalElements` and `hasNext` **do not** reflect filtered count.
- Infinite scroll can run many requests for sparse filters.
- **Not a data corruption bug** — only presentation and efficiency.

---

## UX risks

1. **False empty state** — “No live matches” while page 0 had 0 live but page 1+ has live (mitigated in UI: offer “Load more” when `hasMore && filter !== all`).
2. **Over-stated progress** — Footer spinner implies more *filtered* items; may load unrelated rows.
3. **IN_PROGRESS** — Mapped to UI `live` client-side; explore cannot request `IN_PROGRESS` only from API today.
4. **Filter change** — Resets to page 1 (correct via `useEffect` on `fetchMatches`).

---

## API / data costs (MVP scale)

Per filter interaction (worst case user loads 5 pages):

- ~5 × 10 = 50 match rows transferred per filter session.
- Negligible on mobile for MVP; matters at 10k+ public matches or heavy filter use.

---

## Scalability implications

| Scale | Client-side impact |
|-------|-------------------|
| &lt; 500 public matches | Fine |
| 500–5k | Noticeable extra bandwidth; sparse filters feel “broken” |
| 5k+ | Should migrate to server `status`; consider cursor pagination |

---

## Recommended timing for backend migration

Introduce server-side explore `status` when **any** of:

1. `totalElements` (public matches) **> 500** in production metrics  
2. Support tickets about empty Live/Scheduled explore  
3. Second consumer of explore (web SEO feed, widgets)  
4. Before marketing push / featured explore campaigns  

**Not blocking** for closed beta or first Play Store MVP if public volume is low.

---

## Minimal backend contract change (when ready)

Add optional query param to `GET /api/matches/explore` (backward compatible):

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | enum | No | Same as `/api/matches/my`: `SCHEDULED` \| `LIVE` \| `IN_PROGRESS` \| `FINISHED` |

**Behavior:**

- Omitted → current behavior (all public matches).  
- Present → filter in DB before pagination; `totalElements` / `hasNext` apply to filtered set.

**Frontend migration:** Pass `status` from `toApiStatusFilter()` in `getExploreMatches`; remove `filterMatchesByStatus` for explore only.

---

## Frontend safeguards (MVP)

- Documented in this file and `matchService.getExploreMatches` JSDoc.  
- Explore empty state: if filtered tab is empty but `hasMore`, show **Load more** (server may have matches on next pages).  
- Do not show server `totalElements` in explore UI until server filtering exists.

---

*Last updated: explore architecture review*
