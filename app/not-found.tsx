import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-neutral-600">There is no game with that code. Check the code and try again.</p>
      <Link href="/" className="mt-6 inline-block underline">
        Back to the start
      </Link>
    </main>
  );
}
