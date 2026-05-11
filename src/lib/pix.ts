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

export interface PixCodeParams {
  pixKey: string;
  merchantName: string; // max 25 chars
  merchantCity: string; // max 15 chars
  amount: number;
  txId?: string; // max 25 chars, alphanumeric
  description?: string; // additional info, max 72 chars
}

export function generatePixCode(params: PixCodeParams): string {
  const {
    pixKey,
    merchantName,
    merchantCity,
    amount,
    txId = "***",
    description,
  } = params;

  // Sanitize: strip diacritics and special chars (Pix spec requires ASCII)
  const sanitize = (s: string, max: number) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, "")
      .substring(0, max)
      .trim();

  const name = sanitize(merchantName, 25);
  const city = sanitize(merchantCity, 15);
  const safeTxId = txId
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 25)
    .padEnd(1, "1");

  // ID 26 — Merchant Account Information (Pix)
  const gui = emv("00", "BR.GOV.BCB.PIX");
  const key = emv("01", pixKey);
  const descField = description ? emv("02", sanitize(description, 72)) : "";
  const merchantAccountInfo = emv("26", gui + key + descField);

  // ID 62 — Additional Data Field
  const additionalData = emv("62", emv("05", safeTxId));

  // Build payload (without CRC)
  const payload =
    emv("00", "01") + // Payload format indicator
    merchantAccountInfo +
    emv("52", "0000") + // MCC (generic)
    emv("53", "986") + // Currency: BRL
    emv("54", amount.toFixed(2)) + // Amount
    emv("58", "BR") + // Country
    emv("59", name) + // Merchant name
    emv("60", city) + // Merchant city
    additionalData +
    "6304"; // CRC tag + length placeholder

  return payload + crc16(payload);
}
