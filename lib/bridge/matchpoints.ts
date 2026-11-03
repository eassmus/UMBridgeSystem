import { nsScore, type Adj, type ResultData } from "./score";

export interface SessionResult extends ResultData {
  id: number;
  board: number;
  ns: number;
  ew: number;
}

export interface ResultMp {
  nsMp: number;
  ewMp: number;
  nsPct: number;
  ewPct: number;
}

export interface PairTotal {
  mp: number;
  boards: number;
  pct: number;
}

/**
 * Matchpoints a session (ACBL units: 1 per score beaten, ½ per tie).
 * Every board is factored to the same top (E−1, E = most results on any board) with the
 * Neuberg formula; artificial adjusted scores (Law 12C2) are excluded from the comparison.
 */
export function scoreSession(results: SessionResult[]) {
  const counted = results.filter((r) => r.kind !== "notplayed");
  const byBoard = new Map<number, SessionResult[]>();
  for (const r of counted) byBoard.set(r.board, [...(byBoard.get(r.board) ?? []), r]);

  const expected = Math.max(1, ...[...byBoard.values()].map((rs) => rs.length));
  const top = expected - 1;
  const pct = (mp: number) => (top > 0 ? (mp / top) * 100 : 50);
  const mps = new Map<number, ResultMp>();
  const set = (r: SessionResult, nsMp: number) =>
    mps.set(r.id, { nsMp, ewMp: top - nsMp, nsPct: pct(nsMp), ewPct: pct(top - nsMp) });

  for (const rs of byBoard.values()) {
    const real = rs.filter((r) => r.kind !== "adjusted").map((r) => ({ r, score: nsScore(r.board, r)! }));
    for (const { r, score } of real) {
      // Counting itself as a tie adds the ½ that Neuberg's (MP + ½)·E/A − ½ needs.
      const raw = real.reduce((sum, o) => sum + (o.score < score ? 1 : o.score === score ? 0.5 : 0), 0);
      set(r, (raw * expected) / real.length - 0.5);
    }
  }

  const totals = (filter: (r: SessionResult) => boolean) => {
    const t = new Map<number, PairTotal>();
    const add = (pair: number, mp: number) => {
      const cur = t.get(pair) ?? { mp: 0, boards: 0, pct: 0 };
      cur.mp += mp;
      cur.boards += 1;
      cur.pct = top > 0 ? (cur.mp / (cur.boards * top)) * 100 : 50;
      t.set(pair, cur);
    };
    for (const r of counted.filter(filter)) {
      const m = mps.get(r.id)!;
      add(r.ns, m.nsMp);
      add(r.ew, m.ewMp);
    }
    return t;
  };

  // Law 12C2(c): A+ is the pair's own session % if above 60, A− its own % if below 40.
  const realTotals = totals((r) => r.kind !== "adjusted");
  const adjPct = (adj: Adj | null | undefined, pair: number) => {
    const own = realTotals.get(pair)?.pct;
    if (adj === "A+") return Math.max(60, own ?? 60);
    if (adj === "A-") return Math.min(40, own ?? 40);
    return 50;
  };
  for (const r of counted.filter((r) => r.kind === "adjusted")) {
    const nsPct = adjPct(r.nsAdj, r.ns);
    const ewPct = adjPct(r.ewAdj, r.ew);
    mps.set(r.id, { nsMp: (nsPct / 100) * top, ewMp: (ewPct / 100) * top, nsPct, ewPct });
  }

  return { top, mps, totals: totals(() => true) };
}

/** Sorts by percentage and adds ranks; equal percentages share a rank ("=2"), no score = "". */
export function withRanks<T extends { pct: number | null }>(rows: T[]): (T & { rank: string })[] {
  const sorted = [...rows].sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  return sorted.map((row) => {
    if (row.pct === null) return { ...row, rank: "" };
    const ties = sorted.filter((o) => o.pct !== null && Math.abs(o.pct - row.pct!) < 1e-9);
    return { ...row, rank: `${ties.length > 1 ? "=" : ""}${sorted.indexOf(ties[0]) + 1}` };
  });
}
