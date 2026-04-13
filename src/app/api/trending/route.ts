import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const priors = await prisma.prior.findMany({
    orderBy: [{ updateCount: "desc" }, { viewCount: "desc" }],
    take: 20,
    select: {
      slug: true,
      claim: true,
      description: true,
      category: true,
      currentProbability: true,
      updateCount: true,
      viewCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ priors });
}
