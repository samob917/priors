import { NextRequest, NextResponse } from "next/server";
import { recalculateTrendingScores } from "@/lib/trending";

export async function POST(request: NextRequest) {
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

  const updated = await recalculateTrendingScores();

  return NextResponse.json({
    success: true,
    priorsUpdated: updated,
    timestamp: new Date().toISOString(),
  });
}
