// tools/test-all.mjs
// Self-contained test that writes ALL results to a file.
// Run: node tools/test-all.mjs
// Results: tools/output/test-results.json

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "output");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const BASE = process.env.BASE_URL || "http://localhost:3000";
const results = [];

function log(msg) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`;
  process.stdout.write(line + "\n");
}

async function test(name, fn) {
  try {
    const r = await fn();
    results.push({ name, success: true, ...r });
    log(`✅ ${name}`);
  } catch (e) {
    results.push({ name, success: false, error: e.message });
    log(`❌ ${name}: ${e.message}`);
  }
}

async function fetchJSON(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...opts,
  });
  const body = await r.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    json = null;
  }
  return { status: r.status, body, json };
}

// ── Tests ──────────────────────────────────────────

async function main() {
  log(`Testing ${BASE}...\n`);

  // 1. Server reachable
  await test("Server reachable", async () => {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(10000) });
    return { status: r.status };
  });

  // 2. API: Games
  await test("GET /api/games", async () => {
    const { status, json } = await fetchJSON("/api/games");
    return { status, gameCount: json?.length, firstGame: json?.[0]?.name };
  });

  // 3. API: Prices
  await test("GET /api/prices (needs currencyId)", async () => {
    // First get a currency
    const { json: games } = await fetchJSON("/api/games");
    const currId = games?.[0]?.currencies?.[0]?.id;
    if (!currId) return { status: 0, note: "No currencies found" };
    const { status, json } = await fetchJSON(
      `/api/prices?currencyId=${currId}&days=7`,
    );
    return {
      status,
      hasHistory: json?.history?.length > 0,
      stats: json?.stats,
    };
  });

  // 4. API: Orders (public)
  await test("GET /api/orders", async () => {
    const { json: games } = await fetchJSON("/api/games");
    const currId = games?.[0]?.currencies?.[0]?.id;
    const { status, json } = await fetchJSON(
      `/api/orders?currencyId=${currId}`,
    );
    return {
      status,
      orderCount: Array.isArray(json) ? json.length : "not-array",
    };
  });

  // 5. Auth: CSRF
  await test("GET /api/auth/csrf", async () => {
    const { status, json } = await fetchJSON("/api/auth/csrf");
    return { status, hasToken: !!json?.csrfToken };
  });

  // 6. Auth: Register a test user
  const testEmail = `test_${Date.now()}@test.com`;
  await test("POST /api/auth/register", async () => {
    const { status, json } = await fetchJSON("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TestBot",
        email: testEmail,
        password: "test123456",
      }),
    });
    return { status, message: json?.message, error: json?.error };
  });

  // 7. Auth: Login
  await test("POST /api/auth/callback/credentials (login)", async () => {
    const { json: csrf } = await fetchJSON("/api/auth/csrf");
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: testEmail,
        password: "test123456",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const cookies = r.headers.getSetCookie?.() || [];
    const hasSession = cookies.some((c) =>
      c.includes("next-auth.session-token"),
    );
    return { status: r.status, hasSession, cookieCount: cookies.length };
  });

  // 8. Protected routes without auth
  await test("GET /api/wallet (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/wallet");
    return { status, error: json?.error };
  });

  await test("GET /api/trades (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/trades");
    return { status, error: json?.error };
  });

  await test("GET /api/deposits (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/deposits");
    return { status, error: json?.error };
  });

  await test("GET /api/withdrawals (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/withdrawals");
    return { status, error: json?.error };
  });

  await test("GET /api/verifications (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/verifications");
    return { status, error: json?.error };
  });

  // 9. Page loads
  for (const path of ["/", "/login", "/registro", "/negociar"]) {
    await test(`GET ${path} (page load)`, async () => {
      const r = await fetch(`${BASE}${path}`, {
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();
      return {
        status: r.status,
        size: html.length,
        hasDoctype: html.startsWith("<!DOCTYPE"),
      };
    });
  }

  // 10. Authenticated flow: login, get session, test wallet, etc.
  await test("Full auth flow: register → login → session → wallet", async () => {
    const email2 = `fulltest_${Date.now()}@test.com`;
    // Register
    await fetchJSON("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "FullTest",
        email: email2,
        password: "test123456",
      }),
    });
    // Get CSRF
    const { json: csrf } = await fetchJSON("/api/auth/csrf");
    // Login
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: email2,
        password: "test123456",
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const cookies = loginRes.headers.getSetCookie?.() || [];
    const sessionCookie = cookies.find((c) =>
      c.includes("next-auth.session-token"),
    );
    if (!sessionCookie)
      return {
        step: "login",
        error: "No session cookie",
        cookies: cookies.map((c) => c.substring(0, 60)),
      };

    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");

    // Get session
    const sessRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: cookieHeader },
      signal: AbortSignal.timeout(10000),
    });
    const session = await sessRes.json();

    // Get wallet
    const walletRes = await fetch(`${BASE}/api/wallet`, {
      headers: { Cookie: cookieHeader },
      signal: AbortSignal.timeout(10000),
    });
    const wallet = await walletRes.json();

    return {
      session: { user: session?.user?.name, email: session?.user?.email },
      wallet: {
        balance: wallet?.balanceBRL,
        frozen: wallet?.frozenBRL,
        id: wallet?.id ? "exists" : "missing",
      },
    };
  });

  // 11. API: POST /api/orders without auth
  await test("POST /api/orders (no auth = 401)", async () => {
    const { status, json } = await fetchJSON("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "BUY",
        currencyId: "fake",
        amount: 100,
        pricePerUnit: 1,
      }),
    });
    return { status, error: json?.error };
  });

  // 12. Admin endpoints without auth
  await test("GET /api/admin/stats (no auth)", async () => {
    const { status, json } = await fetchJSON("/api/admin/stats");
    return { status, isAdmin: json?.isAdmin };
  });

  // ── Summary ──────────────────────────────────────
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log(`\n${"=".repeat(50)}`);
  log(
    `RESULTS: ${passed} passed, ${failed} failed out of ${results.length} tests`,
  );

  if (failed > 0) {
    log("\nFailed tests:");
    results
      .filter((r) => !r.success)
      .forEach((r) => log(`  ❌ ${r.name}: ${r.error}`));
  }

  const outPath = join(outDir, "test-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        passed,
        failed,
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );
  log(`\nResults saved to: ${outPath}`);
}

main().catch((e) => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
