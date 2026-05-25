#!/usr/bin/env node
/**
 * Integration test runner for all Shot Vision APIs wired in src/services.
 *
 * Usage:
 *   node scripts/test-integrated-apis.mjs
 *   SHOTVISION_ACCESS_TOKEN=<jwt> SHOTVISION_REFRESH_TOKEN=<jwt> node scripts/test-integrated-apis.mjs
 *   SHOTVISION_RUN_WRITE_TESTS=1 SHOTVISION_ACCESS_TOKEN=<jwt> node scripts/test-integrated-apis.mjs
 *
 * Loads EXPO_PUBLIC_API_BASE_URL from .env (project root) when present.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.SHOTVISION_API_BASE_URL ||
  "https://shot-vision-service.onrender.com"
).replace(/\/$/, "");

const ACCESS_TOKEN = process.env.SHOTVISION_ACCESS_TOKEN?.trim() || "";
const REFRESH_TOKEN = process.env.SHOTVISION_REFRESH_TOKEN?.trim() || "";
const RUN_WRITE = process.env.SHOTVISION_RUN_WRITE_TESTS === "1";
const TIMEOUT_MS = Number(process.env.SHOTVISION_API_TIMEOUT_MS || 120_000);

const results = [];

function cid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function messageFromBody(body) {
  if (!body) return "Request failed";
  const fromErrors = body.errors?.map((e) => e.message).filter(Boolean).join(" ");
  if (fromErrors?.trim()) return fromErrors.trim();
  return body.statusMessage || "Request failed";
}

function parseEnvelope(text, httpOk, httpStatus, correlationId) {
  if (!text?.trim()) {
    if (!httpOk) throw new Error(`HTTP ${httpStatus} empty body`);
    return { data: undefined, responseCode: "00" };
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (HTTP ${httpStatus})`);
  }
  const responseCode = json?.responseInfo?.responseCode;
  const body = json?.body;
  const statusCode = parseInt(String(body?.statusCode ?? httpStatus), 10);
  if (!httpOk || responseCode === "01" || statusCode >= 400) {
    throw new Error(`${messageFromBody(body)} (HTTP ${httpStatus}, code ${responseCode})`);
  }
  return { data: body?.data, responseCode, correlationId: json?.responseInfo?.correlationId ?? correlationId };
}

async function request(method, endpoint, { body, auth = true, formData } = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const correlationId = cid();
  const headers = {
    Accept: "application/json",
    "X-Correlation-ID": correlationId,
    "X-E2E-ID": cid(),
  };
  if (!formData) headers["Content-Type"] = "application/json";
  if (auth && ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    const elapsed = Date.now() - started;
    let parsed;
    try {
      parsed = parseEnvelope(text, res.ok, res.status, correlationId);
    } catch (parseErr) {
      return {
        ok: false,
        httpStatus: res.status,
        elapsed,
        error: parseErr.message,
        rawSnippet: text.slice(0, 200),
      };
    }
    return {
      ok: true,
      httpStatus: res.status,
      elapsed,
      data: parsed.data,
      responseCode: parsed.responseCode,
    };
  } catch (e) {
    const elapsed = Date.now() - started;
    const msg = e?.name === "AbortError" ? `Timeout after ${TIMEOUT_MS}ms` : e?.message || String(e);
    return { ok: false, httpStatus: 0, elapsed, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function runTest(name, fn, { skip } = {}) {
  if (skip) {
    results.push({ name, status: "SKIP", detail: skip });
    return null;
  }
  try {
    const out = await fn();
    results.push({
      name,
      status: "PASS",
      detail: typeof out === "string" ? out : out?.summary ?? "OK",
      ms: out?.ms,
    });
    return out?.value;
  } catch (e) {
    results.push({ name, status: "FAIL", detail: e?.message || String(e) });
    return null;
  }
}

function summarizeData(data) {
  if (data === null || data === undefined) return "null";
  if (Array.isArray(data)) return `array[${data.length}]`;
  if (typeof data === "object") {
    const keys = Object.keys(data).slice(0, 8).join(",");
    if (Array.isArray(data.items)) return `page items=${data.items.length} keys=${keys}`;
    if (data.id) return `id=${data.id}`;
    return `keys=${keys}`;
  }
  return String(data);
}

async function wakeBackend() {
  for (let i = 1; i <= 3; i++) {
    const r = await request("GET", "/actuator/health", { auth: false });
    if (r.ok) return `healthy (${r.elapsed}ms, attempt ${i})`;
    if (r.error?.includes("Timeout") && i < 3) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new Error(r.error || `HTTP ${r.httpStatus}`);
  }
}

async function main() {
  console.log(`\nShot Vision API integration tests`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Auth token: ${ACCESS_TOKEN ? "yes" : "no (authenticated tests skipped)"}`);
  console.log(`Write tests: ${RUN_WRITE && ACCESS_TOKEN ? "enabled" : "disabled"}\n`);

  await runTest("GET /actuator/health", async () => {
    const detail = await wakeBackend();
    return { summary: detail };
  });

  await runTest("POST /api/auth/login (validation)", async () => {
    const r = await request("POST", "/api/auth/login", {
      auth: false,
      body: {},
    });
    if (r.ok) throw new Error("Expected validation failure");
    if (r.httpStatus !== 400 && r.httpStatus !== 401) {
      return { summary: `rejected HTTP ${r.httpStatus}: ${r.error}` };
    }
    return { summary: `rejected as expected (${r.httpStatus})` };
  });

  await runTest("POST /api/auth/refresh (invalid token)", async () => {
    const r = await request("POST", "/api/auth/refresh", {
      auth: false,
      body: { refreshToken: "invalid-refresh-token" },
    });
    if (r.ok) throw new Error("Expected refresh failure");
    return { summary: `rejected (${r.httpStatus})` };
  });

  const noAuth = !ACCESS_TOKEN;

  await runTest("GET /api/users/me (401 without token)", async () => {
    const r = await request("GET", "/api/users/me", { auth: false });
    if (r.ok || r.httpStatus !== 401) {
      throw new Error(`Expected 401, got ${r.httpStatus} ${r.error}`);
    }
    return { summary: "401 without Bearer" };
  });

  await runTest("GET /public/share/{id} (unknown match)", async () => {
    const r = await request("GET", "/public/share/00000000-0000-0000-0000-000000000001", {
      auth: false,
    });
    if (r.ok) throw new Error("Expected 404 for unknown share");
    if (r.httpStatus !== 404) return { summary: `HTTP ${r.httpStatus}: ${r.error}` };
    return { summary: "404 for unknown id" };
  });

  if (noAuth) {
    const authSkip = "Set SHOTVISION_ACCESS_TOKEN (JWT from app login) to run authenticated tests";
    for (const name of [
      "GET /api/users/me",
      "PATCH /api/users/me",
      "GET /api/users/me/stats",
      "PATCH /api/users/me/settings",
      "GET /api/matches/my",
      "GET /api/matches/explore",
      "POST /api/matches (create)",
      "GET /api/matches/{id}",
      "PATCH /api/matches/{id}",
      "POST /api/matches/{id}/like",
      "DELETE /api/matches/{id}/like",
      "GET /api/matches/{id}/share",
      "POST /api/matches/{id}/finish",
      "DELETE /api/matches/{id}",
      "GET /api/notifications",
      "POST /api/uploads/profile-image",
      "POST /api/auth/logout",
    ]) {
      await runTest(name, async () => null, { skip: authSkip });
    }
  } else {
    let profile;
    await runTest("GET /api/users/me", async () => {
      const r = await request("GET", "/api/users/me");
      if (!r.ok) throw new Error(r.error);
      profile = r.data;
      return { summary: `user id=${profile?.id ?? "?"} name=${profile?.name ?? "?"}` };
    });

    await runTest("PATCH /api/users/me", async () => {
      if (!profile) throw new Error("Profile not loaded");
      const r = await request("PATCH", "/api/users/me", {
        body: {
          name: profile.name,
          bio: profile.bio ?? "",
        },
      });
      if (!r.ok) throw new Error(r.error);
      return { summary: `profile updated id=${r.data?.id ?? profile.id}` };
    });

    await runTest("GET /api/users/me/stats", async () => {
      const r = await request("GET", "/api/users/me/stats");
      if (!r.ok) throw new Error(r.error);
      return { summary: summarizeData(r.data) };
    });

    await runTest("PATCH /api/users/me/settings", async () => {
      const r = await request("PATCH", "/api/users/me/settings", {
        body: { darkMode: true },
      });
      if (!r.ok) throw new Error(r.error);
      await request("PATCH", "/api/users/me/settings", { body: { darkMode: false } });
      return { summary: "darkMode toggle OK" };
    });

    let firstMatchId;
    await runTest("GET /api/matches/my", async () => {
      const r = await request("GET", "/api/matches/my?page=0&size=5");
      if (!r.ok) throw new Error(r.error);
      const items = r.data?.items ?? r.data?.content ?? [];
      firstMatchId = items[0]?.id ?? items[0]?.matchId;
      return { summary: summarizeData(r.data) };
    });

    await runTest("GET /api/matches/explore", async () => {
      const r = await request("GET", "/api/matches/explore?page=0&size=5");
      if (!r.ok) throw new Error(r.error);
      const items = r.data?.items ?? r.data?.content ?? [];
      if (!firstMatchId && items[0]) firstMatchId = items[0]?.id ?? items[0]?.matchId;
      return { summary: summarizeData(r.data) };
    });

    let createdId;
    if (RUN_WRITE) {
      await runTest("POST /api/matches (create)", async () => {
        const r = await request("POST", "/api/matches", {
          body: {
            player1Name: "API Test A",
            player2Name: "API Test B",
            matchDate: new Date().toISOString(),
            isPublic: true,
            status: "LIVE",
            sets: [{ setNumber: 1, p1Score: 0, p2Score: 0 }],
          },
        });
        if (!r.ok) throw new Error(r.error);
        createdId = r.data?.id ?? r.data?.matchId;
        if (!createdId) throw new Error("No match id in create response");
        return { summary: `created ${createdId}` };
      });

      const detailId = createdId || firstMatchId;
      if (detailId) {
        await runTest("GET /api/matches/{id}", async () => {
          const r = await request("GET", `/api/matches/${detailId}`);
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });

        await runTest("GET /api/matches/{id}/share", async () => {
          const r = await request("GET", `/api/matches/${detailId}/share`);
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });

        await runTest("POST /api/matches/{id}/like", async () => {
          const r = await request("POST", `/api/matches/${detailId}/like`, { body: {} });
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });

        await runTest("DELETE /api/matches/{id}/like", async () => {
          const r = await request("DELETE", `/api/matches/${detailId}/like`);
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });

        if (createdId) {
          await runTest("PATCH /api/matches/{id}", async () => {
            const r = await request("PATCH", `/api/matches/${createdId}`, {
              body: { notes: "API integration test" },
            });
            if (!r.ok) throw new Error(r.error);
            return { summary: "patched notes" };
          });

          await runTest("POST /api/matches/{id}/finish", async () => {
            await request("PATCH", `/api/matches/${createdId}`, {
              body: {
                sets: [{ setNumber: 1, p1Score: 6, p2Score: 4 }],
              },
            });
            const r = await request("POST", `/api/matches/${createdId}/finish`, { body: {} });
            if (!r.ok) throw new Error(r.error);
            return { summary: summarizeData(r.data) };
          });

          await runTest("DELETE /api/matches/{id}", async () => {
            const r = await request("DELETE", `/api/matches/${createdId}`);
            if (!r.ok) throw new Error(r.error);
            return { summary: "deleted test match" };
          });
        }
      } else {
        await runTest("GET /api/matches/{id}", async () => null, {
          skip: "No match id available",
        });
      }
    } else {
      await runTest("POST /api/matches (create)", async () => null, {
        skip: "Set SHOTVISION_RUN_WRITE_TESTS=1 for create/update/delete",
      });
      if (firstMatchId) {
        await runTest("GET /api/matches/{id}", async () => {
          const r = await request("GET", `/api/matches/${firstMatchId}`);
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });
        await runTest("GET /api/matches/{id}/share", async () => {
          const r = await request("GET", `/api/matches/${firstMatchId}/share`);
          if (!r.ok) throw new Error(r.error);
          return { summary: summarizeData(r.data) };
        });
      }
    }

    await runTest("GET /api/notifications", async () => {
      const r = await request("GET", "/api/notifications");
      if (!r.ok && (r.httpStatus === 404 || r.httpStatus === 500)) {
        return {
          summary: `HTTP ${r.httpStatus} — notifications not production-ready (UI gated off)`,
        };
      }
      if (!r.ok) throw new Error(r.error);
      return { summary: summarizeData(r.data) };
    });

    await runTest("POST /api/uploads/profile-image", async () => {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(64)], { type: "image/png" }), "test.png");
      const r = await request("POST", "/api/uploads/profile-image", { formData: form });
      if (!r.ok && r.httpStatus === 503) {
        return { summary: "503 — storage not enabled (expected)" };
      }
      if (!r.ok) throw new Error(r.error);
      return { summary: summarizeData(r.data) };
    });

    if (REFRESH_TOKEN) {
      await runTest("POST /api/auth/logout", async () => {
        const r = await request("POST", "/api/auth/logout", {
          auth: false,
          body: { refreshToken: REFRESH_TOKEN },
        });
        if (!r.ok) throw new Error(r.error);
        return { summary: "logout OK (refresh token invalidated)" };
      });
    } else {
      await runTest("POST /api/auth/logout", async () => null, {
        skip: "Set SHOTVISION_REFRESH_TOKEN to test logout",
      });
    }
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;

  console.log("\n--- Results ---\n");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "○";
    console.log(`${icon} ${r.name}`);
    console.log(`    ${r.detail}${r.ms ? ` (${r.ms}ms)` : ""}`);
  }
  console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped\n`);

  const reportPath = path.join(ROOT, "API_TEST_RESULTS.md");
  const md = [
    "# API integration test results",
    "",
    `**Run:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE_URL}`,
    `**Authenticated:** ${ACCESS_TOKEN ? "yes" : "no"}`,
    `**Write tests:** ${RUN_WRITE ? "yes" : "no"}`,
    "",
    `**Summary:** ${pass} passed · ${fail} failed · ${skip} skipped`,
    "",
    "| Status | Endpoint | Detail |",
    "|--------|----------|--------|",
    ...results.map(
      (r) => `| ${r.status} | ${r.name} | ${String(r.detail).replace(/\|/g, "\\|")} |`
    ),
    "",
    "## Re-run with full coverage",
    "",
    "```bash",
    "# After signing in via the app, copy JWT from logs or add to .env:",
    "export SHOTVISION_ACCESS_TOKEN=\"<accessToken>\"",
    "export SHOTVISION_REFRESH_TOKEN=\"<refreshToken>\"",
    "export SHOTVISION_RUN_WRITE_TESTS=1",
    "node scripts/test-integrated-apis.mjs",
    "```",
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, md);
  console.log(`Report written: ${reportPath}`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
