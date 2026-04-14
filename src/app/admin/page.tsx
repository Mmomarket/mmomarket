"use client";

import Badge from "@/components/ui/Badge";
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
  pendingVerifications: number;
  disputedTrades: number;
  totalUsers: number;
  totalTrades: number;
}

interface Verification {
  id: string;
  gameSlug: string;
  server: string | null;
  characterName: string;
  screenshotUrl: string;
  amount: number;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  serverRef: { id: string; name: string } | null;
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
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [disputes, setDisputes] = useState<DisputedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("verifications");

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [statsRes, verificationsRes, disputesRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/verifications"),
        fetch("/api/admin/disputes"),
      ]);

      const statsData = await statsRes.json();
      if (!statsData.isAdmin) {
        router.push("/");
        return;
      }
      setStats(statsData);

      if (verificationsRes.ok) {
        setVerifications(await verificationsRes.json());
      }
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

  const handleVerification = async (
    verificationId: string,
    action: "APPROVE" | "REJECT",
    reviewNote?: string,
  ) => {
    setActionLoading(verificationId);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, action, reviewNote }),
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

  const pendingVerifications = verifications.filter(
    (v) => v.status === "PENDING",
  );
  const processedVerifications = verifications.filter(
    (v) => v.status !== "PENDING",
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🛡️ Painel Administrativo</h1>
        <p className="text-gray-500 mt-1">
          Gerencie verificações de vendedores e resolva disputas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xl font-bold text-yellow-400">
              {stats.pendingVerifications}
            </p>
            <p className="text-xs text-gray-500 mt-1">Verificações Pendentes</p>
          </CardContent>
        </Card>
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab("verifications")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "verifications"
              ? "bg-gray-800 text-emerald-400 border-b-2 border-emerald-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ✅ Verificações ({pendingVerifications.length} pendentes)
        </button>
        <button
          onClick={() => setActiveTab("disputes")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
            activeTab === "disputes"
              ? "bg-gray-800 text-red-400 border-b-2 border-red-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          ⚠️ Disputas ({disputes.length})
        </button>
      </div>

      {/* Verifications Tab */}
      {activeTab === "verifications" && (
        <div className="space-y-6">
          {/* Pending */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-yellow-400">
                Pendentes ({pendingVerifications.length})
              </h2>
            </CardHeader>
            <CardContent>
              {pendingVerifications.length === 0 ? (
                <EmptyState
                  title="Nenhuma verificação pendente"
                  description="Todas as verificações foram processadas."
                />
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map((v) => (
                    <div
                      key={v.id}
                      className="border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {v.user.name}
                            </span>
                            <span className="text-gray-500 text-xs">
                              ({v.user.email})
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Jogo:{" "}
                            <span className="text-white">{v.gameSlug}</span>
                            {(v.serverRef || v.server) && (
                              <>
                                {" "}
                                · Servidor:{" "}
                                <span className="text-teal-400">
                                  🖥️ {v.serverRef?.name || v.server}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-sm text-gray-400">
                            Personagem:{" "}
                            <span className="text-white">
                              {v.characterName}
                            </span>
                          </p>
                          <p className="text-sm text-gray-400">
                            Quantidade:{" "}
                            <span className="text-emerald-400 font-medium">
                              {formatNumber(v.amount)}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Enviado em:{" "}
                            {new Date(v.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {v.screenshotUrl && (
                            <a
                              href={v.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              📸 Ver Screenshot
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleVerification(v.id, "APPROVE")}
                            disabled={actionLoading === v.id}
                          >
                            {actionLoading === v.id ? "..." : "✅ Aprovar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              handleVerification(
                                v.id,
                                "REJECT",
                                prompt("Motivo da rejeição:") || undefined,
                              )
                            }
                            disabled={actionLoading === v.id}
                          >
                            {actionLoading === v.id ? "..." : "❌ Rejeitar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {processedVerifications.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-400">
                  Processadas ({processedVerifications.length})
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {processedVerifications.slice(0, 20).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-2 border-b border-gray-800/50 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            v.status === "APPROVED" ? "success" : "danger"
                          }
                        >
                          {v.status === "APPROVED" ? "Aprovado" : "Rejeitado"}
                        </Badge>
                        <span className="text-white">{v.user.name}</span>
                        <span className="text-gray-500">
                          {v.gameSlug}
                          {v.serverRef && (
                            <span className="text-teal-400">
                              {" "}
                              · 🖥️ {v.serverRef.name}
                            </span>
                          )}{" "}
                          · {v.characterName} · {formatNumber(v.amount)}
                        </span>
                      </div>
                      {v.reviewNote && (
                        <span className="text-xs text-gray-500">
                          {v.reviewNote}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === "disputes" && (
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
                    {/* Trade Info */}
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
                          {new Date(trade.createdAt).toLocaleDateString(
                            "pt-BR",
                          )}
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
                          <p className="text-gray-500 text-xs">
                            Vendedor Recebe
                          </p>
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

                    {/* Actions */}
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
      )}
    </div>
  );
}
