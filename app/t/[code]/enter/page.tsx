"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAction, useTournament } from "@/components/tournament";
import { BoardInfo, Button, ErrorText, Key, SuitText } from "@/components/ui";
import { deleteResult, saveResult, type SaveResultInput } from "@/lib/actions";
import type { Seat } from "@/lib/bridge/board";
import { RANKS, STRAINS, SUIT, leadText, resultText, signed } from "@/lib/bridge/format";
import { nsScore, type Adj, type ResultKind, type Strain } from "@/lib/bridge/score";
import { hasPlayed, involves, pairName } from "@/lib/derive";
import type { ResultView } from "@/lib/view";

export default function EnterPage() {
  const { view } = useTournament();
  const q = useSearchParams();
  const num = (k: string) => (q.get(k) ? Number(q.get(k)) : undefined);
  const id = num("id");
  const board = num("board");
  const ns = num("ns");
  const ew = num("ew");

  // Editing by id, or an existing result for this board and these pairs.
  const existing =
    id !== undefined
      ? view.results.find((r) => r.id === id)
      : view.results.find((r) => r.board === board && (involves(r, ns) || involves(r, ew)));

  if (id !== undefined && !existing)
    return (
      <p>
        This result no longer exists.{" "}
        <Link href={`/t/${view.code}`} className="underline">
          Back
        </Link>
      </p>
    );
  if (view.pairs.length < 2) return <p>At least two pairs need to join before results can be entered.</p>;

  return <ScoreEntry key={existing?.id ?? "new"} existing={existing} board={board} ns={ns} ew={ew} />;
}

interface Draft {
  board: number;
  ns: number;
  ew: number;
  kind: ResultKind;
  level: number | null;
  strain: Strain | null;
  doubled: number;
  declarer: Seat | null;
  over: number | null; // tricks relative to the contract: 0 is "=", -1 one down
  lead: string | null;
  nsAdj: Adj;
  ewAdj: Adj;
}

function ScoreEntry({ existing, ...given }: { existing?: ResultView; board?: number; ns?: number; ew?: number }) {
  const { view } = useTournament();
  const router = useRouter();
  const { run, pending, error } = useAction();
  const me = view.me?.pair ?? null;

  const [d, setD] = useState<Draft>(() => {
    const ns = existing?.ns ?? given.ns ?? me ?? view.pairs[0].number;
    const ew = existing?.ew ?? given.ew ?? view.pairs.find((p) => p.number !== ns)!.number;
    const board = existing?.board ?? given.board ?? view.boards.find((b) => me === null || !hasPlayed(view, me, b)) ?? view.boards[0];
    const e = existing;
    return {
      board,
      ns,
      ew,
      kind: e?.kind ?? "contract",
      level: e?.level ?? null,
      strain: e?.strain ?? null,
      doubled: e?.doubled ?? 0,
      declarer: e?.declarer ?? null,
      over: e?.level && e.tricks !== null ? e.tricks - e.level - 6 : null,
      lead: e?.lead ?? null,
      nsAdj: e?.nsAdj ?? "A",
      ewAdj: e?.ewAdj ?? "A",
    };
  });
  const set = (patch: Partial<Draft>) => setD((d) => ({ ...d, ...patch }));

  const contract =
    d.kind === "contract" && d.level && d.strain && d.declarer && d.over !== null
      ? { kind: d.kind, level: d.level, strain: d.strain, doubled: d.doubled, declarer: d.declarer, tricks: d.level + 6 + d.over }
      : null;
  const ready = d.kind !== "contract" || contract !== null;

  let summary: string;
  if (d.kind === "passout") summary = "Passed out: 0";
  else if (d.kind === "notplayed") summary = "Not played: no score";
  else if (d.kind === "adjusted") summary = `Adjusted: N-S ${d.nsAdj}, E-W ${d.ewAdj}`;
  else if (contract) summary = `${resultText(contract)} → N-S ${signed(nsScore(d.board, contract)!)}`;
  else summary = "Pick contract, declarer and result";

  async function save() {
    const target = { id: existing?.id ?? null, board: d.board, ns: d.ns, ew: d.ew };
    const input: SaveResultInput =
      d.kind === "contract"
        ? { ...target, ...contract!, lead: d.lead?.length === 2 ? d.lead : null }
        : d.kind === "adjusted"
          ? { ...target, kind: d.kind, nsAdj: d.nsAdj, ewAdj: d.ewAdj }
          : { ...target, kind: d.kind };
    if (await run(() => saveResult(view.code, input))) router.push(`/t/${view.code}/boards/${d.board}?saved=1`);
  }

  async function remove() {
    if (existing && confirm(`Delete this result on board ${existing.board}?`) && (await run(() => deleteResult(view.code, existing.id))))
      router.push(`/t/${view.code}`);
  }

  const pairOption = (n: number) => (
    <option key={n} value={n}>
      {n} {pairName(view, n)}
    </option>
  );
  const select = "h-12 w-full min-w-0 rounded-md border border-neutral-300 bg-white px-2";
  const kinds: [ResultKind, string][] = [
    ["contract", "Contract"],
    ["passout", "Passed out"],
    ["notplayed", "Not played"],
    ...(view.me?.director ? ([["adjusted", "Adjusted"]] as [ResultKind, string][]) : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-[5rem_1fr_auto_1fr] items-end gap-2">
        <label className="text-sm text-neutral-600">
          Board
          <select className={select} value={d.board} onChange={(e) => set({ board: Number(e.target.value) })}>
            {view.boards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          N-S pair
          <select className={select} value={d.ns} onChange={(e) => set({ ns: Number(e.target.value) })}>
            {view.pairs.map((p) => pairOption(p.number))}
          </select>
        </label>
        <button type="button" className="h-12 px-1 text-neutral-600" onClick={() => set({ ns: d.ew, ew: d.ns })} aria-label="Swap N-S and E-W">
          ⇄
        </button>
        <label className="text-sm text-neutral-600">
          E-W pair
          <select className={select} value={d.ew} onChange={(e) => set({ ew: Number(e.target.value) })}>
            {view.pairs.map((p) => pairOption(p.number))}
          </select>
        </label>
      </div>
      <p className="mt-2">
        <BoardInfo board={d.board} />
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {kinds.map(([k, label]) => (
          <Key key={k} on={d.kind === k} className="px-3 text-base" onClick={() => set({ kind: k })}>
            {label}
          </Key>
        ))}
      </div>

      {d.kind === "contract" && (
        <>
          <Label>Contract</Label>
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((l) => (
              <Key
                key={l}
                on={d.level === l}
                onClick={() => set({ level: l, over: d.over !== null && d.over <= 7 - l && d.over >= -(l + 6) ? d.over : null })}
              >
                {l}
              </Key>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {STRAINS.map((s) => (
              <Key key={s} on={d.strain === s} onClick={() => set({ strain: s })}>
                <SuitText text={SUIT[s]} />
                {s !== "NT" && <span className="ml-1 text-xs opacity-60">{s}</span>}
              </Key>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {["Undoubled", "X", "XX"].map((label, i) => (
              <Key key={label} on={d.doubled === i} className="text-base" onClick={() => set({ doubled: i })}>
                {label}
              </Key>
            ))}
          </div>

          <Label>Declarer</Label>
          {(
            [
              ["N-S", d.ns, ["N", "S"]],
              ["E-W", d.ew, ["E", "W"]],
            ] as const
          ).map(([side, pair, seats]) => (
            <div key={side} className="mb-1.5 grid grid-cols-[1fr_4rem_4rem] items-center gap-1.5">
              <span className="truncate text-sm">
                {side} · Pair {pair} <span className="text-neutral-600">{pairName(view, pair)}</span>
              </span>
              {seats.map((s) => (
                <Key key={s} on={d.declarer === s} onClick={() => set({ declarer: s })}>
                  {s}
                </Key>
              ))}
            </div>
          ))}

          <Label>Result</Label>
          {d.level ? (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 8 - d.level }, (_, i) => (
                  <Key key={i} on={d.over === i} onClick={() => set({ over: i })}>
                    {i === 0 ? "=" : `+${i}`}
                  </Key>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {Array.from({ length: d.level + 6 }, (_, i) => -(i + 1)).map((o) => (
                  <Key key={o} on={d.over === o} onClick={() => set({ over: o })}>
                    {o}
                  </Key>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Pick the contract level first.</p>
          )}

          <details className="mt-5" open={!!d.lead}>
            <summary className="text-sm text-neutral-600">
              Opening lead (optional){d.lead && <>: <SuitText text={leadText(d.lead)} /></>}
            </summary>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {(["S", "H", "D", "C"] as const).map((s) => (
                <Key key={s} on={d.lead?.[0] === s} onClick={() => set({ lead: s + (d.lead?.[1] ?? "") })}>
                  <SuitText text={SUIT[s]} />
                </Key>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {RANKS.map((rank) => (
                <Key
                  key={rank}
                  on={d.lead?.[1] === rank}
                  disabled={!d.lead}
                  className="text-base"
                  onClick={() => set({ lead: d.lead![0] + rank })}
                >
                  {rank === "T" ? "10" : rank}
                </Key>
              ))}
              <Key className="text-sm" onClick={() => set({ lead: null })}>
                Clear
              </Key>
            </div>
          </details>
        </>
      )}

      {d.kind === "adjusted" && (
        <>
          <Label>Artificial adjusted score</Label>
          {(
            [
              ["N-S", "nsAdj"],
              ["E-W", "ewAdj"],
            ] as const
          ).map(([side, key]) => (
            <div key={side} className="mb-1.5 grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-1.5">
              <span className="text-sm">{side}</span>
              {(["A+", "A", "A-"] as const).map((a) => (
                <Key key={a} on={d[key] === a} onClick={() => set(key === "nsAdj" ? { nsAdj: a } : { ewAdj: a })}>
                  {a === "A-" ? "A−" : a}
                </Key>
              ))}
            </div>
          ))}
          <p className="mt-2 text-sm text-neutral-600">A+ is 60% (or the pair&apos;s session % if higher), A 50%, A− 40% (or lower).</p>
        </>
      )}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] -mx-4 mt-6 border-t border-neutral-200 bg-white px-4 py-3">
        <p className="mb-2 font-medium">
          <SuitText text={summary} />
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!ready || pending} onClick={save}>
            {existing ? "Save changes" : "Save"}
          </Button>
          {existing && (
            <Button variant="danger" disabled={pending} onClick={remove}>
              Delete
            </Button>
          )}
        </div>
        <ErrorText error={error} />
        {existing && (
          <p className="mt-2 text-xs text-neutral-500">
            Entered by {existing.createdBy || "?"}
            {existing.updatedBy !== existing.createdBy && `, edited by ${existing.updatedBy}`}
          </p>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 mt-5 text-sm font-semibold uppercase tracking-wide text-neutral-500">{children}</p>;
}
