export type Seat = "N" | "E" | "S" | "W";
export type Vul = "None" | "NS" | "EW" | "Both";

const SEATS: Seat[] = ["N", "E", "S", "W"];
const VULS: Vul[] = ["None", "NS", "EW", "Both"];

// Law 2: boards 17-32 etc. repeat the 1-16 cycle.
export function dealer(board: number): Seat {
  return SEATS[(board - 1) % 4];
}

export function vulnerability(board: number): Vul {
  const i = (board - 1) % 16;
  return VULS[(i + Math.floor(i / 4)) % 4];
}

export function isVul(board: number, seat: Seat): boolean {
  const v = vulnerability(board);
  return v === "Both" || (v !== "None" && v.includes(seat));
}

export const MAX_BOARD = 128;

/** Parses "10-13, 16-19" into sorted unique board numbers. Throws on bad input. */
export function parseBoards(text: string): number[] {
  const boards = new Set<number>();
  for (const part of text.split(/[\s,]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a board number or range`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to > MAX_BOARD || from > to) throw new Error(`"${part}" is out of range`);
    for (let b = from; b <= to; b++) boards.add(b);
  }
  return [...boards].sort((a, b) => a - b);
}

/** [10,11,12,13,16] -> "10-13, 16" */
export function formatBoards(boards: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < boards.length; i++) {
    let j = i;
    while (j + 1 < boards.length && boards[j + 1] === boards[j] + 1) j++;
    out.push(i === j ? `${boards[i]}` : `${boards[i]}-${boards[j]}`);
    i = j;
  }
  return out.join(", ");
}
