import { sendDepositApprovedEmail } from "@/lib/email";
import { getPaymentInfo } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

/**
 * Verify the MercadoPago webhook signature.
 * https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks
 *
 * MP sends: x-signature: ts=<timestamp>,v1=<hmac>
 * MP sends: x-request-id: <uuid>
 * The signed string is: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
function verifyMercadoPagoSignature(req: Request, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret configured, skip verification (dev mode only — warn loudly)
    console.warn(
      "⚠️  MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature check",
    );
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) return false;

  // Parse ts and v1 from "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return expected === v1;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // MercadoPago sends different types of notifications
    if (body.type === "payment" || body.action === "payment.updated") {
      const paymentId = body.data?.id || body.id;

      if (!paymentId) {
        return NextResponse.json({ received: true });
      }

      // Verify signature before doing anything
      if (!verifyMercadoPagoSignature(req, String(paymentId))) {
        console.error("Webhook signature mismatch — rejecting");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const paymentInfo = await getPaymentInfo(String(paymentId));
      const externalRef = paymentInfo.external_reference;

      if (!externalRef) {
        return NextResponse.json({ received: true });
      }

      const deposit = await prisma.deposit.findUnique({
        where: { id: externalRef },
      });

      if (!deposit) {
        return NextResponse.json({ received: true });
      }

      if (paymentInfo.status === "approved" && deposit.status !== "APPROVED") {
        // Update deposit status
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: "APPROVED",
            mercadoPagoId: String(paymentId),
          },
        });

        // Credit user wallet
        const user = await prisma.user.findUnique({
          where: { id: deposit.userId },
          select: { email: true },
        });
        await prisma.wallet.update({
          where: { userId: deposit.userId },
          data: {
            balanceBRL: { increment: deposit.amountBRL },
          },
        });

        // Notify user (non-blocking)
        if (user?.email) {
          sendDepositApprovedEmail(user.email, deposit.amountBRL).catch(
            () => {},
          );
        }
      } else if (paymentInfo.status === "rejected") {
        await prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: "REJECTED",
            mercadoPagoId: String(paymentId),
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
