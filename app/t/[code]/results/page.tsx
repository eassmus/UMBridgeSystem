"use client";

import { Standings } from "@/components/Standings";
import { useTournament } from "@/components/tournament";

export default function ResultsPage() {
  const { view } = useTournament();

  if (!view.finished && !view.me?.director)
    return <p className="text-neutral-600">The results are shown once the director finishes the game.</p>;
  if (view.pairs.length === 0) return <p className="text-neutral-600">No pairs yet.</p>;

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-600">
        {view.finished ? "Final results" : "Provisional: only the director sees this until the game is finished"} · top{" "}
        {view.top} per board
      </p>
      <Standings view={view} />
    </div>
  );
}
