-- Add pixKeyType column to Withdrawal table
ALTER TABLE "Withdrawal" ADD COLUMN "pixKeyType" TEXT;

-- Backfill pixKeyType from existing pixKey values (stored as "TYPE:value")
-- Extract the type prefix (everything before the first colon)
UPDATE "Withdrawal"
SET "pixKeyType" = CASE
  WHEN "pixKey" LIKE 'CPF:%'   THEN 'CPF'
  WHEN "pixKey" LIKE 'CNPJ:%'  THEN 'CNPJ'
  WHEN "pixKey" LIKE 'EMAIL:%' THEN 'EMAIL'
  WHEN "pixKey" LIKE 'PHONE:%' THEN 'PHONE'
  WHEN "pixKey" LIKE 'EVP:%'   THEN 'EVP'
  ELSE 'EVP'
END
WHERE "pixKey" IS NOT NULL;

-- Also strip the "TYPE:" prefix from pixKey so it stores only the key value going forward.
-- NOTE: New code stores only the key value in pixKey and the type in pixKeyType.
-- Existing rows still have the "TYPE:value" format — normalise them.
UPDATE "Withdrawal"
SET "pixKey" = SUBSTR("pixKey", INSTR("pixKey", ':') + 1)
WHERE "pixKey" LIKE '%:%';
