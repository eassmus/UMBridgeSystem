import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pairs, results, type Result } from "@/db/schema";
import { scoreSession, withRanks, type ResultMp } from "@/lib/bridge/matchpoints";
import { directionOf, type Movement } from "@/lib/bridge/movements";
import { nsScore, type ResultKind } from "@/lib/bridge/score";
import { getSession, getTournament } from "@/lib/session";

export interface ResultView extends Omit<Result, "updatedAt"> {
  updatedAt: number;
  nsScore: number | null;
  mp: ResultMp | null;
}

export interface Standing {
  pair: number;
  mp: number;
  boards: number;
  pct: number | null;
  rank: string;
  dir: "NS" | "EW" | null; // set for two-winner movements
}

export interface View {
  code: string;
  name: string;
  boards: number[];
  finished: boolean;
  movement: Movement | null;
  pairs: { number: number; name: string }[];
  me: { pair: number | null; director: boolean } | null;
  directorPin: string | null;
  /** Who played which board (no scores) — visible to everyone, drives progress. */
  played: { board: number; ns: number; ew: number; kind: ResultKind }[];
  /** Results the viewer may see. */
  results: ResultView[];
  /** Boards a playing director hasn't played yet: included, but hidden until asked. */
  hidden: number[];
  top: number;
  /** Empty for players until the game is finished. */
  standings: Standing[];
}

export async function getView(code: string): Promise<View | null> {
  const t = await getTournament(code);
  if (!t) return null;
  const [me, ps, rs] = await Promise.all([
    getSession(t),
    db.select().from(pairs).where(eq(pairs.tournamentId, t.id)).orderBy(pairs.number),
    db.select().from(results).where(eq(results.tournamentId, t.id)).orderBy(results.board, results.ns),
  ]);

  const { top, mps, totals } = scoreSession(rs);

  const myPair = me?.pair ?? null;
  const mine = (r: Result) => myPair !== null && (r.ns === myPair || r.ew === myPair);
  const playedByMe = new Set(rs.filter((r) => mine(r) && r.kind !== "notplayed").map((r) => r.board));
  const canSee = (board: number) => t.finished || playedByMe.has(board) || (!!me?.isDirector && myPair === null);
  const visible = me?.isDirector ? rs : rs.filter((r) => canSee(r.board) || mine(r));
  // Standings and matchpoints stay with the director until the game is finished.
  const scored = t.finished || !!me?.isDirector;

  const dir = (p: number) => (t.movement?.twoWinner ? directionOf(t.movement, p) : null);
  const rows = ps.map((p) => {
    const tot = totals.get(p.number);
    return { pair: p.number, mp: tot?.mp ?? 0, boards: tot?.boards ?? 0, pct: tot?.pct ?? null, dir: dir(p.number) };
  });
  const groups = [...new Set(rows.map((r) => r.dir))];
  const standings: Standing[] = groups.flatMap((g) => withRanks(rows.filter((r) => r.dir === g)));

  return {
    code: t.code,
    name: t.name,
    boards: t.boards,
    finished: t.finished,
    movement: t.movement ?? null,
    pairs: ps.map(({ number, name }) => ({ number, name })),
    me: me && { pair: myPair, director: me.isDirector },
    directorPin: me?.isDirector ? t.directorPin : null,
    played: rs.map(({ board, ns, ew, kind }) => ({ board, ns, ew, kind })),
    results: visible.map((r) => ({
      ...r,
      updatedAt: r.updatedAt.getTime(),
      nsScore: nsScore(r.board, r),
      mp: scored ? (mps.get(r.id) ?? null) : null,
    })),
    hidden: me?.isDirector ? t.boards.filter((b) => !canSee(b)) : [],
    top,
    standings: scored ? standings : [],
  };
}
