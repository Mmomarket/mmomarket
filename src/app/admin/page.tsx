"use client";

import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRL, formatNumber } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  evidenceUrl: string | null;
  disputeReason: string | null;
  adminNote: string | null;
  createdAt: string;
  seller: { id: string; name: string; email: string };
  buyer: { id: string; name: string; email: string };
  currency: { name: string; code: string; game: { name: string } };
  order: { server: string | null; characterName: string | null };
  serverRef: { id: string; name: string } | null;
}

interface DisputeMessage {
  id: string;
  userId: string;
  content: string;
  evidenceUrl: string | null;
  createdAt: string;
  user: { id: string; name: string | null; isAdmin: boolean };
}

interface AdminWithdrawal {
  id: string;
  amountBRL: number;
  status: string;
  pixKey: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface KYCVerification {
  id: string;
  phone: string;
  selfieUrl: string;
  idFrontUrl: string;
  idBackUrl: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: string;
  user: { id: string; name: string | null; email: string };
}

export default function AdminPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [disputes, setDisputes] = useState<DisputedTrade[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [kycVerifications, setKycVerifications] = useState<KYCVerification[]>(
    [],
  );
  const [kycLoading, setKycLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [withdrawalLoading, setWithdrawalLoading] = useState<string | null>(
    null,
  );
  const [pixQR, setPixQR] = useState<{
    code: string;
    amount: number;
    pixKey: string;
    pixKeyType: string;
    userEmail: string;
    withdrawalId: string;
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<AdminWithdrawal | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Chat state
  const [chatTradeId, setChatTradeId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<DisputeMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [statsRes, disputesRes, withdrawalsRes, kycRes] = await Promise.all(
        [
          fetch("/api/admin/stats"),
          fetch("/api/admin/disputes"),
          fetch("/api/admin/withdrawals"),
          fetch("/api/admin/verifications"),
        ],
      );

      const statsData = await statsRes.json();
      if (!statsData.isAdmin) {
        router.push("/");
        return;
      }
      setStats(statsData);

      if (disputesRes.ok) {
        setDisputes(await disputesRes.json());
      }
      if (withdrawalsRes.ok) {
        setWithdrawals(await withdrawalsRes.json());
      }
      if (kycRes.ok) {
        setKycVerifications(await kycRes.json());
      }
    } catch {
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/admin/login");
      return;
    }
    if (session) {
      loadData();
    }
  }, [session, sessionStatus, router, loadData]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const openChat = async (tradeId: string) => {
    setChatTradeId(tradeId);
    setChatMessages([]);
    setChatText("");
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
  };

  const sendChatMessage = async () => {
    if (!chatTradeId || !chatText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/trades/${chatTradeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatText.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatText("");
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

  const reviewKYC = async (
    verificationId: string,
    action: "APPROVE" | "REJECT",
  ) => {
    setKycLoading(verificationId);
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setKycVerifications((prev) =>
          prev.map((v) =>
            v.id === verificationId
              ? { ...v, status: action === "APPROVE" ? "APPROVED" : "REJECTED" }
              : v,
          ),
        );
      } else {
        alert(data.error || "Erro ao processar verificação");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setKycLoading(null);
    }
  };

  const handleGetQR = async (withdrawalId: string) => {
    setWithdrawalLoading(withdrawalId);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "GET_QR" }),
      });
      const data = await res.json();
      if (res.ok) {
        setPixQR({
          code: data.pixCode,
          amount: data.amountBRL,
          pixKey: data.pixKey ?? "",
          pixKeyType: data.pixKeyType ?? "",
          userEmail: data.userEmail ?? "",
          withdrawalId,
        });
      } else {
        alert(data.error || "Erro ao gerar QR Code");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setWithdrawalLoading(null);
    }
  };

  const handleCompleteWithdrawal = async (withdrawalId: string) => {
    setWithdrawalLoading(withdrawalId);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, action: "COMPLETE" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Saque concluído!");
        setPixQR(null);
        loadData();
      } else {
        alert(data.error || "Erro ao concluir saque");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setWithdrawalLoading(null);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!rejectModal) return;
    setWithdrawalLoading(rejectModal.id);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawalId: rejectModal.id,
          action: "REJECT",
          adminNote: rejectNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRejectModal(null);
        setRejectNote("");
        loadData();
      } else {
        alert(data.error || "Erro ao rejeitar saque");
      }
    } catch {
      alert("Erro de conexão");
    } finally {
      setWithdrawalLoading(null);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            />
          </svg>{" "}
          Painel Administrativo
        </h1>
        <p className="text-gray-500 mt-1">
          Resolva disputas entre compradores e vendedores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <p className="text-xl font-bold text-yellow-400">
              {withdrawals.filter((w) => w.status === "PENDING").length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Saques Pendentes</p>
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
                  className="border border-red-900/50 p-4 bg-red-900/10"
                >
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-medium">
                        {trade.currency.game.name} — {trade.currency.code}
                        {trade.serverRef && (
                          <span className="text-teal-400 text-sm font-normal">
                            {" "}
                            · {trade.serverRef.name}
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
                    {trade.evidenceUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Evidência:</span>
                        <a
                          href={`/api/admin/evidence?url=${encodeURIComponent(trade.evidenceUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 underline"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                            />
                          </svg>{" "}
                          Ver Gravação
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-red-900/30 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openChat(trade.id)}
                      disabled={actionLoading === trade.id}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 10h.01M12 10h.01M16 10h.01M21 16c0 1.1-.9 2-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z"
                        />
                      </svg>{" "}
                      Ver Chat
                    </Button>
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
                      {actionLoading === trade.id ? (
                        "..."
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4 inline mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                            />
                          </svg>{" "}
                          Liberar para Vendedor
                        </>
                      )}
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
                        : "Reembolsar Comprador"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Withdrawals ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-yellow-400">
            Saques Pendentes (
            {withdrawals.filter((w) => w.status === "PENDING").length})
          </h2>
        </CardHeader>
        <CardContent>
          {withdrawals.filter((w) => w.status === "PENDING").length === 0 ? (
            <EmptyState
              title="Nenhum saque pendente"
              description="Não há saques aguardando processamento."
            />
          ) : (
            <div className="space-y-3">
              {withdrawals
                .filter((w) => w.status === "PENDING")
                .map((w) => (
                  <div
                    key={w.id}
                    className="border border-yellow-900/50 p-4 bg-yellow-900/10 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">
                          {formatBRL(w.amountBRL)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(w.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">
                        {w.user.name}{" "}
                        <span className="text-gray-500 text-xs">
                          ({w.user.email})
                        </span>
                      </p>
                      {w.pixKey && (
                        <p className="text-xs text-gray-400 font-mono">
                          Pix (
                          {(w as AdminWithdrawal & { pixKeyType?: string })
                            .pixKeyType ?? "—"}
                          ):{" "}
                          <span className="text-yellow-300 select-all">
                            {w.pixKey}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGetQR(w.id)}
                        disabled={withdrawalLoading === w.id}
                      >
                        {withdrawalLoading === w.id ? (
                          "..."
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 inline mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <rect x="3" y="3" width="18" height="18" rx="0" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 9h6M9 12h6M9 15h4"
                              />
                            </svg>{" "}
                            QR Code
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCompleteWithdrawal(w.id)}
                        disabled={withdrawalLoading === w.id}
                      >
                        {withdrawalLoading === w.id ? (
                          "..."
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 inline mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>{" "}
                            Concluir
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setRejectModal(w);
                          setRejectNote("");
                        }}
                        disabled={withdrawalLoading === w.id}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 inline mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>{" "}
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KYC Verifications ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-teal-400">
            Verificações KYC Pendentes (
            {kycVerifications.filter((v) => v.status === "PENDING").length})
          </h2>
        </CardHeader>
        <CardContent>
          {kycVerifications.filter((v) => v.status === "PENDING").length ===
          0 ? (
            <EmptyState
              title="Nenhuma verificação pendente"
              description="Não há documentos aguardando revisão."
            />
          ) : (
            <div className="space-y-4">
              {kycVerifications
                .filter((v) => v.status === "PENDING")
                .map((v) => (
                  <div
                    key={v.id}
                    className="bg-gray-800/50 border border-gray-700 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{v.user.name}</p>
                        <p className="text-xs text-gray-400">{v.user.email}</p>
                        <p className="text-xs text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5 inline mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>{" "}
                          {v.phone}
                        </p>
                        <p className="text-xs text-gray-500">
                          Enviado em{" "}
                          {new Date(v.submittedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => reviewKYC(v.id, "APPROVE")}
                          disabled={kycLoading === v.id}
                        >
                          {kycLoading === v.id ? (
                            "..."
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 inline mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>{" "}
                              Aprovar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => reviewKYC(v.id, "REJECT")}
                          disabled={kycLoading === v.id}
                        >
                          {kycLoading === v.id ? (
                            "..."
                          ) : (
                            <>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 inline mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>{" "}
                              Rejeitar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={`/api/admin/evidence?url=${encodeURIComponent(v.selfieUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-400 underline inline-flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>{" "}
                        Ver Selfie
                      </a>
                      <a
                        href={`/api/admin/evidence?url=${encodeURIComponent(v.idFrontUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-400 underline inline-flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <rect x="2" y="5" width="20" height="14" rx="0" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 15h3m4 0h3M7 11h3m4 0h3"
                          />
                        </svg>{" "}
                        Frente do Doc
                      </a>
                      {v.idBackUrl && (
                        <a
                          href={`/api/admin/evidence?url=${encodeURIComponent(v.idBackUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-teal-400 underline inline-flex items-center gap-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <rect x="2" y="5" width="20" height="14" rx="0" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 15h3m4 0h3M7 11h3m4 0h3"
                            />
                          </svg>{" "}
                          Verso do Doc
                        </a>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dispute Chat Modal ───────────────────────────────────── */}
      <Modal
        isOpen={!!chatTradeId}
        onClose={closeChat}
        title="Disputa — Chat (Admin)"
        className="max-w-2xl"
      >
        <div className="flex flex-col gap-3">
          <div className="h-80 overflow-y-auto space-y-3 pr-1">
            {chatLoading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Carregando mensagens…
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                Nenhuma mensagem ainda.
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col items-start">
                  <div
                    className={`max-w-[90%] px-3 py-2 text-sm ${msg.user.isAdmin ? "bg-purple-900/60 border border-purple-700/50" : "bg-gray-700/60 border border-gray-600/50"}`}
                  >
                    <p className="text-xs font-medium mb-1 text-gray-400">
                      {msg.user.isAdmin ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5 inline mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                            />
                          </svg>
                          Admin
                        </>
                      ) : (
                        msg.user.name || "Usuário"
                      )}
                      {" · "}
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                          />
                        </svg>{" "}
                        Ver Gravação
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="border-t border-gray-700 pt-3">
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
                placeholder="Escreva como admin… (Enter para enviar)"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent h-16"
              />
              <Button
                variant="primary"
                onClick={sendChatMessage}
                disabled={!chatText.trim() || sendingMessage}
              >
                {sendingMessage ? "…" : "Enviar"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Pix QR Code Modal */}
      <Modal
        isOpen={!!pixQR}
        onClose={() => setPixQR(null)}
        title="Pagar via Pix"
      >
        {pixQR && (
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeSVG value={pixQR.code} size={256} />
            <p className="text-xl font-bold text-white">
              R$ {Number(pixQR.amount).toFixed(2)}
            </p>
            <div className="text-sm text-gray-400 text-center space-y-1">
              <p>
                <span className="text-gray-300 font-medium">Chave:</span>{" "}
                <span className="font-mono">{pixQR.pixKey}</span>
              </p>
              <p>
                <span className="text-gray-300 font-medium">Tipo:</span>{" "}
                {pixQR.pixKeyType}
              </p>
              <p>
                <span className="text-gray-300 font-medium">Usuário:</span>{" "}
                {pixQR.userEmail}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Escaneie com seu app bancário para pagar e clique em Concluir após
              o envio
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(pixQR.code)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 inline mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>{" "}
                Copiar Pix Copia e Cola
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCompleteWithdrawal(pixQR.withdrawalId)}
                disabled={withdrawalLoading === pixQR.withdrawalId}
              >
                {withdrawalLoading === pixQR.withdrawalId ? (
                  "..."
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 inline mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>{" "}
                    Concluir Saque
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Note Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectNote("");
        }}
        title="Rejeitar Saque"
      >
        {rejectModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Saque de{" "}
              <span className="text-white font-semibold">
                {formatBRL(rejectModal.amountBRL)}
              </span>{" "}
              de <span className="text-white">{rejectModal.user.name}</span> (
              {rejectModal.user.email})
            </p>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                Motivo da rejeição{" "}
                <span className="text-gray-500 text-xs">
                  (opcional — será exibido ao usuário)
                </span>
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Ex: chave Pix inválida, documentação pendente..."
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 text-white text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setRejectModal(null);
                  setRejectNote("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleRejectWithdrawal}
                disabled={withdrawalLoading === rejectModal.id}
              >
                {withdrawalLoading === rejectModal.id
                  ? "Rejeitando..."
                  : "Confirmar Rejeição"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
