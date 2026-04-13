export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 animate-pulse">
      <div className="h-3 w-24 bg-zinc-800/50 rounded mb-3" />
      <div className="h-7 w-3/4 bg-zinc-800 rounded mb-2" />
      <div className="h-4 w-1/2 bg-zinc-800/50 rounded mb-8" />

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 mb-8">
        <div className="h-3 w-32 bg-zinc-800/50 rounded mb-2" />
        <div className="h-10 w-20 bg-zinc-800 rounded mb-4" />
        <div className="h-2 w-full bg-zinc-800 rounded" />
      </div>

      <div className="rounded-lg border border-zinc-800 p-5 mb-8">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-3" />
        <div className="h-20 w-full bg-zinc-900 rounded mb-3" />
        <div className="h-8 w-full bg-zinc-800/50 rounded" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800/50 p-4">
            <div className="h-3 w-40 bg-zinc-800/50 rounded mb-2" />
            <div className="h-4 w-full bg-zinc-800 rounded mb-2" />
            <div className="h-3 w-24 bg-zinc-800/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
