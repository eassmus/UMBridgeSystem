import { describe, expect, it } from "vitest";
import { dealer, formatBoards, parseBoards, vulnerability } from "./board";
import { scoreSession, withRanks, type SessionResult } from "./matchpoints";
import { buildMovement, movementOptions, type MovementKind } from "./movements";
import { contractScore, type Strain } from "./score";

describe("contractScore (Law 77)", () => {
  const cases: [string, number, Strain, number, boolean, number, number][] = [
    ["4S= NV", 4, "S", 0, false, 10, 420],
    ["3NT+1 V", 3, "NT", 0, true, 10, 630],
    ["1NTX-1 V", 1, "NT", 1, true, 6, -200],
    ["7NTXX= V", 7, "NT", 2, true, 13, 2980],
    ["4HX-4 NV", 4, "H", 1, false, 6, -800],
    ["6D= V", 6, "D", 0, true, 12, 1370],
    ["2SX= NV", 2, "S", 1, false, 8, 470],
    ["1CXX+1 V", 1, "C", 2, true, 8, 630],
    ["1CX=", 1, "C", 1, false, 7, 140],
    ["2NTX= NV", 2, "NT", 1, false, 8, 490],
    ["2NTX= V", 2, "NT", 1, true, 8, 690],
    ["1SXX= NV", 1, "S", 2, false, 7, 520],
    ["4SX+1 V", 4, "S", 1, true, 11, 990],
    ["6NTX= V", 6, "NT", 1, true, 12, 1680],
    ["1CX+2 NV", 1, "C", 1, false, 9, 340],
    ["3NTX-3 NV", 3, "NT", 1, false, 6, -500],
    ["2HX-2 V", 2, "H", 1, true, 6, -500],
    ["7C= NV", 7, "C", 0, false, 13, 1440],
    ["4HXX-4 NV", 4, "H", 2, false, 6, -1600],
    ["3D+2 NV", 3, "D", 0, false, 11, 150],
    ["1NT+1 NV", 1, "NT", 0, false, 8, 120],
    ["7NTXX-13 V", 7, "NT", 2, true, 0, -7600],
    ["7NTX-13 NV", 7, "NT", 1, false, 0, -3500],
  ];
  it.each(cases)("%s", (_, level, strain, doubled, vul, tricks, expected) => {
    expect(contractScore(level, strain, doubled, vul, tricks)).toBe(expected);
  });
});

describe("board", () => {
  it("dealer and vulnerability follow Law 2", () => {
    const vul = "None NS EW Both NS EW Both None EW Both None NS Both None NS EW".split(" ");
    for (let b = 1; b <= 32; b++) {
      expect(vulnerability(b)).toBe(vul[(b - 1) % 16]);
      expect(dealer(b)).toBe("NESW"[(b - 1) % 4]);
    }
  });
  it("parses and formats board ranges", () => {
    expect(parseBoards("10-13, 16-19")).toEqual([10, 11, 12, 13, 16, 17, 18, 19]);
    expect(formatBoards([1, 2, 3, 5, 7, 8])).toBe("1-3, 5, 7-8");
    expect(() => parseBoards("3-1")).toThrow();
  });
});

const played = (id: number, board: number, ns: number, ew: number, level: number, tricks: number): SessionResult => ({
  id,
  board,
  ns,
  ew,
  kind: "contract",
  level,
  strain: "S",
  doubled: 0,
  declarer: "N",
  tricks,
});

describe("scoreSession", () => {
  it("matchpoints with ties and pass-outs (ACBL units)", () => {
    const { top, mps } = scoreSession([
      played(1, 1, 1, 2, 4, 10), // +420
      played(2, 1, 3, 4, 4, 10), // +420
      { id: 3, board: 1, ns: 5, ew: 6, kind: "passout" }, // 0
    ]);
    expect(top).toBe(2);
    expect(mps.get(1)!.nsMp).toBe(1.5);
    expect(mps.get(3)!.nsMp).toBe(0);
    expect(mps.get(3)!.ewMp).toBe(2);
  });

  it("Neuberg-factors around an artificial score (EBU White Book example)", () => {
    // Board 1 played 6 times, board 2 has an Average plus 5 real scores 4,3,2,1,0.
    const full = [1, 2, 3, 4, 5, 6].map((i) => played(i, 1, i, i + 10, 1, 7 + i));
    const part = [1, 2, 3, 4, 5].map((i) => played(10 + i, 2, i, i + 10, 1, 7 + (5 - i)));
    const adj: SessionResult = { id: 99, board: 2, ns: 6, ew: 16, kind: "adjusted", nsAdj: "A", ewAdj: "A" };
    const { top, mps } = scoreSession([...full, ...part, adj]);
    expect(top).toBe(5);
    [4.9, 3.7, 2.5, 1.3, 0.1].forEach((mp, i) => expect(mps.get(11 + i)!.nsMp).toBeCloseTo(mp));
    expect(mps.get(99)!.nsPct).toBe(50);
  });

  it("A+ uses the pair's own percentage when above 60 (Law 12C2c)", () => {
    const { mps } = scoreSession([
      played(1, 1, 1, 2, 4, 11),
      played(2, 1, 3, 4, 4, 10),
      { id: 3, board: 2, ns: 1, ew: 2, kind: "adjusted", nsAdj: "A+", ewAdj: "A-" },
    ]);
    expect(mps.get(3)!.nsPct).toBe(100); // pair 1 scored 100% on its real board
    expect(mps.get(3)!.ewPct).toBe(0);
  });

  it("ranks ties equally", () => {
    const ranked = withRanks([
      { pct: 50 },
      { pct: 60 },
      { pct: 50 },
      { pct: null },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual(["1", "=2", "=2", ""]);
  });
});

describe("movements", () => {
  for (let n = 4; n <= 16; n++) {
    for (const opt of movementOptions(n)) {
      it(`${opt.label} for ${n} pairs is valid`, () => {
        const pairs = Array.from({ length: n }, (_, i) => i + 1);
        const boards = Array.from({ length: 64 }, (_, i) => i + 1);
        const m = buildMovement(opt.kind as MovementKind, pairs, boards, 2, opt.rounds);
        const met = new Set<string>();
        const boardsOf = new Map<number, Set<number>>();
        for (const round of m.rounds) {
          const seated = [...round.tables.flatMap((t) => [t.ns, t.ew]), ...round.sitOut];
          expect(new Set(seated).size).toBe(seated.length); // each pair once per round
          for (const t of round.tables) {
            const key = [t.ns, t.ew].sort((a, b) => a - b).join("-");
            expect(met.has(key)).toBe(false); // no repeat opponents
            met.add(key);
            for (const p of [t.ns, t.ew]) {
              const seen = boardsOf.get(p) ?? new Set();
              for (const b of t.boards) {
                expect(seen.has(b)).toBe(false); // never plays a board twice
                seen.add(b);
              }
              boardsOf.set(p, seen);
            }
          }
        }
        if (opt.kind === "howell") expect(met.size).toBe((n * (n - 1)) / 2); // everyone meets everyone
      });
    }
  }
});
