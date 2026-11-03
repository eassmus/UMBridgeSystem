"use client";

import Link from "next/link";
import { useTournament } from "@/components/tournament";
import { Section } from "@/components/ui";
import { formatBoards } from "@/lib/bridge/board";
import { seatOf } from "@/lib/bridge/movements";
import { hasPlayed } from "@/lib/derive";

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
        {m.rounds.map((round, i) => (
          <div key={i} className="mb-4">
            <p className="font-medium">Round {i + 1}</p>
            <table className="mt-1 w-full text-sm">
              <tbody className="divide-y divide-neutral-200 border-y border-neutral-200">
                {round.tables.map((t) => {
                  const done = t.boards.filter((b) => hasPlayed(view, t.ns, b)).length;
                  const mine = t.ns === pair || t.ew === pair;
                  return (
                    <tr key={t.table} className={mine ? "bg-neutral-100" : ""}>
                      <td className="py-2 pl-1">Table {t.table}</td>
                      <td className="py-2">
                        {t.ns} v {t.ew}
                      </td>
                      <td className="py-2">bds {formatBoards(t.boards)}</td>
                      <td className="py-2 pr-1 text-right text-neutral-500">
                        {done === t.boards.length ? "done" : `${done}/${t.boards.length}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {round.sitOut.length > 0 && <p className="mt-1 text-sm text-neutral-600">Sit out: pair {round.sitOut.join(", ")}</p>}
          </div>
        ))}
      </Section>
    </div>
  );
}
