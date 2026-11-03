import Link from "next/link";
import { num } from "@/lib/bridge/format";
import { pairName } from "@/lib/derive";
import type { View } from "@/lib/view";
import { Section } from "./ui";

/** Ranking table(s): one per direction for two-winner movements. */
export function Standings({ view }: { view: View }) {
  const groups = [...new Set(view.standings.map((s) => s.dir))];
  return groups.map((g) => (
    <Section key={g ?? "all"} title={g === "NS" ? "North-South" : g === "EW" ? "East-West" : "Ranking"}>
      <table className="w-full">
        <tbody className="divide-y divide-neutral-200 border-y border-neutral-200">
          {view.standings
            .filter((s) => s.dir === g)
            .map((s) => (
              <tr key={s.pair} className={s.pair === view.me?.pair ? "bg-neutral-100" : ""}>
                <td className="w-10 py-3 pl-1 text-neutral-500 tabular-nums">{s.rank}</td>
                <td className="py-3">
                  <Link href={`/t/${view.code}/pair/${s.pair}`} className="block">
                    <span className="font-medium">Pair {s.pair}</span>{" "}
                    <span className="text-neutral-600">{pairName(view, s.pair)}</span>
                  </Link>
                </td>
                <td className="py-3 pr-1 text-right tabular-nums">
                  <span className="block font-medium">{s.pct === null ? "–" : `${num(s.pct)}%`}</span>
                  <span className="block text-xs text-neutral-500">
                    {num(s.mp)} MP · {s.boards} bd
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </Section>
  ));
}
