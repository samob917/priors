import { NextRequest, NextResponse } from "next/server";
import { pollFeeds } from "@/lib/feeds/poller";

/**
 * Cron endpoint to poll all active data feeds.
 * Protected by a secret token to prevent unauthorized invocations.
 * In production, this would be called by Vercel Cron or similar.
 *
 * POST /api/cron/poll-feeds
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * For local dev, you can also call it without auth.
 */
export async function POST(request: NextRequest) {
  // In production, verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 }
      );
    }
  }

  const result = await pollFeeds();

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
