// tools/debug.mjs
// Quick debug tool — takes a screenshot of a specific URL and dumps diagnostics
// Usage:
//   node tools/debug.mjs                          # Screenshot homepage
//   node tools/debug.mjs /login                   # Screenshot login page
//   node tools/debug.mjs /carteira --auth          # Screenshot wallet (logged in)
//   node tools/debug.mjs /negociar --click "button:has-text('Vender')" --auth
//   node tools/debug.mjs --console                 # Also dump console logs
//   node tools/debug.mjs --dom "main"              # Dump inner HTML of selector
//   node tools/debug.mjs --network                 # Log all network requests
//   node tools/debug.mjs --eval "document.title"   # Evaluate JS in page

import { writeFileSync } from "fs";
import {
  BASE_URL,
  TEST_USER,
  checkServer,
  collectDiagnostics,
  createPage,
  launchBrowser,
  loginUser,
  outputPath,
  registerUser,
  takeScreenshot,
  waitForPageReady,
} from "./lib/browser.mjs";

// ── Parse Args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
const pagePath = args.find((a) => a.startsWith("/")) || "/";
const needsAuth = args.includes("--auth");
const showConsole = args.includes("--console");
const dumpNetwork = args.includes("--network");
const clickSelector = args.includes("--click")
  ? args[args.indexOf("--click") + 1]
  : null;
const domSelector = args.includes("--dom")
  ? args[args.indexOf("--dom") + 1]
  : null;
const evalExpr = args.includes("--eval")
  ? args[args.indexOf("--eval") + 1]
  : null;
const waitMs = args.includes("--wait")
  ? parseInt(args[args.indexOf("--wait") + 1])
  : 0;

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  🔧 MMOMarket Quick Debug Tool                 ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  const server = await checkServer();
  if (!server.reachable) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    process.exit(1);
  }

  const browser = await launchBrowser();
  const { context, page } = await createPage(browser);
  const networkLogs = [];

  try {
    // Track network requests if requested
    if (dumpNetwork) {
      page.on("request", (req) => {
        networkLogs.push({ type: "REQ", method: req.method(), url: req.url() });
      });
      page.on("response", (res) => {
        networkLogs.push({ type: "RES", status: res.status(), url: res.url() });
      });
    }

    // Auth if needed
    if (needsAuth) {
      console.log("🔐 Authenticating...");
      await registerUser(page, TEST_USER);
      const login = await loginUser(context, page, TEST_USER);
      if (!login.success) {
        console.error("❌ Login failed");
        process.exit(1);
      }
      console.log(`✅ Logged in as ${TEST_USER.email}\n`);
    }

    // Navigate
    console.log(`🌐 Navigating to ${pagePath}...`);
    const response = await page.goto(`${BASE_URL}${pagePath}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await waitForPageReady(page);

    console.log(`   HTTP Status: ${response?.status()}`);
    console.log(`   URL: ${page.url()}`);
    console.log(`   Title: ${await page.title()}`);

    // Extra wait
    if (waitMs > 0) {
      console.log(`   Waiting ${waitMs}ms...`);
      await page.waitForTimeout(waitMs);
    }

    // Click action
    if (clickSelector) {
      console.log(`\n🖱️  Clicking: ${clickSelector}`);
      try {
        await page.click(clickSelector, { timeout: 5000 });
        await page.waitForTimeout(1000);
        console.log("   ✅ Click successful");
      } catch (e) {
        console.log(`   ❌ Click failed: ${e.message}`);
      }
    }

    // Take screenshot
    const ts = Date.now();
    const name = `debug_${pagePath.replace(/\//g, "_") || "home"}_${ts}`;
    const result = await takeScreenshot(page, name, "debug");
    console.log(`\n📸 Screenshot: ${result.filepath}`);

    // Diagnostics
    const diag = await collectDiagnostics(page);
    console.log("\n── Diagnostics ──");
    console.log(`   JS Errors: ${diag.jsErrors.length}`);
    if (diag.jsErrors.length > 0) {
      diag.jsErrors.forEach((e) => console.log(`   ❌ ${e}`));
    }
    console.log(`   Loading Skeletons still visible: ${diag.loadingSkeletons}`);
    console.log(`   Empty States: ${diag.emptyStates.length}`);
    if (diag.visibleErrors.length > 0) {
      console.log(`   Visible Error Messages:`);
      diag.visibleErrors.forEach((e) =>
        console.log(`   ⚠️  ${e.substring(0, 100)}`),
      );
    }

    // Console logs
    if (showConsole) {
      console.log("\n── Console Logs ──");
      for (const log of page._consoleLogs) {
        const icon =
          log.type === "error" ? "❌" : log.type === "warning" ? "⚠️" : "ℹ️";
        console.log(`   ${icon} [${log.type}] ${log.text.substring(0, 200)}`);
      }
    }

    // Network logs
    if (dumpNetwork) {
      console.log("\n── Network Requests ──");
      const apiRequests = networkLogs.filter((l) => l.url.includes("/api/"));
      for (const log of apiRequests) {
        if (log.type === "RES") {
          const icon = log.status < 400 ? "✅" : "❌";
          console.log(`   ${icon} ${log.status} ${log.url}`);
        }
      }
      console.log(
        `   Total requests: ${networkLogs.filter((l) => l.type === "REQ").length}`,
      );
    }

    // DOM dump
    if (domSelector) {
      console.log(`\n── DOM Content: ${domSelector} ──`);
      try {
        const html = await page.locator(domSelector).first().innerHTML();
        // Truncate for readability
        const truncated =
          html.length > 2000
            ? html.substring(0, 2000) + "\n... (truncated)"
            : html;
        console.log(truncated);
      } catch (e) {
        console.log(`   ❌ Could not read: ${e.message}`);
      }
    }

    // Eval expression
    if (evalExpr) {
      console.log(`\n── Eval: ${evalExpr} ──`);
      try {
        const result = await page.evaluate(evalExpr);
        console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
      } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
      }
    }

    // Save full diagnostics to JSON
    const diagPath = outputPath("debug", `debug_${ts}.json`);
    writeFileSync(
      diagPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          url: page.url(),
          path: pagePath,
          authenticated: needsAuth,
          httpStatus: response?.status(),
          title: await page.title(),
          diagnostics: diag,
          consoleLogs: showConsole ? page._consoleLogs : undefined,
          networkLogs: dumpNetwork ? networkLogs : undefined,
          screenshot: result.filepath,
        },
        null,
        2,
      ),
    );
    console.log(`\n📄 Full diagnostics: ${diagPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
