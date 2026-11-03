/*
 * Pairs movements. Templates work on pair "positions" 1..2T and board sets 1..S; they are
 * resolved against real pair numbers and boards by buildMovement. A position with no pair
 * is the phantom: whoever faces it sits out.
 *
 * Howells use the cyclic starter–adder construction (a Room square): in round r the
 * stationary pair 2T plays pair r on set r at the last table, and moving table k seats
 * (r+x) N-S v (r+y) E-W on set r+a (mod m = 2T−1). No Room square exists for 2 or 3
 * tables, so those share boards: 2 tables share every round (standard relay Howell), the
 * 3-table Howell is Sicherman's t3-5 with round 5 shared by all tables.
 */

export type MovementKind = "howell" | "mitchell";

export interface MovementTable {
  table: number;
  ns: number;
  ew: number;
  boards: number[];
}

export interface MovementRound {
  tables: MovementTable[];
  sitOut: number[];
}

export interface Movement {
  kind: MovementKind;
  label: string;
  twoWinner: boolean;
  boardsPerRound: number;
  pairs: number[]; // pair numbers it was built for
  boards: number[]; // tournament boards it was built for
  rounds: MovementRound[];
}

interface Seat {
  table: number;
  ns: number;
  ew: number;
  set: number;
}

interface Template {
  label: string;
  twoWinner: boolean;
  rounds: Seat[][];
}

const circle = (m: number) => Array.from({ length: (m - 1) / 2 }, (_, i): [number, number] => [i + 1, m - 1 - i]);

// Keyed by number of tables. T=4 reproduces Sicherman's published 4-table Howell.
const CYCLIC: Record<number, { starter: [number, number][]; adders: number[] }> = {
  2: { starter: [[1, 2]], adders: [0] },
  4: { starter: [[2, 5], [1, 6], [4, 3]], adders: [3, 5, 6] },
  5: { starter: [[1, 2], [3, 7], [4, 6], [5, 8]], adders: [5, 4, 2, 7] },
  6: { starter: circle(11), adders: [3, 5, 9, 1, 4] },
  7: { starter: circle(13), adders: [3, 5, 9, 1, 6, 2] },
};

function cyclicHowell(tables: number): Template {
  const { starter, adders } = CYCLIC[tables];
  const m = 2 * tables - 1;
  const label = (x: number) => ((((x - 1) % m) + m) % m) + 1;
  const rounds = Array.from({ length: m }, (_, i) => {
    const r = i + 1;
    const seats = starter.map(([x, y], k) => ({ table: k + 1, ns: label(r + x), ew: label(r + y), set: label(r + adders[k]) }));
    return [...seats, { table: tables, ns: 2 * tables, ew: r, set: r }];
  });
  return { label: `${tables}-table Howell`, twoWinner: false, rounds };
}

// [ns, ew, set] per table; stationary pair 6 at table 3.
const HOWELL_3: [number, number, number][][] = [
  [[4, 3, 2], [2, 5, 4], [6, 1, 1]],
  [[5, 4, 3], [3, 1, 4], [6, 2, 2]],
  [[1, 5, 2], [4, 2, 1], [6, 3, 3]],
  [[2, 1, 3], [5, 3, 1], [6, 4, 4]],
  [[3, 2, 5], [1, 4, 5], [6, 5, 5]],
];

const howell3 = (): Template => ({
  label: "3-table Howell",
  twoWinner: false,
  rounds: HOWELL_3.map((round) => round.map(([ns, ew, set], i) => ({ table: i + 1, ns, ew, set }))),
});

/**
 * N-S pairs 1..T stay put, E-W pairs T+1..2T move up a table, boards move down a table.
 * Even T: E-W skip a table after round T/2 (skip Mitchell, T−1 rounds).
 */
function mitchell(tables: number): Template {
  const even = tables % 2 === 0;
  const mod = (x: number) => ((x % tables) + tables) % tables;
  const rounds = Array.from({ length: even ? tables - 1 : tables }, (_, r) => {
    const skip = even && r >= tables / 2 ? 1 : 0;
    return Array.from({ length: tables }, (_, t) => ({
      table: t + 1,
      ns: t + 1,
      ew: tables + 1 + mod(t - r - skip),
      set: mod(t + r) + 1,
    }));
  });
  return { label: `${tables}-table Mitchell`, twoWinner: true, rounds };
}

function template(kind: MovementKind, pairs: number): Template | null {
  const tables = Math.ceil(pairs / 2);
  if (pairs < 4) return null;
  if (kind === "mitchell") return tables >= 3 ? mitchell(tables) : null;
  if (tables === 3) return howell3();
  return CYCLIC[tables] ? cyclicHowell(tables) : null;
}

export interface MovementOption {
  kind: MovementKind;
  label: string;
  rounds: number;
  twoWinner: boolean;
  recommended: boolean;
}

export function movementOptions(pairs: number): MovementOption[] {
  return (["howell", "mitchell"] as const).flatMap((kind) => {
    const t = template(kind, pairs);
    if (!t) return [];
    const recommended = (kind === "howell") === (pairs <= 8);
    return [{ kind, label: t.label, rounds: t.rounds.length, twoWinner: t.twoWinner, recommended }];
  });
}

/** Seats where both positions are real pairs, for the first `rounds` rounds. */
function realRounds(t: Template, pairs: number, rounds: number) {
  return t.rounds.slice(0, rounds).map((seats) => ({
    seats: seats.filter((s) => s.ns <= pairs && s.ew <= pairs),
    sitOut: seats.flatMap((s) => (s.ns > pairs ? [s.ew] : s.ew > pairs ? [s.ns] : [])),
  }));
}

function usedSets(t: Template, pairs: number, rounds: number): number[] {
  const sets = new Set(realRounds(t, pairs, rounds).flatMap((r) => r.seats.map((s) => s.set)));
  return [...sets].sort((a, b) => a - b);
}

/** How many board sets a movement needs (boards per round ≤ boards / this). */
export function setsNeeded(kind: MovementKind, pairs: number, rounds: number): number {
  const t = template(kind, pairs);
  return t ? usedSets(t, pairs, rounds).length : 0;
}

export function buildMovement(
  kind: MovementKind,
  pairs: number[],
  boards: number[],
  boardsPerRound: number,
  rounds: number,
): Movement {
  const t = template(kind, pairs.length);
  if (!t) throw new Error(`No ${kind} movement for ${pairs.length} pairs`);
  if (rounds < 1 || rounds > t.rounds.length) throw new Error(`Rounds must be 1–${t.rounds.length}`);
  const sets = usedSets(t, pairs.length, rounds);
  const max = Math.floor(boards.length / sets.length);
  if (boardsPerRound < 1 || boardsPerRound > max)
    throw new Error(max < 1 ? `This movement needs at least ${sets.length} boards` : `At most ${max} boards per round`);

  const setBoards = new Map(sets.map((s, i) => [s, boards.slice(i * boardsPerRound, (i + 1) * boardsPerRound)]));
  const pair = (position: number) => pairs[position - 1];
  return {
    kind,
    label: t.label,
    twoWinner: t.twoWinner,
    boardsPerRound,
    pairs,
    boards,
    rounds: realRounds(t, pairs.length, rounds).map((r) => ({
      tables: r.seats.map((s) => ({ table: s.table, ns: pair(s.ns), ew: pair(s.ew), boards: setBoards.get(s.set)! })),
      sitOut: r.sitOut.map(pair),
    })),
  };
}

export interface PairSeat extends MovementTable {
  dir: "NS" | "EW";
  opp: number;
}

/** Where a pair sits in a round, or null if it sits out. */
export function seatOf(round: MovementRound, pair: number): PairSeat | null {
  const t = round.tables.find((t) => t.ns === pair || t.ew === pair);
  if (!t) return null;
  return t.ns === pair ? { ...t, dir: "NS", opp: t.ew } : { ...t, dir: "EW", opp: t.ns };
}

/** Other tables playing the same boards in this round. */
export function sharedWith(round: MovementRound, table: MovementTable): number[] {
  return round.tables.filter((t) => t.table !== table.table && t.boards[0] === table.boards[0]).map((t) => t.table);
}

/** Fixed direction of a pair in a two-winner movement. */
export function directionOf(m: Movement, pair: number): "NS" | "EW" | null {
  for (const r of m.rounds) {
    const s = seatOf(r, pair);
    if (s) return s.dir;
  }
  return null;
}
