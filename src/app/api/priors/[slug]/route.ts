import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const prior = await prisma.prior.findUnique({
    where: { slug },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { updates: true, feedLinks: true } },
    },
  });

  if (!prior) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Prior not found" } },
      { status: 404 }
    );
  }

  // Increment view count (fire and forget)
  prisma.prior
    .update({ where: { id: prior.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json(prior);
}
