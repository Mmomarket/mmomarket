/**
 * Email notifications via Resend (https://resend.com).
 * Set RESEND_API_KEY in .env to enable.
 * If the key is missing all send calls are silently no-ops so the app works
 * without email configured.
 *
 * Also set EMAIL_FROM to your verified sender, e.g. "MMOMarket <noreply@mmomarket.com.br>"
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "MMOMarket <noreply@mmomarket.com.br>";
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return; // silently skip if not configured

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[email] Failed to send "${subject}" to ${to}: ${err}`);
    }
  } catch (err) {
    console.error("[email] Network error:", err);
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function sendTradeMatchedEmail(
  buyerEmail: string,
  sellerEmail: string,
  opts: {
    gameName: string;
    currencyCode: string;
    amount: number;
    totalBRL: number;
    tradeId: string;
  },
) {
  const tradeUrl = `${BASE_URL}/historico`;
  const subject = `🎮 Trade criado — ${opts.gameName} ${opts.currencyCode}`;
  const body = `
    <p>Um novo trade foi criado automaticamente!</p>
    <ul>
      <li><strong>Jogo:</strong> ${opts.gameName}</li>
      <li><strong>Moeda:</strong> ${opts.currencyCode}</li>
      <li><strong>Quantidade:</strong> ${opts.amount.toLocaleString("pt-BR")}</li>
      <li><strong>Total:</strong> R$ ${opts.totalBRL.toFixed(2)}</li>
    </ul>
    <p><a href="${tradeUrl}">Ver no MMOMarket →</a></p>
  `;
  await Promise.all([
    sendEmail(
      buyerEmail,
      subject,
      `<p>Sua ordem de compra foi correspondida!</p>${body}`,
    ),
    sendEmail(
      sellerEmail,
      subject,
      `<p>Sua ordem de venda foi correspondida! Entregue as moedas para o comprador.</p>${body}`,
    ),
  ]);
}

export async function sendDeliveryMarkedEmail(
  buyerEmail: string,
  opts: { gameName: string; currencyCode: string; tradeId: string },
) {
  const tradeUrl = `${BASE_URL}/historico`;
  await sendEmail(
    buyerEmail,
    `✅ Vendedor marcou entrega — confirme no MMOMarket`,
    `
    <p>O vendedor marcou as moedas de <strong>${opts.gameName} (${opts.currencyCode})</strong> como entregues.</p>
    <p>Por favor, confirme o recebimento ou abra uma disputa dentro de <strong>48 horas</strong>.</p>
    <p>Após 48h sem ação, o pagamento é liberado automaticamente para o vendedor.</p>
    <p><a href="${tradeUrl}">Confirmar agora →</a></p>
    `,
  );
}

export async function sendDisputeOpenedEmail(
  adminEmail: string,
  opts: { tradeId: string; openedByName: string; reason: string },
) {
  const adminUrl = `${BASE_URL}/admin`;
  await sendEmail(
    adminEmail,
    `⚠️ Nova disputa aberta — Trade ${opts.tradeId.slice(-8)}`,
    `
    <p><strong>${opts.openedByName}</strong> abriu uma disputa.</p>
    <p><strong>Motivo:</strong> ${opts.reason}</p>
    <p><a href="${adminUrl}">Resolver no painel admin →</a></p>
    `,
  );
}

export async function sendDisputeResolvedEmail(
  recipientEmail: string,
  opts: {
    resolution: "RELEASE_TO_SELLER" | "REFUND_TO_BUYER";
    adminNote?: string;
  },
) {
  const friendly =
    opts.resolution === "RELEASE_TO_SELLER"
      ? "Pagamento liberado para o vendedor"
      : "Reembolso enviado para o comprador";
  await sendEmail(
    recipientEmail,
    `🛡️ Disputa resolvida — ${friendly}`,
    `
    <p>A disputa foi resolvida pelo admin.</p>
    <p><strong>Decisão:</strong> ${friendly}</p>
    ${opts.adminNote ? `<p><strong>Nota:</strong> ${opts.adminNote}</p>` : ""}
    <p><a href="${BASE_URL}/historico">Ver histórico →</a></p>
    `,
  );
}

export async function sendVerificationResultEmail(
  userEmail: string,
  opts: {
    status: "APPROVED" | "REJECTED";
    gameSlug: string;
    reviewNote?: string;
  },
) {
  const approved = opts.status === "APPROVED";
  await sendEmail(
    userEmail,
    approved
      ? `✅ Verificação aprovada — ${opts.gameSlug}`
      : `❌ Verificação rejeitada — ${opts.gameSlug}`,
    `
    <p>Sua solicitação de verificação para <strong>${opts.gameSlug}</strong> foi <strong>${approved ? "aprovada" : "rejeitada"}</strong>.</p>
    ${opts.reviewNote ? `<p><strong>Nota do admin:</strong> ${opts.reviewNote}</p>` : ""}
    ${approved ? `<p>Você já pode criar ordens de venda! <a href="${BASE_URL}/negociar">Negociar agora →</a></p>` : ""}
    `,
  );
}

export async function sendDepositApprovedEmail(
  userEmail: string,
  amountBRL: number,
) {
  await sendEmail(
    userEmail,
    `💰 Depósito aprovado — ${amountBRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    `
    <p>Seu depósito de <strong>R$ ${amountBRL.toFixed(2)}</strong> foi aprovado e creditado na sua carteira.</p>
    <p><a href="${BASE_URL}/carteira">Ver carteira →</a></p>
    `,
  );
}
