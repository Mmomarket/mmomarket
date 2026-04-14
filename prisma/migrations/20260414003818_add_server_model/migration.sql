-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Server_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "serverId" TEXT,
    "amount" REAL NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalBRL" REAL NOT NULL,
    "filledAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "server" TEXT,
    "characterName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "buyerId" TEXT,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amount", "buyerId", "characterName", "createdAt", "currencyId", "filledAmount", "id", "pricePerUnit", "server", "status", "totalBRL", "type", "updatedAt", "userId") SELECT "amount", "buyerId", "characterName", "createdAt", "currencyId", "filledAmount", "id", "pricePerUnit", "server", "status", "totalBRL", "type", "updatedAt", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_currencyId_status_idx" ON "Order"("currencyId", "status");
CREATE INDEX "Order_type_status_idx" ON "Order"("type", "status");
CREATE INDEX "Order_serverId_idx" ON "Order"("serverId");
CREATE TABLE "new_PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currencyId" TEXT NOT NULL,
    "serverId" TEXT,
    "avgPrice" REAL NOT NULL,
    "minPrice" REAL NOT NULL,
    "maxPrice" REAL NOT NULL,
    "volume" REAL NOT NULL,
    "volumeBRL" REAL NOT NULL,
    "period" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PriceHistory" ("avgPrice", "createdAt", "currencyId", "id", "maxPrice", "minPrice", "period", "timestamp", "volume", "volumeBRL") SELECT "avgPrice", "createdAt", "currencyId", "id", "maxPrice", "minPrice", "period", "timestamp", "volume", "volumeBRL" FROM "PriceHistory";
DROP TABLE "PriceHistory";
ALTER TABLE "new_PriceHistory" RENAME TO "PriceHistory";
CREATE INDEX "PriceHistory_currencyId_period_timestamp_idx" ON "PriceHistory"("currencyId", "period", "timestamp");
CREATE INDEX "PriceHistory_serverId_idx" ON "PriceHistory"("serverId");
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "serverId" TEXT,
    "amount" REAL NOT NULL,
    "pricePerUnit" REAL NOT NULL,
    "totalBRL" REAL NOT NULL,
    "feeBRL" REAL NOT NULL,
    "sellerReceive" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_DELIVERY',
    "deliveredAt" DATETIME,
    "disputeReason" TEXT,
    "adminNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("adminNote", "amount", "buyerId", "createdAt", "currencyId", "deliveredAt", "disputeReason", "feeBRL", "id", "orderId", "pricePerUnit", "sellerId", "sellerReceive", "status", "totalBRL", "updatedAt") SELECT "adminNote", "amount", "buyerId", "createdAt", "currencyId", "deliveredAt", "disputeReason", "feeBRL", "id", "orderId", "pricePerUnit", "sellerId", "sellerReceive", "status", "totalBRL", "updatedAt" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_currencyId_idx" ON "Trade"("currencyId");
CREATE INDEX "Trade_status_idx" ON "Trade"("status");
CREATE INDEX "Trade_serverId_idx" ON "Trade"("serverId");
CREATE TABLE "new_Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "serverId" TEXT,
    "server" TEXT,
    "characterName" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Verification_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Verification" ("amount", "characterName", "createdAt", "gameSlug", "id", "reviewNote", "screenshotUrl", "server", "status", "updatedAt", "userId") SELECT "amount", "characterName", "createdAt", "gameSlug", "id", "reviewNote", "screenshotUrl", "server", "status", "updatedAt", "userId" FROM "Verification";
DROP TABLE "Verification";
ALTER TABLE "new_Verification" RENAME TO "Verification";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Server_gameId_idx" ON "Server"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Server_slug_gameId_key" ON "Server"("slug", "gameId");
