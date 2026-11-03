import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { dealer, vulnerability } from "@/lib/bridge/board";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-neutral-900 text-white border-neutral-900",
  secondary: "bg-white text-neutral-900 border-neutral-300",
  danger: "bg-white text-red-700 border-red-300",
};

const buttonClass = (variant: Variant, className = "") =>
  `inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-medium disabled:opacity-40 ${VARIANTS[variant]} ${className}`;

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

/** Toggle key for keypads. */
export function Key({ on, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`min-h-12 rounded-md border text-lg font-medium disabled:opacity-30 ${
        on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white"
      } ${className}`}
      {...props}
    />
  );
}

export const inputClass = "h-12 w-full rounded-md border border-neutral-300 bg-white px-3 text-base";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{title}</h2>
      {children}
    </section>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null;
}

/** Colours ♥/♦ red inside any text from lib/bridge/format. */
export function SuitText({ text }: { text: string }) {
  return (
    <>
      {text.split(/([♥♦]︎)/).map((part, i) =>
        /[♥♦]/.test(part) ? (
          <span key={i} className="text-red-600">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function BoardInfo({ board }: { board: number }) {
  const v = vulnerability(board);
  return (
    <span className="text-sm text-neutral-600">
      Dealer {dealer(board)} ·{" "}
      {v === "None" ? "None vul" : <span className="font-medium text-red-700">{v === "Both" ? "Both" : v === "NS" ? "N-S" : "E-W"} vul</span>}
    </span>
  );
}
