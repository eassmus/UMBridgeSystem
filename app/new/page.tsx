"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BoardPicker } from "@/components/BoardPicker";
import { Button, ErrorText, Section, inputClass } from "@/components/ui";
import { createTournament } from "@/lib/actions";

const defaultName = () => `Pairs – ${new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`;

export default function NewTournament() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [boards, setBoards] = useState(() => Array.from({ length: 24 }, (_, i) => i + 1));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(defaultName()), []);

  async function create() {
    setPending(true);
    setError(null);
    try {
      const res = await createTournament({ name, boards });
      if (res.error !== undefined) setError(res.error);
      else router.push(`/t/${res.code}/manage`);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 pb-16">
      <Link href="/" className="text-sm text-neutral-500">
        ← Back
      </Link>
      <h1 className="mb-8 mt-2 text-2xl font-semibold">New tournament</h1>

      <Section title="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Section>

      <Section title="Boards in play">
        <BoardPicker boards={boards} onChange={setBoards} />
      </Section>

      <Button className="mt-8 w-full" onClick={create} disabled={pending || !name.trim() || boards.length === 0}>
        Create
      </Button>
      <ErrorText error={error} />
      <p className="mt-3 text-sm text-neutral-500">
        You get a join code to share. Pairs and the movement are set up once people have joined.
      </p>
    </main>
  );
}
