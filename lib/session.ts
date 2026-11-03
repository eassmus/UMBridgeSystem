import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, tournaments, type Session, type Tournament } from "@/db/schema";

const cookieName = (code: string) => `bt_${code}`;

export async function getTournament(code: string): Promise<Tournament | undefined> {
  return db.select().from(tournaments).where(eq(tournaments.code, code)).get();
}

export async function getSession(t: Tournament): Promise<Session | null> {
  const token = (await cookies()).get(cookieName(t.code))?.value;
  if (!token) return null;
  const s = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), eq(sessions.tournamentId, t.id)))
    .get();
  return s ?? null;
}

/** Updates the caller's session, creating it (and its cookie) if needed. Server actions only. */
export async function saveSession(t: Tournament, patch: Partial<Pick<Session, "pair" | "isDirector">>) {
  const existing = await getSession(t);
  if (existing) {
    await db.update(sessions).set(patch).where(eq(sessions.token, existing.token));
    return;
  }
  const token = crypto.randomUUID();
  await db.insert(sessions).values({ token, tournamentId: t.id, ...patch });
  (await cookies()).set(cookieName(t.code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(t: Tournament) {
  (await cookies()).delete(cookieName(t.code));
}

/** Shown as "entered by". */
export const displayName = (s: Session) => (s.isDirector ? "Director" : `Pair ${s.pair}`);
