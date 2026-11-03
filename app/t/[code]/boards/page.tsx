"use client";

import Link from "next/link";
import { useTournament } from "@/components/tournament";
import { BoardInfo } from "@/components/ui";

export default function BoardsPage() {
  const { view } = useTournament();
  return (
    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
      {view.boards.map((b) => {
        const plays = view.played.filter((p) => p.board === b && p.kind !== "notplayed").length;
        return (
          <li key={b}>
            <Link href={`/t/${view.code}/boards/${b}`} className="flex min-h-14 items-center justify-between py-2">
              <span>
                <span className="block font-medium">Board {b}</span>
                <BoardInfo board={b} />
              </span>
              <span className="text-sm text-neutral-500">{plays ? `played ${plays}×` : "not played"}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
