"use server";

import { and, eq, inArray, max, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pairs, results, sessions, tournaments, type Session, type Tournament } from "@/db/schema";
import { MAX_BOARD } from "@/lib/bridge/board";
import { buildMovement, type MovementKind } from "@/lib/bridge/movements";
import { clearSessionCookie, displayName, getSession, getTournament, saveSession } from "@/lib/session";

export type ActionResult<T = object> = (T & { error?: undefined }) | { error: string };

class UserError extends Error {}

async function run<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    if (e instanceof z.ZodError) return { error: "Invalid input" };
    throw e;
  }
}

async function load(code: string) {
  const t = await getTournament(code);
  if (!t) throw new UserError("Tournament not found");
  return { t, me: await getSession(t) };
}

function requireDirector(me: Session | null) {
  if (!me?.isDirector) throw new UserError("Only the director can do that");
}

/** Players may change results on boards their pair played; adjusted scores are director-only. */
function requireCanEdit(me: Session | null, r: { ns: number; ew: number; kind: string }) {
  if (me?.isDirector) return;
  if (me?.pair == null || (r.ns !== me.pair && r.ew !== me.pair))
    throw new UserError("You can only change results for boards your pair played");
  if (r.kind === "adjusted") throw new UserError("Only the director can set adjusted scores");
}

const digits = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => x % 10).join("");
const pairName = z.string().trim().max(60);
const boardList = z
  .array(z.number().int().min(1).max(MAX_BOARD))
  .min(1)
  .transform((b) => [...new Set(b)].sort((x, y) => x - y));

async function addPairRow(t: Tournament, name: string) {
  const row = await db.select({ n: max(pairs.number) }).from(pairs).where(eq(pairs.tournamentId, t.id)).get();
  const number = (row?.n ?? 0) + 1;
  await db.insert(pairs).values({ tournamentId: t.id, number, name: pairName.parse(name) });
  return number;
}

export async function createTournament(input: { name: string; boards: number[] }) {
  return run(async () => {
    const v = z.object({ name: z.string().trim().min(1).max(80), boards: boardList }).parse(input);
    let t: Tournament | undefined;
    for (let i = 0; !t && i < 10; i++) {
      const code = digits(6);
      if (await getTournament(code)) continue;
      [t] = await db.insert(tournaments).values({ code, name: v.name, boards: v.boards, directorPin: digits(4) }).returning();
    }
    if (!t) throw new UserError("Could not create a code, try again");
    await saveSession(t, { isDirector: true });
    return { code: t.code };
  });
}

/** Join a pair as one of its players (pair = null leaves it). */
export async function joinPair(code: string, pair: number | null) {
  return run(async () => {
    const { t } = await load(code);
    if (pair !== null) {
      const p = await db.select().from(pairs).where(and(eq(pairs.tournamentId, t.id), eq(pairs.number, pair))).get();
      if (!p) throw new UserError("That pair no longer exists");
    }
    await saveSession(t, { pair });
    return {};
  });
}

/** A player registers their partnership and joins it. */
export async function registerPair(code: string, name: string) {
  return run(async () => {
    const { t } = await load(code);
    const number = await addPairRow(t, name);
    await saveSession(t, { pair: number });
    return { number };
  });
}

export async function directorLogin(code: string, pin: string) {
  return run(async () => {
    const { t } = await load(code);
    if (pin.trim() !== t.directorPin) throw new UserError("Wrong PIN");
    await saveSession(t, { isDirector: true });
    return {};
  });
}

const resultData = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("contract"),
    level: z.number().int().min(1).max(7),
    strain: z.enum(["C", "D", "H", "S", "NT"]),
    doubled: z.number().int().min(0).max(2),
    declarer: z.enum(["N", "E", "S", "W"]),
    tricks: z.number().int().min(0).max(13),
    lead: z.string().regex(/^[SHDC][AKQJT98765432]$/).nullable(),
  }),
  z.object({ kind: z.literal("passout") }),
  z.object({ kind: z.literal("notplayed") }),
  z.object({ kind: z.literal("adjusted"), nsAdj: z.enum(["A+", "A", "A-"]), ewAdj: z.enum(["A+", "A", "A-"]) }),
]);
const resultTarget = z.object({ id: z.number().int().nullable(), board: z.number().int(), ns: z.number().int(), ew: z.number().int() });

export type SaveResultInput = z.input<typeof resultTarget> & z.input<typeof resultData>;

export async function saveResult(code: string, input: SaveResultInput) {
  return run(async () => {
    const { t, me } = await load(code);
    const { id, board, ns, ew } = resultTarget.parse(input);
    const data = resultData.parse(input);

    if (!t.boards.includes(board)) throw new UserError(`Board ${board} isn't in this tournament`);
    if (ns === ew) throw new UserError("N-S and E-W must be different pairs");
    const known = await db.select({ n: pairs.number }).from(pairs).where(eq(pairs.tournamentId, t.id));
    for (const p of [ns, ew]) if (!known.some((k) => k.n === p)) throw new UserError(`There is no pair ${p}`);

    const existing =
      id === null ? undefined : await db.select().from(results).where(and(eq(results.id, id), eq(results.tournamentId, t.id))).get();
    if (id !== null && !existing) throw new UserError("That result was deleted in the meantime");
    requireCanEdit(me, { ns, ew, kind: data.kind });
    if (existing) requireCanEdit(me, existing);

    const clash = await db
      .select()
      .from(results)
      .where(
        and(
          eq(results.tournamentId, t.id),
          eq(results.board, board),
          or(inArray(results.ns, [ns, ew]), inArray(results.ew, [ns, ew])),
          existing ? ne(results.id, existing.id) : undefined,
        ),
      )
      .get();
    if (clash) {
      const p = [ns, ew].find((p) => p === clash.ns || p === clash.ew);
      throw new UserError(`Pair ${p} already has a result on board ${board}`);
    }

    // Reset every field so switching e.g. contract -> pass out leaves nothing stale.
    const row = {
      ...{ level: null, strain: null, doubled: null, declarer: null, tricks: null, lead: null, nsAdj: null, ewAdj: null },
      ...data,
      board,
      ns,
      ew,
      updatedBy: displayName(me!),
      updatedAt: new Date(),
    };
    if (existing) {
      await db.update(results).set(row).where(eq(results.id, existing.id));
      return { id: existing.id };
    }
    const [created] = await db
      .insert(results)
      .values({ ...row, tournamentId: t.id, createdBy: row.updatedBy })
      .returning({ id: results.id });
    return { id: created.id };
  });
}

export async function deleteResult(code: string, id: number) {
  return run(async () => {
    const { t, me } = await load(code);
    const r = await db.select().from(results).where(and(eq(results.id, id), eq(results.tournamentId, t.id))).get();
    if (!r) return {};
    requireCanEdit(me, r);
    await db.delete(results).where(eq(results.id, r.id));
    return {};
  });
}

export async function updatePair(code: string, number: number, name: string) {
  return run(async () => {
    const { t, me } = await load(code);
    if (!me?.isDirector && me?.pair !== number) throw new UserError("You can only rename your own pair");
    await db
      .update(pairs)
      .set({ name: pairName.parse(name) })
      .where(and(eq(pairs.tournamentId, t.id), eq(pairs.number, number)));
    return {};
  });
}

export async function addPair(code: string, name: string) {
  return run(async () => {
    const { t, me } = await load(code);
    requireDirector(me);
    return { number: await addPairRow(t, name) };
  });
}

export async function removePair(code: string, number: number) {
  return run(async () => {
    const { t, me } = await load(code);
    requireDirector(me);
    const used = await db
      .select({ id: results.id })
      .from(results)
      .where(and(eq(results.tournamentId, t.id), or(eq(results.ns, number), eq(results.ew, number))))
      .get();
    if (used) throw new UserError(`Pair ${number} has results — delete those first`);
    await db.batch([
      db.delete(pairs).where(and(eq(pairs.tournamentId, t.id), eq(pairs.number, number))),
      db.update(sessions).set({ pair: null }).where(and(eq(sessions.tournamentId, t.id), eq(sessions.pair, number))),
    ]);
    return {};
  });
}

export async function updateTournament(code: string, input: { name?: string; boards?: number[]; finished?: boolean }) {
  return run(async () => {
    const { t, me } = await load(code);
    requireDirector(me);
    const v = z
      .object({ name: z.string().trim().min(1).max(80).optional(), boards: boardList.optional(), finished: z.boolean().optional() })
      .parse(input);
    if (v.boards) {
      const used = await db.selectDistinct({ board: results.board }).from(results).where(eq(results.tournamentId, t.id));
      const dropped = used.map((u) => u.board).filter((b) => !v.boards!.includes(b));
      if (dropped.length) throw new UserError(`Board ${dropped.join(", ")} has results — delete those first`);
    }
    await db.update(tournaments).set(v).where(eq(tournaments.id, t.id));
    return {};
  });
}

export async function setMovement(code: string, input: { kind: MovementKind; boardsPerRound: number; rounds: number } | null) {
  return run(async () => {
    const { t, me } = await load(code);
    requireDirector(me);
    let movement = null;
    if (input) {
      const ps = await db.select({ n: pairs.number }).from(pairs).where(eq(pairs.tournamentId, t.id)).orderBy(pairs.number);
      try {
        movement = buildMovement(input.kind, ps.map((p) => p.n), t.boards, input.boardsPerRound, input.rounds);
      } catch (e) {
        throw new UserError((e as Error).message);
      }
    }
    await db.update(tournaments).set({ movement }).where(eq(tournaments.id, t.id));
    return {};
  });
}

export async function deleteTournament(code: string) {
  return run(async () => {
    const { t, me } = await load(code);
    requireDirector(me);
    await db.batch([
      db.delete(results).where(eq(results.tournamentId, t.id)),
      db.delete(sessions).where(eq(sessions.tournamentId, t.id)),
      db.delete(pairs).where(eq(pairs.tournamentId, t.id)),
      db.delete(tournaments).where(eq(tournaments.id, t.id)),
    ]);
    await clearSessionCookie(t);
    return {};
  });
}
