import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// Auto-release: if buyer doesn't act within 48h after seller marks DELIVERED
const AUTO_RELEASE_HOURS = 48;

const actionSchema = z.object({
  action: z.enum(["MARK_DELIVERED", "CONFIRM", "DISPUTE"]),
  disputeReason: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: {
        currency: { include: { game: true } },
        seller: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true } },
        order: { select: { server: true, characterName: true } },
        serverRef: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade não encontrado" },
        { status: 404 },
      );
    }

    // Only buyer or seller can view
    if (trade.sellerId !== userId && trade.buyerId !== userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    return NextResponse.json(trade);
  } catch (error) {
    console.error("Trade GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar trade" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const { action, disputeReason } = actionSchema.parse(body);

    const trade = await prisma.trade.findUnique({
      where: { id },
    });

    if (!trade) {
      return NextResponse.json(
        { error: "Trade não encontrado" },
        { status: 404 },
      );
    }

    switch (action) {
      case "MARK_DELIVERED":
        return await markDelivered(trade, userId);
      case "CONFIRM":
        return await confirmDelivery(trade, userId);
      case "DISPUTE":
        return await openDispute(trade, userId, disputeReason);
      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Trade PATCH error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar trade" },
      { status: 500 },
    );
  }
}

/**
 * Seller marks the in-game currency as delivered.
 * Starts the 48h countdown for auto-release.
 */
async function markDelivered(
  trade: { id: string; sellerId: string; buyerId: string; status: string },
  userId: string,
) {
  // Only seller can mark as delivered
  if (trade.sellerId !== userId) {
    return NextResponse.json(
      { error: "Apenas o vendedor pode marcar como entregue" },
      { status: 403 },
    );
  }

  if (trade.status !== "PENDING_DELIVERY") {
    return NextResponse.json(
      { error: `Ação inválida para status atual: ${trade.status}` },
      { status: 400 },
    );
  }

  const updated = await prisma.trade.update({
    where: { id: trade.id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  return NextResponse.json(updated);
}

/**
 * Buyer confirms receipt of in-game currency.
 * Releases escrow: deducts from buyer's escrowBRL, credits seller's balanceBRL (minus fee).
 * Also handles auto-release: if 48h have passed since DELIVERED status, anyone can confirm.
 */
async function confirmDelivery(
  trade: {
    id: string;
    sellerId: string;
    buyerId: string;
    status: string;
    totalBRL: number;
    feeBRL: number;
    sellerReceive: number;
    deliveredAt: Date | null;
  },
  userId: string,
) {
  // Check if auto-release applies
  const isAutoRelease =
    trade.status === "DELIVERED" &&
    trade.deliveredAt &&
    Date.now() - new Date(trade.deliveredAt).getTime() >
      AUTO_RELEASE_HOURS * 60 * 60 * 1000;

  // Only buyer can confirm, OR auto-release if time has passed (anyone involved)
  if (trade.buyerId !== userId && !isAutoRelease) {
    return NextResponse.json(
      { error: "Apenas o comprador pode confirmar o recebimento" },
      { status: 403 },
    );
  }

  if (trade.status !== "DELIVERED") {
    return NextResponse.json(
      {
        error: `Ação inválida para status atual: ${trade.status}. O vendedor precisa marcar como entregue primeiro.`,
      },
      { status: 400 },
    );
  }

  // Release escrow in a transaction
  await prisma.$transaction([
    // Update trade status to CONFIRMED
    prisma.trade.update({
      where: { id: trade.id },
      data: { status: "CONFIRMED" },
    }),
    // Release escrow from buyer's wallet
    prisma.wallet.update({
      where: { userId: trade.buyerId },
      data: {
        escrowBRL: { decrement: trade.totalBRL },
      },
    }),
    // Credit seller (minus platform fee)
    prisma.wallet.update({
      where: { userId: trade.sellerId },
      data: {
        balanceBRL: { increment: trade.sellerReceive },
      },
    }),
  ]);

  return NextResponse.json({
    status: "CONFIRMED",
    message: "Trade confirmado! Escrow liberado.",
  });
}

/**
 * Buyer opens a dispute. Escrow stays locked until admin resolves.
 */
async function openDispute(
  trade: { id: string; sellerId: string; buyerId: string; status: string },
  userId: string,
  disputeReason?: string,
) {
  // Only buyer can dispute
  if (trade.buyerId !== userId) {
    return NextResponse.json(
      { error: "Apenas o comprador pode abrir uma disputa" },
      { status: 403 },
    );
  }

  if (trade.status !== "PENDING_DELIVERY" && trade.status !== "DELIVERED") {
    return NextResponse.json(
      { error: `Ação inválida para status atual: ${trade.status}` },
      { status: 400 },
    );
  }

  const updated = await prisma.trade.update({
    where: { id: trade.id },
    data: {
      status: "DISPUTED",
      disputeReason: disputeReason || "Motivo não especificado",
    },
  });

  return NextResponse.json(updated);
}
