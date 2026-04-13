import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const direction = body.direction;
  if (direction !== "UP" && direction !== "DOWN") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "direction must be UP or DOWN" } },
      { status: 400 }
    );
  }

  // Check update exists
  const update = await prisma.priorUpdate.findUnique({ where: { id } });
  if (!update) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Update not found" } },
      { status: 404 }
    );
  }

  // Upsert vote (one vote per user per update)
  const vote = await prisma.vote.upsert({
    where: {
      userId_priorUpdateId: {
        userId: auth.userId,
        priorUpdateId: id,
      },
    },
    update: { direction },
    create: {
      userId: auth.userId,
      priorUpdateId: id,
      direction,
    },
  });

  return NextResponse.json({ id: vote.id, direction: vote.direction });
}
