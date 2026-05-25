# API integration test results

**Run:** 2026-05-25T13:03:25.843Z
**Base URL:** https://shot-vision-service.onrender.com
**Authenticated:** yes
**Write tests:** yes

**Summary:** 21 passed · 0 failed · 1 skipped

| Status | Endpoint | Detail |
|--------|----------|--------|
| PASS | GET /actuator/health | healthy (436ms, attempt 1) |
| PASS | POST /api/auth/login (validation) | rejected as expected (400) |
| PASS | POST /api/auth/refresh (invalid token) | rejected (401) |
| PASS | GET /api/users/me (401 without token) | 401 without Bearer |
| PASS | GET /public/share/{id} (unknown match) | 404 for unknown id |
| PASS | GET /api/users/me | user id=? name=Test API User |
| PASS | PATCH /api/users/me | profile updated id=undefined |
| PASS | GET /api/users/me/stats | keys=totalMatches,wins,losses,winRate,streak,monthlyPerformance |
| PASS | PATCH /api/users/me/settings | darkMode toggle OK |
| PASS | GET /api/matches/my | page items=5 keys=items,page,size,totalElements,hasNext |
| PASS | GET /api/matches/explore | page items=5 keys=items,page,size,totalElements,hasNext |
| PASS | POST /api/matches (create) | created e8b3f553-eabe-4f9c-a232-a8c2b6ce737e |
| PASS | GET /api/matches/{id} | keys=matchId,player1Name,player2Name,location,status,matchDate,isPublic,winner |
| PASS | GET /api/matches/{id}/share | keys=title,subtitle,winner,sets,appLink,webLink |
| PASS | POST /api/matches/{id}/like | keys=matchId,likesCount,likedByMe |
| PASS | DELETE /api/matches/{id}/like | keys=matchId,likesCount,likedByMe |
| PASS | PATCH /api/matches/{id} | patched notes |
| PASS | POST /api/matches/{id}/finish | keys=winner,p1SetsWon,p2SetsWon,status |
| PASS | DELETE /api/matches/{id} | deleted test match |
| PASS | GET /api/notifications | HTTP 500 — notifications not production-ready (UI gated off) |
| PASS | POST /api/uploads/profile-image | 503 — storage not enabled (expected) |
| SKIP | POST /api/auth/logout | Set SHOTVISION_REFRESH_TOKEN to test logout |

## Re-run with full coverage

```bash
# After signing in via the app, copy JWT from logs or add to .env:
export SHOTVISION_ACCESS_TOKEN="<accessToken>"
export SHOTVISION_REFRESH_TOKEN="<refreshToken>"
export SHOTVISION_RUN_WRITE_TESTS=1
node scripts/test-integrated-apis.mjs
```
