// tools/lib/browser.mjs
// Shared browser utilities for all troubleshooting tools

import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR = join(__dirname, "..");
const OUTPUT_DIR = join(TOOLS_DIR, "output");

export const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

export const TEST_USER = {
  name: "TestDebug",
  email: "debug@mmomarket.com",
  password: "debug123456",
};

export const ADMIN_USER = {
  email: "admin@mmomarket.com",
  password: "admin123456",
};

/**
 * Ensure output directory exists
 */
export function ensureDir(subdir) {
  const dir = join(OUTPUT_DIR, subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get output path for a file
 */
export function outputPath(subdir, filename) {
  const dir = ensureDir(subdir);
  return join(dir, filename);
}

/**
 * Launch browser with common settings
 */
export async function launchBrowser(options = {}) {
  const browser = await chromium.launch({
    headless: options.headless !== false,
  });
  return browser;
}

/**
 * Create a new page with common settings
 */
export async function createPage(browser, viewport = "desktop") {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport] || VIEWPORTS.desktop,
    ignoreHTTPSErrors: true,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  // Collect console errors
  const page = await context.newPage();
  const errors = [];
  const consoleLogs = [];

  page.on("console", (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  page._collectedErrors = errors;
  page._consoleLogs = consoleLogs;

  return { context, page };
}

/**
 * Register a test user (ignores if already exists)
 */
export async function registerUser(page, user = TEST_USER) {
  try {
    const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: { name: user.name, email: user.email, password: user.password },
    });
    return { status: res.status(), data: await res.json() };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

/**
 * Login and get authenticated session cookies
 */
export async function loginUser(context, page, user = TEST_USER) {
  // Get CSRF token
  const csrfRes = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // Submit credentials
  const loginRes = await page.request.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      form: {
        csrfToken,
        email: user.email,
        password: user.password,
      },
      maxRedirects: 0,
    },
  );

  // Verify session
  const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`);
  const session = await sessionRes.json();

  return {
    success: !!session?.user,
    session,
    status: loginRes.status(),
  };
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageReady(page, timeout = 15000) {
  try {
    await page.waitForLoadState("networkidle", { timeout });
  } catch {
    // networkidle can be flaky, fallback to domcontentloaded
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
    } catch {
      // just continue
    }
  }
  // Extra wait for React hydration
  await page.waitForTimeout(500);
}

/**
 * Take a screenshot with metadata
 */
export async function takeScreenshot(page, name, subdir = "screenshots") {
  const filename = `${name.replace(/[^a-z0-9-_]/gi, "_")}.png`;
  const filepath = outputPath(subdir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
    type: "png",
  });

  return {
    name,
    filepath,
    filename,
    errors: [...page._collectedErrors],
    url: page.url(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Take a screenshot of a specific element
 */
export async function takeElementScreenshot(
  page,
  selector,
  name,
  subdir = "screenshots",
) {
  const filename = `${name.replace(/[^a-z0-9-_]/gi, "_")}.png`;
  const filepath = outputPath(subdir, filename);

  const element = page.locator(selector).first();
  if (await element.isVisible()) {
    await element.screenshot({ path: filepath, type: "png" });
    return { name, filepath, filename, found: true };
  }
  return { name, filepath, filename, found: false };
}

/**
 * Collect page diagnostics
 */
export async function collectDiagnostics(page) {
  const url = page.url();
  const title = await page.title();
  const errors = [...page._collectedErrors];
  const consoleLogs = [...page._consoleLogs];

  // Check for visible error messages on page
  const errorElements = await page
    .locator('[class*="error"], [class*="red-"], [role="alert"]')
    .allTextContents();

  // Check for loading skeletons still visible
  const skeletonCount = await page
    .locator('[class*="skeleton"], [class*="animate-pulse"]')
    .count();

  // Check for empty states
  const emptyStates = await page
    .locator('[class*="empty"], :text("Nenhum")')
    .allTextContents();

  return {
    url,
    title,
    jsErrors: errors,
    consoleLogs: consoleLogs.filter(
      (l) => l.type === "error" || l.type === "warning",
    ),
    visibleErrors: errorElements,
    loadingSkeletons: skeletonCount,
    emptyStates,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pretty-print a result
 */
export function printResult(label, result) {
  const icon = result.success !== false ? "✅" : "❌";
  console.log(`\n${icon} ${label}`);
  if (result.filepath) console.log(`   📸 ${result.filepath}`);
  if (result.errors?.length) {
    console.log(`   ⚠️  JS Errors: ${result.errors.length}`);
    result.errors.forEach((e) => console.log(`      - ${e.substring(0, 120)}`));
  }
  if (result.error) console.log(`   ❌ ${result.error}`);
}

/**
 * Check if the server is reachable
 */
export async function checkServer() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(5000) });
    return { reachable: true, status: res.status };
  } catch (e) {
    return { reachable: false, error: e.message };
  }
}

/**
 * Generate an HTML report from results
 */
export async function generateHtmlReport(title, results, outputSubdir) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #030712; color: #f3f4f6; padding: 2rem; }
    h1 { color: #10b981; margin-bottom: 0.5rem; }
    .timestamp { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1rem; overflow: hidden; }
    .card-header { padding: 1rem; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { font-size: 0.875rem; font-weight: 600; }
    .card img { width: 100%; display: block; }
    .card-footer { padding: 0.75rem 1rem; font-size: 0.75rem; color: #6b7280; }
    .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .badge-ok { background: #064e3b; color: #6ee7b7; }
    .badge-err { background: #7f1d1d; color: #fca5a5; }
    .badge-warn { background: #78350f; color: #fde68a; }
    .errors { padding: 0.75rem 1rem; background: #1c1917; font-size: 0.75rem; color: #fca5a5; }
    .summary { background: #111827; border: 1px solid #1f2937; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="timestamp">Generated: ${new Date().toISOString()}</p>

  <div class="summary">
    <div class="stat">
      <div class="stat-value" style="color: #10b981">${results.filter((r) => r.success !== false).length}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #ef4444">${results.filter((r) => r.success === false).length}</div>
      <div class="stat-label">Failed</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #f59e0b">${results.filter((r) => r.errors?.length > 0).length}</div>
      <div class="stat-label">With Warnings</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: white">${results.length}</div>
      <div class="stat-label">Total Checks</div>
    </div>
  </div>

  <div class="grid">
    ${results
      .map(
        (r) => `
    <div class="card">
      <div class="card-header">
        <h3>${r.name || r.label || "Check"}</h3>
        <span class="badge ${r.success === false ? "badge-err" : r.errors?.length ? "badge-warn" : "badge-ok"}">
          ${r.success === false ? "FAIL" : r.errors?.length ? "WARN" : "OK"}
        </span>
      </div>
      ${r.filename ? `<img src="${r.filename}" alt="${r.name}" loading="lazy" />` : ""}
      ${r.errors?.length ? `<div class="errors">${r.errors.map((e) => `<div>⚠️ ${e.substring(0, 200)}</div>`).join("")}</div>` : ""}
      <div class="card-footer">
        ${r.url ? `URL: ${r.url}` : ""}
        ${r.duration ? ` · ${r.duration}ms` : ""}
        ${r.status ? ` · HTTP ${r.status}` : ""}
      </div>
    </div>`,
      )
      .join("\n")}
  </div>
</body>
</html>`;

  const filepath = outputPath(outputSubdir, "report.html");
  const fs = await import("fs");
  fs.writeFileSync(filepath, html, "utf-8");
  return filepath;
}
