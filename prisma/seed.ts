import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const GAMES_DATA = [
  {
    name: "Final Fantasy XIV",
    slug: "final-fantasy-xiv",
    image: "/games/final-fantasy-xiv.png",
    description:
      "MMORPG da Square Enix com história épica e grande comunidade global.",
    servers: [
      { name: "Aether", slug: "aether" },
      { name: "Crystal", slug: "crystal" },
      { name: "Dynamis", slug: "dynamis" },
      { name: "Primal", slug: "primal" },
      { name: "Chaos", slug: "chaos" },
      { name: "Light", slug: "light" },
      { name: "Elemental", slug: "elemental" },
      { name: "Gaia", slug: "gaia" },
      { name: "Mana", slug: "mana" },
      { name: "Meteor", slug: "meteor" },
      { name: "Materia", slug: "materia" },
    ],
    currencies: [
      { name: "Gil", code: "GIL", unitLabel: "Gil", minTrade: 100000 },
      { name: "MGP", code: "MGP", unitLabel: "MGP", minTrade: 1000 },
    ],
  },
  {
    name: "Guild Wars 2",
    slug: "guild-wars-2",
    image: "/games/guild-wars-2.png",
    description: "MMORPG com economia dinâmica e sem assinatura mensal.",
    servers: [
      { name: "North America", slug: "north-america" },
      { name: "Europe", slug: "europe" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Gems", code: "GEMS", unitLabel: "Gems", minTrade: 100 },
    ],
  },
  {
    name: "Lost Ark",
    slug: "lost-ark",
    image: "/games/lost-ark.png",
    description:
      "ARPG/MMORPG da Smilegate com combate dinâmico e raids épicas.",
    servers: [
      { name: "North America East", slug: "na-east" },
      { name: "North America West", slug: "na-west" },
      { name: "Europe Central", slug: "eu-central" },
      { name: "Europe West", slug: "eu-west" },
      { name: "South America", slug: "south-america" },
      { name: "Korea", slug: "korea" },
      { name: "Japan", slug: "japan" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "Blue Crystal", code: "BC", unitLabel: "BC", minTrade: 1 },
    ],
  },
  {
    name: "Old School RuneScape",
    slug: "old-school-runescape",
    image: "/games/old-school-runescape.png",
    description:
      "A versão clássica de RuneScape, mantida com suporte ativo da comunidade.",
    servers: [{ name: "OSRS", slug: "osrs" }],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "GP", minTrade: 1000000 },
    ],
  },
  {
    name: "RuneScape",
    slug: "runescape",
    image: "/games/runescape.png",
    description:
      "O MMORPG browser mais icônico do mundo, agora em versão moderna.",
    servers: [{ name: "RS", slug: "rs" }],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "GP", minTrade: 1000000 },
      { name: "Bonds", code: "BONDS", unitLabel: "Bond", minTrade: 1 },
    ],
  },
  {
    name: "Throne and Liberty",
    slug: "throne-and-liberty",
    image: "/games/throne-and-liberty.png",
    description: "MMORPG da NCSoft com mundo dinâmico e PvP em larga escala.",
    servers: [
      { name: "North America East", slug: "na-east" },
      { name: "North America West", slug: "na-west" },
      { name: "Europe", slug: "europe" },
      { name: "South America", slug: "south-america" },
      { name: "Japan", slug: "japan" },
      { name: "Korea", slug: "korea" },
    ],
    currencies: [
      { name: "Lucent", code: "LUCENT", unitLabel: "Lucent", minTrade: 1 },
      {
        name: "Sollant",
        code: "SOLLANT",
        unitLabel: "Sollant",
        minTrade: 10000,
      },
    ],
  },
  {
    name: "Tree of Savior",
    slug: "tree-of-savior",
    image: "/games/tree-of-savior.png",
    description:
      "MMORPG espiritual sucessor de Ragnarok Online, com centenas de classes.",
    servers: [
      { name: "NA-Zachariel", slug: "na-zachariel" },
      { name: "Papaya (NA + SA)", slug: "papaya" },
    ],
    currencies: [
      {
        name: "Silver",
        code: "SILVER",
        unitLabel: "Silver",
        minTrade: 1000000,
      },
      { name: "TP", code: "TP", unitLabel: "TP", minTrade: 1 },
    ],
  },
  {
    name: "Aion Classic",
    slug: "aion-classic",
    image: "/games/aion-classic.png",
    description:
      "A versão clássica do Aion, com as mecânicas originais de PvPvE.",
    servers: [
      { name: "North America", slug: "north-america" },
      { name: "Europe", slug: "europe" },
      { name: "Korea", slug: "korea" },
    ],
    currencies: [
      { name: "Kinah", code: "KINAH", unitLabel: "Kinah", minTrade: 1000000 },
      { name: "BCM Coins", code: "BCM", unitLabel: "BCM", minTrade: 1 },
    ],
  },
  {
    name: "Aion",
    slug: "aion",
    image: "/games/aion.png",
    description:
      "MMORPG com voo e PvPvE em zonas de conflito entre Elyos e Asmodians.",
    servers: [
      { name: "North America", slug: "north-america" },
      { name: "Europe", slug: "europe" },
      { name: "Korea", slug: "korea" },
    ],
    currencies: [
      { name: "Kinah", code: "KINAH", unitLabel: "Kinah", minTrade: 1000000 },
      { name: "BCM Coins", code: "BCM", unitLabel: "BCM", minTrade: 1 },
    ],
  },
  {
    name: "Metin2",
    slug: "metin2",
    image: "/games/metin2.png",
    description: "MMORPG com temática oriental, muito popular no Brasil.",
    servers: [
      { name: "Oceana", slug: "oceana" },
      { name: "Chimera", slug: "chimera" },
      { name: "Tigerghost", slug: "tigerghost" },
      { name: "Iberia", slug: "iberia" },
      { name: "Italia", slug: "italia" },
      { name: "Europe", slug: "europe" },
      { name: "Teutonia", slug: "teutonia" },
    ],
    currencies: [
      { name: "Yang", code: "YANG", unitLabel: "Yang", minTrade: 1000000 },
      { name: "Dragon Coins", code: "DC", unitLabel: "DC", minTrade: 1 },
    ],
  },
  {
    name: "Black Desert Online",
    slug: "black-desert-online",
    image: "/games/black-desert-online.png",
    description:
      "MMORPG com gráficos incríveis e sistema de comércio complexo.",
    servers: [{ name: "SA", slug: "sa" }],
    currencies: [
      {
        name: "Silver",
        code: "SILVER",
        unitLabel: "Silver",
        minTrade: 1000000,
      },
      { name: "Pearls", code: "PEARLS", unitLabel: "Pearl", minTrade: 1 },
    ],
  },
  {
    name: "Cabal",
    slug: "cabal",
    image: "/games/cabal.png",
    description: "MMORPG de ação com sistema de Force e batalhas estilosas.",
    servers: [
      { name: "NA-Mercury", slug: "na-mercury" },
      { name: "NA-Venus", slug: "na-venus" },
      { name: "EU-Mercury", slug: "eu-mercury" },
      { name: "EU-Venus", slug: "eu-venus" },
    ],
    currencies: [
      { name: "Alz", code: "ALZ", unitLabel: "Alz", minTrade: 1000000 },
      { name: "eCoins", code: "EC", unitLabel: "eCoins", minTrade: 1 },
    ],
  },
  {
    name: "Dofus",
    slug: "dofus",
    image: "/games/dofus.png",
    description: "MMORPG tático com estilo visual único e economia rica.",
    servers: [
      { name: "Brial", slug: "brial" },
      { name: "Dakal", slug: "dakal" },
      { name: "Draconiros", slug: "draconiros" },
      { name: "Hell Mina", slug: "hell-mina" },
      { name: "Imagiro", slug: "imagiro" },
      { name: "Kourial", slug: "kourial" },
      { name: "Mikhal", slug: "mikhal" },
      { name: "Orukam", slug: "orukam" },
      { name: "Rafal", slug: "rafal" },
      { name: "Salar", slug: "salar" },
      { name: "Sombra", slug: "sombra" },
      { name: "Tal Kasha", slug: "tal-kasha" },
      { name: "Tylezia", slug: "tylezia" },
    ],
    currencies: [
      { name: "Kamas", code: "KAMAS", unitLabel: "Kama", minTrade: 100000 },
      { name: "Ogrines", code: "OGRINES", unitLabel: "Ogrine", minTrade: 1 },
    ],
  },
  {
    name: "Flyff",
    slug: "flyff",
    image: "/games/flyff.png",
    description:
      "MMORPG com sistema de voo em vastas e com grande nostalgia para brasileiros.",
    servers: [{ name: "Brasil", slug: "brasil" }],
    currencies: [
      { name: "Penya", code: "PENYA", unitLabel: "Penya", minTrade: 1000000 },
      { name: "G-Token", code: "GT", unitLabel: "G-Token", minTrade: 1 },
    ],
  },
  {
    name: "Lineage 2",
    slug: "lineage-2",
    image: "/games/lineage-2.png",
    description: "MMORPG épico com guerras de clã e sieges.",
    servers: [{ name: "ZGaming", slug: "zgaming" }],
    currencies: [
      { name: "Adena", code: "ADENA", unitLabel: "Adena", minTrade: 1000000 },
      { name: "NCoin", code: "NCOIN", unitLabel: "NCoin", minTrade: 1 },
    ],
  },
  {
    name: "MapleStory",
    slug: "maplestory",
    image: "/games/maplestory.png",
    description:
      "MMORPG 2D side-scrolling da Nexon com enorme variedade de classes.",
    servers: [
      { name: "Bera", slug: "bera" },
      { name: "Scania", slug: "scania" },
      { name: "Aurora", slug: "aurora" },
      { name: "Elysium", slug: "elysium" },
      { name: "Hyperion", slug: "hyperion" },
      { name: "Kronos", slug: "kronos" },
    ],
    currencies: [
      { name: "Mesos", code: "MESOS", unitLabel: "Meso", minTrade: 100000000 },
      { name: "NX Cash", code: "NX", unitLabel: "NX", minTrade: 1 },
    ],
  },
  {
    name: "Albion Online",
    slug: "albion-online",
    image: "/games/albion-online.png",
    description:
      "MMORPG sandbox com economia player-driven e PvP em mundo aberto.",
    servers: [
      { name: "Americas", slug: "americas" },
      { name: "Europe", slug: "europe" },
      { name: "Asia", slug: "asia" },
    ],
    currencies: [
      {
        name: "Silver",
        code: "SILVER",
        unitLabel: "Silver",
        minTrade: 1000000,
      },
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
    ],
  },
  {
    name: "Mu Online",
    slug: "mu-online",
    image: "/games/mu-online.png",
    description: "MMORPG clássico com grande base de jogadores brasileiros.",
    servers: [
      { name: "Hellheim", slug: "hellheim" },
      { name: "Alfheim", slug: "alfheim" },
      { name: "Midgard", slug: "midgard" },
      { name: "Arcadia", slug: "arcadia" },
      { name: "Fresei", slug: "fresei" },
      { name: "Nidavellir", slug: "nidavellir" },
      { name: "Ydalir", slug: "ydalir" },
      { name: "Noatun", slug: "noatun" },
      { name: "Jotunheim", slug: "jotunheim" },
      { name: "Nifflheim", slug: "nifflheim" },
    ],
    currencies: [
      { name: "Zen", code: "ZEN", unitLabel: "Zen", minTrade: 1000000 },
      { name: "WCoin", code: "WCOIN", unitLabel: "WCoin", minTrade: 1 },
    ],
  },
  {
    name: "Perfect World",
    slug: "perfect-world",
    image: "/games/perfect-world.png",
    description: "MMORPG com voo livre e PvP massivo, muito jogado no Brasil.",
    servers: [
      { name: "Ophiuchus", slug: "ophiuchus" },
      { name: "Cassiopea", slug: "cassiopea" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Silver", code: "SILVER", unitLabel: "Silver", minTrade: 1000 },
    ],
  },
  {
    name: "Ragnarok LATAM",
    slug: "ragnarok-latam",
    image: "/games/ragnarok-latam.png",
    description:
      "Ragnarok Online oficial para América Latina, nostálgico e ativo.",
    servers: [
      { name: "Freya", slug: "freya" },
      { name: "Yggdrasil", slug: "yggdrasil" },
    ],
    currencies: [
      { name: "Zeny", code: "ZENY", unitLabel: "Zeny", minTrade: 100000 },
      { name: "Kafra Points", code: "KP", unitLabel: "KP", minTrade: 1 },
    ],
  },
  {
    name: "Talisman Online",
    slug: "talisman-online",
    image: "/games/talisman-online.png",
    description:
      "MMORPG com temática de artes marciais chinesas e sistema de talismãs.",
    servers: [
      { name: "White Horse", slug: "white-horse" },
      { name: "Tiger Fish", slug: "tiger-fish" },
      { name: "Sky Ice", slug: "sky-ice" },
      { name: "All Stars", slug: "all-stars" },
      { name: "Light in the Darkness", slug: "light-in-the-darkness" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "Silver", code: "SILVER", unitLabel: "Silver", minTrade: 100000 },
    ],
  },
  {
    name: "Tibia",
    slug: "tibia",
    image: "/games/tibia.png",
    description:
      "MMORPG clássico da CipSoft, extremamente popular no Brasil desde os anos 2000.",
    servers: [
      { name: "Secura", slug: "secura" },
      { name: "Antica", slug: "antica" },
      { name: "Nevia", slug: "nevia" },
      { name: "Vunira", slug: "vunira" },
      { name: "Bona", slug: "bona" },
      { name: "Celesta", slug: "celesta" },
      { name: "Thyria", slug: "thyria" },
      { name: "Dia", slug: "dia" },
      { name: "Refugia", slug: "refugia" },
      { name: "Peloria", slug: "peloria" },
      { name: "Harmonia", slug: "harmonia" },
      { name: "Monza", slug: "monza" },
      { name: "Karmeya", slug: "karmeya" },
      { name: "Ustebra", slug: "ustebra" },
      { name: "Inabra", slug: "inabra" },
      { name: "Ferobra", slug: "ferobra" },
      { name: "Belobra", slug: "belobra" },
      { name: "Quelibra", slug: "quelibra" },
      { name: "Lobera", slug: "lobera" },
      { name: "Xyla", slug: "xyla" },
      { name: "Serdebra", slug: "serdebra" },
      { name: "Gentebra", slug: "gentebra" },
      { name: "Nefera", slug: "nefera" },
      { name: "Kalanta", slug: "kalanta" },
      { name: "Premia", slug: "premia" },
      { name: "Astera", slug: "astera" },
      { name: "Yonabra", slug: "yonabra" },
      { name: "Talera", slug: "talera" },
      { name: "Wintera", slug: "wintera" },
      { name: "Solidera", slug: "solidera" },
      { name: "Ourobra", slug: "ourobra" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "Tibia Coins", code: "TC", unitLabel: "TC", minTrade: 1 },
    ],
  },
  {
    name: "World of Warcraft",
    slug: "world-of-warcraft",
    image: "/games/world-of-warcraft.png",
    description:
      "O MMORPG mais famoso do mundo, com comunidade ativa no Brasil.",
    servers: [
      { name: "Azralon", slug: "azralon" },
      { name: "Goldrinn", slug: "goldrinn" },
      { name: "Nemesis", slug: "nemesis" },
      { name: "Tol Barad", slug: "tol-barad" },
      { name: "Gallywix", slug: "gallywix" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "WoW Token", code: "TOKEN", unitLabel: "Token", minTrade: 1 },
    ],
  },
  {
    name: "WYD",
    slug: "wyd",
    image: "/games/wyd.png",
    description:
      "MMORPG clássico brasileiro com grandes batalhas e guilds poderosas.",
    servers: [{ name: "WYD Global", slug: "wyd-global" }],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 10000 },
      { name: "WCash", code: "WCASH", unitLabel: "WCash", minTrade: 1 },
    ],
  },
];

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createAdapter() {
  if (process.env.TURSO_DATABASE_URL) {
    console.log("Using Turso/LibSQL adapter");
    return new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  const dbPath = path.resolve(__dirname, "..", "dev.db");
  console.log("DB path:", dbPath);
  return new PrismaBetterSqlite3({ url: dbPath });
}

const adapter = createAdapter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  for (const game of GAMES_DATA) {
    const createdGame = await prisma.game.upsert({
      where: { slug: game.slug },
      update: {
        name: game.name,
        image: game.image,
        description: game.description,
      },
      create: {
        name: game.name,
        slug: game.slug,
        image: game.image,
        description: game.description,
      },
    });

    console.log(`  🎮 ${createdGame.name}`);

    // Seed servers
    for (const server of game.servers) {
      await prisma.server.upsert({
        where: {
          slug_gameId: {
            slug: server.slug,
            gameId: createdGame.id,
          },
        },
        update: {
          name: server.name,
        },
        create: {
          name: server.name,
          slug: server.slug,
          gameId: createdGame.id,
        },
      });
      console.log(`    🖥️  ${server.name}`);
    }

    for (const currency of game.currencies) {
      await prisma.currency.upsert({
        where: {
          code_gameId: {
            code: currency.code,
            gameId: createdGame.id,
          },
        },
        update: {
          name: currency.name,
          unitLabel: currency.unitLabel,
          minTrade: currency.minTrade,
        },
        create: {
          name: currency.name,
          code: currency.code,
          gameId: createdGame.id,
          unitLabel: currency.unitLabel,
          minTrade: currency.minTrade,
        },
      });
      console.log(`    💰 ${currency.name} (${currency.code})`);
    }
  }

  // Create sample price history data for demo purposes
  const currencies = await prisma.currency.findMany({
    include: { game: true },
  });
  const servers = await prisma.server.findMany();

  // Build a map of gameId -> serverIds for quick lookup
  const gameServersMap = new Map<string, string[]>();
  for (const srv of servers) {
    if (!gameServersMap.has(srv.gameId)) {
      gameServersMap.set(srv.gameId, []);
    }
    gameServersMap.get(srv.gameId)!.push(srv.id);
  }

  const now = new Date();
  for (const currency of currencies) {
    const gameServerIds = gameServersMap.get(currency.gameId) || [];

    for (const serverId of gameServerIds) {
      const srv = servers.find((s) => s.id === serverId);

      // --- Resume checkpoint: skip if history already exists for this pair ---
      const existingCount = await prisma.priceHistory.count({
        where: { currencyId: currency.id, serverId },
      });
      if (existingCount > 0) {
        console.log(
          `  ⏭️  Skipping (already seeded): ${currency.name} (${currency.game.name} - ${srv?.name})`,
        );
        continue;
      }

      // Build all records in memory first, then insert in one batch
      let basePrice = Math.random() * 0.05 + 0.001;
      const records = [];
      for (let day = 30; day >= 0; day--) {
        for (let hour = 0; hour < 24; hour += 4) {
          const fluctuation = (Math.random() - 0.48) * 0.002;
          basePrice = Math.max(0.0001, basePrice + fluctuation);

          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - day);
          timestamp.setHours(hour, 0, 0, 0);

          const volume = Math.random() * 10000 + 100;
          records.push({
            currencyId: currency.id,
            serverId,
            avgPrice: basePrice,
            minPrice: basePrice * (1 - Math.random() * 0.05),
            maxPrice: basePrice * (1 + Math.random() * 0.05),
            volume,
            volumeBRL: volume * basePrice,
            period: "4h",
            timestamp,
          });
        }
      }

      // Single network round-trip instead of 186
      await prisma.priceHistory.createMany({ data: records });
      console.log(
        `  📊 Price history for ${currency.name} (${currency.game.name} - ${srv?.name}) [${records.length} records]`,
      );
    }
  }

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
