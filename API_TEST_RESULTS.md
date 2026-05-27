# API integration test results

**Run:** 2026-05-26T14:33:43.446Z
**Base URL:** https://shot-vision-service.onrender.com
**Authenticated:** no
**Write tests:** no

**Summary:** 5 passed · 0 failed · 17 skipped

| Status | Endpoint | Detail |
|--------|----------|--------|
| PASS | GET /actuator/health | healthy (51430ms, attempt 2) |
| PASS | POST /api/auth/login (validation) | rejected as expected (400) |
| PASS | POST /api/auth/refresh (invalid token) | rejected (401) |
| PASS | GET /api/users/me (401 without token) | 401 without Bearer |
| PASS | GET /public/share/{id} (unknown match) | 404 for unknown id |
| SKIP | GET /api/users/me | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | PATCH /api/users/me | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/users/me/stats | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | PATCH /api/users/me/settings | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/matches/my | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/matches/explore | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | POST /api/matches (create) | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/matches/{id} | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | PATCH /api/matches/{id} | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | POST /api/matches/{id}/like | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | DELETE /api/matches/{id}/like | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/matches/{id}/share | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | POST /api/matches/{id}/finish | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | DELETE /api/matches/{id} | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | GET /api/notifications | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | POST /api/uploads/profile-image | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |
| SKIP | POST /api/auth/logout | Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests |

## Re-run with full coverage

```bash
# After signing in via the app, copy JWT from logs or add to .env:
export SHOTVISION_ACCESS_TOKEN="<accessToken>"
export SHOTVISION_REFRESH_TOKEN="<refreshToken>"
export SHOTVISION_RUN_WRITE_TESTS=1
node scripts/test-integrated-apis.mjs
```
