import { formatBoards } from "@/lib/bridge/board";
import type { Movement } from "@/lib/bridge/movements";
import { hasPlayed } from "@/lib/derive";
import type { View } from "@/lib/view";

const status = (done: number, total: number) => (done === total ? "Played" : done === 0 ? "Not played" : `${done} of ${total}`);

/** Every table of every round, with how many of its boards have results. */
export function MovementProgress({ view, movement: m }: { view: View; movement: Movement }) {
  const pair = view.me?.pair ?? null;
  return m.rounds.map((round, i) => (
    <div key={i} className="mb-4">
      <p className="font-medium">Round {i + 1}</p>
      <table className="mt-1 w-full text-sm">
        <tbody className="divide-y divide-neutral-200 border-y border-neutral-200">
          {round.tables.map((t) => {
            const done = t.boards.filter((b) => hasPlayed(view, t.ns, b)).length;
            return (
              <tr key={t.table} className={t.ns === pair || t.ew === pair ? "bg-neutral-100" : ""}>
                <td className="py-2 pl-1">Table {t.table}</td>
                <td className="py-2">
                  {t.ns} v {t.ew}
                </td>
                <td className="py-2">bds {formatBoards(t.boards)}</td>
                <td className={`py-2 pr-1 text-right ${done === t.boards.length ? "text-neutral-500" : "font-medium"}`}>
                  {status(done, t.boards.length)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {round.sitOut.length > 0 && <p className="mt-1 text-sm text-neutral-600">Sit out: pair {round.sitOut.join(", ")}</p>}
    </div>
  ));
}

/** Without a movement: which pairs have played each board. */
export function BoardProgress({ view }: { view: View }) {
  return (
    <table className="w-full text-sm">
      <tbody className="divide-y divide-neutral-200 border-y border-neutral-200">
        {view.boards.map((b) => {
          const games = view.played.filter((p) => p.board === b);
          return (
            <tr key={b}>
              <td className="py-2 pl-1">Board {b}</td>
              <td className="py-2">{games.map((g) => `${g.ns} v ${g.ew}`).join(", ")}</td>
              <td className={`py-2 pr-1 text-right ${games.length ? "text-neutral-500" : "font-medium"}`}>
                {games.length ? `${games.length} played` : "Not played"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
