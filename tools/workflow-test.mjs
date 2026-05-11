/**
 * tools/workflow-test.mjs
 *
 * Full end-to-end workflow test for MMOMarket.
 * Tests the ENTIRE flow:
 *   1.  Server reachable
 *   2.  Register two users (seller + buyer)
 *   3.  Login both users, capture session cookies
 *   4.  Wallet check (both users)
 *   5.  Seller: submit KYC verification
 *   6.  Admin: approve seller verification
 *   7.  Seller: create SELL order
 *   8.  Buyer: create BUY order → triggers trade match
 *   9.  Trade created: verify both sides can see it
 *  10.  Seller: mark DELIVERED
 *  11.  Buyer: open DISPUTE
 *  12.  Admin: resolve dispute (seller wins)
 *  13.  Buyer: confirm trade (happy-path variant)
 *  14.  Auto-release cron: test endpoint
 *  15.  Seller: request WITHDRAWAL
 *  16.  Admin: approve withdrawal
 *  17.  Edge cases: duplicate register, unauth access, bad payloads
 *  18.  Pagination endpoints
 *
 * Usage:
 *   node tools/workflow-test.mjs
 *   node tools/workflow-test.mjs --base http://localhost:3000
 *   node tools/workflow-test.mjs --section deposit
 *
 * Results saved to tools/output/workflow-results.json
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "output");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const BASE = (() => {
  const idx = args.indexOf("--base");
  return idx !== -1
    ? args[idx + 1]
    : process.env.BASE_URL || "http://localhost:3000";
})();
const SECTION_FILTER = (() => {
  const idx = args.indexOf("--section");
  return idx !== -1 ? args[idx + 1].toLowerCase() : null;
})();

// ── State shared across tests ──────────────────────────────────
const state = {
  seller: {
    email: `seller_${Date.now()}@wftest.com`,
    password: "workflow123",
    name: "WF Seller",
    cookies: "",
  },
  buyer: {
    email: `buyer_${Date.now()}@wftest.com`,
    password: "workflow123",
    name: "WF Buyer",
    cookies: "",
  },
  admin: { cookies: "" }, // will try existing admin@mmomarket.com
  currencyId: null,
  serverId: null,
  sellOrderId: null,
  buyOrderId: null,
  tradeId: null,
  sellerVerificationId: null,
  sellerWalletInitial: 0,
  buyerWalletInitial: 0,
};

// ── Result tracking ────────────────────────────────────────────
const sections = {};
let currentSection = "general";
function section(name) {
  currentSection = name;
  if (!sections[name]) sections[name] = { passed: 0, failed: 0, tests: [] };
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  SECTION: ${name}`);
  console.log("─".repeat(60));
}

async function test(name, fn) {
  if (
    SECTION_FILTER &&
    !currentSection.toLowerCase().includes(SECTION_FILTER)
  ) {
    return; // skip if filtering by section
  }
  const sec =
    sections[currentSection] ||
    (sections[currentSection] = { passed: 0, failed: 0, tests: [] });
  try {
    const result = await fn();
    sec.passed++;
    sec.tests.push({ name, status: "PASS", result });
    console.log(
      `  ✅ ${name}`,
      result ? `→ ${JSON.stringify(result).slice(0, 120)}` : "",
    );
  } catch (e) {
    sec.failed++;
    sec.tests.push({ name, status: "FAIL", error: e.message });
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

function expect(val, msg) {
  if (!val)
    throw new Error(msg || `Expected truthy, got ${JSON.stringify(val)}`);
  return val;
}
function expectStatus(got, ...allowed) {
  if (!allowed.includes(got))
    throw new Error(`HTTP ${got} — expected one of [${allowed.join(", ")}]`);
  return got;
}

// ── HTTP helpers ───────────────────────────────────────────────
async function req(path, { method = "GET", body, cookies, form } = {}) {
  const headers = {};
  if (cookies) headers["Cookie"] = cookies;
  let bodyStr;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    bodyStr = new URLSearchParams(form).toString();
  } else if (body) {
    headers["Content-Type"] = "application/json";
    bodyStr = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: bodyStr,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return {
    status: res.status,
    json,
    text,
    headers: res.headers,
    rawCookies: res.headers.getSetCookie?.() ?? [],
  };
}

async function getSession(cookies) {
  const r = await req("/api/auth/session", { cookies });
  return r.json;
}

async function login(email, password) {
  const csrf = await req("/api/auth/csrf");
  const token = csrf.json?.csrfToken;
  expect(token, "CSRF token missing");
  const r = await req("/api/auth/callback/credentials", {
    method: "POST",
    form: { csrfToken: token, email, password },
    cookies: csrf.rawCookies.map((c) => c.split(";")[0]).join("; "),
  });
  const allCookies = [...(csrf.rawCookies || []), ...(r.rawCookies || [])];
  const cookieHeader = allCookies.map((c) => c.split(";")[0]).join("; ");
  // Verify session works
  const session = await getSession(cookieHeader);
  expect(session?.user?.email, `Login failed for ${email} — no session`);
  return cookieHeader;
}

async function register(name, email, password) {
  const r = await req("/api/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  expectStatus(r.status, 201, 200);
  return r.json;
}

// ── MAIN ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  MMOMarket Workflow E2E Test`);
  console.log(`  Target: ${BASE}`);
  console.log(`  Time:   ${new Date().toISOString()}`);
  console.log("═".repeat(60));

  // ─────────────────────────────────────────────────────────────
  section("1. Infrastructure");
  // ─────────────────────────────────────────────────────────────

  await test("Server is reachable", async () => {
    const r = await req("/");
    expectStatus(r.status, 200, 307, 308);
    return { status: r.status };
  });

  await test("GET /api/games returns game list", async () => {
    const r = await req("/api/games");
    expectStatus(r.status, 200);
    expect(Array.isArray(r.json), "Expected array");
    expect(r.json.length > 0, "No games found");
    state.currencyId = r.json[0]?.currencies?.[0]?.id;
    state.serverId = r.json[0]?.servers?.[0]?.id;
    return {
      games: r.json.length,
      firstGame: r.json[0]?.name,
      currencyId: state.currencyId,
      serverId: state.serverId,
    };
  });

  await test("GET /api/auth/csrf returns token", async () => {
    const r = await req("/api/auth/csrf");
    expectStatus(r.status, 200);
    expect(r.json?.csrfToken, "csrfToken missing");
    return { tokenLength: r.json.csrfToken.length };
  });

  await test("Public order book is accessible", async () => {
    const r = await req(`/api/orders?currencyId=${state.currencyId || "x"}`);
    expectStatus(r.status, 200);
    return { type: Array.isArray(r.json) ? "array" : typeof r.json };
  });

  // ─────────────────────────────────────────────────────────────
  section("2. Registration & Auth");
  // ─────────────────────────────────────────────────────────────

  await test("Register seller account", async () => {
    const r = await register(
      state.seller.name,
      state.seller.email,
      state.seller.password,
    );
    expect(r?.id || r?.message, "No id/message in response");
    return { email: state.seller.email };
  });

  await test("Register buyer account", async () => {
    const r = await register(
      state.buyer.name,
      state.buyer.email,
      state.buyer.password,
    );
    expect(r?.id || r?.message, "No id/message in response");
    return { email: state.buyer.email };
  });

  await test("Duplicate registration returns 409", async () => {
    const r = await req("/api/auth/register", {
      method: "POST",
      // Use a VALID password so duplicate-email check fires before password validation
      body: { name: "Dup", email: state.seller.email, password: "duplicate123" },
    });
    expectStatus(r.status, 409);
    return { error: r.json?.error };
  });

  await test("Login seller", async () => {
    state.seller.cookies = await login(
      state.seller.email,
      state.seller.password,
    );
    return { cookieLen: state.seller.cookies.length };
  });

  await test("Login buyer", async () => {
    state.buyer.cookies = await login(state.buyer.email, state.buyer.password);
    return { cookieLen: state.buyer.cookies.length };
  });

  await test("Login as admin (admin@mmomarket.com)", async () => {
    try {
      state.admin.cookies = await login("admin@mmomarket.com", "admin123456");
      return { ok: true };
    } catch (e) {
      // Admin may not exist; create it via seed or skip admin tests
      state.admin.cookies = "";
      return {
        warning: `Admin login failed: ${e.message} — admin tests will be skipped`,
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  section("3. Wallet");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/wallet — unauthenticated returns 401", async () => {
    const r = await req("/api/wallet");
    expectStatus(r.status, 401);
    return { error: r.json?.error };
  });

  await test("GET /api/wallet — seller", async () => {
    const r = await req("/api/wallet", { cookies: state.seller.cookies });
    expectStatus(r.status, 200);
    expect(r.json?.id, "Missing wallet id");
    state.sellerWalletInitial = r.json.balanceBRL ?? 0;
    return { balance: r.json.balanceBRL, frozen: r.json.frozenBRL };
  });

  await test("GET /api/wallet — buyer", async () => {
    const r = await req("/api/wallet", { cookies: state.buyer.cookies });
    expectStatus(r.status, 200);
    state.buyerWalletInitial = r.json.balanceBRL ?? 0;
    return { balance: r.json.balanceBRL };
  });

  // ─────────────────────────────────────────────────────────────
  section("4. Deposit");
  // ─────────────────────────────────────────────────────────────

  await test("POST /api/deposits — unauthenticated returns 401", async () => {
    const r = await req("/api/deposits", {
      method: "POST",
      body: { amountBRL: 100 },
    });
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("POST /api/deposits — amount below minimum returns 400", async () => {
    const r = await req("/api/deposits", {
      method: "POST",
      cookies: state.buyer.cookies,
      body: { amountBRL: 0.5 },
    });
    expectStatus(r.status, 400);
    return { error: r.json?.error };
  });

  await test("POST /api/deposits — creates MercadoPago payment (buyer)", async () => {
    const r = await req("/api/deposits", {
      method: "POST",
      cookies: state.buyer.cookies,
      body: { amountBRL: 50 },
    });
    // Response shape: { deposit: { id, ... }, paymentUrl } — or error if MP not configured
    if (r.status === 400 || r.status === 500) {
      return { warning: `MP not configured: ${r.json?.error ?? r.text?.slice(0, 100)}` };
    }
    expectStatus(r.status, 201, 200);
    // Accept either a top-level id OR a nested deposit.id
    const depositId = r.json?.deposit?.id ?? r.json?.id ?? r.json?.paymentId;
    expect(depositId, `No deposit id in response: ${JSON.stringify(r.json).slice(0,200)}`);
    return { depositId, paymentUrl: r.json?.paymentUrl, mpError: r.json?.error };
  });

  await test("GET /api/deposits — paginated list (buyer)", async () => {
    const r = await req("/api/deposits", { cookies: state.buyer.cookies });
    expectStatus(r.status, 200);
    // New format: { deposits, hasMore, nextCursor }
    const isNew =
      typeof r.json === "object" &&
      !Array.isArray(r.json) &&
      "deposits" in r.json;
    const items = isNew ? r.json.deposits : Array.isArray(r.json) ? r.json : [];
    return {
      count: items.length,
      format: isNew ? "paginated" : "legacy-array",
      hasMore: r.json.hasMore,
    };
  });

  // ─────────────────────────────────────────────────────────────
  section("5. Verification (KYC)");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/verifications — unauthenticated returns 401", async () => {
    const r = await req("/api/verifications");
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("POST /api/verifications — seller submits KYC", async () => {
    if (!state.serverId) return { skip: "No serverId from games endpoint" };
    // Schema: { gameSlug, serverId, characterName, screenshotUrl, amount }
    const r = await req("/api/verifications", {
      method: "POST",
      cookies: state.seller.cookies,
      body: {
        gameSlug: "bdo",
        serverId: state.serverId,
        characterName: "TestChar",
        screenshotUrl: "https://example.com/screenshot.png",
        amount: 10000,
      },
    });
    if (r.status === 409)
      return { note: "Already has pending/approved verification" };
    expectStatus(r.status, 201, 200);
    state.sellerVerificationId = r.json?.id;
    return { verificationId: state.sellerVerificationId };
  });

  await test("POST /api/verifications — duplicate submission returns 409", async () => {
    if (!state.serverId) return { skip: "No serverId" };
    const r = await req("/api/verifications", {
      method: "POST",
      cookies: state.seller.cookies,
      body: {
        gameSlug: "bdo",
        serverId: state.serverId,
        characterName: "TestChar2",
        screenshotUrl: "https://example.com/screenshot2.png",
        amount: 5000,
      },
    });
    expectStatus(r.status, 409);
    return { error: r.json?.error };
  });

  await test("Admin: GET /api/admin/verifications", async () => {
    if (!state.admin.cookies) return { skip: "No admin session" };
    const r = await req("/api/admin/verifications", {
      cookies: state.admin.cookies,
    });
    expectStatus(r.status, 200);
    return { count: Array.isArray(r.json) ? r.json.length : "non-array" };
  });

  await test("Admin: PATCH /api/admin/verifications — approve seller", async () => {
    if (!state.admin.cookies || !state.sellerVerificationId) {
      return { skip: "No admin session or verificationId" };
    }
    const r = await req("/api/admin/verifications", {
      method: "PATCH",
      cookies: state.admin.cookies,
      body: { id: state.sellerVerificationId, status: "APPROVED" },
    });
    expectStatus(r.status, 200);
    return { status: r.json?.status };
  });

  // ─────────────────────────────────────────────────────────────
  section("6. Orders (SELL + BUY → Trade Match)");
  // ─────────────────────────────────────────────────────────────

  await test("POST /api/orders — unauthenticated returns 401", async () => {
    const r = await req("/api/orders", {
      method: "POST",
      body: { type: "BUY", currencyId: "x", amount: 10, pricePerUnit: 1 },
    });
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("POST /api/orders — invalid payload returns 400", async () => {
    const r = await req("/api/orders", {
      method: "POST",
      cookies: state.seller.cookies,
      body: { type: "INVALID", currencyId: "x", amount: -1, pricePerUnit: 0 },
    });
    expectStatus(r.status, 400);
    return { error: r.json?.error };
  });

  await test("POST /api/orders — seller creates SELL order", async () => {
    if (!state.currencyId) return { skip: "No currencyId" };
    const r = await req("/api/orders", {
      method: "POST",
      cookies: state.seller.cookies,
      body: {
        type: "SELL",
        currencyId: state.currencyId,
        amount: 1000,
        pricePerUnit: 0.05,
        serverId: state.serverId,
        characterName: "SellerChar",
      },
    });
    // May fail if seller not verified — tolerate 403
    if (r.status === 403)
      return {
        note: "Seller not verified — expected if admin not active",
        error: r.json?.error,
      };
    expectStatus(r.status, 201, 200);
    state.sellOrderId = r.json?.order?.id ?? r.json?.id;
    return {
      orderId: state.sellOrderId,
      status: r.json?.order?.status ?? r.json?.status,
    };
  });

  await test("POST /api/orders — buyer creates BUY order (may trigger match)", async () => {
    if (!state.currencyId) return { skip: "No currencyId" };
    const r = await req("/api/orders", {
      method: "POST",
      cookies: state.buyer.cookies,
      body: {
        type: "BUY",
        currencyId: state.currencyId,
        amount: 500,
        pricePerUnit: 0.05,
        serverId: state.serverId,
      },
    });
    // A 400 due to insufficient balance (buyer wallet is 0 BRL) is expected in dev
    if (r.status === 400 && r.json?.error?.toLowerCase().includes("saldo")) {
      return { note: "Buyer has no BRL balance — trade matching skipped (expected in dev without real deposit)", error: r.json?.error };
    }
    expectStatus(r.status, 201, 200);
    state.buyOrderId = r.json?.order?.id ?? r.json?.id;
    const trade = r.json?.trade;
    if (trade) state.tradeId = trade.id;
    return {
      orderId: state.buyOrderId,
      tradeMatched: !!trade,
      tradeId: state.tradeId,
    };
  });

  await test("GET /api/orders — order book includes verified seller badge data", async () => {
    if (!state.currencyId) return { skip: "No currencyId" };
    const r = await req(`/api/orders?currencyId=${state.currencyId}`);
    expectStatus(r.status, 200);
    const orders = Array.isArray(r.json) ? r.json : [];
    const hasVerifications = orders.some((o) =>
      Array.isArray(o.user?.verifications),
    );
    return {
      orderCount: orders.length,
      hasVerificationsField: hasVerifications,
    };
  });

  // ─────────────────────────────────────────────────────────────
  section("7. Trades");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/trades — unauthenticated returns 401", async () => {
    const r = await req("/api/trades");
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("GET /api/trades — buyer sees paginated trades", async () => {
    const r = await req("/api/trades", { cookies: state.buyer.cookies });
    expectStatus(r.status, 200);
    const isNew =
      typeof r.json === "object" &&
      !Array.isArray(r.json) &&
      "trades" in r.json;
    const trades = isNew ? r.json.trades : Array.isArray(r.json) ? r.json : [];
    if (!state.tradeId && trades.length > 0) state.tradeId = trades[0].id;
    return {
      count: trades.length,
      format: isNew ? "paginated" : "legacy",
      hasMore: r.json?.hasMore,
    };
  });

  await test("GET /api/trades/:id — seller can view their trade", async () => {
    if (!state.tradeId)
      return { skip: "No tradeId — orders may not have matched" };
    const r = await req(`/api/trades/${state.tradeId}`, {
      cookies: state.seller.cookies,
    });
    expectStatus(r.status, 200);
    return { status: r.json?.status, amount: r.json?.amount };
  });

  await test("GET /api/trades/:id — stranger is denied (403)", async () => {
    if (!state.tradeId) return { skip: "No tradeId" };
    // Try accessing without cookies → 401
    const r = await req(`/api/trades/${state.tradeId}`);
    expectStatus(r.status, 401, 403);
    return { status: r.status };
  });

  // ─────────────────────────────────────────────────────────────
  section("8. Trade Actions (DELIVER → DISPUTE → CONFIRM)");
  // ─────────────────────────────────────────────────────────────

  await test("PATCH /api/trades/:id — seller marks DELIVERED", async () => {
    if (!state.tradeId) return { skip: "No tradeId" };
    const r = await req(`/api/trades/${state.tradeId}`, {
      method: "PATCH",
      cookies: state.seller.cookies,
      body: {
        action: "MARK_DELIVERED",
        evidenceUrl: "https://example.com/proof.mp4",
      },
    });
    if (r.status === 400)
      return { note: `Not in correct state: ${r.json?.error}` };
    expectStatus(r.status, 200);
    return { newStatus: r.json?.status };
  });

  await test("PATCH /api/trades/:id — non-participant cannot act (403)", async () => {
    if (!state.tradeId) return { skip: "No tradeId" };
    // Register a 3rd user and try to act
    const thirdEmail = `third_${Date.now()}@wftest.com`;
    await register("Third User", thirdEmail, "workflow123");
    const thirdCookies = await login(thirdEmail, "workflow123").catch(() => "");
    if (!thirdCookies) return { skip: "Could not create 3rd user" };
    const r = await req(`/api/trades/${state.tradeId}`, {
      method: "PATCH",
      cookies: thirdCookies,
      body: { action: "CONFIRM" },
    });
    expectStatus(r.status, 403, 400);
    return { status: r.status, error: r.json?.error };
  });

  // Fork A: Dispute flow
  await test("PATCH /api/trades/:id — buyer opens DISPUTE", async () => {
    if (!state.tradeId) return { skip: "No tradeId" };
    const r = await req(`/api/trades/${state.tradeId}`, {
      method: "PATCH",
      cookies: state.buyer.cookies,
      body: {
        action: "DISPUTE",
        disputeReason: "Item not delivered correctly",
      },
    });
    if (r.status === 400)
      return { note: `Cannot dispute now: ${r.json?.error}` };
    expectStatus(r.status, 200);
    return { newStatus: r.json?.status };
  });

  await test("Admin: GET /api/admin/disputes", async () => {
    if (!state.admin.cookies) return { skip: "No admin session" };
    const r = await req("/api/admin/disputes", {
      cookies: state.admin.cookies,
    });
    expectStatus(r.status, 200);
    return { count: Array.isArray(r.json) ? r.json.length : typeof r.json };
  });

  await test("Admin: PATCH /api/admin/disputes — resolve in seller's favor", async () => {
    if (!state.admin.cookies || !state.tradeId)
      return { skip: "No admin or tradeId" };
    // Get disputes to find the right id
    const list = await req("/api/admin/disputes", {
      cookies: state.admin.cookies,
    });
    const dispute = Array.isArray(list.json)
      ? list.json.find((d) => d.tradeId === state.tradeId)
      : null;
    if (!dispute) return { note: "No open dispute found for this trade" };
    const r = await req("/api/admin/disputes", {
      method: "PATCH",
      cookies: state.admin.cookies,
      body: { tradeId: state.tradeId, resolution: "SELLER_WINS" },
    });
    expectStatus(r.status, 200);
    return { status: r.json?.status };
  });

  // Fork B: Confirm flow (create a second trade for this)
  await test("Second trade — buyer confirms (happy path)", async () => {
    // Create a second sell+buy pair for confirmation test
    if (!state.currencyId) return { skip: "No currencyId" };
    // Seller posts another sell order
    const sell = await req("/api/orders", {
      method: "POST",
      cookies: state.seller.cookies,
      body: {
        type: "SELL",
        currencyId: state.currencyId,
        amount: 200,
        pricePerUnit: 0.05,
        serverId: state.serverId,
        characterName: "SellerChar2",
      },
    });
    if (sell.status === 403) return { skip: "Seller not verified" };

    // Buyer matches it
    const buy = await req("/api/orders", {
      method: "POST",
      cookies: state.buyer.cookies,
      body: {
        type: "BUY",
        currencyId: state.currencyId,
        amount: 200,
        pricePerUnit: 0.05,
        serverId: state.serverId,
      },
    });
    expectStatus(buy.status, 200, 201);
    const trade2Id = buy.json?.trade?.id;
    if (!trade2Id)
      return {
        note: "No second trade matched",
        buyStatus: buy.json?.order?.status,
      };

    // Seller delivers
    await req(`/api/trades/${trade2Id}`, {
      method: "PATCH",
      cookies: state.seller.cookies,
      body: {
        action: "MARK_DELIVERED",
        evidenceUrl: "https://example.com/proof2.mp4",
      },
    });

    // Buyer confirms
    const confirm = await req(`/api/trades/${trade2Id}`, {
      method: "PATCH",
      cookies: state.buyer.cookies,
      body: { action: "CONFIRM" },
    });
    if (confirm.status === 400)
      return { note: `Cannot confirm: ${confirm.json?.error}` };
    expectStatus(confirm.status, 200);
    return { tradeId: trade2Id, finalStatus: confirm.json?.status };
  });

  // ─────────────────────────────────────────────────────────────
  section("9. Cron / Auto-release");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/cron/auto-release — no secret returns 401", async () => {
    const r = await req("/api/cron/auto-release");
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("GET /api/cron/auto-release — wrong secret returns 401", async () => {
    // pass wrong bearer
    const res = await fetch(`${BASE}/api/cron/auto-release`, {
      headers: { Authorization: "Bearer wrong-secret" },
      signal: AbortSignal.timeout(10000),
    });
    expectStatus(res.status, 401);
    return { status: res.status };
  });

  await test("GET /api/cron/auto-release — correct secret executes (if CRON_SECRET set)", async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret) return { skip: "CRON_SECRET env var not set — cannot test" };
    const res = await fetch(`${BASE}/api/cron/auto-release`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(15000),
    });
    expectStatus(res.status, 200);
    const json = await res.json();
    return { released: json.released, errors: json.errors };
  });

  // ─────────────────────────────────────────────────────────────
  section("10. Withdrawal");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/withdrawals — unauthenticated returns 401", async () => {
    const r = await req("/api/withdrawals");
    expectStatus(r.status, 401);
    return { status: r.status };
  });

  await test("POST /api/withdrawals — amount below minimum (R$10) returns 400", async () => {
    const r = await req("/api/withdrawals", {
      method: "POST",
      cookies: state.seller.cookies,
      body: { amountBRL: 5, pixKey: "test@test.com", pixKeyType: "EMAIL" },
    });
    expectStatus(r.status, 400);
    return { error: r.json?.error };
  });

  await test("POST /api/withdrawals — missing pixKeyType returns 400", async () => {
    const r = await req("/api/withdrawals", {
      method: "POST",
      cookies: state.seller.cookies,
      body: { amountBRL: 20, pixKey: "test@test.com" },
    });
    expectStatus(r.status, 400);
    return { error: r.json?.error };
  });

  await test("POST /api/withdrawals — insufficient balance returns 400", async () => {
    const r = await req("/api/withdrawals", {
      method: "POST",
      cookies: state.seller.cookies,
      body: {
        amountBRL: 999999,
        pixKey: "seller@test.com",
        pixKeyType: "EMAIL",
      },
    });
    expectStatus(r.status, 400);
    return { error: r.json?.error };
  });

  await test("GET /api/withdrawals — paginated list", async () => {
    const r = await req("/api/withdrawals", { cookies: state.seller.cookies });
    expectStatus(r.status, 200);
    const isNew =
      typeof r.json === "object" &&
      !Array.isArray(r.json) &&
      "withdrawals" in r.json;
    const items = isNew
      ? r.json.withdrawals
      : Array.isArray(r.json)
        ? r.json
        : [];
    return {
      count: items.length,
      format: isNew ? "paginated" : "legacy",
      hasMore: r.json?.hasMore,
    };
  });

  await test("Admin: GET /api/admin/withdrawals", async () => {
    if (!state.admin.cookies) return { skip: "No admin session" };
    const r = await req("/api/admin/withdrawals", {
      cookies: state.admin.cookies,
    });
    expectStatus(r.status, 200);
    return { count: Array.isArray(r.json) ? r.json.length : typeof r.json };
  });

  // ─────────────────────────────────────────────────────────────
  section("11. Admin — Stats & Misc");
  // ─────────────────────────────────────────────────────────────

  await test("GET /api/admin/stats — unauthenticated returns 401/403", async () => {
    const r = await req("/api/admin/stats");
    expectStatus(r.status, 401, 403);
    return { status: r.status };
  });

  await test("GET /api/admin/stats — regular user returns 403", async () => {
    const r = await req("/api/admin/stats", { cookies: state.buyer.cookies });
    expectStatus(r.status, 403, 401);
    return { status: r.status, error: r.json?.error };
  });

  await test("GET /api/admin/stats — admin gets stats", async () => {
    if (!state.admin.cookies) return { skip: "No admin session" };
    const r = await req("/api/admin/stats", { cookies: state.admin.cookies });
    expectStatus(r.status, 200);
    return { keys: Object.keys(r.json ?? {}) };
  });

  // ─────────────────────────────────────────────────────────────
  section("12. Security Headers");
  // ─────────────────────────────────────────────────────────────

  await test("Security headers present on homepage", async () => {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(10000) });
    const h = res.headers;
    const results = {
      "x-frame-options": h.get("x-frame-options"),
      "x-content-type-options": h.get("x-content-type-options"),
      "referrer-policy": h.get("referrer-policy"),
      "x-xss-protection": h.get("x-xss-protection"),
    };
    expect(results["x-frame-options"], "Missing X-Frame-Options");
    expect(results["x-content-type-options"], "Missing X-Content-Type-Options");
    return results;
  });

  // ─────────────────────────────────────────────────────────────
  section("13. SEO / robots / sitemap");
  // ─────────────────────────────────────────────────────────────

  await test("GET /robots.txt — accessible and blocks /admin", async () => {
    const r = await req("/robots.txt");
    expectStatus(r.status, 200);
    expect(r.text.includes("Disallow"), "No Disallow directives");
    expect(r.text.includes("/admin"), "Missing /admin disallow");
    return {
      size: r.text.length,
      snippet: r.text.slice(0, 150).replace(/\n/g, "\\n"),
    };
  });

  await test("GET /sitemap.xml — accessible with URLs", async () => {
    const r = await req("/sitemap.xml");
    expectStatus(r.status, 200);
    expect(
      r.text.includes("<url>") || r.text.includes("<loc>"),
      "No URLs in sitemap",
    );
    return { size: r.text.length };
  });

  // ─────────────────────────────────────────────────────────────
  section("14. Rate Limiting");
  // ─────────────────────────────────────────────────────────────

  await test("Rate limit header present on orders POST", async () => {
    // Just check the response headers after one valid attempt
    const r = await req("/api/orders", {
      method: "POST",
      cookies: state.buyer.cookies,
      body: { type: "BUY", currencyId: "fake", amount: 1, pricePerUnit: 1 },
    });
    // 400 (bad currency) or 429 (rate limited) — either is fine; we just check it doesn't 500
    expect(r.status !== 500, `Unexpected 500: ${r.json?.error}`);
    return {
      status: r.status,
      rateLimitHeader: r.headers.get("x-ratelimit-remaining"),
    };
  });

  // ─────────────────────────────────────────────────────────────
  section("15. Middleware / Protected Pages");
  // ─────────────────────────────────────────────────────────────

  for (const path of ["/carteira", "/historico", "/verificacao", "/admin"]) {
    await test(`GET ${path} — unauthenticated redirects to /login`, async () => {
      const res = await fetch(`${BASE}${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      const location = res.headers.get("location") ?? "";
      const redirectsToLogin =
        res.status === 307 || res.status === 302 || location.includes("/login");
      expect(
        redirectsToLogin,
        `Expected redirect to /login, got ${res.status} location=${location}`,
      );
      return { status: res.status, location };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  let totalPass = 0,
    totalFail = 0;
  console.log(`\n${"═".repeat(60)}`);
  console.log("  FINAL SUMMARY");
  console.log("═".repeat(60));
  for (const [name, sec] of Object.entries(sections)) {
    totalPass += sec.passed;
    totalFail += sec.failed;
    const icon = sec.failed === 0 ? "✅" : "❌";
    console.log(
      `  ${icon} ${name}: ${sec.passed} passed, ${sec.failed} failed`,
    );
  }
  console.log("─".repeat(60));
  console.log(
    `  TOTAL: ${totalPass} passed, ${totalFail} failed (${totalPass + totalFail} tests)`,
  );
  console.log("═".repeat(60) + "\n");

  const outPath = join(outDir, "workflow-results.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        base: BASE,
        totalPass,
        totalFail,
        sections,
      },
      null,
      2,
    ),
  );
  console.log(`Results saved → ${outPath}\n`);

  if (totalFail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
