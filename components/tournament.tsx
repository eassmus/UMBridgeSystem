"use client";

import { createContext, use, useEffect, useState } from "react";
import useSWR from "swr";
import type { ActionResult } from "@/lib/actions";
import { rememberGame } from "@/lib/local";
import type { View } from "@/lib/view";

const Ctx = createContext<{ view: View; refresh: () => Promise<unknown> } | null>(null);

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as View;
};

export function TournamentProvider({ initial, children }: { initial: View; children: React.ReactNode }) {
  const { data, mutate } = useSWR(`/api/t/${initial.code}`, fetcher, { fallbackData: initial, refreshInterval: 8000 });
  const view = data ?? initial;

  useEffect(() => rememberGame(view.code, view.name), [view.code, view.name]);

  return <Ctx value={{ view, refresh: () => mutate() }}>{children}</Ctx>;
}

export function useTournament() {
  const ctx = use(Ctx);
  if (!ctx) throw new Error("useTournament outside TournamentProvider");
  return ctx;
}

/** Runs a server action, keeps pending/error state, and refreshes the view on success. */
export function useAction() {
  const { refresh } = useTournament();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T extends object>(action: () => Promise<ActionResult<T>>): Promise<T | null> {
    setPending(true);
    setError(null);
    try {
      const res = await action();
      if (res.error !== undefined) {
        setError(res.error);
        return null;
      }
      await refresh().catch(() => {}); // a failed refresh doesn't undo a successful action
      return res as T;
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      return null;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error };
}
