import Link from "next/link";
import { leadText, num, resultText, signed } from "@/lib/bridge/format";
import { canEdit, involves } from "@/lib/derive";
import type { View } from "@/lib/view";
import { SuitText } from "./ui";

/** All visible results on one board, best N-S score first. */
export function Traveller({ view, board }: { view: View; board: number }) {
  const pair = view.me?.pair ?? null;
  const rows = view.results
    .filter((r) => r.board === board)
    .sort((a, b) => (b.nsScore ?? -Infinity) - (a.nsScore ?? -Infinity));

  if (rows.length === 0) return <p className="text-neutral-600">No results yet.</p>;

  return (
    <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
      {rows.map((r) => (
        <li key={r.id} className={`py-3 ${involves(r, pair) ? "-mx-4 bg-neutral-100 px-4" : ""}`}>
          <div className="flex justify-between gap-3">
            <span>
              <span className="font-medium">
                {r.ns} v {r.ew}
              </span>{" "}
              <SuitText text={resultText(r)} />
              {r.lead && (
                <span className="text-neutral-600">
                  {" "}
                  · <SuitText text={leadText(r.lead)} />
                </span>
              )}
            </span>
            <span className="font-medium tabular-nums">{r.nsScore !== null && signed(r.nsScore)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3 text-sm text-neutral-500">
            <span>
              {r.mp && `N-S ${num(r.mp.nsMp)} · E-W ${num(r.mp.ewMp)} of ${view.top} · `}
              {r.updatedBy}
            </span>
            {canEdit(view, r) && (
              <Link href={`/t/${view.code}/enter?id=${r.id}`} className="no-print underline">
                Edit
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
