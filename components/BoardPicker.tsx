import { useState } from "react";
import { formatBoards, parseBoards } from "@/lib/bridge/board";
import { inputClass } from "./ui";

/** Board list as ranges text ("10-13, 16-19") plus a tap grid; both stay in sync. */
export function BoardPicker({ boards, onChange }: { boards: number[]; onChange: (boards: number[]) => void }) {
  const [text, setText] = useState(formatBoards(boards));
  const [error, setError] = useState<string | null>(null);
  const gridSize = Math.max(36, Math.ceil(Math.max(0, ...boards) / 6) * 6);

  function typed(value: string) {
    setText(value);
    try {
      onChange(parseBoards(value));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toggle(b: number) {
    const next = boards.includes(b) ? boards.filter((x) => x !== b) : [...boards, b].sort((x, y) => x - y);
    onChange(next);
    setText(formatBoards(next));
    setError(null);
  }

  return (
    <div>
      <input className={inputClass} value={text} onChange={(e) => typed(e.target.value)} placeholder="e.g. 1-12, 16-19" />
      <p className={`mt-1 text-sm ${error ? "text-red-700" : "text-neutral-500"}`}>
        {error ?? `${boards.length} board${boards.length === 1 ? "" : "s"}`}
      </p>
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {Array.from({ length: gridSize }, (_, i) => i + 1).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => toggle(b)}
            className={`h-10 rounded border text-sm ${
              boards.includes(b) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-500"
            }`}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
