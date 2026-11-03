"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "./tournament";

export function Shell({ children }: { children: React.ReactNode }) {
  const { view } = useTournament();
  const path = usePathname();
  const base = `/t/${view.code}`;
  const tabs = [
    { href: base, label: "Play" },
    { href: `${base}/results`, label: "Results" },
    { href: `${base}/boards`, label: "Boards" },
    { href: `${base}/movement`, label: "Movement" },
    ...(view.me?.director ? [{ href: `${base}/manage`, label: "Manage" }] : []),
    { href: "/", label: "Exit" },
  ];
  const active = (href: string) =>
    href === base ? path === base || path.startsWith(`${base}/enter`) : href !== "/" && path.startsWith(href);

  return (
    <>
      <header className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-12 max-w-lg items-center gap-3 px-4">
          <span className="flex-1 truncate font-semibold">{view.name}</span>
          <span className="text-sm tabular-nums text-neutral-500">{view.code}</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex h-14 flex-1 items-center justify-center text-sm ${
                active(t.href) ? "font-semibold text-neutral-900" : "text-neutral-500"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
