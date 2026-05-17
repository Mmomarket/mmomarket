"use client";

import PriceChart from "@/components/charts/PriceChart";
import Badge from "@/components/ui/Badge";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { formatBRLPrecise, formatPercent } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Game {
  id: string;
  name: string;
  slug: string;
  image: string;
  currencies: Currency[];
  servers: Server[];
}

interface Currency {
  id: string;
  name: string;
  code: string;
  unitLabel: string;
  gameId: string;
}

interface Server {
  id: string;
  name: string;
  slug: string;
}

interface PriceStats {
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  history: { timestamp: string; price: number; volume: number }[];
}

// Game slug → logo filename mapping
const GAME_LOGOS: Record<string, string> = {
  tibia: "tibia.png",
  "mu-online": "mu.png",
  "ragnarok-online": "ragnarok.png",
  "perfect-world": "perfectworld.png",
  "lineage-2": "lineage2.png",
  "world-of-warcraft": "worldofwarcraft.png",
  "guild-wars-2": "guildwars2.png",
  "black-desert-online": "blackdesertonline.png",
  metin2: "metin2.png",
  dofus: "dofus.png",
};

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    null,
  );
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [priceData, setPriceData] = useState<PriceStats | null>(null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data);
        if (data.length > 0) {
          setSelectedGame(data[0]);
          if (data[0].currencies.length > 0) {
            setSelectedCurrency(data[0].currencies[0]);
          }
          if (data[0].servers.length > 0) {
            setSelectedServer(data[0].servers[0]);
          }
        }
      })
      .finally(() => setLoadingGames(false));
  }, []);

  useEffect(() => {
    if (!selectedCurrency || !selectedServer) return;
    let cancelled = false;
    const loadPrices = async () => {
      try {
        const res = await fetch(
          `/api/prices?currencyId=${selectedCurrency.id}&serverId=${selectedServer.id}&days=30`,
        );
        const data = await res.json();
        if (!cancelled) {
          setPriceData({
            currentPrice: data.stats?.currentPrice ?? 0,
            priceChange: data.stats?.priceChange ?? 0,
            priceChangePercent: data.stats?.priceChangePercent ?? 0,
            high: data.stats?.high ?? 0,
            low: data.stats?.low ?? 0,
            volume: data.stats?.totalVolume ?? 0,
            history: (data.history ?? []).map(
              (h: { timestamp: string; avgPrice: number; volume: number }) => ({
                timestamp: h.timestamp,
                price: h.avgPrice,
                volume: h.volume,
              }),
            ),
          });
        }
      } finally {
        if (!cancelled) setLoadingPrices(false);
      }
    };
    setLoadingPrices(true);
    loadPrices();
    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, selectedServer]);

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    if (game.currencies.length > 0) {
      setSelectedCurrency(game.currencies[0]);
    } else {
      setSelectedCurrency(null);
      setPriceData(null);
    }
    if (game.servers.length > 0) {
      setSelectedServer(game.servers[0]);
    } else {
      setSelectedServer(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section — video background */}
      <div className="relative overflow-hidden aspect-video sm:aspect-auto sm:min-h-[420px] flex items-center justify-center">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          style={{ userSelect: "none" }}
        >
          <source src="/assets/intro.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />
        {/* Content */}
        <div className="relative z-10 text-center space-y-5 px-4 py-12 sm:py-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Negocie moedas de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              MMORPGs
            </span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Compre e venda moedas digitais dos maiores MMORPGs do Brasil com
            segurança. Taxa de apenas 2% por transação.
          </p>
          <div className="flex items-center justify-center pt-2">
            <Link
              href="/login"
              className="px-8 py-3 bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors text-base"
            >
              Logar e Negociar
            </Link>
          </div>
        </div>
      </div>

      {/* Game Selector */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-center">Jogos</h2>
        {loadingGames ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {games.map((game) => {
              const logoFile = GAME_LOGOS[game.slug];
              return (
                <button
                  key={game.id}
                  onClick={() => handleGameSelect(game)}
                  className={`p-3 border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    selectedGame?.id === game.id
                      ? "bg-emerald-900/30 border-emerald-600/50 ring-1 ring-emerald-500/30"
                      : "bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800"
                  }`}
                >
                  {logoFile ? (
                    <Image
                      src={`/assets/gamelogos/${logoFile}`}
                      alt={game.name}
                      width={80}
                      height={40}
                      className="h-10 w-auto object-contain"
                    />
                  ) : (
                    <p className="font-medium text-sm text-white truncate">
                      {game.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {game.servers.length} servidor
                    {game.servers.length !== 1 ? "es" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Currency Tabs + Price Chart */}
      {selectedGame && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedCurrency?.name || "Selecione uma moeda"}{" "}
                    <span className="text-gray-500 font-normal">
                      — {selectedGame.name}
                      {selectedServer && ` · ${selectedServer.name}`}
                    </span>
                  </h3>
                  {priceData && (
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-2xl font-bold text-white">
                        {formatBRLPrecise(priceData.currentPrice)}
                      </span>
                      <Badge
                        variant={
                          priceData.priceChangePercent >= 0
                            ? "success"
                            : "danger"
                        }
                      >
                        {formatPercent(priceData.priceChangePercent)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              {/* Currency pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedGame.currencies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCurrency(c)}
                    className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      selectedCurrency?.id === c.id
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
              {/* Server pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedGame.servers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedServer(s)}
                    className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      selectedServer?.id === s.id
                        ? "bg-teal-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingPrices ? (
                <Skeleton className="h-[250px]" />
              ) : priceData ? (
                <PriceChart
                  data={priceData.history}
                  positive={priceData.priceChangePercent >= 0}
                  height={250}
                />
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  Selecione uma moeda para ver o gráfico
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-white text-sm">
                  Estatísticas (30 dias)
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPrices ? (
                  <>
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                    <Skeleton className="h-12" />
                  </>
                ) : priceData ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Preço Atual</span>
                      <span className="text-sm font-medium text-white">
                        {formatBRLPrecise(priceData.currentPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Variação</span>
                      <span
                        className={`text-sm font-medium ${
                          priceData.priceChangePercent >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPercent(priceData.priceChangePercent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Máxima</span>
                      <span className="text-sm font-medium text-emerald-400">
                        {formatBRLPrecise(priceData.high)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Mínima</span>
                      <span className="text-sm font-medium text-red-400">
                        {formatBRLPrecise(priceData.low)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Volume</span>
                      <span className="text-sm font-medium text-white">
                        {priceData.volume.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <hr className="border-gray-700" />
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Amplitude</span>
                      <span className="text-sm font-medium text-yellow-400">
                        {formatBRLPrecise(priceData.high - priceData.low)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Selecione uma moeda
                  </p>
                )}
              </CardContent>
            </Card>

            <Card hover>
              <Link href="/negociar">
                <CardContent className="text-center py-6">
                  <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                    Negociar Agora
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Criar ordens de compra e venda
                  </p>
                </CardContent>
              </Link>
            </Card>

            <Card hover>
              <Link href="/carteira">
                <CardContent className="text-center py-6">
                  <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect
                        x="1"
                        y="5"
                        width="22"
                        height="14"
                        rx="0"
                        strokeWidth={2}
                      />
                      <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        strokeWidth={2}
                        d="M16 12h4"
                      />
                    </svg>
                    Minha Carteira
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Depositar BRL e gerenciar saldo
                  </p>
                </CardContent>
              </Link>
            </Card>
          </div>
        </div>
      )}

      {/* All Games Overview */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-center">
          Mercados Disponíveis
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => {
            const logoFile = GAME_LOGOS[game.slug];
            return (
              <Card key={game.id} hover>
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {logoFile ? (
                        <Image
                          src={`/assets/gamelogos/${logoFile}`}
                          alt={game.name}
                          width={64}
                          height={32}
                          className="h-8 w-auto object-contain"
                        />
                      ) : (
                        <span className="font-semibold text-white">
                          {game.name}
                        </span>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">
                          {game.currencies
                            .map((c: Currency) => c.code)
                            .join(", ")}
                        </p>
                        <p className="text-xs text-gray-600">
                          {game.servers.map((s: Server) => s.name).join(", ")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/negociar?game=${game.slug}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium shrink-0"
                    >
                      Negociar →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sticky GIF — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <Image
          src="/assets/taxa_por_transacao.gif"
          alt="Taxa por transação"
          width={160}
          height={160}
          className="w-32 h-auto sm:w-40"
          unoptimized
        />
      </div>
    </div>
  );
}
