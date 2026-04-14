// tools/fix-db.mjs
// Applies missing columns to the SQLite database
import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", "dev.db");

console.log("Opening database:", dbPath);
const db = new Database(dbPath);

// Check current state
console.log("\n── Current User columns:");
const userCols = db.pragma("table_info('User')").map((c) => c.name);
console.log("  ", userCols.join(", "));

console.log("\n── Current Wallet columns:");
const walletCols = db.pragma("table_info('Wallet')").map((c) => c.name);
console.log("  ", walletCols.join(", "));

console.log("\n── Current Trade columns:");
const tradeCols = db.pragma("table_info('Trade')").map((c) => c.name);
console.log("  ", tradeCols.join(", "));

// Apply fixes
let changes = 0;

if (!userCols.includes("isAdmin")) {
  console.log("\n✏️  Adding User.isAdmin...");
  db.exec(
    `ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false`,
  );
  changes++;
} else {
  console.log("\n✅ User.isAdmin already exists");
}

if (!walletCols.includes("escrowBRL")) {
  console.log("✏️  Adding Wallet.escrowBRL...");
  db.exec(
    `ALTER TABLE "Wallet" ADD COLUMN "escrowBRL" REAL NOT NULL DEFAULT 0`,
  );
  changes++;
} else {
  console.log("✅ Wallet.escrowBRL already exists");
}

if (!tradeCols.includes("deliveredAt")) {
  console.log("✏️  Adding Trade.deliveredAt...");
  db.exec(`ALTER TABLE "Trade" ADD COLUMN "deliveredAt" DATETIME`);
  changes++;
} else {
  console.log("✅ Trade.deliveredAt already exists");
}

if (!tradeCols.includes("disputeReason")) {
  console.log("✏️  Adding Trade.disputeReason...");
  db.exec(`ALTER TABLE "Trade" ADD COLUMN "disputeReason" TEXT`);
  changes++;
} else {
  console.log("✅ Trade.disputeReason already exists");
}

if (!tradeCols.includes("adminNote")) {
  console.log("✏️  Adding Trade.adminNote...");
  db.exec(`ALTER TABLE "Trade" ADD COLUMN "adminNote" TEXT`);
  changes++;
} else {
  console.log("✅ Trade.adminNote already exists");
}

// Add index
try {
  db.exec(`CREATE INDEX IF NOT EXISTS "Trade_status_idx" ON "Trade"("status")`);
  console.log("✏️  Added Trade status index");
} catch (e) {
  console.log("✅ Trade status index already exists");
}

// Record migration in _prisma_migrations table
const migrationName = "20260414000000_add_missing_columns";
const existing = db
  .prepare(`SELECT id FROM _prisma_migrations WHERE migration_name = ?`)
  .get(migrationName);
if (!existing) {
  db.prepare(
    `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count) VALUES (?, ?, ?, datetime('now'), 1)`,
  ).run(crypto.randomUUID(), "manual-fix", migrationName);
  console.log("\n📝 Recorded migration in _prisma_migrations");
}

// Verify
console.log("\n── After fix - User columns:");
console.log(
  "  ",
  db
    .pragma("table_info('User')")
    .map((c) => c.name)
    .join(", "),
);
console.log("── After fix - Wallet columns:");
console.log(
  "  ",
  db
    .pragma("table_info('Wallet')")
    .map((c) => c.name)
    .join(", "),
);
console.log("── After fix - Trade columns:");
console.log(
  "  ",
  db
    .pragma("table_info('Trade')")
    .map((c) => c.name)
    .join(", "),
);

db.close();
console.log(
  `\n✅ Done! Applied ${changes} changes. Restart the dev server for changes to take effect.`,
);
