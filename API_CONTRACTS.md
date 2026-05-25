# ShotVision Service — API Contracts

> **Reference document for backend and UI developers.**
> This file is auto-excluded from version control (see `.gitignore`). Keep it up to date as
> endpoints, DTOs, or validation rules change. It is the single source of truth for
> request/response shapes, field constraints, and error codes used by both the mobile/web
> clients and the backend service.

---

## Table of Contents

1. [Base URL & Environments](#1-base-url--environments)
2. [Global Response Envelope](#2-global-response-envelope)
3. [Authentication](#3-authentication)
4. [Error Handling](#4-error-handling)
5. [Auth Endpoints](#5-auth-endpoints)
6. [User Endpoints](#6-user-endpoints)
7. [Match Endpoints](#7-match-endpoints)
8. [Public Endpoints (No Auth)](#8-public-endpoints-no-auth)
9. [Upload Endpoints](#9-upload-endpoints)
10. [Shared Types & Enums](#10-shared-types--enums)
11. [Pagination](#11-pagination)
12. [Monitoring Endpoints (Ops)](#12-monitoring-endpoints-ops)

---

## 1. Base URL & Environments

| Environment | Base URL |
|-------------|----------|
| Local dev   | `http://localhost:9090` |
| Production  | `https://<your-prod-domain>` (PORT env var, default 8080) |

All API routes are prefixed with `/api`. Public (unauthenticated) routes live under `/public`.

---

## 2. Global Response Envelope

**Every** endpoint returns this JSON wrapper regardless of success or failure:

```json
{
  "responseInfo": {
    "timestamp": "2024-06-01T10:00:00Z",   // ISO-8601 with offset
    "responseCode": "00",                   // "00" = success · "01" = failure
    "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "e2eId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  },
  "body": {
    "statusCode": "200",                    // Maps to HTTP status (string)
    "statusMessage": "Human readable msg",
    "data": { ... },                        // Payload on success; null on error
    "errors": null,                         // null on success; array on failure (see §4)
    "meta": null                            // Optional metadata (e.g., pagination)
  }
}
```

| `responseInfo` field | Type | Notes |
|---------------------|------|-------|
| `timestamp` | ISO-8601 datetime | Server time when the response was built |
| `responseCode` | string | `"00"` = success · `"01"` = failure |
| `correlationId` | string \| null | Echo of `X-Correlation-ID` (generated if absent); also returned as response header |
| `e2eId` | string \| null | Echo of `X-E2E-ID` (generated if absent); also returned as response header |

> **UI note:** Always check `responseInfo.responseCode` first (`"00"` = OK).  
> Then read `body.data` on success or `body.errors[]` on failure.  
> The HTTP status code mirrors `body.statusCode`.  
> Clients may ignore `correlationId` / `e2eId` if not needed for support/debug flows.

---

## 3. Authentication

### Overview

The service uses a **two-token** scheme on top of Firebase:

1. **Firebase token** — issued by Firebase after the user signs in on the client. Used only at `POST /api/auth/login`.
2. **Access token (JWT)** — short-lived token issued by this service. Required for all protected endpoints.
3. **Refresh token** — long-lived opaque token. Use `POST /api/auth/refresh` to get a new access token.

### Sending the Access Token

Include the access token in every protected request:

```
Authorization: Bearer <accessToken>
```

### Token Expiry

- `expiresIn` (in the login/refresh response) is the access token lifetime in **seconds** (currently **3600** = 1 hour).
- When a 401 is returned with `statusCode: "401"`, the client should call `POST /api/auth/refresh` and retry.
- After `POST /api/auth/logout`, the refresh token is invalidated and the user's `token_version` is incremented — **all outstanding access JWTs are rejected** on the next request.

### Tracking Headers

The service accepts and propagates two optional correlation headers for end-to-end tracing:

| Header | Description |
|--------|-------------|
| `X-Correlation-ID` | Request-level trace ID (auto-generated if absent) |
| `X-E2E-ID` | End-to-end scenario ID (auto-generated if absent) |

> **UI note:** Include these in requests to make server-side log correlation possible. The same values are echoed in every `responseInfo` and in response headers `X-Correlation-ID` / `X-E2E-ID`.

### Rate Limiting (Auth)

`POST /api/auth/login` and `POST /api/auth/refresh` are rate-limited per client IP. When exceeded, the service returns **429** with a generic error envelope.

### Public Endpoints (No Auth Required)

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET  /public/**`
- `GET  /actuator/health` (and `/actuator/health/liveness`, `/actuator/health/readiness`)
- `GET  /actuator/info` (build metadata only; no secrets)

---

## 4. Error Handling

On failure, `body.data` is `null` and `body.errors` is an array of error items:

```json
{
  "responseInfo": {
    "timestamp": "...",
    "responseCode": "01",
    "correlationId": "...",
    "e2eId": "..."
  },
  "body": {
    "statusCode": "400",
    "statusMessage": "Validation failed",
    "data": null,
    "errors": [
      { "code": "VALIDATION_ERROR", "message": "firebaseToken is required" }
    ],
    "meta": null
  }
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| `200`  | OK |
| `201`  | Created (e.g., new match) |
| `400`  | Bad request / validation failure |
| `401`  | Unauthorised — missing or invalid/expired token |
| `403`  | Forbidden — authenticated but not allowed |
| `404`  | Resource not found |
| `409`  | Conflict (e.g., duplicate) |
| `429`  | Too many requests (auth rate limit) |
| `500`  | Internal server error |
| `503`  | Service unavailable (e.g., upload not wired) |

---

## 5. Auth Endpoints

### POST `/api/auth/login`

Exchange a Firebase ID token for service-issued JWT tokens.

**Auth:** None (public)

#### Request Body

```json
{
  "firebaseToken": "eyJhbGciO..."   // required, non-blank
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `firebaseToken` | string | ✅ | Firebase ID token from client-side auth |

#### Response `body.data`

```json
{
  "accessToken":  "eyJhbGciO...",
  "refreshToken": "dGhpcyBpcyBh...",
  "expiresIn":    3600,
  "user": {
    "userId":       "550e8400-e29b-41d4-a716-446655440000",
    "name":         "Rafael Nadal",
    "email":        "rafa@example.com",
    "profileImage": "https://cdn.example.com/avatars/rafa.jpg"
  }
}
```

| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | string | JWT; send in `Authorization: Bearer` header |
| `refreshToken` | string | Opaque; store securely |
| `expiresIn` | long | Access token TTL in seconds |
| `user` | `AuthUserResponse` | See §10 |

---

### POST `/api/auth/refresh`

Exchange a refresh token for a new access token.

**Auth:** None (public)

#### Request Body

```json
{
  "refreshToken": "dGhpcyBpcyBh..."   // required, non-blank
}
```

#### Response `body.data`

```json
{
  "accessToken":  "eyJhbGciO...",
  "refreshToken": "bmV3UmVmcmVzaA...",
  "expiresIn":    3600
}
```

| Field | Type | Notes |
|-------|------|-------|
| `accessToken` | string | New JWT |
| `refreshToken` | string | New refresh token (old one is invalidated) |
| `expiresIn` | long | TTL in seconds |

---

### POST `/api/auth/logout`

Invalidate the refresh token and bump the user's JWT `token_version`, so **all existing access tokens stop working immediately**. Clients must discard stored access and refresh tokens.

**Auth:** Required (`Authorization: Bearer <accessToken>`)

#### Request Body

```json
{
  "refreshToken": "dGhpcyBpcyBh..."   // required, non-blank
}
```

#### Response

`body.data` is `null`. `body.statusMessage`: `"Logout successful"`.

---

## 6. User Endpoints

All user endpoints require `Authorization: Bearer <accessToken>`.

---

### GET `/api/users/me`

Fetch the current user's profile.

#### Response `body.data`

```json
{
  "userId":       "550e8400-e29b-41d4-a716-446655440000",
  "name":         "Rafael Nadal",
  "email":        "rafa@example.com",
  "profileImage": "https://cdn.example.com/avatars/rafa.jpg",
  "bio":          "Tennis lover",
  "location":     "Mallorca, Spain",
  "createdAt":    "2024-01-15T08:00:00Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `userId` | UUID | Stable internal ID |
| `name` | string \| null | Display name |
| `email` | string | From Firebase |
| `profileImage` | string \| null | URL |
| `bio` | string \| null | Up to 300 chars |
| `location` | string \| null | Up to 100 chars |
| `createdAt` | ISO-8601 datetime | Account creation timestamp |

---

### PATCH `/api/users/me`

Partial-update the current user's profile. All fields are optional; omitted fields are **not** changed.

#### Request Body

```json
{
  "name":     "Rafael Nadal",
  "bio":      "Tennis lover",
  "location": "Mallorca, Spain"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | ❌ | 1–50 chars (cannot be empty string if sent) |
| `bio` | string | ❌ | Max 300 chars |
| `location` | string | ❌ | Max 100 chars |

> **Note:** `profileImage` is **not** accepted on this endpoint. Set the avatar URL via `POST /api/uploads/profile-image` when storage is enabled (see §9).

#### Response `body.data`

Same shape as `GET /api/users/me` (`UserProfileResponse`).

---

### PATCH `/api/users/me/settings`

Toggle user preferences. All fields are optional; omitted or `null` fields are left unchanged.

#### Request Body

```json
{
  "notificationsEnabled": true,
  "darkMode": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `notificationsEnabled` | boolean \| null | ❌ | Master notification toggle |
| `darkMode` | boolean \| null | ❌ | UI theme preference |

#### Response

`body.data` is `null`. `body.statusMessage`: `"Settings updated successfully"`.

---

### DELETE `/api/users/me`

Soft-delete the current user's account. The account is marked as deleted but data is retained for a grace period.

#### Response

`body.data` is `null`. `body.statusMessage`: `"User deleted successfully"`.

---

### GET `/api/users/me/stats`

Retrieve the current user's overall match statistics.

#### Response `body.data`

```json
{
  "totalMatches": 42,
  "wins":         28,
  "losses":       14,
  "winRate":      0.6667,
  "streak":       5,
  "monthlyPerformance": [
    {
      "month":        "2024-06",
      "totalMatches": 8,
      "wins":         6,
      "losses":       2,
      "winRate":      0.75
    }
  ]
}
```

| Field | Type | Notes |
|-------|------|-------|
| `totalMatches` | long | All-time count |
| `wins` | long | |
| `losses` | long | |
| `winRate` | double | 0.0–1.0 |
| `streak` | int | Current win/loss streak (positive = win streak) |
| `monthlyPerformance` | `MonthlyPerformancePoint[]` | Recent months |

**`MonthlyPerformancePoint`**

| Field | Type | Notes |
|-------|------|-------|
| `month` | string | Format `YYYY-MM` |
| `totalMatches` | long | |
| `wins` | long | |
| `losses` | long | |
| `winRate` | double | 0.0–1.0 |

---

### GET `/api/users/me/stats/monthly`

Retrieve the current user's month-by-month breakdown.

#### Response `body.data`

```json
{
  "monthlyPerformance": [
    {
      "month":        "2024-06",
      "totalMatches": 8,
      "wins":         6,
      "losses":       2,
      "winRate":      0.75
    }
  ]
}
```

---

## 7. Match Endpoints

All match endpoints require `Authorization: Bearer <accessToken>`.

---

### POST `/api/matches`

Create a new match. Returns `HTTP 201`.

#### Request Body

```json
{
  "player1Name": "Rafael Nadal",
  "player2Name": "Novak Djokovic",
  "status":      "SCHEDULED",
  "matchDate":   "2024-06-01T15:00:00Z",
  "location":    "Roland Garros, Paris",
  "notes":       "Final match",
  "isPublic":    true,
  "sets": [
    { "setNumber": 1, "p1Score": 6, "p2Score": 4 },
    { "setNumber": 2, "p1Score": 7, "p2Score": 5 }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `player1Name` | string | ✅ | Non-blank, max 50 chars |
| `player2Name` | string | ✅ | Non-blank, max 50 chars |
| `status` | string (enum) | ✅ | `SCHEDULED` \| `LIVE` \| `IN_PROGRESS` \| `FINISHED` |
| `matchDate` | ISO-8601 datetime | ✅ | |
| `location` | string | ❌ | Max 100 chars |
| `notes` | string | ❌ | Max 500 chars |
| `isPublic` | boolean | ❌ | Default `false` if omitted |
| `sets` | `MatchSetRequest[]` | ❌ | See below |

**`MatchSetRequest`**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `setNumber` | integer | ✅ | ≥ 1 |
| `p1Score` | integer | ✅ | ≥ 0 |
| `p2Score` | integer | ✅ | ≥ 0 |

#### Response `body.data` — `MatchDetailsResponse`

See [`MatchDetailsResponse`](#matchdetailsresponse) in §10.

---

### PATCH `/api/matches/{matchId}`

Partially update a match. All fields are optional; omitted or `null` fields are not changed.

**Path param:** `matchId` — UUID

#### Request Body

```json
{
  "status":   "IN_PROGRESS",
  "location": "New venue",
  "notes":    "Updated notes",
  "isPublic": false,
  "sets": [
    { "setNumber": 1, "p1Score": 6, "p2Score": 3 }
  ]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `status` | string (enum) | ❌ | `SCHEDULED` \| `LIVE` \| `IN_PROGRESS` \| `FINISHED` |
| `location` | string | ❌ | Max 100 chars |
| `notes` | string | ❌ | Max 500 chars |
| `isPublic` | boolean | ❌ | |
| `sets` | `MatchSetRequest[]` | ❌ | Replaces entire sets list when provided |

#### Response `body.data`

`MatchDetailsResponse` (see §10).

---

### DELETE `/api/matches/{matchId}`

Soft-delete a match. The match is hidden from queries but data is retained. Owner-only; any status (`SCHEDULED`, `LIVE`, `FINISHED`) can be deleted.

**Path param:** `matchId` — UUID

#### Response

`body.data` is `null`. `body.statusMessage`: `"Match deleted successfully"`.

---

### POST `/api/matches/{matchId}/finish`

Mark a match as finished and calculate the winner from current set scores.

**Path param:** `matchId` — UUID

#### Response `body.data`

```json
{
  "winner":    "PLAYER_1",
  "p1SetsWon": 3,
  "p2SetsWon": 1,
  "status":    "FINISHED"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `winner` | string | `"PLAYER_1"` \| `"PLAYER_2"` \| `null` if draw |
| `p1SetsWon` | int | |
| `p2SetsWon` | int | |
| `status` | string | Will be `"FINISHED"` |

---

### GET `/api/matches/explore`

Paginated feed of all public matches (across all users).

**Query params:**

| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `page` | int | ❌ | `0` | ≥ 0 |
| `size` | int | ❌ | `10` | 1–50 |

#### Response `body.data` — `PaginatedResponse<ExploreMatchItem>`

```json
{
  "items": [
    {
      "matchId":     "550e8400-...",
      "player1Name": "Rafael Nadal",
      "player2Name": "Novak Djokovic",
      "status":      "FINISHED",
      "winner":      "PLAYER_1",
      "p1SetsWon":   3,
      "p2SetsWon":   1,
      "createdAt":   "2024-06-01T15:00:00Z",
      "likesCount":  42
    }
  ],
  "page":          0,
  "size":          10,
  "totalElements": 150,
  "hasNext":       true
}
```

---

### GET `/api/matches/my`

Paginated list of the current user's own matches.

**Query params:**

| Param | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `page` | int | ❌ | `0` | ≥ 0 |
| `size` | int | ❌ | `20` | 1–50 |
| `status` | string (enum) | ❌ | all | `SCHEDULED` \| `LIVE` \| `IN_PROGRESS` \| `FINISHED` |

#### Response `body.data` — `PaginatedResponse<MatchDashboardItem>`

```json
{
  "items": [
    {
      "matchId":     "550e8400-...",
      "player1Name": "Rafael Nadal",
      "player2Name": "Novak Djokovic",
      "status":      "FINISHED",
      "matchDate":   "2024-06-01T15:00:00Z",
      "isPublic":    true,
      "winner":      "PLAYER_1",
      "p1SetsWon":   3,
      "p2SetsWon":   1,
      "createdAt":   "2024-06-01T12:00:00Z"
    }
  ],
  "page":          0,
  "size":          20,
  "totalElements": 7,
  "hasNext":       false
}
```

---

### POST `/api/matches/{matchId}/like`

Like a match.

**Path param:** `matchId` — UUID

#### Response `body.data`

```json
{
  "matchId":   "550e8400-...",
  "likesCount": 43,
  "likedByMe":  true
}
```

---

### DELETE `/api/matches/{matchId}/like`

Unlike a match.

**Path param:** `matchId` — UUID

#### Response `body.data`

```json
{
  "matchId":    "550e8400-...",
  "likesCount": 42,
  "likedByMe":  false
}
```

---

### GET `/api/matches/{matchId}/share`

Get shareable metadata for a match (deep-link and web-link generation).

**Path param:** `matchId` — UUID

**Access:** Match owner **or** any authenticated user if the match is public (`isPublic: true`). Returns **404** if the match does not exist, is soft-deleted, or is private and the caller is not the owner (anti-enumeration).

#### Response `body.data`

```json
{
  "title":    "Nadal vs Djokovic",
  "subtitle": "Match Finished",
  "winner":   "PLAYER_1",
  "sets":     ["Set 1: 6-4 (Rafael Nadal)", "Set 2: 7-5 (Rafael Nadal)"],
  "appLink":  "shotvision://match/550e8400-...",
  "webLink":  "https://shotvision.app/share/550e8400-..."
}
```

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | `"<player1Name> vs <player2Name>"` |
| `subtitle` | string | `"Match Finished"` or `"Match In Progress"` |
| `winner` | string \| null | `"PLAYER_1"` / `"PLAYER_2"` — raw stored value |
| `sets` | string[] | Format: `"Set <n>: <p1Score>-<p2Score> (<winnerName>)"` or `"Tied"` on draw |
| `appLink` | string | Deep-link URI |
| `webLink` | string | Web URL |

---

### GET `/api/matches/{matchId}`

Get full match details including shots.

**Path param:** `matchId` — UUID

**Access:** Same rules as [GET `/api/matches/{matchId}/share`](#get-apimatchesmatchidshare) — owner or public match; **404** otherwise (including soft-deleted).

#### Response `body.data`

`MatchDetailsResponse` (see §10).

---

## 8. Public Endpoints (No Auth)

### GET `/public/share/{matchId}`

Publicly accessible match view used for web share links. No authentication required.

**Path param:** `matchId` — UUID

#### Response `body.data`

```json
{
  "matchId":      "550e8400-...",
  "player1Name":  "Rafael Nadal",
  "player2Name":  "Novak Djokovic",
  "status":       "FINISHED",
  "winner":       "PLAYER_1",
  "matchDate":    "2024-06-01T15:00:00Z",
  "isPublic":     true,
  "createdAt":    "2024-06-01T12:00:00Z",
  "finishedAt":   "2024-06-01T17:30:00Z",
  "notes":        "Incredible final set",
  "shareTitle":   "Nadal vs Djokovic",
  "shareSubtitle":"Roland Garros · Jun 2024",
  "sets": [
    { "setNumber": 1, "p1Score": 6, "p2Score": 4, "setWinner": "PLAYER_1" }
  ]
}
```

> **Note:** This endpoint returns 404 if the match is private (`isPublic: false`) or deleted.

---

## 9. Upload Endpoints

All upload endpoints require `Authorization: Bearer <accessToken>`.

---

### POST `/api/uploads/profile-image`

Upload a profile image.

**Content-Type:** `multipart/form-data`

#### Request

| Form field | Type | Required | Constraints |
|------------|------|----------|-------------|
| `file` | binary (image) | ✅ | JPEG or PNG only; max 5 MB |

#### Response `body.data`

```json
{
  "url":      "https://cdn.shotvision.app/profiles/abc123.jpg",
  "publicId": "profiles/abc123"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `url` | string | CDN-ready public URL; store this in the user profile |
| `publicId` | string | Storage reference ID |

> **Current behaviour:** Storage is not wired yet — this endpoint returns **503 Service Unavailable** with `Retry-After: 3600` and a generic error message. When enabled, the URL will be persisted on the user's profile automatically (no `PATCH /api/users/me` needed).

#### 503 response (current)

`body.statusCode`: `"503"`. `body.data`: `null`. `errors[].code`: `INTERNAL_SERVER_ERROR`.

---

## 10. Shared Types & Enums

### `MatchDetailsResponse`

Returned by `POST /api/matches`, `PATCH /api/matches/{id}`, and `GET /api/matches/{id}`.

```json
{
  "matchId":     "550e8400-...",
  "player1Name": "Rafael Nadal",
  "player2Name": "Novak Djokovic",
  "location":    "Roland Garros, Paris",
  "status":      "FINISHED",
  "matchDate":   "2024-06-01T15:00:00Z",
  "isPublic":    true,
  "winner":      "PLAYER_1",
  "p1SetsWon":   3,
  "p2SetsWon":   1,
  "createdAt":   "2024-06-01T12:00:00Z",
  "finishedAt":  "2024-06-01T17:30:00Z",
  "sets": [
    { "setNumber": 1, "p1Score": 6, "p2Score": 4, "setWinner": "PLAYER_1" },
    { "setNumber": 2, "p1Score": 7, "p2Score": 5, "setWinner": "PLAYER_1" }
  ],
  "shots": [
    { "playerSide": "PLAYER_1", "shotType": "FOREHAND", "isWinner": true, "isError": false }
  ],
  "notes":       "Incredible final set",
  "likesCount":  42,
  "likedByMe":   true
}
```

| Field | Type | Notes |
|-------|------|-------|
| `matchId` | UUID | |
| `player1Name` | string | |
| `player2Name` | string | |
| `location` | string \| null | |
| `status` | string (enum) | See `MatchStatus` |
| `matchDate` | ISO-8601 | |
| `isPublic` | boolean | |
| `winner` | string \| null | `"PLAYER_1"` / `"PLAYER_2"` / `null` |
| `p1SetsWon` | int | |
| `p2SetsWon` | int | |
| `createdAt` | ISO-8601 | |
| `finishedAt` | ISO-8601 \| null | Set when status = `FINISHED` |
| `sets` | `MatchSetResponse[]` | |
| `shots` | `ShotDetail[]` | May be empty |
| `notes` | string \| null | |
| `likesCount` | long | |
| `likedByMe` | boolean | Whether the requesting user has liked this match |

### `MatchSetResponse`

| Field | Type | Notes |
|-------|------|-------|
| `setNumber` | int | 1-indexed |
| `p1Score` | int | |
| `p2Score` | int | |
| `setWinner` | string \| null | `"PLAYER_1"` / `"PLAYER_2"` / `null` |

### `ShotDetail`

| Field | Type | Notes |
|-------|------|-------|
| `playerSide` | string | `"PLAYER_1"` / `"PLAYER_2"` |
| `shotType` | string | e.g. `"FOREHAND"`, `"BACKHAND"`, `"SERVE"` |
| `isWinner` | boolean | Shot resulted in a point won |
| `isError` | boolean | Shot was an unforced error |

### `AuthUserResponse`

| Field | Type | Notes |
|-------|------|-------|
| `userId` | UUID | Internal stable ID |
| `name` | string \| null | |
| `email` | string | |
| `profileImage` | string \| null | URL |

### `MatchStatus` Enum

| Value | Description |
|-------|-------------|
| `SCHEDULED` | Match is planned but not yet started |
| `LIVE` | Match is in progress (real-time) |
| `IN_PROGRESS` | Match is being entered/recorded |
| `FINISHED` | Match is complete, winner determined |

---

## 11. Pagination

List endpoints that support pagination return a `PaginatedResponse<T>` in `body.data`:

```json
{
  "items":         [ ... ],
  "page":          0,
  "size":          10,
  "totalElements": 150,
  "hasNext":       true
}
```

| Field | Type | Notes |
|-------|------|-------|
| `items` | T[] | Current page items |
| `page` | int | 0-indexed current page number |
| `size` | int | Requested page size |
| `totalElements` | long | Total matching records across all pages |
| `hasNext` | boolean | Whether a next page exists |

> **UI note:** To load the next page, increment `page` by 1 and repeat the request with the same `size`.

---

## 12. Monitoring Endpoints (Ops)

Spring Boot Actuator endpoints for health checks and deploy metadata. **Not** part of the mobile app API surface; no `ApiResponse` envelope.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /actuator/health` | None | Aggregate health (`UP` / `DOWN`) |
| `GET /actuator/health/liveness` | None | Kubernetes liveness probe |
| `GET /actuator/health/readiness` | None | Readiness (includes DB when configured) |
| `GET /actuator/info` | None | App name + git commit (`RENDER_GIT_COMMIT` / `GIT_COMMIT`) |

Example health response:

```json
{ "status": "UP", "groups": ["liveness", "readiness"] }
```

Example info response (when commit env is set):

```json
{ "app": { "name": "ShotVision", "version": "abc123def" } }
```

> Prometheus and other actuator endpoints are **not** exposed publicly in production. Metrics are exported via OTLP server-side only.

---

*Last updated: 2026-05-24*
