-- AlterTable: Add missing columns to User
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add missing columns to Wallet
ALTER TABLE "Wallet" ADD COLUMN "escrowBRL" REAL NOT NULL DEFAULT 0;

-- AlterTable: Add missing columns to Trade
ALTER TABLE "Trade" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "Trade" ADD COLUMN "disputeReason" TEXT;
ALTER TABLE "Trade" ADD COLUMN "adminNote" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Trade_status_idx" ON "Trade"("status");
