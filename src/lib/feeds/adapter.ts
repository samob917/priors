/**
 * Common interface for all data feed providers.
 * Each provider fetches a current probability (0-1) for a given market.
 */
export interface FeedAdapter {
  /** Fetch the current probability for a market. Returns null if unavailable. */
  fetchProbability(externalMarketId: string, config?: Record<string, unknown>): Promise<number | null>;
}

export interface FeedResult {
  probability: number;
  rawData?: Record<string, unknown>;
}
