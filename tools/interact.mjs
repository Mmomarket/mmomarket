// tools/interact.mjs
// UI Interaction Testing Tool — performs real user flows and captures screenshots at each step
// Usage: node tools/interact.mjs [--flow register|login|order|wallet|trade|verification|admin]

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
  printResult,
  registerUser,
  takeScreenshot,
  waitForPageReady,
} from "./lib/browser.mjs";

// ── CLI Args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const singleFlow = args.includes("--flow")
  ? args[args.indexOf("--flow") + 1]
  : null;

// Unique user per test run to avoid conflicts
const RUN_ID = Date.now().toString(36);
const FLOW_USER = {
  name: `FlowTest_${RUN_ID}`,
  email: `flow_${RUN_ID}@mmomarket.com`,
  password: "flowtest123456",
};

// ── Flow Definitions ───────────────────────────────────────────

async function flowRegister(browser, results) {
  console.log("\n🔵 FLOW: Registration");
  const { context, page } = await createPage(browser);

  try {
    // Step 1: Navigate to register page
    await page.goto(`${BASE_URL}/registro`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "register_01_page_loaded",
        "interactions/register",
      ),
    );

    // Step 2: Fill form
    await page.fill('input[id="name"]', FLOW_USER.name);
    await page.fill('input[id="email"]', FLOW_USER.email);
    await page.fill('input[id="password"]', FLOW_USER.password);
    await page.fill('input[id="confirmPassword"]', FLOW_USER.password);
    results.push(
      await takeScreenshot(
        page,
        "register_02_form_filled",
        "interactions/register",
      ),
    );

    // Step 3: Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "register_03_after_submit",
        "interactions/register",
      ),
    );

    // Step 4: Check result — should redirect to /login or show success
    const url = page.url();
    const isSuccess = url.includes("/login") || url.includes("registered");
    results.push({
      name: "register_04_result",
      success: isSuccess,
      url,
      message: isSuccess
        ? "Registration succeeded, redirected to login"
        : "Registration may have failed",
    });
    printResult("Registration flow", { success: isSuccess, url });
  } catch (e) {
    results.push({ name: "register_error", success: false, error: e.message });
    printResult("Registration flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowLogin(browser, results) {
  console.log("\n🔵 FLOW: Login");
  const { context, page } = await createPage(browser);

  try {
    // Ensure user exists
    await registerUser(page, TEST_USER);

    // Step 1: Navigate to login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(page, "login_01_page_loaded", "interactions/login"),
    );

    // Step 2: Fill credentials
    await page.fill('input[id="email"]', TEST_USER.email);
    await page.fill('input[id="password"]', TEST_USER.password);
    results.push(
      await takeScreenshot(page, "login_02_form_filled", "interactions/login"),
    );

    // Step 3: Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(page, "login_03_after_submit", "interactions/login"),
    );

    // Step 4: Verify we're logged in (should be on homepage or have user menu)
    const url = page.url();
    const diag = await collectDiagnostics(page);
    const loggedIn = !url.includes("/login");
    results.push({
      name: "login_04_result",
      success: loggedIn,
      url,
      diagnostics: diag,
      message: loggedIn
        ? "Login succeeded"
        : "Still on login page — may have failed",
    });
    printResult("Login flow", { success: loggedIn, url });

    // Step 5: Check navbar shows user name
    if (loggedIn) {
      const navText = await page.textContent("nav");
      const hasUserName =
        navText?.includes(TEST_USER.name) || navText?.includes("Sair");
      results.push(
        await takeScreenshot(
          page,
          "login_05_navbar_check",
          "interactions/login",
        ),
      );
      printResult("Navbar shows user", { success: hasUserName });
    }
  } catch (e) {
    results.push({ name: "login_error", success: false, error: e.message });
    printResult("Login flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowTradePage(browser, results) {
  console.log("\n🔵 FLOW: Trading Page Interaction");
  const { context, page } = await createPage(browser);

  try {
    await registerUser(page, TEST_USER);
    const login = await loginUser(context, page, TEST_USER);
    if (!login.success) {
      results.push({
        name: "trade_login",
        success: false,
        error: "Login failed",
      });
      return;
    }

    // Step 1: Navigate to trade page
    await page.goto(`${BASE_URL}/negociar`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(page, "trade_01_page_loaded", "interactions/trade"),
    );

    // Step 2: Check game selector is loaded
    const gameSelector = page.locator('select[id="game"]');
    if (await gameSelector.isVisible({ timeout: 5000 })) {
      const options = await gameSelector.locator("option").allTextContents();
      console.log(`   🎮 Games available: ${options.length - 1}`); // minus placeholder
      results.push({
        name: "trade_02_games_loaded",
        success: options.length > 1,
        games: options,
      });
    }

    // Step 3: Try to select BUY tab
    const buyButton = page.locator("button", { hasText: "Comprar" });
    if (await buyButton.isVisible()) {
      await buyButton.click();
      results.push(
        await takeScreenshot(
          page,
          "trade_03_buy_selected",
          "interactions/trade",
        ),
      );
    }

    // Step 4: Fill order form
    await page.fill('input[id="amount"]', "1000");
    await page.fill('input[id="price"]', "0.50");
    results.push(
      await takeScreenshot(page, "trade_04_form_filled", "interactions/trade"),
    );

    // Step 5: Try to submit (expect balance error for fresh user)
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    results.push(
      await takeScreenshot(page, "trade_05_after_submit", "interactions/trade"),
    );

    // Step 6: Check for error or success message
    const errorMsg = await page
      .locator('[class*="red-"]')
      .first()
      .textContent()
      .catch(() => null);
    const successMsg = await page
      .locator('[class*="emerald-"]')
      .first()
      .textContent()
      .catch(() => null);
    results.push({
      name: "trade_06_result",
      success: true, // Either error or success is an expected outcome
      errorMsg,
      successMsg,
      message: errorMsg
        ? `Expected error: ${errorMsg}`
        : successMsg
          ? `Success: ${successMsg}`
          : "No message detected",
    });

    // Step 7: Try SELL tab
    const sellButton = page.locator("button", { hasText: "Vender" });
    if (await sellButton.isVisible()) {
      await sellButton.click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(page, "trade_07_sell_tab", "interactions/trade"),
      );
    }

    // Step 8: Check order book
    const orderBook = page.locator("table");
    const tableCount = await orderBook.count();
    results.push({
      name: "trade_08_order_book",
      success: true,
      tables: tableCount,
      message:
        tableCount > 0
          ? `Found ${tableCount} order table(s)`
          : "No order tables found (may be empty)",
    });

    printResult("Trading page flow", { success: true });
  } catch (e) {
    results.push({ name: "trade_error", success: false, error: e.message });
    printResult("Trading flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowWallet(browser, results) {
  console.log("\n🔵 FLOW: Wallet Page");
  const { context, page } = await createPage(browser);

  try {
    await registerUser(page, TEST_USER);
    const login = await loginUser(context, page, TEST_USER);
    if (!login.success) {
      results.push({
        name: "wallet_login",
        success: false,
        error: "Login failed",
      });
      return;
    }

    // Step 1: Navigate to wallet
    await page.goto(`${BASE_URL}/carteira`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "wallet_01_page_loaded",
        "interactions/wallet",
      ),
    );

    // Step 2: Check balance section is visible
    const balanceText = await page
      .locator(":text('Saldo Disponível'), :text('Saldo Disponivel')")
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      name: "wallet_02_balance_visible",
      success: balanceText,
      message: balanceText
        ? "Balance section visible"
        : "Balance section not found",
    });

    // Step 3: Check deposit form
    const depositTab = page.getByRole("button", {
      name: "Depositar",
      exact: true,
    });
    if (await depositTab.isVisible()) {
      await depositTab.click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(
          page,
          "wallet_03_deposit_tab",
          "interactions/wallet",
        ),
      );
    }

    // Step 4: Fill deposit amount
    const depositInput = page.locator('input[id="deposit-amount"]');
    if (await depositInput.isVisible()) {
      await depositInput.fill("50");
      results.push(
        await takeScreenshot(
          page,
          "wallet_04_deposit_filled",
          "interactions/wallet",
        ),
      );
    }

    // Step 5: Click quick amount button
    const quickButton = page.locator("button", { hasText: "R$ 100" });
    if (await quickButton.isVisible()) {
      await quickButton.click();
      await page.waitForTimeout(300);
      results.push(
        await takeScreenshot(
          page,
          "wallet_05_quick_amount",
          "interactions/wallet",
        ),
      );
    }

    // Step 6: Switch to withdraw tab
    const withdrawTab = page.locator("button", { hasText: "Sacar" });
    if (await withdrawTab.isVisible()) {
      await withdrawTab.click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(
          page,
          "wallet_06_withdraw_tab",
          "interactions/wallet",
        ),
      );
    }

    // Step 7: Check deposit/withdrawal history
    const depositsHistoryTab = page
      .locator("button", { hasText: "Depositos" })
      .or(page.locator("button", { hasText: "Depósitos" }));
    if (await depositsHistoryTab.first().isVisible()) {
      await depositsHistoryTab.first().click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(page, "wallet_07_history", "interactions/wallet"),
      );
    }

    printResult("Wallet flow", { success: true });
  } catch (e) {
    results.push({ name: "wallet_error", success: false, error: e.message });
    printResult("Wallet flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowVerification(browser, results) {
  console.log("\n🔵 FLOW: Verification Page");
  const { context, page } = await createPage(browser);

  try {
    await registerUser(page, TEST_USER);
    const login = await loginUser(context, page, TEST_USER);
    if (!login.success) {
      results.push({
        name: "verification_login",
        success: false,
        error: "Login failed",
      });
      return;
    }

    // Step 1: Navigate to verification page
    await page.goto(`${BASE_URL}/verificacao`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "verification_01_page_loaded",
        "interactions/verification",
      ),
    );

    // Step 2: Check form elements
    const gameSelect = page.locator('select[id="game"]');
    const hasGame = await gameSelect.isVisible().catch(() => false);
    results.push({
      name: "verification_02_form_check",
      success: hasGame,
      message: hasGame ? "Game selector found" : "Game selector not found",
    });

    // Step 3: Fill verification form
    await page.fill('input[id="characterName"]', "TestCharacter");
    await page.fill('input[id="amount"]', "10000");
    results.push(
      await takeScreenshot(
        page,
        "verification_03_form_filled",
        "interactions/verification",
      ),
    );

    // Step 4: Check "How it works" section
    const howItWorks = await page
      .locator(":text('Como Funciona')")
      .isVisible()
      .catch(() => false);
    results.push({
      name: "verification_04_info_section",
      success: howItWorks,
      message: howItWorks ? "Info section visible" : "Info section not found",
    });

    // Step 5: Check verification history
    const historySection = await page
      .locator(":text('Minhas Verificações')")
      .isVisible()
      .catch(() => false);
    results.push({
      name: "verification_05_history",
      success: historySection,
      message: historySection
        ? "History section visible"
        : "History section not found",
    });

    printResult("Verification flow", { success: true });
  } catch (e) {
    results.push({
      name: "verification_error",
      success: false,
      error: e.message,
    });
    printResult("Verification flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowHistory(browser, results) {
  console.log("\n🔵 FLOW: Trade History Page");
  const { context, page } = await createPage(browser);

  try {
    await registerUser(page, TEST_USER);
    const login = await loginUser(context, page, TEST_USER);
    if (!login.success) {
      results.push({
        name: "history_login",
        success: false,
        error: "Login failed",
      });
      return;
    }

    // Step 1: Navigate to history
    await page.goto(`${BASE_URL}/historico`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "history_01_page_loaded",
        "interactions/history",
      ),
    );

    // Step 2: Check stats cards
    const statsVisible = await page
      .locator(":text('Total')")
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      name: "history_02_stats",
      success: statsVisible,
      message: statsVisible ? "Stats cards visible" : "Stats not visible",
    });

    // Step 3: Click filter tabs
    const activeTab = page.locator("button", { hasText: "Ativos" });
    if (await activeTab.isVisible()) {
      await activeTab.click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(
          page,
          "history_03_active_filter",
          "interactions/history",
        ),
      );
    }

    const completedTab = page.locator("button", { hasText: "Finalizados" });
    if (await completedTab.isVisible()) {
      await completedTab.click();
      await page.waitForTimeout(500);
      results.push(
        await takeScreenshot(
          page,
          "history_04_completed_filter",
          "interactions/history",
        ),
      );
    }

    printResult("History flow", { success: true });
  } catch (e) {
    results.push({ name: "history_error", success: false, error: e.message });
    printResult("History flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

async function flowHomepage(browser, results) {
  console.log("\n🔵 FLOW: Homepage Interaction");
  const { context, page } = await createPage(browser);

  try {
    // Step 1: Load homepage
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    results.push(
      await takeScreenshot(
        page,
        "home_01_page_loaded",
        "interactions/homepage",
      ),
    );

    // Step 2: Wait for games to load and check
    await page.waitForTimeout(2000);
    const gameButtons = page
      .locator("button")
      .filter({ hasText: /Tibia|Mu Online|Ragnarok/ });
    const gameCount = await gameButtons.count();
    results.push({
      name: "home_02_games_loaded",
      success: gameCount > 0,
      count: gameCount,
      message:
        gameCount > 0
          ? `${gameCount} game button(s) found`
          : "No game buttons found — check /api/games and DB seeding",
    });
    results.push(
      await takeScreenshot(
        page,
        "home_02_games_visible",
        "interactions/homepage",
      ),
    );

    // Step 3: Click on a game
    if (gameCount > 0) {
      await gameButtons.first().click();
      await page.waitForTimeout(1500);
      results.push(
        await takeScreenshot(
          page,
          "home_03_game_selected",
          "interactions/homepage",
        ),
      );
    }

    // Step 4: Check chart area
    const chartArea = page
      .locator("svg")
      .or(page.locator("[class*='recharts']"));
    const hasChart = await chartArea
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      name: "home_04_chart",
      success: true,
      hasChart,
      message: hasChart
        ? "Chart component rendered"
        : "No chart visible (may be no price data)",
    });

    // Step 5: Click currency pill if available
    const currencyPills = page
      .locator("button")
      .filter({ hasText: /^[A-Z]{2,10}$/ });
    if (
      await currencyPills
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await currencyPills.first().click();
      await page.waitForTimeout(1500);
      results.push(
        await takeScreenshot(
          page,
          "home_05_currency_selected",
          "interactions/homepage",
        ),
      );
    }

    // Step 6: Check stats section
    const stats = page.locator(
      ":text('Jogos Disponíveis'), :text('Jogos Disponiveis')",
    );
    const hasStats = await stats
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      name: "home_06_stats",
      success: hasStats,
      message: hasStats ? "Stats section visible" : "Stats not visible",
    });

    // Step 7: Check CTA buttons
    const ctaButton = page
      .locator("a", { hasText: "Começar a Negociar" })
      .or(page.locator("a", { hasText: "Comecar a Negociar" }));
    const hasCta = await ctaButton
      .first()
      .isVisible()
      .catch(() => false);
    results.push({
      name: "home_07_cta",
      success: hasCta,
      message: hasCta ? "CTA button visible" : "CTA button not found",
    });

    // Step 8: Test navigation links
    const navLinks = page.locator("nav a");
    const navCount = await navLinks.count();
    results.push({
      name: "home_08_navigation",
      success: navCount > 0,
      navCount,
      message: `${navCount} navigation link(s) found`,
    });

    printResult("Homepage flow", { success: true });
  } catch (e) {
    results.push({ name: "home_error", success: false, error: e.message });
    printResult("Homepage flow", { success: false, error: e.message });
  } finally {
    await context.close();
  }
}

// ── Main ───────────────────────────────────────────────────────

const FLOWS = {
  register: flowRegister,
  login: flowLogin,
  homepage: flowHomepage,
  order: flowTradePage,
  trade: flowTradePage,
  wallet: flowWallet,
  verification: flowVerification,
  history: flowHistory,
};

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  🖱️  MMOMarket UI Interaction Tester            ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  const server = await checkServer();
  if (!server.reachable) {
    console.error(`❌ Server not reachable at ${BASE_URL}`);
    console.error(`   Start the server first: npm run dev`);
    process.exit(1);
  }
  console.log(`✅ Server at ${BASE_URL}\n`);

  const browser = await launchBrowser();
  const results = [];

  try {
    const flowsToRun = singleFlow ? { [singleFlow]: FLOWS[singleFlow] } : FLOWS;

    if (singleFlow && !FLOWS[singleFlow]) {
      console.error(`❌ Unknown flow: ${singleFlow}`);
      console.error(`   Available: ${Object.keys(FLOWS).join(", ")}`);
      process.exit(1);
    }

    for (const [name, fn] of Object.entries(flowsToRun)) {
      await fn(browser, results);
    }
  } finally {
    await browser.close();
  }

  // Save results
  const reportPath = outputPath("interactions", "interaction-report.json");
  writeFileSync(
    reportPath,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2),
  );

  const passed = results.filter((r) => r.success !== false).length;
  const failed = results.filter((r) => r.success === false).length;

  console.log("\n╔════════════════════════════════════════════════╗");
  console.log(`║  📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`║  📁 Screenshots: tools/output/interactions/`);
  console.log(`║  📄 Report: ${reportPath}`);
  console.log("╚════════════════════════════════════════════════╝");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
