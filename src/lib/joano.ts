// Constantes oficiais do Joano TCG.
// A arquitetura permite expandir para até 9 atributos sem quebrar o motor.

export const JOANO_ATTRIBUTES = [
  { key: "FOR", label: "Força" },
  { key: "AGI", label: "Agilidade" },
  { key: "INT", label: "Inteligência" },
  { key: "RES", label: "Resistência" },
  { key: "CAR", label: "Carisma" },
  { key: "ALM", label: "Alma" },
] as const;

export type JoanoAttributeKey = (typeof JOANO_ATTRIBUTES)[number]["key"];

export const JOANO_CARD_TYPES = [
  { v: "guerreiro", l: "Guerreiro" },
  { v: "arma", l: "Arma" },
  { v: "efeito", l: "Efeito" },
  { v: "suporte", l: "Suporte" },
];

export const JOANO_VALUE_POINTS = [1, 2, 3] as const;

// Verso padrão do Joano (usado quando a carta não tem verso próprio
// e o jogo não definiu um verso padrão).
export const JOANO_DEFAULT_BACK =
  "https://lbmimvgupspdjfnqpjqw.supabase.co/storage/v1/object/public/game-assets/system/joano-card-back.svg";
