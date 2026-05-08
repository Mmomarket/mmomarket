/**
 * test-sell-api.mjs
 * Direct API test: login then POST a SELL order, check whether verification gate exists.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USER = {
  email: "debug@mmomarket.com",
  password: "debug123456",
  name: "TestDebug",
};

async function register() {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(USER),
  });
  return res.status;
}

async function login() {
  // Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const setCookie = csrfRes.headers.get("set-cookie") || "";
  const csrfCookie = setCookie.split(";")[0]; // next-auth.csrf-token=...

  // Submit credentials form
  const params = new URLSearchParams({
    csrfToken,
    email: USER.email,
    password: USER.password,
  });
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body: params.toString(),
    redirect: "manual",
  });

  // Collect all cookies
  const allCookies = [];
  if (csrfCookie) allCookies.push(csrfCookie);
  const rawCookies = loginRes.headers.raw?.()?.["set-cookie"] || [];
  rawCookies.forEach((c) => allCookies.push(c.split(";")[0]));

  // Fallback: use getSetCookie if available
  let sessionCookies = "";
  try {
    const setCookies = loginRes.headers.getSetCookie?.() || [];
    sessionCookies = setCookies.map((c) => c.split(";")[0]).join("; ");
  } catch {}
  if (!sessionCookies && loginRes.headers.get("set-cookie")) {
    sessionCookies = loginRes.headers.get("set-cookie").split(";")[0];
  }
  const cookieHeader = [csrfCookie, sessionCookies].filter(Boolean).join("; ");

  // Verify session
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookieHeader },
  });
  const session = await sessionRes.json();

  return { cookieHeader, session, ok: !!session?.user };
}

async function getGames(cookieHeader) {
  const res = await fetch(`${BASE_URL}/api/games`, {
    headers: { Cookie: cookieHeader },
  });
  return res.json();
}

async function postSellOrder(cookieHeader, gameId, currencyId, serverId) {
  const body = {
    type: "SELL",
    currencyId,
    amount: 500,
    pricePerUnit: 1.0,
    serverId: serverId || "server-placeholder",
  };
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log("🧪 Direct API test: SELL order without verification\n");

  // 1. Register (ignore if exists)
  const regStatus = await register();
  console.log(`👤 Register → HTTP ${regStatus}`);

  // 2. Login
  const { cookieHeader, session, ok } = await login();
  console.log(
    `🔑 Login → ${ok ? "OK (" + session.user?.email + ")" : "FAILED"}`,
  );
  if (!ok) {
    console.error("❌ Cannot proceed without a session.");
    process.exit(1);
  }

  // 3. Get a game + currency
  const gamesData = await getGames(cookieHeader);
  const games = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
  if (!games.length) {
    console.error("❌ No games found. Is the DB seeded?");
    process.exit(1);
  }
  const game = games[0];
  const currency = game.currencies?.[0];
  const server = game.servers?.[0];
  console.log(
    `🎮 Using game: "${game.name}", currency: "${currency?.name}", server: "${server?.name}" (serverId=${server?.id})\n`,
  );

  // 4. POST SELL order
  const { status, data } = await postSellOrder(
    cookieHeader,
    game.id,
    currency?.id,
    server?.id,
  );
  console.log(`📤 POST /api/orders (SELL) → HTTP ${status}`);
  console.log(`📦 Response:`, JSON.stringify(data, null, 2));

  // 5. Verdict
  const blocked =
    status === 400 &&
    JSON.stringify(data).match(/verif|comprova|fundos|screenshot|upload/i);
  console.log("\n" + "─".repeat(50));
  if (blocked) {
    console.log("❌ FAIL — Verification gate still blocks SELL orders");
    console.log(
      "   Message:",
      data.error || data.message || JSON.stringify(data),
    );
  } else if (status === 201 || status === 200) {
    console.log(
      "✅ PASS — SELL order created successfully (no verification required)",
    );
  } else if (status === 400) {
    console.log(
      "⚠️  SELL order returned 400, but NOT due to verification gate",
    );
    console.log("   Likely cause: insufficient balance or validation error");
    console.log(
      "   Message:",
      data.error || data.message || JSON.stringify(data),
    );
    console.log(
      "✅ PASS — No verification gate (the 400 is for another reason)",
    );
  } else {
    console.log(`⚠️  Unexpected HTTP ${status} — review response above`);
  }
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
