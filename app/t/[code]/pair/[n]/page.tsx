"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PairResult } from "@/components/PairResult";
import { useTournament } from "@/components/tournament";
import { num } from "@/lib/bridge/format";
import { involves, pairName } from "@/lib/derive";

export default function PairPage() {
  const { view } = useTournament();
  const pair = Number(useParams<{ n: string }>().n);
  if (!view.pairs.some((p) => p.number === pair)) return <p>There is no pair {pair}.</p>;
  const standing = view.standings.find((s) => s.pair === pair); // missing until the game is finished

  const rows = view.results.filter((r) => involves(r, pair)).sort((a, b) => a.board - b.board);
  const missing = view.played.filter((p) => involves(p, pair)).length - rows.length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pair {pair}</h1>
      <p className="text-neutral-600">{pairName(view, pair)}</p>
      {standing && (
        <p className="mt-2">
          {standing.pct === null ? "No boards scored yet" : `${num(standing.pct)}% · ${num(standing.mp)} MP over ${standing.boards} boards`}
          {standing.rank && ` · rank ${standing.rank}`}
        </p>
      )}

      <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/t/${view.code}/boards/${r.board}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <span>
                <span className="block font-medium">Board {r.board}</span>
                <span className="text-sm text-neutral-600">
                  {r.ns === pair ? "N-S" : "E-W"} vs Pair {r.ns === pair ? r.ew : r.ns}
                </span>
              </span>
              <PairResult r={r} pair={pair} />
            </Link>
          </li>
        ))}
      </ul>
      {missing > 0 && (
        <p className="mt-3 text-sm text-neutral-600">
          {missing} more board{missing === 1 ? "" : "s"} hidden until you&apos;ve played them.
        </p>
      )}
    </div>
  );
}
