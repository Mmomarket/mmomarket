function crc16(str) {
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
function emv(id, value) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}
function generatePixCode({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txId = "***",
  description,
}) {
  const sanitize = (s, max) =>
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
  const gui = emv("00", "BR.GOV.BCB.PIX");
  const key = emv("01", pixKey);
  const descField = description ? emv("02", sanitize(description, 72)) : "";
  const merchantAccountInfo = emv("26", gui + key + descField);
  const additionalData = emv("62", emv("05", safeTxId));
  const payload =
    emv("00", "01") +
    merchantAccountInfo +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", amount.toFixed(2)) +
    emv("58", "BR") +
    emv("59", name) +
    emv("60", city) +
    additionalData +
    "6304";
  return payload + crc16(payload);
}

const code = generatePixCode({
  pixKey: "11111111111",
  merchantName: "FULANO DE TAL",
  merchantCity: "SAO PAULO",
  amount: 10.0,
  txId: "abc123",
  description: "Saque MMOMarket",
});
console.log("GENERATED CODE:");
console.log(code);
console.log();

// Parse fields
const str = code;
let i = 0;
while (i < str.length - 4) {
  const id = str.slice(i, i + 2);
  const len = parseInt(str.slice(i + 2, i + 4), 10);
  const val = str.slice(i + 4, i + 4 + len);
  if (id === "26" || id === "62") {
    // Parse sub-fields
    console.log(`ID ${id} [${len}]: (composite)`);
    let j = 0;
    while (j < val.length) {
      const sid = val.slice(j, j + 2);
      const slen = parseInt(val.slice(j + 2, j + 4), 10);
      const sval = val.slice(j + 4, j + 4 + slen);
      console.log(`  SubID ${sid} [${slen}]: ${sval}`);
      j += 4 + slen;
    }
  } else {
    console.log(`ID ${id} [${len}]: ${val}`);
  }
  i += 4 + len;
}

// Verify CRC
const payloadForCrc = str.slice(0, -4);
const computedCrc = crc16(payloadForCrc);
console.log();
console.log("Payload ends with '6304':", payloadForCrc.endsWith("6304"));
console.log("Computed CRC:", computedCrc, "| Embedded:", str.slice(-4));
console.log("CRC valid:", computedCrc === str.slice(-4));

// Compare against known-good from https://pix.nascent.com.br/
// Known good for CPF 11111111111, R$10.00, name FULANO DE TAL, city SAO PAULO, no txid
// We'll use this reference: 00020126330014BR.GOV.BCB.PIX011112345678901520400005303986540510.005802BR5913FULANO DE TAL6009BRASILIA62070503***63041D3D
// Let's just verify our CRC logic against a known payload
const knownPayload =
  "00020126330014BR.GOV.BCB.PIX011112345678901520400005303986540510.005802BR5913FULANO DE TAL6009BRASILIA62070503***6304";
const knownCrc = crc16(knownPayload);
console.log();
console.log("Known payload CRC (should be 1D3D):", knownCrc);
