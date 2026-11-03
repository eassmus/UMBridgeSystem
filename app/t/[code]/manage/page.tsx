"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { BoardPicker } from "@/components/BoardPicker";
import { DirectorLogin } from "@/components/Join";
import { Standings } from "@/components/Standings";
import { useAction, useTournament } from "@/components/tournament";
import { Traveller } from "@/components/Traveller";
import { Button, ErrorText, Key, Section, inputClass } from "@/components/ui";
import { addPair, deleteTournament, removePair, setMovement, updatePair, updateTournament } from "@/lib/actions";
import { formatBoards } from "@/lib/bridge/board";
import { movementOptions, setsNeeded, type MovementKind } from "@/lib/bridge/movements";
import { resultsToCome } from "@/lib/derive";
import type { View } from "@/lib/view";

export default function ManagePage() {
  const { view } = useTournament();
  if (!view.me?.director)
    return (
      <div>
        <p className="text-neutral-600">Only the director can manage this game.</p>
        <DirectorLogin />
      </div>
    );
  return (
    <div>
      <Share view={view} />
      <Results view={view} />
      <Pairs view={view} />
      <MovementSetup key={`${view.pairs.length}:${view.boards.length}`} view={view} />
      <Boards view={view} />
      <Game view={view} />
    </div>
  );
}

function Results({ view }: { view: View }) {
  const { run, pending, error } = useAction();
  const toCome = view.movement ? resultsToCome(view, view.movement) : 0;

  function toggleFinished() {
    if (!view.finished && toCome > 0 && !confirm(`${toCome} result${toCome === 1 ? " is" : "s are"} still missing. Finish anyway?`)) return;
    run(() => updateTournament(view.code, { finished: !view.finished }));
  }

  return (
    <>
      <Section title="Results">
        <p className="mb-3 text-sm text-neutral-600">
          {view.finished ? "Finished: everyone can see the results." : "Only you can see the results until you finish the game."}
          {toCome > 0 && ` ${toCome} result${toCome === 1 ? "" : "s"} still to come.`}
        </p>
        <Button className="w-full" variant={view.finished ? "secondary" : "primary"} disabled={pending} onClick={toggleFinished}>
          {view.finished ? "Reopen the game" : "Finish the game and publish results"}
        </Button>
        <ErrorText error={error} />
      </Section>
      {view.played.length > 0 && (
        <>
          <Standings view={view} />
          <details className="mt-6">
            <summary className="text-sm text-neutral-600">All results by board</summary>
            {view.boards.map((b) => (
              <div key={b} className="mt-4">
                <Link href={`/t/${view.code}/boards/${b}`} className="font-medium">
                  Board {b}
                </Link>
                <div className="mt-1">
                  <Traveller view={view} board={b} />
                </div>
              </div>
            ))}
          </details>
        </>
      )}
    </>
  );
}

function Share({ view }: { view: View }) {
  const [origin, setOrigin] = useState(""); // set after mount, so SSR and hydration match
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(location.origin), []);
  const url = `${origin}/t/${view.code}`;
  return (
    <Section title="Join code">
      <div className="flex items-center gap-4">
        {origin && <QRCodeSVG value={url} size={128} />}
        <div>
          <p className="text-4xl font-semibold tracking-widest tabular-nums">{view.code}</p>
          <p className="mt-1 break-all text-sm text-neutral-600">{url}</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(url)
                  .then(() => setCopied(true))
                  .catch(() => {})
              }
            >
              {copied ? "Copied" : "Copy link"}
            </Button>
            {origin && "share" in navigator && (
              <Button variant="secondary" onClick={() => navigator.share({ title: view.name, url }).catch(() => {})}>
                Share
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-neutral-600">
        Director PIN <span className="font-medium tabular-nums text-neutral-900">{view.directorPin}</span>: enter it under
        &quot;Director login&quot; to manage from another phone.
      </p>
    </Section>
  );
}

function Pairs({ view }: { view: View }) {
  const { run, pending, error } = useAction();
  return (
    <Section title={`Pairs (${view.pairs.length})`}>
      <ul className="space-y-2">
        {view.pairs.map((p) => (
          <PairRow key={`${p.number}:${p.name}`} view={view} pair={p} />
        ))}
      </ul>
      <Button variant="secondary" className="mt-3 w-full" disabled={pending} onClick={() => run(() => addPair(view.code, ""))}>
        Add a pair
      </Button>
      <ErrorText error={error} />
    </Section>
  );
}

function PairRow({ view, pair }: { view: View; pair: View["pairs"][number] }) {
  const { run, pending, error } = useAction();
  const [name, setName] = useState(pair.name);
  return (
    <li>
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 font-medium tabular-nums">{pair.number}</span>
        <input
          className={`${inputClass} min-w-0`}
          placeholder="Pair name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== pair.name && run(() => updatePair(view.code, pair.number, name))}
        />
        <button
          type="button"
          className="h-12 shrink-0 px-2 text-sm text-red-700 disabled:opacity-40"
          disabled={pending}
          onClick={() => confirm(`Remove pair ${pair.number}?`) && run(() => removePair(view.code, pair.number))}
        >
          Remove
        </button>
      </div>
      <ErrorText error={error} />
    </li>
  );
}

function MovementSetup({ view }: { view: View }) {
  const { run, pending, error } = useAction();
  const n = view.pairs.length;
  const options = movementOptions(n);
  const [kind, setKind] = useState<MovementKind | null>(
    view.movement?.kind ?? options.find((o) => o.recommended)?.kind ?? null,
  );
  const [rounds, setRounds] = useState<number | null>(null); // null = all rounds
  const [perRound, setPerRound] = useState<number | null>(null); // null = as many as fit

  const opt = options.find((o) => o.kind === kind);
  const r = Math.min(rounds ?? opt?.rounds ?? 0, opt?.rounds ?? 0);
  const sets = kind && opt ? setsNeeded(kind, n, r) : 0;
  const maxPerRound = sets ? Math.floor(view.boards.length / sets) : 0;
  const k = Math.min(perRound ?? maxPerRound, maxPerRound);
  const unused = view.boards.slice(sets * k);

  const m = view.movement;
  const stale =
    m && (m.pairs.join() !== view.pairs.map((p) => p.number).join() || m.boards.join() !== view.boards.join());

  const pick = (kind: MovementKind | null) => {
    setKind(kind);
    setRounds(null);
    setPerRound(null);
  };

  return (
    <Section title="Movement">
      {m ? (
        <p className="mb-3">
          Current: {m.label}, {m.rounds.length} rounds × {m.boardsPerRound} boards.
        </p>
      ) : (
        <p className="mb-3 text-neutral-600">No movement: players enter results freely.</p>
      )}
      {stale && (
        <p className="mb-3 rounded-md bg-neutral-100 p-3 text-sm">
          Pairs or boards changed since the movement was set. Apply it again to update it (results are kept).
        </p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-neutral-600">Movements need at least 4 pairs (now {n}).</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {options.map((o) => (
              <Key key={o.kind} on={kind === o.kind} className="block w-full px-3 py-2 text-left text-base" onClick={() => pick(o.kind)}>
                {o.label}
                {o.recommended && " (recommended)"}
                <span className="block text-sm opacity-70">
                  {o.rounds} rounds ·{" "}
                  {o.twoWinner ? "N-S stay put, E-W move; separate N-S and E-W winners" : "everyone plays everyone, one winner"}
                  {n % 2 === 1 && " · one pair sits out each round"}
                </span>
              </Key>
            ))}
          </div>

          {opt && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm text-neutral-600">
                Rounds to play
                <select className={inputClass} value={r} onChange={(e) => setRounds(Number(e.target.value))}>
                  {Array.from({ length: opt.rounds }, (_, i) => i + 1).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-neutral-600">
                Boards per round
                <select className={inputClass} value={k} disabled={maxPerRound < 1} onChange={(e) => setPerRound(Number(e.target.value))}>
                  {Array.from({ length: maxPerRound }, (_, i) => i + 1).map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {opt && (
            <p className="mt-2 text-sm text-neutral-600">
              {maxPerRound < 1
                ? `Needs at least ${sets} boards — you have ${view.boards.length}.`
                : `${r} rounds of ${k} board${k === 1 ? "" : "s"}.${unused.length ? ` Not used: ${formatBoards(unused)}.` : ""}`}
            </p>
          )}
        </>
      )}

      <div className="mt-4 flex gap-2">
        {opt && (
          <Button
            className="flex-1"
            disabled={pending || maxPerRound < 1}
            onClick={() => kind && run(() => setMovement(view.code, { kind, boardsPerRound: k, rounds: r }))}
          >
            {m ? "Apply changes" : "Use this movement"}
          </Button>
        )}
        {m && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setMovement(view.code, null))}>
            No movement
          </Button>
        )}
      </div>
      <ErrorText error={error} />
    </Section>
  );
}

function Boards({ view }: { view: View }) {
  const { run, pending, error } = useAction();
  const [boards, setBoards] = useState(view.boards);
  const changed = boards.join() !== view.boards.join();
  return (
    <Section title="Boards">
      <BoardPicker boards={boards} onChange={setBoards} />
      <Button
        className="mt-3 w-full"
        disabled={!changed || boards.length === 0 || pending}
        onClick={() => run(() => updateTournament(view.code, { boards }))}
      >
        Save boards
      </Button>
      <ErrorText error={error} />
    </Section>
  );
}

function Game({ view }: { view: View }) {
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [name, setName] = useState(view.name);

  async function remove() {
    if (!confirm(`Delete "${view.name}" and all its results? This can't be undone.`)) return;
    // Not via run(): there is nothing left to refresh afterwards.
    const res = await deleteTournament(view.code);
    if (res.error !== undefined) alert(res.error);
    else router.push("/");
  }

  return (
    <Section title="Game">
      <div className="flex gap-2">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="secondary" disabled={pending || !name.trim() || name === view.name} onClick={() => run(() => updateTournament(view.code, { name }))}>
          Rename
        </Button>
      </div>
      <Button variant="danger" className="mt-3 w-full" disabled={pending} onClick={remove}>
        Delete tournament
      </Button>
      <ErrorText error={error} />
    </Section>
  );
}
