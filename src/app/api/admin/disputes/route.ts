import {
  forbiddenResponse,
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/admin/disputes - List all disputed trades (admin only)
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const disputes = await prisma.trade.findMany({
      where: { status: "DISPUTED" },
      include: {
        currency: { include: { game: true } },
        seller: { select: { id: true, name: true, email: true } },
        buyer: { select: { id: true, name: true, email: true } },
        order: { select: { server: true, characterName: true } },
        serverRef: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error("Admin disputes GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar disputas" },
      { status: 500 },
    );
  }
}

const resolveSchema = z.object({
  tradeId: z.string().min(1),
  resolution: z.enum(["RELEASE_TO_SELLER", "REFUND_TO_BUYER"]),
  adminNote: z.string().optional(),
});

// PATCH /api/admin/disputes - Resolve a disputed trade
export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) return forbiddenResponse();

    const body = await req.json();
    const { tradeId, resolution, adminNote } = resolveSchema.parse(body);

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade não encontrado" },
        { status: 404 },
      );
    }

    if (trade.status !== "DISPUTED") {
      return NextResponse.json(
        { error: `Trade não está em disputa (${trade.status})` },
        { status: 400 },
      );
    }

    if (resolution === "RELEASE_TO_SELLER") {
      // Release escrow to seller
      await prisma.$transaction([
        prisma.trade.update({
          where: { id: tradeId },
          data: {
            status: "CONFIRMED",
            adminNote:
              adminNote || "Resolvido pelo admin: liberado para vendedor",
          },
        }),
        prisma.wallet.update({
          where: { userId: trade.buyerId },
          data: {
            escrowBRL: { decrement: trade.totalBRL },
          },
        }),
        prisma.wallet.update({
          where: { userId: trade.sellerId },
          data: {
            balanceBRL: { increment: trade.sellerReceive },
          },
        }),
      ]);
    } else {
      // Refund to buyer
      await prisma.$transaction([
        prisma.trade.update({
          where: { id: tradeId },
          data: {
            status: "CONFIRMED",
            adminNote:
              adminNote || "Resolvido pelo admin: reembolsado para comprador",
          },
        }),
        prisma.wallet.update({
          where: { userId: trade.buyerId },
          data: {
            escrowBRL: { decrement: trade.totalBRL },
            balanceBRL: { increment: trade.totalBRL },
          },
        }),
      ]);
    }

    return NextResponse.json({
      message: `Disputa resolvida: ${resolution === "RELEASE_TO_SELLER" ? "Liberado para vendedor" : "Reembolsado para comprador"}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Admin disputes PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao resolver disputa" },
      { status: 500 },
    );
  }
}
