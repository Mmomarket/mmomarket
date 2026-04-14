// tools/healthcheck.mjs
// API & UI Health Check Tool — tests all endpoints and pages, generates a comprehensive report
// Usage: node tools/healthcheck.mjs [--api-only] [--ui-only]

import { writeFileSync } from "fs";
import {
  BASE_URL,
  TEST_USER,
  checkServer,
  createPage,
  launchBrowser,
  loginUser,
  outputPath,
  registerUser,
  takeScreenshot,
  waitForPageReady,
} from "./lib/browser.mjs";

const args = process.argv.slice(2);
const apiOnly = args.includes("--api-only");
const uiOnly = args.includes("--ui-only");

// ── API Endpoint Registry ──────────────────────────────────────
const PUBLIC_ENDPOINTS = [
  { method: "GET", path: "/api/games", desc: "List games" },
  {
    method: "GET",
    path: "/api/prices?currencyId=test&days=7",
    desc: "Price history (with test ID)",
  },
  { method: "GET", path: "/api/orders?currencyId=test", desc: "Order book" },
  { method: "GET", path: "/api/auth/session", desc: "Auth session check" },
  { method: "GET", path: "/api/auth/csrf", desc: "CSRF token" },
];

const AUTHENTICATED_ENDPOINTS = [
  { method: "GET", path: "/api/wallet", desc: "Wallet balance" },
  { method: "GET", path: "/api/deposits", desc: "Deposit list" },
  { method: "GET", path: "/api/withdrawals", desc: "Withdrawal list" },
  { method: "GET", path: "/api/trades", desc: "Trade list" },
  { method: "GET", path: "/api/verifications", desc: "Verification list" },
  { method: "GET", path: "/api/admin/stats", desc: "Admin stats" },
];

const MUTATION_TESTS = [
  {
    method: "POST",
    path: "/api/auth/register",
    desc: "Register (duplicate)",
    body: { name: "Test", email: TEST_USER.email, password: "test123456" },
    expectStatus: [201, 409], // 201 first time, 409 duplicate
  },
  {
    method: "POST",
    path: "/api/orders",
    desc: "Create order (unauth)",
    body: { type: "BUY", currencyId: "test", amount: 100, pricePerUnit: 1 },
    expectStatus: [401],
    auth: false,
  },
];

const UI_PAGES = [
  { path: "/", desc: "Homepage" },
  { path: "/login", desc: "Login" },
  { path: "/registro", desc: "Register" },
  { path: "/negociar", desc: "Trade" },
  { path: "/carteira", desc: "Wallet (requires auth)" },
  { path: "/verificacao", desc: "Verification (requires auth)" },
  { path: "/historico", desc: "History (requires auth)" },
  { path: "/admin", desc: "Admin (requires admin)" },
];

// ── Helper: test an API endpoint ───────────────────────────────
async function testEndpoint(endpoint, cookies = "") {
  const start = Date.now();
  try {
    const opts = {
      method: endpoint.method || "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    };

    if (cookies) opts.headers["Cookie"] = cookies;
    if (endpoint.body) opts.body = JSON.stringify(endpoint.body);

    const res = await fetch(`${BASE_URL}${endpoint.path}`, opts);
    const duration = Date.now() - start;
    let body;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => "");
    }

    const expectedStatuses = endpoint.expectStatus || [200];
    const isExpected = expectedStatuses.includes(res.status);

    return {
      name: `${endpoint.method} ${endpoint.path}`,
      desc: endpoint.desc,
      status: res.status,
      success: res.status < 500 && (isExpected || res.status < 400),
      duration,
      bodyPreview:
        typeof body === "object"
          ? JSON.stringify(body).substring(0, 200)
          : String(body).substring(0, 200),
      isArray: Array.isArray(body),
      itemCount: Array.isArray(body) ? body.length : undefined,
    };
  } catch (e) {
    return {
      name: `${endpoint.method} ${endpoint.path}`,
      desc: endpoint.desc,
      success: false,
      error: e.message,
      duration: Date.now() - start,
    };
  }
}

// ── Helper: test a UI page ─────────────────────────────────────
async function testPage(page, pg) {
  const start = Date.now();
  try {
    const response = await page.goto(`${BASE_URL}${pg.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await waitForPageReady(page);
    const duration = Date.now() - start;

    const status = response?.status() || 0;
    const title = await page.title();
    const jsErrors = [...page._collectedErrors];
    page._collectedErrors.length = 0; // reset for next page

    // Check for key UI elements
    const hasNav = await page
      .locator("nav")
      .isVisible()
      .catch(() => false);
    const hasMain = await page
      .locator("main")
      .isVisible()
      .catch(() => false);
    const hasH1 = await page
      .locator("h1")
      .isVisible()
      .catch(() => false);

    const screenshot = await takeScreenshot(
      page,
      `health_${pg.path.replace(/\//g, "_") || "home"}`,
      "healthcheck",
    );

    return {
      name: pg.path,
      desc: pg.desc,
      status,
      success: status < 400 && jsErrors.length === 0,
      duration,
      title,
      jsErrors,
      hasNav,
      hasMain,
      hasH1,
      ...screenshot,
    };
  } catch (e) {
    return {
      name: pg.path,
      desc: pg.desc,
      success: false,
      error: e.message,
      duration: Date.now() - start,
    };
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  🏥 MMOMarket Health Check Tool                ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  const server = await checkServer();
  if (!server.reachable) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    process.exit(1);
  }
  console.log(`✅ Server at ${BASE_URL}\n`);

  const results = [];
  let authCookies = "";

  // ── SECTION 1: Infrastructure ───────────────────────────────
  console.log("══ Section 1: Infrastructure ══");

  // Check database
  try {
    const gamesRes = await fetch(`${BASE_URL}/api/games`, {
      signal: AbortSignal.timeout(5000),
    });
    const games = await gamesRes.json();
    const dbSeeded = Array.isArray(games) && games.length > 0;
    results.push({
      name: "Database seeded",
      success: dbSeeded,
      status: gamesRes.status,
      message: dbSeeded
        ? `${games.length} games found`
        : "No games — run: npm run seed",
    });
    console.log(
      dbSeeded
        ? `  ✅ Database seeded (${games.length} games)`
        : "  ❌ Database not seeded",
    );
  } catch (e) {
    results.push({ name: "Database check", success: false, error: e.message });
    console.log(`  ❌ Database check failed: ${e.message}`);
  }

  // Check auth system
  try {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
      signal: AbortSignal.timeout(5000),
    });
    const csrf = await csrfRes.json();
    results.push({
      name: "Auth system (CSRF)",
      success: !!csrf.csrfToken,
      message: csrf.csrfToken ? "CSRF token available" : "No CSRF token",
    });
    console.log(
      csrf.csrfToken
        ? "  ✅ Auth system (CSRF token works)"
        : "  ❌ Auth system broken",
    );
  } catch (e) {
    results.push({ name: "Auth system", success: false, error: e.message });
    console.log(`  ❌ Auth system: ${e.message}`);
  }

  // ── SECTION 2: API Endpoints ────────────────────────────────
  if (!uiOnly) {
    console.log("\n══ Section 2: Public API Endpoints ══");
    for (const ep of PUBLIC_ENDPOINTS) {
      const result = await testEndpoint(ep);
      results.push(result);
      const icon = result.success ? "✅" : "❌";
      console.log(
        `  ${icon} ${result.name} → ${result.status} (${result.duration}ms) ${result.error || ""}`,
      );
    }

    // Create test user and get auth cookies
    console.log("\n══ Section 3: Authentication ══");
    const browser = await launchBrowser();
    try {
      const { context, page } = await createPage(browser);

      // Register
      const reg = await registerUser(page, TEST_USER);
      results.push({
        name: "User Registration",
        success: reg.status === 201 || reg.status === 409,
        status: reg.status,
        message:
          reg.status === 201
            ? "New user created"
            : reg.status === 409
              ? "User already exists"
              : `Error: ${reg.status}`,
      });
      console.log(
        `  ${reg.status === 201 || reg.status === 409 ? "✅" : "❌"} Registration: ${reg.status}`,
      );

      // Login
      const login = await loginUser(context, page, TEST_USER);
      results.push({
        name: "User Login",
        success: login.success,
        message: login.success ? "Session established" : "Login failed",
      });
      console.log(
        `  ${login.success ? "✅" : "❌"} Login: ${login.success ? "OK" : "FAILED"}`,
      );

      // Get cookies for subsequent API tests
      const cookies = await context.cookies();
      authCookies = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      if (authCookies) {
        console.log("\n══ Section 4: Authenticated API Endpoints ══");
        for (const ep of AUTHENTICATED_ENDPOINTS) {
          const result = await testEndpoint(ep, authCookies);
          results.push(result);
          const icon = result.success ? "✅" : "❌";
          const extra = result.isArray ? ` (${result.itemCount} items)` : "";
          console.log(
            `  ${icon} ${result.name} → ${result.status} (${result.duration}ms)${extra} ${result.error || ""}`,
          );
        }
      }

      await context.close();
    } finally {
      await browser.close();
    }

    // Mutation tests
    console.log("\n══ Section 5: Mutation Tests ══");
    for (const ep of MUTATION_TESTS) {
      const result = await testEndpoint(ep);
      results.push(result);
      const icon = result.success ? "✅" : "❌";
      console.log(
        `  ${icon} ${result.name} → ${result.status} (${result.duration}ms)`,
      );
    }
  }

  // ── SECTION 6: UI Pages ─────────────────────────────────────
  if (!apiOnly) {
    console.log("\n══ Section 6: UI Page Loads ══");
    const browser = await launchBrowser();
    try {
      // Public pages
      const { context: pubCtx, page: pubPage } = await createPage(browser);
      for (const pg of UI_PAGES.slice(0, 4)) {
        const result = await testPage(pubPage, pg);
        results.push(result);
        const icon = result.success ? "✅" : "❌";
        console.log(
          `  ${icon} ${pg.path} — ${pg.desc} (${result.duration}ms, ${result.jsErrors?.length || 0} JS errors)`,
        );
      }
      await pubCtx.close();

      // Authenticated pages
      const { context: authCtx, page: authPage } = await createPage(browser);
      await registerUser(authPage, TEST_USER);
      const login = await loginUser(authCtx, authPage, TEST_USER);

      if (login.success) {
        for (const pg of UI_PAGES.slice(4)) {
          const result = await testPage(authPage, pg);
          results.push(result);
          const icon = result.success ? "✅" : "❌";
          console.log(
            `  ${icon} ${pg.path} — ${pg.desc} (${result.duration}ms, ${result.jsErrors?.length || 0} JS errors)`,
          );
        }
      }
      await authCtx.close();
    } finally {
      await browser.close();
    }
  }

  // ── Generate Reports ────────────────────────────────────────
  const passed = results.filter((r) => r.success !== false).length;
  const failed = results.filter((r) => r.success === false).length;

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { total: results.length, passed, failed },
    results,
  };

  const jsonPath = outputPath("healthcheck", "healthcheck-report.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const htmlPath = outputPath("healthcheck", "report.html");
  writeFileSync(htmlPath, generateHealthHtml(report));

  console.log("\n╔════════════════════════════════════════════════╗");
  console.log(`║  📊 Health Check Complete                       ║`);
  console.log(
    `║  ✅ Passed: ${String(passed).padEnd(4)}    ❌ Failed: ${String(failed).padEnd(4)}        ║`,
  );
  console.log(`║  📄 JSON: tools/output/healthcheck/             ║`);
  console.log(`║  🌐 HTML: ${htmlPath.split("output")[1]}  ║`);
  console.log("╚════════════════════════════════════════════════╝");

  if (failed > 0) process.exit(1);
}

function generateHealthHtml(report) {
  const rows = report.results
    .map(
      (r) => `
    <tr class="${r.success === false ? "fail-row" : ""}">
      <td>${r.success === false ? "❌" : "✅"}</td>
      <td><strong>${escHtml(r.name || "")}</strong><br><small>${escHtml(r.desc || r.message || "")}</small></td>
      <td>${r.status || "—"}</td>
      <td>${r.duration ? `${r.duration}ms` : "—"}</td>
      <td>${r.error ? `<span class="err">${escHtml(r.error)}</span>` : r.jsErrors?.length ? `<span class="warn">${r.jsErrors.length} JS error(s)</span>` : "OK"}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>MMOMarket Health Check Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #030712; color: #f3f4f6; padding: 2rem; }
  h1 { color: #10b981; margin-bottom: 0.5rem; }
  .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .summary { display: flex; gap: 1rem; margin-bottom: 2rem; }
  .stat { background: #111827; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1rem 1.5rem; text-align: center; min-width: 100px; }
  .stat-v { font-size: 1.75rem; font-weight: 700; }
  .stat-l { font-size: 0.7rem; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; background: #111827; border-radius: 0.75rem; overflow: hidden; }
  th { background: #1f2937; text-align: left; padding: 0.75rem 1rem; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; }
  td { padding: 0.75rem 1rem; border-bottom: 1px solid #1f2937; font-size: 0.85rem; }
  .fail-row { background: #1c0a0a; }
  .err { color: #fca5a5; font-size: 0.75rem; }
  .warn { color: #fde68a; font-size: 0.75rem; }
  small { color: #6b7280; }
</style></head><body>
<h1>🏥 MMOMarket Health Check Report</h1>
<p class="meta">Generated: ${report.timestamp} · Server: ${report.baseUrl}</p>
<div class="summary">
  <div class="stat"><div class="stat-v" style="color:#10b981">${report.summary.passed}</div><div class="stat-l">Passed</div></div>
  <div class="stat"><div class="stat-v" style="color:#ef4444">${report.summary.failed}</div><div class="stat-l">Failed</div></div>
  <div class="stat"><div class="stat-v" style="color:white">${report.summary.total}</div><div class="stat-l">Total</div></div>
</div>
<table><thead><tr><th></th><th>Check</th><th>Status</th><th>Time</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
