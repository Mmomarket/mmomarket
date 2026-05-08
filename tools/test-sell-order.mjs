/**
 * test-sell-order.mjs
 * Empirically verify that a SELL order can be created without any verification gate.
 */
import { mkdirSync, writeFileSync } from "fs";
import {
  BASE_URL,
  checkServer,
  createPage,
  launchBrowser,
  loginUser,
  outputPath,
  registerUser,
  takeScreenshot,
  TEST_USER,
  waitForPageReady,
} from "./lib/browser.mjs";

const SUBDIR = "sell-order-test";
const results = [];

async function waitForServer(retries = 20, interval = 2000) {
  for (let i = 0; i < retries; i++) {
    const { reachable } = await checkServer();
    if (reachable) return true;
    console.log(`⏳ Waiting for server... (${i + 1}/${retries})`);
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

async function main() {
  console.log("🧪 Test: SELL order without verification\n");

  const ready = await waitForServer();
  if (!ready) {
    console.error("❌ Server not reachable at", BASE_URL);
    process.exit(1);
  }
  console.log("✅ Server is up\n");

  const browser = await launchBrowser({ headless: true });
  const { context, page } = await createPage(browser);

  try {
    // Register (ignore if already exists)
    await registerUser(page, TEST_USER);
    console.log("👤 User registered/already exists");

    // Login
    const login = await loginUser(context, page, TEST_USER);
    console.log("🔑 Login:", login.success ? "OK" : "FAILED", "\n");
    if (!login.success) throw new Error("Login failed");

    // Navigate to negociar
    await page.goto(`${BASE_URL}/negociar`);
    await waitForPageReady(page);
    await takeScreenshot(page, "01-negociar-loaded", SUBDIR);
    console.log("📸 01 - Page loaded");

    // Switch to SELL tab
    const sellTab = page.getByRole("tab", { name: /vender/i }).or(
      page
        .locator("button")
        .filter({ hasText: /vender/i })
        .first(),
    );
    await sellTab.click();
    await page.waitForTimeout(500);
    await takeScreenshot(page, "02-sell-tab-active", SUBDIR);
    console.log("📸 02 - SELL tab active");

    // Fill form
    const amountInput = page
      .locator(
        'input[name="amount"], input[id="amount"], input[placeholder*="quantidade" i]',
      )
      .first();
    const priceInput = page
      .locator(
        'input[name="price"],  input[id="price"],  input[placeholder*="preço" i]',
      )
      .first();

    await amountInput.fill("500");
    await priceInput.fill("1.00");
    await takeScreenshot(page, "03-form-filled", SUBDIR);
    console.log("📸 03 - Form filled");

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2500);
    await takeScreenshot(page, "04-after-submit", SUBDIR);
    console.log("📸 04 - After submit\n");

    // Read feedback messages
    const errorMsg = await page.locator('[class*="red"]').allTextContents();
    const successMsg = await page
      .locator('[class*="green"], [class*="emerald"]')
      .allTextContents();
    const alertMsg = await page.locator('[role="alert"]').allTextContents();

    const allMessages = [...errorMsg, ...successMsg, ...alertMsg]
      .map((t) => t.trim())
      .filter(Boolean);

    console.log(
      "💬 Messages on page:",
      allMessages.length ? allMessages : "(none)",
    );

    const verificationBlocked = allMessages.some((m) =>
      /verif|comprova|fundos|screenshot|upload/i.test(m),
    );

    const result = {
      timestamp: new Date().toISOString(),
      loginSuccess: login.success,
      messages: allMessages,
      verificationBlocked,
      verdict: verificationBlocked
        ? "FAIL — verification gate still present"
        : "PASS — no verification gate detected",
    };

    results.push(result);

    console.log("\n" + (verificationBlocked ? "❌ FAIL" : "✅ PASS"));
    console.log("   Verdict:", result.verdict);

    // Save JSON report
    const outDir = outputPath(SUBDIR, "")
      .replace(/\\/g, "/")
      .replace(/\/$/, "");
    try {
      mkdirSync(outDir, { recursive: true });
    } catch {}
    writeFileSync(
      outputPath(SUBDIR, "results.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(
      "\n📄 Report saved to tools/output/" + SUBDIR + "/results.json",
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("💥 Unhandled error:", err);
  process.exit(1);
});
