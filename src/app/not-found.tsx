import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-6xl font-mono font-bold text-zinc-800 mb-4">404</p>
      <h1 className="text-xl font-bold mb-2">Page not found</h1>
      <p className="text-sm text-zinc-500 mb-6">
        This page doesn&apos;t exist. Maybe you were looking for a prior?
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700 transition-colors"
        >
          Home
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900 transition-colors"
        >
          Search priors
        </Link>
      </div>
    </div>
  );
}
