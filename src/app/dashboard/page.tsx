import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiKeyManager } from "./api-key-manager";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const [userPriors, recentUpdates, keyCount] = await Promise.all([
    prisma.prior.findMany({
      where: { creatorId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        slug: true,
        claim: true,
        currentProbability: true,
        updateCount: true,
        category: true,
      },
    }),
    prisma.priorUpdate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        prior: { select: { slug: true, claim: true } },
      },
    }),
    prisma.apiKey.count({
      where: { userId: session.user.id, revokedAt: null },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-zinc-500">
            {session.user.name ?? session.user.email}
          </p>
        </div>
        <Link
          href="/prior/new"
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 transition-colors"
        >
          New Prior
        </Link>
      </div>

      {/* Your priors */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Your priors ({userPriors.length})
        </h2>
        {userPriors.length === 0 ? (
          <p className="text-sm text-zinc-600">
            You haven&apos;t created any priors yet.{" "}
            <Link href="/prior/new" className="text-zinc-300 hover:text-white">
              Create one
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {userPriors.map((prior) => (
              <Link
                key={prior.slug}
                href={`/prior/${prior.slug}`}
                className="group flex items-start gap-4 py-3 hover:bg-zinc-900/30 -mx-3 px-3 rounded-lg transition-colors"
              >
                <span className="font-mono text-sm font-semibold text-zinc-300 w-10 text-right shrink-0">
                  {Math.round(prior.currentProbability * 100)}%
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm text-zinc-200 group-hover:text-white transition-colors truncate">
                    {prior.claim}
                  </h3>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {prior.updateCount} updates
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Your recent updates
        </h2>
        {recentUpdates.length === 0 ? (
          <p className="text-sm text-zinc-600">No updates yet.</p>
        ) : (
          <div className="space-y-2">
            {recentUpdates.map((update) => {
              const delta =
                update.probabilityAfter - update.probabilityBefore;
              const deltaStr =
                delta > 0
                  ? `+${Math.round(delta * 100)}%`
                  : `${Math.round(delta * 100)}%`;
              const deltaColor =
                delta > 0
                  ? "text-green-400"
                  : delta < 0
                    ? "text-red-400"
                    : "text-zinc-400";

              return (
                <Link
                  key={update.id}
                  href={`/prior/${update.prior.slug}`}
                  className="block rounded-lg border border-zinc-800/50 p-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500 truncate max-w-[70%]">
                      {update.prior.claim}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold ${deltaColor}`}
                    >
                      {deltaStr}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 truncate">
                    {update.evidenceDescription}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* API keys */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          API keys ({keyCount})
        </h2>
        <ApiKeyManager />
      </section>
    </div>
  );
}
