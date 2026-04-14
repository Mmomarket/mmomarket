"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import { formatBRL } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Wallet {
  id: string;
  balanceBRL: number;
  frozenBRL: number;
  escrowBRL: number;
}

interface Deposit {
  id: string;
  amountBRL: number;
  status: string;
  paymentUrl: string | null;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amountBRL: number;
  status: string;
  pixKey: string | null;
  createdAt: string;
}

export default function CarteiraPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  const loadWallet = useCallback(() => {
    if (!session) return;
    fetch("/api/wallet").then((r) => r.json()).then(setWallet).finally(() => setLoadingWallet(false));
  }, [session]);

  const loadDeposits = useCallback(() => {
    if (!session) return;
    fetch("/api/deposits").then((r) => r.json()).then(setDeposits).finally(() => setLoadingDeposits(false));
  }, [session]);

  const loadWithdrawals = useCallback(() => {
    if (!session) return;
    fetch("/api/withdrawals").then((r) => r.json()).then(setWithdrawals).finally(() => setLoadingWithdrawals(false));
  }, [session]);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") { router.push("/login"); return; }
    if (session) { loadWallet(); loadDeposits(); loadWithdrawals(); }
  }, [session, sessionStatus, router, loadWallet, loadDeposits, loadWithdrawals]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      const res = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountBRL: parseFloat(depositAmount) }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao criar deposito"); return; }
      if (data.paymentUrl) { setSuccess("Deposito criado! Redirecionando..."); setTimeout(() => { window.open(data.paymentUrl, "_blank"); }, 1000); } else { setSuccess("Deposito criado com sucesso!"); }
      setDepositAmount(""); loadDeposits();
    } catch { setError("Erro ao criar deposito"); } finally { setSubmitting(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(""); setWithdrawSuccess(""); setSubmittingWithdraw(true);
    try {
      const res = await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountBRL: parseFloat(withdrawAmount), pixKey, pixKeyType }) });
      const data = await res.json();
      if (!res.ok) { setWithdrawError(data.error || "Erro ao solicitar saque"); return; }
      setWithdrawSuccess(data.message || "Saque solicitado!");
      setWithdrawAmount(""); setPixKey(""); loadWallet(); loadWithdrawals();
    } catch { setWithdrawError("Erro ao solicitar saque"); } finally { setSubmittingWithdraw(false); }
  };

  const depositStatusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    PENDING: { label: "Pendente", variant: "warning" }, APPROVED: { label: "Aprovado", variant: "success" },
    REJECTED: { label: "Rejeitado", variant: "danger" }, CANCELLED: { label: "Cancelado", variant: "default" },
  };

  const withdrawalStatusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    PENDING: { label: "Pendente", variant: "warning" }, PROCESSING: { label: "Processando", variant: "info" },
    COMPLETED: { label: "Concluido", variant: "success" }, REJECTED: { label: "Rejeitado", variant: "danger" },
  };

  if (sessionStatus === "loading") {
    return (<div className="max-w-4xl mx-auto px-4 py-8 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-40" /></div>);
  }

  const pixKeyTypeOptions = [
    { value: "CPF", label: "CPF" }, { value: "CNPJ", label: "CNPJ" },
    { value: "EMAIL", label: "E-mail" }, { value: "PHONE", label: "Telefone" },
    { value: "EVP", label: "Chave Aleatoria" },
  ];

  const depositForm = (
    <form onSubmit={handleDeposit} className="space-y-4">
      {error && (<div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>)}
      {success && (<div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm px-4 py-3 rounded-lg">{success}</div>)}
      <Input id="deposit-amount" label="Valor (BRL)" type="number" placeholder="Ex: 50.00" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required min="1" step="0.01" hint="Minimo R$ 1,00. Pagamento via MercadoPago." />
      <div className="flex flex-wrap gap-2">
        {[10, 25, 50, 100, 250, 500].map((v) => (<button key={v} type="button" onClick={() => setDepositAmount(v.toString())} className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">R$ {v}</button>))}
      </div>
      <Button type="submit" loading={submitting} className="w-full" size="lg">Depositar via MercadoPago</Button>
      <p className="text-xs text-gray-600 text-center">Processado pelo MercadoPago. O saldo e creditado automaticamente.</p>
    </form>
  );

  const withdrawHint = `Minimo R$ 10,00. Disponivel: ${formatBRL(wallet?.balanceBRL ?? 0)}`;

  const withdrawForm = (
    <form onSubmit={handleWithdraw} className="space-y-4">
      {withdrawError && (<div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg">{withdrawError}</div>)}
      {withdrawSuccess && (<div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm px-4 py-3 rounded-lg">{withdrawSuccess}</div>)}
      <Input id="withdraw-amount" label="Valor (BRL)" type="number" placeholder="Ex: 50.00" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} required min="10" step="0.01" hint={withdrawHint} />
      <div className="flex flex-wrap gap-2">
        {[25, 50, 100, 250, 500].map((v) => (<button key={v} type="button" onClick={() => setWithdrawAmount(v.toString())} className="px-3 py-1.5 text-xs font-medium bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">R$ {v}</button>))}
        {wallet && wallet.balanceBRL >= 10 && (<button type="button" onClick={() => setWithdrawAmount(wallet.balanceBRL.toFixed(2))} className="px-3 py-1.5 text-xs font-medium bg-emerald-900/40 text-emerald-400 rounded-lg hover:bg-emerald-900/60 transition-colors cursor-pointer">Tudo ({formatBRL(wallet.balanceBRL)})</button>)}
      </div>
      <Select id="pix-key-type" label="Tipo de Chave Pix" options={pixKeyTypeOptions} value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} />
      <Input id="pix-key" label="Chave Pix" type="text" placeholder={pixKeyType === "CPF" ? "000.000.000-00" : pixKeyType === "EMAIL" ? "email@exemplo.com" : pixKeyType === "PHONE" ? "+5511999999999" : "Chave Pix"} value={pixKey} onChange={(e) => setPixKey(e.target.value)} required />
      <Button type="submit" loading={submittingWithdraw} className="w-full" size="lg" variant="secondary">Solicitar Saque via Pix</Button>
      <p className="text-xs text-gray-600 text-center">O saque sera processado em ate 24h via Pix.</p>
    </form>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carteira</h1>
        <p className="text-gray-500 mt-1">Gerencie seu saldo, faca depositos e saques em BRL</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold text-white">Saldo</h2></CardHeader>
          <CardContent className="space-y-4">
            {loadingWallet ? (<><Skeleton className="h-16" /><Skeleton className="h-12" /></>) : wallet ? (
              <>
                <div>
                  <p className="text-sm text-gray-400">Saldo Disponivel</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">{formatBRL(wallet.balanceBRL)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Saldo Congelado</p>
                  <p className="text-lg font-semibold text-yellow-400 mt-0.5">{formatBRL(wallet.frozenBRL)}</p>
                  <p className="text-xs text-gray-600 mt-1">Valores reservados para ordens de compra ativas</p>
                </div>
                {wallet.escrowBRL > 0 && (
                  <div>
                    <p className="text-sm text-gray-400">Em Custodia (Escrow)</p>
                    <p className="text-lg font-semibold text-orange-400 mt-0.5">{formatBRL(wallet.escrowBRL)}</p>
                    <p className="text-xs text-gray-600 mt-1">Aguardando confirmacao de entrega de moeda no jogo</p>
                  </div>
                )}
                <hr className="border-gray-700" />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Total</span>
                  <span className="text-sm font-medium text-white">{formatBRL(wallet.balanceBRL + wallet.frozenBRL + wallet.escrowBRL)}</span>
                </div>
              </>
            ) : (<p className="text-gray-500">Erro ao carregar carteira</p>)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <Tabs tabs={[{ id: "deposit", label: "Depositar", content: depositForm }, { id: "withdraw", label: "Sacar", content: withdrawForm }]} defaultTab="deposit" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Tabs
            tabs={[
              {
                id: "deposits",
                label: "Depositos",
                content: loadingDeposits ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-14" />))}</div>
                ) : deposits.length === 0 ? (
                  <EmptyState title="Nenhum deposito" description="Faca seu primeiro deposito para comecar a negociar!" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                          <th className="text-left py-2 font-medium">Data</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                          <th className="text-right py-2 font-medium">Status</th>
                          <th className="text-right py-2 font-medium">Acao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deposits.map((deposit) => {
                          const st = depositStatusMap[deposit.status] || { label: deposit.status, variant: "default" as const };
                          return (
                            <tr key={deposit.id} className="border-b border-gray-800/50">
                              <td className="py-3 text-gray-300">{new Date(deposit.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                              <td className="py-3 text-right text-white font-medium">{formatBRL(deposit.amountBRL)}</td>
                              <td className="py-3 text-right"><Badge variant={st.variant}>{st.label}</Badge></td>
                              <td className="py-3 text-right">{deposit.paymentUrl && deposit.status === "PENDING" && (<a href={deposit.paymentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Pagar &rarr;</a>)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ),
              },
              {
                id: "withdrawals",
                label: "Saques",
                content: loadingWithdrawals ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-14" />))}</div>
                ) : withdrawals.length === 0 ? (
                  <EmptyState title="Nenhum saque" description="Voce ainda nao fez nenhuma solicitacao de saque." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs border-b border-gray-700/50">
                          <th className="text-left py-2 font-medium">Data</th>
                          <th className="text-right py-2 font-medium">Valor</th>
                          <th className="text-right py-2 font-medium">Chave Pix</th>
                          <th className="text-right py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((w) => {
                          const st = withdrawalStatusMap[w.status] || { label: w.status, variant: "default" as const };
                          const pixDisplay = w.pixKey ? (w.pixKey.includes(":") ? w.pixKey.split(":").slice(1).join(":") : w.pixKey) : "\u2014";
                          return (
                            <tr key={w.id} className="border-b border-gray-800/50">
                              <td className="py-3 text-gray-300">{new Date(w.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                              <td className="py-3 text-right text-white font-medium">{formatBRL(w.amountBRL)}</td>
                              <td className="py-3 text-right text-gray-400 text-xs font-mono max-w-[120px] truncate">{pixDisplay}</td>
                              <td className="py-3 text-right"><Badge variant={st.variant}>{st.label}</Badge></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ),
              },
            ]}
            defaultTab="deposits"
          />
        </CardContent>
      </Card>
    </div>
  );
}
