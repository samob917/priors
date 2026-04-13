import type { FeedAdapter } from "./adapter";

/**
 * Polymarket adapter.
 * Fetches market prices from Polymarket's Gamma API.
 *
 * The externalMarketId is the Polymarket market slug or condition ID.
 * Uses the Gamma API which returns outcome prices directly.
 */
export class PolymarketAdapter implements FeedAdapter {
  private gammaUrl = "https://gamma-api.polymarket.com";
  private clobUrl = "https://clob.polymarket.com";

  async fetchProbability(externalMarketId: string): Promise<number | null> {
    try {
      // Try CLOB API for raw token IDs (long numeric strings)
      if (/^\d{10,}$/.test(externalMarketId)) {
        return this.fetchFromClob(externalMarketId);
      }

      // Otherwise use Gamma API with market slug
      return this.fetchFromGamma(externalMarketId);
    } catch (err) {
      console.error(`Polymarket adapter error for ${externalMarketId}:`, err);
      return null;
    }
  }

  private async fetchFromClob(tokenId: string): Promise<number | null> {
    try {
      const res = await fetch(
        `${this.clobUrl}/price?token_id=${tokenId}&side=buy`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      const price = parseFloat(data.price);
      if (isNaN(price)) return null;

      return Math.max(0.001, Math.min(0.999, price));
    } catch {
      return null;
    }
  }

  private async fetchFromGamma(marketSlug: string): Promise<number | null> {
    try {
      const url = `${this.gammaUrl}/markets?slug=${encodeURIComponent(marketSlug)}&limit=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.error(`Polymarket Gamma API returned ${res.status} for ${marketSlug}`);
        return null;
      }

      const markets = await res.json();
      const market = Array.isArray(markets) && markets.length > 0 ? markets[0] : null;
      if (!market) {
        console.error(`Polymarket: no market found for slug "${marketSlug}"`);
        return null;
      }

      // outcomePrices is a JSON string array like '["0.535", "0.465"]'
      // or bestBid/lastTradePrice are direct numbers
      if (market.bestBid != null) {
        const price = parseFloat(market.bestBid);
        if (!isNaN(price) && price > 0) {
          return Math.max(0.001, Math.min(0.999, price));
        }
      }

      const rawPrices = market.outcomePrices;
      const prices = typeof rawPrices === "string" ? JSON.parse(rawPrices) : rawPrices;

      if (!Array.isArray(prices) || prices.length === 0) return null;

      const yesPrice = parseFloat(prices[0]);
      if (isNaN(yesPrice)) return null;

      return Math.max(0.001, Math.min(0.999, yesPrice));
    } catch (err) {
      console.error(`Polymarket Gamma fetch error:`, err);
      return null;
    }
  }
}
