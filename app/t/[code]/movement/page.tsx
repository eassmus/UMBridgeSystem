"use client";

import Link from "next/link";
import { MovementProgress } from "@/components/Progress";
import { useTournament } from "@/components/tournament";
import { Section } from "@/components/ui";
import { formatBoards } from "@/lib/bridge/board";
import { seatOf } from "@/lib/bridge/movements";

export default function MovementPage() {
  const { view } = useTournament();
  const m = view.movement;
  const pair = view.me?.pair ?? null;

  if (!m)
    return (
      <p className="text-neutral-600">
        No movement set: results are entered freely.
        {view.me?.director && (
          <>
            {" "}
            <Link href={`/t/${view.code}/manage`} className="underline">
              Set one up in Manage.
            </Link>
          </>
        )}
      </p>
    );

  return (
    <div>
      <p className="text-neutral-600">
        {m.label} · {m.rounds.length} rounds × {m.boardsPerRound} board{m.boardsPerRound === 1 ? "" : "s"}
        {m.twoWinner && " · separate N-S and E-W rankings"}
      </p>

      {pair !== null && (
        <Section title={`Pair ${pair} guide`}>
          <ol className="divide-y divide-neutral-200 border-y border-neutral-200">
            {m.rounds.map((round, i) => {
              const s = seatOf(round, pair);
              return (
                <li key={i} className="flex justify-between py-2">
                  <span>Round {i + 1}</span>
                  <span className="text-neutral-700">
                    {s ? `Table ${s.table} ${s.dir === "NS" ? "N-S" : "E-W"} vs ${s.opp} · bds ${formatBoards(s.boards)}` : "Sit out"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      <Section title="All tables">
        <MovementProgress view={view} movement={m} />
      </Section>
    </div>
  );
}
