import { getPaymentInfo } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // MercadoPago sends different types of notifications
    if (body.type === "payment" || body.action === "payment.updated") {
      const paymentId = body.data?.id || body.id;

      if (!paymentId) {
        return NextResponse.json({ received: true });
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
        await prisma.wallet.update({
          where: { userId: deposit.userId },
          data: {
            balanceBRL: { increment: deposit.amountBRL },
          },
        });
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
