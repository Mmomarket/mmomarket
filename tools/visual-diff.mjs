// tools/visual-diff.mjs
// Visual Regression Tool — capture baselines and compare against current state
// Usage:
//   node tools/visual-diff.mjs --baseline     # Capture baseline screenshots
//   node tools/visual-diff.mjs --compare      # Compare current vs baseline
//   node tools/visual-diff.mjs --side-by-side # Generate side-by-side HTML

import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { basename, join } from "path";
import {
  BASE_URL,
  TEST_USER,
  checkServer,
  createPage,
  ensureDir,
  launchBrowser,
  loginUser,
  outputPath,
  registerUser,
  waitForPageReady,
} from "./lib/browser.mjs";

const args = process.argv.slice(2);
const isBaseline = args.includes("--baseline");
const isCompare = args.includes("--compare");
const isSideBySide = args.includes("--side-by-side");

const BASELINE_DIR = "visual-diff/baseline";
const CURRENT_DIR = "visual-diff/current";
const DIFF_DIR = "visual-diff/diff";

const PAGES_TO_CAPTURE = [
  { path: "/", name: "home", auth: false },
  { path: "/login", name: "login", auth: false },
  { path: "/registro", name: "register", auth: false },
  { path: "/negociar", name: "trade_public", auth: false },
  { path: "/negociar", name: "trade_auth", auth: true },
  { path: "/carteira", name: "wallet", auth: true },
  { path: "/verificacao", name: "verification", auth: true },
  { path: "/historico", name: "history", auth: true },
];

/**
 * Capture screenshots for a set of pages
 */
async function captureScreenshots(subdir) {
  const browser = await launchBrowser();
  const files = [];

  try {
    // ── Public pages (no auth) ──
    const { context: pubCtx, page: pubPage } = await createPage(browser);
    for (const pg of PAGES_TO_CAPTURE.filter((p) => !p.auth)) {
      try {
        await pubPage.goto(`${BASE_URL}${pg.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        await waitForPageReady(pubPage);
        await pubPage.waitForTimeout(1000); // extra settle time for charts
        const filepath = outputPath(subdir, `${pg.name}.png`);
        await pubPage.screenshot({
          path: filepath,
          fullPage: true,
          type: "png",
        });
        files.push({ name: pg.name, path: pg.path, filepath });
        console.log(`  📸 ${pg.name} (${pg.path})`);
      } catch (e) {
        console.log(`  ⚠️  ${pg.name}: ${e.message}`);
      }
    }
    await pubCtx.close();

    // ── Authenticated pages ──
    const { context: authCtx, page: authPage } = await createPage(browser);
    await registerUser(authPage, TEST_USER);
    const login = await loginUser(authCtx, authPage, TEST_USER);

    if (login.success) {
      for (const pg of PAGES_TO_CAPTURE.filter((p) => p.auth)) {
        try {
          await authPage.goto(`${BASE_URL}${pg.path}`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
          });
          await waitForPageReady(authPage);
          await authPage.waitForTimeout(1000);
          const filepath = outputPath(subdir, `${pg.name}.png`);
          await authPage.screenshot({
            path: filepath,
            fullPage: true,
            type: "png",
          });
          files.push({ name: pg.name, path: pg.path, filepath });
          console.log(`  📸 ${pg.name} (${pg.path}) [auth]`);
        } catch (e) {
          console.log(`  ⚠️  ${pg.name}: ${e.message}`);
        }
      }
    } else {
      console.log("  ⚠️  Login failed — skipping authenticated pages");
    }
    await authCtx.close();
  } finally {
    await browser.close();
  }

  return files;
}

/**
 * Get hash of a file for quick comparison
 */
function fileHash(filepath) {
  if (!existsSync(filepath)) return null;
  const data = readFileSync(filepath);
  return createHash("md5").update(data).digest("hex");
}

/**
 * Compare baseline vs current screenshots using pixel-level hash comparison
 */
function compareScreenshots() {
  const baselineDir = join(ensureDir(BASELINE_DIR));
  const currentDir = join(ensureDir(CURRENT_DIR));

  if (!existsSync(baselineDir)) {
    console.error("❌ No baseline found. Run with --baseline first.");
    process.exit(1);
  }

  const baselineFiles = readdirSync(baselineDir).filter((f) =>
    f.endsWith(".png"),
  );
  const results = [];

  for (const file of baselineFiles) {
    const baselinePath = join(baselineDir, file);
    const currentPath = join(currentDir, file);
    const name = basename(file, ".png");

    if (!existsSync(currentPath)) {
      results.push({
        name,
        status: "MISSING",
        message: "Current screenshot missing",
      });
      continue;
    }

    const baselineHash = fileHash(baselinePath);
    const currentHash = fileHash(currentPath);

    if (baselineHash === currentHash) {
      results.push({ name, status: "IDENTICAL", message: "No visual changes" });
    } else {
      // Calculate file size diff as a rough change indicator
      const baseSize = readFileSync(baselinePath).length;
      const currSize = readFileSync(currentPath).length;
      const sizeDiff = Math.abs(currSize - baseSize);
      const percentDiff = ((sizeDiff / baseSize) * 100).toFixed(1);

      results.push({
        name,
        status: "CHANGED",
        message: `Files differ (size delta: ${percentDiff}%)`,
        baselineHash,
        currentHash,
        sizeDiff,
        percentDiff,
      });
    }
  }

  // Check for new pages in current that aren't in baseline
  const currentFiles = readdirSync(currentDir).filter((f) =>
    f.endsWith(".png"),
  );
  for (const file of currentFiles) {
    if (!baselineFiles.includes(file)) {
      results.push({
        name: basename(file, ".png"),
        status: "NEW",
        message: "New page (no baseline)",
      });
    }
  }

  return results;
}

/**
 * Generate side-by-side HTML comparison
 */
function generateSideBySideHtml(comparisons) {
  const cards = comparisons
    .map(
      (c) => `
    <div class="comparison ${c.status.toLowerCase()}">
      <div class="comp-header">
        <h3>${c.name}</h3>
        <span class="status-badge ${c.status.toLowerCase()}">${c.status}</span>
      </div>
      ${c.status === "CHANGED" ? `<p class="delta">Size delta: ${c.percentDiff}%</p>` : ""}
      <div class="images">
        <div class="img-col">
          <h4>Baseline</h4>
          <img src="../baseline/${c.name}.png" alt="Baseline" onerror="this.style.display='none'" />
        </div>
        <div class="img-col">
          <h4>Current</h4>
          <img src="../current/${c.name}.png" alt="Current" onerror="this.style.display='none'" />
        </div>
      </div>
    </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>MMOMarket Visual Diff Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #030712; color: #f3f4f6; padding: 2rem; }
  h1 { color: #10b981; margin-bottom: 0.5rem; }
  .meta { color: #6b7280; margin-bottom: 2rem; font-size: 0.85rem; }
  .summary { display: flex; gap: 1rem; margin-bottom: 2rem; }
  .stat { background: #111827; border: 1px solid #1f2937; border-radius: 0.75rem; padding: 1rem 1.5rem; text-align: center; }
  .stat-v { font-size: 1.5rem; font-weight: 700; }
  .stat-l { font-size: 0.7rem; color: #6b7280; }
  .comparison { background: #111827; border: 1px solid #1f2937; border-radius: 0.75rem; margin-bottom: 1.5rem; overflow: hidden; }
  .comparison.changed { border-color: #f59e0b; }
  .comparison.missing { border-color: #ef4444; }
  .comp-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #1f2937; }
  .comp-header h3 { font-size: 0.95rem; }
  .delta { padding: 0.5rem 1rem; font-size: 0.8rem; color: #f59e0b; }
  .images { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
  .img-col { text-align: center; }
  .img-col h4 { font-size: 0.75rem; color: #6b7280; padding: 0.5rem; text-transform: uppercase; }
  .img-col img { width: 100%; display: block; }
  .status-badge { padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
  .identical { background: #064e3b; color: #6ee7b7; }
  .changed { background: #78350f; color: #fde68a; }
  .missing { background: #7f1d1d; color: #fca5a5; }
  .new { background: #1e3a5f; color: #93c5fd; }
</style></head>
<body>
<h1>🔍 MMOMarket Visual Diff Report</h1>
<p class="meta">Generated: ${new Date().toISOString()}</p>
<div class="summary">
  <div class="stat"><div class="stat-v" style="color:#10b981">${comparisons.filter((c) => c.status === "IDENTICAL").length}</div><div class="stat-l">Identical</div></div>
  <div class="stat"><div class="stat-v" style="color:#f59e0b">${comparisons.filter((c) => c.status === "CHANGED").length}</div><div class="stat-l">Changed</div></div>
  <div class="stat"><div class="stat-v" style="color:#ef4444">${comparisons.filter((c) => c.status === "MISSING").length}</div><div class="stat-l">Missing</div></div>
  <div class="stat"><div class="stat-v" style="color:#60a5fa">${comparisons.filter((c) => c.status === "NEW").length}</div><div class="stat-l">New</div></div>
</div>
${cards}
</body></html>`;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  🔍 MMOMarket Visual Regression Tool           ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  if (!isBaseline && !isCompare && !isSideBySide) {
    console.log("Usage:");
    console.log(
      "  node tools/visual-diff.mjs --baseline      Capture baseline screenshots",
    );
    console.log(
      "  node tools/visual-diff.mjs --compare       Compare current vs baseline",
    );
    console.log(
      "  node tools/visual-diff.mjs --side-by-side  Generate side-by-side HTML report",
    );
    console.log("\nTypical workflow:");
    console.log(
      "  1. Capture baseline:  node tools/visual-diff.mjs --baseline",
    );
    console.log("  2. Make changes to your code");
    console.log("  3. Compare changes:   node tools/visual-diff.mjs --compare");
    process.exit(0);
  }

  const server = await checkServer();
  if (!server.reachable && (isBaseline || isCompare)) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    process.exit(1);
  }

  if (isBaseline) {
    console.log("📸 Capturing BASELINE screenshots...\n");
    const files = await captureScreenshots(BASELINE_DIR);
    console.log(`\n✅ Baseline captured: ${files.length} screenshots`);
    console.log(`   Location: tools/output/${BASELINE_DIR}/`);
  }

  if (isCompare || isSideBySide) {
    if (isCompare) {
      console.log("📸 Capturing CURRENT screenshots...\n");
      await captureScreenshots(CURRENT_DIR);
    }

    console.log("\n🔍 Comparing baseline vs current...\n");
    const comparisons = compareScreenshots();

    for (const c of comparisons) {
      const icon =
        c.status === "IDENTICAL"
          ? "✅"
          : c.status === "CHANGED"
            ? "⚠️"
            : c.status === "MISSING"
              ? "❌"
              : "🆕";
      console.log(`  ${icon} ${c.name}: ${c.status} — ${c.message}`);
    }

    // Generate side-by-side report
    const htmlPath = outputPath(DIFF_DIR, "diff-report.html");
    writeFileSync(htmlPath, generateSideBySideHtml(comparisons));

    const jsonPath = outputPath(DIFF_DIR, "diff-report.json");
    writeFileSync(
      jsonPath,
      JSON.stringify(
        { timestamp: new Date().toISOString(), comparisons },
        null,
        2,
      ),
    );

    const changed = comparisons.filter((c) => c.status === "CHANGED").length;
    const missing = comparisons.filter((c) => c.status === "MISSING").length;

    console.log(
      `\n📊 Results: ${comparisons.filter((c) => c.status === "IDENTICAL").length} identical, ${changed} changed, ${missing} missing`,
    );
    console.log(`🌐 Report: ${htmlPath}`);

    if (changed > 0 || missing > 0) process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
