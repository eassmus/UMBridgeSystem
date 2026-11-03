// Pure helpers over the client-side View.
import { seatOf, type Movement, type MovementRound } from "@/lib/bridge/movements";
import type { ResultView, View } from "@/lib/view";

export const pairName = (view: View, n: number) => view.pairs.find((p) => p.number === n)?.name ?? "";

export const involves = (r: { ns: number; ew: number }, pair: number | null | undefined) =>
  pair != null && (r.ns === pair || r.ew === pair);

/** Has this pair got any result (incl. "not played") on the board? */
export const hasPlayed = (view: View, pair: number, board: number) =>
  view.played.some((p) => p.board === board && involves(p, pair));

export const resultFor = (view: View, pair: number, board: number): ResultView | undefined =>
  view.results.find((r) => r.board === board && involves(r, pair));

/** Score and matchpoint % from one pair's point of view. */
export const scoreFor = (r: ResultView, pair: number) => (r.nsScore === null ? null : r.ns === pair ? r.nsScore : -r.nsScore);
export const pctFor = (r: ResultView, pair: number) => (r.mp ? (r.ns === pair ? r.mp.nsPct : r.mp.ewPct) : null);

export function canEdit(view: View, r: { ns: number; ew: number; kind: string }) {
  return !!view.me?.director || (involves(r, view.me?.pair) && r.kind !== "adjusted");
}

const tableDone = (view: View, t: { ns: number; boards: number[] }) => t.boards.every((b) => hasPlayed(view, t.ns, b));
const roundDone = (view: View, round: MovementRound) => round.tables.every((t) => tableDone(view, t));

/**
 * The first round in which the pair still has boards to enter ("not played" counts as
 * entered). A round it sits out lasts until the rest of the field has finished it.
 * Returns rounds.length once the pair is done.
 */
export function currentRound(view: View, m: Movement, pair: number): number {
  const i = m.rounds.findIndex((round) => {
    const s = seatOf(round, pair);
    return s ? !tableDone(view, s) : !roundDone(view, round);
  });
  return i === -1 ? m.rounds.length : i;
}

/** Boards still without a result anywhere in the movement. */
export const resultsToCome = (view: View, m: Movement) =>
  m.rounds.flatMap((r) => r.tables).reduce((n, t) => n + t.boards.filter((b) => !hasPlayed(view, t.ns, b)).length, 0);
