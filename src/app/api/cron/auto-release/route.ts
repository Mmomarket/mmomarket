/**
 * Auto-release cron — runs every hour via Vercel Cron.
 * Confirms all trades that have been in DELIVERED status for more than 48 hours
 * without buyer action, releasing the escrow to the seller.
 *
 * Vercel cron config is in vercel.json.
 * Cron schedule: "0 * * * *" (every hour)
 */
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const AUTO_RELEASE_HOURS = 48;

export async function GET(req: Request) {
  // Always require CRON_SECRET — set it in .env (local) and Vercel dashboard (prod).
  // Vercel automatically passes Authorization: Bearer <CRON_SECRET> on scheduled invocations.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET env var is not configured" },
      { status: 401 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000);

  // Find all DELIVERED trades older than 48h
  const staleTrades = await prisma.trade.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { lte: cutoff },
    },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      totalBRL: true,
      sellerReceive: true,
    },
  });

  if (staleTrades.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  let released = 0;
  const errors: string[] = [];

  for (const trade of staleTrades) {
    try {
      await prisma.$transaction([
        prisma.trade.update({
          where: { id: trade.id },
          data: { status: "CONFIRMED" },
        }),
        prisma.wallet.update({
          where: { userId: trade.buyerId },
          data: { escrowBRL: { decrement: trade.totalBRL } },
        }),
        prisma.wallet.update({
          where: { userId: trade.sellerId },
          data: { balanceBRL: { increment: trade.sellerReceive } },
        }),
      ]);
      released++;
    } catch (err) {
      errors.push(
        `${trade.id}: ${err instanceof Error ? err.message : "error"}`,
      );
    }
  }

  console.log(
    `[auto-release] Released ${released}/${staleTrades.length} trades`,
  );
  if (errors.length > 0) {
    console.error("[auto-release] Errors:", errors);
  }

  return NextResponse.json({ released, errors });
}
