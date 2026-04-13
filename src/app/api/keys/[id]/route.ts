import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

/** Revoke an API key. */
export async function DELETE(
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

  const apiKey = await prisma.apiKey.findUnique({ where: { id } });
  if (!apiKey || apiKey.userId !== auth.userId) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "API key not found" } },
      { status: 404 }
    );
  }

  if (apiKey.revokedAt) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Key already revoked" } },
      { status: 409 }
    );
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
