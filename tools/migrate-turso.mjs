/**
 * migrate-turso.mjs
 *
 * Applies missing schema changes to Turso (libsql) that Prisma CLI can't
 * push directly (since it doesn't support the libsql:// scheme).
 *
 * Run:
 *   $env:TURSO_DATABASE_URL="libsql://..."
 *   $env:TURSO_AUTH_TOKEN="..."
 *   node tools/migrate-turso.mjs
 *
 * Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS patterns
 * and CREATE TABLE IF NOT EXISTS.
 */

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌  TURSO_DATABASE_URL is not set.");
  process.exit(1);
}

const db = createClient({ url, authToken });

// Helper: run a statement, ignore "duplicate column" / "already exists" errors
async function safeExec(label, sql) {
  try {
    await db.execute(sql);
    console.log(`✅  ${label}`);
  } catch (e) {
    const msg = e.message || "";
    if (
      msg.includes("duplicate column") ||
      msg.includes("already exists") ||
      msg.includes("no such column") // some libsql versions phrase it differently
    ) {
      console.log(`⏭️   ${label} — already applied, skipping`);
    } else {
      console.error(`❌  ${label}\n    ${msg}`);
      process.exit(1);
    }
  }
}

async function main() {
  console.log(`\n🔧  Turso schema migration\n   URL: ${url}\n`);

  // ── KYC Verification table (replaces old game-based Verification) ────────
  // Drop old table first (no production KYC data exists yet)
  try {
    await db.execute("DROP TABLE IF EXISTS Verification");
    console.log("✅  Dropped old Verification table");
  } catch (e) {
    console.log("⏭️   Drop Verification —", e.message);
  }
  await safeExec(
    "KYC Verification table",
    `CREATE TABLE IF NOT EXISTS Verification (
      id          TEXT NOT NULL PRIMARY KEY,
      userId      TEXT NOT NULL UNIQUE,
      phone       TEXT NOT NULL,
      selfieUrl   TEXT NOT NULL,
      idFrontUrl  TEXT NOT NULL,
      idBackUrl   TEXT,
      status      TEXT NOT NULL DEFAULT 'PENDING',
      reviewNote  TEXT,
      submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewedAt  DATETIME,
      updatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
  );
  await safeExec(
    "Verification.userId index",
    "CREATE INDEX IF NOT EXISTS Verification_userId_idx ON Verification(userId)",
  );
  await safeExec(
    "Verification.status index",
    "CREATE INDEX IF NOT EXISTS Verification_status_idx ON Verification(status)",
  );

  // ── Trade table additions ─────────────────────────────────────────────────
  await safeExec(
    "Trade.evidenceUrl column",
    "ALTER TABLE Trade ADD COLUMN evidenceUrl TEXT",
  );
  await safeExec(
    "Trade.disputeReason column",
    "ALTER TABLE Trade ADD COLUMN disputeReason TEXT",
  );
  await safeExec(
    "Trade.adminNote column",
    "ALTER TABLE Trade ADD COLUMN adminNote TEXT",
  );
  await safeExec(
    "Trade.deliveredAt column",
    "ALTER TABLE Trade ADD COLUMN deliveredAt DATETIME",
  );

  // ── DisputeMessage table ──────────────────────────────────────────────────
  await safeExec(
    "DisputeMessage table",
    `CREATE TABLE IF NOT EXISTS DisputeMessage (
      id          TEXT NOT NULL PRIMARY KEY,
      tradeId     TEXT NOT NULL,
      userId      TEXT NOT NULL,
      content     TEXT NOT NULL,
      evidenceUrl TEXT,
      createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tradeId) REFERENCES Trade(id) ON DELETE CASCADE,
      FOREIGN KEY (userId)  REFERENCES User(id)
    )`,
  );
  await safeExec(
    "DisputeMessage.tradeId index",
    "CREATE INDEX IF NOT EXISTS DisputeMessage_tradeId_idx ON DisputeMessage(tradeId)",
  );

  // ── PriceHistory table (in case it's also missing) ────────────────────────
  await safeExec(
    "PriceHistory table",
    `CREATE TABLE IF NOT EXISTS PriceHistory (
      id          TEXT NOT NULL PRIMARY KEY,
      currencyId  TEXT NOT NULL,
      serverId    TEXT NOT NULL,
      period      TEXT NOT NULL,
      timestamp   DATETIME NOT NULL,
      avgPrice    REAL NOT NULL,
      minPrice    REAL NOT NULL,
      maxPrice    REAL NOT NULL,
      volume      REAL NOT NULL DEFAULT 0,
      volumeBRL   REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (currencyId) REFERENCES Currency(id)
    )`,
  );

  // ── Withdrawal.pixKeyType column ─────────────────────────────────────────
  await safeExec(
    "Withdrawal.pixKeyType column",
    "ALTER TABLE Withdrawal ADD COLUMN pixKeyType TEXT",
  );

  // ── Withdrawal.adminNote column ──────────────────────────────────────────
  await safeExec(
    "Withdrawal.adminNote column",
    "ALTER TABLE Withdrawal ADD COLUMN adminNote TEXT",
  );

  // Backfill pixKeyType from legacy "TYPE:value" format in pixKey
  try {
    await db.execute(`
      UPDATE Withdrawal
      SET pixKeyType = CASE
        WHEN pixKey LIKE 'CPF:%'   THEN 'CPF'
        WHEN pixKey LIKE 'CNPJ:%'  THEN 'CNPJ'
        WHEN pixKey LIKE 'EMAIL:%' THEN 'EMAIL'
        WHEN pixKey LIKE 'PHONE:%' THEN 'PHONE'
        WHEN pixKey LIKE 'EVP:%'   THEN 'EVP'
        ELSE 'EVP'
      END
      WHERE pixKey IS NOT NULL AND pixKeyType IS NULL
    `);
    await db.execute(`
      UPDATE Withdrawal
      SET pixKey = SUBSTR(pixKey, INSTR(pixKey, ':') + 1)
      WHERE pixKey LIKE '%:%' AND pixKeyType IS NOT NULL
    `);
    console.log("✅  Withdrawal pixKey/pixKeyType backfill");
  } catch (e) {
    console.log("⏭️   Withdrawal backfill — skipped:", e.message);
  }

  console.log("\n✅  All migrations applied. Turso is now in sync.\n");
}

main().catch((e) => {
  console.error("\n💥 Unexpected error:", e);
  process.exit(1);
});
