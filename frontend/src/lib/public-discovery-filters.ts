import type { SportType } from "@/lib/mock-data";

export type PublicSportFilterOption = { value: SportType | ""; label: string };

export const PUBLIC_SPORT_FILTERS: PublicSportFilterOption[] = [
  { value: "", label: "Todos os esportes" },
  { value: "FOOTBALL", label: "Futebol" },
  { value: "BASKETBALL", label: "Basquete" },
  { value: "VOLLEYBALL", label: "Vôlei" },
  { value: "FUTSAL", label: "Futsal" },
];

/** Values used by the public event search league filter (empty = all leagues). */
export const PUBLIC_LEAGUE_FILTERS = ["", "Série A", "Série B", "NBB", "Superliga"] as const;

export type PublicLeagueFilterValue = (typeof PUBLIC_LEAGUE_FILTERS)[number];

/** Non-empty league labels from `PUBLIC_LEAGUE_FILTERS` (for marketing / highlights). */
export const PUBLIC_LEAGUE_HIGHLIGHTS = PUBLIC_LEAGUE_FILTERS.filter(
  (l): l is Exclude<PublicLeagueFilterValue, ""> => l !== ""
);

/**
 * Phrase fragment for auth/marketing copy, tied to catalog league exports
 * (basketball NBB + volleyball Superliga when both are present).
 */
export function formatMarketingNonFootballLeaguesSpan(): string {
  const nbb = PUBLIC_LEAGUE_HIGHLIGHTS.find((l) => l === "NBB");
  const superliga = PUBLIC_LEAGUE_HIGHLIGHTS.find((l) => l === "Superliga");
  if (nbb && superliga) return `do ${nbb} à ${superliga}`;
  if (PUBLIC_LEAGUE_HIGHLIGHTS.length === 0) return "";
  if (PUBLIC_LEAGUE_HIGHLIGHTS.length === 1) return `do ${PUBLIC_LEAGUE_HIGHLIGHTS[0]}`;
  const allButLast = PUBLIC_LEAGUE_HIGHLIGHTS.slice(0, -1);
  const last = PUBLIC_LEAGUE_HIGHLIGHTS[PUBLIC_LEAGUE_HIGHLIGHTS.length - 1];
  return `de ${allButLast.join(", ")} e ${last}`;
}
