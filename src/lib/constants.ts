// Platform fee percentage
export const PLATFORM_FEE_PERCENT = 2;

// Game data for the top 10 MMORPGs in Brazil
export const GAMES_DATA = [
  {
    name: "Tibia",
    slug: "tibia",
    image: "/games/tibia.png",
    description:
      "MMORPG clássico da CipSoft, extremamente popular no Brasil desde os anos 2000.",
    servers: [
      { name: "Inabra", slug: "inabra" },
      { name: "Ustebra", slug: "ustebra" },
    ],
    currencies: [
      { name: "Tibia Coins", code: "TC", unitLabel: "TC", minTrade: 1 },
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
    ],
  },
  {
    name: "Mu Online",
    slug: "mu-online",
    image: "/games/mu-online.png",
    description: "MMORPG coreano com grande base de jogadores brasileiros.",
    servers: [
      { name: "Gavea", slug: "gavea" },
      { name: "Arca", slug: "arca" },
    ],
    currencies: [
      { name: "Zen", code: "ZEN", unitLabel: "Zen", minTrade: 1000000 },
      { name: "WCoin", code: "WCOIN", unitLabel: "WCoin", minTrade: 1 },
      { name: "Jewel of Bless", code: "JOB", unitLabel: "JoB", minTrade: 1 },
    ],
  },
  {
    name: "Ragnarok Online",
    slug: "ragnarok-online",
    image: "/games/ragnarok.png",
    description: "MMORPG que marcou uma geração de jogadores brasileiros.",
    servers: [
      { name: "Valhalla", slug: "valhalla" },
      { name: "Yggdrasil", slug: "yggdrasil" },
    ],
    currencies: [
      { name: "Zeny", code: "ZENY", unitLabel: "Zeny", minTrade: 100000 },
      { name: "Kafra Points", code: "KP", unitLabel: "KP", minTrade: 1 },
    ],
  },
  {
    name: "Perfect World",
    slug: "perfect-world",
    image: "/games/perfect-world.png",
    description: "MMORPG com voo livre e PvP massivo, muito jogado no Brasil.",
    servers: [
      { name: "Tyr", slug: "tyr" },
      { name: "Arcadia", slug: "arcadia" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Silver", code: "SILVER", unitLabel: "Silver", minTrade: 1000 },
    ],
  },
  {
    name: "Lineage 2",
    slug: "lineage-2",
    image: "/games/lineage2.png",
    description: "MMORPG épico com guerras de clã e sieges.",
    servers: [
      { name: "Aden", slug: "aden" },
      { name: "Bartz", slug: "bartz" },
    ],
    currencies: [
      { name: "Adena", code: "ADENA", unitLabel: "Adena", minTrade: 1000000 },
      { name: "NCoin", code: "NCOIN", unitLabel: "NCoin", minTrade: 1 },
    ],
  },
  {
    name: "World of Warcraft",
    slug: "world-of-warcraft",
    image: "/games/wow.png",
    description:
      "O MMORPG mais famoso do mundo, com comunidade ativa no Brasil.",
    servers: [
      { name: "Azralon", slug: "azralon" },
      { name: "Nemesis", slug: "nemesis" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1000 },
      { name: "WoW Token", code: "TOKEN", unitLabel: "Token", minTrade: 1 },
    ],
  },
  {
    name: "Guild Wars 2",
    slug: "guild-wars-2",
    image: "/games/gw2.png",
    description: "MMORPG buy-to-play com economia dinâmica.",
    servers: [
      { name: "Jade Quarry", slug: "jade-quarry" },
      { name: "Blackgate", slug: "blackgate" },
    ],
    currencies: [
      { name: "Gold", code: "GOLD", unitLabel: "Gold", minTrade: 1 },
      { name: "Gems", code: "GEMS", unitLabel: "Gems", minTrade: 100 },
    ],
  },
  {
    name: "Black Desert Online",
    slug: "black-desert-online",
    image: "/games/bdo.png",
    description:
      "MMORPG com gráficos incríveis e sistema de comércio complexo.",
    servers: [
      { name: "SA Olvia", slug: "sa-olvia" },
      { name: "SA Calpheon", slug: "sa-calpheon" },
    ],
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
    name: "Metin2",
    slug: "metin2",
    image: "/games/metin2.png",
    description: "MMORPG com temática oriental, muito popular no Brasil.",
    servers: [
      { name: "Tróia", slug: "troia" },
      { name: "Gaia", slug: "gaia" },
    ],
    currencies: [
      { name: "Yang", code: "YANG", unitLabel: "Yang", minTrade: 1000000 },
      { name: "Dragon Coins", code: "DC", unitLabel: "DC", minTrade: 1 },
    ],
  },
  {
    name: "Dofus",
    slug: "dofus",
    image: "/games/dofus.png",
    description: "MMORPG tático com estilo visual único e economia rica.",
    servers: [
      { name: "Draconiros", slug: "draconiros" },
      { name: "Imagiro", slug: "imagiro" },
    ],
    currencies: [
      { name: "Kamas", code: "KAMAS", unitLabel: "Kama", minTrade: 100000 },
      { name: "Ogrines", code: "OGRINES", unitLabel: "Ogrine", minTrade: 1 },
    ],
  },
];
