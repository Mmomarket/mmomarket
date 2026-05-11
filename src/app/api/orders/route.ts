import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { sendTradeMatchedEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { roundMoney } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createOrderSchema = z.object({
  type: z.enum(["BUY", "SELL"]),
  currencyId: z.string().min(1),
  amount: z.number().positive(),
  pricePerUnit: z.number().positive(),
  serverId: z.string().min(1, "Servidor é obrigatório"),
  server: z.string().optional(),
  characterName: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currencyId = searchParams.get("currencyId");
    const serverId = searchParams.get("serverId");
    const type = searchParams.get("type");
    const status = searchParams.get("status") || "OPEN";
    const mine = searchParams.get("mine") === "true";

    // ?mine=true returns only the current user's orders (any status)
    if (mine) {
      const userId = await getCurrentUserId();
      if (!userId) return unauthorizedResponse();
      const orders = await prisma.order.findMany({
        where: {
          userId,
          status: { in: ["OPEN", "PARTIALLY_FILLED"] },
        },
        include: {
          currency: { include: { game: true } },
          serverRef: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(orders);
    }

    const where: Record<string, unknown> = { status };
    if (currencyId) where.currencyId = currencyId;
    if (serverId) where.serverId = serverId;
    if (type) where.type = type;

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            verifications: {
              where: { status: "APPROVED" },
              take: 1,
              select: { id: true },
            },
          },
        },
        currency: { include: { game: true } },
        serverRef: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Sort: verified users first, then by createdAt desc
    const sorted = [...orders].sort((a, b) => {
      const aVerified = (a.user?.verifications?.length ?? 0) > 0 ? 0 : 1;
      const bVerified = (b.user?.verifications?.length ?? 0) > 0 ? 0 : 1;
      return aVerified - bVerified;
    });

    return NextResponse.json(sorted);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordens" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  // 20 orders per minute per user
  const rl = rateLimit("orders", getClientIp(req), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde um momento." },
      { status: 429 },
    );
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await req.json();
    const data = createOrderSchema.parse(body);
    const totalBRL = roundMoney(data.amount * data.pricePerUnit);

    // SELL orders: no pre-verification required.
    if (data.type === "BUY") {
      // Check buyer has enough BRL balance
      const wallet = await prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balanceBRL < totalBRL) {
        return NextResponse.json(
          { error: "Saldo insuficiente. Faça um depósito primeiro." },
          { status: 400 },
        );
      }

      // Freeze BRL for this order
      await prisma.wallet.update({
        where: { userId },
        data: {
          balanceBRL: { decrement: totalBRL },
          frozenBRL: { increment: totalBRL },
        },
      });
    }
    // SELL orders: no pre-verification required. Transaction confirmation
    // and dispute resolution are the integrity mechanism.

    const order = await prisma.order.create({
      data: {
        type: data.type,
        userId,
        currencyId: data.currencyId,
        serverId: data.serverId,
        amount: data.amount,
        pricePerUnit: data.pricePerUnit,
        totalBRL,
        server: data.server,
        characterName: data.characterName,
      },
      include: {
        currency: { include: { game: true } },
        serverRef: true,
      },
    });

    // Try to match orders automatically
    if (data.type === "BUY") {
      await matchBuyOrder(order.id);
    } else {
      await matchSellOrder(order.id);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Orders POST error:", error);
    return NextResponse.json({ error: "Erro ao criar ordem" }, { status: 500 });
  }
}

async function matchBuyOrder(buyOrderId: string) {
  const buyOrder = await prisma.order.findUnique({
    where: { id: buyOrderId },
  });
  if (!buyOrder || buyOrder.status === "FILLED") return;

  // Find matching sell orders (cheapest first, same server only)
  const sellOrders = await prisma.order.findMany({
    where: {
      currencyId: buyOrder.currencyId,
      serverId: buyOrder.serverId,
      type: "SELL",
      status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      pricePerUnit: { lte: buyOrder.pricePerUnit },
      userId: { not: buyOrder.userId },
    },
    orderBy: { pricePerUnit: "asc" },
  });

  let remainingAmount = buyOrder.amount - buyOrder.filledAmount;

  for (const sellOrder of sellOrders) {
    if (remainingAmount <= 0) break;

    const availableAmount = sellOrder.amount - sellOrder.filledAmount;
    const tradeAmount = Math.min(remainingAmount, availableAmount);
    const tradeTotalBRL = roundMoney(tradeAmount * sellOrder.pricePerUnit);
    const fee = roundMoney(tradeTotalBRL * (PLATFORM_FEE_PERCENT / 100));

    await prisma.$transaction([
      // Create trade (status defaults to PENDING_DELIVERY)
      prisma.trade.create({
        data: {
          orderId: buyOrderId,
          sellerId: sellOrder.userId,
          buyerId: buyOrder.userId,
          currencyId: buyOrder.currencyId,
          serverId: buyOrder.serverId,
          amount: tradeAmount,
          pricePerUnit: sellOrder.pricePerUnit,
          totalBRL: tradeTotalBRL,
          feeBRL: fee,
          sellerReceive: tradeTotalBRL - fee,
        },
      }),
      // Update buy order
      prisma.order.update({
        where: { id: buyOrderId },
        data: {
          filledAmount: { increment: tradeAmount },
          status:
            remainingAmount - tradeAmount <= 0 ? "FILLED" : "PARTIALLY_FILLED",
        },
      }),
      // Update sell order
      prisma.order.update({
        where: { id: sellOrder.id },
        data: {
          filledAmount: { increment: tradeAmount },
          status:
            availableAmount - tradeAmount <= 0 ? "FILLED" : "PARTIALLY_FILLED",
        },
      }),
      // Move buyer BRL from frozenBRL to escrowBRL (stays locked until delivery confirmed)
      prisma.wallet.update({
        where: { userId: buyOrder.userId },
        data: {
          frozenBRL: { decrement: tradeTotalBRL },
          escrowBRL: { increment: tradeTotalBRL },
        },
      }),
    ]);

    // Record price history for chart (non-blocking)
    upsertPriceHistory(
      buyOrder.currencyId,
      buyOrder.serverId ?? "",
      sellOrder.pricePerUnit,
      tradeAmount,
      tradeTotalBRL,
    ).catch(() => {});

    // Notify both parties (non-blocking)
    notifyTradeMatched(
      buyOrder.userId,
      sellOrder.userId,
      buyOrder.currencyId,
      tradeAmount,
      tradeTotalBRL,
    ).catch(() => {});

    remainingAmount -= tradeAmount;
  }
}

async function matchSellOrder(sellOrderId: string) {
  const sellOrder = await prisma.order.findUnique({
    where: { id: sellOrderId },
  });
  if (!sellOrder || sellOrder.status === "FILLED") return;

  // Find matching buy orders (highest price first, same server only)
  const buyOrders = await prisma.order.findMany({
    where: {
      currencyId: sellOrder.currencyId,
      serverId: sellOrder.serverId,
      type: "BUY",
      status: { in: ["OPEN", "PARTIALLY_FILLED"] },
      pricePerUnit: { gte: sellOrder.pricePerUnit },
      userId: { not: sellOrder.userId },
    },
    orderBy: { pricePerUnit: "desc" },
  });

  let remainingAmount = sellOrder.amount - sellOrder.filledAmount;

  for (const buyOrder of buyOrders) {
    if (remainingAmount <= 0) break;

    const availableAmount = buyOrder.amount - buyOrder.filledAmount;
    const tradeAmount = Math.min(remainingAmount, availableAmount);
    const tradeTotalBRL = roundMoney(tradeAmount * sellOrder.pricePerUnit);
    const fee = roundMoney(tradeTotalBRL * (PLATFORM_FEE_PERCENT / 100));

    await prisma.$transaction([
      prisma.trade.create({
        data: {
          orderId: sellOrderId,
          sellerId: sellOrder.userId,
          buyerId: buyOrder.userId,
          currencyId: sellOrder.currencyId,
          serverId: sellOrder.serverId,
          amount: tradeAmount,
          pricePerUnit: sellOrder.pricePerUnit,
          totalBRL: tradeTotalBRL,
          feeBRL: fee,
          sellerReceive: tradeTotalBRL - fee,
        },
      }),
      prisma.order.update({
        where: { id: sellOrderId },
        data: {
          filledAmount: { increment: tradeAmount },
          status:
            remainingAmount - tradeAmount <= 0 ? "FILLED" : "PARTIALLY_FILLED",
        },
      }),
      prisma.order.update({
        where: { id: buyOrder.id },
        data: {
          filledAmount: { increment: tradeAmount },
          status:
            availableAmount - tradeAmount <= 0 ? "FILLED" : "PARTIALLY_FILLED",
        },
      }),
      // Move buyer BRL from frozenBRL to escrowBRL (stays locked until delivery confirmed)
      prisma.wallet.update({
        where: { userId: buyOrder.userId },
        data: {
          frozenBRL: { decrement: tradeTotalBRL },
          escrowBRL: { increment: tradeTotalBRL },
        },
      }),
    ]);

    // Record price history for chart (non-blocking)
    upsertPriceHistory(
      sellOrder.currencyId,
      sellOrder.serverId ?? "",
      sellOrder.pricePerUnit,
      tradeAmount,
      tradeTotalBRL,
    ).catch(() => {});

    // Notify both parties (non-blocking)
    notifyTradeMatched(
      buyOrder.userId,
      sellOrder.userId,
      sellOrder.currencyId,
      tradeAmount,
      tradeTotalBRL,
    ).catch(() => {});

    remainingAmount -= tradeAmount;
  }
}

// ---------------------------------------------------------------------------
// Email notification helper
// ---------------------------------------------------------------------------
async function notifyTradeMatched(
  buyerId: string,
  sellerId: string,
  currencyId: string,
  amount: number,
  totalBRL: number,
) {
  const [buyer, seller, currency] = await Promise.all([
    prisma.user.findUnique({ where: { id: buyerId }, select: { email: true } }),
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { email: true },
    }),
    prisma.currency.findUnique({
      where: { id: currencyId },
      include: { game: true },
    }),
  ]);
  if (!buyer?.email || !seller?.email || !currency) return;
  await sendTradeMatchedEmail(buyer.email, seller.email, {
    gameName: currency.game.name,
    currencyCode: currency.code,
    amount,
    totalBRL,
    tradeId: "",
  });
}

// ---------------------------------------------------------------------------
// Price history aggregation (4-hour buckets)
// ---------------------------------------------------------------------------
async function upsertPriceHistory(
  currencyId: string,
  serverId: string,
  pricePerUnit: number,
  amount: number,
  totalBRL: number,
) {
  if (!serverId) return;
  const now = new Date();
  const bucketHour = Math.floor(now.getUTCHours() / 4) * 4;
  const bucket = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      bucketHour,
      0,
      0,
      0,
    ),
  );

  const existing = await prisma.priceHistory.findFirst({
    where: { currencyId, serverId, period: "4h", timestamp: bucket },
  });

  if (existing) {
    const newVolume = existing.volume + amount;
    const newVolumeBRL = existing.volumeBRL + totalBRL;
    await prisma.priceHistory.update({
      where: { id: existing.id },
      data: {
        avgPrice: newVolumeBRL / newVolume, // volume-weighted avg
        minPrice: Math.min(existing.minPrice, pricePerUnit),
        maxPrice: Math.max(existing.maxPrice, pricePerUnit),
        volume: newVolume,
        volumeBRL: newVolumeBRL,
      },
    });
  } else {
    await prisma.priceHistory.create({
      data: {
        currencyId,
        serverId,
        period: "4h",
        timestamp: bucket,
        avgPrice: pricePerUnit,
        minPrice: pricePerUnit,
        maxPrice: pricePerUnit,
        volume: amount,
        volumeBRL: totalBRL,
      },
    });
  }
}
