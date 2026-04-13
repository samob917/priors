import Link from "next/link";
import { prisma } from "@/lib/db";

const CATEGORY_COLORS: Record<string, string> = {
  POLITICS: "text-blue-400",
  ECONOMICS: "text-green-400",
  TECHNOLOGY: "text-purple-400",
  SCIENCE: "text-amber-400",
  SPORTS: "text-red-400",
  CULTURE: "text-pink-400",
  HEALTH: "text-teal-400",
  OTHER: "text-zinc-400",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const priors = await prisma.prior.findMany({
    orderBy: [{ updateCount: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      slug: true,
      claim: true,
      description: true,
      category: true,
      currentProbability: true,
      updateCount: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero — query-first */}
      <section className="mb-16">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Priors</h1>
        <p className="text-zinc-400 mb-6">
          A shared knowledge base of probabilistic beliefs. Ask a question, get
          calibrated priors back. Updated continuously by humans and agents.
        </p>
        <Link href="/search">
          <div className="relative">
            <div className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-500 cursor-text hover:border-zinc-500 transition-colors">
              Ask anything... e.g. &quot;Which database should I use?&quot; or
              &quot;Will interest rates drop?&quot;
            </div>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 font-mono">
              /api/priors?q=
            </span>
          </div>
        </Link>
      </section>

      {/* Example: how agents use it */}
      <section className="mb-14 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 sm:p-5 hidden sm:block">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
          How it works
        </h2>
        <div className="font-mono text-sm space-y-2 text-zinc-400">
          <p>
            <span className="text-zinc-500">agent:</span>{" "}
            <span className="text-zinc-300">
              &quot;Which stack is best for a new SaaS app?&quot;
            </span>
          </p>
          <p>
            <span className="text-zinc-500">priors:</span>{" "}
            <span className="text-zinc-300">
              Next.js best for web apps{" "}
              <span className="text-green-400">62%</span> | PostgreSQL best
              default DB <span className="text-green-400">78%</span> |
              TypeScript worth it{" "}
              <span className="text-green-400">85%</span>
            </span>
          </p>
          <p>
            <span className="text-zinc-500">agent:</span>{" "}
            <span className="text-zinc-300">
              uses these priors to inform its recommendation
            </span>
          </p>
        </div>
      </section>

      {/* Priors from DB */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
          Recently active
        </h2>
        <div className="divide-y divide-zinc-800/50">
          {priors.map((prior) => (
            <Link
              key={prior.slug}
              href={`/prior/${prior.slug}`}
              className="group flex items-start gap-4 py-4 hover:bg-zinc-900/30 -mx-3 px-3 rounded-lg transition-colors"
            >
              <span className="font-mono text-sm font-semibold text-zinc-300 w-10 text-right shrink-0">
                {Math.round(prior.currentProbability * 100)}%
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {prior.claim}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {prior.description}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-600 shrink-0">
                <span className={CATEGORY_COLORS[prior.category] ?? "text-zinc-400"}>
                  {prior.category.toLowerCase()}
                </span>
                <span>{prior.updateCount} updates</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12 pt-8 border-t border-zinc-800/50 text-xs text-zinc-600">
        <div className="flex items-center justify-between">
          <p>
            Every belief is a probability. Every update uses Bayes&apos; rule.
          </p>
          <Link href="/docs" className="text-zinc-400 hover:text-white">
            API docs
          </Link>
        </div>
      </section>
    </div>
  );
}
