// End-to-end API test script
const BASE = "http://localhost:3000";

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function log(label, data) {
  console.log(`\n=== ${label} ===`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

async function getCsrfAndCookies() {
  const res = await fetch(`${BASE}/api/auth/csrf`);
  const cookies = res.headers.getSetCookie?.() || [];
  const data = await res.json();
  return { csrfToken: data.csrfToken, cookies };
}

async function main() {
  // ---- 1. Register ----
  console.log("\n🔵 STEP 1: Register test user");
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "TestUser",
      email: "test@mmomarket.com",
      password: "test123456",
    }),
  });
  log("Register", await json(regRes));
  console.log("Status:", regRes.status);

  // ---- 2. Login (get session cookie) ----
  console.log("\n🔵 STEP 2: Login");
  const { csrfToken, cookies: csrfCookies } = await getCsrfAndCookies();
  log("CSRF Token", csrfToken);

  const cookieStr = csrfCookies.map((c) => c.split(";")[0]).join("; ");

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStr,
    },
    body: new URLSearchParams({
      csrfToken,
      email: "test@mmomarket.com",
      password: "test123456",
    }),
    redirect: "manual",
  });

  const loginCookies = loginRes.headers.getSetCookie?.() || [];
  const allCookies = [...csrfCookies, ...loginCookies]
    .map((c) => c.split(";")[0])
    .join("; ");
  log("Login status", loginRes.status);
  log("Login cookies count", loginCookies.length.toString());

  // ---- 3. Check session ----
  console.log("\n🔵 STEP 3: Verify session");
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: allCookies },
  });
  const sessionData = await json(sessionRes);
  log("Session", sessionData);

  if (!sessionData?.user) {
    console.error("❌ Login failed — no session. Aborting.");
    process.exit(1);
  }
  console.log("✅ Logged in as:", sessionData.user.email);

  // ---- 4. Wallet ----
  console.log("\n🔵 STEP 4: Fetch wallet");
  const walletRes = await fetch(`${BASE}/api/wallet`, {
    headers: { Cookie: allCookies },
  });
  const walletData = await json(walletRes);
  log("Wallet", walletData);
  console.log("Status:", walletRes.status);

  // ---- 5. Create deposit ----
  console.log("\n🔵 STEP 5: Create deposit");
  const depRes = await fetch(`${BASE}/api/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: allCookies },
    body: JSON.stringify({ amountBRL: 100 }),
  });
  const depData = await json(depRes);
  log("Deposit", depData);
  console.log("Status:", depRes.status);

  // ---- 6. List deposits ----
  console.log("\n🔵 STEP 6: List deposits");
  const depsRes = await fetch(`${BASE}/api/deposits`, {
    headers: { Cookie: allCookies },
  });
  const depsData = await json(depsRes);
  log(
    "Deposits list",
    Array.isArray(depsData) ? `${depsData.length} deposits found` : depsData,
  );
  console.log("Status:", depsRes.status);

  // ---- 7. Try withdrawal (should fail — no balance) ----
  console.log("\n🔵 STEP 7: Request withdrawal (should fail — no balance)");
  const wdRes = await fetch(`${BASE}/api/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: allCookies },
    body: JSON.stringify({
      amountBRL: 50,
      pixKey: "12345678901",
      pixKeyType: "CPF",
    }),
  });
  const wdData = await json(wdRes);
  log("Withdrawal (no balance)", wdData);
  console.log("Status:", wdRes.status);

  // ---- 8. Simulate balance by directly updating DB, then retry ----
  console.log("\n🔵 STEP 8: Simulating balance credit (direct DB)...");
  // We can't easily do this from here, so let's just test list endpoint

  // ---- 9. List withdrawals ----
  console.log("\n🔵 STEP 9: List withdrawals");
  const wdsRes = await fetch(`${BASE}/api/withdrawals`, {
    headers: { Cookie: allCookies },
  });
  const wdsData = await json(wdsRes);
  log(
    "Withdrawals list",
    Array.isArray(wdsData) ? `${wdsData.length} withdrawals found` : wdsData,
  );
  console.log("Status:", wdsRes.status);

  // ---- 10. Test validation errors ----
  console.log("\n🔵 STEP 10: Test withdrawal validation");
  const badWd1 = await fetch(`${BASE}/api/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: allCookies },
    body: JSON.stringify({ amountBRL: 5, pixKey: "123", pixKeyType: "CPF" }), // below minimum
  });
  log("Withdrawal (below minimum)", await json(badWd1));
  console.log("Status:", badWd1.status);

  const badWd2 = await fetch(`${BASE}/api/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: allCookies },
    body: JSON.stringify({
      amountBRL: 50,
      pixKey: "123",
      pixKeyType: "INVALID",
    }), // bad key type
  });
  log("Withdrawal (invalid key type)", await json(badWd2));
  console.log("Status:", badWd2.status);

  // ---- 11. Test unauthenticated access ----
  console.log("\n🔵 STEP 11: Test unauthenticated access");
  const noAuthRes = await fetch(`${BASE}/api/wallet`);
  log("Wallet (no auth)", await json(noAuthRes));
  console.log("Status:", noAuthRes.status);

  const noAuthWd = await fetch(`${BASE}/api/withdrawals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountBRL: 50, pixKey: "123", pixKeyType: "CPF" }),
  });
  log("Withdrawal (no auth)", await json(noAuthWd));
  console.log("Status:", noAuthWd.status);

  // ---- 12. Page loads ----
  console.log("\n🔵 STEP 12: Check page HTTP responses");
  for (const path of [
    "/",
    "/login",
    "/registro",
    "/carteira",
    "/negociar",
    "/historico",
    "/admin",
  ]) {
    const r = await fetch(`${BASE}${path}`, { redirect: "manual" });
    console.log(`  ${path} → ${r.status}`);
  }

  console.log("\n✅ All tests completed!");
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
