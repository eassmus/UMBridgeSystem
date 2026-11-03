"use client";

import Link from "next/link";
import { useState } from "react";
import { Join } from "@/components/Join";
import { PairResult } from "@/components/PairResult";
import { useAction, useTournament } from "@/components/tournament";
import { BoardInfo, Button, ErrorText, Key, LinkButton, Section, inputClass } from "@/components/ui";
import { updatePair } from "@/lib/actions";
import { formatBoards } from "@/lib/bridge/board";
import { seatOf, sharedWith, type Movement, type MovementRound } from "@/lib/bridge/movements";
import { currentRound, pairName, resultFor, resultsToCome } from "@/lib/derive";

export default function Play() {
  const { view } = useTournament();
  const [changing, setChanging] = useState(false);
  const pair = view.me?.pair ?? null;

  if (pair === null || changing) return <Join onDone={() => setChanging(false)} />;

  return (
    <div>
      {view.finished && (
        <p className="mb-4 rounded-md bg-neutral-100 p-3">
          This game is finished.{" "}
          <Link href={`/t/${view.code}/results`} className="underline">
            See the results
          </Link>
        </p>
      )}
      <MyPair key={`${pair}:${pairName(view, pair)}`} pair={pair} onChange={() => setChanging(true)} />
      {view.movement ? <Rounds key={pair} movement={view.movement} pair={pair} /> : <FreePlay pair={pair} />}
    </div>
  );
}

function MyPair({ pair, onChange }: { pair: number; onChange: () => void }) {
  const { view } = useTournament();
  const { run, pending, error } = useAction();
  const [name, setName] = useState(pairName(view, pair));

  return (
    <details className="mb-6 border-b border-neutral-200 pb-3">
      <summary className="flex cursor-pointer items-center justify-between">
        <span>
          <span className="font-medium">Pair {pair}</span> <span className="text-neutral-600">{pairName(view, pair)}</span>
        </span>
        <span className="text-sm text-neutral-500">Edit</span>
      </summary>
      <div className="mt-3 space-y-2">
        <input className={inputClass} placeholder="Pair name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => run(() => updatePair(view.code, pair, name))}>
            Save name
          </Button>
          <Button variant="secondary" onClick={onChange}>
            Switch pair
          </Button>
        </div>
        <ErrorText error={error} />
      </div>
    </details>
  );
}

function Rounds({ movement: m, pair }: { movement: Movement; pair: number }) {
  const { view } = useTournament();
  const current = currentRound(view, m, pair);
  const [picked, setPicked] = useState<number | null>(null);
  const r = picked ?? current;

  if (!m.pairs.includes(pair))
    return <p className="text-neutral-600">Your pair isn&apos;t in the movement yet. Ask the director to apply it again in Manage.</p>;

  return (
    <div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {m.rounds.map((_, i) => (
          <Key key={i} on={i === r} className={`min-w-12 px-2 text-base ${i === current ? "underline" : ""}`} onClick={() => setPicked(i)}>
            {i + 1}
          </Key>
        ))}
      </div>
      {picked !== null && picked !== current && (
        <button type="button" className="mt-2 text-sm text-neutral-600 underline" onClick={() => setPicked(null)}>
          Back to current round
        </button>
      )}
      {r >= m.rounds.length ? (
        <AllPlayed movement={m} />
      ) : (
        <Round movement={m} index={r} pair={pair} />
      )}
    </div>
  );
}

function AllPlayed({ movement: m }: { movement: Movement }) {
  const { view } = useTournament();
  const toCome = resultsToCome(view, m);
  return (
    <div className="mt-6">
      <p className="text-lg">You&apos;ve played all your rounds.</p>
      <p className="mt-1 text-neutral-600">
        {view.finished ? (
          <Link href={`/t/${view.code}/results`} className="underline">
            See the results
          </Link>
        ) : toCome > 0 ? (
          `Waiting for the other tables: ${toCome} result${toCome === 1 ? "" : "s"} still to come.`
        ) : view.me?.director ? (
          "Every result is in. Finish the game in Manage to publish the results."
        ) : (
          "Every result is in. The results appear when the director finishes the game."
        )}
      </p>
    </div>
  );
}

function Round({ movement: m, index, pair }: { movement: Movement; index: number; pair: number }) {
  const { view } = useTournament();
  const round = m.rounds[index];
  const seat = seatOf(round, pair);
  const shared = seat ? sharedWith(round, seat) : [];

  return (
    <div className="mt-5">
      <p className="text-sm text-neutral-500">
        Round {index + 1} of {m.rounds.length}
      </p>
      {seat ? (
        <>
          <p className="text-2xl font-semibold">
            Table {seat.table} · {seat.dir === "NS" ? "North-South" : "East-West"}
          </p>
          <p className="mt-1">
            vs Pair {seat.opp} <span className="text-neutral-600">{pairName(view, seat.opp)}</span>
          </p>
          {shared.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              Table {shared.join(", ")} plays the same boards this round: pass them between the tables.
            </p>
          )}
          <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {seat.boards.map((b) => {
              const r = resultFor(view, pair, b);
              return (
                <li key={b} className="flex min-h-16 items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block font-medium">Board {b}</span>
                    <BoardInfo board={b} />
                  </span>
                  {r ? (
                    <Link href={`/t/${view.code}/enter?id=${r.id}`}>
                      <PairResult r={r} pair={pair} />
                    </Link>
                  ) : (
                    <LinkButton href={`/t/${view.code}/enter?board=${b}&ns=${seat.ns}&ew=${seat.ew}`}>Enter</LinkButton>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-2xl font-semibold">Sit out</p>
      )}
      <NextRound round={m.rounds[index + 1]} pair={pair} />
    </div>
  );
}

function NextRound({ round, pair }: { round: MovementRound | undefined; pair: number }) {
  if (!round) return <p className="mt-4 text-sm text-neutral-600">This is the last round.</p>;
  const s = seatOf(round, pair);
  return (
    <p className="mt-4 rounded-md bg-neutral-100 p-3 text-sm">
      Next round:{" "}
      {s
        ? `Table ${s.table} ${s.dir === "NS" ? "N-S" : "E-W"} vs Pair ${s.opp}, boards ${formatBoards(s.boards)}`
        : "sit out"}
    </p>
  );
}

function FreePlay({ pair }: { pair: number }) {
  const { view } = useTournament();
  const mine = view.results.filter((r) => r.ns === pair || r.ew === pair);
  return (
    <div>
      <LinkButton href={`/t/${view.code}/enter`} className="w-full">
        Enter a result
      </LinkButton>
      {view.me?.director && (
        <p className="mt-2 text-sm text-neutral-600">No movement set. Choose one in Manage to get table assignments.</p>
      )}
      <Section title="Your boards">
        {mine.length === 0 ? (
          <p className="text-neutral-600">Nothing entered yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {mine.map((r) => (
              <li key={r.id}>
                <Link href={`/t/${view.code}/enter?id=${r.id}`} className="flex min-h-16 items-center justify-between gap-3 py-2">
                  <span>
                    <span className="block font-medium">Board {r.board}</span>
                    <span className="text-sm text-neutral-600">vs Pair {r.ns === pair ? r.ew : r.ns}</span>
                  </span>
                  <PairResult r={r} pair={pair} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
