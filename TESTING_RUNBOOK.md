# Shot Vision — Testing Runbook

Manual QA guide for **real devices** before Play Store / App Store releases. Covers auth, network resilience, Render cold starts, and production-safe behavior added in the P0 hardening pass.

**App:** Shot Vision (`com.shotvision.app`) · **Version:** 4.0.0  
**Default API:** `https://shot-vision-service.onrender.com` (override via `EXPO_PUBLIC_API_BASE_URL`)

---

## Before you start

### Builds to use

| Build type | When to use |
|------------|-------------|
| **Release / internal testing** (EAS internal, Play internal track, TestFlight) | Play Store install tests, logging checks, cold start, token expiry |
| **Dev client** (`expo-dev-client`) | Fast iteration; not a substitute for store build QA |

### Prerequisites

- [ ] Physical **Android** device (Play Store or sideloaded release APK/AAB)
- [ ] Physical **iOS** device (TestFlight or release) if shipping iOS
- [ ] Test Google account allowed for Firebase / Google Sign-In
- [ ] Test phone number for OTP (or email for email-link flow)
- [ ] Ability to toggle **airplane mode** and **network throttling** (see [Slow internet](#slow-internet))
- [ ] Optional: second device or clock skew N/A — use real time for token tests

### Feature flags (current production defaults)

| Flag | Value | Effect |
|------|-------|--------|
| `NOTIFICATIONS_API_ENABLED` | `false` | No bell in tab headers; notifications screen = “coming soon”, **no API calls** |
| `PROFILE_IMAGE_UPLOAD_ENABLED` | `false` | No profile photo upload in edit profile |

### Timeouts (client)

| Call type | Timeout |
|-----------|---------|
| JSON API | **45 s** |
| Multipart upload | **60 s** |
| Auth refresh | **45 s** (same as JSON) |

### Expected user-facing errors (sanity)

| Condition | Typical message |
|-----------|-----------------|
| Offline / DNS failure | “We couldn't reach Shot Vision. Check your internet connection…” |
| Abort / timeout | “The server is taking too long to respond…” (mentions sleeping server on cold start) |
| Session expired | “Your session expired. Please sign in again.” |
| 5xx | “Shot Vision is having trouble right now…” |

### Recording results

For each test: **Pass / Fail / Blocked**, device model, OS version, build number (`versionCode` 4 / iOS build 4), network condition, notes.

---

## 1. Auth tests

### 1.1 Google Sign-In (happy path)

**Steps**

1. Fresh install or logout until login screen.
2. Tap **Continue with Google**, complete Google account picker.
3. Wait for redirect into app (tabs).

**Expected**

- [ ] Lands on **Explore** or main tabs without crash
- [ ] **Profile** shows name/avatar (or default avatar)
- [ ] **My Matches** / **Explore** load without immediate “session expired”
- [ ] No OTP params or JWT printed in **release** device logs

**Fail signals:** Stuck on login spinner > 45s with no error; crash after Google; generic “Something went wrong” with no retry path.

---

### 1.2 Google Sign-In (cancel / misconfiguration)

**Steps**

1. Tap Google sign-in, **cancel** at account picker.

**Expected**

- [ ] Returns to login screen, no crash
- [ ] Can retry Google sign-in

**If using wrong OAuth client (dev-only check):**

- [ ] Clear error about missing ID token / client ID (not a silent hang)

---

### 1.3 Phone OTP (happy path)

**Steps**

1. From login, enter valid **mobile** number, request OTP.
2. Enter 6-digit code on OTP screen.
3. Complete login.

**Expected**

- [ ] OTP screen does **not** log identifier/params in release logs
- [ ] Successful login → tabs
- [ ] Resend timer works; resend succeeds after cooldown

---

### 1.4 Phone OTP (invalid / expired code)

**Steps**

1. Request OTP, enter wrong code (e.g. `000000`).

**Expected**

- [ ] Inline or alert: invalid/expired code (not raw Firebase/API JSON)
- [ ] User can correct OTP or resend

---

### 1.5 Email link flow (if enabled in Firebase)

**Steps**

1. Start login with **email** method (if exposed in UI).
2. Complete sign-in via email link (may open browser / app link).

**Expected**

- [ ] App handles `email_sent` / link completion per product rules
- [ ] OTP screen not used for pure email-link path

---

### 1.6 Logout

**Steps**

1. While signed in: **Profile → Settings → Log out** (or equivalent).
2. Confirm logout.

**Expected**

- [ ] Returned to login screen
- [ ] Pull-to-refresh on tabs does not show old user data
- [ ] Re-login works without reinstall

---

### 1.7 Session restore (kill app)

**Steps**

1. Sign in successfully.
2. Force-quit app (swipe away).
3. Reopen app.

**Expected**

- [ ] Brief loading, then tabs with same user (no login screen)
- [ ] Profile and match lists load

**Fail signals:** Login screen every cold open; infinite bootstrap spinner.

---

### 1.8 Secure storage / reinstall

**Steps**

1. Sign in, force-quit, **uninstall**, reinstall from store/APK.
2. Open app.

**Expected**

- [ ] Login screen (no ghost session)
- [ ] Google / OTP login works on first attempt after reinstall

---

## 2. Network tests

### 2.1 Healthy Wi‑Fi / LTE

**Steps**

1. Sign in on stable network.
2. Open **Explore**, **My Matches**, open one **match detail**, pull to refresh.

**Expected**

- [ ] Lists populate; detail shows players, scores, status
- [ ] Like/unlike works on public match (if applicable)
- [ ] Share action completes or shows controlled error

---

### 2.2 Flaky network (toggle airplane mode mid-request)

**Steps**

1. On **Explore**, pull to refresh.
2. Immediately enable **airplane mode** for 3–5 s, then disable.

**Expected**

- [ ] Error state with friendly copy (not blank screen)
- [ ] **Try again** / pull-to-refresh recovers when online
- [ ] No crash

---

### 2.3 DNS / captive portal

**Steps**

1. Connect to Wi‑Fi with **login portal** or invalid DNS (hotel Wi‑Fi).
2. Open app, try to load matches.

**Expected**

- [ ] “Couldn't reach Shot Vision” style message (network failure), not infinite spinner past 45s

---

## 3. Cold start tests (API + app)

Render free tier can take **1–3+ minutes** to wake. Client timeout is **45 s**.

### 3.1 Backend asleep — first request after idle

**Steps**

1. Do **not** use the app for 30+ minutes (or use a fresh Render deploy).
2. Kill app, reopen on **LTE** (not cached Wi‑Fi only).
3. Sign in if needed, open **Explore** or **My Matches**.

**Expected**

- [ ] Loading indicator shows
- [ ] Within **~45 s**: either data loads **or** timeout message (not frozen forever)
- [ ] Pull to refresh or retry succeeds once backend is warm

**Record:** Time-to-first-success after wake (optional metric).

---

### 3.2 Backend warm — second request

**Steps**

1. Immediately after 3.1 succeeds, navigate **Explore → match detail → back**.

**Expected**

- [ ] Subsequent screens load in normal time (< few seconds on good network)

---

### 3.3 Cold start + auth refresh

**Steps**

1. With valid session stored, wake backend via 3.1.
2. Open app (restore session) and load **Profile**.

**Expected**

- [ ] Proactive refresh completes or times out gracefully
- [ ] No redirect to login unless refresh truly failed (401)

---

## 4. Play Store install tests

Use **internal testing track** or production staged rollout — not Metro web preview.

### 4.1 Fresh install from Play Store

**Steps**

1. Install **Shot Vision** from Play internal/production.
2. First launch: accept permissions if prompted.
3. Complete **Google** sign-in (primary Android path).

**Expected**

- [ ] App icon and splash match store listing
- [ ] `com.shotvision.app` opens from launcher
- [ ] No dev menu / Expo dev overlay in release build
- [ ] Login → tabs without “package not found” or Google `DEVELOPER_ERROR`

---

### 4.2 Upgrade install (existing user)

**Steps**

1. Install previous store version (if available), sign in, create or view a match.
2. Update to new version via Play (same signing key).

**Expected**

- [ ] Session restored OR clean login prompt (no corrupt state)
- [ ] Existing matches still visible after login
- [ ] No duplicate tabs or navigation loops

---

### 4.3 Play Store — deep links / back button

**Steps**

1. Open match from list, press Android **back**.
2. Open app from recents after back.

**Expected**

- [ ] Back returns to previous screen (not exit app unexpectedly)
- [ ] Resume shows same tab state

---

### 4.4 Signing & Google Services

**Verify once per release candidate**

- [ ] Release build signed with **upload key** expected by Play App Signing
- [ ] `google-services.json` SHA-1 for release keystore registered in Firebase
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / Android client IDs set for EAS production profile

---

## 5. Background / resume

### 5.1 Short background (< 2 min)

**Steps**

1. Sign in, open **match detail**.
2. Home button / app switcher — wait 30 s — return.

**Expected**

- [ ] Same screen or sensible refresh; no crash
- [ ] No “setState on unmounted” warnings in dev

---

### 5.2 Long background (15+ min)

**Steps**

1. Sign in, load **My Matches**.
2. Background app 15–30 min (screen off).
3. Foreground app, pull to refresh.

**Expected**

- [ ] If token near expiry: silent refresh or one retry, then data loads
- [ ] If refresh fails: redirect to login with clear message (not broken empty tabs)

---

### 5.3 Background during in-flight request

**Steps**

1. On slow network, open **Explore** (loading).
2. Immediately background app 10 s, then foreground.

**Expected**

- [ ] No crash; loading/error state consistent (stale response ignored)
- [ ] Retry works

---

### 5.4 Process death (Android “Don’t keep activities” optional)

**Steps**

1. Enable **Developer options → Don’t keep activities** (optional stress test).
2. Open match detail, leave, return via recents.

**Expected**

- [ ] App recovers via normal bootstrap (may re-fetch match)

---

## 6. Token expiration

Access token TTL defaults to **3600 s**; proactive refresh **5 minutes** before expiry.

### 6.1 Proactive refresh (normal session)

**Steps**

1. Sign in, use app normally for **> 50 minutes** with occasional navigation (or stay foreground).
2. Trigger API call: pull **Profile** or **My Matches**.

**Expected**

- [ ] No logout mid-session
- [ ] Data still loads (refresh happened in background)

**Dev-only:** `[authSession]` traces in Metro when `__DEV__`; never in release logs.

---

### 6.2 Forced expiry (revoke refresh token)

**Steps**

1. Sign in on device A.
2. From backend/admin or second client: **logout all sessions** / invalidate refresh token (if supported).
3. On device A: pull to refresh matches.

**Expected**

- [ ] User sent to **login** with session-expired style messaging
- [ ] No infinite 401 retry loop

---

### 6.3 Clock skew (sanity)

**Steps**

1. Device time correct (automatic network time).
2. Sign in and use app 10 min.

**Expected**

- [ ] No premature “session expired” solely due to client clock

---

### 6.4 401 on protected route (reactive refresh)

**Steps**

1. Sign in, use app until access token would be invalid without refresh (hard to manual-test; optional with dev backend shortening TTL).

**Expected**

- [ ] At most **one** automatic retry after refresh
- [ ] Second 401 → login, not spinner forever

---

## 7. Slow internet

### 7.1 Android Network Link Conditioner (developer)

**Steps**

1. **Settings → Developer options → Network** (or use Android Emulator extended controls).
2. Set **Edge / 3G** profile (~400 Kbps, high latency).
3. Sign in, load **Explore**, scroll, load more.

**Expected**

- [ ] Slow but eventual load OR 45s timeout with friendly message
- [ ] Filter tabs (Scheduled / Completed): fast switching does not show **wrong** list (stale request discarded)

---

### 7.2 iOS Network Link Conditioner (Mac + device)

**Steps**

1. Install Apple **Network Link Conditioner** profile on Mac, connect iOS device.
2. Profile: **3G** or **Very Bad Network**.
3. Repeat Explore / match detail flows.

**Expected**

- [ ] Same as 7.1

---

### 7.3 High latency only (backend already warm)

**Steps**

1. Warm backend first (successful request).
2. Throttle to high latency (not offline).
3. Open **match detail**, tap **like**.

**Expected**

- [ ] Optimistic UI updates; rollback + alert on failure
- [ ] No duplicate likes after recovery

---

## 8. Offline behavior

### 8.1 Launch offline (no session)

**Steps**

1. Airplane mode **on**, fresh launch (logged out).

**Expected**

- [ ] Login screen; Google/OTP fail with clear network message (not hang)

---

### 8.2 Launch offline (cached session)

**Steps**

1. Sign in online, force-quit.
2. Airplane mode **on**, open app.

**Expected**

- [ ] May show tabs from cached user state briefly
- [ ] Data refresh shows offline / couldn’t reach server (not raw `Network request failed`)

---

### 8.3 Go offline while browsing

**Steps**

1. Online: open **My Matches**.
2. Enable airplane mode, pull to refresh.

**Expected**

- [ ] Error UI with retry
- [ ] Previously loaded rows may remain visible (acceptable); refresh fails gracefully

---

### 8.4 Offline → online recovery

**Steps**

1. From 8.3, disable airplane mode, pull to refresh.

**Expected**

- [ ] List reloads without app restart

---

## 9. Backend sleeping behavior (Render)

Specific to default host: `shot-vision-service.onrender.com`.

### 9.1 Health check awareness

**Optional (engineer):** `GET https://shot-vision-service.onrender.com/actuator/health` (or documented health path) after idle — may take **60–180+ s** first byte.

**App behavior:** User should see timeout ~45s, not wait 3 minutes with no feedback.

---

### 9.2 Wake then burst traffic

**Steps**

1. Wake backend with one screen (Explore).
2. Quickly open **Profile**, **My Matches**, **match detail**.

**Expected**

- [ ] Refresh single-flight: no corrupt tokens from parallel refresh storms
- [ ] All screens eventually load or show consistent errors

---

### 9.3 Sleeping during logout

**Steps**

1. Wake app, sign in, put backend to sleep again (wait), **logout**.

**Expected**

- [ ] Local session cleared even if backend logout POST times out
- [ ] Login screen shown

---

## 10. Regression smoke (post-P0)

Quick pass after any release candidate build.

| Area | Check |
|------|--------|
| Notifications | No bell on tabs; `/notifications` = coming soon, **no** `/api/notifications` in network log |
| Explore filter race | Rapid tab switch → correct list |
| Match detail | Fast back navigation → no warning/crash |
| Logs (release) | No OTP params, Firebase JWT, or access tokens in logcat |
| Profile upload | UI hidden/disabled; no accidental 5 MB upload attempt |
| Create / edit match | Save errors show form-friendly messages |
| Theme (settings) | Toggle light/dark persists |

---

## 11. Environment matrix (recommended minimum)

| Scenario | Android release | iOS release | Notes |
|----------|-----------------|-------------|--------|
| Auth Google | Required | Required | |
| Auth OTP | Required | If shipped | |
| Cold start | Required | Required | Render sleep |
| Offline | Required | Required | |
| Slow net | Required | Recommended | |
| Play install | Required | N/A | Internal track |
| Token 50+ min | Recommended | Recommended | |
| Background 30 min | Recommended | Recommended | |

---

## 12. Known limitations (not failures)

Document as **expected** until backend/product changes:

- **Notifications API** disabled — no in-app notification list.
- **Profile image upload** disabled — edit profile text fields only.
- **Explore status filter** is client-side; “Load more” may appear when filtered list is empty but server has more pages.
- **Render cold start** may require **two** user retries (first wakes server, second succeeds) if first attempt hits 45s timeout.
- **Web preview** is not a substitute for device QA (no real SecureStore / Google Sign-In parity).

---

## 13. Reporting defects

Include:

1. Build: version `4.0.0`, `versionCode` / iOS build number  
2. Device + OS  
3. Network: Wi‑Fi / LTE / offline / throttled  
4. Backend state: warm / cold (approx idle time)  
5. Steps + screenshot + **whether request exceeded 45s**  
6. `X-Correlation-ID` from API error if shown in dev tools  

---

## Related docs

- `docs/AUTH_TOKEN_LIFECYCLE.md` — token refresh architecture  
- `docs/EXPLORE_FILTERING.md` — explore filter behavior  
- `API_INTEGRATION_REPORT.md` — endpoint coverage (if present in repo)

---

*Last updated for P0 production hardening (timeouts, auth log gating, notifications flag, upload size guard, request sequencing).*
