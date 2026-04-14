import {
  getCurrentUserId,
  isCurrentUserAdmin,
  unauthorizedResponse,
} from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/admin/stats - Get admin dashboard stats
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ isAdmin: false });
    }

    const [pendingVerifications, disputedTrades, totalUsers, totalTrades] =
      await Promise.all([
        prisma.verification.count({ where: { status: "PENDING" } }),
        prisma.trade.count({ where: { status: "DISPUTED" } }),
        prisma.user.count(),
        prisma.trade.count(),
      ]);

    return NextResponse.json({
      isAdmin: true,
      pendingVerifications,
      disputedTrades,
      totalUsers,
      totalTrades,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar stats" },
      { status: 500 },
    );
  }
}
