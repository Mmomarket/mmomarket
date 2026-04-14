import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import prisma from "@/lib/prisma";
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

    const where: Record<string, unknown> = { status };
    if (currencyId) where.currencyId = currencyId;
    if (serverId) where.serverId = serverId;
    if (type) where.type = type;

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, image: true } },
        currency: { include: { game: true } },
        serverRef: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ordens" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const body = await req.json();
    const data = createOrderSchema.parse(body);
    const totalBRL = data.amount * data.pricePerUnit;

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
    } else {
      // SELL - check seller has verified funds
      const verifications = await prisma.verification.findMany({
        where: {
          userId,
          status: "APPROVED",
          // We could filter by game here
        },
      });

      const totalVerified = verifications.reduce(
        (sum: number, v: { amount: number }) => sum + v.amount,
        0,
      );

      // Get already committed sell orders
      const existingSellOrders = await prisma.order.findMany({
        where: {
          userId,
          type: "SELL",
          status: { in: ["OPEN", "PARTIALLY_FILLED"] },
          currencyId: data.currencyId,
        },
      });

      const totalCommitted = existingSellOrders.reduce(
        (sum: number, o: { amount: number; filledAmount: number }) =>
          sum + (o.amount - o.filledAmount),
        0,
      );

      if (totalVerified < totalCommitted + data.amount) {
        return NextResponse.json(
          {
            error:
              "Você precisa verificar seus fundos no jogo antes de criar uma ordem de venda. Vá para a página de verificação.",
          },
          { status: 400 },
        );
      }
    }

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
    const tradeTotalBRL = tradeAmount * sellOrder.pricePerUnit;
    const fee = tradeTotalBRL * (PLATFORM_FEE_PERCENT / 100);

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
    const tradeTotalBRL = tradeAmount * sellOrder.pricePerUnit;
    const fee = tradeTotalBRL * (PLATFORM_FEE_PERCENT / 100);

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

    remainingAmount -= tradeAmount;
  }
}
