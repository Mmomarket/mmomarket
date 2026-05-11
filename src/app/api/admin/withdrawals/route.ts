import {
  forbiddenResponse,
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import { generatePixCode } from "@/lib/pix";
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
      include: { user: { select: { email: true, name: true } } },
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

    // APPROVE — generate Pix BR Code QR for the admin to scan, then mark COMPLETED.
    let pixKey = withdrawal.pixKey || "";
    let pixKeyType = (withdrawal.pixKeyType as string) || "EVP";

    // Legacy format fallback: "TYPE:value"
    if (!withdrawal.pixKeyType && pixKey.includes(":")) {
      const colonIdx = pixKey.indexOf(":");
      pixKeyType = pixKey.substring(0, colonIdx);
      pixKey = pixKey.substring(colonIdx + 1);
    }

    // Generate scannable Pix BR Code (EMV standard)
    const userName = withdrawal.user.name ?? withdrawal.user.email ?? "Usuario";
    const pixCode = generatePixCode({
      pixKey,
      merchantName: userName,
      merchantCity: "SAO PAULO",
      amount: withdrawal.amountBRL,
      txId: withdrawalId.replace(/[^A-Za-z0-9]/g, "").substring(0, 25),
      description: `Saque MMOMarket`,
    });

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      message: `Saque aprovado! Escaneie o QR code Pix abaixo para enviar R$ ${withdrawal.amountBRL.toFixed(2)}.`,
      pixKey,
      pixKeyType,
      amountBRL: withdrawal.amountBRL,
      userEmail: withdrawal.user.email,
      pixCode, // full EMV string for QR rendering
    });
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
