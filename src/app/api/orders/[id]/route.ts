import { getCurrentUserId, unauthorizedResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return NextResponse.json(
        { error: "Ordem não encontrada" },
        { status: 404 },
      );
    }

    if (order.userId !== userId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (order.status !== "OPEN" && order.status !== "PARTIALLY_FILLED") {
      return NextResponse.json(
        { error: "Apenas ordens abertas podem ser canceladas" },
        { status: 400 },
      );
    }

    // For BUY orders: release the frozen BRL back to the user's balance.
    // For partially filled BUY orders, only release the unfilled portion.
    if (order.type === "BUY") {
      const unfilledAmount = order.amount - order.filledAmount;
      const frozenToRelease = unfilledAmount * order.pricePerUnit;

      await prisma.$transaction([
        prisma.order.update({
          where: { id },
          data: { status: "CANCELLED" },
        }),
        prisma.wallet.update({
          where: { userId },
          data: {
            frozenBRL: { decrement: frozenToRelease },
            balanceBRL: { increment: frozenToRelease },
          },
        }),
      ]);
    } else {
      // SELL order: no funds to release
      await prisma.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar ordem" },
      { status: 500 },
    );
  }
}
