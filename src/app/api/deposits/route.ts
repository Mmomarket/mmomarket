import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { createDepositPreference } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const depositSchema = z.object({
  amountBRL: z
    .number()
    .min(5, "Depósito mínimo: R$ 5,00")
    .max(50000, "Depósito máximo: R$ 50.000,00"),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const deposits = await prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(deposits);
  } catch (error) {
    console.error("Deposits GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar depósitos" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await req.json();
    const { amountBRL } = depositSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Create deposit record
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amountBRL,
        status: "PENDING",
      },
    });

    // Create MercadoPago preference
    try {
      const preference = await createDepositPreference({
        userId,
        userEmail: user.email,
        amountBRL,
        depositId: deposit.id,
      });

      await prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          mercadoPagoUrl: preference.initPoint || preference.sandboxInitPoint,
        },
      });

      return NextResponse.json(
        {
          deposit,
          paymentUrl: preference.initPoint || preference.sandboxInitPoint,
        },
        { status: 201 },
      );
    } catch (mpError) {
      console.error("MercadoPago error:", mpError);
      // Return deposit without payment URL (can be retried)
      return NextResponse.json(
        {
          deposit,
          error:
            "Erro ao criar pagamento. Configure MERCADOPAGO_ACCESS_TOKEN no .env",
          paymentUrl: null,
        },
        { status: 201 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Deposits POST error:", error);
    return NextResponse.json(
      { error: "Erro ao criar depósito" },
      { status: 500 },
    );
  }
}
