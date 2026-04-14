"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRL, formatNumber } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Trade {
  id: string;
  amount: number;
  pricePerUnit: number;
  totalBRL: number;
  feeBRL: number;
  sellerReceive: number;
  status: string;
  deliveredAt: string | null;
  disputeReason: string | null;
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  buyerId: string;
  seller: { id: string; name: string };
  buyer: { id: string; name: string };
  currency: { name: string; code: string; game: { name: string } };
  serverRef: { id: string; name: string } | null;
}

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "danger" | "info" | "default";
    icon: string;
  }
> = {
  PENDING_DELIVERY: {
    label: "Aguardando Entrega",
    variant: "warning",
    icon: "⏳",
  },
  DELIVERED: {
    label: "Entregue (Aguardando Confirmação)",
    variant: "info",
    icon: "📦",
  },
  CONFIRMED: { label: "Confirmado", variant: "success", icon: "✅" },
  DISPUTED: { label: "Em Disputa", variant: "danger", icon: "⚠️" },
};

const AUTO_RELEASE_HOURS = 48;

function getTimeRemaining(deliveredAt: string): string {
  const delivered = new Date(deliveredAt).getTime();
  const autoRelease = delivered + AUTO_RELEASE_HOURS * 60 * 60 * 1000;
  const remaining = autoRelease - Date.now();
  if (remaining <= 0) return "Auto-liberação disponível";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m para auto-liberação`;
}

export default function HistoricoPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeModal, setDisputeModal] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const userId = (session?.user as { id?: string } | undefined)?.id;

  const loadTrades = useCallback(() => {
    if (!session) return;
    fetch("/api/trades")
      .then((r) => r.json())
      .then((data) => {
        setTrades(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session) {
      loadTrades();
    }
  }, [session, sessionStatus, router, loadTrades]);

  const handleAction = async (
    tradeId: string,
    action: "MARK_DELIVERED" | "CONFIRM" | "DISPUTE",
    reason?: string,
  ) => {
    setActionLoading(tradeId);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, disputeReason: reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao executar ação");
        return;
      }
      loadTrades();
    } catch {
      alert("Erro de conexão");
    } finally {
      setActionLoading(null);
      setDisputeModal(null);
      setDisputeReason("");
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const filteredTrades = trades.filter((t) => {
    if (filter === "ACTIVE")
      return t.status === "PENDING_DELIVERY" || t.status === "DELIVERED";
    if (filter === "COMPLETED")
      return t.status === "CONFIRMED" || t.status === "DISPUTED";
    return true;
  });

  const totalVolume = trades.reduce((sum, t) => sum + t.totalBRL, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.feeBRL, 0);
  const activeTrades = trades.filter(
    (t) => t.status === "PENDING_DELIVERY" || t.status === "DELIVERED",
  ).length;
  const confirmedTrades = trades.filter((t) => t.status === "CONFIRMED").length;
  const disputedTrades = trades.filter((t) => t.status === "DISPUTED").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Trades</h1>
        <p className="text-gray-500 mt-1">
          Gerencie suas transações e confirme entregas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-white">{trades.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-yellow-400">{activeTrades}</p>
            <p className="text-xs text-gray-500 mt-1">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-emerald-400">
              {confirmedTrades}
            </p>
            <p className="text-xs text-gray-500 mt-1">Confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-red-400">{disputedTrades}</p>
            <p className="text-xs text-gray-500 mt-1">Disputas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-emerald-400">
              {formatBRL(totalVolume)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Volume</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["ALL", "ACTIVE", "COMPLETED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filter === f
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f === "ALL" ? "Todos" : f === "ACTIVE" ? "Ativos" : "Finalizados"}
          </button>
        ))}
      </div>

      {/* Trades List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">
            Trades {filter !== "ALL" && `(${filteredTrades.length})`}
          </h2>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredTrades.length === 0 ? (
            <EmptyState
              title="Nenhum trade encontrado"
              description={
                filter === "ALL"
                  ? "Seus trades aparecerão aqui assim que forem executados."
                  : "Nenhum trade nesta categoria."
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredTrades.map((trade) => {
                const isBuyer = userId === trade.buyerId;
                const isSeller = userId === trade.sellerId;
                const counterparty = isBuyer
                  ? trade.seller.name
                  : trade.buyer.name;
                const config = statusConfig[trade.status] ?? {
                  label: trade.status,
                  variant: "default" as const,
                  icon: "❓",
                };
                const isLoading = actionLoading === trade.id;

                return (
                  <div
                    key={trade.id}
                    className="border border-gray-800 rounded-lg p-4 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={isBuyer ? "success" : "danger"}>
                          {isBuyer ? "🛒 Compra" : "💰 Venda"}
                        </Badge>
                        <Badge variant={config.variant}>
                          {config.icon} {config.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(trade.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                      <div>
                        <p className="text-gray-500 text-xs">Jogo / Moeda</p>
                        <p className="text-white font-medium">
                          {trade.currency.game.name}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {trade.currency.code}
                          {trade.serverRef && (
                            <span className="text-teal-400">
                              {" "}
                              · 🖥️ {trade.serverRef.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Quantidade</p>
                        <p className="text-white font-medium">
                          {formatNumber(trade.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Total</p>
                        <p className="text-white font-medium">
                          {formatBRL(trade.totalBRL)}
                        </p>
                        <p className="text-yellow-400 text-xs">
                          Taxa: {formatBRL(trade.feeBRL)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Contraparte</p>
                        <p className="text-gray-300">{counterparty}</p>
                      </div>
                    </div>

                    {/* Auto-release countdown */}
                    {trade.status === "DELIVERED" && trade.deliveredAt && (
                      <div className="text-xs text-orange-400 mb-3">
                        ⏱️ {getTimeRemaining(trade.deliveredAt)}
                      </div>
                    )}

                    {/* Dispute reason */}
                    {trade.status === "DISPUTED" && trade.disputeReason && (
                      <div className="text-xs text-red-400 bg-red-900/20 rounded p-2 mb-3">
                        ⚠️ Motivo da disputa: {trade.disputeReason}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {isSeller && trade.status === "PENDING_DELIVERY" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleAction(trade.id, "MARK_DELIVERED")
                          }
                          disabled={isLoading}
                        >
                          {isLoading ? "Processando..." : "📦 Marcar Entregue"}
                        </Button>
                      )}

                      {isBuyer && trade.status === "DELIVERED" && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleAction(trade.id, "CONFIRM")}
                          disabled={isLoading}
                        >
                          {isLoading
                            ? "Processando..."
                            : "✅ Confirmar Recebimento"}
                        </Button>
                      )}

                      {isSeller &&
                        trade.status === "DELIVERED" &&
                        trade.deliveredAt &&
                        Date.now() - new Date(trade.deliveredAt).getTime() >
                          AUTO_RELEASE_HOURS * 60 * 60 * 1000 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleAction(trade.id, "CONFIRM")}
                            disabled={isLoading}
                          >
                            {isLoading
                              ? "Processando..."
                              : "🔓 Auto-Liberar Escrow"}
                          </Button>
                        )}

                      {isBuyer &&
                        (trade.status === "PENDING_DELIVERY" ||
                          trade.status === "DELIVERED") && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDisputeModal(trade.id)}
                            disabled={isLoading}
                          >
                            ⚠️ Abrir Disputa
                          </Button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Info */}
      {trades.length > 0 && (
        <div className="text-center text-xs text-gray-600">
          Total em taxas:{" "}
          <span className="text-yellow-400 font-medium">
            {formatBRL(totalFees)}
          </span>
        </div>
      )}

      {/* Dispute Modal */}
      <Modal
        isOpen={!!disputeModal}
        onClose={() => {
          setDisputeModal(null);
          setDisputeReason("");
        }}
        title="Abrir Disputa"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Descreva o motivo da disputa. Um administrador irá analisar e
            resolver a situação. O escrow ficará retido até a resolução.
          </p>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Descreva o problema (ex: vendedor não entregou a moeda no jogo, quantidade incorreta...)"
            className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setDisputeModal(null);
                setDisputeReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={!disputeReason.trim() || actionLoading !== null}
              onClick={() => {
                if (disputeModal) {
                  handleAction(disputeModal, "DISPUTE", disputeReason);
                }
              }}
            >
              {actionLoading ? "Enviando..." : "Confirmar Disputa"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
