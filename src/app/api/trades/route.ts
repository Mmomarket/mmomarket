import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ sellerId: userId }, { buyerId: userId }],
      },
      include: {
        currency: { include: { game: true } },
        seller: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true } },
        serverRef: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error("Trades GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar trades" },
      { status: 500 },
    );
  }
}
