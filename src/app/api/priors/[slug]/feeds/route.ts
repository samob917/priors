import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { linkFeedSchema } from "@/lib/validation";

/** List feeds linked to a prior. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const prior = await prisma.prior.findUnique({ where: { slug } });
  if (!prior) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Prior not found" } },
      { status: 404 }
    );
  }

  const links = await prisma.dataFeedLink.findMany({
    where: { priorId: prior.id },
    include: {
      dataFeed: { select: { name: true, provider: true } },
    },
  });

  return NextResponse.json({ feeds: links });
}

/** Link a data feed to a prior. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { slug } = await params;
  const prior = await prisma.prior.findUnique({ where: { slug } });
  if (!prior) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Prior not found" } },
      { status: 404 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = linkFeedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 }
    );
  }

  const { dataFeedId, externalMarketId, dampingFactor } = parsed.data;

  // Verify feed exists
  const feed = await prisma.dataFeed.findUnique({ where: { id: dataFeedId } });
  if (!feed) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Data feed not found" } },
      { status: 404 }
    );
  }

  // Check for duplicate link
  const existing = await prisma.dataFeedLink.findFirst({
    where: { priorId: prior.id, dataFeedId, externalMarketId },
  });
  if (existing) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "This feed is already linked" } },
      { status: 409 }
    );
  }

  const link = await prisma.dataFeedLink.create({
    data: {
      priorId: prior.id,
      dataFeedId,
      externalMarketId,
      dampingFactor,
    },
    include: {
      dataFeed: { select: { name: true, provider: true } },
    },
  });

  return NextResponse.json(link, { status: 201 });
}
