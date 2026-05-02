"use client";

import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRL, formatNumber } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface AdminStats {
  isAdmin: boolean;
  disputedTrades: number;
  totalUsers: number;
  totalTrades: number;
}

interface DisputedTrade {
  id: string;
  amount: number;
  pricePerUnit: number;
  totalBRL: number;
  feeBRL: number;
  sellerReceive: number;
  status: string;
  disputeReason: string | null;
  adminNote: string | null;
  createdAt: string;
  seller: { id: string; name: string; email: string };
  buyer: { id: string; name: string; email: string };
  currency: { name: string; code: string; game: { name: string } };
  order: { server: string | null; characterName: string | null };
  serverRef: { id: string; name: string } | null;
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [disputes, setDisputes] = useState<DisputedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [statsRes, disputesRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/disputes"),
      ]);

      const statsData = await statsRes.json();
      if (!statsData.isAdmin) {
        router.push("/");
        return;
      }
      setStats(statsData);

      if (disputesRes.ok) {
        setDisputes(await disputesRes.json());
      }
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session) {
      loadData();
    }
  }, [session, sessionStatus, router, loadData]);

  const handleDispute = async (
    tradeId: string,
    resolution: "RELEASE_TO_SELLER" | "REFUND_TO_BUYER",
    adminNote?: string,
  ) => {
    setActionLoading(tradeId);
    try {
      const res = await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeId,
          resolution,
          adminNote: adminNote || `Resolvido: ${resolution}`,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao processar");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setActionLoading(null);
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!stats?.isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🛡️ Painel Administrativo</h1>
        <p className="text-gray-500 mt-1">
          Resolva disputas entre compradores e vendedores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-red-400">
              {stats.disputedTrades}
            </p>
            <p className="text-xs text-gray-500 mt-1">Disputas Abertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 mt-1">Usuários</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-emerald-400">
              {stats.totalTrades}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total de Trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Disputes */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-red-400">
            Disputas Abertas ({disputes.length})
          </h2>
        </CardHeader>
        <CardContent>
          {disputes.length === 0 ? (
            <EmptyState
              title="Nenhuma disputa aberta"
              description="Não há disputas para resolver no momento."
            />
          ) : (
            <div className="space-y-4">
              {disputes.map((trade) => (
                <div
                  key={trade.id}
                  className="border border-red-900/50 rounded-lg p-4 bg-red-900/10"
                >
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">
                        {trade.currency.game.name} — {trade.currency.code}
                        {trade.serverRef && (
                          <span className="text-teal-400 text-sm font-normal">
                            {" "}
                            · 🖥️ {trade.serverRef.name}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(trade.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Quantidade</p>
                        <p className="text-white">
                          {formatNumber(trade.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total</p>
                        <p className="text-white">
                          {formatBRL(trade.totalBRL)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Vendedor Recebe</p>
                        <p className="text-emerald-400">
                          {formatBRL(trade.sellerReceive)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Vendedor</p>
                        <p className="text-white">
                          {trade.seller.name}{" "}
                          <span className="text-gray-500 text-xs">
                            ({trade.seller.email})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Comprador</p>
                        <p className="text-white">
                          {trade.buyer.name}{" "}
                          <span className="text-gray-500 text-xs">
                            ({trade.buyer.email})
                          </span>
                        </p>
                      </div>
                    </div>
                    {trade.disputeReason && (
                      <div className="bg-red-900/30 rounded p-2 text-sm text-red-300">
                        <span className="text-red-400 font-medium">
                          Motivo:{" "}
                        </span>
                        {trade.disputeReason}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-red-900/30 pt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        handleDispute(
                          trade.id,
                          "RELEASE_TO_SELLER",
                          prompt("Nota (opcional):") || undefined,
                        )
                      }
                      disabled={actionLoading === trade.id}
                    >
                      {actionLoading === trade.id
                        ? "..."
                        : "💰 Liberar para Vendedor"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        handleDispute(
                          trade.id,
                          "REFUND_TO_BUYER",
                          prompt("Nota (opcional):") || undefined,
                        )
                      }
                      disabled={actionLoading === trade.id}
                    >
                      {actionLoading === trade.id
                        ? "..."
                        : "↩️ Reembolsar Comprador"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
