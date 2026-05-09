"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRL, formatBRLPrecise, formatNumber } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
  evidenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sellerId: string;
  buyerId: string;
  seller: { id: string; name: string };
  buyer: { id: string; name: string };
  currency: { name: string; code: string; game: { name: string } };
  serverRef: { id: string; name: string } | null;
}

interface ActiveOrder {
  id: string;
  type: "BUY" | "SELL";
  status: string;
  amount: number;
  filledAmount: number;
  pricePerUnit: number;
  totalBRL: number;
  createdAt: string;
  currency: { id: string; name: string; code: string; game: { name: string } };
  serverRef: { id: string; name: string } | null;
}

interface DisputeMessage {
  id: string;
  tradeId: string;
  userId: string;
  content: string;
  evidenceUrl: string | null;
  createdAt: string;
  user: { id: string; name: string | null; isAdmin: boolean };
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
    icon: "",
  },
  DELIVERED: {
    label: "Entregue (Aguardando Confirmação)",
    variant: "info",
    icon: "",
  },
  CONFIRMED: { label: "Confirmado", variant: "success", icon: "" },
  DISPUTED: { label: "Em Disputa", variant: "danger", icon: "" },
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

type UploadState = "idle" | "uploading" | "done" | "error";

function VideoUploadArea({
  label,
  required,
  state,
  error,
  onChange,
}: {
  label: string;
  required: boolean;
  state: UploadState;
  error: string;
  onChange: (f: File) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-300">
        {label}{" "}
        {required ? (
          <span className="text-red-400 text-xs">(obrigatório)</span>
        ) : (
          <span className="text-gray-500 text-xs">(opcional)</span>
        )}
      </label>
      <label
        className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          state === "done"
            ? "border-emerald-600 bg-emerald-900/20"
            : state === "error"
              ? "border-red-600 bg-red-900/20"
              : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
        }`}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/avi,video/x-msvideo"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
          }}
        />
        {state === "idle" && (
          <>
            <span className="text-xl mb-1"></span>
            <span className="text-xs text-gray-400">
              Clique para selecionar um vídeo
            </span>
            <span className="text-xs text-gray-600 mt-0.5">
              MP4, WebM, MOV, MKV até 200 MB
            </span>
          </>
        )}
        {state === "uploading" && (
          <>
            <span className="text-xl mb-1 animate-pulse"></span>
            <span className="text-xs text-gray-400">Enviando vídeo</span>
          </>
        )}
        {state === "done" && (
          <>
            <span className="text-xl mb-1"></span>
            <span className="text-xs text-emerald-400">
              Vídeo enviado clique para substituir
            </span>
          </>
        )}
        {state === "error" && (
          <>
            <span className="text-xl mb-1"></span>
            <span className="text-xs text-red-400">
              {error || "Falha no envio"}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">
              Clique para tentar novamente
            </span>
          </>
        )}
      </label>
    </div>
  );
}

export default function HistoricoPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"TRADES" | "ORDERS">("TRADES");
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");
  const [disputeModal, setDisputeModal] = useState<Trade | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [openEvidenceUrl, setOpenEvidenceUrl] = useState<string | null>(null);
  const [openUploadState, setOpenUploadState] = useState<UploadState>("idle");
  const [openUploadError, setOpenUploadError] = useState("");
  const [chatTradeId, setChatTradeId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<DisputeMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatEvidenceUrl, setChatEvidenceUrl] = useState<string | null>(null);
  const [chatUploadState, setChatUploadState] = useState<UploadState>("idle");
  const [chatUploadError, setChatUploadError] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
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

  const loadActiveOrders = useCallback(() => {
    if (!session) return;
    fetch("/api/orders?mine=true")
      .then((r) => r.json())
      .then((data) => setActiveOrders(Array.isArray(data) ? data : []));
  }, [session]);

  const cancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao cancelar ordem");
        return;
      }
      loadActiveOrders();
    } catch {
      alert("Erro de conexão");
    } finally {
      setCancellingOrderId(null);
    }
  };

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session) {
      loadTrades();
      loadActiveOrders();
    }
  }, [session, sessionStatus, router, loadTrades, loadActiveOrders]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const uploadVideo = async (
    file: File,
    onState: (s: UploadState) => void,
    onError: (e: string) => void,
    onUrl: (u: string) => void,
  ) => {
    onState("uploading");
    onError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/evidence", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        onState("error");
        onError(data.error || "Erro ao enviar vídeo");
      } else {
        onUrl(data.url);
        onState("done");
      }
    } catch {
      onState("error");
      onError("Erro de conexão ao enviar vídeo");
    }
  };

  const closeOpenDisputeModal = () => {
    setDisputeModal(null);
    setDisputeReason("");
    setOpenEvidenceUrl(null);
    setOpenUploadState("idle");
    setOpenUploadError("");
  };

  const handleOpenDispute = async () => {
    if (!disputeModal) return;
    setActionLoading(disputeModal.id);
    try {
      const res = await fetch(`/api/trades/${disputeModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISPUTE",
          disputeReason: disputeReason || undefined,
          evidenceUrl: openEvidenceUrl || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao abrir disputa");
        return;
      }
      loadTrades();
      closeOpenDisputeModal();
    } catch {
      alert("Erro de conexão");
    } finally {
      setActionLoading(null);
    }
  };

  const openChat = async (tradeId: string) => {
    setChatTradeId(tradeId);
    setChatMessages([]);
    setChatText("");
    setChatEvidenceUrl(null);
    setChatUploadState("idle");
    setChatUploadError("");
    setChatLoading(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}/messages`);
      if (res.ok) setChatMessages(await res.json());
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    setChatTradeId(null);
    setChatMessages([]);
    setChatText("");
    setChatEvidenceUrl(null);
    setChatUploadState("idle");
  };

  const sendChatMessage = async () => {
    if (!chatTradeId || !chatText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/trades/${chatTradeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: chatText.trim(),
          evidenceUrl: chatEvidenceUrl || undefined,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatText("");
        setChatEvidenceUrl(null);
        setChatUploadState("idle");
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao enviar mensagem");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAction = async (
    tradeId: string,
    action: "MARK_DELIVERED" | "CONFIRM",
  ) => {
    setActionLoading(tradeId);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
  const disputeModalIsSeller = disputeModal?.sellerId === userId;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Trades</h1>
        <p className="text-gray-500 mt-1">
          Gerencie suas transações e confirme entregas
        </p>
      </div>

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

      <div className="flex gap-2 flex-wrap">
        {/* Main tab: Trades vs Orders */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mr-2">
          {(["TRADES", "ORDERS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${tab === t ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t === "TRADES"
                ? `Trades (${trades.length})`
                : `Ordens Ativas (${activeOrders.length})`}
            </button>
          ))}
        </div>

        {/* Sub-filter only for trades tab */}
        {tab === "TRADES" &&
          (["ALL", "ACTIVE", "COMPLETED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${filter === f ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {f === "ALL"
                ? "Todos"
                : f === "ACTIVE"
                  ? "Ativos"
                  : "Finalizados"}
            </button>
          ))}
      </div>

      {/* ── Active Orders Tab ─────────────────────────────────────── */}
      {tab === "ORDERS" && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">Minhas Ordens Abertas</h2>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <EmptyState
                title="Nenhuma ordem aberta"
                description="Crie uma ordem de compra ou venda na página Negociar."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                      <th className="text-left py-2 font-medium">Tipo</th>
                      <th className="text-left py-2 font-medium">
                        Jogo / Moeda
                      </th>
                      <th className="text-left py-2 font-medium">Servidor</th>
                      <th className="text-right py-2 font-medium">
                        Qtd Restante
                      </th>
                      <th className="text-right py-2 font-medium">Preço/Un</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Data</th>
                      <th className="text-right py-2 font-medium">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map((order) => {
                      const remaining = order.amount - order.filledAmount;
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30"
                        >
                          <td className="py-3">
                            <Badge
                              variant={
                                order.type === "BUY" ? "success" : "danger"
                              }
                            >
                              {order.type === "BUY" ? "Compra" : "Venda"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <p className="text-white font-medium text-xs">
                              {order.currency.game.name}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {order.currency.code}
                            </p>
                          </td>
                          <td className="py-3 text-gray-400 text-xs">
                            {order.serverRef?.name || "—"}
                          </td>
                          <td className="py-3 text-right text-white font-medium">
                            {formatNumber(remaining)}
                            {order.filledAmount > 0 && (
                              <span className="ml-1 text-xs text-yellow-400">
                                ({formatNumber(order.filledAmount)} preenchido)
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right text-emerald-400">
                            {formatBRLPrecise(order.pricePerUnit)}
                          </td>
                          <td className="py-3 text-right text-white">
                            {formatBRL(remaining * order.pricePerUnit)}
                          </td>
                          <td className="py-3 text-right text-gray-500 text-xs">
                            {new Date(order.createdAt).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                              },
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => cancelOrder(order.id)}
                              disabled={cancellingOrderId === order.id}
                              className="px-2 py-1 text-xs font-medium bg-red-700/80 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {cancellingOrderId === order.id
                                ? "…"
                                : "Cancelar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Trades Tab ────────────────────────────────────────────── */}
      {tab === "TRADES" && (
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
                    icon: "",
                  };
                  const isLoading = actionLoading === trade.id;
                  const autoReleaseElapsed =
                    trade.deliveredAt &&
                    Date.now() - new Date(trade.deliveredAt).getTime() >
                      AUTO_RELEASE_HOURS * 60 * 60 * 1000;

                  return (
                    <div
                      key={trade.id}
                      className="border border-gray-800 rounded-lg p-4 hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={isBuyer ? "success" : "danger"}>
                            {isBuyer ? " Compra" : " Venda"}
                          </Badge>
                          <Badge variant={config.variant}>
                            {config.icon} {config.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(trade.createdAt).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>

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
                                {trade.serverRef.name}
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

                      {trade.status === "DELIVERED" && trade.deliveredAt && (
                        <div className="text-xs text-orange-400 mb-3">
                          {" "}
                          {getTimeRemaining(trade.deliveredAt)}
                        </div>
                      )}
                      {trade.status === "DISPUTED" && trade.disputeReason && (
                        <div className="text-xs text-red-400 bg-red-900/20 rounded p-2 mb-3">
                          {" "}
                          {trade.disputeReason}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {isSeller && trade.status === "PENDING_DELIVERY" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAction(trade.id, "MARK_DELIVERED")
                            }
                            disabled={isLoading}
                          >
                            {isLoading ? "Processando..." : " Marcar Entregue"}
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
                              : " Confirmar Recebimento"}
                          </Button>
                        )}
                        {isSeller &&
                          trade.status === "DELIVERED" &&
                          autoReleaseElapsed && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleAction(trade.id, "CONFIRM")}
                              disabled={isLoading}
                            >
                              {isLoading
                                ? "Processando..."
                                : " Auto-Liberar Escrow"}
                            </Button>
                          )}
                        {isBuyer &&
                          (trade.status === "PENDING_DELIVERY" ||
                            trade.status === "DELIVERED") && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setDisputeModal(trade)}
                              disabled={isLoading}
                            >
                              {" "}
                              Abrir Disputa
                            </Button>
                          )}
                        {isSeller && trade.status === "DELIVERED" && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDisputeModal(trade)}
                            disabled={isLoading}
                          >
                            {" "}
                            Abrir Disputa
                          </Button>
                        )}
                        {trade.status === "DISPUTED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openChat(trade.id)}
                            disabled={isLoading}
                          >
                            {" "}
                            Ver Disputa
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
      )}

      {tab === "TRADES" && trades.length > 0 && (
        <div className="text-center text-xs text-gray-600">
          Total em taxas:{" "}
          <span className="text-yellow-400 font-medium">
            {formatBRL(totalFees)}
          </span>
        </div>
      )}

      {/*  Open Dispute Modal  */}
      <Modal
        isOpen={!!disputeModal}
        onClose={closeOpenDisputeModal}
        title="Abrir Disputa"
      >
        {disputeModal && (
          <div className="space-y-4">
            {disputeModalIsSeller ? (
              <div className="bg-amber-950/40 border border-amber-700/40 rounded-lg px-4 py-3 text-xs text-amber-300 space-y-1">
                <p className="font-semibold">
                  {" "}
                  Gravação obrigatória para vendedores
                </p>
                <p>
                  Envie um vídeo provando a entrega das moedas (antes e depois
                  da transferência no jogo). Prints não são aceitos.
                </p>
              </div>
            ) : (
              <div className="bg-blue-950/40 border border-blue-700/40 rounded-lg px-4 py-3 text-xs text-blue-300 space-y-1">
                <p className="font-semibold">ℹ Disputa como comprador</p>
                <p>
                  Descreva o problema. Se tiver gravação mostrando que as moedas
                  não foram recebidas, envie-a. Caso contrário, o admin
                  analisará o vídeo do vendedor.
                </p>
              </div>
            )}
            <VideoUploadArea
              label="Gravação em vídeo"
              required={!!disputeModalIsSeller}
              state={openUploadState}
              error={openUploadError}
              onChange={(f) =>
                uploadVideo(
                  f,
                  setOpenUploadState,
                  setOpenUploadError,
                  setOpenEvidenceUrl,
                )
              }
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                Descrição do problema
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={
                  disputeModalIsSeller
                    ? "Ex: entreguei as moedas no personagem X mas o comprador não confirma"
                    : "Ex: já se passaram 24h e as moedas não foram entregues"
                }
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeOpenDisputeModal}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={
                  !disputeReason.trim() ||
                  (!!disputeModalIsSeller && openUploadState !== "done") ||
                  openUploadState === "uploading" ||
                  actionLoading !== null
                }
                onClick={handleOpenDispute}
              >
                {actionLoading ? "Enviando" : "Confirmar Disputa"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/*  Dispute Chat Modal  */}
      <Modal
        isOpen={!!chatTradeId}
        onClose={closeChat}
        title=" Disputa  Chat"
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-3">
          <div className="h-80 overflow-y-auto space-y-3 pr-1">
            {chatLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Carregando mensagens
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Nenhuma mensagem ainda.
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.userId === userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${msg.user.isAdmin ? "bg-purple-900/60 border border-purple-700/50" : isMe ? "bg-emerald-900/60 border border-emerald-700/50" : "bg-gray-700/60 border border-gray-600/50"}`}
                    >
                      <p className="text-xs font-medium mb-1 text-gray-400">
                        {msg.user.isAdmin
                          ? " Admin"
                          : msg.user.name || "Usuário"}
                        {"  "}
                        {new Date(msg.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-white whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      {msg.evidenceUrl && (
                        <a
                          href={`/api/admin/evidence?url=${encodeURIComponent(msg.evidenceUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-teal-400 hover:text-teal-300 underline"
                        >
                          Ver Gravação
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="border-t border-gray-700 pt-3 space-y-2">
            <VideoUploadArea
              label="Anexar gravação"
              required={false}
              state={chatUploadState}
              error={chatUploadError}
              onChange={(f) =>
                uploadVideo(
                  f,
                  setChatUploadState,
                  setChatUploadError,
                  setChatEvidenceUrl,
                )
              }
            />
            <div className="flex gap-2">
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Escreva uma mensagem (Enter para enviar)"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent h-16"
              />
              <Button
                variant="primary"
                onClick={sendChatMessage}
                disabled={
                  !chatText.trim() ||
                  sendingMessage ||
                  chatUploadState === "uploading"
                }
              >
                {sendingMessage ? "" : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
