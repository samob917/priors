import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

/** Unlink a data feed from a prior. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; linkId: string }> }
) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { linkId } = await params;

  const link = await prisma.dataFeedLink.findUnique({ where: { id: linkId } });
  if (!link) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Feed link not found" } },
      { status: 404 }
    );
  }

  await prisma.dataFeedLink.delete({ where: { id: linkId } });

  return NextResponse.json({ success: true });
}
