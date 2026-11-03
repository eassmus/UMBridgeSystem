import { num, resultText, signed } from "@/lib/bridge/format";
import { pctFor, scoreFor } from "@/lib/derive";
import type { ResultView } from "@/lib/view";
import { SuitText } from "./ui";

/** "4♠ by S =" over "+420 · 62.5%" from one pair's point of view. */
export function PairResult({ r, pair }: { r: ResultView; pair: number }) {
  const score = scoreFor(r, pair);
  const pct = pctFor(r, pair);
  return (
    <span className="text-right">
      <span className="block">
        <SuitText text={resultText(r)} />
      </span>
      <span className="block text-sm text-neutral-500">
        {[score !== null && signed(score), pct !== null && `${num(pct, 1)}%`].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}
