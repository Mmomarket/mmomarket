/**
 * test-trade-flow.mjs
 *
 * End-to-end test of the full trading workflow (no dispute):
 *   1. Register seller + buyer accounts
 *   2. Inject BRL into buyer wallet directly via SQLite (bypasses MercadoPago)
 *   3. Fetch games → pick first currency + server
 *   4. Seller creates a SELL order
 *   5. Buyer creates a BUY order → auto-match creates a Trade
 *   6. Seller marks trade as DELIVERED
 *   7. Buyer confirms delivery → trade CONFIRMED, escrow released
 *
 * Run:
 *   node tools/test-trade-flow.mjs
 *
 * Requirements: dev server running at http://localhost:3000
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, "../dev.db");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// ─── Helpers ────────────────────────────────────────────────────────────────

const log = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const ok = (msg) => log("✅", msg);
const fail = (msg) => {
  console.error(`❌  ${msg}`);
  process.exit(1);
};
const info = (msg) => log("ℹ️ ", msg);
const section = (title) =>
  console.log(`\n${"─".repeat(55)}\n   ${title}\n${"─".repeat(55)}`);

async function request(path, { method = "GET", body, cookies } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (cookies) headers["Cookie"] = cookies;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

async function loginUser(email, password) {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookieRaw = csrfRes.headers.get("set-cookie") || "";
  const csrfCookie = csrfCookieRaw.split(";")[0];

  // 2. Post credentials
  const params = new URLSearchParams({ csrfToken, email, password });
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: params.toString(),
    redirect: "manual",
  });

  // 3. Collect session cookies
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookies = setCookies.map((c) => c.split(";")[0]).join("; ");
  const cookieHeader = [csrfCookie, sessionCookies].filter(Boolean).join("; ");

  // 4. Verify session
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieHeader },
  });
  const session = await sessionRes.json();
  return { cookieHeader, session, userId: session?.user?.id };
}

/**
 * Directly credit a wallet via better-sqlite3 (bypasses MercadoPago).
 * Creates the wallet row if it doesn't exist.
 */
function injectBRL(userId, amountBRL) {
  const db = new Database(DB_FILE);
  const id = `wallet_inject_${Date.now()}`;
  db.prepare(
    `
    INSERT INTO Wallet (id, userId, balanceBRL, frozenBRL, escrowBRL, createdAt, updatedAt)
    VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))
    ON CONFLICT(userId) DO UPDATE SET
      balanceBRL = balanceBRL + excluded.balanceBRL,
      updatedAt = datetime('now')
  `,
  ).run(id, userId, amountBRL);
  db.close();
}

// ─── Test users ─────────────────────────────────────────────────────────────

const SELLER = {
  email: `seller_${Date.now()}@test.mmo`,
  password: "Test@12345",
  name: "TestSeller",
};
const BUYER = {
  email: `buyer_${Date.now()}@test.mmo`,
  password: "Test@12345",
  name: "TestBuyer",
};

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🧪  MMOMarket — Full Trade Flow Test`);
  console.log(`   Target: ${BASE_URL}\n`);

  // ── 0. Server reachable? ──────────────────────────────────────────────────
  section("0. Server health");
  try {
    const { status } = await request("/api/auth/session");
    if (status !== 200) fail(`Server returned ${status} on /api/auth/session`);
    ok("Server is reachable");
  } catch (e) {
    fail(
      `Cannot reach ${BASE_URL} — is the dev server running? (${e.message})`,
    );
  }

  // ── 1. Register accounts ──────────────────────────────────────────────────
  section("1. Register seller + buyer");

  for (const [label, user] of [
    ["Seller", SELLER],
    ["Buyer", BUYER],
  ]) {
    const { status, data } = await request("/api/auth/register", {
      method: "POST",
      body: { email: user.email, password: user.password, name: user.name },
    });
    if (status === 201 || status === 200) {
      ok(`${label} registered: ${user.email}`);
    } else if (status === 409) {
      ok(`${label} already exists (409) — continuing`);
    } else {
      fail(`${label} registration failed: ${status} — ${JSON.stringify(data)}`);
    }
  }

  // ── 2. Login both users ───────────────────────────────────────────────────
  section("2. Login");

  const seller = await loginUser(SELLER.email, SELLER.password);
  if (!seller.userId)
    fail(`Seller login failed. Session: ${JSON.stringify(seller.session)}`);
  ok(`Seller logged in — userId: ${seller.userId}`);

  const buyer = await loginUser(BUYER.email, BUYER.password);
  if (!buyer.userId)
    fail(`Buyer login failed. Session: ${JSON.stringify(buyer.session)}`);
  ok(`Buyer logged in — userId: ${buyer.userId}`);

  // ── 3. Fetch games/currencies/servers ─────────────────────────────────────
  section("3. Fetch game catalogue");

  const { status: gStatus, data: games } = await request("/api/games", {
    cookies: seller.cookieHeader,
  });
  if (gStatus !== 200 || !Array.isArray(games) || games.length === 0) {
    fail(`GET /api/games failed: ${gStatus} — ${JSON.stringify(games)}`);
  }
  ok(`${games.length} game(s) found`);

  // Pick first game that has currencies and servers
  let chosenCurrencyId, chosenServerId, chosenGameName;
  for (const game of games) {
    if (game.currencies?.length && game.servers?.length) {
      chosenCurrencyId = game.currencies[0].id;
      chosenServerId = game.servers[0].id;
      chosenGameName = game.name;
      break;
    }
  }
  if (!chosenCurrencyId)
    fail("No game has both currencies and servers. Run the seed first.");
  ok(
    `Using game: "${chosenGameName}" | currency: ${chosenCurrencyId} | server: ${chosenServerId}`,
  );

  // ── 4. Inject BRL into buyer wallet ──────────────────────────────────────
  section("4. Inject R$ 200 into buyer wallet (sqlite3 direct)");

  try {
    injectBRL(buyer.userId, 200);
    ok(`Injected R$ 200.00 into buyer wallet`);
  } catch (e) {
    fail(`Wallet injection failed: ${e.message}`);
  }

  // Verify wallet via API
  const { data: walletData } = await request("/api/wallet", {
    cookies: buyer.cookieHeader,
  });
  info(`Buyer wallet balance: R$ ${walletData?.balanceBRL?.toFixed(2) ?? "?"}`);
  if (!walletData?.balanceBRL || walletData.balanceBRL < 100) {
    fail(`Buyer balance too low: ${JSON.stringify(walletData)}`);
  }

  // ── 5. Seller creates SELL order ──────────────────────────────────────────
  section("5. Seller creates SELL order (500 units @ R$0.20)");

  const AMOUNT = 500;
  const PRICE_PER_UNIT = 0.2;

  const { status: sellStatus, data: sellOrder } = await request("/api/orders", {
    method: "POST",
    cookies: seller.cookieHeader,
    body: {
      type: "SELL",
      currencyId: chosenCurrencyId,
      serverId: chosenServerId,
      amount: AMOUNT,
      pricePerUnit: PRICE_PER_UNIT,
    },
  });
  if (sellStatus !== 201) {
    fail(
      `SELL order creation failed: ${sellStatus} — ${JSON.stringify(sellOrder)}`,
    );
  }
  ok(`SELL order created: ${sellOrder.id} (status: ${sellOrder.status})`);

  // ── 6. Buyer creates BUY order → should auto-match ────────────────────────
  section(
    "6. Buyer creates BUY order (500 units @ R$0.20) → expects auto-match",
  );

  const { status: buyStatus, data: buyOrder } = await request("/api/orders", {
    method: "POST",
    cookies: buyer.cookieHeader,
    body: {
      type: "BUY",
      currencyId: chosenCurrencyId,
      serverId: chosenServerId,
      amount: AMOUNT,
      pricePerUnit: PRICE_PER_UNIT,
    },
  });
  if (buyStatus !== 201) {
    fail(
      `BUY order creation failed: ${buyStatus} — ${JSON.stringify(buyOrder)}`,
    );
  }
  ok(`BUY order created: ${buyOrder.id} (status: ${buyOrder.status})`);

  // ── 7. Find the resulting trade ───────────────────────────────────────────
  section("7. Find matched trade");

  const { status: tradeListStatus, data: trades } = await request(
    "/api/trades",
    {
      cookies: seller.cookieHeader,
    },
  );
  if (tradeListStatus !== 200 || !Array.isArray(trades)) {
    fail(
      `GET /api/trades failed: ${tradeListStatus} — ${JSON.stringify(trades)}`,
    );
  }

  // Find trade between these two users
  const trade = trades.find(
    (t) => t.sellerId === seller.userId && t.buyerId === buyer.userId,
  );
  if (!trade) {
    info(
      `All trades returned (seller POV): ${JSON.stringify(trades.map((t) => ({ id: t.id, sellerId: t.sellerId, buyerId: t.buyerId, status: t.status })))}`,
    );
    fail("Auto-match did not produce a trade between seller and buyer.");
  }
  ok(
    `Trade found: ${trade.id} | status: ${trade.status} | amount: ${trade.amount} | totalBRL: R$${Number(trade.totalBRL).toFixed(2)}`,
  );

  if (trade.status !== "PENDING_DELIVERY") {
    fail(`Expected trade status PENDING_DELIVERY, got: ${trade.status}`);
  }

  // ── 8. Seller marks as DELIVERED ──────────────────────────────────────────
  section("8. Seller marks trade as DELIVERED");

  const { status: deliverStatus, data: deliverData } = await request(
    `/api/trades/${trade.id}`,
    {
      method: "PATCH",
      cookies: seller.cookieHeader,
      body: { action: "MARK_DELIVERED" },
    },
  );
  if (deliverStatus !== 200) {
    fail(
      `MARK_DELIVERED failed: ${deliverStatus} — ${JSON.stringify(deliverData)}`,
    );
  }
  ok(`Trade marked as DELIVERED (status: ${deliverData.status})`);

  // ── 9. Buyer confirms delivery ────────────────────────────────────────────
  section("9. Buyer confirms delivery → CONFIRMED + escrow released");

  const { status: confirmStatus, data: confirmData } = await request(
    `/api/trades/${trade.id}`,
    {
      method: "PATCH",
      cookies: buyer.cookieHeader,
      body: { action: "CONFIRM" },
    },
  );
  if (confirmStatus !== 200) {
    fail(`CONFIRM failed: ${confirmStatus} — ${JSON.stringify(confirmData)}`);
  }
  ok(`Trade confirmed! Message: "${confirmData.message}"`);

  // ── 10. Verify final wallet states ────────────────────────────────────────
  section("10. Final wallet verification");

  const { data: sellerWallet } = await request("/api/wallet", {
    cookies: seller.cookieHeader,
  });
  const { data: buyerWallet } = await request("/api/wallet", {
    cookies: buyer.cookieHeader,
  });

  const totalBRL = AMOUNT * PRICE_PER_UNIT;
  const fee = totalBRL * 0.02; // 2% platform fee
  const sellerExpect = totalBRL - fee;

  info(
    `Seller balance: R$${Number(sellerWallet?.balanceBRL ?? 0).toFixed(2)} (expected ≥ R$${sellerExpect.toFixed(2)})`,
  );
  info(
    `Buyer escrow:   R$${Number(buyerWallet?.escrowBRL ?? 0).toFixed(2)} (expected R$0.00)`,
  );
  info(`Buyer balance:  R$${Number(buyerWallet?.balanceBRL ?? 0).toFixed(2)}`);

  if (Number(sellerWallet?.balanceBRL ?? 0) < sellerExpect - 0.01) {
    fail(`Seller didn't receive funds. Balance: ${sellerWallet?.balanceBRL}`);
  }
  ok("Seller received payment ✓");

  if (Number(buyerWallet?.escrowBRL ?? 0) !== 0) {
    fail(`Buyer escrow not cleared. escrowBRL: ${buyerWallet?.escrowBRL}`);
  }
  ok("Buyer escrow cleared ✓");

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(55)}`);
  console.log(`   🎉  All steps passed! Full trade flow works end-to-end.`);
  console.log(`${"═".repeat(55)}\n`);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
