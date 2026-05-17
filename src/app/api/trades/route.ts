import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ sellerId: userId }, { buyerId: userId }],
      },
      include: {
        currency: { include: { game: true } },
        seller: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true } },
        serverRef: true,
        order: { select: { characterName: true, server: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = trades.length > limit;
    const items = hasMore ? trades.slice(0, limit) : trades;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ trades: items, nextCursor, hasMore });
  } catch (error) {
    console.error("Trades GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar trades" },
      { status: 500 },
    );
  }
}
