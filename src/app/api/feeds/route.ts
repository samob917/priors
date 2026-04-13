import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** List all available data feed sources. */
export async function GET() {
  const feeds = await prisma.dataFeed.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      provider: true,
      baseUrl: true,
      pollIntervalSeconds: true,
    },
  });

  return NextResponse.json({ feeds });
}
