import Link from "next/link";
import { prisma } from "@/lib/db";
import { UpdateForm } from "./update-form";
import { HistoryChart } from "./history-chart";
import { VoteButtons } from "./vote-buttons";
import { FeedSection } from "./feed-section";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  USER: { label: "human", color: "text-blue-400" },
  AGENT: { label: "agent", color: "text-purple-400" },
  DATA_FEED: { label: "feed", color: "text-green-400" },
};

export const dynamic = "force-dynamic";

export default async function PriorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const prior = await prisma.prior.findUnique({
    where: { slug },
    include: {
      creator: { select: { name: true } },
    },
  });

  if (!prior) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-zinc-400 mb-4">
          No prior found for &quot;{slug.replace(/-/g, " ")}&quot;
        </p>
        <Link
          href="/prior/new"
          className="text-sm text-zinc-300 hover:text-white"
        >
          Create this prior
        </Link>
      </div>
    );
  }

  const updates = await prisma.priorUpdate.findMany({
    where: { priorId: prior.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });

  // Increment view count
  prisma.prior
    .update({ where: { id: prior.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const pct = Math.round(prior.currentProbability * 100);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
          <Link href="/" className="hover:text-zinc-300">
            priors
          </Link>
          <span>/</span>
          <span className="text-zinc-400">
            {prior.category.toLowerCase()}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{prior.claim}</h1>
        <p className="text-sm text-zinc-400">{prior.description}</p>
      </div>

      {/* Current probability */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Current probability
            </p>
            <p className="text-3xl sm:text-4xl font-mono font-bold">{pct}%</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>{prior.updateCount} updates</p>
            <p className="hidden sm:block">{prior.viewCount} views</p>
            <p>by {prior.creator.name ?? "anonymous"}</p>
          </div>
        </div>
        <div className="mt-4 w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* History chart */}
      <HistoryChart
        updates={updates.map((u) => ({
          probabilityAfter: u.probabilityAfter,
          createdAt: u.createdAt.toISOString(),
          evidenceDescription: u.evidenceDescription,
          sourceType: u.sourceType,
        }))}
        initialProbability={updates.length > 0
          ? updates[updates.length - 1].probabilityBefore
          : prior.currentProbability}
        createdAt={prior.createdAt.toISOString()}
      />

      {/* Data feeds */}
      <FeedSection slug={slug} />

      {/* Update form */}
      <UpdateForm slug={slug} />

      {/* Update log */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Update history ({updates.length})
        </h2>
        {updates.length === 0 ? (
          <p className="text-sm text-zinc-600 py-4">
            No updates yet. Be the first to submit evidence.
          </p>
        ) : (
          <div className="space-y-3">
            {updates.map((update) => {
              const source = SOURCE_LABELS[update.sourceType] ?? {
                label: update.sourceType.toLowerCase(),
                color: "text-zinc-400",
              };
              const delta = update.probabilityAfter - update.probabilityBefore;
              const deltaStr =
                delta > 0
                  ? `+${Math.round(delta * 100)}%`
                  : `${Math.round(delta * 100)}%`;
              const deltaColor =
                delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-zinc-400";

              return (
                <div
                  key={update.id}
                  className="rounded-lg border border-zinc-800/50 p-4"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={source.color}>{source.label}</span>
                      <span className="text-zinc-600">
                        {update.user?.name ?? "system"}
                      </span>
                      <span className="text-zinc-700">
                        {new Date(update.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-semibold ${deltaColor}`}
                    >
                      {deltaStr}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {update.evidenceDescription}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-600 font-mono">
                      {Math.round(update.probabilityBefore * 100)}% →{" "}
                      {Math.round(update.probabilityAfter * 100)}%
                    </p>
                    <VoteButtons updateId={update.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* API hint */}
      <div className="mt-8 pt-6 border-t border-zinc-800/50">
        <p className="text-xs text-zinc-600 font-mono">
          GET /api/priors/{slug}
        </p>
      </div>
    </div>
  );
}
