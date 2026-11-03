import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Seat } from "@/lib/bridge/board";
import type { Movement } from "@/lib/bridge/movements";
import type { Adj, ResultKind, Strain } from "@/lib/bridge/score";

const now = () => new Date();

export const tournaments = sqliteTable("tournaments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  boards: text("boards", { mode: "json" }).$type<number[]>().notNull(),
  movement: text("movement", { mode: "json" }).$type<Movement>(),
  directorPin: text("director_pin").notNull(),
  finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(now),
});

export const pairs = sqliteTable(
  "pairs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tournamentId: integer("tournament_id").notNull(),
    number: integer("number").notNull(),
    name: text("name").notNull().default(""),
  },
  (t) => [uniqueIndex("pairs_number").on(t.tournamentId, t.number)],
);

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  pair: integer("pair"), // pair number
  isDirector: integer("is_director", { mode: "boolean" }).notNull().default(false),
});

// ns / ew are pair numbers.
export const results = sqliteTable(
  "results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tournamentId: integer("tournament_id").notNull(),
    board: integer("board").notNull(),
    ns: integer("ns").notNull(),
    ew: integer("ew").notNull(),
    kind: text("kind").$type<ResultKind>().notNull(),
    level: integer("level"),
    strain: text("strain").$type<Strain>(),
    doubled: integer("doubled"),
    declarer: text("declarer").$type<Seat>(),
    tricks: integer("tricks"),
    lead: text("lead"),
    nsAdj: text("ns_adj").$type<Adj>(),
    ewAdj: text("ew_adj").$type<Adj>(),
    createdBy: text("created_by").notNull().default(""),
    updatedBy: text("updated_by").notNull().default(""),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(now),
  },
  (t) => [
    uniqueIndex("results_ns").on(t.tournamentId, t.board, t.ns),
    uniqueIndex("results_ew").on(t.tournamentId, t.board, t.ew),
  ],
);

export type Tournament = typeof tournaments.$inferSelect;
export type Pair = typeof pairs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Result = typeof results.$inferSelect;
