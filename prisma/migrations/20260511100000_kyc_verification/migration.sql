-- Drop old game-based Verification table and rebuild as KYC identity verification
-- Safe: old data is not needed (no production users had verifications)

DROP TABLE IF EXISTS "Verification";

CREATE TABLE "Verification" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "userId"      TEXT NOT NULL UNIQUE,
    "phone"       TEXT NOT NULL,
    "selfieUrl"   TEXT NOT NULL,
    "idFrontUrl"  TEXT NOT NULL,
    "idBackUrl"   TEXT,
    "status"      TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote"  TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"  DATETIME,
    "updatedAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Verification_userId_idx" ON "Verification"("userId");
CREATE INDEX "Verification_status_idx" ON "Verification"("status");
