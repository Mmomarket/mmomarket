"use client";

import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

export default function VerificacaoPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Como as transações funcionam</h1>
        <p className="text-gray-400 mt-1">
          O MMOMarket utiliza confirmação mútua e resolução de disputas para
          garantir a segurança das negociações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Fluxo da Negociação</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            {
              step: "1",
              title: "Ordem combinada",
              desc: "Quando uma ordem de compra e uma de venda se encaixam, um trade é criado automaticamente. O saldo do comprador fica em custódia (escrow) até a conclusão.",
            },
            {
              step: "2",
              title: "Entrega dos itens",
              desc: "O vendedor entrega os itens/moedas dentro do jogo ao comprador, no personagem e servidor indicados na ordem.",
            },
            {
              step: "3",
              title: "Confirmação mútua",
              desc: "Comprador e vendedor confirmam a entrega na página de Histórico. Após ambas as confirmações, o pagamento é liberado ao vendedor.",
            },
            {
              step: "4",
              title: "Guarde as evidências",
              desc: "Ambas as partes devem guardar prints ou gravações da transação. Em caso de disputa, essas provas serão solicitadas pela equipe do MMOMarket para análise.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-4">
              <div className="w-8 h-8 bg-emerald-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">
                  {step}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Disputas</h2>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-400">
          <p>
            Se houver discordância (itens não entregues, valor incorreto, etc.),
            qualquer parte pode abrir uma disputa diretamente na página do
            trade.
          </p>
          <p>
            A equipe do MMOMarket irá analisar as evidências enviadas por ambos
            os lados — prints, vídeos ou qualquer comprovação da transação — e
            decidir como o escrow será liberado.
          </p>
          <p className="text-yellow-400">
            ⚠️ Sempre guarde evidências antes de confirmar a entrega. Uma vez
            confirmada por ambas as partes, a transação não pode ser revertida.
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link
          href="/negociar"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          💱 Ir para Negociar
        </Link>
      </div>
    </div>
  );
}
