import type { ResultData, Strain } from "./score";

// U+FE0E keeps iOS from rendering suits as emoji.
export const SUIT: Record<Strain, string> = { C: "♣︎", D: "♦︎", H: "♥︎", S: "♠︎", NT: "NT" };
export const STRAINS: Strain[] = ["C", "D", "H", "S", "NT"];
export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** "=", "+1", "-2" relative to the contract. */
export const tricksText = (level: number, tricks: number) => (tricks === level + 6 ? "=" : signed(tricks - level - 6));

/** Lead "SK" -> "♠K", "HT" -> "♥10" (rank may be missing while picking). */
export const leadText = (lead: string) => `${SUIT[lead[0] as Strain]}${lead[1] === "T" ? "10" : (lead[1] ?? "")}`;

/** Plain-text summary, e.g. "4♠X by S +1". */
export function resultText(r: ResultData): string {
  if (r.kind === "passout") return "Passed out";
  if (r.kind === "notplayed") return "Not played";
  if (r.kind === "adjusted") return `Adjusted ${r.nsAdj} / ${r.ewAdj}`;
  const x = ["", "X", "XX"][r.doubled ?? 0];
  return `${r.level}${SUIT[r.strain!]}${x} by ${r.declarer} ${tricksText(r.level!, r.tricks!)}`;
}

/** Up to `digits` decimals, trailing zeros dropped. */
export const num = (n: number, digits = 2) => String(Number(n.toFixed(digits)));
