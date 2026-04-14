import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const currencyId = searchParams.get("currencyId");
    const serverId = searchParams.get("serverId");
    const period = searchParams.get("period") || "4h";
    const days = parseInt(searchParams.get("days") || "7");

    if (!currencyId) {
      return NextResponse.json(
        { error: "currencyId é obrigatório" },
        { status: 400 },
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = {
      currencyId,
      period,
      timestamp: { gte: since },
    };
    if (serverId) where.serverId = serverId;

    const history = await prisma.priceHistory.findMany({
      where,
      orderBy: { timestamp: "asc" },
    });

    // Calculate price change percentage
    let priceChange = 0;
    let priceChangePercent = 0;
    if (history.length >= 2) {
      const oldest = history[0].avgPrice;
      const newest = history[history.length - 1].avgPrice;
      priceChange = newest - oldest;
      priceChangePercent = oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
    }

    const currentPrice =
      history.length > 0 ? history[history.length - 1].avgPrice : 0;
    const totalVolume = history.reduce(
      (sum: number, h: { volume: number }) => sum + h.volume,
      0,
    );
    const totalVolumeBRL = history.reduce(
      (sum: number, h: { volumeBRL: number }) => sum + h.volumeBRL,
      0,
    );

    return NextResponse.json({
      history,
      stats: {
        currentPrice,
        priceChange,
        priceChangePercent,
        totalVolume,
        totalVolumeBRL,
        high: Math.max(
          ...history.map((h: { maxPrice: number }) => h.maxPrice),
          0,
        ),
        low: Math.min(
          ...history.map((h: { minPrice: number }) => h.minPrice),
          Infinity,
        ),
      },
    });
  } catch (error) {
    console.error("Price history error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 },
    );
  }
}
