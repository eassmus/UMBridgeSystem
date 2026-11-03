"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, LinkButton, Section, inputClass } from "@/components/ui";
import { recentGames, type RecentGame } from "@/lib/local";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [recent, setRecent] = useState<RecentGame[]>([]);
  useEffect(() => setRecent(recentGames()), []);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-8 text-2xl font-semibold">Bridge Pairs</h1>

      <Section title="Join a game">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) router.push(`/t/${code}`);
          }}
        >
          <input
            className={`${inputClass} text-center text-xl tracking-widest`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Button type="submit" disabled={code.length !== 6}>
            Join
          </Button>
        </form>
      </Section>

      <Section title="Run a game">
        <LinkButton href="/new" variant="secondary" className="w-full">
          New tournament
        </LinkButton>
      </Section>

      {recent.length > 0 && (
        <Section title="Recent on this device">
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {recent.map((g) => (
              <li key={g.code}>
                <Link href={`/t/${g.code}`} className="flex items-center justify-between py-3">
                  <span>{g.name}</span>
                  <span className="text-sm text-neutral-500">
                    {new Date(g.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {g.code}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}
