"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTournament } from "@/components/tournament";
import { Traveller } from "@/components/Traveller";
import { BoardInfo, Button, LinkButton } from "@/components/ui";
import { seatOf } from "@/lib/bridge/movements";
import { involves, resultFor } from "@/lib/derive";
import type { View } from "@/lib/view";

export default function BoardPage() {
  const { view } = useTournament();
  const board = Number(useParams<{ board: string }>().board);
  const saved = useSearchParams().has("saved");
  const [reveal, setReveal] = useState(false);
  const base = `/t/${view.code}`;
  const i = view.boards.indexOf(board);
  if (i === -1) return <p>Board {board} isn&apos;t part of this game.</p>;

  const pair = view.me?.pair ?? null;
  const playedHere = view.results.some((r) => r.board === board && involves(r, pair) && r.kind !== "notplayed");
  const locked = !view.finished && !view.me?.director && !playedHere;
  const hidden = view.hidden.includes(board) && !reveal;
  const plays = view.played.filter((p) => p.board === board && p.kind !== "notplayed").length;
  const [prev, next] = [view.boards[i - 1], view.boards[i + 1]];

  return (
    <div>
      {saved && <Continue view={view} board={board} />}

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Board {board}</h1>
        <span className="no-print flex gap-4 text-sm">
          {prev && <Link href={`${base}/boards/${prev}`}>← {prev}</Link>}
          {next && <Link href={`${base}/boards/${next}`}>{next} →</Link>}
        </span>
      </div>
      <p>
        <BoardInfo board={board} /> <span className="text-sm text-neutral-500">· played {plays}×</span>
      </p>

      {locked || hidden ? (
        <div className="mt-6">
          <p className="text-neutral-600">
            You haven&apos;t played this board yet. Results show up once you&apos;ve entered yours.
          </p>
          {hidden && (
            <Button variant="secondary" className="mt-3" onClick={() => setReveal(true)}>
              Show anyway (director)
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <Traveller view={view} board={board} />
        </div>
      )}

      {(view.me?.director || (pair !== null && !resultFor(view, pair, board))) && (
        <LinkButton href={`${base}/enter?board=${board}`} variant="secondary" className="no-print mt-6 w-full">
          {view.me?.director ? "Add a result" : "Enter your result"}
        </LinkButton>
      )}
    </div>
  );
}

/** After saving: on to the next unentered board at the same table, or back to Play. */
function Continue({ view, board }: { view: View; board: number }) {
  const base = `/t/${view.code}`;
  const pair = view.me?.pair;
  const m = view.movement;
  let next: string | null = null;
  if (m && pair) {
    const seat = m.rounds.map((r) => seatOf(r, pair)).find((s) => s?.boards.includes(board));
    const b = seat?.boards.find((b) => !resultFor(view, pair, b));
    if (seat && b) next = `${base}/enter?board=${b}&ns=${seat.ns}&ew=${seat.ew}`;
  }
  return (
    <div className="no-print mb-6 rounded-md bg-neutral-100 p-3">
      <p className="font-medium">Saved.</p>
      <div className="mt-2 flex gap-2">
        {next ? (
          <LinkButton href={next} className="flex-1">
            Next board
          </LinkButton>
        ) : (
          <LinkButton href={base} className="flex-1">
            Back to Play
          </LinkButton>
        )}
        {!m && (
          <LinkButton href={`${base}/enter`} variant="secondary" className="flex-1">
            Enter another
          </LinkButton>
        )}
      </div>
    </div>
  );
}
