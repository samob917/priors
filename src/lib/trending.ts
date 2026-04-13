import { prisma } from "./db";

/**
 * Recalculate trending scores for all priors.
 *
 * Score formula:
 *   (updates_24h * 3) + (updates_7d * 1) + (views * 0.1)
 *   + (feed_updates_24h * 2) + (unique_updaters_7d * 5)
 */
export async function recalculateTrendingScores(): Promise<number> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const priors = await prisma.prior.findMany({
    select: { id: true, viewCount: true },
  });

  let updated = 0;

  for (const prior of priors) {
    const [updates24h, updates7d, feedUpdates24h, uniqueUpdaters7d] =
      await Promise.all([
        prisma.priorUpdate.count({
          where: { priorId: prior.id, createdAt: { gte: oneDayAgo } },
        }),
        prisma.priorUpdate.count({
          where: { priorId: prior.id, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.priorUpdate.count({
          where: {
            priorId: prior.id,
            sourceType: "DATA_FEED",
            createdAt: { gte: oneDayAgo },
          },
        }),
        prisma.priorUpdate
          .findMany({
            where: {
              priorId: prior.id,
              createdAt: { gte: sevenDaysAgo },
              userId: { not: null },
            },
            select: { userId: true },
            distinct: ["userId"],
          })
          .then((r) => r.length),
      ]);

    const score =
      updates24h * 3 +
      updates7d * 1 +
      prior.viewCount * 0.1 +
      feedUpdates24h * 2 +
      uniqueUpdaters7d * 5;

    await prisma.prior.update({
      where: { id: prior.id },
      data: { trendingScore: score },
    });

    updated++;
  }

  return updated;
}
