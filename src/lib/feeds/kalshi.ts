import type { FeedAdapter } from "./adapter";

/**
 * Kalshi prediction market adapter.
 * Fetches market prices from Kalshi's public API.
 *
 * The externalMarketId is the Kalshi market ticker (e.g. "KXWARMING-50").
 * Prices are returned in dollars (0.81 = 81% probability).
 */
export class KalshiAdapter implements FeedAdapter {
  private baseUrl = "https://api.elections.kalshi.com/trade-api/v2";

  async fetchProbability(externalMarketId: string): Promise<number | null> {
    try {
      const res = await fetch(`${this.baseUrl}/markets/${externalMarketId}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.error(`Kalshi fetch failed for ${externalMarketId}: ${res.status}`);
        return null;
      }

      const data = await res.json();
      const market = data.market;
      if (!market) return null;

      // Kalshi prices are in dollars (0.00 - 1.00)
      // Use yes_bid as the probability, fall back to last_price
      const price = parseFloat(
        market.yes_bid_dollars ?? market.last_price_dollars ?? market.yes_bid ?? market.last_price
      );

      if (isNaN(price) || price <= 0) return null;

      return Math.max(0.001, Math.min(0.999, price));
    } catch (err) {
      console.error(`Kalshi adapter error for ${externalMarketId}:`, err);
      return null;
    }
  }
}
