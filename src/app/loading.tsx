export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
      <div className="h-8 w-32 bg-zinc-800 rounded mb-3" />
      <div className="h-4 w-96 bg-zinc-800/50 rounded mb-6" />
      <div className="h-12 w-full bg-zinc-900 rounded-lg border border-zinc-800 mb-16" />
      <div className="h-4 w-40 bg-zinc-800/50 rounded mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-3">
            <div className="w-10 h-5 bg-zinc-800 rounded" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-1/2 bg-zinc-800/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
