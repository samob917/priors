import { prisma } from "@/lib/db";
import { applyPointUpdate, dampenedFeedLR } from "@/lib/bayes/engine";
import { KalshiAdapter } from "./kalshi";
import { PolymarketAdapter } from "./polymarket";
import type { FeedAdapter } from "./adapter";

const adapters: Record<string, FeedAdapter> = {
  KALSHI: new KalshiAdapter(),
  POLYMARKET: new PolymarketAdapter(),
};

/** Minimum change in external value to trigger an update */
const MIN_DELTA = 0.005;

export interface PollResult {
  linksChecked: number;
  updatesApplied: number;
  errors: string[];
}

/**
 * Poll all active feed links that are due for a check.
 * For each link whose external value has changed meaningfully,
 * apply a dampened Bayesian update to the linked prior.
 */
export async function pollFeeds(): Promise<PollResult> {
  const result: PollResult = { linksChecked: 0, updatesApplied: 0, errors: [] };

  // Find all active links that are due for polling
  const dueLinks = await prisma.dataFeedLink.findMany({
    where: { isActive: true },
    include: {
      dataFeed: true,
      prior: true,
    },
  });

  for (const link of dueLinks) {
    result.linksChecked++;

    // Check if enough time has passed since last poll
    if (link.lastPolledAt) {
      const elapsed = Date.now() - link.lastPolledAt.getTime();
      const interval = link.dataFeed.pollIntervalSeconds * 1000;
      if (elapsed < interval) continue;
    }

    const adapter = adapters[link.dataFeed.provider];
    if (!adapter) {
      result.errors.push(`No adapter for provider: ${link.dataFeed.provider}`);
      continue;
    }

    try {
      const externalValue = await adapter.fetchProbability(link.externalMarketId);

      if (externalValue == null) {
        result.errors.push(`No data for ${link.dataFeed.provider}:${link.externalMarketId}`);
        // Still update lastPolledAt to avoid hammering a broken endpoint
        await prisma.dataFeedLink.update({
          where: { id: link.id },
          data: { lastPolledAt: new Date() },
        });
        continue;
      }

      // Check if the value changed meaningfully
      const delta = link.lastExternalValue != null
        ? Math.abs(externalValue - link.lastExternalValue)
        : 1; // always update on first poll

      if (delta >= MIN_DELTA) {
        // Compute dampened Bayesian update
        const currentProb = link.prior.currentProbability;
        const lr = dampenedFeedLR(currentProb, externalValue, link.dampingFactor);
        const newProb = applyPointUpdate(currentProb, lr);

        // Create update and modify prior in a transaction
        await prisma.$transaction(async (tx) => {
          await tx.priorUpdate.create({
            data: {
              priorId: link.priorId,
              sourceType: "DATA_FEED",
              evidenceDescription: `${link.dataFeed.name} market price: ${(externalValue * 100).toFixed(1)}% (was ${((link.lastExternalValue ?? currentProb) * 100).toFixed(1)}%)`,
              likelihoodRatio: lr,
              probabilityBefore: currentProb,
              probabilityAfter: newProb,
              dataFeedLinkId: link.id,
              metadata: JSON.stringify({
                provider: link.dataFeed.provider,
                externalMarketId: link.externalMarketId,
                externalValue,
                dampingFactor: link.dampingFactor,
              }),
            },
          });

          await tx.prior.update({
            where: { id: link.priorId },
            data: {
              currentProbability: newProb,
              updateCount: { increment: 1 },
            },
          });

          await tx.dataFeedLink.update({
            where: { id: link.id },
            data: {
              lastPolledAt: new Date(),
              lastExternalValue: externalValue,
            },
          });
        });

        result.updatesApplied++;
      } else {
        // Value hasn't changed enough, just update poll time
        await prisma.dataFeedLink.update({
          where: { id: link.id },
          data: {
            lastPolledAt: new Date(),
            lastExternalValue: externalValue,
          },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Error polling ${link.dataFeed.provider}:${link.externalMarketId}: ${msg}`);
    }
  }

  return result;
}
