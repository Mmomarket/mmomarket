import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const withdrawalSchema = z.object({
  amountBRL: z
    .number()
    .min(10, "Saque mínimo: R$ 10,00")
    .max(50000, "Saque máximo: R$ 50.000,00"),
  pixKey: z.string().min(1, "Chave Pix é obrigatória"),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"], {
    message: "Tipo de chave Pix inválido",
  }),
});

// GET /api/withdrawals - List user's withdrawals
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Withdrawals GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar saques" },
      { status: 500 },
    );
  }
}

// POST /api/withdrawals - Request a new withdrawal
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await req.json();
    const { amountBRL, pixKey, pixKeyType } = withdrawalSchema.parse(body);

    // Check user has enough available balance
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balanceBRL < amountBRL) {
      return NextResponse.json(
        {
          error: `Saldo insuficiente. Disponível: R$ ${(wallet?.balanceBRL ?? 0).toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    // Check for any pending withdrawals (prevent abuse)
    const pendingCount = await prisma.withdrawal.count({
      where: {
        userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (pendingCount > 0) {
      return NextResponse.json(
        {
          error:
            "Você já tem um saque pendente. Aguarde o processamento antes de solicitar outro.",
        },
        { status: 400 },
      );
    }

    // Deduct balance immediately to prevent double-spending
    // and create the withdrawal record in a transaction
    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          balanceBRL: { decrement: amountBRL },
        },
      });

      return tx.withdrawal.create({
        data: {
          userId,
          amountBRL,
          pixKey: `${pixKeyType}:${pixKey}`,
          status: "PENDING",
        },
      });
    });

    return NextResponse.json(
      {
        withdrawal,
        message: "Saque solicitado com sucesso! Será processado em até 24h.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Withdrawals POST error:", error);
    return NextResponse.json(
      { error: "Erro ao solicitar saque" },
      { status: 500 },
    );
  }
}
