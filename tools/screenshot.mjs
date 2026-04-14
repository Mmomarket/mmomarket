// tools/screenshot.mjs
// Full-page screenshot capture tool for all MMOMarket pages
// Usage: node tools/screenshot.mjs [--page /path] [--auth] [--mobile] [--all-viewports]

import { writeFileSync } from "fs";
import {
  BASE_URL,
  TEST_USER,
  VIEWPORTS,
  checkServer,
  collectDiagnostics,
  createPage,
  launchBrowser,
  loginUser,
  outputPath,
  printResult,
  registerUser,
  takeScreenshot,
  waitForPageReady,
} from "./lib/browser.mjs";

// ── Page Registry ──────────────────────────────────────────────
const PAGES = {
  public: [
    { path: "/", name: "home", desc: "Homepage / Market Overview" },
    { path: "/login", name: "login", desc: "Login Page" },
    { path: "/registro", name: "register", desc: "Register Page" },
    { path: "/negociar", name: "trade", desc: "Trading Page" },
  ],
  authenticated: [
    { path: "/", name: "home-auth", desc: "Homepage (Logged In)" },
    { path: "/negociar", name: "trade-auth", desc: "Trading (Logged In)" },
    { path: "/carteira", name: "wallet", desc: "Wallet Page" },
    { path: "/verificacao", name: "verification", desc: "Verification Page" },
    { path: "/historico", name: "history", desc: "Trade History" },
  ],
  admin: [{ path: "/admin", name: "admin", desc: "Admin Panel" }],
};

// ── CLI Args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const singlePage = args.includes("--page")
  ? args[args.indexOf("--page") + 1]
  : null;
const authOnly = args.includes("--auth");
const mobileOnly = args.includes("--mobile");
const allViewports = args.includes("--all-viewports");

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  📸 MMOMarket Screenshot Capture Tool          ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  // Check server
  const server = await checkServer();
  if (!server.reachable) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    console.error(`   Error: ${server.error}`);
    console.error(`\n   Start the server first: npm run dev`);
    process.exit(1);
  }
  console.log(`✅ Server reachable at ${BASE_URL} (HTTP ${server.status})\n`);

  const browser = await launchBrowser();
  const results = [];
  const viewports = allViewports
    ? Object.keys(VIEWPORTS)
    : mobileOnly
      ? ["mobile"]
      : ["desktop"];

  try {
    for (const vp of viewports) {
      console.log(
        `\n── Viewport: ${vp} (${VIEWPORTS[vp].width}x${VIEWPORTS[vp].height}) ──\n`,
      );
      const subdir = `screenshots/${vp}`;

      // ── PUBLIC PAGES ──────────────────────────────────────
      if (!authOnly) {
        console.log("📷 Public pages (not logged in):");
        const { context, page } = await createPage(browser, vp);

        const publicPages = singlePage
          ? PAGES.public.filter((p) => p.path === singlePage)
          : PAGES.public;

        for (const pg of publicPages) {
          try {
            await page.goto(`${BASE_URL}${pg.path}`, {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            });
            await waitForPageReady(page);
            const result = await takeScreenshot(
              page,
              `public_${pg.name}_${vp}`,
              subdir,
            );
            const diag = await collectDiagnostics(page);
            result.diagnostics = diag;
            result.success = diag.jsErrors.length === 0;
            results.push(result);
            printResult(`${pg.desc} (${pg.path})`, result);
          } catch (e) {
            const result = {
              name: `public_${pg.name}_${vp}`,
              success: false,
              error: e.message,
              url: pg.path,
            };
            results.push(result);
            printResult(`${pg.desc} (${pg.path})`, result);
          }
        }

        await context.close();
      }

      // ── AUTHENTICATED PAGES ──────────────────────────────
      if (
        !singlePage ||
        PAGES.authenticated.some((p) => p.path === singlePage)
      ) {
        console.log("\n📷 Authenticated pages (logged in):");
        const { context, page } = await createPage(browser, vp);

        // Register + Login
        const regResult = await registerUser(page, TEST_USER);
        console.log(
          `   Registration: ${regResult.status === 201 ? "Created" : regResult.status === 409 ? "Already exists" : `Error ${regResult.status}`}`,
        );

        const loginResult = await loginUser(context, page, TEST_USER);
        if (!loginResult.success) {
          console.error("   ❌ Login failed — skipping authenticated pages");
          results.push({
            name: "auth_login",
            success: false,
            error: "Login failed",
          });
          await context.close();
          continue;
        }
        console.log(`   ✅ Logged in as ${loginResult.session?.user?.email}\n`);

        const authPages = singlePage
          ? PAGES.authenticated.filter((p) => p.path === singlePage)
          : PAGES.authenticated;

        for (const pg of authPages) {
          try {
            await page.goto(`${BASE_URL}${pg.path}`, {
              waitUntil: "domcontentloaded",
              timeout: 15000,
            });
            await waitForPageReady(page);
            const result = await takeScreenshot(
              page,
              `auth_${pg.name}_${vp}`,
              subdir,
            );
            const diag = await collectDiagnostics(page);
            result.diagnostics = diag;
            result.success = diag.jsErrors.length === 0;
            results.push(result);
            printResult(`${pg.desc} (${pg.path})`, result);
          } catch (e) {
            const result = {
              name: `auth_${pg.name}_${vp}`,
              success: false,
              error: e.message,
              url: pg.path,
            };
            results.push(result);
            printResult(`${pg.desc} (${pg.path})`, result);
          }
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  // ── Generate Report ──────────────────────────────────────
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalScreenshots: results.length,
    passed: results.filter((r) => r.success !== false).length,
    failed: results.filter((r) => r.success === false).length,
    withErrors: results.filter((r) => r.errors?.length > 0).length,
    results,
  };

  const reportPath = outputPath("screenshots", "screenshot-report.json");
  writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

  // Generate HTML report
  const htmlPath = outputPath("screenshots", "report.html");
  writeFileSync(htmlPath, generateScreenshotHtml(reportData));

  console.log("\n╔════════════════════════════════════════════════╗");
  console.log(
    `║  📊 Results: ${reportData.passed} passed, ${reportData.failed} failed, ${reportData.withErrors} warnings`,
  );
  console.log(`║  📁 Screenshots: tools/output/screenshots/`);
  console.log(`║  📄 Report: ${reportPath}`);
  console.log(`║  🌐 HTML Report: ${htmlPath}`);
  console.log("╚════════════════════════════════════════════════╝");
}

function generateScreenshotHtml(data) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><title>MMOMarket Screenshot Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #030712; color: #f3f4f6; padding: 2rem; }
  h1 { color: #10b981; margin-bottom: 0.25rem; font-size: 1.5rem; }
  .meta { color: #6b7280; font-size: 0.8rem; margin-bottom: 2rem; }
  .summary { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
  .stat { background: #111827; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1rem 1.5rem; text-align: center; min-width: 120px; }
  .stat-val { font-size: 2rem; font-weight: 700; }
  .stat-lbl { font-size: 0.7rem; color: #6b7280; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap: 1rem; }
  .card { background: #111827; border: 1px solid #1f2937; border-radius: 0.75rem; overflow: hidden; }
  .card-hd { padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; }
  .card-hd h3 { font-size: 0.8rem; }
  .card img { width: 100%; cursor: pointer; }
  .card img:hover { opacity: 0.9; }
  .badge { padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
  .ok { background: #064e3b; color: #6ee7b7; }
  .fail { background: #7f1d1d; color: #fca5a5; }
  .warn { background: #78350f; color: #fde68a; }
  .errs { padding: 0.5rem 1rem; font-size: 0.7rem; color: #fca5a5; background: #1c0a0a; }
  .foot { padding: 0.5rem 1rem; font-size: 0.7rem; color: #6b7280; }
</style>
</head>
<body>
<h1>📸 MMOMarket Screenshot Report</h1>
<p class="meta">Generated: ${data.timestamp} · Base URL: ${data.baseUrl}</p>
<div class="summary">
  <div class="stat"><div class="stat-val" style="color:#10b981">${data.passed}</div><div class="stat-lbl">Passed</div></div>
  <div class="stat"><div class="stat-val" style="color:#ef4444">${data.failed}</div><div class="stat-lbl">Failed</div></div>
  <div class="stat"><div class="stat-val" style="color:#f59e0b">${data.withErrors}</div><div class="stat-lbl">Warnings</div></div>
  <div class="stat"><div class="stat-val" style="color:white">${data.totalScreenshots}</div><div class="stat-lbl">Total</div></div>
</div>
<div class="grid">
${data.results
  .map(
    (r) => `<div class="card">
  <div class="card-hd"><h3>${r.name}</h3><span class="badge ${r.success === false ? "fail" : r.errors?.length ? "warn" : "ok"}">${r.success === false ? "FAIL" : r.errors?.length ? "WARN" : "OK"}</span></div>
  ${r.filename ? `<a href="${r.filename}" target="_blank"><img src="${r.filename}" alt="${r.name}" loading="lazy"/></a>` : ""}
  ${r.errors?.length ? `<div class="errs">${r.errors.map((e) => `<div>⚠️ ${escHtml(e.substring(0, 200))}</div>`).join("")}</div>` : ""}
  <div class="foot">${r.url || ""}</div>
</div>`,
  )
  .join("\n")}
</div>
</body></html>`;
}

function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
