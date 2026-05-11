import {
  forbiddenResponse,
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import { createPixPayout } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/withdrawals - List all withdrawal requests (admin only)
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const withdrawals = await prisma.withdrawal.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Admin withdrawals GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar saques" },
      { status: 500 },
    );
  }
}

const processSchema = z.object({
  withdrawalId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
});

// PATCH /api/admin/withdrawals - Approve or reject a withdrawal
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const body = await req.json();
    const { withdrawalId, action } = processSchema.parse(body);

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { select: { email: true } } },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Saque não encontrado" },
        { status: 404 },
      );
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: `Saque já foi processado (${withdrawal.status})` },
        { status: 400 },
      );
    }

    if (action === "REJECT") {
      // Refund the balance back to the user and mark as rejected
      await prisma.$transaction([
        prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: "REJECTED" },
        }),
        prisma.wallet.update({
          where: { userId: withdrawal.userId },
          data: {
            balanceBRL: { increment: withdrawal.amountBRL },
          },
        }),
      ]);

      return NextResponse.json({
        message: "Saque rejeitado. Saldo devolvido ao usuário.",
      });
    }

    // APPROVE — attempt MercadoPago payout
    // Mark as PROCESSING first
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "PROCESSING" },
    });

    // Parse pixKey — new rows store type in pixKeyType, legacy rows store "TYPE:value"
    const pixKeyTypeStored = withdrawal.pixKeyType as
      | "CPF"
      | "CNPJ"
      | "EMAIL"
      | "PHONE"
      | "EVP"
      | null;

    let pixKey = withdrawal.pixKey || "";
    let pixKeyType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "EVP" =
      pixKeyTypeStored || "EVP";

    // Legacy format fallback: "TYPE:value"
    if (!pixKeyTypeStored && pixKey.includes(":")) {
      const colonIdx = pixKey.indexOf(":");
      pixKeyType = pixKey.substring(0, colonIdx) as typeof pixKeyType;
      pixKey = pixKey.substring(colonIdx + 1);
    }

    try {
      const payout = await createPixPayout({
        withdrawalId,
        amountBRL: withdrawal.amountBRL,
        pixKey,
        pixKeyType,
        payerEmail: withdrawal.user.email ?? "pagamentos@mmomarket.com.br",
        description: `Saque MMOMarket - ${withdrawal.userId}`,
      });

      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: payout.status === "approved" ? "COMPLETED" : "PROCESSING",
        },
      });

      return NextResponse.json({
        message: `Pagamento enviado via MercadoPago. Status: ${payout.status}`,
        payoutId: payout.id,
        payoutStatus: payout.status,
      });
    } catch (mpError) {
      // If MercadoPago fails, revert to PENDING so admin can retry
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: "PENDING" },
      });

      console.error("MercadoPago payout error:", mpError);
      return NextResponse.json(
        {
          error: `Erro ao processar pagamento via MercadoPago: ${mpError instanceof Error ? mpError.message : "Erro desconhecido"}. Saque retornado para PENDING.`,
        },
        { status: 502 },
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Admin withdrawals PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao processar saque" },
      { status: 500 },
    );
  }
}
