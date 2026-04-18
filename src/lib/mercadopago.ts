import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
});

const payment = new Payment(client);
const preference = new Preference(client);

export interface CreateDepositPayload {
  userId: string;
  userEmail: string;
  amountBRL: number;
  depositId: string;
}

export async function createDepositPreference(payload: CreateDepositPayload) {
  const { userId, userEmail, amountBRL, depositId } = payload;

  // DEBUG: Log the NEXTAUTH_URL value to help diagnose MercadoPago back_urls error
  console.log("[MercadoPago] Using NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

  const result = await preference.create({
    body: {
      items: [
        {
          id: depositId,
          title: "Depósito MMOMarket",
          description: `Depósito de ${amountBRL.toFixed(2)} BRL na carteira MMOMarket`,
          quantity: 1,
          unit_price: amountBRL,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: userEmail,
      },
      external_reference: depositId,
      metadata: {
        user_id: userId,
        deposit_id: depositId,
      },
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/carteira?deposit=success`,
        failure: `${process.env.NEXTAUTH_URL}/carteira?deposit=failure`,
        pending: `${process.env.NEXTAUTH_URL}/carteira?deposit=pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
    },
  });

  return {
    preferenceId: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}

export async function getPaymentInfo(paymentId: string) {
  const result = await payment.get({ id: paymentId });
  return result;
}

// ─── Withdrawal / Payout via MercadoPago PIX ─────────────────
// MercadoPago SDK v2 doesn't expose a disbursement client, so we
// call the REST API directly.  The endpoint used below is the
// "bank_transfer" method available for marketplace accounts.
// Requires the access token to have the `money_transfer` scope.
// See: https://www.mercadopago.com.br/developers/en/reference

export interface CreatePayoutPayload {
  withdrawalId: string;
  amountBRL: number;
  pixKey: string;
  pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP"; // EVP = random key
  description?: string;
}

export interface PayoutResult {
  id: number | string;
  status: string;
  statusDetail?: string;
  dateCreated?: string;
}

/**
 * Send a PIX payout via MercadoPago's payment creation with
 * `payment_method_id: "pix_transfer"`.
 *
 * This creates an outbound Pix transfer from your MercadoPago
 * account to the recipient's Pix key.
 *
 * NOTE: Your MercadoPago account must have the "money transfer"
 * permission enabled. In sandbox mode this will simulate success.
 */
export async function createPixPayout(
  payload: CreatePayoutPayload,
): Promise<PayoutResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  }

  // MercadoPago Pix Transfer via the /v1/payment_methods/bank_transfer endpoint
  // or via the standard payment creation with pix_transfer method.
  // We use the REST API directly since the SDK lacks this client.
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": payload.withdrawalId,
    },
    body: JSON.stringify({
      transaction_amount: payload.amountBRL,
      description:
        payload.description || `Saque MMOMarket #${payload.withdrawalId}`,
      payment_method_id: "pix_transfer",
      external_reference: payload.withdrawalId,
      point_of_interaction: {
        type: "PIX_TRANSFER",
        transaction_data: {
          bank_info: {
            pix_key: payload.pixKey,
            pix_key_type: payload.pixKeyType,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("MercadoPago payout error:", response.status, errorBody);
    throw new Error(
      `MercadoPago payout failed (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    statusDetail: data.status_detail,
    dateCreated: data.date_created,
  };
}

export { client, payment, preference };
