import Link from "next/link";
import { useState } from "react";
import { directorLogin, joinPair, registerPair } from "@/lib/actions";
import { useAction, useTournament } from "./tournament";
import { Button, ErrorText, Section, inputClass } from "./ui";

export function Join({ onDone }: { onDone?: () => void }) {
  const { view } = useTournament();
  const { run, pending, error } = useAction();
  const [name, setName] = useState("");

  const done = (ok: unknown) => ok && onDone?.();

  return (
    <div>
      <h1 className="text-xl font-semibold">Join this game</h1>

      {view.pairs.length > 0 && (
        <Section title="Pick your pair">
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {view.pairs.map((p) => (
              <li key={p.number}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={async () => done(await run(() => joinPair(view.code, p.number)))}
                  className="flex min-h-12 w-full items-center justify-between py-3 text-left"
                >
                  <span>
                    <span className="font-medium">Pair {p.number}</span> <span className="text-neutral-600">{p.name}</span>
                  </span>
                  <span className="text-sm text-neutral-500">{view.me?.pair === p.number ? "You" : "Join"}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Register a new pair">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            done(await run(() => registerPair(view.code, name)));
          }}
        >
          <input className={inputClass} placeholder="Pair name, e.g. Ann & Bob" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={pending || !name.trim()}>
            Register
          </Button>
        </form>
      </Section>
      <ErrorText error={error} />

      <p className="mt-8 text-sm text-neutral-600">
        Just watching?{" "}
        <Link href={`/t/${view.code}/results`} className="underline">
          See the results
        </Link>
        .{view.me?.director && " Not playing yourself? Run the game from Manage."}
      </p>
      {!view.me?.director && <DirectorLogin />}
    </div>
  );
}

export function DirectorLogin() {
  const { view } = useTournament();
  const { run, pending, error } = useAction();
  const [pin, setPin] = useState("");
  return (
    <details className="mt-6">
      <summary className="text-sm text-neutral-600">Director login</summary>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => directorLogin(view.code, pin));
        }}
      >
        <input className={inputClass} inputMode="numeric" placeholder="Director PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
        <Button type="submit" disabled={pending || !pin}>
          Log in
        </Button>
      </form>
      <ErrorText error={error} />
    </details>
  );
}
