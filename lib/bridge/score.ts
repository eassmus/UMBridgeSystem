import { isVul, type Seat } from "./board";

export type Strain = "C" | "D" | "H" | "S" | "NT";
export type Adj = "A+" | "A" | "A-";
export type ResultKind = "contract" | "passout" | "adjusted" | "notplayed";

/** One table's result on a board, flat like the DB row. */
export interface ResultData {
  kind: ResultKind;
  level?: number | null;
  strain?: Strain | null;
  doubled?: number | null; // 0 | 1 (X) | 2 (XX)
  declarer?: Seat | null;
  tricks?: number | null; // total tricks taken by declarer
  nsAdj?: Adj | null;
  ewAdj?: Adj | null;
}

/** Score for the declaring side (Law 77). */
export function contractScore(level: number, strain: Strain, doubled: number, vul: boolean, tricks: number): number {
  const over = tricks - (level + 6);
  if (over < 0) {
    const down = -over;
    if (doubled === 0) return -down * (vul ? 100 : 50);
    // Doubled: NV 100, 300, 500, then +300 each; V 200, 500, 800, then +300 each.
    const penalty = vul ? 300 * down - 100 : down <= 3 ? 200 * down - 100 : 300 * down - 400;
    return -penalty * doubled;
  }
  const perTrick = strain === "C" || strain === "D" ? 20 : 30;
  const trickScore = (perTrick * level + (strain === "NT" ? 10 : 0)) * 2 ** doubled;
  let score = trickScore + (trickScore >= 100 ? (vul ? 500 : 300) : 50);
  if (level === 6) score += vul ? 750 : 500;
  if (level === 7) score += vul ? 1500 : 1000;
  score += 50 * doubled; // insult
  score += over * (doubled === 0 ? perTrick : (vul ? 200 : 100) * doubled);
  return score;
}

/** N-S score of a played result (pass-out = 0), or null for adjusted / not played. */
export function nsScore(board: number, r: ResultData): number | null {
  if (r.kind === "passout") return 0;
  if (r.kind !== "contract") return null;
  const declarer = r.declarer!;
  const s = contractScore(r.level!, r.strain!, r.doubled ?? 0, isVul(board, declarer), r.tricks!);
  return declarer === "N" || declarer === "S" ? s : -s;
}
