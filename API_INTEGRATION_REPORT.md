# Shot Vision — API Integration Report

> Final pass against `API_CONTRACTS.md` (2026-05-24). This document is the frontend integration audit and screen→API mapping.

---

## 1. Screen → API mapping

| Screen / flow | Required API(s) | Status |
|---------------|-----------------|--------|
| Login (Google) | Firebase ID token → `POST /api/auth/login` | ✅ Integrated |
| Login (mobile OTP) | Firebase OTP → `POST /api/auth/login` | ✅ Integrated |
| Login (email) | Firebase email link only | ⚠️ Not a backend OTP; users complete Firebase link |
| Session restore | SecureStore + `GET /api/users/me` | ✅ Integrated |
| Token refresh | `POST /api/auth/refresh` | ✅ Auto-retry in `apiClient` on 401 |
| Logout | `POST /api/auth/logout` + local clear | ✅ Integrated |
| Dashboard (my matches) | `GET /api/matches/my` + pagination | ✅ Integrated |
| Explore | `GET /api/matches/explore` + pagination | ✅ Integrated (status filter client-side) |
| Match detail | `GET /api/matches/{id}` | ✅ Integrated |
| Match share | `GET /api/matches/{id}/share` | ✅ Integrated (detail header) |
| Create match | `POST /api/matches` | ✅ Integrated |
| Complete match (create/edit) | `PATCH` sets + `POST /api/matches/{id}/finish` | ✅ Integrated |
| Edit match | `GET` + `PATCH /api/matches/{id}` | ✅ Integrated |
| Delete match | `DELETE /api/matches/{id}` | ✅ Integrated |
| Like / unlike | `POST` / `DELETE …/like` | ✅ Integrated |
| Profile | `GET /api/users/me` | ✅ Integrated |
| Profile stats | `GET /api/users/me/stats` | ✅ Integrated |
| Edit profile | `PATCH /api/users/me` | ✅ Integrated |
| Profile image upload | `POST /api/uploads/profile-image` | ✅ Wired (backend may return **503**) |
| Settings theme | `PATCH /api/users/me/settings` (`darkMode`) | ✅ Integrated |
| Delete account | `DELETE /api/users/me` | ✅ Integrated |
| Notifications | `/api/notifications/*` | ❌ **Not in contract** — calls undocumented paths |
| Public share (web) | `GET /public/share/{matchId}` | ⚠️ Service added; no in-app route yet |
| FAQ / Help / Feedback | None | Static / mailto (no backend) |

---

## 2. Centralized API layer

| Component | Path | Notes |
|-----------|------|-------|
| Typed contracts | `src/services/api/contracts/index.ts` | DTOs from `API_CONTRACTS.md` |
| HTTP client | `src/services/api/apiClient.ts` | JWT, `X-Correlation-ID`, `X-E2E-ID`, refresh retry, multipart |
| Envelope parser | `src/services/api/parseApiResponse.ts` | `responseCode`, `statusCode`, `data`, `errors` |
| Errors | `src/services/api/apiErrors.ts`, `userFriendlyErrors.ts` | 401–503, network |
| Auth | `src/services/auth/authService.ts`, `tokenStorage.ts` | Google + Firebase + backend JWT |
| Matches | `src/services/api/matchService.ts` | CRUD, explore, likes, finish, share |
| Profile | `src/services/api/profileService.ts` | Profile, settings, stats, delete |
| Upload | `src/services/api/uploadService.ts` | Multipart field `file` |
| Public share | `src/services/api/publicShareService.ts` | Unauthenticated `/public/share/{id}` |
| Share helper | `src/utils/shareMatch.ts` | Uses contract share metadata |

**Base URL:** `EXPO_PUBLIC_API_BASE_URL` or `https://shot-vision-service.onrender.com` (`src/config/config.ts`). No hardcoded localhost in production code.

---

## 3. Contract mismatches & assumptions

| Issue | Detail | Frontend handling |
|-------|--------|-------------------|
| Notifications API | Endpoints used by app are **not** in `API_CONTRACTS.md` | Service retained; screen shows error/retry on 404 |
| Explore `status` query | Contract: only `page`, `size` | Client-side filter after fetch |
| `scheduledDate` on write | Not in contract | Removed from write payload; UI may still show `matchDate` for scheduled |
| Profile upload | Contract: **503** until storage enabled | User-friendly 503 in edit profile |
| `IN_PROGRESS` vs `LIVE` | Dashboard “Live” filter sends `LIVE` only | `IN_PROGRESS` matches appear under “All” |
| Profile share URL | `https://shotvision.app/profile/{id}` | Not defined in contract; client-side deep link |
| Winner on complete | Contract: `POST …/finish` calculates winner | Create/edit “Complete” uses PATCH + finish |

---

## 4. Unimplemented / unused contract APIs

**Defined in contract, limited UI use:**

- `GET /api/users/me/stats/monthly` — service can call; profile uses aggregate stats only
- `GET /public/share/{matchId}` — `publicShareService` ready; no dedicated Expo screen
- Actuator `/actuator/*` — ops only

**Frontend calls, backend not in contract:**

- `GET/PATCH/DELETE /api/notifications` and related paths

---

## 5. Remaining mock / placeholder areas

| Area | Notes |
|------|-------|
| Notifications | Real HTTP to undocumented API; fails until backend ships |
| Profile calendar | Decorative UI; no match-day API |
| FAQ / Help / Feedback | Static / mailto |
| Match report (explore) | Wired to `POST/DELETE /api/matches/{id}/report` + `GET /api/users/me/reports`; SecureStore cache when list APIs omit `reportedByMe` |
| Default avatars | Local preference when no `profileImage` URL |
| Profile share link | Ad-hoc URL (not from backend) |

---

## 6. Production risks

1. **Notifications 404** until backend documents endpoints.
2. **Upload 503** until storage is wired (handled in UI).
3. **Explore client filter** — `hasNext` / totals reflect unfiltered server page.
4. **JWT expiry** — refresh on 401 only; `expiresIn` not persisted for proactive refresh.
5. **Email login** — requires Firebase email link completion, not in-app OTP verify.
6. **SecureStore on web** — tokens use SecureStore; verify web preview auth behavior in your target.

---

## 7. Recommended UI test scenarios

1. Google sign-in → dashboard loads my matches.
2. Kill app → reopen → session restores via `GET /api/users/me`.
3. Revoke token server-side → refresh or forced logout.
4. Logout → `POST /api/auth/logout` → old JWT rejected.
5. Create live / scheduled match; complete match → finish endpoint sets winner.
6. Edit match within 48h of finish; delete match.
7. Explore pagination + pull-to-refresh; like/unlike counts from server.
8. Match detail share sheet uses `GET …/share` links.
9. Profile stats + retry on error.
10. Edit profile fields; upload photo (expect 503 if storage off).
11. Settings dark mode → `PATCH …/settings`.
12. Notifications with backend off → error state, not silent empty.

---

## 8. APIs in contract not used by frontend

- `GET /api/users/me/stats/monthly` (optional enhancement)
- `GET /public/share/{matchId}` (service only; no screen)
- Actuator health/info

---

## 9. Integrated screens (summary)

Login, OTP, splash redirect, dashboard, explore, profile, edit profile, settings, create match, edit match, match detail, notifications (undocumented API), static legal/support screens.

---

*Last updated: 2026-05-25 — final integration pass*
