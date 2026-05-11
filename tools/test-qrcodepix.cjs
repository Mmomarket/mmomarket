const { QrCodePix } = require("qrcode-pix");

async function main() {
  const qr = QrCodePix({
    version: "01",
    key: "11111111111",
    name: "Fulano De Tal",
    city: "SAO PAULO",
    transactionId: "abc123",
    message: "Saque MMOMarket",
    value: 10.0,
  });
  const payload = qr.payload();
  console.log("qrcode-pix output:");
  console.log(payload);
  console.log();

  // Parse and show fields
  let i = 0;
  while (i < payload.length - 4) {
    const id = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    const val = payload.slice(i + 4, i + 4 + len);
    if (id === "26" || id === "62") {
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
}

main().catch(console.error);
