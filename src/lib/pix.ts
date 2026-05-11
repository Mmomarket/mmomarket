/**
 * Brazilian Pix BR Code (EMV) generator.
 * Spec: BACEN Manual de Padrões para Iniciação do Pix
 * https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function emv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Strip diacritics, uppercase, keep only chars allowed in EMV text fields. */
function sanitizeAscii(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .substring(0, max)
    .trim();
}

/**
 * Normalize a Pix key based on its type so banking apps accept it.
 *
 *  - CPF   → 11 digits only (strip dots/hyphens)
 *  - CNPJ  → 14 digits only (strip dots/hyphens/slashes)
 *  - PHONE → E.164 format: +55XXXXXXXXXXX
 *  - EMAIL → lowercase, trimmed
 *  - EVP   → keep as-is (UUID format)
 */
export function normalizePixKey(key: string, type: string): string {
  const t = type.toUpperCase();
  switch (t) {
    case "CPF":
      return key.replace(/\D/g, "").substring(0, 11);
    case "CNPJ":
      return key.replace(/\D/g, "").substring(0, 14);
    case "PHONE": {
      const digits = key.replace(/\D/g, "");
      if (key.trimStart().startsWith("+")) {
        return "+" + digits;
      }
      // If 13 digits and starts with 55, already has country code
      if (digits.length === 13 && digits.startsWith("55")) {
        return "+" + digits;
      }
      return "+55" + digits;
    }
    case "EMAIL":
      return key.trim().toLowerCase();
    case "EVP":
    default:
      return key.trim();
  }
}

export interface PixCodeParams {
  pixKey: string;
  pixKeyType?: string; // used for key normalization
  merchantName: string; // max 25 chars, will be uppercased automatically
  merchantCity: string; // max 15 chars, will be uppercased automatically
  amount: number;
  txId?: string; // max 25 chars, alphanumeric
  description?: string; // optional info field (max 72 chars)
}

export function generatePixCode(params: PixCodeParams): string {
  const {
    pixKey,
    pixKeyType = "EVP",
    merchantName,
    merchantCity,
    amount,
    txId,
    description,
  } = params;

  // Normalize the Pix key based on type
  const normalizedKey = normalizePixKey(pixKey, pixKeyType);

  // Sanitize text fields: strip accents, uppercase, ASCII only
  const name = sanitizeAscii(merchantName, 25) || "MMOMKT";
  const city = sanitizeAscii(merchantCity, 15) || "BRASIL";

  // txId: alphanumeric 1–25 chars. Use "***" for static (no specific tx).
  const rawTxId = txId
    ? txId.replace(/[^A-Za-z0-9]/g, "").substring(0, 25) || "***"
    : "***";

  // Amount: force 2 decimal places (works with Prisma Decimal or JS number)
  const amountStr = Number(amount).toFixed(2);

  // ID 26 — Merchant Account Information (Pix)
  const gui = emv("00", "BR.GOV.BCB.PIX");
  const keyField = emv("01", normalizedKey);
  const descField = description
    ? emv("02", sanitizeAscii(description, 72))
    : "";
  const merchantAccountInfo = emv("26", gui + keyField + descField);

  // ID 62 — Additional Data Field (transaction ID)
  const additionalData = emv("62", emv("05", rawTxId));

  // Assemble payload (all fields in ascending ID order)
  const payload =
    emv("00", "01") + // Payload format indicator
    merchantAccountInfo + // ID 26
    emv("52", "0000") + // ID 52: MCC (generic)
    emv("53", "986") + // ID 53: Currency BRL
    emv("54", amountStr) + // ID 54: Transaction amount
    emv("58", "BR") + // ID 58: Country code
    emv("59", name) + // ID 59: Merchant name (uppercase)
    emv("60", city) + // ID 60: Merchant city (uppercase)
    additionalData + // ID 62
    "6304"; // CRC tag (value appended below)

  return payload + crc16(payload);
}
