// tools/test-register.mjs
// Targeted test for the registration endpoint to capture exact error
const BASE = "http://localhost:3000";

async function main() {
  const email = `diag_${Date.now()}@test.com`;

  console.log("Testing registration with:", {
    name: "DiagTest",
    email,
    password: "test123456",
  });

  try {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "DiagTest", email, password: "test123456" }),
      signal: AbortSignal.timeout(15000),
    });

    console.log("Status:", res.status);
    console.log("Headers:", Object.fromEntries(res.headers.entries()));

    const text = await res.text();
    console.log("Body:", text);

    if (res.status === 201) {
      console.log("\n✅ Registration works!");

      // Now test login
      console.log("\nTesting login...");
      const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
      const { csrfToken } = await csrfRes.json();
      console.log("CSRF token:", csrfToken ? "obtained" : "MISSING");

      const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, email, password: "test123456" }),
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });

      console.log("Login status:", loginRes.status);
      const allCookies = loginRes.headers.getSetCookie?.() || [];
      console.log("Cookies received:", allCookies.length);
      allCookies.forEach((c, i) => console.log(`  Cookie ${i}:`, c));

      const hasSession = allCookies.some((c) => c.includes("session-token"));
      console.log("Has session token:", hasSession);

      if (hasSession) {
        const cookieHeader = allCookies.map((c) => c.split(";")[0]).join("; ");
        const sessRes = await fetch(`${BASE}/api/auth/session`, {
          headers: { Cookie: cookieHeader },
        });
        const session = await sessRes.json();
        console.log("Session:", JSON.stringify(session, null, 2));
      } else {
        console.log("\n❌ No session token in login response.");
        console.log(
          "Response headers:",
          Object.fromEntries(loginRes.headers.entries()),
        );
        // Try to read the body
        const loginBody = await loginRes.text();
        console.log("Login response body:", loginBody.substring(0, 500));
      }
    } else {
      console.log("\n❌ Registration failed with status", res.status);
    }
  } catch (e) {
    console.log("Error:", e.message);
    console.log(e.stack);
  }
}

main();
